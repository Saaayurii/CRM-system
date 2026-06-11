import { create } from 'zustand';
import { useChatStore, UploadedAttachment } from '@/stores/chatStore';

/**
 * Глобальная запись голосового: MediaRecorder живёт в сторе, а не в ChatInput,
 * поэтому запись продолжается при навигации между страницами/закрытии чата.
 * Когда инпут чата с этим каналом не виден, layout показывает плавающую
 * плашку записи (RecordingPill) с таймером и кнопками отправить/отменить.
 */
interface VoiceRecorderState {
  isRecording: boolean;
  isSending: boolean;
  channelId: number | null;
  /** Название чата — подпись на плавающей плашке */
  channelName: string;
  recordingTime: number;
  /** Сколько ChatInput'ов этого канала сейчас смонтировано (для показа плашки) */
  inlineConsumers: number;
  start: (channelId: number, channelName?: string) => Promise<boolean>;
  /** Остановить и отправить в канал, где началась запись */
  stopAndSend: () => void;
  cancel: () => void;
  registerInline: () => void;
  unregisterInline: () => void;
}

let mediaRecorder: MediaRecorder | null = null;
let stream: MediaStream | null = null;
let chunks: Blob[] = [];
let timer: ReturnType<typeof setInterval> | null = null;
let cancelled = false;

function cleanupHardware() {
  if (timer) { clearInterval(timer); timer = null; }
  stream?.getTracks().forEach((t) => t.stop());
  stream = null;
  mediaRecorder = null;
}

async function uploadAndSend(
  audioFile: File,
  channelId: number,
  set: (p: Partial<VoiceRecorderState>) => void,
) {
  set({ isSending: true });
  try {
    let token = '';
    try { token = localStorage.getItem('accessToken') ?? ''; } catch { /* ignore */ }
    const res = await fetch('/api/chat/upload', {
      method: 'POST',
      headers: {
        'x-upload-id': crypto.randomUUID(),
        'x-chunk-index': '0',
        'x-chunk-total': '1',
        'x-file-name': encodeURIComponent(audioFile.name),
        'x-file-size': String(audioFile.size),
        'x-file-type': audioFile.type || 'audio/webm',
        'Content-Type': 'application/octet-stream',
        ...(token ? { authorization: `Bearer ${token}` } : {}),
      },
      body: audioFile,
    });
    if (res.ok) {
      const attachment: UploadedAttachment = await res.json();
      if (attachment.fileUrl) {
        // Учитываем настройку «не делиться медиа» этого чата (как в ChatInput)
        let excludeFromMedia = false;
        try { excludeFromMedia = localStorage.getItem(`chat-share-media-${channelId}`) === '0'; } catch { /* ignore */ }
        useChatStore.getState().sendMessage(
          channelId,
          '',
          [excludeFromMedia ? { ...attachment, excludeFromMedia: true } : attachment],
          undefined,
          'voice',
        );
      }
    }
  } catch { /* discard */ } finally {
    set({ isSending: false });
  }
}

export const useVoiceRecorderStore = create<VoiceRecorderState>((set, get) => ({
  isRecording: false,
  isSending: false,
  channelId: null,
  channelName: '',
  recordingTime: 0,
  inlineConsumers: 0,

  start: async (channelId, channelName = '') => {
    if (get().isRecording || mediaRecorder?.state === 'recording') return false;
    if (!navigator.mediaDevices?.getUserMedia) return false;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      cancelled = false;
      chunks = [];
      mediaRecorder = new MediaRecorder(stream);
      mediaRecorder.ondataavailable = (e) => { if (e.data.size > 0) chunks.push(e.data); };
      mediaRecorder.onstop = async () => {
        const recordedFor = get().channelId;
        const mimeType = mediaRecorder?.mimeType || 'audio/webm';
        cleanupHardware();
        set({ isRecording: false, recordingTime: 0, channelId: null, channelName: '' });
        if (cancelled || !recordedFor) return;
        const ext = mimeType.includes('ogg') ? 'ogg' : mimeType.includes('mp4') ? 'mp4' : 'webm';
        const blob = new Blob(chunks, { type: mimeType });
        await uploadAndSend(
          new File([blob], `voice-${Date.now()}.${ext}`, { type: mimeType }),
          recordedFor,
          set,
        );
      };
      mediaRecorder.start();
      set({ isRecording: true, recordingTime: 0, channelId, channelName });
      timer = setInterval(() => set({ recordingTime: get().recordingTime + 1 }), 1000);
      return true;
    } catch {
      cleanupHardware();
      return false;
    }
  },

  stopAndSend: () => {
    cancelled = false;
    mediaRecorder?.stop();
  },

  cancel: () => {
    cancelled = true;
    mediaRecorder?.stop();
  },

  registerInline: () => set({ inlineConsumers: get().inlineConsumers + 1 }),
  unregisterInline: () => set({ inlineConsumers: Math.max(0, get().inlineConsumers - 1) }),
}));

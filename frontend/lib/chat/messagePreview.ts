/**
 * Strips chat mention markup from message text for preview display
 * (chat sidebar, notifications, etc).
 *
 *   @[Иван Иванов](user:42)              → @Иван Иванов
 *   #[Сделать дизайн](task:7)            → #Сделать дизайн
 *   #[Сделать дизайн](task:7|2|3|2026-…) → #Сделать дизайн
 *   **bold**                              → bold
 */
export function previewMessageText(raw: string | null | undefined): string {
  if (!raw) return '';
  return raw
    .replace(/@\[([^\]]+)\]\(user:\d+\)/g, '@$1')
    .replace(/#\[([^\]]+)\]\(task:\d+(?:\|[^)]*)?\)/g, '#$1')
    .replace(/\*\*(.+?)\*\*/g, '$1');
}

interface PreviewAttachment {
  type?: string;
  title?: string;
  mimeType?: string;
  fileName?: string;
  fileUrl?: string;
}

/**
 * Текст превью для списка чатов (как в Telegram): сообщения без текста
 * описываются по вложению — «📷 Фотография», «🎤 Голосовое сообщение» и т.д.
 */
export function previewFromMessage(
  text: string | null | undefined,
  messageType?: string | null,
  attachments?: PreviewAttachment[] | null,
): string {
  if (messageType === 'task_card') {
    const card = (attachments ?? []).find((a) => a.type === 'task_card');
    return card?.title ? `📋 Задача: ${card.title}` : '📋 Новая задача';
  }
  if (messageType === 'voice') return '🎤 Голосовое сообщение';
  if (messageType === 'video_note') return '📹 Видеосообщение';

  const plain = previewMessageText(text);
  if (plain) return plain;

  const files = (attachments ?? []).filter((a) => a.fileUrl && !a.type);
  if (files.length === 0) return '';
  const ext = (f: PreviewAttachment) =>
    (f.fileName || f.fileUrl || '').split('?')[0].split('.').pop()?.toLowerCase() || '';
  const isImage = (f: PreviewAttachment) =>
    f.mimeType?.startsWith('image/') || ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp', 'avif', 'heic', 'heif'].includes(ext(f));
  const isVideo = (f: PreviewAttachment) =>
    f.mimeType?.startsWith('video/') || ['mp4', 'webm', 'mov', 'avi', 'mkv', 'm4v'].includes(ext(f));
  const isAudio = (f: PreviewAttachment) => f.mimeType?.startsWith('audio/');

  if (files.every(isImage)) return files.length > 1 ? `📷 ${files.length} фото` : '📷 Фотография';
  if (files.every(isVideo)) return files.length > 1 ? `🎥 ${files.length} видео` : '🎥 Видео';
  if (files.length === 1 && isAudio(files[0])) return '🎵 Аудио';
  return files.length > 1 ? `📎 ${files.length} файла(ов)` : `📎 ${files[0].fileName || 'Файл'}`;
}

/**
 * Chunked upload helper.
 *
 * Why: browser → nginx → api-gateway with a 100MB+ multipart body fails
 * (nginx buffers/limits). The chat already solves this via /api/chat/upload —
 * a Next.js API route that accepts ≤ 5MB chunks, reassembles them on the
 * server, and forwards the assembled file to api-gateway over the Docker
 * network (bypassing nginx).
 *
 * This helper exposes that flow to any caller (TaskFormModal, project pages,
 * etc.) so they don't need their own copy of the XHR chunking loop.
 */

export interface UploadedAttachment {
  fileName: string;
  fileSize: number;
  mimeType: string;
  fileUrl: string;
}

const CHUNK_SIZE = 5 * 1024 * 1024; // 5 MB — matches Next.js body limit

export async function uploadFileChunked(
  file: File,
  options?: { onProgress?: (pct: number) => void; compress?: boolean },
): Promise<UploadedAttachment> {
  const uploadId   = crypto.randomUUID();
  const chunkTotal = Math.max(1, Math.ceil(file.size / CHUNK_SIZE));
  const compress   = options?.compress ?? true;

  const sendChunk = (chunkIndex: number): Promise<UploadedAttachment | null> =>
    new Promise((resolve, reject) => {
      const start = chunkIndex * CHUNK_SIZE;
      const end   = Math.min(start + CHUNK_SIZE, file.size);
      const chunk = file.slice(start, end);

      const xhr = new XMLHttpRequest();
      xhr.open('POST', '/api/chat/upload');
      xhr.setRequestHeader('x-upload-id',    uploadId);
      xhr.setRequestHeader('x-chunk-index',  String(chunkIndex));
      xhr.setRequestHeader('x-chunk-total',  String(chunkTotal));
      xhr.setRequestHeader('x-file-name',    encodeURIComponent(file.name));
      xhr.setRequestHeader('x-file-size',    String(file.size));
      xhr.setRequestHeader('x-file-type',    file.type || '');
      xhr.setRequestHeader('x-compress',     String(compress));
      xhr.setRequestHeader('Content-Type',   'application/octet-stream');
      try {
        const token = localStorage.getItem('accessToken');
        if (token) xhr.setRequestHeader('authorization', `Bearer ${token}`);
      } catch { /* SSR / no localStorage */ }

      if (options?.onProgress) {
        xhr.upload.onprogress = (e) => {
          if (!e.lengthComputable) return;
          const doneBytes = chunkIndex * CHUNK_SIZE;
          const total = Math.min(doneBytes + (e.loaded / e.total) * (end - start), file.size);
          options.onProgress!(Math.round((total / file.size) * 100));
        };
      }

      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            const data = JSON.parse(xhr.responseText);
            resolve(data.fileUrl ? (data as UploadedAttachment) : null);
          } catch { reject(new Error('Invalid response')); }
        } else {
          reject(new Error(`Chunk ${chunkIndex} failed: ${xhr.status}`));
        }
      };
      xhr.onerror = () => reject(new Error('Network error'));
      xhr.send(chunk);
    });

  let result: UploadedAttachment | null = null;
  for (let i = 0; i < chunkTotal; i++) {
    result = await sendChunk(i);
  }
  if (!result) throw new Error('Upload incomplete');
  return result;
}

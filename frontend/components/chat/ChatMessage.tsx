'use client';

import { ChatMessage as ChatMessageType } from '@/stores/chatStore';

interface ChatMessageProps {
  message: ChatMessageType;
  isOwn: boolean;
  showAvatar: boolean;
  isRead: boolean;
  onReply: () => void;
}

export default function ChatMessage({ message, isOwn, showAvatar, isRead, onReply }: ChatMessageProps) {
  return (
    <div
      className={`flex gap-2 group ${isOwn ? 'flex-row-reverse' : ''} ${showAvatar ? 'mt-3' : 'mt-0.5'}`}
    >
      {/* Avatar placeholder / real avatar */}
      <div className="w-8 shrink-0">
        {showAvatar && !isOwn && (
          <div className="w-8 h-8 rounded-full bg-sky-500 flex items-center justify-center text-white text-xs font-semibold">
            {message.senderAvatarUrl ? (
              <img src={message.senderAvatarUrl} alt="" className="w-full h-full rounded-full object-cover" />
            ) : (
              getInitials(message.senderName)
            )}
          </div>
        )}
      </div>

      {/* Bubble */}
      <div className={`max-w-[70%] min-w-[80px] flex flex-col ${isOwn ? 'items-end' : 'items-start'}`}>
        {/* Sender name */}
        {showAvatar && !isOwn && (
          <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-0.5 ml-1">
            {message.senderName}
          </p>
        )}

        {/* Reply preview */}
        {message.replyToMessage && (
          <div
            className={`text-xs px-2 py-1 mb-0.5 rounded-t-lg border-l-2 max-w-full ${
              isOwn
                ? 'bg-violet-400/20 border-violet-300 dark:bg-violet-500/20 dark:border-violet-400'
                : 'bg-gray-100 border-gray-300 dark:bg-gray-700 dark:border-gray-500'
            }`}
          >
            <p className="font-medium text-gray-600 dark:text-gray-300 truncate">
              {message.replyToMessage.senderName}
            </p>
            <p className="text-gray-500 dark:text-gray-400 truncate">{message.replyToMessage.text}</p>
          </div>
        )}

        <div
          className={`relative rounded-2xl px-3 py-2 w-full ${
            isOwn
              ? 'bg-violet-500 text-white rounded-tr-sm'
              : 'bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 shadow-xs rounded-tl-sm'
          }`}
        >
          {/* Text */}
          {message.text && (
            <p className="text-sm whitespace-pre-wrap break-words">{message.text}</p>
          )}

          {/* Attachments */}
          {message.attachments && message.attachments.length > 0 && (
            <div className="mt-1 space-y-1">
              {message.attachments.map((att) => {
                const isImage = att.mimeType?.startsWith('image/');
                if (isImage) {
                  return (
                    <a key={att.id} href={att.fileUrl} target="_blank" rel="noopener noreferrer">
                      <img
                        src={att.fileUrl}
                        alt={att.fileName}
                        className="max-w-full max-h-60 rounded-lg object-cover"
                      />
                    </a>
                  );
                }
                return (
                  <a
                    key={att.id}
                    href={att.fileUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`flex items-center gap-2 p-2 rounded-lg text-sm ${
                      isOwn
                        ? 'bg-violet-400/30 hover:bg-violet-400/40'
                        : 'bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600'
                    }`}
                  >
                    <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                    </svg>
                    <div className="min-w-0">
                      <p className="truncate font-medium">{att.fileName}</p>
                      <p className={`text-xs ${isOwn ? 'text-violet-200' : 'text-gray-400'}`}>
                        {formatSize(att.fileSize)}
                      </p>
                    </div>
                  </a>
                );
              })}
            </div>
          )}

          {/* Time + edited + read checkmark */}
          <div className={`flex items-center gap-1 mt-0.5 ${isOwn ? 'justify-end' : 'justify-start'}`}>
            {message.isEdited && (
              <span className={`text-[10px] ${isOwn ? 'text-violet-200' : 'text-gray-400 dark:text-gray-500'}`}>
                ред.
              </span>
            )}
            <span className={`text-[10px] ${isOwn ? 'text-violet-200' : 'text-gray-400 dark:text-gray-500'}`}>
              {formatTime(message.createdAt)}
            </span>
            {isOwn && (
              <span className={`text-[10px] leading-none ${isRead ? 'text-sky-300' : 'text-violet-200'}`}>
                {isRead ? (
                  /* Double check — read */
                  <svg className="w-3.5 h-3.5 inline" viewBox="0 0 16 10" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="1,5 5,9 15,1" />
                    <polyline points="5,5 9,9" />
                    <line x1="5" y1="9" x2="15" y2="1" />
                  </svg>
                ) : (
                  /* Single check — sent */
                  <svg className="w-3 h-3 inline" viewBox="0 0 12 9" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="1,4.5 4.5,8 11,1" />
                  </svg>
                )}
              </span>
            )}
          </div>

          {/* Reply button (hover) */}
          <button
            onClick={onReply}
            className={`absolute ${isOwn ? '-left-8' : '-right-8'} top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700`}
            title="Ответить"
          >
            <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
            </svg>
          </button>
        </div>

        {/* Reactions */}
        {message.reactions && message.reactions.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-1">
            {message.reactions.map((r) => (
              <span
                key={r.emoji}
                className="inline-flex items-center gap-0.5 px-1.5 py-0.5 text-xs bg-gray-100 dark:bg-gray-700 rounded-full"
              >
                {r.emoji} {r.count}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function getInitials(name: string | undefined | null): string {
  if (!name) return '?';
  return name
    .split(' ')
    .map((w) => w[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

function formatTime(dateStr: string): string {
  return new Date(dateStr).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} Б`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} КБ`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} МБ`;
}

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

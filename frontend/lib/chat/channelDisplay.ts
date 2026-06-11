import { ChatChannel } from '@/stores/chatStore';

/**
 * Общие хелперы отображения чат-каналов (имя, аватар, онлайн-статус).
 * Используются мини-чатом; логика повторяет ChatSidebar.
 */

export function isDeletedEmail(email?: string | null): boolean {
  return !!email && /^deleted_\d+_\d+@crm\.deleted$/.test(email);
}

export function isSelfChat(channel: ChatChannel, currentUserId?: number): boolean {
  if (channel.channelType !== 'direct' || !currentUserId) return false;
  if (!channel.members || channel.members.length === 0) return false;
  return channel.members.every((m) => m.id === currentUserId);
}

export function getChannelDisplayName(channel: ChatChannel, currentUserId?: number): string {
  if (channel.channelType === 'group') return channel.channelName || 'Группа';
  if (channel.members && channel.members.length > 0) {
    const other = channel.members.find((m) => m.id !== currentUserId);
    if (other) {
      if (isDeletedEmail(other.name) || isDeletedEmail(other.email)) {
        return 'Удалённый пользователь';
      }
      return other.name || other.email || channel.channelName || 'Прямое сообщение';
    }
  }
  return channel.channelName || 'Прямое сообщение';
}

export function getDirectChannelAvatarUrl(channel: ChatChannel, currentUserId?: number): string | undefined {
  if (channel.channelType !== 'direct' || !currentUserId || !channel.members) return undefined;
  const other = channel.members.find((m) => m.id !== currentUserId);
  return other?.avatarUrl;
}

export function isDirectChannelOnline(
  channel: ChatChannel,
  currentUserId: number | undefined,
  onlineUsers: Set<number>
): boolean {
  if (channel.channelType !== 'direct' || !channel.members) return false;
  const other = channel.members.find((m) => m.id !== currentUserId);
  return other ? onlineUsers.has(other.id) : false;
}

export function getInitials(name: string | undefined | null): string {
  if (!name) return '?';
  return name
    .split(' ')
    .map((w) => w[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

/** «был(а) в сети 5 минут назад» — для шапки чата, когда собеседник офлайн. */
export function formatLastSeen(iso: string | undefined | null): string | null {
  if (!iso) return null;
  const date = new Date(iso);
  if (isNaN(date.getTime())) return null;
  const diffMs = Date.now() - date.getTime();
  if (diffMs < 0) return 'недавно';
  const mins = Math.floor(diffMs / 60_000);
  if (mins < 1) return 'только что';
  if (mins < 60) return `${mins} ${pluralRu(mins, 'минуту', 'минуты', 'минут')} назад`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} ${pluralRu(hours, 'час', 'часа', 'часов')} назад`;

  const time = date.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const startOfYesterday = new Date(startOfToday.getTime() - 86_400_000);
  if (date >= startOfYesterday) return `вчера в ${time}`;
  return `${date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' })} в ${time}`;
}

function pluralRu(n: number, one: string, few: string, many: string): string {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return one;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return few;
  return many;
}

export function formatChannelTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) {
    return date.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
  }
  if (diffDays === 1) return 'Вчера';
  if (diffDays < 7) {
    return date.toLocaleDateString('ru-RU', { weekday: 'short' });
  }
  return date.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit' });
}

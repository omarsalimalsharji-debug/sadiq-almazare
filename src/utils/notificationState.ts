export interface NotificationRecord {
  id: string;
  title: string;
  message: string;
  type: 'weather' | 'crop_advice' | 'ramadan' | 'system' | string;
  targetGovernorate?: string;
  timestamp: number;
  read?: boolean;
  targetUserId?: string;
}

const READ_KEY = 'sadiq_notification_read_ids_v1';
const LOCAL_KEY = 'sadiq_local_notifications_v1';
const MAX_LOCAL_ITEMS = 100;

function readIdSet(): Set<string> {
  try {
    const parsed = JSON.parse(localStorage.getItem(READ_KEY) || '[]');
    return new Set(Array.isArray(parsed) ? parsed.filter((id) => typeof id === 'string').slice(-500) : []);
  } catch {
    return new Set();
  }
}

export function isNotificationRead(notification: NotificationRecord): boolean {
  return Boolean(notification.read) || readIdSet().has(notification.id);
}

export function markNotificationsRead(ids: string[]): void {
  if (typeof window === 'undefined') return;
  const read = readIdSet();
  ids.filter(Boolean).forEach((id) => read.add(id));
  try {
    localStorage.setItem(READ_KEY, JSON.stringify([...read].slice(-500)));
  } catch {
    // Keep the notification list usable when browser storage is unavailable.
  }
  window.dispatchEvent(new CustomEvent('sadiq-notifications-read'));
}

export function getLocalNotifications(): NotificationRecord[] {
  try {
    const parsed = JSON.parse(localStorage.getItem(LOCAL_KEY) || '[]');
    return Array.isArray(parsed) ? parsed.filter((item) => item && typeof item.id === 'string') : [];
  } catch {
    return [];
  }
}

export function addLocalNotification(notification: NotificationRecord): void {
  const current = getLocalNotifications().filter((item) => item.id !== notification.id);
  current.unshift(notification);
  try {
    localStorage.setItem(LOCAL_KEY, JSON.stringify(current.slice(0, MAX_LOCAL_ITEMS)));
  } catch {
    // Local notifications are best-effort and never block calendar actions.
  }
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('sadiq-local-notification-added'));
  }
}

export function mergeNotifications(serverItems: NotificationRecord[], governorate?: string): NotificationRecord[] {
  const all = [...getLocalNotifications(), ...(Array.isArray(serverItems) ? serverItems : [])];
  const unique = new Map<string, NotificationRecord>();
  for (const item of all) {
    if (!item || !item.id || unique.has(item.id)) continue;
    const target = String(item.targetGovernorate || '').trim();
    const selected = String(governorate || '').replace(/^محافظة\\s*/, '').trim();
    const isNationwide = !target || /كافة المحافظات|سلطنة عُمان|جميع المحافظات/i.test(target);
    const matchesRegion = !selected || target.includes(selected) || selected.includes(target.replace(/^محافظة\\s*/, '').trim());
    if (isNationwide || matchesRegion) unique.set(item.id, { ...item, read: isNotificationRead(item) });
  }
  return [...unique.values()].sort((a, b) => Number(b.timestamp || 0) - Number(a.timestamp || 0));
}

export function countUnreadNotifications(items: NotificationRecord[], governorate?: string): number {
  return mergeNotifications(items, governorate).filter((item) => !isNotificationRead(item)).length;
}

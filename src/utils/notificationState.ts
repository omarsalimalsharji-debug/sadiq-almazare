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

// Farmer reminders and local notification state are session-only, not a permanent activity log.
function clearLegacyPersistentState(): void {
  try {
    localStorage.removeItem(READ_KEY);
    localStorage.removeItem(LOCAL_KEY);
    localStorage.removeItem('oman_calendar_reminders_cache_v1:device');
  } catch {
    // Private browsing or restricted storage may block cleanup.
  }
}
const MAX_LOCAL_ITEMS = 100;

// Retire date-palm bunch/harvest tasks when the Omani harvest window has passed.
// This only filters seasonal task reminders; it never suppresses pest or disease alerts.
function isExpiredPalmSeasonTask(item: Pick<NotificationRecord, 'title' | 'message'>, now = new Date()): boolean {
  const month = Number(new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Muscat', month: 'numeric' }).format(now));
  if (![11, 12, 1].includes(month)) return false;
  const text = `${item.title || ''} ${item.message || ''}`;
  const palmTask = /نخيل|نخلة|عذق|عذوق|تمور|التمر/i.test(text);
  const bunchWork = /عذق|عذوق|العذق|العذوق/i.test(text);
  const pestOrDiseaseAlert = /دوباس|سوسة|حلم|آفة|حشرة|مرض|مكافحة|إصابة|تفشي/i.test(text);
  const completedSeasonWork = /خف(?:ّ|ف)?|تخفيف|تدلية|تكميم|تغطية|الطناء|جني|حصاد|جمع|قطف|نضج|تلقيح|تنبيت|حبابوك|جمري|خلال|رطب/i.test(text);
  return palmTask && (completedSeasonWork || (bunchWork && !pestOrDiseaseAlert));
}

function readIdSet(): Set<string> {
  try {
    clearLegacyPersistentState();
    const parsed = JSON.parse(sessionStorage.getItem(READ_KEY) || '[]');
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
    sessionStorage.setItem(READ_KEY, JSON.stringify([...read].slice(-500)));
  } catch {
    // Keep the notification list usable when browser storage is unavailable.
  }
  window.dispatchEvent(new CustomEvent('sadiq-notifications-read'));
}

export function getLocalNotifications(): NotificationRecord[] {
  try {
    clearLegacyPersistentState();
    const parsed = JSON.parse(sessionStorage.getItem(LOCAL_KEY) || '[]');
    const valid = Array.isArray(parsed)
      ? parsed.filter((item) =>
          item &&
          typeof item.id === 'string' &&
          !/خف.{0,15}عذوق|تكميم.{0,15}عذوق|عذوق.{0,15}تكميم/i.test(String(item.title || '') + ' ' + String(item.message || '')) &&
          !isExpiredPalmSeasonTask(item)
        )
      : [];
    if (Array.isArray(parsed) && valid.length !== parsed.length) {
      try { sessionStorage.setItem(LOCAL_KEY, JSON.stringify(valid.slice(0, MAX_LOCAL_ITEMS))); } catch { /* ignore */ }
    }
    return valid;
  } catch {
    return [];
  }
}

export function addLocalNotification(notification: NotificationRecord): void {
  if (isExpiredPalmSeasonTask(notification)) return;
  const current = getLocalNotifications().filter((item) => item.id !== notification.id);
  current.unshift(notification);
  try {
    sessionStorage.setItem(LOCAL_KEY, JSON.stringify(current.slice(0, MAX_LOCAL_ITEMS)));
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
    const selected = String(governorate || '').replace(/^محافظة\s*/, '').trim();
    const isNationwide = !target || /كافة المحافظات|كافة محافظات|جميع المحافظات|جميع محافظات|سلطنة عُمان/i.test(target);
    const matchesRegion = !selected || target.includes(selected) || selected.includes(target.replace(/^محافظة\s*/, '').trim());
    if (isNationwide || matchesRegion) unique.set(item.id, { ...item, read: isNotificationRead(item) });
  }
  return [...unique.values()].sort((a, b) => Number(b.timestamp || 0) - Number(a.timestamp || 0));
}

export function countUnreadNotifications(items: NotificationRecord[], governorate?: string): number {
  return mergeNotifications(items, governorate).filter((item) => !isNotificationRead(item)).length;
}

export function dispatchDueLocalReminders(now = Date.now()): number {
  const remindersKey = 'oman_calendar_reminders_cache_v1:device';
  let reminders: any[] = [];
  try {
    clearLegacyPersistentState();
    const parsed = JSON.parse(sessionStorage.getItem(remindersKey) || '[]');
    reminders = Array.isArray(parsed) ? parsed : [];
    const activeReminders = reminders.filter((reminder) =>
      !isExpiredPalmSeasonTask({ title: String(reminder?.title || ''), message: String(reminder?.message || '') })
    );
    if (activeReminders.length !== reminders.length) {
      reminders = activeReminders;
      sessionStorage.setItem(remindersKey, JSON.stringify(reminders));
    }
  } catch {
    return 0;
  }

  const todayTrigger = new Date(now);
  todayTrigger.setHours(5, 30, 0, 0);
  const monthTrigger = new Date(now);
  monthTrigger.setDate(1);
  monthTrigger.setHours(6, 0, 0, 0);
  const todayKey = todayTrigger.toISOString().slice(0, 10);
  let dispatched = 0;
  let changed = false;

  const next = reminders.map((reminder) => {
    if (!reminder || !reminder.enabled) return reminder;
    const base = Number(reminder.lastDispatchedAt || reminder.createdAt || 0);
    if (!base) return reminder;
    let due = false;
    if (reminder.cadence === 'daily_dawn') {
      due = now >= todayTrigger.getTime() && base < todayTrigger.getTime();
    } else if (reminder.cadence === 'every_2_days') {
      due = now - base >= 2 * 24 * 60 * 60 * 1000;
    } else if (reminder.cadence === 'weekly') {
      due = now - base >= 7 * 24 * 60 * 60 * 1000;
    } else if (reminder.cadence === 'monthly_start') {
      due = now >= monthTrigger.getTime() && base < monthTrigger.getTime();
    }
    if (!due) return reminder;

    const notificationId = `scheduled-${reminder.id}-${todayKey}`;
    const title = reminder.title || `تذكير زراعي: ${reminder.cropName || ''}`;
    const message = reminder.message || 'حان موعد متابعة النشاط الزراعي المسجل في تقويمك.';
    addLocalNotification({
      id: notificationId,
      title,
      message,
      type: 'crop_advice',
      targetGovernorate: reminder.governorate,
      timestamp: now,
      read: false,
    });
    if (typeof window !== 'undefined' && 'Notification' in window && window.Notification.permission === 'granted') {
      try {
        new window.Notification(title, { body: message, dir: 'rtl', lang: 'ar' });
      } catch {
        // In-app notification remains available if browser notifications are restricted.
      }
    }
    dispatched++;
    changed = true;
    return { ...reminder, lastDispatchedAt: now };
  });

  if (changed) {
    try {
      sessionStorage.setItem(remindersKey, JSON.stringify(next));
    } catch {
      // Notification delivery remains recorded locally even if reminder state cannot be refreshed.
    }
  }
  return dispatched;
}

export function notifyNewServerNotifications(items: NotificationRecord[], governorate?: string): void {
  if (typeof window === 'undefined') return;
  const visible = mergeNotifications(items, governorate).filter((item) =>
    (items || []).some((serverItem) => serverItem.id === item.id)
  );
  const key = `sadiq_seen_server_notifications_v1:${String(governorate || 'all').replace(/\s+/g, '_')}`;
  let seen: string[] | null = null;
  try {
    try { localStorage.removeItem(key); } catch { /* remove any legacy persistent seen-state */ }
    const parsed = JSON.parse(sessionStorage.getItem(key) || 'null');
    if (Array.isArray(parsed)) seen = parsed.filter((id) => typeof id === 'string');
  } catch {
    seen = null;
  }
  const ids = visible.map((item) => item.id);
  if (seen === null) {
    try { sessionStorage.setItem(key, JSON.stringify(ids.slice(-500))); } catch { /* ignore */ }
    return;
  }
  const seenSet = new Set(seen);
  const fresh = visible.filter((item) => !seenSet.has(item.id) && !isNotificationRead(item));
  try { sessionStorage.setItem(key, JSON.stringify([...seen, ...ids].slice(-500))); } catch { /* ignore */ }
  if (window.Notification?.permission !== 'granted') return;
  for (const item of fresh.slice(0, 3)) {
    try {
      new window.Notification(item.title, { body: item.message, dir: 'rtl', lang: 'ar' });
    } catch {
      // The notification remains visible in the in-app center.
    }
  }
}

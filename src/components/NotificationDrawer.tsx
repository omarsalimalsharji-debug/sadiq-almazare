import React, { useState, useEffect } from 'react';
import { auth } from '../firebase.ts';
import { 
  X, 
  Bell, 
  CloudSun, 
  Sprout, 
  MoonStar, 
  CheckCheck, 
  AlertTriangle, 
  Send,
  Sparkles
} from 'lucide-react';

interface AppNotification {
  id: string;
  title: string;
  message: string;
  type: 'weather' | 'crop_advice' | 'ramadan' | 'system';
  targetGovernorate?: string;
  timestamp: number;
  read: boolean;
}

interface NotificationDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onNotificationsCountChange: (count: number) => void;
}

export const NotificationDrawer: React.FC<NotificationDrawerProps> = ({
  isOpen,
  onClose,
  onNotificationsCountChange
}) => {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [filterType, setFilterType] = useState<'all' | 'unread' | 'weather' | 'crop_advice' | 'ramadan'>('all');
  const [loading, setLoading] = useState<boolean>(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>(() => typeof window !== 'undefined' && 'Notification' in window ? Notification.permission : 'denied');

  const fetchNotifs = async () => {
    setLoading(true);
    setFetchError(null);
    try {
      const token = await auth.currentUser?.getIdToken().catch(() => null);
      const res = await fetch('/api/notifications', { cache: 'no-store', headers: token ? { Authorization: `Bearer ${token}` } : {} });
      const data = await res.json();
      if (res.ok && data.success && Array.isArray(data.notifications)) {
        setNotifications(data.notifications);
        const unread = data.notifications.filter((n: any) => !n.read).length;
        onNotificationsCountChange(unread);
      } else {
        setFetchError('تعذر تحديث قائمة التنبيهات حالياً.');
      }
    } catch {
      setFetchError('تعذر الاتصال بالخادم لجلب التنبيهات.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isOpen) return;
    fetchNotifs();
    const refreshTimer = window.setInterval(fetchNotifs, 30000);
    return () => window.clearInterval(refreshTimer);
  }, [isOpen]);

  const enableDeviceNotifications = async () => {
    if (!('Notification' in window)) {
      setFetchError('المتصفح لا يدعم إشعارات الجهاز. ستظل التنبيهات متاحة داخل التطبيق.');
      return;
    }
    const permission = await Notification.requestPermission();
    setNotificationPermission(permission);
    if (permission === 'granted') setFetchError('تم تفعيل إشعارات الجهاز عند وصول تنبيه جديد أثناء استخدام التطبيق في الخلفية.');
    else setFetchError('لم يتم منح إذن إشعارات الجهاز. يمكنك متابعة التنبيهات من داخل التطبيق.');
  };

  const markAllAsRead = async () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    onNotificationsCountChange(0);
    try {
      const token = await auth.currentUser?.getIdToken().catch(() => null);
      await fetch('/api/notifications/read-all', { method: 'POST', headers: token ? { Authorization: `Bearer ${token}` } : {} });
    } catch {
      // keep local state optimistic without noisy error
    }
  };

  if (!isOpen) return null;

  const filteredNotifications = notifications.filter((n) => {
    if (filterType === 'all') return true;
    if (filterType === 'unread') return !n.read;
    return n.type === filterType;
  });

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-stone-950/65 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Drawer */}
      <div className="relative w-full max-w-sm sm:max-w-md bg-white dark:bg-[#0b1329] h-full shadow-2xl flex flex-col z-10 border-r border-stone-200 dark:border-sky-300/15 text-stone-900 dark:text-slate-100">
        
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-stone-200 dark:border-sky-300/15 flex items-center justify-between bg-stone-50/70 dark:bg-[#0e1936]">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400 flex items-center justify-center font-bold">
              <Bell className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-stone-900 dark:text-white">
                مركز التنبيهات والإشعارات
              </h3>
              <span className="text-[11px] text-stone-400">
                تنبيهات الطقس والإرشاد الزراعي المعتمدة
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={markAllAsRead}
              className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold hover:underline"
            >
              تعيين كمقروء
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-stone-400 hover:text-stone-800 dark:hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Live Refresh Bar + Filter Chips */}
        <div className="p-3 bg-stone-100 dark:bg-[#132247] border-b border-stone-200 dark:border-sky-300/15 space-y-2.5 text-xs">
          <div className="flex items-center justify-between">
            <span className="text-stone-600 dark:text-slate-300">
              {fetchError ? fetchError : loading ? 'جاري المزامنة...' : `إجمالي التنبيهات: ${notifications.length}`}
            </span>
            <div className="flex items-center gap-1.5">
              {'Notification' in window && notificationPermission !== 'granted' && (
                <button type="button" onClick={enableDeviceNotifications} className="px-2.5 py-1.5 rounded-lg bg-sky-100 dark:bg-sky-950 text-sky-800 dark:text-sky-200 font-bold text-[10px]">
                  تفعيل إشعارات الجهاز
                </button>
              )}
              <button onClick={fetchNotifs} disabled={loading} className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold text-[11px]">
                تحديث الآن
              </button>
            </div>
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 scrollbar-none">
            {(
              [
                { id: 'all', label: 'الكل' },
                { id: 'unread', label: 'غير مقروء' },
                { id: 'weather', label: 'الطقس' },
                { id: 'crop_advice', label: 'إرشاد زراعي' },
                { id: 'ramadan', label: 'موسمي' },
              ] as const
            ).map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => setFilterType(f.id)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold whitespace-nowrap transition-colors ${
                  filterType === f.id
                    ? 'bg-emerald-600 text-white'
                    : 'bg-white dark:bg-[#0e1936] text-stone-600 dark:text-slate-300 border border-stone-200 dark:border-sky-300/15'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* Notifications List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {filteredNotifications.length === 0 ? (
            <div className="text-center py-12 text-stone-400 text-xs">
              لا توجد تنبيهات مطابقة في الوقت الحالي
            </div>
          ) : (
            filteredNotifications.map((notif) => {
              let Icon = Bell;
              let iconColor = 'text-emerald-600 bg-emerald-50 dark:bg-emerald-950';

              if (notif.type === 'weather') {
                Icon = CloudSun;
                iconColor = 'text-amber-600 bg-amber-50 dark:bg-amber-950';
              } else if (notif.type === 'crop_advice') {
                Icon = Sprout;
                iconColor = 'text-emerald-600 bg-emerald-50 dark:bg-emerald-950';
              } else if (notif.type === 'ramadan') {
                Icon = MoonStar;
                iconColor = 'text-amber-600 bg-amber-50 dark:bg-amber-950';
              }

              return (
                <div
                  key={notif.id}
                  className={`p-3.5 rounded-2xl border transition-all space-y-2 ${
                    notif.read
                      ? 'bg-white dark:bg-[#132247]/70 border-stone-200 dark:border-sky-300/10 opacity-85'
                      : 'bg-emerald-50/40 dark:bg-[#132247] border-emerald-300 dark:border-emerald-500/40'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${iconColor}`}>
                        <Icon className="w-4 h-4" />
                      </div>
                      <h4 className="font-bold text-xs text-stone-900 dark:text-white line-clamp-1">
                        {notif.title}
                      </h4>
                    </div>

                    <span className="text-[10px] text-stone-400 font-mono shrink-0">
                      {new Date(notif.timestamp).toLocaleTimeString('ar-OM', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>

                  <p className="text-xs text-stone-600 dark:text-slate-300 leading-relaxed text-justify">
                    {notif.message}
                  </p>

                  {notif.targetGovernorate && (
                    <div className="text-[10px] text-emerald-700 dark:text-emerald-400 font-medium">
                      المحافظة: {notif.targetGovernorate}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

      </div>
    </div>
  );
};

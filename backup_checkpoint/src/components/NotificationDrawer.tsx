import React, { useState, useEffect } from 'react';
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
  const [testSent, setTestSent] = useState<boolean>(false);

  const fetchNotifs = async () => {
    try {
      const res = await fetch('/api/notifications');
      const data = await res.json();
      if (data.success && Array.isArray(data.notifications)) {
        setNotifications(data.notifications);
        const unread = data.notifications.filter((n: any) => !n.read).length;
        onNotificationsCountChange(unread);
      }
    } catch (e) {
      console.warn('Failed to load notifications:', e);
    }
  };

  useEffect(() => {
    fetchNotifs();
  }, [isOpen]);

  const markAllAsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    onNotificationsCountChange(0);
  };

  const handleTestImmediateNotification = () => {
    const testNotif: AppNotification = {
      id: `notif-test-${Date.now()}`,
      title: "تنبيه ميداني تجريبي: فحص رطوبة التربة",
      message: "توصي منظومة صديق المزارع الذكية بفحص شبكة التنقيط والتأكد من عدم انسداد النقاطات بعد هبوب الرياح الصباحية.",
      type: "crop_advice",
      targetGovernorate: "سلطنة عُمان",
      timestamp: Date.now(),
      read: false
    };
    setNotifications(prev => [testNotif, ...prev]);
    onNotificationsCountChange(notifications.filter(n => !n.read).length + 1);
    setTestSent(true);
    setTimeout(() => setTestSent(false), 3000);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-stone-900/60 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Drawer */}
      <div className="relative w-full max-w-sm sm:max-w-md bg-white dark:bg-stone-900 h-full shadow-2xl flex flex-col z-10 border-r border-stone-200 dark:border-stone-800 text-stone-900 dark:text-stone-100">
        
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-stone-200 dark:border-stone-800 flex items-center justify-between bg-stone-50/70 dark:bg-stone-900/90">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400 flex items-center justify-center font-bold">
              <Bell className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-stone-900 dark:text-white">
                مركز التنبيهات والإشعارات
              </h3>
              <span className="text-[11px] text-stone-400">
                إشعارات حقيقية للمحاصيل والطقس
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

        {/* Test Notification Trigger */}
        <div className="p-3 bg-stone-100 dark:bg-stone-800/60 border-b border-stone-200 dark:border-stone-700 flex items-center justify-between text-xs">
          <span className="text-stone-600 dark:text-stone-300">
            {testSent ? 'تم إرسال الإشعار الفوري بنجاح!' : 'تريد تجربة استقبال تنبيه حقيقي؟'}
          </span>
          <button
            onClick={handleTestImmediateNotification}
            className="px-2.5 py-1 rounded bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px]"
          >
            إرسال إشعار تجريبي
          </button>
        </div>

        {/* Notifications List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {notifications.length === 0 ? (
            <div className="text-center py-12 text-stone-400 text-xs">
              لا توجد تنبيهات جديدة في الوقت الحالي
            </div>
          ) : (
            notifications.map((notif) => {
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
                      ? 'bg-white dark:bg-stone-900 border-stone-200 dark:border-stone-800 opacity-80'
                      : 'bg-emerald-50/40 dark:bg-emerald-950/20 border-emerald-300 dark:border-emerald-800'
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

                  <p className="text-xs text-stone-600 dark:text-stone-300 leading-relaxed text-justify">
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

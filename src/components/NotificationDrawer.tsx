import React, { useEffect, useState } from 'react';
import { X, Bell, CloudSun, Sprout, MoonStar, RefreshCw } from 'lucide-react';
import { mergeNotifications, markNotificationsRead, NotificationRecord } from '../utils/notificationState.ts';

type AppNotification = NotificationRecord & { read: boolean };
interface NotificationDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onNotificationsCountChange: (count: number) => void;
  governorate?: string;
}

export const NotificationDrawer: React.FC<NotificationDrawerProps> = ({
  isOpen,
  onClose,
  onNotificationsCountChange,
  governorate = '',
}) => {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [filterType, setFilterType] = useState<'all' | 'unread' | 'weather' | 'crop_advice' | 'ramadan'>('all');
  const [loading, setLoading] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const fetchNotifs = async () => {
    setLoading(true);
    setFetchError(null);
    try {
      const response = await fetch(`/api/notifications?governorate=${encodeURIComponent(governorate)}`, { cache: 'no-store' });
      const data = await response.json();
      if (!response.ok || !data.success || !Array.isArray(data.notifications)) {
        throw new Error('تعذر تحديث قائمة التنبيهات حالياً.');
      }
      const visible = mergeNotifications(data.notifications, governorate) as AppNotification[];
      setNotifications(visible);
      onNotificationsCountChange(visible.filter((item) => !item.read).length);
    } catch (error) {
      setFetchError(error instanceof Error ? error.message : 'تعذر الاتصال بالخادم لجلب التنبيهات.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifs();
  }, [isOpen, governorate]);

  const markAllAsRead = () => {
    markNotificationsRead(notifications.map((item) => item.id));
    setNotifications((previous) => previous.map((item) => ({ ...item, read: true })));
    onNotificationsCountChange(0);
  };

  if (!isOpen) return null;
  const filtered = notifications.filter((item) => {
    if (filterType === 'all') return true;
    if (filterType === 'unread') return !item.read;
    return item.type === filterType;
  });

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <button type="button" aria-label="إغلاق مركز الإشعارات" className="fixed inset-0 bg-slate-950/65 backdrop-blur-sm" onClick={onClose} />
      <section className="relative z-10 flex h-full w-full max-w-sm flex-col border-e border-slate-200 bg-white text-slate-900 shadow-2xl dark:border-sky-300/15 dark:bg-[#0b1329] dark:text-slate-100 sm:max-w-md">
        <header className="flex items-center justify-between gap-3 border-b border-slate-200 bg-slate-50/80 p-4 dark:border-sky-300/15 dark:bg-[#0e1936]">
          <div className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400"><Bell className="h-5 w-5" /></span>
            <div>
              <h2 className="text-sm font-extrabold">مركز التنبيهات والإشعارات</h2>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">تنبيهات الطقس والإرشاد الزراعي</p>
            </div>
          </div>
          <button type="button" onClick={onClose} aria-label="إغلاق" className="flex h-10 w-10 items-center justify-center rounded-xl text-slate-500 hover:bg-slate-200 dark:hover:bg-white/10"><X className="h-5 w-5" /></button>
        </header>

        <div className="space-y-3 border-b border-slate-200 bg-slate-100 p-3 dark:border-sky-300/15 dark:bg-[#132247]">
          <div className="flex items-center justify-between gap-2 text-xs">
            <span className="text-slate-600 dark:text-slate-300">{fetchError || (loading ? 'جارٍ تحديث التنبيهات…' : `عدد التنبيهات: ${notifications.length}`)}</span>
            <button type="button" onClick={fetchNotifs} disabled={loading} className="inline-flex min-h-9 items-center gap-1.5 rounded-lg bg-emerald-600 px-3 text-[11px] font-bold text-white disabled:opacity-50"><RefreshCw className="h-3.5 w-3.5" /> تحديث</button>
          </div>
          <div className="flex items-center gap-1.5 overflow-x-auto">
            {([{ id: 'all', label: 'الكل' }, { id: 'unread', label: 'غير مقروء' }, { id: 'weather', label: 'الطقس' }, { id: 'crop_advice', label: 'إرشاد زراعي' }, { id: 'ramadan', label: 'موسمي' }] as const).map((filter) => (
              <button key={filter.id} type="button" onClick={() => setFilterType(filter.id)} className={`whitespace-nowrap rounded-lg px-2.5 py-1.5 text-[11px] font-bold ${filterType === filter.id ? 'bg-emerald-600 text-white' : 'border border-slate-200 bg-white text-slate-600 dark:border-sky-300/15 dark:bg-[#0e1936] dark:text-slate-300'}`}>{filter.label}</button>
            ))}
            <button type="button" onClick={markAllAsRead} className="whitespace-nowrap rounded-lg px-2.5 py-1.5 text-[11px] font-bold text-emerald-700 hover:bg-emerald-50 dark:text-emerald-300 dark:hover:bg-emerald-950/40">تعيين كمقروء</button>
          </div>
        </div>

        <div className="flex-1 space-y-3 overflow-y-auto p-4">
          {filtered.length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-400">لا توجد تنبيهات مطابقة في الوقت الحالي</div>
          ) : filtered.map((item) => {
            const Icon = item.type === 'weather' ? CloudSun : item.type === 'crop_advice' ? Sprout : item.type === 'ramadan' ? MoonStar : Bell;
            return (
              <article key={item.id} className={`space-y-2 rounded-2xl border p-3.5 ${item.read ? 'border-slate-200 bg-white dark:border-sky-300/10 dark:bg-[#132247]/70' : 'border-emerald-300 bg-emerald-50/50 dark:border-emerald-500/40 dark:bg-[#132247]'}`}>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex min-w-0 items-center gap-2">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400"><Icon className="h-4 w-4" /></span>
                    <h3 className="text-xs font-extrabold text-slate-900 dark:text-white">{item.title}</h3>
                  </div>
                  <time className="shrink-0 text-[10px] text-slate-400">{new Date(item.timestamp).toLocaleTimeString('ar-OM', { hour: '2-digit', minute: '2-digit' })}</time>
                </div>
                <p className="text-xs leading-relaxed text-slate-600 dark:text-slate-300">{item.message}</p>
                {item.targetGovernorate && <p className="text-[10px] font-semibold text-emerald-700 dark:text-emerald-400">المحافظة: {item.targetGovernorate}</p>}
              </article>
            );
          })}
        </div>
      </section>
    </div>
  );
};

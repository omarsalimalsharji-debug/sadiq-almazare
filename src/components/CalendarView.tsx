import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Calendar as CalendarIcon,
  AlertCircle,
  Sprout,
  Droplets,
  Sun,
  ShieldAlert,
  Wheat,
  Bell,
  BellRing,
  BellOff,
  CheckCircle2,
  Clock,
  MapPin,
  Search,
  LayoutGrid,
  Table2,
  ListChecks,
  RotateCcw,
  Send,
  Trash2,
  X,
  Thermometer,
  Sparkles,
  PauseCircle,
  PlayCircle,
} from 'lucide-react';
import {
  OMAN_AGRICULTURAL_CALENDAR,
  OMANI_GOVERNORATES,
} from '../data/agriculturalData.ts';
import {
  PROJECT_CROPS_CALENDAR,
  OMAN_MONTH_NAMES_SHORT,
  PHASE_META,
  getOmaniZoneForGovernorate,
  CalendarActivityPhase,
  ProjectCropCalendarDef,
} from '../data/omaniCalendarData.ts';
import { computeOmaniHijriState } from '../utils/islamicCalendar.ts';
import { UserProfile } from '../types/index.ts';
import { useLocation } from '../context/LocationContext.tsx';
import { auth } from '../firebase.ts';

export interface CalendarReminderItem {
  id: string;
  userId: string;
  cropId: string;
  cropName: string;
  monthIndex: number;
  phase: string;
  cadence: 'daily_dawn' | 'every_2_days' | 'weekly' | 'monthly_start';
  governorate: string;
  title: string;
  message: string;
  enabled: boolean;
  createdAt: number;
  lastDispatchedAt?: number;
}

interface CalendarViewProps {
  user?: UserProfile;
  unreadNotifsCount?: number;
  onNotificationsUpdated?: (unreadCount: number) => void;
  onOpenNotifications?: () => void;
}

type CategoryFilter = 'الكل' | 'نخيل' | 'خضراوات' | 'حمضيات وفاكهة' | 'محاصيل حقلية';
type PhaseFilter = 'all' | CalendarActivityPhase;
type ViewMode = 'month_detail' | 'annual_matrix' | 'reminders';
type ReminderCadence = CalendarReminderItem['cadence'];

const CADENCE_LABELS: Record<ReminderCadence, string> = {
  daily_dawn: 'تذكير فجراً يومياً',
  every_2_days: 'كل يومين',
  weekly: 'أسبوعياً',
  monthly_start: 'مطلع كل شهر',
};

const STORAGE_REMINDERS_CACHE_KEY = 'oman_calendar_reminders_cache_v1';

function getPhaseIcon(phase: CalendarActivityPhase) {
  switch (phase) {
    case 'planting':
      return Sprout;
    case 'irrigation':
      return Droplets;
    case 'fertilizing':
      return Sparkles;
    case 'pest_care':
      return ShieldAlert;
    case 'harvest':
      return Wheat;
    default:
      return Sun;
  }
}

export const CalendarView: React.FC<CalendarViewProps> = ({
  user,
  unreadNotifsCount = 0,
  onNotificationsUpdated,
  onOpenNotifications,
}) => {
  const { location } = useLocation();
  const realCurrentMonthIdx = new Date().getMonth();
  const userId = auth.currentUser?.uid || 'guest';
  const remindersCacheKey = `${STORAGE_REMINDERS_CACHE_KEY}:${userId}`;
  const hijri = computeOmaniHijriState();

  const [selectedMonthIdx, setSelectedMonthIdx] = useState<number>(realCurrentMonthIdx);
  const [selectedGovernorate, setSelectedGovernorate] = useState<string>(
    location.governorate || user?.governorate || 'محافظة الداخلية'
  );
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>('الكل');
  const [phaseFilter, setPhaseFilter] = useState<PhaseFilter>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [viewMode, setViewMode] = useState<ViewMode>('month_detail');

  const [reminders, setReminders] = useState<CalendarReminderItem[]>(() => {
    try {
      const raw = localStorage.getItem(remindersCacheKey);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {
      // ignore localStorage read failure
    }
    return [];
  });
  const [loadingReminders, setLoadingReminders] = useState<boolean>(false);
  const [syncingMonthAlerts, setSyncingMonthAlerts] = useState<boolean>(false);
  const [busyCropId, setBusyCropId] = useState<string | null>(null);
  const [selectedCadenceByCrop, setSelectedCadenceByCrop] = useState<Record<string, ReminderCadence>>({});
  const [statusBanner, setStatusBanner] = useState<{
    kind: 'success' | 'error' | 'info';
    text: string;
  } | null>(null);
  const [detailCrop, setDetailCrop] = useState<ProjectCropCalendarDef | null>(null);
  const [browserNotifPermission, setBrowserNotifPermission] = useState<NotificationPermission | 'unsupported'>(() => {
    if (typeof window === 'undefined' || !('Notification' in window)) return 'unsupported';
    return window.Notification.permission;
  });

  useEffect(() => {
    if (location.governorate) {
      setSelectedGovernorate(location.governorate);
    } else if (user?.governorate && !selectedGovernorate) {
      setSelectedGovernorate(user.governorate);
    }
  }, [location.governorate, user?.governorate]);

  const agroZoneInfo = useMemo(
    () => getOmaniZoneForGovernorate(selectedGovernorate),
    [selectedGovernorate]
  );

  const monthData =
    OMAN_AGRICULTURAL_CALENDAR[selectedMonthIdx] || OMAN_AGRICULTURAL_CALENDAR[0];

  const governorateOptions = useMemo(() => {
    const names = OMANI_GOVERNORATES.map((g) => g.name);
    if (!names.includes('الجبل الأخضر (مرتفعات)')) {
      names.push('الجبل الأخضر (مرتفعات)');
    }
    if (selectedGovernorate && !names.includes(selectedGovernorate)) {
      names.unshift(selectedGovernorate);
    }
    return names;
  }, [selectedGovernorate]);

  const persistCache = useCallback((list: CalendarReminderItem[]) => {
    try {
      localStorage.setItem(remindersCacheKey, JSON.stringify(list));
    } catch {
      // ignore storage quota errors
    }
  }, [remindersCacheKey]);

  const getFarmerAuthHeaders = useCallback(async (includeJson = false): Promise<Record<string, string>> => {
    const signedInUser = auth.currentUser;
    if (!signedInUser) throw new Error('يرجى تسجيل الدخول بحساب Google لحفظ التذكيرات ومزامنتها. يمكنك متابعة تصفح التقويم كزائر.');
    const idToken = await signedInUser.getIdToken();
    return { ...(includeJson ? { 'Content-Type': 'application/json' } : {}), Authorization: `Bearer ${idToken}` };
  }, []);

  const fetchReminders = useCallback(async () => {
    if (!auth.currentUser) {
      setReminders([]);
      setLoadingReminders(false);
      return;
    }
    setLoadingReminders(true);
    try {
      const res = await fetch('/api/calendar/reminders', { headers: await getFarmerAuthHeaders() });
      const data = await res.json();
      if (res.ok && data.success && Array.isArray(data.reminders)) {
        setReminders(data.reminders);
        persistCache(data.reminders);
        if (typeof data.unreadNotificationsCount === 'number') {
          onNotificationsUpdated?.(data.unreadNotificationsCount);
        }
      }
    } catch {
      // fallback silently to cached reminders
    } finally {
      setLoadingReminders(false);
    }
  }, [userId, onNotificationsUpdated, persistCache, getFarmerAuthHeaders]);

  useEffect(() => {
    fetchReminders();
  }, [fetchReminders]);

  const maybeShowBrowserNotification = (title: string, body: string) => {
    if (
      typeof window !== 'undefined' &&
      'Notification' in window &&
      window.Notification.permission === 'granted'
    ) {
      try {
        new window.Notification(title, {
          body,
          dir: 'rtl',
          lang: 'ar',
        });
      } catch {
        // ignore iFrame notification restrictions
      }
    }
  };

  const requestBrowserNotifications = async () => {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      setBrowserNotifPermission('unsupported');
      setStatusBanner({
        kind: 'info',
        text: 'متصفحك الحالي يعتمد على جرس التنبيهات الداخلي في التطبيق بدلاً من إشعارات المتصفح.',
      });
      return;
    }
    try {
      const perm = await window.Notification.requestPermission();
      setBrowserNotifPermission(perm);
      if (perm === 'granted') {
        setStatusBanner({
          kind: 'success',
          text: 'تم تفعيل تنبيهات المتصفح المباشرة بنجاح جنباً إلى جنب مع جرس التطبيق.',
        });
        maybeShowBrowserNotification(
          'صديق المزارع — التقويم الزراعي',
          'ستصلك تنبيهات الزراعة والري والحصاد مباشرة هنا وفي مركز الإشعارات.'
        );
      } else {
        setStatusBanner({
          kind: 'info',
          text: 'تبقى التنبيهات مفعّلة بالكامل عبر جرس مركز الإشعارات داخل التطبيق.',
        });
      }
    } catch {
      setStatusBanner({
        kind: 'info',
        text: 'تم الاعتماد على مركز الإشعارات الداخلي في التطبيق لتسليم التنبيهات.',
      });
    }
  };

  const filteredCrops = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return PROJECT_CROPS_CALENDAR.filter((crop) => {
      if (categoryFilter !== 'الكل' && crop.category !== categoryFilter) {
        return false;
      }
      const slot = crop.monthlySchedule[selectedMonthIdx];
      if (phaseFilter !== 'all' && slot.phase !== phaseFilter) {
        return false;
      }
      if (q) {
        const haystack = `${crop.nameAr} ${crop.category} ${slot.shortLabel} ${slot.detail} ${crop.plantingSummary}`.toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });
  }, [categoryFilter, phaseFilter, searchQuery, selectedMonthIdx]);

  const monthStats = useMemo(() => {
    let planting = 0;
    let irrigationOrPest = 0;
    let harvest = 0;
    for (const crop of PROJECT_CROPS_CALENDAR) {
      const ph = crop.monthlySchedule[selectedMonthIdx].phase;
      if (ph === 'planting') planting++;
      else if (ph === 'irrigation' || ph === 'pest_care') irrigationOrPest++;
      else if (ph === 'harvest') harvest++;
    }
    const activeRemindersCount = reminders.filter((r) => r.enabled).length;
    return { planting, irrigationOrPest, harvest, activeRemindersCount };
  }, [selectedMonthIdx, reminders]);

  const findReminderForCropMonth = (cropId: string, monthIdx: number) =>
    reminders.find((r) => r.cropId === cropId && r.monthIndex === monthIdx);

  const handleScheduleOrSendCropAlert = async (
    crop: ProjectCropCalendarDef,
    pushImmediately: boolean
  ) => {
    const slot = crop.monthlySchedule[selectedMonthIdx];
    const cadence = selectedCadenceByCrop[crop.id] || 'weekly';
    setBusyCropId(crop.id);
    setStatusBanner(null);

    try {
      const res = await fetch('/api/calendar/reminders', {
        method: 'POST',
        headers: await getFarmerAuthHeaders(true),
        body: JSON.stringify({
          cropId: crop.id,
          cropName: crop.nameAr,
          monthIndex: selectedMonthIdx,
          phase: slot.phase,
          cadence,
          governorate: selectedGovernorate,
          title: slot.suggestedAlertTitle,
          message: `${slot.suggestedAlertBody} (${selectedGovernorate} · ولاية ${location.wilayat} · ${OMAN_MONTH_NAMES_SHORT[selectedMonthIdx]})`,
          pushImmediately,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setStatusBanner({
          kind: 'error',
          text: data.error || 'تعذر حفظ التنبيه الزراعي الآن.',
        });
        return;
      }

      setReminders((prev) => {
        const filtered = prev.filter((r) => r.id !== data.reminder.id);
        const next = [data.reminder, ...filtered];
        persistCache(next);
        return next;
      });

      if (typeof data.unreadCount === 'number') {
        onNotificationsUpdated?.(data.unreadCount);
      }

      if (pushImmediately) {
        maybeShowBrowserNotification(slot.suggestedAlertTitle, slot.suggestedAlertBody);
        setStatusBanner({
          kind: 'success',
          text: `تمت جدولة تنبيه «${crop.nameAr}» وإرسال إشعار فوري إلى جرس التنبيهات.`,
        });
      } else {
        setStatusBanner({
          kind: 'success',
          text: `تم حفظ جدولة تنبيه «${crop.nameAr}» (${CADENCE_LABELS[cadence]}) لشهر ${OMAN_MONTH_NAMES_SHORT[selectedMonthIdx]}.`,
        });
      }
    } catch (error) {
      setStatusBanner({
        kind: 'error',
        text: error instanceof Error ? error.message : 'تعذر الاتصال بالخادم لحفظ التنبيه. يرجى المحاولة مجدداً.',
      });
    } finally {
      setBusyCropId(null);
    }
  };

  const handleSyncMonthPriorityAlerts = async () => {
    const priorityCrops = filteredCrops.filter((crop) => {
      const pr = crop.monthlySchedule[selectedMonthIdx].alertPriority;
      return pr === 'high' || pr === 'medium';
    });
    const targets = priorityCrops.length > 0 ? priorityCrops.slice(0, 8) : filteredCrops.slice(0, 6);

    if (targets.length === 0) {
      setStatusBanner({
        kind: 'info',
        text: 'لا توجد محاصيل مطابقة للتصفية الحالية لمزامنة تنبيهاتها.',
      });
      return;
    }

    setSyncingMonthAlerts(true);
    setStatusBanner(null);

    try {
      const alertsPayload = targets.map((crop) => {
        const slot = crop.monthlySchedule[selectedMonthIdx];
        const zoneTip = crop.zoneNotes[agroZoneInfo.zone];
        return {
          cropId: crop.id,
          title: slot.suggestedAlertTitle,
          message: `${slot.suggestedAlertBody} — ملاحظة المنطقة: ${zoneTip}`,
        };
      });

      const res = await fetch('/api/calendar/sync-alerts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          governorate: `${selectedGovernorate} - ولاية ${location.wilayat}`,
          monthIndex: selectedMonthIdx,
          alerts: alertsPayload,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setStatusBanner({
          kind: 'error',
          text: data.error || 'تعذر مزامنة تنبيهات الشهر.',
        });
        return;
      }

      if (typeof data.unreadCount === 'number') {
        onNotificationsUpdated?.(data.unreadCount);
      }

      if (data.addedCount > 0) {
        maybeShowBrowserNotification(
          `توصيات ${OMAN_MONTH_NAMES_SHORT[selectedMonthIdx]} الزراعية`,
          `تمت إضافة ${data.addedCount} تنبيهات زراعية إلى جرس التطبيق لمحافظة ${selectedGovernorate}.`
        );
        setStatusBanner({
          kind: 'success',
          text: `تم إرسال ${data.addedCount} تنبيهات زراعية لشهر ${OMAN_MONTH_NAMES_SHORT[selectedMonthIdx]} إلى مركز التنبيهات (${selectedGovernorate}).`,
        });
      } else {
        setStatusBanner({
          kind: 'info',
          text: `تنبيهات شهر ${OMAN_MONTH_NAMES_SHORT[selectedMonthIdx]} لهذه المحاصيل مزامنة مسبقاً اليوم في جرس الإشعارات.`,
        });
      }
    } catch {
      setStatusBanner({
        kind: 'error',
        text: 'حدث خطأ أثناء الاتصال بالخادم لمزامنة التنبيهات.',
      });
    } finally {
      setSyncingMonthAlerts(false);
    }
  };

  const handleToggleReminder = async (reminder: CalendarReminderItem) => {
    try {
      const res = await fetch(`/api/calendar/reminders/${reminder.id}`, {
        method: 'PATCH',
        headers: await getFarmerAuthHeaders(true),
        body: JSON.stringify({ enabled: !reminder.enabled }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setReminders((prev) => {
          const next = prev.map((r) => (r.id === reminder.id ? data.reminder : r));
          persistCache(next);
          return next;
        });
      }
    } catch {
      setStatusBanner({ kind: 'error', text: 'تعذر تحديث حالة التنبيه.' });
    }
  };

  const handleDispatchReminderNow = async (reminder: CalendarReminderItem) => {
    try {
      const res = await fetch(`/api/calendar/reminders/${reminder.id}`, {
        method: 'PATCH',
        headers: await getFarmerAuthHeaders(true),
        body: JSON.stringify({ dispatchNow: true }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setReminders((prev) => {
          const next = prev.map((r) => (r.id === reminder.id ? data.reminder : r));
          persistCache(next);
          return next;
        });
        if (typeof data.unreadCount === 'number') {
          onNotificationsUpdated?.(data.unreadCount);
        }
        maybeShowBrowserNotification(reminder.title, reminder.message);
        setStatusBanner({
          kind: 'success',
          text: `تم إرسال تذكير «${reminder.cropName}» إلى مركز التنبيهات بنجاح.`,
        });
      }
    } catch {
      setStatusBanner({ kind: 'error', text: 'تعذر إرسال التذكير الآن.' });
    }
  };

  const handleDeleteReminder = async (reminder: CalendarReminderItem) => {
    try {
      const res = await fetch(`/api/calendar/reminders/${reminder.id}`, {
        method: 'DELETE',
        headers: await getFarmerAuthHeaders(),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setReminders((prev) => {
          const next = prev.filter((r) => r.id !== reminder.id);
          persistCache(next);
          return next;
        });
        setStatusBanner({
          kind: 'info',
          text: `تم حذف التنبيه المجدول لمحصول «${reminder.cropName}».`,
        });
      }
    } catch {
      setStatusBanner({ kind: 'error', text: 'تعذر حذف التنبيه.' });
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-5 overflow-x-hidden pb-6">
      {/* Header */}
      <div className="border-b border-stone-200 dark:border-sky-300/15 pb-4 flex flex-col lg:flex-row lg:items-end justify-between gap-4">
        <div className="space-y-1.5">
          <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-emerald-700 dark:text-emerald-400">
            <CalendarIcon className="w-4 h-4 shrink-0" />
            <span>التقويم الزراعي التفاعلي لسلطنة عُمان</span>
            <span className="text-stone-300 dark:text-slate-600">·</span>
            <span className="tabular-nums">{hijri.formattedAr}</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-stone-900 dark:text-white">
            مواعيد الزراعة والري والحصاد والتنبيهات الموسمية
          </h1>
          <p className="text-xs sm:text-sm text-stone-600 dark:text-slate-300">
            خطط عمل شهرية وسنوية لجميع محاصيل المشروع (14 محصولاً عُمانياً) مخصصة حسب منطقتك المناخية ومربوطة بمركز الإشعارات.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleSyncMonthPriorityAlerts}
            disabled={syncingMonthAlerts}
            className="min-h-[40px] px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-60 text-white text-xs font-bold flex items-center gap-1.5 transition-colors"
          >
            <BellRing className="w-4 h-4 shrink-0" />
            <span>
              {syncingMonthAlerts
                ? 'جاري مزامنة التنبيهات...'
                : `مزامنة تنبيهات ${OMAN_MONTH_NAMES_SHORT[selectedMonthIdx]} للجرس`}
            </span>
          </button>

          {onOpenNotifications && (
            <button
              type="button"
              onClick={onOpenNotifications}
              className="min-h-[40px] px-3.5 py-2 rounded-xl bg-white dark:bg-[#132247] border border-stone-200 dark:border-sky-300/15 hover:border-emerald-500 text-stone-800 dark:text-slate-100 text-xs font-bold flex items-center gap-1.5 transition-colors"
            >
              <Bell className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <span>مركز التنبيهات</span>
              <span className="tabular-nums font-mono px-1.5 py-0.5 rounded-md bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 text-[11px]">
                {unreadNotifsCount}
              </span>
            </button>
          )}

          {selectedMonthIdx !== realCurrentMonthIdx && (
            <button
              type="button"
              onClick={() => setSelectedMonthIdx(realCurrentMonthIdx)}
              className="min-h-[40px] px-3 py-2 rounded-xl bg-stone-100 dark:bg-[#0e1936] border border-stone-200 dark:border-sky-300/15 text-stone-700 dark:text-slate-200 text-xs font-bold flex items-center gap-1.5"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>الشهر الحالي</span>
            </button>
          )}
        </div>
      </div>

      {/* Inline Status Feedback */}
      {statusBanner && (
        <div
          role="status"
          className={`p-3.5 rounded-2xl border flex items-center justify-between gap-3 text-xs sm:text-sm ${
            statusBanner.kind === 'success'
              ? 'bg-emerald-500/10 border-emerald-500/35 text-emerald-900 dark:text-emerald-200'
              : statusBanner.kind === 'error'
              ? 'bg-rose-500/10 border-rose-500/35 text-rose-900 dark:text-rose-200'
              : 'bg-sky-500/10 border-sky-500/35 text-sky-900 dark:text-sky-200'
          }`}
        >
          <div className="flex items-center gap-2">
            {statusBanner.kind === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-amber-500 shrink-0" />
            )}
            <span>{statusBanner.text}</span>
          </div>
          <button
            type="button"
            onClick={() => setStatusBanner(null)}
            className="p-1 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 shrink-0"
            aria-label="إغلاق الرسالة"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Agro-Zone Bar + KPI Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3">
        <div className="lg:col-span-5 bg-white dark:bg-[#132247] rounded-2xl border border-stone-200 dark:border-sky-300/15 p-4 flex flex-col justify-between gap-3">
          <div className="flex items-center justify-between gap-2">
            <label
              htmlFor="calendar-governorate-select"
              className="text-xs font-bold text-stone-800 dark:text-slate-100 flex items-center gap-1.5"
            >
              <MapPin className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <span>تخصيص التقويم حسب المحافظة والمناخ:</span>
            </label>
          </div>
          <select
            id="calendar-governorate-select"
            value={selectedGovernorate}
            onChange={(e) => setSelectedGovernorate(e.target.value)}
            className="w-full min-h-[42px] px-3 rounded-xl bg-stone-50 dark:bg-[#0e1936] border border-stone-200 dark:border-sky-300/20 text-xs sm:text-sm font-semibold text-stone-900 dark:text-white focus:outline-none focus:border-emerald-500"
          >
            {governorateOptions.map((gov) => (
              <option key={gov} value={gov}>
                {gov}
              </option>
            ))}
          </select>
          <div className="text-[11px] text-stone-600 dark:text-slate-300 flex flex-wrap items-center gap-1.5">
            <span className="font-semibold text-emerald-700 dark:text-emerald-400">
              النطاق الزراعي:
            </span>
            <span>{agroZoneInfo.labelAr}</span>
            <span className="text-stone-400">·</span>
            <span>ولاية {location.wilayat} ({location.village})</span>
          </div>
        </div>

        <div className="lg:col-span-7 grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          <div className="bg-white dark:bg-[#132247] rounded-2xl border border-stone-200 dark:border-sky-300/15 p-3.5 flex flex-col justify-between">
            <div className="flex items-center gap-1.5 text-[11px] font-semibold text-emerald-700 dark:text-emerald-400">
              <Sprout className="w-3.5 h-3.5 shrink-0" />
              <span>موسم زراعة وشتل</span>
            </div>
            <div className="text-2xl font-bold text-stone-900 dark:text-white tabular-nums mt-2">
              {monthStats.planting}
            </div>
            <div className="text-[11px] text-stone-500 dark:text-slate-400">
              في {OMAN_MONTH_NAMES_SHORT[selectedMonthIdx]}
            </div>
          </div>

          <div className="bg-white dark:bg-[#132247] rounded-2xl border border-stone-200 dark:border-sky-300/15 p-3.5 flex flex-col justify-between">
            <div className="flex items-center gap-1.5 text-[11px] font-semibold text-sky-700 dark:text-sky-400">
              <Droplets className="w-3.5 h-3.5 shrink-0" />
              <span>ري ووقاية مكثفة</span>
            </div>
            <div className="text-2xl font-bold text-stone-900 dark:text-white tabular-nums mt-2">
              {monthStats.irrigationOrPest}
            </div>
            <div className="text-[11px] text-stone-500 dark:text-slate-400">
              تتطلب متابعة ميدانية
            </div>
          </div>

          <div className="bg-white dark:bg-[#132247] rounded-2xl border border-stone-200 dark:border-sky-300/15 p-3.5 flex flex-col justify-between">
            <div className="flex items-center gap-1.5 text-[11px] font-semibold text-orange-700 dark:text-orange-400">
              <Wheat className="w-3.5 h-3.5 shrink-0" />
              <span>ذروة حصاد وجني</span>
            </div>
            <div className="text-2xl font-bold text-stone-900 dark:text-white tabular-nums mt-2">
              {monthStats.harvest}
            </div>
            <div className="text-[11px] text-stone-500 dark:text-slate-400">
              محاصيل جاهزة للجني
            </div>
          </div>

          <button
            type="button"
            onClick={() => setViewMode('reminders')}
            className="bg-white dark:bg-[#132247] rounded-2xl border border-stone-200 dark:border-sky-300/15 hover:border-emerald-500 p-3.5 flex flex-col justify-between text-right transition-colors"
          >
            <div className="flex items-center gap-1.5 text-[11px] font-semibold text-amber-700 dark:text-amber-400">
              <BellRing className="w-3.5 h-3.5 shrink-0" />
              <span>تنبيهاتي المجدولة</span>
            </div>
            <div className="text-2xl font-bold text-stone-900 dark:text-white tabular-nums mt-2">
              {monthStats.activeRemindersCount}
            </div>
            <div className="text-[11px] text-emerald-700 dark:text-emerald-400 font-semibold">
              إدارة التذكيرات ←
            </div>
          </button>
        </div>
      </div>

      {/* 12-Month Switcher */}
      <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-2">
        {OMAN_AGRICULTURAL_CALENDAR.map((item, idx) => {
          const isSelected = idx === selectedMonthIdx;
          const isCurrent = idx === realCurrentMonthIdx;
          return (
            <button
              key={idx}
              type="button"
              onClick={() => setSelectedMonthIdx(idx)}
              className={`min-h-[56px] p-2.5 rounded-xl border text-center transition-colors ${
                isSelected
                  ? 'bg-emerald-600 text-white border-emerald-600 font-bold'
                  : 'bg-white dark:bg-[#132247] text-stone-700 dark:text-slate-200 border-stone-200 dark:border-sky-300/15 hover:border-emerald-400'
              }`}
            >
              <div className="flex items-center justify-center gap-1 text-xs font-bold">
                <span className="tabular-nums">{idx + 1}.</span>
                <span className="truncate">{OMAN_MONTH_NAMES_SHORT[idx]}</span>
              </div>
              <div
                className={`text-[10px] mt-0.5 truncate ${
                  isSelected ? 'text-emerald-100' : 'text-stone-500 dark:text-slate-400'
                }`}
              >
                {isCurrent ? 'الشهر الحالي · ' : ''}
                {item.season}
              </div>
            </button>
          );
        })}
      </div>

      {/* Filter + View Switcher Bar */}
      <div className="bg-white dark:bg-[#132247] rounded-2xl border border-stone-200 dark:border-sky-300/15 p-3.5 space-y-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* View Mode Segmented Control */}
          <div className="inline-flex flex-wrap items-center gap-1 p-1 rounded-xl bg-stone-100 dark:bg-[#0e1936] border border-stone-200/70 dark:border-sky-300/15">
            <button
              type="button"
              onClick={() => setViewMode('month_detail')}
              className={`min-h-[36px] px-3 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors ${
                viewMode === 'month_detail'
                  ? 'bg-emerald-600 text-white'
                  : 'text-stone-600 dark:text-slate-300 hover:text-stone-900 dark:hover:text-white'
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span>جدول الشهر ({OMAN_MONTH_NAMES_SHORT[selectedMonthIdx]})</span>
            </button>

            <button
              type="button"
              onClick={() => setViewMode('annual_matrix')}
              className={`min-h-[36px] px-3 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors ${
                viewMode === 'annual_matrix'
                  ? 'bg-emerald-600 text-white'
                  : 'text-stone-600 dark:text-slate-300 hover:text-stone-900 dark:hover:text-white'
              }`}
            >
              <Table2 className="w-3.5 h-3.5" />
              <span>المصفوفة السنوية 12 شهراً</span>
            </button>

            <button
              type="button"
              onClick={() => setViewMode('reminders')}
              className={`min-h-[36px] px-3 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors ${
                viewMode === 'reminders'
                  ? 'bg-emerald-600 text-white'
                  : 'text-stone-600 dark:text-slate-300 hover:text-stone-900 dark:hover:text-white'
              }`}
            >
              <ListChecks className="w-3.5 h-3.5" />
              <span>التنبيهات المجدولة ({reminders.length})</span>
            </button>
          </div>

          {/* Search Box */}
          <div className="relative w-full md:w-72">
            <Search className="w-4 h-4 text-stone-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="ابحث عن محصول (النخيل، الطماطم، البصل...)"
              className="w-full min-h-[40px] pr-9 pl-3 rounded-xl bg-stone-50 dark:bg-[#0e1936] border border-stone-200 dark:border-sky-300/15 text-xs text-stone-900 dark:text-white placeholder:text-stone-400 focus:outline-none focus:border-emerald-500"
            />
          </div>
        </div>

        {/* Category + Phase Filters (visible in month_detail and annual_matrix) */}
        {viewMode !== 'reminders' && (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pt-2 border-t border-stone-100 dark:border-sky-300/10">
            <div className="flex flex-wrap items-center gap-1.5">
              {(
                ['الكل', 'نخيل', 'خضراوات', 'حمضيات وفاكهة', 'محاصيل حقلية'] as const
              ).map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setCategoryFilter(cat)}
                  className={`min-h-[34px] px-3 rounded-lg text-xs font-semibold border transition-colors ${
                    categoryFilter === cat
                      ? 'bg-stone-900 dark:bg-emerald-600 text-white border-stone-900 dark:border-emerald-600'
                      : 'bg-stone-50 dark:bg-[#0e1936] text-stone-700 dark:text-slate-300 border-stone-200 dark:border-sky-300/15 hover:border-emerald-400'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            {viewMode === 'month_detail' && (
              <div className="flex items-center gap-2">
                <label htmlFor="phase-filter-select" className="text-[11px] font-semibold text-stone-500 dark:text-slate-400 whitespace-nowrap">
                  تصفية المرحلة:
                </label>
                <select
                  id="phase-filter-select"
                  value={phaseFilter}
                  onChange={(e) => setPhaseFilter(e.target.value as PhaseFilter)}
                  className="min-h-[34px] px-2.5 rounded-lg bg-stone-50 dark:bg-[#0e1936] border border-stone-200 dark:border-sky-300/15 text-xs font-semibold text-stone-800 dark:text-slate-100 focus:outline-none focus:border-emerald-500"
                >
                  <option value="all">كل المراحل ({PROJECT_CROPS_CALENDAR.length})</option>
                  <option value="planting">موسم الزراعة والشتل</option>
                  <option value="irrigation">الري المكثف والعناية</option>
                  <option value="fertilizing">التسميد والتجهيز</option>
                  <option value="pest_care">التلقيح والوقاية</option>
                  <option value="harvest">موسم الحصاد والجني</option>
                  <option value="rest">راحة أو تعقيم</option>
                </select>
              </div>
            )}
          </div>
        )}
      </div>

      {/* VIEW 1: MONTHLY CROP SCHEDULE CARDS */}
      {viewMode === 'month_detail' && (
        <div className="space-y-4">
          {filteredCrops.length === 0 ? (
            <div className="bg-white dark:bg-[#132247] rounded-2xl border border-stone-200 dark:border-sky-300/15 p-8 text-center space-y-2">
              <p className="text-sm font-bold text-stone-800 dark:text-white">
                لا توجد محاصيل مطابقة لخيارات البحث والتصفية
              </p>
              <button
                type="button"
                onClick={() => {
                  setCategoryFilter('الكل');
                  setPhaseFilter('all');
                  setSearchQuery('');
                }}
                className="min-h-[38px] px-4 rounded-xl bg-emerald-600 text-white text-xs font-bold"
              >
                إعادة ضبط الفلاتر
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {filteredCrops.map((crop) => {
                const slot = crop.monthlySchedule[selectedMonthIdx];
                const meta = PHASE_META[slot.phase];
                const PhaseIcon = getPhaseIcon(slot.phase);
                const savedReminder = findReminderForCropMonth(crop.id, selectedMonthIdx);
                const selectedCadence =
                  selectedCadenceByCrop[crop.id] || savedReminder?.cadence || 'weekly';
                const zoneNote = crop.zoneNotes[agroZoneInfo.zone];
                const isBusy = busyCropId === crop.id;

                return (
                  <article
                    key={crop.id}
                    className="bg-white dark:bg-[#132247] rounded-2xl border border-stone-200 dark:border-sky-300/15 p-4 flex flex-col justify-between gap-3.5"
                  >
                    <div className="space-y-3">
                      {/* Card Top Header */}
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="text-[11px] font-semibold text-stone-500 dark:text-slate-400">
                            {crop.category} · الحرارة المثلى{' '}
                            <span className="tabular-nums">
                              {crop.idealTempRange[0]}–{crop.idealTempRange[1]}°م
                            </span>
                          </div>
                          <h3 className="text-base sm:text-lg font-bold text-stone-900 dark:text-white mt-0.5">
                            {crop.nameAr}
                          </h3>
                        </div>

                        <div
                          className={`px-2.5 py-1 rounded-lg border text-[11px] font-bold flex items-center gap-1 shrink-0 ${meta.bgClass} ${meta.textClass} ${meta.borderClass}`}
                        >
                          <PhaseIcon className="w-3.5 h-3.5 shrink-0" />
                          <span>{slot.shortLabel}</span>
                        </div>
                      </div>

                      {/* Monthly Field Task */}
                      <p className="text-xs sm:text-sm text-stone-700 dark:text-slate-200 leading-relaxed">
                        {slot.detail}
                      </p>

                      {/* Inline Key Specs (no heavy nested boxes) */}
                      <div className="pt-2 border-t border-stone-100 dark:border-sky-300/10 space-y-1.5 text-xs">
                        <div className="flex items-start gap-2 text-stone-700 dark:text-slate-300">
                          <Droplets className="w-3.5 h-3.5 text-sky-500 shrink-0 mt-0.5" />
                          <span>
                            <strong className="text-stone-900 dark:text-white">جدول الري ({OMAN_MONTH_NAMES_SHORT[selectedMonthIdx]}):</strong>{' '}
                            {slot.irrigationFreq}
                          </span>
                        </div>
                        <div className="flex items-start gap-2 text-stone-700 dark:text-slate-300">
                          <Sprout className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
                          <span>
                            <strong className="text-stone-900 dark:text-white">الزراعة والحصاد:</strong>{' '}
                            {crop.plantingSummary} · الحصاد: {crop.harvestSummary}
                          </span>
                        </div>
                        <div className="flex items-start gap-2 text-stone-700 dark:text-slate-300">
                          <MapPin className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" />
                          <span>
                            <strong className="text-stone-900 dark:text-white">توجيه منطقتك:</strong>{' '}
                            {zoneNote}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Alert Scheduling & Actions Footer */}
                    <div className="pt-3 border-t border-stone-200/80 dark:border-sky-300/15 space-y-2.5">
                      <div className="flex flex-wrap items-center justify-between gap-2 text-[11px]">
                        <span className="font-semibold text-stone-600 dark:text-slate-300 flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                          <span>{savedReminder ? 'تنبيه مجدول لهذا الشهر' : 'ضبط تكرار التنبيه:'}</span>
                        </span>

                        {savedReminder && (
                          <span
                            className={`font-bold flex items-center gap-1 ${
                              savedReminder.enabled
                                ? 'text-emerald-700 dark:text-emerald-400'
                                : 'text-stone-400'
                            }`}
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>{savedReminder.enabled ? 'مفعّل' : 'متوقف مؤقتاً'}</span>
                          </span>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        <select
                          aria-label={`تكرار تنبيه ${crop.nameAr}`}
                          value={selectedCadence}
                          onChange={(e) =>
                            setSelectedCadenceByCrop((prev) => ({
                              ...prev,
                              [crop.id]: e.target.value as ReminderCadence,
                            }))
                          }
                          className="min-h-[38px] px-2.5 rounded-xl bg-stone-50 dark:bg-[#0e1936] border border-stone-200 dark:border-sky-300/20 text-[11px] font-semibold text-stone-800 dark:text-slate-100 focus:outline-none focus:border-emerald-500"
                        >
                          <option value="daily_dawn">تذكير فجراً يومياً</option>
                          <option value="every_2_days">كل يومين</option>
                          <option value="weekly">أسبوعياً</option>
                          <option value="monthly_start">مطلع كل شهر</option>
                        </select>

                        <button
                          type="button"
                          disabled={isBusy}
                          onClick={() => handleScheduleOrSendCropAlert(crop, false)}
                          className="min-h-[38px] px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-60 text-white text-[11px] font-bold flex items-center gap-1.5 transition-colors"
                        >
                          <BellRing className="w-3.5 h-3.5" />
                          <span>{savedReminder ? 'تحديث الجدولة' : 'جدولة تنبيه'}</span>
                        </button>

                        <button
                          type="button"
                          disabled={isBusy}
                          onClick={() => handleScheduleOrSendCropAlert(crop, true)}
                          className="min-h-[38px] px-3 rounded-xl bg-stone-100 dark:bg-[#0e1936] hover:bg-stone-200 dark:hover:bg-slate-800 border border-stone-200 dark:border-sky-300/15 text-stone-800 dark:text-slate-100 text-[11px] font-bold flex items-center gap-1.5 transition-colors"
                        >
                          <Send className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                          <span>أرسل للجرس الآن</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => setDetailCrop(crop)}
                          className="min-h-[38px] px-2.5 rounded-xl text-emerald-700 dark:text-emerald-400 hover:bg-emerald-500/10 text-[11px] font-bold mr-auto"
                        >
                          خطة 12 شهراً ←
                        </button>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* VIEW 2: ANNUAL 12-MONTH INTERACTIVE MATRIX */}
      {viewMode === 'annual_matrix' && (
        <div className="bg-white dark:bg-[#132247] rounded-2xl border border-stone-200 dark:border-sky-300/15 overflow-hidden">
          <div className="p-4 border-b border-stone-200 dark:border-sky-300/15 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-sm sm:text-base font-bold text-stone-900 dark:text-white">
                المصفوفة السنوية لمحاصيل سلطنة عُمان (12 شهراً)
              </h2>
              <p className="text-xs text-stone-500 dark:text-slate-400">
                اضغط على أي خلية للانتقال إلى تفاصيل ذلك الشهر أو اضغط على اسم المحصول لعرض خطته الكاملة.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2 text-[11px]">
              {(['planting', 'irrigation', 'fertilizing', 'pest_care', 'harvest'] as CalendarActivityPhase[]).map(
                (ph) => {
                  const meta = PHASE_META[ph];
                  const Icon = getPhaseIcon(ph);
                  return (
                    <span
                      key={ph}
                      className={`px-2 py-1 rounded-md border font-semibold inline-flex items-center gap-1 ${meta.bgClass} ${meta.textClass} ${meta.borderClass}`}
                    >
                      <Icon className="w-3 h-3" />
                      <span>{meta.shortCode}</span>
                    </span>
                  );
                }
              )}
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs border-collapse min-w-[820px]">
              <thead>
                <tr className="bg-stone-50 dark:bg-[#0e1936] border-b border-stone-200 dark:border-sky-300/15">
                  <th className="sticky right-0 z-10 bg-stone-50 dark:bg-[#0e1936] text-right px-3.5 py-3 font-bold text-stone-800 dark:text-white border-l border-stone-200 dark:border-sky-300/15 min-w-[170px]">
                    المحصول العُماني
                  </th>
                  {OMAN_MONTH_NAMES_SHORT.map((mName, idx) => (
                    <th
                      key={mName}
                      className={`px-2 py-3 text-center font-bold whitespace-nowrap ${
                        idx === selectedMonthIdx
                          ? 'bg-emerald-600/15 text-emerald-800 dark:text-emerald-300'
                          : 'text-stone-600 dark:text-slate-300'
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => setSelectedMonthIdx(idx)}
                        className="hover:underline"
                      >
                        {mName}
                      </button>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100 dark:divide-sky-300/10">
                {filteredCrops.map((crop) => (
                  <tr key={crop.id} className="hover:bg-stone-50/70 dark:hover:bg-white/[0.02]">
                    <td className="sticky right-0 z-10 bg-white dark:bg-[#132247] px-3.5 py-2.5 border-l border-stone-200 dark:border-sky-300/15">
                      <button
                        type="button"
                        onClick={() => setDetailCrop(crop)}
                        className="text-right hover:text-emerald-600 dark:hover:text-emerald-400 font-bold text-stone-900 dark:text-white block"
                      >
                        {crop.nameAr}
                      </button>
                      <span className="text-[10px] text-stone-500 dark:text-slate-400">
                        {crop.category}
                      </span>
                    </td>
                    {crop.monthlySchedule.map((slot, mIdx) => {
                      const meta = PHASE_META[slot.phase];
                      const Icon = getPhaseIcon(slot.phase);
                      const isSel = mIdx === selectedMonthIdx;
                      return (
                        <td
                          key={mIdx}
                          className={`p-1.5 text-center ${
                            isSel ? 'bg-emerald-500/10' : ''
                          }`}
                        >
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedMonthIdx(mIdx);
                              setViewMode('month_detail');
                            }}
                            title={`${crop.nameAr} · ${OMAN_MONTH_NAMES_SHORT[mIdx]}: ${slot.detail}`}
                            className={`w-full py-1.5 px-1 rounded-lg border text-[10px] font-bold flex flex-col items-center justify-center gap-0.5 transition-transform hover:scale-[1.03] ${meta.bgClass} ${meta.textClass} ${meta.borderClass}`}
                          >
                            <Icon className="w-3 h-3 shrink-0" />
                            <span className="truncate max-w-[54px]">{meta.shortCode}</span>
                          </button>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* VIEW 3: SCHEDULED REMINDERS & NOTIFICATION LINK */}
      {viewMode === 'reminders' && (
        <div className="space-y-4">
          {/* Browser Notification Permission Bar */}
          <div className="bg-white dark:bg-[#132247] rounded-2xl border border-stone-200 dark:border-sky-300/15 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-xl bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 flex items-center justify-center shrink-0">
                <Bell className="w-4 h-4" />
              </div>
              <div className="text-xs">
                <h3 className="font-bold text-stone-900 dark:text-white text-sm">
                  ربط التقويم بمركز التنبيهات وإشعارات الجهاز
                </h3>
                <p className="text-stone-600 dark:text-slate-300 mt-0.5">
                  كل تنبيه مجدول هنا يرتبط مباشرة بمركز الإشعارات (الجرس العلوي)، ويمكنك أيضاً تفعيل إشعارات المتصفح المباشرة.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 shrink-0">
              {browserNotifPermission === 'granted' ? (
                <span className="min-h-[38px] px-3 rounded-xl bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 text-xs font-bold flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>إشعارات المتصفح مفعّلة</span>
                </span>
              ) : (
                <button
                  type="button"
                  onClick={requestBrowserNotifications}
                  className="min-h-[38px] px-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5"
                >
                  <BellRing className="w-4 h-4" />
                  <span>تفعيل إشعارات المتصفح</span>
                </button>
              )}

              {onOpenNotifications && (
                <button
                  type="button"
                  onClick={onOpenNotifications}
                  className="min-h-[38px] px-3.5 rounded-xl bg-stone-100 dark:bg-[#0e1936] border border-stone-200 dark:border-sky-300/15 text-stone-800 dark:text-slate-100 text-xs font-bold"
                >
                  عرض سجل الإشعارات ({unreadNotifsCount})
                </button>
              )}
            </div>
          </div>

          {loadingReminders && reminders.length === 0 ? (
            <div className="bg-white dark:bg-[#132247] rounded-2xl border border-stone-200 dark:border-sky-300/15 p-8 text-center text-xs text-stone-500 dark:text-slate-400">
              جاري تحميل التذكيرات الزراعية المجدولة...
            </div>
          ) : reminders.length === 0 ? (
            <div className="bg-white dark:bg-[#132247] rounded-2xl border border-stone-200 dark:border-sky-300/15 p-8 text-center space-y-3">
              <BellOff className="w-8 h-8 text-stone-400 mx-auto" />
              <div>
                <h3 className="text-sm font-bold text-stone-900 dark:text-white">
                  لا توجد تذكيرات مخصصة مجدولة حتى الآن
                </h3>
                <p className="text-xs text-stone-500 dark:text-slate-400 mt-1">
                  اختر أي محصول من جدول الشهر (مثل النخيل أو الطماطم أو البصل) واضغط «جدولة تنبيه» أو «مزامنة تنبيهات الشهر للجرس».
                </p>
              </div>
              <button
                type="button"
                onClick={() => setViewMode('month_detail')}
                className="min-h-[40px] px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold"
              >
                استعراض جدول الشهر لإضافة تنبيهات
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {reminders.map((rem) => (
                <div
                  key={rem.id}
                  className="bg-white dark:bg-[#132247] rounded-2xl border border-stone-200 dark:border-sky-300/15 p-4 space-y-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="text-[11px] font-semibold text-stone-500 dark:text-slate-400">
                        {rem.cropName} · {OMAN_MONTH_NAMES_SHORT[rem.monthIndex]} · {rem.governorate}
                      </div>
                      <h4 className="text-sm font-bold text-stone-900 dark:text-white mt-0.5">
                        {rem.title}
                      </h4>
                    </div>
                    <span
                      className={`px-2 py-0.5 rounded-md text-[11px] font-bold shrink-0 ${
                        rem.enabled
                          ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300'
                          : 'bg-stone-200 dark:bg-slate-800 text-stone-600 dark:text-slate-400'
                      }`}
                    >
                      {rem.enabled ? 'نشط' : 'متوقف'}
                    </span>
                  </div>

                  <p className="text-xs text-stone-600 dark:text-slate-300 leading-relaxed">
                    {rem.message}
                  </p>

                  <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-stone-100 dark:border-sky-300/10 text-[11px]">
                    <span className="text-stone-500 dark:text-slate-400 font-semibold">
                      التكرار: {CADENCE_LABELS[rem.cadence]}
                    </span>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => handleDispatchReminderNow(rem)}
                        className="min-h-[34px] px-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold flex items-center gap-1"
                      >
                        <Send className="w-3 h-3" />
                        <span>إرسال الآن</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleToggleReminder(rem)}
                        className="min-h-[34px] px-2.5 rounded-lg bg-stone-100 dark:bg-[#0e1936] border border-stone-200 dark:border-sky-300/15 text-stone-700 dark:text-slate-200 font-bold flex items-center gap-1"
                      >
                        {rem.enabled ? (
                          <>
                            <PauseCircle className="w-3.5 h-3.5" />
                            <span>إيقاف</span>
                          </>
                        ) : (
                          <>
                            <PlayCircle className="w-3.5 h-3.5 text-emerald-500" />
                            <span>تفعيل</span>
                          </>
                        )}
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDeleteReminder(rem)}
                        className="min-h-[34px] px-2 rounded-lg text-rose-600 dark:text-rose-400 hover:bg-rose-500/10"
                        aria-label={`حذف تنبيه ${rem.cropName}`}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Oman Monthly General Field Operations & Precautions (Preserved from Oman Calendar) */}
      <div className="bg-white dark:bg-[#132247] rounded-2xl border border-stone-200 dark:border-sky-300/15 p-5 sm:p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-stone-100 dark:border-sky-300/15 pb-3">
          <div>
            <span className="text-xs font-bold text-emerald-700 dark:text-emerald-400">
              {monthData.season}
            </span>
            <h2 className="text-lg font-bold text-stone-900 dark:text-white mt-0.5">
              الأولويات الحقلية العامة ومحاذير شهر {monthData.month}
            </h2>
          </div>
          <div className="text-xs text-stone-500 dark:text-slate-400 tabular-nums">
            الشهر {selectedMonthIdx + 1} من 12
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
          {monthData.activities.map((act, idx) => (
            <div
              key={idx}
              className="p-3 rounded-xl bg-stone-50 dark:bg-[#0e1936] border border-stone-200/70 dark:border-sky-300/15 flex items-start gap-2.5 text-xs sm:text-sm text-stone-700 dark:text-slate-200"
            >
              <span className="w-6 h-6 rounded-lg bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 flex items-center justify-center font-bold text-xs shrink-0 tabular-nums">
                {idx + 1}
              </span>
              <span className="leading-relaxed">{act}</span>
            </div>
          ))}
        </div>

        <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-400/35 text-xs sm:text-sm text-amber-950 dark:text-amber-200 flex items-start gap-2.5">
          <AlertCircle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
          <div>
            <strong className="block font-bold mb-0.5 text-amber-800 dark:text-amber-300">
              محاذير وتنبيهات هذا الشهر:
            </strong>
            <p className="leading-relaxed">{monthData.precautions}</p>
          </div>
        </div>
      </div>

      {/* 12-Month Crop Detail Modal (Bottom-Sheet on Mobile) */}
      {detailCrop && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-5 bg-stone-950/70 backdrop-blur-sm"
          onClick={() => setDetailCrop(null)}
        >
          <div
            className="w-full max-w-3xl max-h-[90vh] overflow-y-auto bg-white dark:bg-[#0e1936] rounded-t-3xl sm:rounded-2xl border border-stone-200 dark:border-sky-300/20 p-4 sm:p-6 space-y-4 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3 border-b border-stone-200 dark:border-sky-300/15 pb-3">
              <div>
                <div className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 flex items-center gap-2">
                  <span>{detailCrop.category}</span>
                  <span>·</span>
                  <span className="inline-flex items-center gap-1 tabular-nums">
                    <Thermometer className="w-3.5 h-3.5" />
                    {detailCrop.idealTempRange[0]}–{detailCrop.idealTempRange[1]}°م
                  </span>
                </div>
                <h3 className="text-xl font-bold text-stone-900 dark:text-white mt-1">
                  الخطة السنوية لمحصول {detailCrop.nameAr}
                </h3>
              </div>

              <button
                type="button"
                onClick={() => setDetailCrop(null)}
                className="min-h-[44px] min-w-[44px] p-2 rounded-xl bg-stone-100 dark:bg-[#132247] text-stone-600 dark:text-slate-300 hover:text-stone-900 dark:hover:text-white flex items-center justify-center shrink-0"
                aria-label="إغلاق الخطة السنوية"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Crop Summary Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
              <div className="p-3 rounded-xl bg-stone-50 dark:bg-[#132247] border border-stone-200 dark:border-sky-300/15">
                <strong className="block text-emerald-700 dark:text-emerald-400 mb-1">
                  مواعيد الزراعة والشتل:
                </strong>
                <span className="text-stone-700 dark:text-slate-200">{detailCrop.plantingSummary}</span>
              </div>
              <div className="p-3 rounded-xl bg-stone-50 dark:bg-[#132247] border border-stone-200 dark:border-sky-300/15">
                <strong className="block text-sky-700 dark:text-sky-400 mb-1">
                  برنامج الري:
                </strong>
                <span className="text-stone-700 dark:text-slate-200">{detailCrop.irrigationSummary}</span>
              </div>
              <div className="p-3 rounded-xl bg-stone-50 dark:bg-[#132247] border border-stone-200 dark:border-sky-300/15">
                <strong className="block text-teal-700 dark:text-teal-400 mb-1">
                  التسميد والعناية:
                </strong>
                <span className="text-stone-700 dark:text-slate-200">{detailCrop.fertilizingSummary}</span>
              </div>
              <div className="p-3 rounded-xl bg-stone-50 dark:bg-[#132247] border border-stone-200 dark:border-sky-300/15">
                <strong className="block text-orange-700 dark:text-orange-400 mb-1">
                  موسم الحصاد والجني:
                </strong>
                <span className="text-stone-700 dark:text-slate-200">{detailCrop.harvestSummary}</span>
              </div>
            </div>

            {/* Zone Note Highlight */}
            <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-xs text-stone-800 dark:text-slate-100">
              <strong className="text-emerald-800 dark:text-emerald-300">
                توجيه {selectedGovernorate} ({agroZoneInfo.labelAr}):{' '}
              </strong>
              <span>{detailCrop.zoneNotes[agroZoneInfo.zone]}</span>
            </div>

            {/* 12 Months List */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold text-stone-800 dark:text-slate-200">
                جدول العمليات والري شهراً بشهر:
              </h4>
              <div className="divide-y divide-stone-100 dark:divide-sky-300/10 border border-stone-200 dark:border-sky-300/15 rounded-xl overflow-hidden">
                {detailCrop.monthlySchedule.map((slot, mIdx) => {
                  const meta = PHASE_META[slot.phase];
                  const Icon = getPhaseIcon(slot.phase);
                  const isActiveMonth = mIdx === selectedMonthIdx;
                  return (
                    <div
                      key={mIdx}
                      className={`p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs ${
                        isActiveMonth
                          ? 'bg-emerald-500/10'
                          : 'bg-white dark:bg-[#132247]/60'
                      }`}
                    >
                      <div className="flex items-start gap-2.5">
                        <span className="font-bold text-stone-900 dark:text-white min-w-[60px] tabular-nums">
                          {mIdx + 1}. {OMAN_MONTH_NAMES_SHORT[mIdx]}
                        </span>
                        <div>
                          <div className="font-semibold text-stone-800 dark:text-slate-100">
                            {slot.detail}
                          </div>
                          <div className="text-[11px] text-sky-700 dark:text-sky-300 mt-0.5">
                            الري: {slot.irrigationFreq}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                        <span
                          className={`px-2 py-0.5 rounded-md border text-[11px] font-bold inline-flex items-center gap-1 ${meta.bgClass} ${meta.textClass} ${meta.borderClass}`}
                        >
                          <Icon className="w-3 h-3" />
                          <span>{slot.shortLabel}</span>
                        </span>

                        <button
                          type="button"
                          onClick={() => {
                            setSelectedMonthIdx(mIdx);
                            setDetailCrop(null);
                            setViewMode('month_detail');
                          }}
                          className="text-[11px] font-bold text-emerald-700 dark:text-emerald-400 hover:underline"
                        >
                          فتح الشهر
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

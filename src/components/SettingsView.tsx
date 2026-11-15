import React from 'react';
import { 
  Settings as SettingsIcon, 
  Sun, 
  Moon, 
  Clock, 
  MoonStar, 
  Bell, 
  Globe,
  Smartphone
} from 'lucide-react';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { ThemeMode, UserProfile } from '../types/index.ts';
import { auth, db, handleFirestoreError, OperationType } from '../firebase.ts';
import { PWAInstallButton } from './PWAInstallButton.tsx';

interface SettingsViewProps {
  themeMode: ThemeMode;
  onSetThemeMode: (mode: ThemeMode) => void;
  isEffectiveDark: boolean;
  isRamadanMode: boolean;
  onToggleRamadanMode: () => void;
  user: UserProfile;
  onUpdateUser: (updated: Partial<UserProfile>) => void;
  lang: 'ar' | 'en';
  onToggleLang: () => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  themeMode,
  onSetThemeMode,
  isEffectiveDark,
  isRamadanMode,
  onToggleRamadanMode,
  user,
  onUpdateUser,
  lang,
  onToggleLang,
}) => {
  const currentMuscatTime = new Date().toLocaleTimeString('ar-OM', {
    timeZone: 'Asia/Muscat',
    hour: '2-digit',
    minute: '2-digit'
  });

  const toggleNotif = async (key: keyof UserProfile['notificationPreferences']) => {
    const nextPrefs = {
      ...user.notificationPreferences,
      [key]: !user.notificationPreferences[key]
    };
    onUpdateUser({
      notificationPreferences: nextPrefs
    });

    const fbUid = auth.currentUser?.uid;
    if (fbUid) {
      const privPath = `users/${fbUid}/private/info`;
      try {
        const anyEnabled = Object.values(nextPrefs).some(Boolean);
        await updateDoc(doc(db, 'users', fbUid, 'private', 'info'), {
          notificationsEnabled: anyEnabled,
          updatedAt: serverTimestamp(),
        });
      } catch (err) {
        try {
          handleFirestoreError(err, OperationType.UPDATE, privPath);
        } catch {
          // Local preferences remain saved
        }
      }
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      
      {/* Header */}
      <div className="border-b border-slate-200 dark:border-sky-300/15 pb-4">
        <div className="flex items-center gap-2 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
          <SettingsIcon className="w-4 h-4" />
          <span>تفضيلات التطبيق وتجربة الاستخدام</span>
        </div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
          الإعدادات والمظهر واللغة
        </h1>
        <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 mt-0.5">
          التحكم في النمط النهاري والليلي بتوقيت عُمان، لغة الواجهة، الهوية الموسمية، وتثبيت التطبيق.
        </p>
      </div>

      {/* 1. Day / Night Color System */}
      <div className="bg-white dark:bg-[#132247] rounded-3xl border border-slate-200 dark:border-sky-300/15 p-6 sm:p-7 shadow-sm space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Sun className="w-4 h-4 text-amber-500" />
              <span>نظام المظهر والألوان (النهاري والليلي)</span>
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-300 mt-0.5">
              يتغير المظهر تلقائياً حسب شروق الشمس وغروبها في سلطنة عُمان (مسقط الآن: <span className="font-mono tabular-nums">{currentMuscatTime}</span>).
            </p>
          </div>

          <span className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-300">
            {isEffectiveDark ? 'الوضع الليلي نشط' : 'الوضع النهاري نشط'}
          </span>
        </div>

        {/* 3 Option Selector */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
          <button
            onClick={() => onSetThemeMode('auto')}
            className={`min-h-[44px] p-4 rounded-2xl border text-right transition-all flex flex-col justify-between ${
              themeMode === 'auto'
                ? 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-500 text-emerald-950 dark:text-emerald-200 shadow-sm'
                : 'bg-slate-50 dark:bg-[#0e1936] border-slate-200 dark:border-sky-300/15 text-slate-700 dark:text-slate-200'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="font-bold text-xs">تلقائي (توقيت عُمان)</span>
              <Clock className="w-4 h-4 text-emerald-500" />
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-300/80">
              نهاري من 06:00 إلى 18:59، وليلي مريح للعين باقي الساعات.
            </p>
          </button>

          <button
            onClick={() => onSetThemeMode('light')}
            className={`min-h-[44px] p-4 rounded-2xl border text-right transition-all flex flex-col justify-between ${
              themeMode === 'light'
                ? 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-500 text-emerald-950 dark:text-emerald-200 shadow-sm'
                : 'bg-slate-50 dark:bg-[#0e1936] border-slate-200 dark:border-sky-300/15 text-slate-700 dark:text-slate-200'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="font-bold text-xs">الوضع الصباحي والنهاري</span>
              <Sun className="w-4 h-4 text-amber-500" />
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-300/80">
              خلفيات فاتحة مبهجة ووضوح عالٍ أثناء العمل الميداني نهاراً.
            </p>
          </button>

          <button
            onClick={() => onSetThemeMode('dark')}
            className={`min-h-[44px] p-4 rounded-2xl border text-right transition-all flex flex-col justify-between ${
              themeMode === 'dark'
                ? 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-500 text-emerald-950 dark:text-emerald-200 shadow-sm'
                : 'bg-slate-50 dark:bg-[#0e1936] border-slate-200 dark:border-sky-300/15 text-slate-700 dark:text-slate-200'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="font-bold text-xs">الوضع الأزرق الداكن</span>
              <Moon className="w-4 h-4 text-emerald-400" />
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-300/80">
              الهوية الرسمية الداكنة (#0b1329) المريحة للعين ليلاً ونهاراً.
            </p>
          </button>
        </div>
      </div>

      {/* 2. Language & Install Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white dark:bg-[#132247] rounded-3xl border border-slate-200 dark:border-sky-300/15 p-6 shadow-sm flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-sky-500/15 text-sky-400 flex items-center justify-center shrink-0">
              <Globe className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">لغة الواجهة واتجاه العرض</h2>
              <p className="text-[11px] text-slate-500 dark:text-slate-300">
                الحالية: {lang === 'ar' ? 'العربية (RTL)' : 'English (LTR)'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onToggleLang}
            className="min-h-[44px] px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shrink-0"
          >
            {lang === 'ar' ? 'Switch to English' : 'التبديل للعربية'}
          </button>
        </div>

        <div className="bg-white dark:bg-[#132247] rounded-3xl border border-slate-200 dark:border-sky-300/15 p-6 shadow-sm flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/15 text-emerald-400 flex items-center justify-center shrink-0">
              <Smartphone className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">تثبيت التطبيق على الهاتف</h2>
              <p className="text-[11px] text-slate-500 dark:text-slate-300">
                وصول فوري وعمل أوفلاين كـ PWA
              </p>
            </div>
          </div>
          <div className="shrink-0">
            <PWAInstallButton compact />
          </div>
        </div>
      </div>

      {/* 3. Smart Ramadan Theme */}
      <div className="bg-white dark:bg-[#132247] rounded-3xl border border-slate-200 dark:border-sky-300/15 p-6 sm:p-7 shadow-sm">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/15 text-amber-500 flex items-center justify-center shrink-0">
              <MoonStar className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                الهوية الرمضانية الذكية
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-300 mt-0.5">
                تفعيل الزخارف الإسلامية والتهنئة الرمضانية اليومية وعداد أيام الشهر الفضيل.
              </p>
            </div>
          </div>

          <label className="relative inline-flex items-center cursor-pointer min-h-[44px] min-w-[44px] justify-center">
            <input
              type="checkbox"
              checked={isRamadanMode}
              onChange={onToggleRamadanMode}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-slate-300 dark:bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:relative after:block after:top-[2px] after:start-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-500"></div>
          </label>
        </div>
      </div>

      {/* 4. Notifications Channels */}
      <div className="bg-white dark:bg-[#132247] rounded-3xl border border-slate-200 dark:border-sky-300/15 p-6 sm:p-7 shadow-sm space-y-4">
        <div>
          <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Bell className="w-4 h-4 text-emerald-500" />
            <span>قنوات الإشعارات والتنبيهات الميدانية</span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-300 mt-0.5">
            حدد أنواع التنبيهات التي تهمك في مزرعتك.
          </p>
        </div>

        <div className="divide-y divide-slate-100 dark:divide-sky-300/15 text-xs">
          
          <label className="py-3.5 min-h-[56px] flex items-center justify-between gap-4 cursor-pointer">
            <div>
              <div className="font-bold text-slate-800 dark:text-white">
                تنبيهات الطقس والظروف المناخية
              </div>
              <div className="text-[11px] text-slate-500 dark:text-slate-300/80">
                إنذارات نشاط الرياح، فرص الأمطار، والحرارة الشديدة في محافظتك
              </div>
            </div>
            <input
              type="checkbox"
              checked={user.notificationPreferences?.weatherAlerts ?? true}
              onChange={() => toggleNotif('weatherAlerts')}
              className="accent-emerald-600 w-5 h-5 rounded cursor-pointer shrink-0"
            />
          </label>

          <label className="py-3.5 min-h-[56px] flex items-center justify-between gap-4 cursor-pointer">
            <div>
              <div className="font-bold text-slate-800 dark:text-white">
                إرشادات المحاصيل والآفات العاجلة
              </div>
              <div className="text-[11px] text-slate-500 dark:text-slate-300/80">
                حملات مكافحة دوباس النخيل، مواعيد التكميم، وإرشادات البيوت المحمية
              </div>
            </div>
            <input
              type="checkbox"
              checked={user.notificationPreferences?.cropAdvice ?? true}
              onChange={() => toggleNotif('cropAdvice')}
              className="accent-emerald-600 w-5 h-5 rounded cursor-pointer shrink-0"
            />
          </label>

          <label className="py-3.5 min-h-[56px] flex items-center justify-between gap-4 cursor-pointer">
            <div>
              <div className="font-bold text-slate-800 dark:text-white">
                المعلومة الرمضانية والنصيحة الغذائية اليومية
              </div>
              <div className="text-[11px] text-slate-500 dark:text-slate-300/80">
                إشعار يومي بالمعلومة الزراعية والنباتية المفيدة
              </div>
            </div>
            <input
              type="checkbox"
              checked={user.notificationPreferences?.ramadanDaily ?? true}
              onChange={() => toggleNotif('ramadanDaily')}
              className="accent-emerald-600 w-5 h-5 rounded cursor-pointer shrink-0"
            />
          </label>

          <label className="py-3.5 min-h-[56px] flex items-center justify-between gap-4 cursor-pointer">
            <div>
              <div className="font-bold text-slate-800 dark:text-white">
                ردود وتنبيهات ديوانية المزارعين
              </div>
              <div className="text-[11px] text-slate-500 dark:text-slate-300/80">
                متابعة تفاعلات وردود المزارعين والمهندسين في المنتدى الزراعي
              </div>
            </div>
            <input
              type="checkbox"
              checked={user.notificationPreferences?.communityReplies ?? true}
              onChange={() => toggleNotif('communityReplies')}
              className="accent-emerald-600 w-5 h-5 rounded cursor-pointer shrink-0"
            />
          </label>

        </div>
      </div>

    </div>
  );
};

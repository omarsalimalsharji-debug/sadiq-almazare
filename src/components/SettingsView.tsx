import React from 'react';
import { 
  Settings as SettingsIcon, 
  Sun, 
  Moon, 
  Clock, 
  MoonStar, 
  Bell, 
  Volume2, 
  ShieldCheck, 
  Globe 
} from 'lucide-react';
import { ThemeMode, UserProfile } from '../types/index.ts';

interface SettingsViewProps {
  themeMode: ThemeMode;
  onSetThemeMode: (mode: ThemeMode) => void;
  isEffectiveDark: boolean;
  isRamadanMode: boolean;
  onToggleRamadanMode: () => void;
  user: UserProfile;
  onUpdateUser: (updated: Partial<UserProfile>) => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  themeMode,
  onSetThemeMode,
  isEffectiveDark,
  isRamadanMode,
  onToggleRamadanMode,
  user,
  onUpdateUser
}) => {
  const currentMuscatTime = new Date().toLocaleTimeString('ar-OM', {
    timeZone: 'Asia/Muscat',
    hour: '2-digit',
    minute: '2-digit'
  });

  const toggleNotif = (key: keyof UserProfile['notificationPreferences']) => {
    onUpdateUser({
      notificationPreferences: {
        ...user.notificationPreferences,
        [key]: !user.notificationPreferences[key]
      }
    });
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      
      {/* Header */}
      <div className="border-b border-stone-200 dark:border-stone-800 pb-4">
        <div className="flex items-center gap-2 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
          <SettingsIcon className="w-4 h-4" />
          <span>تفضيلات التطبيق وتجربة الاستخدام</span>
        </div>
        <h1 className="text-2xl font-bold text-stone-900 dark:text-white mt-1">
          الإعدادات والمظهر
        </h1>
        <p className="text-xs sm:text-sm text-stone-600 dark:text-stone-400 mt-0.5">
          التحكم في النمط النهاري والليلي التلقائي حسب توقيت عُمان، الهوية الرمضانية، وخيارات التنبيهات.
        </p>
      </div>

      {/* 1. Day / Night Color System (المرحلة الثالثة) */}
      <div className="bg-white dark:bg-stone-900 rounded-3xl border border-stone-200 dark:border-stone-800 p-6 sm:p-7 shadow-sm space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-base font-bold text-stone-900 dark:text-white flex items-center gap-2">
              <Sun className="w-4 h-4 text-amber-500" />
              <span>نظام المظهر والألوان (النهاري والليلي)</span>
            </h2>
            <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">
              يتغير المظهر تلقائياً بناءً على شروق الشمس وغروبها في سلطنة عُمان (الساعة الحالية في مسقط: {currentMuscatTime}).
            </p>
          </div>

          <span className="text-[11px] font-mono px-2.5 py-1 rounded-md bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300">
            الحالة: {isEffectiveDark ? 'الوضع الليلي نشط' : 'الوضع النهاري نشط'}
          </span>
        </div>

        {/* 3 Option Selector */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
          
          {/* Auto Mode */}
          <button
            onClick={() => onSetThemeMode('auto')}
            className={`p-4 rounded-2xl border text-right transition-all flex flex-col justify-between ${
              themeMode === 'auto'
                ? 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-500 text-emerald-950 dark:text-emerald-200 shadow-sm'
                : 'bg-stone-50 dark:bg-stone-800/40 border-stone-200 dark:border-stone-700 text-stone-700 dark:text-stone-300'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="font-bold text-xs">تلقائي (توقيت عُمان)</span>
              <Clock className="w-4 h-4 text-emerald-600" />
            </div>
            <p className="text-[11px] text-stone-500 dark:text-stone-400">
              نهاري من 06:00 إلى 18:30، وليلي مريح للعين باقي الساعات.
            </p>
          </button>

          {/* Light Mode */}
          <button
            onClick={() => onSetThemeMode('light')}
            className={`p-4 rounded-2xl border text-right transition-all flex flex-col justify-between ${
              themeMode === 'light'
                ? 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-500 text-emerald-950 dark:text-emerald-200 shadow-sm'
                : 'bg-stone-50 dark:bg-stone-800/40 border-stone-200 dark:border-stone-700 text-stone-700 dark:text-stone-300'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="font-bold text-xs">الوضع الصباحي والنهاري</span>
              <Sun className="w-4 h-4 text-amber-500" />
            </div>
            <p className="text-[11px] text-stone-500 dark:text-stone-400">
              خلفيات فاتحة مبهجة ودرجات أخضر زراعي مريحة للنهار.
            </p>
          </button>

          {/* Dark Mode */}
          <button
            onClick={() => onSetThemeMode('dark')}
            className={`p-4 rounded-2xl border text-right transition-all flex flex-col justify-between ${
              themeMode === 'dark'
                ? 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-500 text-emerald-950 dark:text-emerald-200 shadow-sm'
                : 'bg-stone-50 dark:bg-stone-800/40 border-stone-200 dark:border-stone-700 text-stone-700 dark:text-stone-300'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="font-bold text-xs">الوضع الليلي الأنيق</span>
              <Moon className="w-4 h-4 text-emerald-400" />
            </div>
            <p className="text-[11px] text-stone-500 dark:text-stone-400">
              خلفيات داكنة فخمة تقلل إجهاد العين أثناء الليل والمغرب.
            </p>
          </button>

        </div>
      </div>

      {/* 2. Smart Ramadan Theme (المرحلة الرابعة) */}
      <div className="bg-white dark:bg-stone-900 rounded-3xl border border-stone-200 dark:border-stone-800 p-6 sm:p-7 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/10 text-amber-600 flex items-center justify-center">
              <MoonStar className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-stone-900 dark:text-white">
                الهوية الرمضانية الذكية
              </h2>
              <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">
                تفعيل الزخارف الإسلامية والتهنئة الرمضانية اليومية وعداد أيام الشهر الفضيل.
              </p>
            </div>
          </div>

          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={isRamadanMode}
              onChange={onToggleRamadanMode}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-stone-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-stone-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-500"></div>
          </label>
        </div>
      </div>

      {/* 3. Notifications Channels (المرحلة السابعة) */}
      <div className="bg-white dark:bg-stone-900 rounded-3xl border border-stone-200 dark:border-stone-800 p-6 sm:p-7 shadow-sm space-y-4">
        <div>
          <h2 className="text-base font-bold text-stone-900 dark:text-white flex items-center gap-2">
            <Bell className="w-4 h-4 text-emerald-600" />
            <span>قنوات الإشعارات والتنبيهات الميدانية</span>
          </h2>
          <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">
            حدد أنواع التنبيهات المسموح بإرسالها إلى جهازك ومواعيد استقبالها.
          </p>
        </div>

        <div className="divide-y divide-stone-100 dark:divide-stone-800 text-xs">
          
          <div className="py-3 flex items-center justify-between">
            <div>
              <div className="font-bold text-stone-800 dark:text-stone-200">
                تنبيهات الطقس والظروف المناخية
              </div>
              <div className="text-[11px] text-stone-500">
                إنذارات نشاط الرياح، فرص الأمطار، والحرارة الشديدة في محافظتك
              </div>
            </div>
            <input
              type="checkbox"
              checked={user.notificationPreferences?.weatherAlerts ?? true}
              onChange={() => toggleNotif('weatherAlerts')}
              className="accent-emerald-600 w-4 h-4 rounded cursor-pointer"
            />
          </div>

          <div className="py-3 flex items-center justify-between">
            <div>
              <div className="font-bold text-stone-800 dark:text-stone-200">
                إرشادات المحاصيل والآفات العاجلة
              </div>
              <div className="text-[11px] text-stone-500">
                حملات مكافحة دوباس النخيل، مواعيد التكميم، ومكافحة أمراض البيوت المحمية
              </div>
            </div>
            <input
              type="checkbox"
              checked={user.notificationPreferences?.cropAdvice ?? true}
              onChange={() => toggleNotif('cropAdvice')}
              className="accent-emerald-600 w-4 h-4 rounded cursor-pointer"
            />
          </div>

          <div className="py-3 flex items-center justify-between">
            <div>
              <div className="font-bold text-stone-800 dark:text-stone-200">
                المعلومة الرمضانية والنصيحة الغذائية اليومية
              </div>
              <div className="text-[11px] text-stone-500">
                إشعار يومي قبل الإفطار بالمعلومة الزراعية والفاكهة المفيدة للصائم
              </div>
            </div>
            <input
              type="checkbox"
              checked={user.notificationPreferences?.ramadanDaily ?? true}
              onChange={() => toggleNotif('ramadanDaily')}
              className="accent-emerald-600 w-4 h-4 rounded cursor-pointer"
            />
          </div>

        </div>
      </div>

    </div>
  );
};

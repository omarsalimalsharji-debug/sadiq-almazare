import React from 'react';
import { 
  Menu, 
  Sun, 
  Moon, 
  Sparkles, 
  Bell, 
  User, 
  ShieldCheck,
  MoonStar
} from 'lucide-react';
import { ActivePage, ThemeMode, UserProfile } from '../types/index.ts';

interface HeaderProps {
  activePage: ActivePage;
  onNavigate: (page: ActivePage) => void;
  onToggleSidebar: () => void;
  onToggleNotifications: () => void;
  unreadNotificationsCount: number;
  themeMode: ThemeMode;
  isEffectiveDark: boolean;
  onSetThemeMode: (mode: ThemeMode) => void;
  isRamadanMode: boolean;
  user: UserProfile;
}

export const Header: React.FC<HeaderProps> = ({
  activePage,
  onNavigate,
  onToggleSidebar,
  onToggleNotifications,
  unreadNotificationsCount,
  themeMode,
  isEffectiveDark,
  onSetThemeMode,
  isRamadanMode,
  user
}) => {
  return (
    <header className="sticky top-0 z-40 w-full bg-white/90 dark:bg-stone-900/90 backdrop-blur-md border-b border-stone-200 dark:border-stone-800 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        
        {/* Right side in RTL: Hamburger & Brand */}
        <div className="flex items-center gap-3 shrink-0">
          {/* Hamburger button (3 horizontal lines) */}
          <button
            onClick={onToggleSidebar}
            className="p-2.5 rounded-lg text-stone-700 dark:text-stone-200 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 hover:text-emerald-700 dark:hover:text-emerald-400 transition-colors border border-stone-200/80 dark:border-stone-700/80 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            title="القائمة الشاملة للخدمات"
            aria-label="فتح القائمة الشاملة"
          >
            <Menu className="w-5 h-5 stroke-[2.2]" />
          </button>

          {/* Single wordmark Brand */}
          <button 
            onClick={() => onNavigate('home')}
            className="flex items-center gap-2.5 text-right focus:outline-none group"
          >
            <div className="w-9 h-9 rounded-lg bg-emerald-600 dark:bg-emerald-700 text-white flex items-center justify-center font-bold text-lg shadow-sm group-hover:bg-emerald-700 transition-colors">
              🌱
            </div>
            <div>
              <div className="font-bold text-base sm:text-lg text-emerald-900 dark:text-emerald-100 tracking-tight whitespace-nowrap leading-tight">
                صديق المزارع
              </div>
              <div className="text-[11px] text-stone-500 dark:text-stone-400 whitespace-nowrap">
                منصة المزارع العماني الذكية
              </div>
            </div>
          </button>
        </div>

        {/* Center: Clean single-line nav links for desktop */}
        <nav className="hidden lg:flex items-center gap-6 text-sm font-medium text-stone-600 dark:text-stone-300">
          <button 
            onClick={() => onNavigate('home')} 
            className={`whitespace-nowrap transition-colors hover:text-emerald-600 dark:hover:text-emerald-400 ${activePage === 'home' ? 'text-emerald-700 dark:text-emerald-400 font-semibold' : ''}`}
          >
            الرئيسية
          </button>
          <button 
            onClick={() => onNavigate('plant_diagnosis')} 
            className={`whitespace-nowrap transition-colors hover:text-emerald-600 dark:hover:text-emerald-400 ${activePage === 'plant_diagnosis' ? 'text-emerald-700 dark:text-emerald-400 font-semibold' : ''}`}
          >
            تشخيص النبات الذكي
          </button>
          <button 
            onClick={() => onNavigate('library')} 
            className={`whitespace-nowrap transition-colors hover:text-emerald-600 dark:hover:text-emerald-400 ${activePage === 'library' ? 'text-emerald-700 dark:text-emerald-400 font-semibold' : ''}`}
          >
            المكتبة الزراعية
          </button>
          <button 
            onClick={() => onNavigate('games')} 
            className={`whitespace-nowrap transition-colors hover:text-emerald-600 dark:hover:text-emerald-400 ${activePage === 'games' ? 'text-emerald-700 dark:text-emerald-400 font-semibold' : ''}`}
          >
            الألعاب والمسابقات
          </button>
          <button 
            onClick={() => onNavigate('weather')} 
            className={`whitespace-nowrap transition-colors hover:text-emerald-600 dark:hover:text-emerald-400 ${activePage === 'weather' ? 'text-emerald-700 dark:text-emerald-400 font-semibold' : ''}`}
          >
            طقس عُمان
          </button>
          <button 
            onClick={() => onNavigate('community')} 
            className={`whitespace-nowrap transition-colors hover:text-emerald-600 dark:hover:text-emerald-400 ${activePage === 'community' ? 'text-emerald-700 dark:text-emerald-400 font-semibold' : ''}`}
          >
            المجتمع الزراعي
          </button>
        </nav>

        {/* Left side: Ramadan indicator, Day/Night switcher, Notifications, Profile/Admin */}
        <div className="flex items-center gap-2 shrink-0">
          
          {/* Ramadan Indicator Badge if active */}
          {isRamadanMode && (
            <button
              onClick={() => onNavigate('home')}
              className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-md bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-300/40 hover:bg-amber-500/20 transition-colors whitespace-nowrap"
              title="الهوية الرمضانية الذكية مفعلة"
            >
              <MoonStar className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
              <span>شهر رمضان</span>
            </button>
          )}

          {/* Day / Night / Auto Toggle */}
          <button
            onClick={() => {
              if (themeMode === 'auto') onSetThemeMode('light');
              else if (themeMode === 'light') onSetThemeMode('dark');
              else onSetThemeMode('auto');
            }}
            className="p-2 rounded-lg text-stone-600 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors border border-stone-200 dark:border-stone-700"
            title={`نمط العرض الحالي: ${themeMode === 'auto' ? 'تلقائي حسب توقيت عُمان' : themeMode === 'light' ? 'الوضع النهاري' : 'الوضع الليلي'} (انقر للتغيير)`}
          >
            {themeMode === 'auto' ? (
              <div className="flex items-center gap-1 text-[11px] font-medium text-emerald-700 dark:text-emerald-400">
                {isEffectiveDark ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
                <span className="hidden md:inline">عُمان</span>
              </div>
            ) : isEffectiveDark ? (
              <Moon className="w-4 h-4 text-emerald-400" />
            ) : (
              <Sun className="w-4 h-4 text-amber-500" />
            )}
          </button>

          {/* Notification Button */}
          <button
            onClick={onToggleNotifications}
            className="relative p-2 rounded-lg text-stone-600 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors border border-stone-200 dark:border-stone-700"
            title="التنبيهات والإشعارات الزراعية"
          >
            <Bell className="w-4 h-4" />
            {unreadNotificationsCount > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-red-600 text-white text-[10px] font-bold flex items-center justify-center animate-pulse">
                {unreadNotificationsCount}
              </span>
            )}
          </button>

          {/* User Profile / Admin trigger */}
          <button
            onClick={() => onNavigate(user.isAdmin ? 'admin' : 'profile')}
            className="flex items-center gap-2 p-1.5 sm:px-3 sm:py-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 border border-emerald-200 dark:border-emerald-800 text-xs font-medium transition-colors"
          >
            {user.isAdmin ? (
              <>
                <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <span className="hidden sm:inline">لوحة الإدارة</span>
              </>
            ) : (
              <>
                <User className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <span className="hidden sm:inline truncate max-w-[100px]">{user.name.split(' ')[0]}</span>
              </>
            )}
          </button>
        </div>

      </div>
    </header>
  );
};

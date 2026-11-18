import React from 'react';
import {
  Menu,
  Sun,
  Moon,
  Sparkles,
  Bell,
  User,
  ShieldCheck,
  MoonStar,
  Settings,
  Sprout,
} from 'lucide-react';
import { ActivePage, ThemeMode, UserProfile } from '../types/index.ts';
import { HijriDateInfo } from '../utils/islamicCalendar.ts';
import { PWAInstallButton } from './PWAInstallButton.tsx';
import { MurshidAudioControl } from './MurshidAudioControl.tsx';
import { TRANSLATIONS } from '../utils/i18n.ts';

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
  hijriState?: HijriDateInfo;
  user: UserProfile;
  lang: 'ar' | 'en';
  onToggleLang: () => void;
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
  hijriState,
  user,
  lang,
  onToggleLang,
}) => {
  const t = TRANSLATIONS[lang];

  const navLinks: Array<{ id: ActivePage; label: string; match?: ActivePage[] }> = [
    { id: 'home', label: t.home },
    {
      id: 'hub_crops',
      label: lang === 'ar' ? 'المحاصيل' : 'Crops',
      match: ['hub_crops', 'plant_diagnosis', 'pest_diagnosis', 'weather', 'alerts', 'calendar'],
    },
    {
      id: 'hub_advisor',
      label: lang === 'ar' ? 'مرشدك' : 'Advisor',
      match: ['hub_advisor', 'community', 'daily_tips', 'quran', 'radio'],
    },
    {
      id: 'hub_knowledge',
      label: lang === 'ar' ? 'المكتبة' : 'Library',
      match: ['hub_knowledge', 'library', 'encyclopedia', 'cartoon_videos'],
    },
    {
      id: 'hub_games',
      label: lang === 'ar' ? 'الألعاب' : 'Games',
      match: ['hub_games', 'murshid_adventures', 'games', 'cultural_quiz', 'leaderboard'],
    },
  ];

  const firstName = user.name.split(' ')[0];

  return (
    <header className="sticky top-0 z-40 w-full bg-white/95 dark:bg-[#132247]/95 sm:backdrop-blur-xl border-b border-slate-200/80 dark:border-sky-300/15 transition-colors">
      <div className="max-w-7xl mx-auto px-2.5 sm:px-6 lg:px-8 h-[52px] sm:h-16 flex items-center justify-between gap-2 sm:gap-3">
        {/* Brand & Drawer Trigger */}
        <div className="flex items-center gap-2 sm:gap-2.5 shrink-0 min-w-0">
          <button
            onClick={onToggleSidebar}
            className="min-h-[42px] min-w-[42px] flex items-center justify-center rounded-xl text-slate-700 dark:text-slate-100 hover:bg-slate-100 dark:hover:bg-white/10 transition-colors border border-slate-200/80 dark:border-sky-300/15 focus:outline-none focus:ring-2 focus:ring-emerald-500 shrink-0"
            title={t.menu}
            aria-label={t.menu}
          >
            <Menu className="w-5 h-5 stroke-[2.2]" />
          </button>

          <button
            onClick={() => onNavigate('home')}
            className="flex items-center gap-2 text-start focus:outline-none group shrink-0"
          >
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-700 text-white flex items-center justify-center shadow-sm group-hover:brightness-110 transition">
              <Sprout className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <span className="font-extrabold text-sm sm:text-base text-slate-900 dark:text-white tracking-tight whitespace-nowrap">
              {t.appShortName}
            </span>
          </button>
        </div>

        {/* Clean 5-Link Category Navigation (Tablet / Desktop md+) */}
        <nav className="hidden md:flex items-center gap-5 lg:gap-6 text-xs lg:text-sm font-semibold text-slate-600 dark:text-slate-300">
          {navLinks.map((item) => {
            const active =
              activePage === item.id || Boolean(item.match?.includes(activePage));
            return (
              <button
                key={item.id}
                onClick={() => onNavigate(item.id)}
                className={`whitespace-nowrap shrink-0 py-1.5 transition-colors border-b-2 ${
                  active
                    ? 'text-emerald-600 dark:text-emerald-400 border-emerald-500 font-bold'
                    : 'border-transparent hover:text-emerald-600 dark:hover:text-emerald-300'
                }`}
              >
                {item.label}
              </button>
            );
          })}
        </nav>

        {/* Streamlined Mobile-First Actions Zone */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          {(hijriState ? hijriState.occasion !== 'normal' : isRamadanMode) && (
            <button
              onClick={() => onNavigate('daily_tips')}
              className="hidden xl:flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold rounded-xl bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-400/30 hover:bg-amber-500/25 transition-colors whitespace-nowrap shrink-0"
              title={lang === 'ar' ? hijriState?.occasionTitleAr : hijriState?.occasionTitleEn}
            >
              {hijriState?.occasion === 'eid_fitr' || hijriState?.occasion === 'eid_adha' ? (
                <Sparkles className="w-3.5 h-3.5 text-amber-500 dark:text-amber-300" />
              ) : (
                <MoonStar className="w-3.5 h-3.5 text-amber-500 dark:text-amber-300" />
              )}
              <span>
                {hijriState?.occasion === 'eid_fitr'
                  ? t.eidFitr
                  : hijriState?.occasion === 'eid_adha'
                    ? t.eidAdha
                    : hijriState?.ramadanDay
                      ? lang === 'ar'
                        ? `رمضان · ${hijriState.ramadanDay}`
                        : `Ramadan · ${hijriState.ramadanDay}`
                      : t.ramadanActive}
              </span>
            </button>
          )}

          {/* Persistent Murshid Voice / Mute / Stop / Volume Control */}
          <MurshidAudioControl lang={lang} />

          {/* PWA Install Prompt (tablet+) */}
          <div className="hidden lg:block">
            <PWAInstallButton compact />
          </div>

          {/* Language Switcher AR / EN (tablet+, also inside mobile Sidebar) */}
          <button
            onClick={onToggleLang}
            className="hidden sm:flex min-h-[42px] min-w-[42px] px-2.5 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/10 transition-colors border border-slate-200/80 dark:border-sky-300/15 items-center justify-center whitespace-nowrap shrink-0"
            title={lang === 'ar' ? 'Switch to English' : 'التحويل إلى العربية'}
          >
            <span className="font-mono text-emerald-600 dark:text-emerald-400">
              {lang === 'ar' ? 'EN' : 'عربي'}
            </span>
          </button>

          {/* Theme Switcher */}
          <button
            onClick={() => {
              if (themeMode === 'dark') onSetThemeMode('light');
              else if (themeMode === 'light') onSetThemeMode('auto');
              else onSetThemeMode('dark');
            }}
            className="hidden sm:flex min-h-[42px] min-w-[42px] items-center justify-center px-2 rounded-xl text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/10 transition-colors border border-slate-200/80 dark:border-sky-300/15 shrink-0"
            title={
              themeMode === 'auto'
                ? t.autoOmanTime
                : isEffectiveDark
                  ? t.nightMode
                  : t.dayMode
            }
            aria-label={t.settings}
          >
            {themeMode === 'auto' ? (
              <div className="flex items-center gap-1 text-[11px] font-semibold text-emerald-700 dark:text-emerald-400 whitespace-nowrap">
                {isEffectiveDark ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
              </div>
            ) : isEffectiveDark ? (
              <Moon className="w-4 h-4 text-emerald-400" />
            ) : (
              <Sun className="w-4 h-4 text-amber-500" />
            )}
          </button>

          {/* Notifications Trigger */}
          <button
            onClick={onToggleNotifications}
            className="relative min-h-[42px] min-w-[42px] flex items-center justify-center rounded-xl text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/10 transition-colors border border-slate-200/80 dark:border-sky-300/15 shrink-0"
            title={t.notifications}
            aria-label={t.notifications}
          >
            <Bell className="w-4 h-4" />
            {unreadNotificationsCount > 0 && (
              <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-rose-600 text-white text-[10px] font-bold tabular-nums flex items-center justify-center">
                {unreadNotificationsCount}
              </span>
            )}
          </button>

          {/* Quick Settings Gear (Matches top-corner gear in mobile reference) */}
          <button
            onClick={() => onNavigate('settings')}
            className={`min-h-[42px] min-w-[42px] flex items-center justify-center rounded-xl border transition-colors shrink-0 ${
              activePage === 'settings'
                ? 'bg-emerald-600 text-white border-emerald-500'
                : 'bg-emerald-50 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-400/25 hover:bg-emerald-100 dark:hover:bg-emerald-500/25'
            }`}
            title={t.settings}
            aria-label={t.settings}
          >
            <Settings className="w-4 h-4" />
          </button>

          {/* Profile / Admin (sm+ visible, inside Sidebar/Achievements on mobile) */}
          <button
            onClick={() => onNavigate(user.isAdmin || user.isModerator ? 'admin' : 'profile')}
            className="hidden sm:flex min-h-[42px] min-w-[42px] items-center justify-center gap-1.5 px-2.5 rounded-xl bg-slate-100 dark:bg-white/10 text-slate-800 dark:text-slate-100 hover:bg-slate-200 dark:hover:bg-white/15 border border-slate-200/80 dark:border-sky-300/15 text-xs font-semibold transition-colors whitespace-nowrap shrink-0"
            aria-label={t.profile}
          >
            {user.isAdmin || user.isModerator ? (
              <>
                <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <span className="hidden md:inline">{user.isAdmin ? t.admin : t.mod}</span>
              </>
            ) : (
              <>
                <User className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <span className="hidden md:inline truncate max-w-[85px]">{firstName}</span>
              </>
            )}
          </button>
        </div>
      </div>
    </header>
  );
};

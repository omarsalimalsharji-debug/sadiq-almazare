import React from 'react';
import { Home, Bell, Trophy, Info } from 'lucide-react';
import { ActivePage } from '../types/index.ts';
import { TRANSLATIONS } from '../utils/i18n.ts';

interface BottomNavProps {
  activePage: ActivePage;
  onNavigate: (page: ActivePage) => void;
  unreadNotificationsCount?: number;
  lang?: 'ar' | 'en';
}

export const BottomNav: React.FC<BottomNavProps> = ({
  activePage,
  onNavigate,
  unreadNotificationsCount = 0,
  lang = 'ar',
}) => {
  const t = TRANSLATIONS[lang];

  const tabs: Array<{
    id: ActivePage;
    label: string;
    icon: React.ElementType;
    matchPages?: ActivePage[];
    badgeCount?: number;
  }> = [
    {
      id: 'home',
      label: t.home,
      icon: Home,
      matchPages: ['hub_crops', 'hub_advisor', 'hub_knowledge', 'hub_games'],
    },
    {
      id: 'alerts',
      label: t.alerts,
      icon: Bell,
      matchPages: ['weather'],
      badgeCount: unreadNotificationsCount,
    },
    {
      id: 'leaderboard',
      label: t.navAchievements,
      icon: Trophy,
      matchPages: ['profile'],
    },
    {
      id: 'help_support',
      label: t.navAboutApp,
      icon: Info,
    },
  ];

  return (
    <nav
      className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/98 dark:bg-[#132247]/98 border-t border-slate-200/90 dark:border-sky-300/15 pb-[env(safe-area-inset-bottom)] shadow-[0_-6px_20px_-6px_rgba(3,7,18,0.22)]"
      aria-label={t.menu}
    >
      <div className="grid grid-cols-4 h-[60px] items-center px-2 gap-1">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive =
            activePage === tab.id || Boolean(tab.matchPages?.includes(activePage));

          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onNavigate(tab.id)}
              className={`relative min-h-[48px] h-12 rounded-2xl flex flex-col items-center justify-center transition-colors text-[11px] whitespace-nowrap px-1 ${
                isActive
                  ? 'bg-emerald-600 text-white font-extrabold shadow-sm'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white font-semibold'
              }`}
            >
              <div className="relative flex items-center justify-center">
                <Icon className={`w-5 h-5 ${isActive ? 'stroke-[2.3]' : 'stroke-[1.9]'}`} />
                {tab.badgeCount && tab.badgeCount > 0 ? (
                  <span
                    className={`absolute -top-1 -right-2 min-w-[15px] h-[15px] px-1 rounded-full text-[9px] font-bold tabular-nums flex items-center justify-center ${
                      isActive ? 'bg-amber-400 text-slate-950' : 'bg-rose-600 text-white'
                    }`}
                  >
                    {tab.badgeCount}
                  </span>
                ) : null}
              </div>
              <span className="truncate max-w-full mt-0.5 tracking-tight">{tab.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};

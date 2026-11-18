import React from 'react';
import {
  Home,
  Gamepad2,
  Scan,
  Clapperboard,
  Radio,
  Menu
} from 'lucide-react';
import { ActivePage } from '../types/index.ts';
import { TRANSLATIONS } from '../utils/i18n.ts';

interface BottomNavProps {
  activePage: ActivePage;
  onNavigate: (page: ActivePage) => void;
  onOpenSidebar: () => void;
  lang?: 'ar' | 'en';
}

export const BottomNav: React.FC<BottomNavProps> = ({
  activePage,
  onNavigate,
  onOpenSidebar,
  lang = 'ar'
}) => {
  const t = TRANSLATIONS[lang];

  const tabs = [
    { id: 'home' as ActivePage, label: t.home, icon: Home },
    { id: 'murshid_adventures' as ActivePage, label: lang === 'ar' ? 'المغامرات' : 'Adventures', icon: Gamepad2 },
    { id: 'plant_diagnosis' as ActivePage, label: lang === 'ar' ? 'الفحص' : 'Diagnose', icon: Scan },
    { id: 'cartoon_videos' as ActivePage, label: lang === 'ar' ? 'حلقات مرشد' : 'Episodes', icon: Clapperboard },
    { id: 'quran' as ActivePage, label: lang === 'ar' ? 'الإعلام' : 'Media', icon: Radio },
  ];

  return (
    <nav
      className="sm:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-[#132247]/95 backdrop-blur-xl border-t border-slate-200 dark:border-sky-300/15 transition-colors pb-[env(safe-area-inset-bottom)] shadow-[0_-8px_24px_-8px_rgba(3,7,18,0.45)]"
      aria-label={t.menu}
    >
      <div className="grid grid-cols-6 min-h-[64px] items-center px-1">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive =
            activePage === tab.id ||
            (tab.id === 'quran' && activePage === 'radio') ||
            (tab.id === 'plant_diagnosis' && activePage === 'pest_diagnosis');

          return (
            <button
              key={tab.id}
              onClick={() => onNavigate(tab.id)}
              className={`min-h-[48px] flex flex-col items-center justify-center transition-colors text-[10px] whitespace-nowrap px-0.5 ${
                isActive
                  ? 'text-emerald-600 dark:text-emerald-400 font-bold'
                  : 'text-slate-500 dark:text-slate-300/75 hover:text-slate-900 dark:hover:text-white font-medium'
              }`}
            >
              <div
                className={`p-1.5 rounded-xl transition-colors ${
                  isActive ? 'bg-emerald-500/15 dark:bg-emerald-400/20' : ''
                }`}
              >
                <Icon className={`w-5 h-5 ${isActive ? 'stroke-[2.4]' : 'stroke-[1.8]'}`} />
              </div>
              <span className="truncate max-w-full mt-0.5 tracking-tight">{tab.label}</span>
            </button>
          );
        })}

        {/* Menu Drawer Trigger */}
        <button
          onClick={onOpenSidebar}
          className="min-h-[48px] flex flex-col items-center justify-center text-slate-500 dark:text-slate-300/75 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors text-[10px] font-medium whitespace-nowrap px-0.5"
        >
          <div className="p-1.5 rounded-xl">
            <Menu className="w-5 h-5 stroke-[1.8]" />
          </div>
          <span className="truncate max-w-full mt-0.5 tracking-tight">{t.menu}</span>
        </button>
      </div>
    </nav>
  );
};

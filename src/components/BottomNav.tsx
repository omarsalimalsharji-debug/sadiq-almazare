import React from 'react';
import { 
  Home, 
  Scan, 
  Library, 
  Gamepad2, 
  Radio, 
  Menu 
} from 'lucide-react';
import { ActivePage } from '../types/index.ts';

interface BottomNavProps {
  activePage: ActivePage;
  onNavigate: (page: ActivePage) => void;
  onOpenSidebar: () => void;
}

export const BottomNav: React.FC<BottomNavProps> = ({
  activePage,
  onNavigate,
  onOpenSidebar
}) => {
  const tabs = [
    { id: 'home' as ActivePage, label: 'الرئيسية', icon: Home },
    { id: 'plant_diagnosis' as ActivePage, label: 'الفحص الذكي', icon: Scan },
    { id: 'library' as ActivePage, label: 'المكتبة', icon: Library },
    { id: 'games' as ActivePage, label: 'الألعاب', icon: Gamepad2 },
    { id: 'quran' as ActivePage, label: 'القرآن والإذاعة', icon: Radio },
  ];

  return (
    <nav
      className="sm:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-stone-900/95 backdrop-blur-md border-t border-stone-200 dark:border-stone-800 transition-colors pb-[env(safe-area-inset-bottom)]"
      aria-label="شريط التنقل السفلي للهواتف"
    >
      <div className="grid grid-cols-6 min-h-[64px] items-center px-1">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activePage === tab.id;

          return (
            <button
              key={tab.id}
              onClick={() => onNavigate(tab.id)}
              className={`flex flex-col items-center justify-center h-full transition-all text-[10px] font-medium ${
                isActive 
                  ? 'text-emerald-600 dark:text-emerald-400 font-bold' 
                  : 'text-stone-500 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-200'
              }`}
            >
              <div className={`p-1 rounded-xl transition-all ${
                isActive ? 'bg-emerald-50 dark:bg-emerald-950/60' : ''
              }`}>
                <Icon className={`w-5 h-5 ${isActive ? 'stroke-[2.5]' : 'stroke-[1.8]'}`} />
              </div>
              <span className="truncate mt-0.5 tracking-tighter">{tab.label}</span>
            </button>
          );
        })}

        {/* 6th Tab: Open All 19 Services Sidebar */}
        <button
          onClick={onOpenSidebar}
          className="flex flex-col items-center justify-center h-full text-stone-500 dark:text-stone-400 hover:text-emerald-600 dark:hover:text-emerald-400 transition-all text-[10px] font-medium"
        >
          <div className="p-1 rounded-xl">
            <Menu className="w-5 h-5 stroke-[1.8]" />
          </div>
          <span className="truncate mt-0.5 tracking-tighter">القائمة</span>
        </button>
      </div>
    </nav>
  );
};

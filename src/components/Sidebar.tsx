import React, { useState } from 'react';
import { 
  X, 
  Home, 
  Scan, 
  Bug, 
  BookOpen, 
  Calendar, 
  Bell, 
  CloudSun, 
  Users, 
  Gamepad2, 
  Trophy, 
  Award, 
  Library, 
  BookMarked, 
  Radio, 
  Lightbulb, 
  UserCircle, 
  Settings, 
  HelpCircle, 
  LogOut, 
  LogIn, 
  ShieldCheck, 
  Search,
  Sprout,
  Clapperboard
} from 'lucide-react';
import { ActivePage, UserProfile } from '../types/index.ts';
import { PWAInstallButton } from './PWAInstallButton.tsx';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  activePage: ActivePage;
  onNavigate: (page: ActivePage) => void;
  user: UserProfile;
  onToggleLogin: () => void;
}

interface MenuItem {
  id: ActivePage;
  number: number;
  label: string;
  icon: React.ElementType;
  badge?: string;
  category: 'رئيسي' | 'الذكاء الاصطناعي' | 'المعرفة والمكتبة' | 'المسابقات والترفيه' | 'الروحانيات والإعلام' | 'المستخدم والنظام';
}

export const Sidebar: React.FC<SidebarProps> = ({
  isOpen,
  onClose,
  activePage,
  onNavigate,
  user,
  onToggleLogin
}) => {
  const [searchQuery, setSearchQuery] = useState('');

  const menuItems: MenuItem[] = [
    { id: 'home', number: 1, label: 'الصفحة الرئيسية', icon: Home, category: 'رئيسي' },
    { id: 'plant_diagnosis', number: 2, label: 'تشخيص أمراض النباتات بالذكاء الاصطناعي', icon: Scan, badge: 'AI', category: 'الذكاء الاصطناعي' },
    { id: 'pest_diagnosis', number: 3, label: 'تشخيص الحشرات والآفات بالذكاء الاصطناعي', icon: Bug, badge: 'AI', category: 'الذكاء الاصطناعي' },
    { id: 'cartoon_videos', number: 4, label: 'فيديوهات فليجان التوعوية (كرتون)', icon: Clapperboard, badge: 'جديد', category: 'المعرفة والمكتبة' },
    { id: 'encyclopedia', number: 5, label: 'الموسوعة الزراعية', icon: BookOpen, category: 'المعرفة والمكتبة' },
    { id: 'calendar', number: 6, label: 'التقويم الزراعي ومواعيد الزراعة', icon: Calendar, category: 'المعرفة والمكتبة' },
    { id: 'alerts', number: 7, label: 'التنبيهات والإرشادات الزراعية', icon: Bell, category: 'المعرفة والمكتبة' },
    { id: 'weather', number: 8, label: 'الطقس والتنبيهات المناخية', icon: CloudSun, category: 'المعرفة والمكتبة' },
    { id: 'community', number: 9, label: 'المجتمع الزراعي والدردشة', icon: Users, category: 'المعرفة والمكتبة' },
    { id: 'virtual_farm', number: 10, label: 'مزرعتي الافتراضية (3D)', icon: Sprout, badge: 'جديد 3D', category: 'المسابقات والترفيه' },
    { id: 'games', number: 11, label: 'الألعاب الزراعية', icon: Gamepad2, badge: '6 ألعاب', category: 'المسابقات والترفيه' },
    { id: 'cultural_quiz', number: 12, label: 'المسابقة الثقافية العامة', icon: Trophy, category: 'المسابقات والترفيه' },
    { id: 'leaderboard', number: 13, label: 'لوحة المتصدرين والنقاط', icon: Award, category: 'المسابقات والترفيه' },
    { id: 'library', number: 14, label: 'المكتبة الزراعية الإلكترونية', icon: Library, badge: '12 تصنيف', category: 'المعرفة والمكتبة' },
    { id: 'quran', number: 15, label: 'القرآن الكريم (الشيخ هزاع البلوشي)', icon: BookMarked, category: 'الروحانيات والإعلام' },
    { id: 'radio', number: 16, label: 'الإذاعات والبث المباشر (عُمان)', icon: Radio, category: 'الروحانيات والإعلام' },
    { id: 'daily_tips', number: 17, label: 'النصائح اليومية والمعلومات الرمضانية', icon: Lightbulb, category: 'المعرفة والمكتبة' },
    { id: 'profile', number: 18, label: 'الملف الشخصي', icon: UserCircle, category: 'المستخدم والنظام' },
    { id: 'settings', number: 19, label: 'الإعدادات والمظهر', icon: Settings, category: 'المستخدم والنظام' },
    { id: 'help_support', number: 20, label: 'المساعدة والدعم وتوثيق المنصة', icon: HelpCircle, category: 'المستخدم والنظام' },
    { id: 'login', number: 21, label: user.isAdmin ? 'تسجيل الخروج / تبديل الحساب' : 'تسجيل الدخول / لوحة الإدارة', icon: user.isAdmin ? LogOut : LogIn, category: 'المستخدم والنظام' }
  ];

  const filteredItems = menuItems.filter(item => 
    item.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.number.toString().includes(searchQuery)
  );

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-stone-900/60 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Drawer */}
      <div className="relative w-full max-w-sm sm:max-w-md bg-white dark:bg-stone-900 h-full shadow-2xl flex flex-col z-10 border-l border-stone-200 dark:border-stone-800 text-stone-900 dark:text-stone-100">
        
        {/* Header of Drawer */}
        <div className="p-4 sm:p-5 border-b border-stone-200 dark:border-stone-800 flex items-center justify-between bg-stone-50/70 dark:bg-stone-900/80">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold text-xl shadow-sm">
              🌾
            </div>
            <div>
              <div className="font-bold text-base text-stone-900 dark:text-white leading-tight">
                صديق المزارع
              </div>
              <div className="text-xs text-emerald-700 dark:text-emerald-400 font-medium">
                فكرة وإدارة: عمر الشرجي
              </div>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-lg text-stone-500 hover:text-stone-900 dark:text-stone-400 dark:hover:text-white hover:bg-stone-200/60 dark:hover:bg-stone-800 transition-colors"
            title="إغلاق القائمة"
            aria-label="إغلاق القائمة"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search input in sidebar */}
        <div className="p-3 border-b border-stone-200 dark:border-stone-800">
          <div className="relative">
            <Search className="w-4 h-4 text-stone-400 absolute right-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="ابحث في قائمة الخدمات الـ 19..."
              className="w-full pr-9 pl-3 py-2 text-xs rounded-lg bg-stone-100 dark:bg-stone-800/80 border border-stone-200 dark:border-stone-700 focus:outline-none focus:ring-1 focus:ring-emerald-500 text-stone-900 dark:text-white placeholder:text-stone-400"
            />
          </div>
        </div>

        {/* Scrollable Items List */}
        <div className="flex-1 overflow-y-auto px-3 py-3 space-y-1 divide-y divide-stone-100 dark:divide-stone-800/50">
          {filteredItems.length === 0 ? (
            <div className="text-center py-8 text-stone-500 text-xs">
              لم يتم العثور على خدمة مطابقة للبحث
            </div>
          ) : (
            filteredItems.map((item) => {
              const Icon = item.icon;
              const isSelected = activePage === item.id;

              return (
                <button
                  key={item.id}
                  onClick={() => {
                    if (item.id === 'login') {
                      onToggleLogin();
                    } else {
                      onNavigate(item.id);
                    }
                    onClose();
                  }}
                  className={`w-full flex items-center justify-between p-2.5 rounded-lg text-right text-xs transition-colors group ${
                    isSelected 
                      ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 font-semibold' 
                      : 'text-stone-700 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800/70 hover:text-stone-900 dark:hover:text-white'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="w-5 text-[11px] font-mono text-stone-400 dark:text-stone-500 group-hover:text-emerald-600 transition-colors">
                      {item.number < 10 ? `0${item.number}` : item.number}
                    </span>
                    <Icon className={`w-4 h-4 ${isSelected ? 'text-emerald-600 dark:text-emerald-400' : 'text-stone-500 dark:text-stone-400 group-hover:text-emerald-600'}`} />
                    <span className="leading-snug">{item.label}</span>
                  </div>

                  {item.badge && (
                    <span className="text-[10px] font-medium px-2 py-0.5 rounded-md bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-300">
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })
          )}

          {/* Quick Admin / Moderator Access Row */}
          {(user.isAdmin || user.isModerator) && (
            <div className="pt-2">
              <button
                onClick={() => {
                  onNavigate('admin');
                  onClose();
                }}
                className="min-h-[44px] w-full flex items-center gap-2.5 p-2.5 rounded-lg bg-stone-900 text-white dark:bg-emerald-800 hover:bg-stone-800 text-xs font-semibold"
              >
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span>
                  {user.isAdmin
                    ? 'لوحة التحكم الإدارية الشاملة (عمر الشرجي)'
                    : 'لوحة الإشراف وسجل الإجراءات'}
                </span>
              </button>
            </div>
          )}
        </div>

        {/* Footer of Drawer */}
        <div className="p-4 border-t border-stone-200 dark:border-stone-800 bg-stone-50/50 dark:bg-stone-900/50 space-y-3 text-center">
          <PWAInstallButton />
          <div>
            <div className="text-[11px] text-stone-600 dark:text-stone-400 font-medium">
              تطبيق «صديق المزارع» · الإصدار الشامل 2026
            </div>
            <div className="text-[10px] text-stone-400 dark:text-stone-500 mt-0.5">
              سلطنة عُمان · إشراف وإدارة: عمر الشرجي
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};

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
  Clapperboard,
  Phone
} from 'lucide-react';
import { ActivePage, UserProfile } from '../types/index.ts';
import { PWAInstallButton } from './PWAInstallButton.tsx';
import { TRANSLATIONS } from '../utils/i18n.ts';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  activePage: ActivePage;
  onNavigate: (page: ActivePage) => void;
  user: UserProfile;
  onToggleLogin: () => void;
  lang?: 'ar' | 'en';
}

interface MenuItem {
  id: ActivePage;
  number: number;
  labelAr: string;
  labelEn: string;
  icon: React.ElementType;
  badgeAr?: string;
  badgeEn?: string;
}

export const Sidebar: React.FC<SidebarProps> = ({
  isOpen,
  onClose,
  activePage,
  onNavigate,
  user,
  onToggleLogin,
  lang = 'ar'
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const t = TRANSLATIONS[lang];

  const menuItems: MenuItem[] = [
    { id: 'home', number: 1, labelAr: 'الصفحة الرئيسية', labelEn: 'Home Dashboard', icon: Home },
    { id: 'virtual_farm', number: 2, labelAr: 'مزرعتي الافتراضية ثلاثية الأبعاد (3D)', labelEn: 'My Virtual Farm (3D)', icon: Sprout, badgeAr: '3D', badgeEn: '3D' },
    { id: 'plant_diagnosis', number: 3, labelAr: 'التشخيص الذكي لأمراض النباتات', labelEn: 'Smart Plant Disease Diagnosis', icon: Scan, badgeAr: 'ذكي', badgeEn: 'Smart' },
    { id: 'pest_diagnosis', number: 4, labelAr: 'تشخيص الحشرات والآفات الزراعية', labelEn: 'Insect & Pest Diagnosis', icon: Bug },
    { id: 'cartoon_videos', number: 5, labelAr: 'فيديوهات فليجان التوعوية (كرتون)', labelEn: 'Flijan Educational Cartoons', icon: Clapperboard },
    { id: 'games', number: 6, labelAr: 'الألعاب الزراعية التفاعلية', labelEn: 'Interactive Agri Games', icon: Gamepad2, badgeAr: '6', badgeEn: '6' },
    { id: 'cultural_quiz', number: 7, labelAr: 'المسابقة الثقافية العمانية', labelEn: 'Omani Cultural Quiz', icon: Trophy },
    { id: 'leaderboard', number: 8, labelAr: 'لوحة المتصدرين والنقاط', labelEn: 'Leaderboards & Points', icon: Award },
    { id: 'library', number: 9, labelAr: 'المكتبة الزراعية الإلكترونية', labelEn: 'Digital Agricultural Library', icon: Library, badgeAr: '12', badgeEn: '12' },
    { id: 'alerts', number: 10, labelAr: 'التنبيهات والإرشادات الزراعية', labelEn: 'Agricultural Alerts', icon: Bell },
    { id: 'weather', number: 11, labelAr: 'الطقس والتنبيهات المناخية', labelEn: 'Oman Live Weather', icon: CloudSun },
    { id: 'community', number: 12, labelAr: 'الدردشة والمجتمع الزراعي', labelEn: 'Farmer Chat & Community', icon: Users },
    { id: 'quran', number: 13, labelAr: 'القرآن الكريم (الشيخ هزاع البلوشي)', labelEn: 'Holy Quran (Hazza Al-Balushi)', icon: BookMarked },
    { id: 'radio', number: 14, labelAr: 'الإذاعات العمانية والبث المباشر', labelEn: 'Oman Live Radio', icon: Radio },
    { id: 'encyclopedia', number: 15, labelAr: 'الموسوعة الزراعية الشاملة', labelEn: 'Agricultural Encyclopedia', icon: BookOpen },
    { id: 'calendar', number: 16, labelAr: 'التقويم الزراعي العماني', labelEn: 'Omani Crop Calendar', icon: Calendar },
    { id: 'daily_tips', number: 17, labelAr: 'النصائح اليومية والموسمية', labelEn: 'Daily & Seasonal Tips', icon: Lightbulb },
    { id: 'profile', number: 18, labelAr: 'الملف الشخصي', labelEn: 'Farmer Profile', icon: UserCircle },
    { id: 'settings', number: 19, labelAr: 'الإعدادات والمظهر', labelEn: 'Settings & Theme', icon: Settings },
    { id: 'help_support', number: 20, labelAr: 'المساعدة والدعم وتوثيق المنصة', labelEn: 'Help & Support', icon: HelpCircle },
    { id: 'login', number: 21, labelAr: user.isAdmin ? 'تبديل الحساب / تسجيل الخروج' : 'تسجيل الدخول / الإدارة', labelEn: user.isAdmin ? 'Switch Account / Logout' : 'Sign In / Admin', icon: user.isAdmin ? LogOut : LogIn }
  ];

  const filteredItems = menuItems.filter((item) => {
    const label = lang === 'ar' ? item.labelAr : item.labelEn;
    return (
      label.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.number.toString().includes(searchQuery)
    );
  });

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-[#040816]/75 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Drawer */}
      <div className="relative w-full max-w-sm sm:max-w-md bg-white dark:bg-[#0b1329] h-full shadow-2xl flex flex-col z-10 border-e border-slate-200 dark:border-sky-300/15 text-slate-900 dark:text-slate-100">
        
        {/* Drawer Header */}
        <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-sky-300/15 flex items-center justify-between bg-slate-50/80 dark:bg-[#132247]/90">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-700 text-white flex items-center justify-center font-bold text-xl shadow-sm">
              🌾
            </div>
            <div>
              <div className="font-bold text-base text-slate-900 dark:text-white leading-tight">
                {t.appName}
              </div>
              <div className="text-xs text-emerald-700 dark:text-emerald-400 font-medium">
                {t.founderName}
              </div>
            </div>
          </div>

          <button
            onClick={onClose}
            className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl text-slate-500 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-white/10 transition-colors"
            title={t.close}
            aria-label={t.close}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search */}
        <div className="p-3 border-b border-slate-200 dark:border-sky-300/15">
          <div className="relative">
            <Search className={`w-4 h-4 text-slate-400 absolute ${lang === 'ar' ? 'right-3' : 'left-3'} top-1/2 -translate-y-1/2`} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={lang === 'ar' ? 'ابحث في أقسام المنصة...' : 'Search platform sections...'}
              className={`w-full min-h-[44px] ${lang === 'ar' ? 'pr-9 pl-3' : 'pl-9 pr-3'} py-2 text-xs rounded-xl bg-slate-100 dark:bg-[#132247] border border-slate-200 dark:border-sky-300/15 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-900 dark:text-white placeholder:text-slate-400`}
            />
          </div>
        </div>

        {/* Scrollable Menu List */}
        <div className="flex-1 overflow-y-auto px-3 py-3 space-y-1">
          {filteredItems.length === 0 ? (
            <div className="text-center py-8 text-slate-500 dark:text-slate-400 text-xs">
              {lang === 'ar' ? 'لم يتم العثور على قسم مطابق للبحث' : 'No matching section found'}
            </div>
          ) : (
            filteredItems.map((item) => {
              const Icon = item.icon;
              const isSelected = activePage === item.id;
              const label = lang === 'ar' ? item.labelAr : item.labelEn;
              const badge = lang === 'ar' ? item.badgeAr : item.badgeEn;

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
                  className={`w-full min-h-[44px] flex items-center justify-between px-3 py-2 rounded-xl text-start text-xs transition-colors group ${
                    isSelected
                      ? 'bg-emerald-50 dark:bg-[#132247] text-emerald-700 dark:text-emerald-300 font-bold border border-emerald-200 dark:border-emerald-400/30'
                      : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-[#132247]/70 border border-transparent'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="w-5 text-[11px] font-mono tabular-nums text-slate-400 dark:text-slate-400 group-hover:text-emerald-400 transition-colors shrink-0">
                      {item.number < 10 ? `0${item.number}` : item.number}
                    </span>
                    <Icon
                      className={`w-4 h-4 shrink-0 ${
                        isSelected
                          ? 'text-emerald-600 dark:text-emerald-400'
                          : 'text-slate-500 dark:text-slate-300 group-hover:text-emerald-400'
                      }`}
                    />
                    <span className="leading-snug truncate">{label}</span>
                  </div>

                  {badge && (
                    <span className="text-[10px] font-semibold tabular-nums text-emerald-700 dark:text-emerald-300 shrink-0 ms-2">
                      {badge}
                    </span>
                  )}
                </button>
              );
            })
          )}

          {/* Quick Admin / Moderator Entry */}
          {(user.isAdmin || user.isModerator) && (
            <div className="pt-2">
              <button
                onClick={() => {
                  onNavigate('admin');
                  onClose();
                }}
                className="min-h-[44px] w-full flex items-center gap-2.5 p-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-colors"
              >
                <ShieldCheck className="w-4 h-4 shrink-0" />
                <span>{user.isAdmin ? t.admin : t.mod}</span>
              </button>
            </div>
          )}
        </div>

        {/* Drawer Footer */}
        <div className="p-4 border-t border-slate-200 dark:border-sky-300/15 bg-slate-50/70 dark:bg-[#132247]/70 space-y-3 text-center">
          <PWAInstallButton />
          <div className="space-y-1">
            <div className="text-[11px] text-slate-700 dark:text-slate-200 font-semibold">
              {t.appName} · {t.founderName}
            </div>
            <a
              href="tel:94896333"
              className="inline-flex items-center justify-center gap-1.5 text-[11px] text-emerald-700 dark:text-emerald-400 font-bold tabular-nums hover:underline"
            >
              <Phone className="w-3.5 h-3.5" />
              <span>{t.supportPhoneLabel}: 94896333</span>
            </a>
          </div>
        </div>

      </div>
    </div>
  );
};

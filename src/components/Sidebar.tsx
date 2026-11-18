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
  Clapperboard,
  Phone,
  Globe
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
  onToggleLang?: () => void;
}

interface MenuItem {
  id: ActivePage;
  labelAr: string;
  labelEn: string;
  icon: React.ElementType;
  badgeAr?: string;
  badgeEn?: string;
}

interface MenuGroup {
  id: string;
  titleAr: string;
  titleEn: string;
  items: MenuItem[];
}

export const Sidebar: React.FC<SidebarProps> = ({
  isOpen,
  onClose,
  activePage,
  onNavigate,
  user,
  onToggleLogin,
  lang = 'ar',
  onToggleLang
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const t = TRANSLATIONS[lang];

  const menuGroups: MenuGroup[] = [
    {
      id: 'hubs',
      titleAr: 'الأقسام الرئيسية الأربعة',
      titleEn: '4 Main Categories',
      items: [
        { id: 'home', labelAr: 'الصفحة الرئيسية', labelEn: 'Home Screen', icon: Home },
        { id: 'hub_crops', labelAr: 'العناية بالمحاصيل والتشخيص', labelEn: 'Crops Care & Diagnosis', icon: Scan },
        { id: 'hub_advisor', labelAr: 'مرشدك الزراعي والمجتمع', labelEn: 'Agri Guide & Community', icon: Users },
        { id: 'hub_knowledge', labelAr: 'المعلومات والمكتبة الزراعية', labelEn: 'Knowledge & Library', icon: Library },
        { id: 'hub_games', labelAr: 'الألعاب والتسلية التعليمية', labelEn: 'Games & Achievements', icon: Gamepad2 },
      ],
    },
    {
      id: 'core_agri',
      titleAr: 'الخدمات الزراعية المباشرة',
      titleEn: 'Direct Agricultural Tools',
      items: [
        { id: 'plant_diagnosis', labelAr: 'التشخيص الذكي لأمراض النباتات', labelEn: 'Smart Plant Diagnosis', icon: Scan, badgeAr: 'ذكي', badgeEn: 'AI' },
        { id: 'pest_diagnosis', labelAr: 'تشخيص الحشرات والآفات الزراعية', labelEn: 'Insect & Pest Diagnosis', icon: Bug },
        { id: 'weather', labelAr: 'الطقس والتوقعات المباشرة', labelEn: 'Oman Live Weather', icon: CloudSun },
        { id: 'alerts', labelAr: 'التنبيهات والإرشادات المناخية', labelEn: 'Weather & Crop Alerts', icon: Bell },
        { id: 'calendar', labelAr: 'التقويم الزراعي العماني', labelEn: 'Omani Crop Calendar', icon: Calendar },
        { id: 'library', labelAr: 'المكتبة الزراعية الإلكترونية', labelEn: 'Digital Agricultural Library', icon: Library, badgeAr: '12', badgeEn: '12' },
        { id: 'encyclopedia', labelAr: 'الموسوعة الزراعية الشاملة', labelEn: 'Agricultural Encyclopedia', icon: BookOpen },
        { id: 'daily_tips', labelAr: 'النصائح اليومية والموسمية', labelEn: 'Daily & Seasonal Tips', icon: Lightbulb },
      ],
    },
    {
      id: 'community_media',
      titleAr: 'المجتمع والإرشاد والبث',
      titleEn: 'Community & Live Media',
      items: [
        { id: 'community', labelAr: 'الدردشة والمجتمع الزراعي', labelEn: 'Farmer Chat & Community', icon: Users },
        { id: 'quran', labelAr: 'القرآن الكريم (الشيخ هزاع البلوشي)', labelEn: 'Holy Quran (Hazza Al-Balushi)', icon: BookMarked },
        { id: 'radio', labelAr: 'الإذاعات العمانية والبث المباشر', labelEn: 'Oman Live Radio', icon: Radio },
      ],
    },
    {
      id: 'edu_games',
      titleAr: 'التوعية والألعاب التعليمية',
      titleEn: 'Awareness & Interactive Games',
      items: [
        { id: 'cartoon_videos', labelAr: 'أستوديو حلقات مُرشد الكرتونية', labelEn: 'Murshid Educational Cartoons', icon: Clapperboard },
        { id: 'murshid_adventures', labelAr: 'مغامرات مرشد الزراعية', labelEn: "Murshid's Agricultural Adventures", icon: Gamepad2, badgeAr: 'لعبة', badgeEn: 'Play' },
        { id: 'games', labelAr: 'الألعاب الزراعية التفاعلية', labelEn: 'Interactive Agri Games', icon: Gamepad2, badgeAr: '6', badgeEn: '6' },
        { id: 'cultural_quiz', labelAr: 'المسابقة الثقافية العمانية', labelEn: 'Omani Cultural Quiz', icon: Trophy },
        { id: 'leaderboard', labelAr: 'لوحة المتصدرين والنقاط', labelEn: 'Leaderboards & Points', icon: Award },
      ],
    },
    {
      id: 'account_settings',
      titleAr: 'الحساب والإعدادات',
      titleEn: 'Account & Settings',
      items: [
        { id: 'profile', labelAr: 'الملف الشخصي', labelEn: 'Farmer Profile', icon: UserCircle },
        { id: 'settings', labelAr: 'الإعدادات والمظهر والصوت', labelEn: 'Settings, Theme & Audio', icon: Settings },
        { id: 'help_support', labelAr: 'المساعدة والدعم وتوثيق المنصة', labelEn: 'Help & Support', icon: HelpCircle },
        {
          id: 'login',
          labelAr: user.isAdmin || user.isModerator ? 'تسجيل خروج الإدارة' : 'دخول الإدارة فقط',
          labelEn: user.isAdmin || user.isModerator ? 'Staff Sign Out' : 'Staff Access Only',
          icon: user.isAdmin || user.isModerator ? LogOut : ShieldCheck,
        },
      ],
    },
  ];

  const q = searchQuery.trim().toLowerCase();
  const filteredGroups = menuGroups
    .map((group) => ({
      ...group,
      items: group.items.filter((item) => {
        if (!q) return true;
        const label = lang === 'ar' ? item.labelAr : item.labelEn;
        return label.toLowerCase().includes(q) || item.labelAr.toLowerCase().includes(q);
      }),
    }))
    .filter((group) => group.items.length > 0);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-[#040816]/75 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Drawer */}
      <div className="relative w-full max-w-[340px] sm:max-w-md bg-white dark:bg-[#0b1329] h-full shadow-2xl flex flex-col z-10 border-e border-slate-200 dark:border-sky-300/15 text-slate-900 dark:text-slate-100">

        {/* Drawer Header */}
        <div className="p-4 border-b border-slate-200 dark:border-sky-300/15 flex items-center justify-between bg-slate-50/80 dark:bg-[#132247]/90">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-700 text-white flex items-center justify-center font-bold text-xl shadow-sm shrink-0">
              🌾
            </div>
            <div className="min-w-0">
              <div className="font-bold text-sm sm:text-base text-slate-900 dark:text-white leading-tight truncate">
                {t.appName}
              </div>
              <div className="text-[11px] text-emerald-700 dark:text-emerald-400 font-medium truncate">
                {t.founderName}
              </div>
            </div>
          </div>

          <button
            onClick={onClose}
            className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl text-slate-500 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-white/10 transition-colors shrink-0"
            title={t.close}
            aria-label={t.close}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search + Mobile Quick Lang Toggle */}
        <div className="p-3 border-b border-slate-200 dark:border-sky-300/15 flex items-center gap-2">
          <div className="relative flex-1 min-w-0">
            <Search className={`w-4 h-4 text-slate-400 absolute ${lang === 'ar' ? 'right-3' : 'left-3'} top-1/2 -translate-y-1/2`} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={lang === 'ar' ? 'ابحث في أقسام المنصة...' : 'Search platform sections...'}
              className={`w-full min-h-[44px] ${lang === 'ar' ? 'pr-9 pl-3' : 'pl-9 pr-3'} py-2 text-xs rounded-xl bg-slate-100 dark:bg-[#132247] border border-slate-200 dark:border-sky-300/15 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-900 dark:text-white placeholder:text-slate-400`}
            />
          </div>

          {onToggleLang && (
            <button
              type="button"
              onClick={onToggleLang}
              className="sm:hidden min-h-[44px] px-3 rounded-xl bg-slate-100 dark:bg-[#132247] border border-slate-200 dark:border-sky-300/15 text-xs font-bold text-emerald-700 dark:text-emerald-400 flex items-center gap-1 shrink-0"
              aria-label={lang === 'ar' ? 'Switch to English' : 'التحويل إلى العربية'}
            >
              <Globe className="w-3.5 h-3.5" />
              <span>{lang === 'ar' ? 'EN' : 'عربي'}</span>
            </button>
          )}
        </div>

        {/* Scrollable Grouped Menu List */}
        <div className="flex-1 overflow-y-auto px-3 py-3 space-y-4">
          {filteredGroups.length === 0 ? (
            <div className="text-center py-8 text-slate-500 dark:text-slate-400 text-xs">
              {lang === 'ar' ? 'لم يتم العثور على قسم مطابق للبحث' : 'No matching section found'}
            </div>
          ) : (
            filteredGroups.map((group) => (
              <div key={group.id} className="space-y-1">
                <div className="px-2.5 pb-1 text-[11px] font-extrabold text-emerald-700 dark:text-emerald-400 tracking-wide">
                  {lang === 'ar' ? group.titleAr : group.titleEn}
                </div>
                {group.items.map((item) => {
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
                })}
              </div>
            ))
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

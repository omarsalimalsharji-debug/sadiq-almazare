/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * تطبيق «صديق المزارع» - المنصة الزراعية العمانية الذكية الشاملة
 * صاحب فكرة التطبيق ومديره: عمر الشرجي – سلطنة عمان
 */

import React, { useState, useEffect, useCallback, lazy, Suspense } from 'react';
import { ActivePage, ThemeMode, UserProfile } from './types/index.ts';
import { LocationProvider, UnifiedLocationState } from './context/LocationContext.tsx';

// Core Shell Components
import { Header } from './components/Header.tsx';
import { Sidebar } from './components/Sidebar.tsx';
import { NotificationDrawer } from './components/NotificationDrawer.tsx';
import { LoginModal } from './components/LoginModal.tsx';
import { BottomNav } from './components/BottomNav.tsx';
import { GlobalMiniPlayer } from './components/GlobalMiniPlayer.tsx';
import { OfflineIndicator } from './components/OfflineIndicator.tsx';
import { ErrorBoundary } from './components/ErrorBoundary.tsx';
import { LocationSelectorBar } from './components/LocationSelectorBar.tsx';
import { ShareProvider } from './context/ShareContext.tsx';
import { stopAllMurshidAudio } from './utils/murshidAudio.ts';
import { ArrowRight, ArrowLeft, Home as HomeIcon } from 'lucide-react';

// Primary Home View + Category Hubs (eager) & Secondary Views (lazy-loaded)
import { HomeView } from './components/HomeView.tsx';
import { CategoryHubView, HubPageId } from './components/CategoryHubView.tsx';
const PlantDiagnosisView = lazy(() => import('./components/PlantDiagnosisView.tsx').then(m => ({ default: m.PlantDiagnosisView })));
const PestDiagnosisView = lazy(() => import('./components/PestDiagnosisView.tsx').then(m => ({ default: m.PestDiagnosisView })));
const CartoonVideosView = lazy(() => import('./components/MurshidVideosLibrary.tsx').then(m => ({ default: m.MurshidVideosLibrary })));
const GamesView = lazy(() => import('./components/GamesView.tsx').then(m => ({ default: m.GamesView })));
const LeaderboardView = lazy(() => import('./components/LeaderboardView.tsx').then(m => ({ default: m.LeaderboardView })));
const LibraryView = lazy(() => import('./components/LibraryView.tsx').then(m => ({ default: m.LibraryView })));
const RamadanView = lazy(() => import('./components/RamadanView.tsx').then(m => ({ default: m.RamadanView })));
const WeatherView = lazy(() => import('./components/WeatherView.tsx').then(m => ({ default: m.WeatherView })));
const CalendarView = lazy(() => import('./components/CalendarView.tsx').then(m => ({ default: m.CalendarView })));
const EncyclopediaView = lazy(() => import('./components/EncyclopediaView.tsx').then(m => ({ default: m.EncyclopediaView })));
const CommunityView = lazy(() => import('./components/CommunityView.tsx').then(m => ({ default: m.CommunityView })));
const DailyTipsView = lazy(() => import('./components/DailyTipsView.tsx').then(m => ({ default: m.DailyTipsView })));
const ProfileView = lazy(() => import('./components/ProfileView.tsx').then(m => ({ default: m.ProfileView })));
const SettingsView = lazy(() => import('./components/SettingsView.tsx').then(m => ({ default: m.SettingsView })));
const HelpSupportView = lazy(() => import('./components/HelpSupportView.tsx').then(m => ({ default: m.HelpSupportView })));
const AdminView = lazy(() => import('./components/AdminView.tsx').then(m => ({ default: m.AdminView })));
const QuranPlayer = lazy(() => import('./components/QuranPlayer.tsx').then(m => ({ default: m.QuranPlayer })));
const RadioPlayer = lazy(() => import('./components/RadioPlayer.tsx').then(m => ({ default: m.RadioPlayer })));
const MurshidAdventuresGame = lazy(() => import('./components/MurshidAdventuresGame.tsx').then(m => ({ default: m.MurshidAdventuresGame })));
import {
  SeasonalConfig,
  DEFAULT_SEASONAL_CONFIG,
  computeOmaniHijriState,
} from './utils/islamicCalendar.ts';
import { countUnreadNotifications } from './utils/notificationState.ts';

const VALID_PAGES: Set<ActivePage> = new Set([
  'home',
  'hub_crops',
  'hub_advisor',
  'hub_knowledge',
  'hub_games',
  'plant_diagnosis',
  'pest_diagnosis',
  'cartoon_videos',
  'encyclopedia',
  'calendar',
  'alerts',
  'weather',
  'community',
  'games',
  'murshid_adventures',
  'cultural_quiz',
  'leaderboard',
  'library',
  'quran',
  'radio',
  'daily_tips',
  'profile',
  'settings',
  'help_support',
  'login',
  'admin',
]);

const LOCATION_PAGES: Set<ActivePage> = new Set([
  'hub_crops',
  'plant_diagnosis',
  'pest_diagnosis',
  'weather',
  'alerts',
  'calendar',
  'daily_tips',
]);

function getParentHubInfo(page: ActivePage, lang: 'ar' | 'en'): { hubId: HubPageId; label: string } | null {
  switch (page) {
    case 'plant_diagnosis':
    case 'pest_diagnosis':
    case 'weather':
    case 'alerts':
    case 'calendar':
      return { hubId: 'hub_crops', label: lang === 'ar' ? 'العناية بالمحاصيل' : 'Crops Care' };
    case 'community':
    case 'daily_tips':
    case 'quran':
    case 'radio':
      return { hubId: 'hub_advisor', label: lang === 'ar' ? 'مرشدك الزراعي' : 'Agri Guide' };
    case 'library':
    case 'encyclopedia':
    case 'cartoon_videos':
      return { hubId: 'hub_knowledge', label: lang === 'ar' ? 'المعلومات والمكتبة' : 'Knowledge' };
    case 'murshid_adventures':
    case 'games':
    case 'cultural_quiz':
    case 'leaderboard':
      return { hubId: 'hub_games', label: lang === 'ar' ? 'الألعاب والتسلية' : 'Games' };
    default:
      return null;
  }
}

function readInitialDeepLink(): { page: ActivePage; itemId: string | null } {
  if (typeof window === 'undefined') return { page: 'home', itemId: null };
  try {
    const params = new URLSearchParams(window.location.search);
    const bookParam = params.get('book');
    if (bookParam) {
      return { page: 'library', itemId: bookParam };
    }
    const rawPage = params.get('page') as ActivePage | null;
    const item = params.get('item');
    if (rawPage && VALID_PAGES.has(rawPage)) {
      return { page: rawPage, itemId: item };
    }
  } catch {
    // Fallback cleanly to home
  }
  return { page: 'home', itemId: null };
}

export default function App() {
  const initialDeepLink = React.useMemo(() => readInitialDeepLink(), []);
  const [activePage, setActivePage] = useState<ActivePage>(initialDeepLink.page);
  const [deepLinkItemId, setDeepLinkItemId] = useState<string | null>(initialDeepLink.itemId);
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(false);
  const [isNotifDrawerOpen, setIsNotifDrawerOpen] = useState<boolean>(false);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState<boolean>(false);
  const [unreadNotifsCount, setUnreadNotifsCount] = useState<number>(0);

  const handleNavigate = useCallback((page: ActivePage, itemId?: string) => {
    stopAllMurshidAudio();
    setActivePage(page);
    setDeepLinkItemId(itemId || null);
    if (typeof window !== 'undefined' && window.location.search) {
      try {
        window.history.replaceState({}, '', window.location.pathname);
      } catch {
        // Ignore history restriction
      }
    }
  }, []);

  // Ensure any active speech or scene playback stops cleanly on every route switch
  useEffect(() => {
    stopAllMurshidAudio();
  }, [activePage]);

  // Language state (ar / en)
  const [lang, setLang] = useState<'ar' | 'en'>(() => {
    const saved = localStorage.getItem('farmer_app_lang');
    return (saved as 'ar' | 'en') || 'ar';
  });

  const toggleLanguage = () => {
    setLang(prev => {
      const next = prev === 'ar' ? 'en' : 'ar';
      localStorage.setItem('farmer_app_lang', next);
      document.documentElement.lang = next;
      document.documentElement.dir = next === 'ar' ? 'rtl' : 'ltr';
      return next;
    });
  };

  useEffect(() => {
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
  }, [lang]);

  // User profile state
  const [user, setUser] = useState<UserProfile>(() => {
    const saved = localStorage.getItem('farmer_user_profile');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        // Remove the historical demo name; never assign a person's name without their input.
        if (parsed.name === 'سالم بن سعيد الحارثي') parsed.name = '';
        return parsed;
      } catch (e) { /* fallback */ }
    }
    return {
      id: 'usr-oman-default',
      name: '',
      role: 'مزارع',
      governorate: 'محافظة الداخلية',
      wilayat: 'نزوى',
      avatarSeed: 'oman-farmer',
      totalScore: 450,
      participations: 4,
      rank: 3,
      isAdmin: false,
      bookmarkedBookIds: ['book-1'],
      lastReadPages: {},
      notificationPreferences: {
        weatherAlerts: true,
        cropAdvice: true,
        ramadanDaily: true,
        communityReplies: true
      }
    };
  });

  // Save user profile changes
  useEffect(() => {
    localStorage.setItem('farmer_user_profile', JSON.stringify(user));
  }, [user]);

  // Theme state: defaults to signature dark navy (#0b1329) while allowing light | auto toggle
  const [themeMode, setThemeMode] = useState<ThemeMode>(() => {
    const saved = localStorage.getItem('farmer_theme_mode_v2');
    return (saved as ThemeMode) || 'dark';
  });

  // Calculate Muscat local time to determine if it is night in Oman
  const [isOmanNight, setIsOmanNight] = useState<boolean>(() => {
    const now = new Date();
    const muscatHourStr = now.toLocaleTimeString('en-US', { timeZone: 'Asia/Muscat', hour12: false, hour: 'numeric' });
    const muscatHour = parseInt(muscatHourStr, 10);
    return muscatHour < 6 || muscatHour >= 19;
  });

  useEffect(() => {
    const checkInterval = setInterval(() => {
      const now = new Date();
      const muscatHourStr = now.toLocaleTimeString('en-US', { timeZone: 'Asia/Muscat', hour12: false, hour: 'numeric' });
      const muscatHour = parseInt(muscatHourStr, 10);
      setIsOmanNight(muscatHour < 6 || muscatHour >= 19);
    }, 60000);
    return () => clearInterval(checkInterval);
  }, []);

  const isEffectiveDark = themeMode === 'auto' ? isOmanNight : themeMode === 'dark';

  useEffect(() => {
    if (isEffectiveDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('farmer_theme_mode_v2', themeMode);
  }, [isEffectiveDark, themeMode]);

  // Dynamic Automatic Omani Islamic Seasonal Theme Engine (Ramadan / Eid Fitr / Eid Adha / Normal)
  const [seasonalConfig, setSeasonalConfig] = useState<SeasonalConfig>(DEFAULT_SEASONAL_CONFIG);
  const [seasonalTick, setSeasonalTick] = useState<number>(Date.now());

  useEffect(() => {
    const fetchSeasonalConfig = () => {
      fetch('/api/seasonal/config')
        .then((res) => res.json())
        .then((data) => {
          if (data.success && data.config) {
            setSeasonalConfig(data.config);
          }
        })
        .catch(() => {});
    };
    const fetchNotificationsCount = () => {
      const governorate = user.governorate || '';
      fetch(`/api/notifications?governorate=${encodeURIComponent(governorate)}`, { cache: 'no-store' })
        .then((res) => res.json())
        .then((data) => {
          if (data.success && Array.isArray(data.notifications)) {
            setUnreadNotifsCount(countUnreadNotifications(data.notifications, governorate));
          }
        })
        .catch(() => {});
    };
    fetchSeasonalConfig();
    fetchNotificationsCount();
    const refreshNotifications = () => fetchNotificationsCount();
    window.addEventListener('sadiq-local-notification-added', refreshNotifications);
    window.addEventListener('sadiq-notifications-read', refreshNotifications);
    const timer = setInterval(() => {
      setSeasonalTick(Date.now());
      fetchSeasonalConfig();
      fetchNotificationsCount();
    }, 60000);
    return () => {
      clearInterval(timer);
      window.removeEventListener('sadiq-local-notification-added', refreshNotifications);
      window.removeEventListener('sadiq-notifications-read', refreshNotifications);
    };
  }, [user.governorate]);

  const hijriState = React.useMemo(
    () => computeOmaniHijriState(seasonalConfig),
    [seasonalConfig, seasonalTick]
  );

  // Anonymous Visitor Tracking + Active Heartbeat
  useEffect(() => {
    let anonId = localStorage.getItem('farmer_anon_device_id');
    if (!anonId) {
      anonId =
        typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
          ? crypto.randomUUID()
          : 'dev-' + Math.random().toString(36).slice(2) + Date.now().toString(36);
      localStorage.setItem('farmer_anon_device_id', anonId);
    }

    const detectDevice = () => {
      const ua = navigator.userAgent.toLowerCase();
      if (/ipad|tablet|playbook|silk|(android(?!.*mobi))/i.test(ua)) return 'جهاز لوحي';
      if (/mobile|iphone|ipod|android|blackberry|iemobile|opera mini/i.test(ua) || window.innerWidth < 640) {
        return 'هاتف';
      }
      return 'كمبيوتر';
    };

    const sendVisitPing = () => {
      fetch('/api/visitors/track', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          anonId,
          deviceType: detectDevice(),
          currentPage: activePage,
        }),
      }).catch(() => {});
    };

    sendVisitPing();
    const hb = setInterval(sendVisitPing, 60000);
    return () => clearInterval(hb);
  }, [activePage]);

  // Verify Staff Token (Admin / Moderator) on mount
  useEffect(() => {
    const token = localStorage.getItem('farmer_admin_token');
    if (!token) return;
    fetch('/api/auth/me', {
      headers: { 'x-admin-token': token },
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!data?.success) {
          localStorage.removeItem('farmer_admin_token');
          localStorage.removeItem('farmer_staff_role');
          localStorage.removeItem('farmer_force_pw_change');
          setUser((prev) => ({
            ...prev,
            isAdmin: false,
            isModerator: false,
            role: prev.role === 'مدير التطبيق' || prev.role === 'مشرف' ? 'مزارع' : prev.role,
          }));
          return;
        }
        if (data.session?.mustChangePassword) {
          localStorage.setItem('farmer_force_pw_change', '1');
          setActivePage('admin');
        }
      })
      .catch(() => {});
  }, []);

  // Farmer browsing is anonymous; staff access remains protected by the server session.

  // Ramadan Smart Mode (follows automatic Hijri occasion unless overridden)
  const [isRamadanMode, setIsRamadanMode] = useState<boolean>(() => {
    const saved = localStorage.getItem('farmer_ramadan_mode');
    return saved !== null ? saved === 'true' : true;
  });

  const handleToggleRamadanMode = () => {
    setIsRamadanMode(prev => {
      const next = !prev;
      localStorage.setItem('farmer_ramadan_mode', next.toString());
      return next;
    });
  };

  const handleUpdateUser = (updated: Partial<UserProfile>) => {
    setUser(prev => ({ ...prev, ...updated }));
  };

  const handleScoreUpdated = (addedScore: number) => {
    setUser(prev => ({
      ...prev,
      totalScore: prev.totalScore + addedScore,
      participations: prev.participations + 1
    }));
  };

  const handleUpdateBookmarks = (newBookmarkedIds: string[]) => {
    setUser(prev => ({
      ...prev,
      bookmarkedBookIds: newBookmarkedIds
    }));
  };

  const handleLocationSync = useCallback((loc: UnifiedLocationState) => {
    setUser((prev) => {
      if (
        prev.governorate === loc.governorate &&
        prev.wilayat === loc.wilayat &&
        prev.village === loc.village
      ) {
        return prev;
      }
      return {
        ...prev,
        governorate: loc.governorate,
        wilayat: loc.wilayat,
        village: loc.village,
      };
    });
  }, []);

  return (
    <ShareProvider>
    <LocationProvider
      initialGovernorate={user.governorate}
      initialWilayat={user.wilayat}
      initialVillage={user.village}
      onLocationSync={handleLocationSync}
    >
    <div
      className={`min-h-[100dvh] overflow-x-hidden flex flex-col bg-[#f7faf6] text-slate-900 dark:bg-[#0b1329] dark:text-slate-100 navy-ambient-bg transition-colors duration-300 ${
        activePage === 'home'
          ? 'pb-[calc(4.25rem+env(safe-area-inset-bottom))] md:pb-5'
          : 'pb-[calc(5.25rem+env(safe-area-inset-bottom))] md:pb-10'
      }`}
    >
      
      {/* Comprehensive Header with Top Bar Contract & Hamburger */}
      <Header
        activePage={activePage}
        onNavigate={handleNavigate}
        onToggleSidebar={() => setIsSidebarOpen(true)}
        onToggleNotifications={() => setIsNotifDrawerOpen(true)}
        unreadNotificationsCount={unreadNotifsCount}
        themeMode={themeMode}
        isEffectiveDark={isEffectiveDark}
        onSetThemeMode={setThemeMode}
        isRamadanMode={hijriState.occasion === 'ramadan'}
        hijriState={hijriState}
        user={user}
        lang={lang}
        onToggleLang={toggleLanguage}
      />

      {/* Comprehensive Sliding Sidebar */}
      <Sidebar
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        activePage={activePage}
        onNavigate={handleNavigate}
        user={user}
        onToggleLogin={() => setIsLoginModalOpen(true)}
        lang={lang}
        onToggleLang={toggleLanguage}
      />

      {/* Slide-over Notification Center */}
      <NotificationDrawer
        isOpen={isNotifDrawerOpen}
        onClose={() => setIsNotifDrawerOpen(false)}
        onNotificationsCountChange={setUnreadNotifsCount}
        governorate={user.governorate}
      />

      {/* Login / Role Switching Modal */}
      <LoginModal
        isOpen={isLoginModalOpen}
        onClose={() => setIsLoginModalOpen(false)}
        currentUser={user}
        onSwitchUser={(newUser, options) => {
          setUser(newUser);
          if (newUser.isAdmin || newUser.isModerator || options?.mustChangePassword) {
            setActivePage('admin');
          }
        }}
      />

      {/* Main Content View Container */}
      <main
        className={`flex-1 max-w-7xl w-full mx-auto flex flex-col ${
          activePage === 'home'
            ? 'px-3 py-2.5 sm:px-6 sm:py-5 min-h-0'
            : 'px-3.5 sm:px-6 lg:px-8 py-3.5 sm:py-6'
        }`}
      >
        {LOCATION_PAGES.has(activePage) && <LocationSelectorBar lang={lang} />}

        {/* Quick Mobile-First Subpage Return Bar */}
        {activePage !== 'home' &&
          activePage !== 'hub_crops' &&
          activePage !== 'hub_advisor' &&
          activePage !== 'hub_knowledge' &&
          activePage !== 'hub_games' && (() => {
            const parent = getParentHubInfo(activePage, lang);
            const BackArrow = lang === 'ar' ? ArrowRight : ArrowLeft;
            return (
              <div className="mb-3 flex flex-wrap items-center gap-2 text-xs">
                {parent ? (
                  <button
                    type="button"
                    onClick={() => handleNavigate(parent.hubId)}
                    className="min-h-[40px] px-3 py-1.5 rounded-xl bg-white dark:bg-[#132247] hover:bg-slate-100 dark:hover:bg-[#1a2e5c] border border-slate-200 dark:border-sky-300/20 text-slate-800 dark:text-white font-bold flex items-center gap-1.5 shadow-2xs transition-colors"
                  >
                    <BackArrow className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                    <span>{lang === 'ar' ? `العودة إلى ${parent.label}` : `Back to ${parent.label}`}</span>
                  </button>
                ) : null}
                <button
                  type="button"
                  onClick={() => handleNavigate('home')}
                  className="min-h-[40px] px-3 py-1.5 rounded-xl bg-slate-100/90 dark:bg-white/10 hover:bg-slate-200 dark:hover:bg-white/15 text-slate-700 dark:text-slate-200 font-semibold flex items-center gap-1.5 transition-colors"
                >
                  <HomeIcon className="w-3.5 h-3.5" />
                  <span>{lang === 'ar' ? 'الرئيسية' : 'Home'}</span>
                </button>
              </div>
            );
          })()}

        <ErrorBoundary onGoHome={() => handleNavigate('home')}>
        {activePage === 'home' && (
          <HomeView
            onNavigate={handleNavigate}
            isRamadanMode={hijriState.occasion === 'ramadan'}
            hijriState={hijriState}
            seasonalConfig={seasonalConfig}
            user={user}
            lang={lang}
          />
        )}

        {(activePage === 'hub_crops' ||
          activePage === 'hub_advisor' ||
          activePage === 'hub_knowledge' ||
          activePage === 'hub_games') && (
          <CategoryHubView
            hubId={activePage}
            user={user}
            isRamadanMode={hijriState.occasion === 'ramadan'}
            onNavigate={handleNavigate}
            lang={lang}
          />
        )}

        <Suspense
          fallback={
            <div className="p-10 text-center text-sm font-semibold text-slate-600 dark:text-slate-300">
              {lang === 'ar' ? 'جاري تحميل القسم...' : 'Loading section...'}
            </div>
          }
        >

        {activePage === 'murshid_adventures' && (
          <MurshidAdventuresGame
            user={user}
            onScoreUpdated={handleScoreUpdated}
            onBackToGames={() => setActivePage('games')}
          />
        )}

        {activePage === 'plant_diagnosis' && (
          <PlantDiagnosisView />
        )}

        {activePage === 'pest_diagnosis' && (
          <PestDiagnosisView />
        )}

        {activePage === 'cartoon_videos' && (
          <CartoonVideosView initialEpisodeId={deepLinkItemId} />
        )}

        {activePage === 'games' && (
          <GamesView
            user={user}
            onScoreUpdated={handleScoreUpdated}
            onNavigateToLeaderboard={() => handleNavigate('leaderboard')}
            onOpenMurshidAdventures={() => handleNavigate('murshid_adventures')}
          />
        )}

        {activePage === 'cultural_quiz' && (
          <GamesView
            user={user}
            onScoreUpdated={handleScoreUpdated}
            onNavigateToLeaderboard={() => handleNavigate('leaderboard')}
            onOpenMurshidAdventures={() => handleNavigate('murshid_adventures')}
            initialGameType="cultural"
          />
        )}

        {activePage === 'leaderboard' && (
          <LeaderboardView
            user={user}
            onNavigateToGames={() => handleNavigate('games')}
          />
        )}

        {activePage === 'library' && (
          <LibraryView
            user={user}
            onUpdateBookmarks={handleUpdateBookmarks}
            initialBookId={deepLinkItemId}
          />
        )}

        {activePage === 'quran' && (
          <div className="max-w-4xl mx-auto space-y-6">
            <div className="border-b border-slate-200 dark:border-sky-300/15 pb-4">
              <h1 className="text-2xl font-bold text-stone-900 dark:text-white">
                القرآن الكريم · تلاوات عطرة
              </h1>
              <p className="text-xs sm:text-sm text-stone-500 mt-1">
                تلاوة بصوت القارئ العماني الشيخ هزاع البلوشي، مع مشغل صوتي دقيق وإمكانية متابعة الاستماع عبر صفحات التطبيق.
              </p>
            </div>
            <QuranPlayer />
          </div>
        )}

        {activePage === 'radio' && (
          <div className="max-w-4xl mx-auto space-y-6">
            <div className="border-b border-slate-200 dark:border-sky-300/15 pb-4">
              <h1 className="text-2xl font-bold text-stone-900 dark:text-white">
                الإذاعات العمانية والبث المباشر
              </h1>
              <p className="text-xs sm:text-sm text-stone-500 mt-1">
                استمع مباشرة إلى إذاعة سلطنة عُمان، إذاعة القرآن الكريم، والبرامج الثقافية والزراعية بتقنية HLS.
              </p>
            </div>
            <RadioPlayer />
          </div>
        )}

        {(activePage === 'daily_tips' || (activePage as string) === 'ramadan') && (
          hijriState.occasion === 'ramadan' ? (
            <RamadanView initialDay={deepLinkItemId ? Number(deepLinkItemId) : undefined} />
          ) : (
            <DailyTipsView initialTipId={deepLinkItemId ? Number(deepLinkItemId) : undefined} />
          )
        )}

        {activePage === 'weather' && (
          <WeatherView defaultGovernorateName={user.governorate} />
        )}

        {activePage === 'alerts' && (
          <div className="space-y-6">
            <WeatherView defaultGovernorateName={user.governorate} />
          </div>
        )}

        {activePage === 'calendar' && (
          <CalendarView
            user={user}
            unreadNotifsCount={unreadNotifsCount}
            onNotificationsUpdated={(count) => setUnreadNotifsCount(count)}
            onOpenNotifications={() => setIsNotifDrawerOpen(true)}
          />
        )}

        {activePage === 'encyclopedia' && (
          <EncyclopediaView initialArticleId={deepLinkItemId} />
        )}

        {activePage === 'community' && (
          <CommunityView user={user} />
        )}

        {activePage === 'profile' && (
          <ProfileView
            user={user}
            onUpdateUser={handleUpdateUser}
            onNavigateToLibrary={() => setActivePage('library')}
          />
        )}

        {activePage === 'settings' && (
          <SettingsView
            themeMode={themeMode}
            onSetThemeMode={setThemeMode}
            isEffectiveDark={isEffectiveDark}
            isRamadanMode={isRamadanMode}
            onToggleRamadanMode={handleToggleRamadanMode}
            user={user}
            onUpdateUser={handleUpdateUser}
            lang={lang}
            onToggleLang={toggleLanguage}
          />
        )}

        {activePage === 'help_support' && (
          <HelpSupportView />
        )}

        {activePage === 'admin' && (
          <AdminView
            user={user}
            seasonalConfig={seasonalConfig}
            onSeasonalConfigUpdated={(cfg) => setSeasonalConfig(cfg)}
            onBroadcastSuccess={() => {
              setUnreadNotifsCount(prev => prev + 1);
            }}
          />
        )}
        </Suspense>
        </ErrorBoundary>
      </main>

      {/* Offline Connectivity Banner */}
      <OfflineIndicator />

      {/* Sticky Global Mini-Player for continuous audio playback across navigation */}
      <GlobalMiniPlayer onNavigate={handleNavigate} />

      {/* Mobile-First Fixed Bottom Navigation Bar */}
      <BottomNav
        activePage={activePage}
        onNavigate={handleNavigate}
        unreadNotificationsCount={unreadNotifsCount}
        lang={lang}
      />

      {/* Footer rendered on internal pages so Home remains a crisp zero-scroll screen */}
      {activePage !== 'home' && (
        <footer className="w-full border-t border-slate-200 dark:border-sky-300/15 bg-white/70 dark:bg-[#132247]/50 backdrop-blur-md py-6 px-4 text-center text-xs text-slate-500 dark:text-slate-300/80 mt-auto">
          <div className="max-w-7xl mx-auto space-y-1.5">
            <div className="font-bold text-slate-900 dark:text-white text-sm">
              {lang === 'ar'
                ? 'تطبيق «صديق المزارع الذكي» · سلطنة عُمان'
                : "Smart Farmer's Friend · Sultanate of Oman"}
            </div>
            <div className="text-xs text-emerald-700 dark:text-emerald-400 font-semibold">
              {lang === 'ar'
                ? 'صاحب فكرة المشروع ومديره: عمر بن سالم الشرجي – سلطنة عُمان'
                : 'Founder & Program Director: Omar bin Salem Al-Sharji – Oman'}
            </div>
            <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-[11px] text-slate-500 dark:text-slate-400 pt-0.5">
              <span>
                {lang === 'ar'
                  ? `جميع الحقوق محفوظة © ${new Date().getFullYear()}`
                  : `All rights reserved © ${new Date().getFullYear()}`}
              </span>
              <span>·</span>
              <a
                href="tel:94896333"
                className="text-emerald-700 dark:text-emerald-400 font-semibold tabular-nums hover:underline"
              >
                {lang === 'ar' ? 'للتواصل والدعم: 94896333' : 'Direct Support: 94896333'}
              </a>
            </div>
          </div>
        </footer>
      )}

    </div>
    </LocationProvider>
    </ShareProvider>
  );
}

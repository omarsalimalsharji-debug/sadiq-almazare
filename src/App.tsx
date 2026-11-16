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

// Primary Home View (eager) + Secondary Views (lazy-loaded)
import { HomeView } from './components/HomeView.tsx';
const PlantDiagnosisView = lazy(() => import('./components/PlantDiagnosisView.tsx').then(m => ({ default: m.PlantDiagnosisView })));
const PestDiagnosisView = lazy(() => import('./components/PestDiagnosisView.tsx').then(m => ({ default: m.PestDiagnosisView })));
const CartoonVideosView = lazy(() => import('./components/CartoonVideosView.tsx').then(m => ({ default: m.CartoonVideosView })));
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
const VirtualFarmView = lazy(() => import('./components/VirtualFarm/VirtualFarmView.tsx').then(m => ({ default: m.VirtualFarmView })));
import {
  SeasonalConfig,
  DEFAULT_SEASONAL_CONFIG,
  computeOmaniHijriState,
} from './utils/islamicCalendar.ts';
import { auth } from './firebase.ts';
import { onAuthStateChanged } from 'firebase/auth';

export default function App() {
  const [activePage, setActivePage] = useState<ActivePage>('home');
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(false);
  const [isNotifDrawerOpen, setIsNotifDrawerOpen] = useState<boolean>(false);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState<boolean>(false);
  const [unreadNotifsCount, setUnreadNotifsCount] = useState<number>(0);

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
      try { return JSON.parse(saved); } catch (e) { /* fallback */ }
    }
    return {
      id: 'usr-oman-default',
      name: 'سالم بن سعيد الحارثي',
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
      fetch('/api/notifications')
        .then((res) => res.json())
        .then((data) => {
          if (data.success && Array.isArray(data.notifications)) {
            setUnreadNotifsCount(data.notifications.filter((n: any) => !n.read).length);
          }
        })
        .catch(() => {});
    };
    fetchSeasonalConfig();
    fetchNotificationsCount();
    const timer = setInterval(() => {
      setSeasonalTick(Date.now());
      fetchSeasonalConfig();
    }, 60000);
    return () => clearInterval(timer);
  }, []);

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

  // Firebase Auth Session Sync (keeps Google farmer session intact across reloads)
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (fbUser) => {
      if (fbUser) {
        const isBootstrapAdmin =
          fbUser.email?.toLowerCase() === 'alsharji73@gmail.com' && fbUser.emailVerified;
        setUser((prev) => {
          if (prev.id === 'admin-omar' || prev.isModerator) return prev;
          return {
            ...prev,
            id: fbUser.uid,
            name: fbUser.displayName || prev.name,
            role: isBootstrapAdmin ? 'مدير التطبيق' : prev.role,
            isAdmin: isBootstrapAdmin || prev.isAdmin,
          };
        });
      }
    });
    return () => unsub();
  }, []);

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
    <LocationProvider
      initialGovernorate={user.governorate}
      initialWilayat={user.wilayat}
      initialVillage={user.village}
      onLocationSync={handleLocationSync}
    >
    <div className="min-h-screen overflow-x-hidden flex flex-col bg-slate-50 text-slate-900 dark:bg-[#0b1329] dark:text-slate-100 navy-ambient-bg transition-colors duration-300 pb-[calc(5.5rem+env(safe-area-inset-bottom))] sm:pb-12">
      
      {/* Comprehensive Header with Top Bar Contract & Hamburger */}
      <Header
        activePage={activePage}
        onNavigate={setActivePage}
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
        onNavigate={setActivePage}
        user={user}
        onToggleLogin={() => setIsLoginModalOpen(true)}
        lang={lang}
      />

      {/* Slide-over Notification Center */}
      <NotificationDrawer
        isOpen={isNotifDrawerOpen}
        onClose={() => setIsNotifDrawerOpen(false)}
        onNotificationsCountChange={setUnreadNotifsCount}
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
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        <LocationSelectorBar lang={lang} />
        <ErrorBoundary onGoHome={() => setActivePage('home')}>
        {activePage === 'home' && (
          <HomeView
            onNavigate={setActivePage}
            isRamadanMode={hijriState.occasion === 'ramadan'}
            hijriState={hijriState}
            seasonalConfig={seasonalConfig}
            user={user}
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

        {activePage === 'virtual_farm' && (
          <VirtualFarmView user={user} />
        )}

        {activePage === 'plant_diagnosis' && (
          <PlantDiagnosisView />
        )}

        {activePage === 'pest_diagnosis' && (
          <PestDiagnosisView />
        )}

        {activePage === 'cartoon_videos' && (
          <CartoonVideosView />
        )}

        {activePage === 'games' && (
          <GamesView
            user={user}
            onScoreUpdated={handleScoreUpdated}
            onNavigateToLeaderboard={() => setActivePage('leaderboard')}
            onOpenVirtualFarm={() => setActivePage('virtual_farm')}
          />
        )}

        {activePage === 'cultural_quiz' && (
          <GamesView
            user={user}
            onScoreUpdated={handleScoreUpdated}
            onNavigateToLeaderboard={() => setActivePage('leaderboard')}
            onOpenVirtualFarm={() => setActivePage('virtual_farm')}
            initialGameType="cultural"
          />
        )}

        {activePage === 'leaderboard' && (
          <LeaderboardView
            user={user}
            onNavigateToGames={() => setActivePage('games')}
          />
        )}

        {activePage === 'library' && (
          <LibraryView
            user={user}
            onUpdateBookmarks={handleUpdateBookmarks}
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
            <RamadanView />
          ) : (
            <DailyTipsView />
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
          <EncyclopediaView />
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
      <GlobalMiniPlayer onNavigate={setActivePage} />

      {/* Mobile-First Fixed Bottom Navigation Bar */}
      <BottomNav
        activePage={activePage}
        onNavigate={setActivePage}
        onOpenSidebar={() => setIsSidebarOpen(true)}
        lang={lang}
      />

      {/* Footer honoring Founder & Director Omar bin Salem Al-Sharji */}
      <footer className="w-full border-t border-slate-200 dark:border-sky-300/15 bg-white/70 dark:bg-[#132247]/50 backdrop-blur-md py-8 px-4 text-center text-xs text-slate-500 dark:text-slate-300/80 mt-auto">
        <div className="max-w-7xl mx-auto space-y-2">
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
          <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-[11px] text-slate-500 dark:text-slate-400 pt-1">
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

    </div>
    </LocationProvider>
  );
}

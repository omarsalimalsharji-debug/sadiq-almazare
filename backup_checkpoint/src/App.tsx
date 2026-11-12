/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * تطبيق «صديق المزارع» - المنصة الزراعية العمانية الذكية الشاملة
 * صاحب فكرة التطبيق ومديره: عمر الشرجي
 */

import React, { useState, useEffect } from 'react';
import { ActivePage, ThemeMode, UserProfile } from './types/index.ts';

// Components
import { Header } from './components/Header.tsx';
import { Sidebar } from './components/Sidebar.tsx';
import { NotificationDrawer } from './components/NotificationDrawer.tsx';
import { LoginModal } from './components/LoginModal.tsx';

// Views
import { HomeView } from './components/HomeView.tsx';
import { PlantDiagnosisView } from './components/PlantDiagnosisView.tsx';
import { PestDiagnosisView } from './components/PestDiagnosisView.tsx';
import { GamesView } from './components/GamesView.tsx';
import { LeaderboardView } from './components/LeaderboardView.tsx';
import { LibraryView } from './components/LibraryView.tsx';
import { RamadanView } from './components/RamadanView.tsx';
import { WeatherView } from './components/WeatherView.tsx';
import { CalendarView } from './components/CalendarView.tsx';
import { EncyclopediaView } from './components/EncyclopediaView.tsx';
import { CommunityView } from './components/CommunityView.tsx';
import { DailyTipsView } from './components/DailyTipsView.tsx';
import { ProfileView } from './components/ProfileView.tsx';
import { SettingsView } from './components/SettingsView.tsx';
import { HelpSupportView } from './components/HelpSupportView.tsx';
import { AdminView } from './components/AdminView.tsx';
import { QuranPlayer } from './components/QuranPlayer.tsx';
import { RadioPlayer } from './components/RadioPlayer.tsx';

export default function App() {
  const [activePage, setActivePage] = useState<ActivePage>('home');
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(false);
  const [isNotifDrawerOpen, setIsNotifDrawerOpen] = useState<boolean>(false);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState<boolean>(false);
  const [unreadNotifsCount, setUnreadNotifsCount] = useState<number>(2);

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

  // Theme state: auto | light | dark
  const [themeMode, setThemeMode] = useState<ThemeMode>(() => {
    const saved = localStorage.getItem('farmer_theme_mode');
    return (saved as ThemeMode) || 'auto';
  });

  // Calculate Muscat local time to determine if it is night in Oman
  const [isOmanNight, setIsOmanNight] = useState<boolean>(() => {
    const now = new Date();
    // Get hour in Asia/Muscat (UTC+4)
    const muscatHourStr = now.toLocaleTimeString('en-US', { timeZone: 'Asia/Muscat', hour12: false, hour: 'numeric' });
    const muscatHour = parseInt(muscatHourStr, 10);
    // Night is between 18:30 and 06:00
    return muscatHour < 6 || muscatHour >= 19;
  });

  // Check Oman time every minute for seamless automatic transition
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

  // Apply dark class to document element
  useEffect(() => {
    if (isEffectiveDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('farmer_theme_mode', themeMode);
  }, [isEffectiveDark, themeMode]);

  // Ramadan Smart Mode
  const [isRamadanMode, setIsRamadanMode] = useState<boolean>(() => {
    const saved = localStorage.getItem('farmer_ramadan_mode');
    return saved !== null ? saved === 'true' : true; // Default true for Ramadan atmosphere
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

  return (
    <div className="min-h-screen flex flex-col bg-stone-50 text-stone-900 dark:bg-stone-950 dark:text-stone-100 transition-colors duration-300">
      
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
        isRamadanMode={isRamadanMode}
        user={user}
      />

      {/* Comprehensive Sliding Sidebar (All 19 Services) */}
      <Sidebar
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        activePage={activePage}
        onNavigate={setActivePage}
        user={user}
        onToggleLogin={() => setIsLoginModalOpen(true)}
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
        onSwitchUser={(newUser) => {
          setUser(newUser);
          if (newUser.isAdmin) {
            setActivePage('admin');
          }
        }}
      />

      {/* Main Content View Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {activePage === 'home' && (
          <HomeView
            onNavigate={setActivePage}
            isRamadanMode={isRamadanMode}
            user={user}
          />
        )}

        {activePage === 'plant_diagnosis' && (
          <PlantDiagnosisView />
        )}

        {activePage === 'pest_diagnosis' && (
          <PestDiagnosisView />
        )}

        {activePage === 'games' && (
          <GamesView
            user={user}
            onScoreUpdated={handleScoreUpdated}
            onNavigateToLeaderboard={() => setActivePage('leaderboard')}
          />
        )}

        {activePage === 'cultural_quiz' && (
          <GamesView
            user={user}
            onScoreUpdated={handleScoreUpdated}
            onNavigateToLeaderboard={() => setActivePage('leaderboard')}
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
            <div className="border-b border-stone-200 dark:border-stone-800 pb-4">
              <h1 className="text-2xl font-bold text-stone-900 dark:text-white">
                القرآن الكريم · تلاوات عطرة
              </h1>
              <p className="text-xs sm:text-sm text-stone-500 mt-1">
                تلاوة بصوت القارئ العماني الشيخ هزاع البلوشي، مع مشغل صوتي دقيق وإمكانية متابعة الاستماع.
              </p>
            </div>
            <QuranPlayer />
          </div>
        )}

        {activePage === 'radio' && (
          <div className="max-w-4xl mx-auto space-y-6">
            <div className="border-b border-stone-200 dark:border-stone-800 pb-4">
              <h1 className="text-2xl font-bold text-stone-900 dark:text-white">
                الإذاعات العمانية والبث المباشر
              </h1>
              <p className="text-xs sm:text-sm text-stone-500 mt-1">
                استمع مباشرة إلى إذاعة سلطنة عُمان، إذاعة القرآن الكريم، والبرامج الثقافية والزراعية.
              </p>
            </div>
            <RadioPlayer />
          </div>
        )}

        {(activePage === 'daily_tips' || (activePage as string) === 'ramadan') && (
          isRamadanMode ? (
            <RamadanView />
          ) : (
            <DailyTipsView />
          )
        )}

        {activePage === 'weather' && (
          <WeatherView />
        )}

        {activePage === 'alerts' && (
          <div className="space-y-6">
            <WeatherView />
          </div>
        )}

        {activePage === 'calendar' && (
          <CalendarView />
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
          />
        )}

        {activePage === 'help_support' && (
          <HelpSupportView />
        )}

        {activePage === 'admin' && (
          <AdminView
            user={user}
            onBroadcastSuccess={(title) => {
              setUnreadNotifsCount(prev => prev + 1);
            }}
          />
        )}
      </main>

      {/* Footer adhering to Anti-Slop Discipline & honoring Founder Omar Al-Sharji */}
      <footer className="w-full border-t border-stone-200 dark:border-stone-800 bg-white/50 dark:bg-stone-900/50 py-8 px-4 text-center text-xs text-stone-500 dark:text-stone-400 mt-auto">
        <div className="max-w-7xl mx-auto space-y-2">
          <div className="font-bold text-stone-900 dark:text-stone-200 text-sm">
            تطبيق «صديق المزارع» · سلطنة عُمان
          </div>
          <div className="text-xs text-emerald-700 dark:text-emerald-400 font-semibold">
            صاحب الفكرة والمدير العام: عمر الشرجي
          </div>
          <div className="text-[11px] text-stone-400 dark:text-stone-500 pt-1">
            جميع الحقوق محفوظة للمبادرة الزراعية العمانية © {new Date().getFullYear()} · تقنيات الذكاء الاصطناعي والإرشاد الزراعي الميداني
          </div>
        </div>
      </footer>

    </div>
  );
}

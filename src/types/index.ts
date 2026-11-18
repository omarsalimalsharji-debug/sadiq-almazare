/**
 * Application Type Definitions for "صديق المزارع"
 */

export type ActivePage =
  | 'home'
  | 'plant_diagnosis'
  | 'pest_diagnosis'
  | 'cartoon_videos'
  | 'encyclopedia'
  | 'calendar'
  | 'alerts'
  | 'weather'
  | 'community'
  | 'games'
  | 'murshid_adventures'
  | 'cultural_quiz'
  | 'leaderboard'
  | 'library'
  | 'quran'
  | 'radio'
  | 'daily_tips'
  | 'profile'
  | 'settings'
  | 'help_support'
  | 'login'
  | 'admin';

export type ThemeMode = 'auto' | 'light' | 'dark';

export interface UserProfile {
  id: string;
  name: string;
  role: 'مزارع' | 'مهندس زراعي' | 'مرشد زراعي' | 'مشرف' | 'مدير التطبيق';
  governorate: string;
  wilayat: string;
  village?: string;
  avatarSeed: string;
  totalScore: number;
  participations: number;
  rank: number;
  isAdmin: boolean;
  isModerator?: boolean;
  bookmarkedBookIds: string[];
  lastReadPages: Record<string, number>;
  notificationPreferences: {
    weatherAlerts: boolean;
    cropAdvice: boolean;
    ramadanDaily: boolean;
    communityReplies: boolean;
  };
}

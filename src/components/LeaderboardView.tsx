import React, { useState, useEffect } from 'react';
import {
  Trophy,
  Medal,
  Award,
  Crown,
  RefreshCw,
  Sparkles,
  Gift,
  Flame,
  LogIn,
} from 'lucide-react';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { collection, limit, onSnapshot, orderBy, query } from 'firebase/firestore';
import { UserProfile } from '../types/index.ts';
import {
  auth,
  db,
  handleFirestoreError,
  OperationType,
  signInWithGoogleFarmer,
} from '../firebase.ts';

interface LeaderboardViewProps {
  user: UserProfile;
  onNavigateToGames: () => void;
}

interface FirebaseLeaderboardEntry {
  userId: string;
  displayName: string;
  governorate: string;
  totalPoints: number;
  roundsPlayed: number;
  bestStreak: number;
  lastGameType: string;
}

export const LeaderboardView: React.FC<LeaderboardViewProps> = ({
  user,
  onNavigateToGames,
}) => {
  const [viewMode, setViewMode] = useState<'firebase' | 'daily' | 'weekly' | 'monthly' | 'allTime'>('firebase');
  const [firebaseList, setFirebaseList] = useState<FirebaseLeaderboardEntry[]>([]);
  const [fbLoading, setFbLoading] = useState<boolean>(true);
  const [fbUser, setFbUser] = useState<FirebaseUser | null>(auth.currentUser);
  const [authBusy, setAuthBusy] = useState<boolean>(false);

  const [leaderboardData, setLeaderboardData] = useState<any>({
    daily: [],
    weekly: [],
    monthly: [],
    allTime: [],
  });
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const unsubAuth = onAuthStateChanged(auth, (u) => {
      setFbUser(u);
    });
    return () => unsubAuth();
  }, []);

  // Real-time Firebase Firestore Leaderboard subscription
  useEffect(() => {
    setFbLoading(true);
    const colPath = 'leaderboard_entries';
    const q = query(
      collection(db, colPath),
      orderBy('totalPoints', 'desc'),
      limit(25)
    );

    const unsub = onSnapshot(
      q,
      (snap) => {
        const items: FirebaseLeaderboardEntry[] = [];
        snap.forEach((d) => {
          items.push(d.data() as FirebaseLeaderboardEntry);
        });
        setFirebaseList(items);
        setFbLoading(false);
      },
      (err) => {
        setFbLoading(false);
        try {
          handleFirestoreError(err, OperationType.LIST, colPath);
        } catch {
          // Logged by handleFirestoreError
        }
      }
    );

    return () => unsub();
  }, []);

  const fetchLeaderboards = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/scores/leaderboard');
      const data = await response.json();
      setLeaderboardData(data);
    } catch (err) {
      console.warn('Leaderboard fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeaderboards();
  }, []);

  const myFbEntry = fbUser
    ? firebaseList.find((item) => item.userId === fbUser.uid)
    : undefined;
  const myFbRank = fbUser
    ? firebaseList.findIndex((item) => item.userId === fbUser.uid) + 1
    : 0;

  const currentServerList =
    viewMode === 'firebase' ? [] : leaderboardData[viewMode] || [];

  const handleConnectGoogle = async () => {
    setAuthBusy(true);
    try {
      await signInWithGoogleFarmer();
    } catch {
      // handled silently
    } finally {
      setAuthBusy(false);
    }
  };

  return (
    <div className="w-full max-w-3xl mx-auto space-y-3 sm:space-y-6 px-0.5 sm:px-0">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 border-b border-stone-200 dark:border-stone-800 pb-3 sm:pb-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-amber-600 dark:text-amber-400">
            <Trophy className="w-4 h-4" />
            <span>لوحة الشرف المباشرة في Firebase وتنافس مزارعي عُمان</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-stone-900 dark:text-white mt-1">
            لوحة المتصدرين والنقاط
          </h1>
          <p className="text-xs sm:text-sm text-stone-600 dark:text-stone-400 mt-0.5">
            تحديث فوري للنقاط المعتمدة من المسابقات والألعاب التفاعلية.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchLeaderboards}
            className="p-2 rounded-lg border border-stone-200 dark:border-stone-700 text-stone-600 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800 text-xs flex items-center gap-1.5"
            title="تحديث البيانات"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">تحديث</span>
          </button>

          <button
            onClick={onNavigateToGames}
            className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-sm flex items-center gap-1.5"
          >
            <Sparkles className="w-3.5 h-3.5 text-emerald-200" />
            <span>شارك واجمع نقاطاً</span>
          </button>
        </div>
      </div>

      {/* User Status Card */}
      <div className="p-3 sm:p-4 rounded-xl sm:rounded-2xl bg-gradient-to-r from-emerald-900 via-stone-900 to-emerald-950 text-white flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-4 shadow-sm border border-emerald-800/40">
        <div className="flex items-center gap-3 text-right w-full sm:w-auto">
          <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-emerald-800/80 border border-emerald-600/50 flex items-center justify-center text-xl font-bold">
            🌱
          </div>
          <div>
            <div className="text-xs text-emerald-300 font-medium">
              حسابك الحالي في المنصة:
            </div>
            <div className="font-bold text-sm sm:text-base text-white break-words">
              {fbUser?.displayName || user.name} ({user.governorate})
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 sm:gap-6 text-center w-full sm:w-auto justify-around sm:justify-end border-t sm:border-t-0 border-emerald-800/60 pt-3 sm:pt-0">
          <div>
            <div className="text-[11px] text-stone-300 font-medium">مجموع نقاطك</div>
            <div className="text-lg sm:text-xl font-black text-amber-400 font-mono">
              {myFbEntry ? myFbEntry.totalPoints : user.totalScore}
            </div>
          </div>
          <div>
            <div className="text-[11px] text-stone-300 font-medium">الجولات المكتملة</div>
            <div className="text-lg sm:text-xl font-black text-emerald-300 font-mono">
              {myFbEntry ? myFbEntry.roundsPlayed : user.participations}
            </div>
          </div>
          <div>
            <div className="text-[11px] text-stone-300 font-medium">الترتيب</div>
            <div className="text-lg sm:text-xl font-black text-white font-mono">
              #{myFbRank > 0 ? myFbRank : user.rank || 1}
            </div>
          </div>
        </div>
      </div>

      {!fbUser && (
        <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
          <span className="text-emerald-900 dark:text-emerald-200 font-medium">
            سجّل الدخول بحساب Google لتثبيت اسمك ونقاطك في لوحة المتصدرين المباشرة على Firebase.
          </span>
          <button
            type="button"
            onClick={handleConnectGoogle}
            disabled={authBusy}
            className="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold flex items-center gap-1.5 shrink-0 disabled:opacity-50"
          >
            <LogIn className="w-3.5 h-3.5" />
            <span>{authBusy ? 'جاري الاتصال...' : 'ربط حساب Google'}</span>
          </button>
        </div>
      )}

      {/* Mode Tabs */}
      <div className="w-full min-w-0 overflow-x-auto overscroll-x-contain">
        <div className="w-max min-w-full sm:min-w-0 sm:w-auto p-1 rounded-xl bg-stone-100 dark:bg-stone-800/80 border border-stone-200 dark:border-stone-700 flex items-center gap-1">
          {(
            [
              { id: 'firebase', label: 'المباشر (Firebase)' },
              { id: 'daily', label: 'اليوم' },
              { id: 'weekly', label: 'الأسبوعي' },
              { id: 'monthly', label: 'الشهري' },
              { id: 'allTime', label: 'كافة الأوقات' },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              onClick={() => setViewMode(tab.id)}
              className={`px-2.5 sm:px-3.5 py-1.5 rounded-lg text-[11px] sm:text-xs font-semibold transition-all whitespace-nowrap ${
                viewMode === tab.id
                  ? 'bg-white dark:bg-stone-900 text-emerald-700 dark:text-emerald-400 shadow-sm'
                  : 'text-stone-600 dark:text-stone-400 hover:text-stone-900'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Leaderboard List */}
      <div className="bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-800 shadow-sm overflow-hidden">
        {viewMode === 'firebase' ? (
          fbLoading ? (
            <div className="py-12 text-center text-xs text-stone-500">
              جاري تحميل لوحة المتصدرين المباشرة من Firebase...
            </div>
          ) : firebaseList.length === 0 ? (
            <div className="py-12 text-center space-y-2">
              <Trophy className="w-10 h-10 mx-auto text-stone-300" />
              <div className="text-xs font-semibold text-stone-600 dark:text-stone-400">
                لا توجد نقاط مسجلة في Firebase بعد — أكمل جولة واحدة لتتصدر القائمة!
              </div>
              <button
                onClick={onNavigateToGames}
                className="text-xs text-emerald-600 dark:text-emerald-400 underline font-medium"
              >
                ابدأ تحدي الأسئلة الآن
              </button>
            </div>
          ) : (
            <div className="divide-y divide-stone-100 dark:divide-stone-800">
              {firebaseList.map((entry, index) => {
                const rank = index + 1;
                const isCurrentUser = fbUser?.uid === entry.userId;

                return (
                  <div
                    key={entry.userId}
                    className={`p-4 flex items-center justify-between transition-colors ${
                      isCurrentUser
                        ? 'bg-emerald-50/70 dark:bg-emerald-950/40'
                        : 'hover:bg-stone-50 dark:hover:bg-stone-800/40'
                    }`}
                  >
                    <div className="flex min-w-0 items-center gap-2.5 sm:gap-3.5">
                      <div className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs shrink-0 font-mono">
                        {rank === 1 ? (
                          <div className="w-8 h-8 rounded-full bg-amber-400 text-amber-950 flex items-center justify-center shadow-sm">
                            <Crown className="w-4 h-4 fill-current" />
                          </div>
                        ) : rank === 2 ? (
                          <div className="w-8 h-8 rounded-full bg-slate-300 text-slate-800 flex items-center justify-center shadow-sm">
                            <Medal className="w-4 h-4" />
                          </div>
                        ) : rank === 3 ? (
                          <div className="w-8 h-8 rounded-full bg-amber-700 text-amber-100 flex items-center justify-center shadow-sm">
                            <Award className="w-4 h-4" />
                          </div>
                        ) : (
                          <span className="text-stone-400 font-bold">#{rank}</span>
                        )}
                      </div>

                      <div>
                        <div className="font-bold text-xs sm:text-sm text-stone-900 dark:text-white flex items-center gap-2">
                          <span className="break-words">{entry.displayName}</span>
                          {isCurrentUser && (
                            <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-600 text-white font-medium">
                              أنت
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-stone-500 dark:text-stone-400 flex items-center gap-1.5">
                          <span>{entry.governorate}</span>
                          <span aria-hidden="true">·</span>
                          <span>{entry.roundsPlayed} جولة</span>
                          {entry.bestStreak > 1 && (
                            <>
                              <span aria-hidden="true">·</span>
                              <span className="inline-flex items-center gap-0.5 text-amber-600 dark:text-amber-400">
                                <Flame className="w-3 h-3" />
                                تتابع {entry.bestStreak}
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="text-left">
                      <div className="text-sm sm:text-lg font-black text-emerald-700 dark:text-emerald-400 font-mono">
                        {entry.totalPoints.toLocaleString()}
                      </div>
                      <div className="text-[10px] text-stone-400 font-medium">
                        نقطة في Firebase
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )
        ) : loading ? (
          <div className="py-12 text-center text-xs text-stone-500">
            جاري جلب لوحة المتصدرين من الخادم...
          </div>
        ) : currentServerList.length === 0 ? (
          <div className="py-12 text-center space-y-2">
            <Trophy className="w-10 h-10 mx-auto text-stone-300" />
            <div className="text-xs font-semibold text-stone-600 dark:text-stone-400">
              لا توجد مشاركات مسجلة في هذه الفترة حتى الآن
            </div>
            <button
              onClick={onNavigateToGames}
              className="text-xs text-emerald-600 dark:text-emerald-400 underline font-medium"
            >
              كن أول من يحقق نقاطاً في هذه الفترة!
            </button>
          </div>
        ) : (
          <div className="divide-y divide-stone-100 dark:divide-stone-800">
            {currentServerList.map((entry: any, index: number) => {
              const rank = index + 1;
              const isCurrentUser = entry.userId === user.id;

              return (
                <div
                  key={entry.userId || index}
                  className={`p-4 flex items-center justify-between transition-colors ${
                    isCurrentUser
                      ? 'bg-emerald-50/70 dark:bg-emerald-950/40'
                      : 'hover:bg-stone-50 dark:hover:bg-stone-800/40'
                  }`}
                >
                  <div className="flex items-center gap-3.5">
                    <div className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs shrink-0 font-mono">
                      {rank === 1 ? (
                        <div className="w-8 h-8 rounded-full bg-amber-400 text-amber-950 flex items-center justify-center shadow-sm">
                          <Crown className="w-4 h-4 fill-current" />
                        </div>
                      ) : rank === 2 ? (
                        <div className="w-8 h-8 rounded-full bg-slate-300 text-slate-800 flex items-center justify-center shadow-sm">
                          <Medal className="w-4 h-4" />
                        </div>
                      ) : rank === 3 ? (
                        <div className="w-8 h-8 rounded-full bg-amber-700 text-amber-100 flex items-center justify-center shadow-sm">
                          <Award className="w-4 h-4" />
                        </div>
                      ) : (
                        <span className="text-stone-400 font-bold">#{rank}</span>
                      )}
                    </div>

                    <div>
                      <div className="font-bold text-xs sm:text-sm text-stone-900 dark:text-white flex items-center gap-2">
                        <span>{entry.userName}</span>
                        {isCurrentUser && (
                          <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-600 text-white font-medium">
                            أنت
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-stone-500 dark:text-stone-400">
                        {entry.governorate} · {entry.participations || 1} مشاركة
                      </div>
                    </div>
                  </div>

                  <div className="text-left">
                    <div className="text-base sm:text-lg font-black text-emerald-700 dark:text-emerald-400 font-mono">
                      {entry.totalScore.toLocaleString()}
                    </div>
                    <div className="text-[10px] text-stone-400 font-medium">
                      نقطة معتمدة
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Fair Play Notice */}
      <div className="p-3 sm:p-4 rounded-xl bg-amber-500/10 border border-amber-300/40 text-xs text-amber-900 dark:text-amber-200 flex items-start gap-3">
        <Gift className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <div className="font-bold">نظام الجوائز والنزاهة:</div>
          <p className="text-[11px] leading-relaxed text-stone-600 dark:text-stone-300">
            جميع الألعاب مجانية بنسبة 100%. يتم التحقق من إجابات الأسئلة (بما فيها الأسئلة المولدة بالذكاء الاصطناعي) على الخادم، وتُحفظ النقاط في Firebase بحماية ضد التكرار والتلاعب بإشراف إدارة التطبيق (عمر الشرجي).
          </p>
        </div>
      </div>
    </div>
  );
};

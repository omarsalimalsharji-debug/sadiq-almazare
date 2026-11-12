import React, { useState, useEffect } from 'react';
import { 
  Trophy, 
  Medal, 
  Award, 
  Crown, 
  ShieldCheck, 
  RefreshCw, 
  Users, 
  Sparkles,
  Flame,
  Gift
} from 'lucide-react';
import { UserProfile } from '../types/index.ts';

interface LeaderboardViewProps {
  user: UserProfile;
  onNavigateToGames: () => void;
}

export const LeaderboardView: React.FC<LeaderboardViewProps> = ({
  user,
  onNavigateToGames
}) => {
  const [period, setPeriod] = useState<'daily' | 'weekly' | 'monthly' | 'allTime'>('weekly');
  const [leaderboardData, setLeaderboardData] = useState<any>({
    daily: [],
    weekly: [],
    monthly: [],
    allTime: []
  });
  const [loading, setLoading] = useState<boolean>(true);

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

  const currentList = leaderboardData[period] || [];

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-stone-200 dark:border-stone-800 pb-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-amber-600 dark:text-amber-400">
            <Trophy className="w-4 h-4" />
            <span>لوحة الشرف وتنافس مزارعي عُمان</span>
          </div>
          <h1 className="text-2xl font-bold text-stone-900 dark:text-white mt-1">
            لوحة المتصدرين والنقاط
          </h1>
          <p className="text-xs sm:text-sm text-stone-600 dark:text-stone-400 mt-0.5">
            ترتيب المزارعين والمشاركين حسب النقاط المحققة والمعتمدة عبر خادم المنصة.
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
      <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-900 via-stone-900 to-emerald-950 text-white flex flex-col sm:flex-row items-center justify-between gap-4 shadow-sm border border-emerald-800/40">
        <div className="flex items-center gap-3 text-right w-full sm:w-auto">
          <div className="w-12 h-12 rounded-2xl bg-emerald-800/80 border border-emerald-600/50 flex items-center justify-center text-xl font-bold">
            🌱
          </div>
          <div>
            <div className="text-xs text-emerald-300 font-medium">
              حسابك الحالي في المنصة:
            </div>
            <div className="font-bold text-base text-white">
              {user.name} ({user.governorate})
            </div>
          </div>
        </div>

        <div className="flex items-center gap-6 text-center w-full sm:w-auto justify-around sm:justify-end border-t sm:border-t-0 border-emerald-800/60 pt-3 sm:pt-0">
          <div>
            <div className="text-[11px] text-stone-300 font-medium">مجموع نقاطك</div>
            <div className="text-xl font-black text-amber-400 font-mono">{user.totalScore}</div>
          </div>
          <div>
            <div className="text-[11px] text-stone-300 font-medium">الجولات المكتملة</div>
            <div className="text-xl font-black text-emerald-300 font-mono">{user.participations}</div>
          </div>
          <div>
            <div className="text-[11px] text-stone-300 font-medium">الترتيب التقديري</div>
            <div className="text-xl font-black text-white font-mono">#{user.rank || 1}</div>
          </div>
        </div>
      </div>

      {/* Period Filter Tabs (Segmented control) */}
      <div className="flex items-center justify-center">
        <div className="p-1 rounded-xl bg-stone-100 dark:bg-stone-800/80 border border-stone-200 dark:border-stone-700 flex items-center gap-1">
          <button
            onClick={() => setPeriod('daily')}
            className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              period === 'daily'
                ? 'bg-white dark:bg-stone-900 text-emerald-700 dark:text-emerald-400 shadow-sm'
                : 'text-stone-600 dark:text-stone-400 hover:text-stone-900'
            }`}
          >
            المتصدرون اليوم
          </button>
          <button
            onClick={() => setPeriod('weekly')}
            className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              period === 'weekly'
                ? 'bg-white dark:bg-stone-900 text-emerald-700 dark:text-emerald-400 shadow-sm'
                : 'text-stone-600 dark:text-stone-400 hover:text-stone-900'
            }`}
          >
            الأسبوعي
          </button>
          <button
            onClick={() => setPeriod('monthly')}
            className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              period === 'monthly'
                ? 'bg-white dark:bg-stone-900 text-emerald-700 dark:text-emerald-400 shadow-sm'
                : 'text-stone-600 dark:text-stone-400 hover:text-stone-900'
            }`}
          >
            الشهري
          </button>
          <button
            onClick={() => setPeriod('allTime')}
            className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              period === 'allTime'
                ? 'bg-white dark:bg-stone-900 text-emerald-700 dark:text-emerald-400 shadow-sm'
                : 'text-stone-600 dark:text-stone-400 hover:text-stone-900'
            }`}
          >
            كافة الأوقات
          </button>
        </div>
      </div>

      {/* Leaderboard Table List */}
      <div className="bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-800 shadow-sm overflow-hidden">
        {loading ? (
          <div className="py-12 text-center text-xs text-stone-500">
            جاري جلب لوحة المتصدرين من الخادم...
          </div>
        ) : currentList.length === 0 ? (
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
            {currentList.map((entry: any, index: number) => {
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
                    {/* Rank Badge */}
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

                    {/* Name & Wilayat */}
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

                  {/* Score */}
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

      {/* Future Prizes & Fair Play Notice */}
      <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-300/40 text-xs text-amber-900 dark:text-amber-200 flex items-start gap-3">
        <Gift className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <div className="font-bold">
            نظام الجوائز المستقبلية والنزاهة:
          </div>
          <p className="text-[11px] leading-relaxed text-stone-600 dark:text-stone-300">
            جميع الألعاب مجانية بنسبة 100%. تحتفظ إدارة التطبيق (عمر الشرجي) بإمكانية إعلان جوائز ودروع تكريمية تشجيعية للمزارعين الأكثر تفاعلاً في المواسم القادمة دون أي رسوم اشتراك. نظام النقاط محمي ضد التكرار والتدخل الآلي.
          </p>
        </div>
      </div>

    </div>
  );
};

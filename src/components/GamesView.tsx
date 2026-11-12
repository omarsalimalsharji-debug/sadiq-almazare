import React, { useState, useEffect } from 'react';
import confetti from 'canvas-confetti';
import { 
  Gamepad2, 
  Trophy, 
  Sparkles, 
  CheckCircle, 
  XCircle, 
  Clock, 
  Flame, 
  RotateCcw, 
  Award,
  Stethoscope,
  HelpCircle,
  Zap,
  Landmark,
  ChevronLeft
} from 'lucide-react';
import { GAME_QUESTIONS, Question } from '../data/agriculturalData.ts';
import { UserProfile } from '../types/index.ts';

interface GamesViewProps {
  user: UserProfile;
  onScoreUpdated: (newTotal: number) => void;
  onNavigateToLeaderboard: () => void;
  initialGameType?: string;
}

type GameKey = 'knowledge' | 'guess_crop' | 'plant_doctor' | 'true_false' | 'speed' | 'cultural';

interface GameInfo {
  key: GameKey;
  title: string;
  subtitle: string;
  icon: React.ElementType;
  badge: string;
  gradient: string;
}

const GAMES_CATALOG: GameInfo[] = [
  {
    key: 'knowledge',
    title: 'تحدي المعرفة الزراعية',
    subtitle: 'أسئلة علمية وميدانية عن النباتات والمحاصيل والآفات وتغذية النبات',
    icon: Gamepad2,
    badge: 'شامل',
    gradient: 'from-emerald-600 to-teal-700'
  },
  {
    key: 'guess_crop',
    title: 'اكتشف المحصول',
    subtitle: 'تعرف على التمور والفواكه والمحاصيل العمانية من خلال التلميحات والأوصاف',
    icon: Sparkles,
    badge: 'ذكاء بصري',
    gradient: 'from-amber-600 to-orange-700'
  },
  {
    key: 'plant_doctor',
    title: 'الطبيب الزراعي',
    subtitle: 'عليك تشخيص الحالات المرضية الحقلية ووصف العلاج الزراعي السليم',
    icon: Stethoscope,
    badge: 'مستوى متقدم',
    gradient: 'from-cyan-600 to-blue-700'
  },
  {
    key: 'true_false',
    title: 'صح أم خطأ',
    subtitle: 'اختبر سرعة بديهتك بمعلومات زراعية وبيئية وتراثية في ثوانٍ معدودة',
    icon: HelpCircle,
    badge: 'سريع',
    gradient: 'from-violet-600 to-purple-700'
  },
  {
    key: 'speed',
    title: 'تحدي السرعة',
    subtitle: 'أجب قبل نفاد الوقت مع نقاط مضاعفة لمن يجيب في أقل من 8 ثوانٍ',
    icon: Zap,
    badge: 'عداد تنازلي',
    gradient: 'from-rose-600 to-pink-700'
  },
  {
    key: 'cultural',
    title: 'المسابقة الثقافية العامة',
    subtitle: 'أسئلة عن تاريخ سلطنة عُمان، الأفلاج، الجغرافيا، والمعالم الخالدة',
    icon: Landmark,
    badge: 'تراث عُمان',
    gradient: 'from-emerald-700 to-amber-700'
  }
];

export const GamesView: React.FC<GamesViewProps> = ({
  user,
  onScoreUpdated,
  onNavigateToLeaderboard,
  initialGameType
}) => {
  const [selectedGame, setSelectedGame] = useState<GameKey | null>(
    (initialGameType as GameKey) || null
  );
  const [currentQuestions, setCurrentQuestions] = useState<Question[]>([]);
  const [currentQIndex, setCurrentQIndex] = useState<number>(0);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [isAnswerSubmitted, setIsAnswerSubmitted] = useState<boolean>(false);
  
  // Scoring state
  const [answersLog, setAnswersLog] = useState<{ questionId: string; selectedIndex: number; timeTakenSec: number }[]>([]);
  const [streak, setStreak] = useState<number>(0);
  const [gameFinished, setGameFinished] = useState<boolean>(false);
  const [submittingToServer, setSubmittingToServer] = useState<boolean>(false);
  const [verifiedResult, setVerifiedResult] = useState<any | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);

  // Speed timer
  const [timeLeft, setTimeLeft] = useState<number>(15);
  const [questionStartTime, setQuestionStartTime] = useState<number>(Date.now());

  // Start selected game
  const handleStartGame = (key: GameKey) => {
    const list = GAME_QUESTIONS.filter(q => q.gameType === key);
    // If not enough questions, fallback to all
    const qList = list.length > 0 ? list : GAME_QUESTIONS.slice(0, 5);
    
    setSelectedGame(key);
    setCurrentQuestions(qList);
    setCurrentQIndex(0);
    setSelectedOption(null);
    setIsAnswerSubmitted(false);
    setAnswersLog([]);
    setStreak(0);
    setGameFinished(false);
    setVerifiedResult(null);
    setServerError(null);
    setTimeLeft(key === 'speed' ? 15 : 30);
    setQuestionStartTime(Date.now());
  };

  // Timer loop for speed game
  useEffect(() => {
    if (!selectedGame || gameFinished || isAnswerSubmitted) return;

    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          // Time expired, auto submit wrong
          handleAnswerOption(-1);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [selectedGame, gameFinished, isAnswerSubmitted, currentQIndex]);

  const handleAnswerOption = (index: number) => {
    if (isAnswerSubmitted) return;
    const timeTaken = Math.max(1, Math.round((Date.now() - questionStartTime) / 1000));
    
    setSelectedOption(index);
    setIsAnswerSubmitted(true);

    const curQ = currentQuestions[currentQIndex];
    const isCorrect = index === curQ.correctIndex;

    const newStreak = isCorrect ? streak + 1 : 0;
    setStreak(newStreak);

    setAnswersLog(prev => [
      ...prev,
      {
        questionId: curQ.id,
        selectedIndex: index,
        timeTakenSec: timeTaken
      }
    ]);
  };

  const handleNextQuestion = () => {
    if (currentQIndex + 1 < currentQuestions.length) {
      setCurrentQIndex(prev => prev + 1);
      setSelectedOption(null);
      setIsAnswerSubmitted(false);
      setTimeLeft(selectedGame === 'speed' ? 15 : 30);
      setQuestionStartTime(Date.now());
    } else {
      // Game ended -> submit answers to server for anti-cheat verification!
      finishGameAndSubmitToServer();
    }
  };

  const finishGameAndSubmitToServer = async () => {
    setGameFinished(true);
    setSubmittingToServer(true);
    setServerError(null);

    const clientNonce = `game_${selectedGame}_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    try {
      const response = await fetch('/api/scores/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          userName: user.name,
          userGovernorate: `${user.governorate} (${user.wilayat})`,
          gameType: selectedGame,
          answers: answersLog,
          clientNonce
        })
      });

      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.error || 'تعذر اعتماد النقاط من الخادم');
      }

      setVerifiedResult(data);
      onScoreUpdated(data.verifiedScore);

      // Trigger celebration confetti
      if (data.verifiedScore > 0) {
        try {
          confetti({
            particleCount: 80,
            spread: 60,
            origin: { y: 0.6 }
          });
        } catch (e) {
          // ignore confetti if unsupported
        }
      }
    } catch (err: any) {
      console.error(err);
      setServerError(err.message || 'حدث خطأ أثناء الاتصال بالخادم للتحقق من النقاط.');
    } finally {
      setSubmittingToServer(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      
      {/* Header and Leaderboard teaser */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-stone-200 dark:border-stone-800 pb-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
            <Gamepad2 className="w-4 h-4" />
            <span>نظام المسابقات والألعاب الزراعية المجانية</span>
          </div>
          <h1 className="text-2xl font-bold text-stone-900 dark:text-white mt-1">
            الألعاب الزراعية والمسابقات التفاعلية
          </h1>
          <p className="text-xs sm:text-sm text-stone-600 dark:text-stone-400 mt-0.5">
            6 ألعاب أصلية متكاملة بنظام نقاط موثق ومحمي على الخادم لمنع التلاعب وتكريم المزارعين المتميزين.
          </p>
        </div>

        <button
          onClick={onNavigateToLeaderboard}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-300/50 hover:bg-amber-500/20 text-xs font-semibold transition-colors self-start sm:self-auto"
        >
          <Trophy className="w-4 h-4 text-amber-600" />
          <span>لوحة المتصدرين والنقاط</span>
        </button>
      </div>

      {/* Main Game Interface */}
      {!selectedGame ? (
        /* Games Catalog Selection Grid */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {GAMES_CATALOG.map((g) => {
            const Icon = g.icon;
            return (
              <div
                key={g.key}
                className="rounded-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 p-5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between group"
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${g.gradient} text-white flex items-center justify-center shadow-sm`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <span className="text-[11px] font-semibold px-2 py-0.5 rounded bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300">
                      {g.badge}
                    </span>
                  </div>

                  <h3 className="text-base font-bold text-stone-900 dark:text-white group-hover:text-emerald-600 transition-colors">
                    {g.title}
                  </h3>
                  <p className="text-xs text-stone-500 dark:text-stone-400 mt-1 leading-relaxed">
                    {g.subtitle}
                  </p>
                </div>

                <div className="mt-5 pt-4 border-t border-stone-100 dark:border-stone-800 flex items-center justify-between">
                  <div className="text-[11px] text-stone-400 font-medium">
                    مجانية · نقاط حقيقية
                  </div>
                  <button
                    onClick={() => handleStartGame(g.key)}
                    className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all shadow-sm flex items-center gap-1.5"
                  >
                    <span>ابدأ التحدي</span>
                    <ChevronLeft className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ) : gameFinished ? (
        /* Game Finished / Score Verification Screen */
        <div className="bg-white dark:bg-stone-900 rounded-3xl border border-stone-200 dark:border-stone-800 p-6 sm:p-8 text-center max-w-xl mx-auto shadow-sm space-y-6">
          <div className="w-20 h-20 mx-auto rounded-3xl bg-amber-500/10 border border-amber-300/40 text-amber-600 flex items-center justify-center shadow-inner">
            <Trophy className="w-10 h-10" />
          </div>

          <div>
            <h2 className="text-2xl font-bold text-stone-900 dark:text-white">
              اكتملت الجولة بنجاح!
            </h2>
            <p className="text-xs text-stone-500 dark:text-stone-400 mt-1">
              تم إرسال نتائجك إلى الخادم للتحقق المالي والحسابي ومكافحة التلاعب
            </p>
          </div>

          {submittingToServer ? (
            <div className="p-4 rounded-xl bg-stone-50 dark:bg-stone-800 text-xs text-stone-600 dark:text-stone-300 flex items-center justify-center gap-2">
              <Clock className="w-4 h-4 animate-spin text-emerald-600" />
              <span>جاري التحقق من إجاباتك واعتماد النقاط في لوحة المتصدرين...</span>
            </div>
          ) : verifiedResult ? (
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-3">
                <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800">
                  <span className="text-[11px] text-emerald-700 dark:text-emerald-400 block font-semibold">
                    النقاط المعتمدة
                  </span>
                  <span className="text-2xl font-black text-emerald-800 dark:text-emerald-300 font-mono">
                    +{verifiedResult.verifiedScore}
                  </span>
                </div>
                <div className="p-3 rounded-xl bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700">
                  <span className="text-[11px] text-stone-500 block font-semibold">
                    الإجابات الصحيحة
                  </span>
                  <span className="text-2xl font-black text-stone-800 dark:text-stone-200 font-mono">
                    {verifiedResult.correctCount}/{verifiedResult.totalQuestions}
                  </span>
                </div>
                <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800">
                  <span className="text-[11px] text-amber-700 dark:text-amber-400 block font-semibold">
                    مكافأة التتابع (Streak)
                  </span>
                  <span className="text-2xl font-black text-amber-800 dark:text-amber-300 font-mono">
                    +{verifiedResult.streakBonus}
                  </span>
                </div>
              </div>

              <div className="text-xs text-emerald-700 dark:text-emerald-400 bg-emerald-50/50 dark:bg-emerald-950/30 p-2.5 rounded-lg border border-emerald-200/50">
                ✓ تم تسجيل درجاتك رسمياً باسم: <strong className="font-bold">{user.name}</strong> وتم تحديث ترتيبك العام!
              </div>
            </div>
          ) : serverError ? (
            <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-red-700 text-xs">
              {serverError}
            </div>
          ) : null}

          <div className="flex items-center justify-center gap-3 pt-2">
            <button
              onClick={() => handleStartGame(selectedGame)}
              className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-2 shadow-md"
            >
              <RotateCcw className="w-4 h-4" />
              <span>جولة جديدة</span>
            </button>
            <button
              onClick={() => setSelectedGame(null)}
              className="px-5 py-2.5 rounded-xl bg-stone-200 dark:bg-stone-800 hover:bg-stone-300 dark:hover:bg-stone-700 text-stone-800 dark:text-stone-200 text-xs font-semibold"
            >
              اختيار لعبة أخرى
            </button>
            <button
              onClick={onNavigateToLeaderboard}
              className="px-5 py-2.5 rounded-xl border border-amber-400 text-amber-700 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/30 text-xs font-bold"
            >
              عرض الترتيب العام
            </button>
          </div>
        </div>
      ) : (
        /* Active Quiz Question Screen */
        <div className="bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-800 p-5 sm:p-7 shadow-sm space-y-6">
          
          {/* Top Bar of Active Quiz */}
          <div className="flex items-center justify-between border-b border-stone-100 dark:border-stone-800 pb-3">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setSelectedGame(null)}
                className="text-xs text-stone-500 hover:text-stone-900 dark:hover:text-white flex items-center gap-1"
              >
                <span>خروج للقائمة</span>
              </button>
              <span className="text-stone-300">·</span>
              <span className="text-xs font-bold text-emerald-700 dark:text-emerald-400">
                {GAMES_CATALOG.find(g => g.key === selectedGame)?.title}
              </span>
            </div>

            <div className="flex items-center gap-4 text-xs font-semibold">
              {/* Streak */}
              {streak > 1 && (
                <div className="flex items-center gap-1 text-amber-600 dark:text-amber-400 animate-bounce">
                  <Flame className="w-4 h-4 fill-current" />
                  <span>متتالي x{streak}</span>
                </div>
              )}

              {/* Timer for speed challenge */}
              <div className={`flex items-center gap-1 font-mono px-2.5 py-1 rounded-lg ${
                timeLeft <= 5 ? 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300 animate-pulse' : 'bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300'
              }`}>
                <Clock className="w-3.5 h-3.5" />
                <span>{timeLeft} ث</span>
              </div>

              {/* Progress counter */}
              <span className="text-stone-400 font-mono">
                {currentQIndex + 1} / {currentQuestions.length}
              </span>
            </div>
          </div>

          {/* Question Text */}
          {currentQuestions[currentQIndex] && (
            <div className="space-y-4">
              <div className="text-base sm:text-lg font-bold text-stone-900 dark:text-white leading-relaxed">
                {currentQuestions[currentQIndex].question}
              </div>

              {/* Options */}
              <div className="space-y-2.5">
                {currentQuestions[currentQIndex].options.map((option, optIdx) => {
                  const isSelected = selectedOption === optIdx;
                  const isCorrect = optIdx === currentQuestions[currentQIndex].correctIndex;
                  
                  let optionClass = 'bg-stone-50 dark:bg-stone-800/60 border-stone-200 dark:border-stone-700 hover:border-emerald-500 text-stone-800 dark:text-stone-200';
                  
                  if (isAnswerSubmitted) {
                    if (isCorrect) {
                      optionClass = 'bg-emerald-100 dark:bg-emerald-950/80 border-emerald-500 text-emerald-950 dark:text-emerald-200 font-bold';
                    } else if (isSelected && !isCorrect) {
                      optionClass = 'bg-red-100 dark:bg-red-950/80 border-red-500 text-red-950 dark:text-red-200';
                    } else {
                      optionClass = 'opacity-50 border-stone-200 dark:border-stone-800';
                    }
                  } else if (isSelected) {
                    optionClass = 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/40';
                  }

                  return (
                    <button
                      key={optIdx}
                      disabled={isAnswerSubmitted}
                      onClick={() => handleAnswerOption(optIdx)}
                      className={`w-full p-3.5 rounded-xl border text-right text-xs sm:text-sm transition-all flex items-center justify-between ${optionClass}`}
                    >
                      <span>{option}</span>
                      {isAnswerSubmitted && isCorrect && (
                        <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                      )}
                      {isAnswerSubmitted && isSelected && !isCorrect && (
                        <XCircle className="w-4 h-4 text-red-600 shrink-0" />
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Explanation note after submitting */}
              {isAnswerSubmitted && (
                <div className="p-3.5 rounded-xl bg-stone-100 dark:bg-stone-800/80 border border-stone-200 dark:border-stone-700 text-xs text-stone-700 dark:text-stone-300 animate-in fade-in">
                  <span className="font-bold text-emerald-700 dark:text-emerald-400 block mb-0.5">
                    الشرح والتوضيح الزراعي:
                  </span>
                  {currentQuestions[currentQIndex].explanation}
                </div>
              )}

              {/* Next button */}
              {isAnswerSubmitted && (
                <div className="pt-2 flex justify-end">
                  <button
                    onClick={handleNextQuestion}
                    className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-2 shadow-md transition-all"
                  >
                    <span>
                      {currentQIndex + 1 < currentQuestions.length ? 'السؤال التالي' : 'اعتماد وإنهاء التحدي'}
                    </span>
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          )}

        </div>
      )}

    </div>
  );
};

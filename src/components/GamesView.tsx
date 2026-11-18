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
  Stethoscope,
  HelpCircle,
  Zap,
  Landmark,
  ChevronLeft,
  Lightbulb,
  Scissors,
  Loader2,
  CloudCheck,
  Volume2,
  VolumeX,
  Square,
  Share2,
} from 'lucide-react';
import { useShare } from '../context/ShareContext.tsx';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import {
  doc,
  getDoc,
  runTransaction,
  serverTimestamp,
  setDoc,
} from 'firebase/firestore';
import { GAME_QUESTIONS, Question } from '../data/agriculturalData.ts';
import { UserProfile } from '../types/index.ts';
import {
  auth,
  db,
  handleFirestoreError,
  OperationType,
} from '../firebase.ts';

import { MurshidCharacterSvg } from './MurshidCharacterSvg.tsx';
import { MurshidQuickGame } from './MurshidQuickGame.tsx';
import { MURSHID_PHRASES, pickFreshPhrase } from '../data/murshidDialogue.ts';
import {
  getMurshidAudioPrefs,
  playGentleErrorSfx,
  playSuccessSfx,
  setMurshidMuted,
  speakMurshid,
  stopAllMurshidAudio,
  subscribeMurshidAudioPrefs,
} from '../utils/murshidAudio.ts';

interface GamesViewProps {
  user: UserProfile;
  onScoreUpdated: (newTotal: number) => void;
  onNavigateToLeaderboard: () => void;
  onOpenMurshidAdventures?: () => void;
  initialGameType?: string;
}

type GameKey =
  | 'knowledge'
  | 'guess_crop'
  | 'plant_doctor'
  | 'true_false'
  | 'speed'
  | 'cultural';

type Difficulty = 'easy' | 'medium' | 'hard';

interface ExtendedQuestion extends Question {
  hint?: string;
  difficulty?: Difficulty;
}

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
    gradient: 'from-emerald-600 to-teal-700',
  },
  {
    key: 'guess_crop',
    title: 'اكتشف المحصول',
    subtitle: 'تعرف على التمور والفواكه والمحاصيل العمانية من خلال التلميحات والأوصاف',
    icon: Sparkles,
    badge: 'ذكاء بصري',
    gradient: 'from-amber-600 to-orange-700',
  },
  {
    key: 'plant_doctor',
    title: 'الطبيب الزراعي',
    subtitle: 'عليك تشخيص الحالات المرضية الحقلية ووصف العلاج الزراعي السليم',
    icon: Stethoscope,
    badge: 'مستوى متقدم',
    gradient: 'from-cyan-600 to-blue-700',
  },
  {
    key: 'true_false',
    title: 'صح أم خطأ',
    subtitle: 'اختبر سرعة بديهتك بمعلومات زراعية وبيئية وتراثية في ثوانٍ معدودة',
    icon: HelpCircle,
    badge: 'سريع',
    gradient: 'from-violet-600 to-purple-700',
  },
  {
    key: 'speed',
    title: 'تحدي السرعة',
    subtitle: 'أجب قبل نفاد الوقت مع نقاط مضاعفة لمن يجيب في أقل من 8 ثوانٍ',
    icon: Zap,
    badge: 'عداد تنازلي',
    gradient: 'from-rose-600 to-pink-700',
  },
  {
    key: 'cultural',
    title: 'المسابقة الثقافية العامة',
    subtitle: 'أسئلة عن تاريخ سلطنة عُمان، الأفلاج، الجغرافيا، والمعالم الخالدة',
    icon: Landmark,
    badge: 'تراث عُمان',
    gradient: 'from-emerald-700 to-amber-700',
  },
];

export const GamesView: React.FC<GamesViewProps> = ({
  user,
  onScoreUpdated,
  onNavigateToLeaderboard,
  onOpenMurshidAdventures,
  initialGameType,
}) => {
  const { openShare } = useShare();
  const [selectedGame, setSelectedGame] = useState<GameKey | null>(
    (initialGameType as GameKey) || null
  );
  const [difficulty, setDifficulty] = useState<Difficulty>('medium');
  const [useAiQuestions, setUseAiQuestions] = useState<boolean>(true);
  const [topicFocus, setTopicFocus] = useState<string>('');
  const [loadingQuestions, setLoadingQuestions] = useState<boolean>(false);
  const [questionSource, setQuestionSource] = useState<'gemini' | 'bank'>('bank');

  const [currentQuestions, setCurrentQuestions] = useState<ExtendedQuestion[]>([]);
  const [currentQIndex, setCurrentQIndex] = useState<number>(0);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [isAnswerSubmitted, setIsAnswerSubmitted] = useState<boolean>(false);

  // Lifelines (1 per round each)
  const [fiftyUsed, setFiftyUsed] = useState<boolean>(false);
  const [eliminatedOptions, setEliminatedOptions] = useState<number[]>([]);
  const [hintUsed, setHintUsed] = useState<boolean>(false);
  const [showHintForCurrent, setShowHintForCurrent] = useState<boolean>(false);

  // Scoring state
  const [answersLog, setAnswersLog] = useState<
    { questionId: string; selectedIndex: number; timeTakenSec: number }[]
  >([]);
  const [streak, setStreak] = useState<number>(0);
  const [bestStreak, setBestStreak] = useState<number>(0);
  const [gameFinished, setGameFinished] = useState<boolean>(false);
  const [submittingToServer, setSubmittingToServer] = useState<boolean>(false);
  const [verifiedResult, setVerifiedResult] = useState<any | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);

  // Firebase sync state
  const [fbUser, setFbUser] = useState<FirebaseUser | null>(auth.currentUser);
  const [firebaseSyncStatus, setFirebaseSyncStatus] = useState<
    'idle' | 'syncing' | 'synced' | 'error'
  >('idle');
  const [firebaseSyncedRound, setFirebaseSyncedRound] = useState<boolean>(false);

  // Speed timer
  const [timeLeft, setTimeLeft] = useState<number>(30);
  const [questionStartTime, setQuestionStartTime] = useState<number>(Date.now());

  // Murshid Voice & Expression Feedback state
  const [isMuted, setIsMuted] = useState<boolean>(() => getMurshidAudioPrefs().muted);
  const [murshidSpeaking, setMurshidSpeaking] = useState<boolean>(false);
  const [feedbackPhrase, setFeedbackPhrase] = useState<string>('');

  useEffect(() => {
    const unsubAuth = onAuthStateChanged(auth, (u) => {
      setFbUser(u);
    });
    const unsubPrefs = subscribeMurshidAudioPrefs((prefs) => {
      setIsMuted(prefs.muted);
    });
    return () => {
      unsubAuth();
      unsubPrefs();
      stopAllMurshidAudio();
    };
  }, []);

  const handleStartGame = async (key: GameKey) => {
    setSelectedGame(key);
    setCurrentQuestions([]);
    setCurrentQIndex(0);
    setSelectedOption(null);
    setIsAnswerSubmitted(false);
    setAnswersLog([]);
    setStreak(0);
    setBestStreak(0);
    setGameFinished(false);
    setVerifiedResult(null);
    setServerError(null);
    setFirebaseSyncStatus('idle');
    setFirebaseSyncedRound(false);
    setFiftyUsed(false);
    setEliminatedOptions([]);
    setHintUsed(false);
    setShowHintForCurrent(false);

    let qList: ExtendedQuestion[] = [];
    let src: 'gemini' | 'bank' = 'bank';

    if (useAiQuestions) {
      setLoadingQuestions(true);
      try {
        const res = await fetch('/api/games/generate-questions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            gameType: key,
            difficulty,
            topicFocus: topicFocus.trim(),
          }),
        });
        const data = await res.json();
        if (res.ok && data.success && Array.isArray(data.questions) && data.questions.length > 0) {
          qList = data.questions;
          src = data.source === 'gemini' ? 'gemini' : 'bank';
        }
      } catch {
        // fallback below
      } finally {
        setLoadingQuestions(false);
      }
    }

    if (qList.length === 0) {
      const bankList = GAME_QUESTIONS.filter((q) => q.gameType === key);
      qList = bankList.length > 0 ? bankList : GAME_QUESTIONS.slice(0, 5);
      src = 'bank';
    }

    setQuestionSource(src);
    setCurrentQuestions(qList);
    setTimeLeft(key === 'speed' ? 15 : 30);
    setQuestionStartTime(Date.now());
  };

  // Auto-start if initialGameType was provided
  useEffect(() => {
    if (initialGameType && currentQuestions.length === 0 && !loadingQuestions && !gameFinished) {
      handleStartGame(initialGameType as GameKey);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Timer loop
  useEffect(() => {
    if (
      !selectedGame ||
      loadingQuestions ||
      currentQuestions.length === 0 ||
      gameFinished ||
      isAnswerSubmitted
    ) {
      return;
    }

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          handleAnswerOption(-1);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedGame, loadingQuestions, currentQuestions.length, gameFinished, isAnswerSubmitted, currentQIndex]);

  const handleAnswerOption = (index: number) => {
    if (isAnswerSubmitted || !currentQuestions[currentQIndex]) return;
    const timeTaken = Math.max(1, Math.round((Date.now() - questionStartTime) / 1000));

    setSelectedOption(index);
    setIsAnswerSubmitted(true);

    const curQ = currentQuestions[currentQIndex];
    const isCorrect = index === curQ.correctIndex;

    const newStreak = isCorrect ? streak + 1 : 0;
    setStreak(newStreak);
    if (newStreak > bestStreak) {
      setBestStreak(newStreak);
    }

    if (isCorrect) {
      playSuccessSfx(isMuted);
      const phrase = pickFreshPhrase('games-correct', MURSHID_PHRASES.correct);
      setFeedbackPhrase(phrase);
      if (!isMuted) {
        speakMurshid(phrase, { muted: isMuted, onSpeakingChange: setMurshidSpeaking });
      }
    } else {
      playGentleErrorSfx(isMuted);
      const phrase = pickFreshPhrase('games-wrong', MURSHID_PHRASES.wrongGentle);
      setFeedbackPhrase(phrase);
      if (!isMuted) {
        speakMurshid(phrase, { muted: isMuted, onSpeakingChange: setMurshidSpeaking });
      }
    }

    setAnswersLog((prev) => [
      ...prev,
      {
        questionId: curQ.id,
        selectedIndex: index,
        timeTakenSec: timeTaken,
      },
    ]);
  };

  const handleUseFiftyFifty = () => {
    const curQ = currentQuestions[currentQIndex];
    if (fiftyUsed || isAnswerSubmitted || !curQ || curQ.options.length < 4) return;

    const wrongIndices = curQ.options
      .map((_, idx) => idx)
      .filter((idx) => idx !== curQ.correctIndex);
    const shuffled = [...wrongIndices].sort(() => Math.random() - 0.5);
    setEliminatedOptions(shuffled.slice(0, 2));
    setFiftyUsed(true);
  };

  const handleUseHint = () => {
    if (hintUsed || isAnswerSubmitted) return;
    setHintUsed(true);
    setShowHintForCurrent(true);
    const curQ = currentQuestions[currentQIndex];
    const hintText = curQ?.hint || 'فكّر في طبيعة المناخ والزراعة في سلطنة عُمان.';
    setFeedbackPhrase(hintText);
    if (!isMuted) {
      speakMurshid(hintText, { muted: isMuted, onSpeakingChange: setMurshidSpeaking });
    }
  };

  const handleNextQuestion = () => {
    stopAllMurshidAudio(setMurshidSpeaking);
    setFeedbackPhrase('');
    if (currentQIndex + 1 < currentQuestions.length) {
      setCurrentQIndex((prev) => prev + 1);
      setSelectedOption(null);
      setIsAnswerSubmitted(false);
      setEliminatedOptions([]);
      setShowHintForCurrent(false);
      setTimeLeft(selectedGame === 'speed' ? 15 : 30);
      setQuestionStartTime(Date.now());
    } else {
      finishGameAndSubmitToServer();
    }
  };

  const syncScoreToFirebase = async (
    targetUser: FirebaseUser,
    addedPoints: number,
    roundBestStreak: number,
    gameType: GameKey
  ) => {
    if (!targetUser.emailVerified || firebaseSyncedRound) return;

    setFirebaseSyncStatus('syncing');
    const safeAdded = Math.max(0, Math.min(1200, Math.round(addedPoints)));
    const userPath = `users/${targetUser.uid}`;
    const lbPath = `leaderboard_entries/${targetUser.uid}`;

    try {
      // Ensure parent /users/{uid} exists before writing leaderboard entry (required by firestore.rules)
      const userRef = doc(db, 'users', targetUser.uid);
      const userSnap = await getDoc(userRef);
      if (!userSnap.exists()) {
        await setDoc(userRef, {
          uid: targetUser.uid,
          displayName: (targetUser.displayName || user.name || 'مزارع عُماني').slice(0, 80),
          governorate: (user.governorate || 'محافظة الداخلية').slice(0, 60),
          role: 'farmer',
          level: 1,
          totalPoints: 0,
          isBanned: false,
          updatedAt: serverTimestamp(),
        });
      }

      const lbRef = doc(db, 'leaderboard_entries', targetUser.uid);
      await runTransaction(db, async (tx) => {
        const snap = await tx.get(lbRef);
        const displayName = (targetUser.displayName || user.name || 'مزارع عُماني').slice(0, 80);
        const governorate = `${user.governorate} (${user.wilayat})`.slice(0, 80);

        if (!snap.exists()) {
          tx.set(lbRef, {
            userId: targetUser.uid,
            displayName,
            governorate,
            totalPoints: safeAdded,
            roundsPlayed: 1,
            bestStreak: Math.max(0, Math.min(100, roundBestStreak)),
            lastGameType: gameType,
            updatedAt: serverTimestamp(),
          });
        } else {
          const prevData = snap.data();
          const prevTotal = Number(prevData.totalPoints) || 0;
          const prevRounds = Number(prevData.roundsPlayed) || 0;
          const prevBestStreak = Number(prevData.bestStreak) || 0;
          tx.update(lbRef, {
            displayName,
            governorate,
            totalPoints: prevTotal + safeAdded,
            roundsPlayed: prevRounds + 1,
            bestStreak: Math.max(prevBestStreak, Math.min(100, roundBestStreak)),
            lastGameType: gameType,
            updatedAt: serverTimestamp(),
          });
        }
      });

      setFirebaseSyncedRound(true);
      setFirebaseSyncStatus('synced');
    } catch (err) {
      setFirebaseSyncStatus('error');
      try {
        handleFirestoreError(err, OperationType.WRITE, lbPath || userPath);
      } catch {
        // Logged by handleFirestoreError
      }
    }
  };

  const finishGameAndSubmitToServer = async () => {
    setGameFinished(true);
    setSubmittingToServer(true);
    setServerError(null);

    const clientNonce = `game_${selectedGame}_${Date.now()}_${Math.random()
      .toString(36)
      .substring(2, 7)}`;
    let anonymousFarmerId = '';
    try {
      anonymousFarmerId = localStorage.getItem('farmer_anon_device_id') || '';
      if (!anonymousFarmerId) {
        anonymousFarmerId = typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
          ? crypto.randomUUID()
          : `farmer-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
        localStorage.setItem('farmer_anon_device_id', anonymousFarmerId);
      }
    } catch {
      anonymousFarmerId = `farmer-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
    }

    try {
      const response = await fetch('/api/scores/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id && user.id !== 'usr-oman-default' ? user.id : anonymousFarmerId,
          userName: user.name?.trim() || 'مزارع عُماني',
          userGovernorate: `${user.governorate || 'سلطنة عُمان'} (${user.wilayat || 'غير محدد'})`,
          gameType: selectedGame,
          answers: answersLog,
          clientNonce,
        }),
      });

      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.error || 'تعذر اعتماد النقاط من الخادم');
      }

      setVerifiedResult(data);
      onScoreUpdated(data.verifiedScore);

      if (data.verifiedScore > 0) {
        try {
          confetti({
            particleCount: 80,
            spread: 60,
            origin: { y: 0.6 },
          });
        } catch {
          // ignore confetti errors
        }
        if (!isMuted) {
          speakMurshid(
            `ما شاء الله يا ${user.name.split(' ')[0]}! أنهيت الجولة وحصدت ${data.verifiedScore} نقطة معتمدة.`,
            { muted: isMuted, mood: 'proud', onSpeakingChange: setMurshidSpeaking }
          );
        }
      } else if (!isMuted) {
        speakMurshid(
          'محاولة طيبة! راجع المعلومات وحاول جولة جديدة لتجمع نقاطاً أعلى.',
          { muted: isMuted, mood: 'cheerful', onSpeakingChange: setMurshidSpeaking }
        );
      }

      if (fbUser && selectedGame) {
        await syncScoreToFirebase(
          fbUser,
          data.verifiedScore,
          data.bestStreak ?? bestStreak,
          selectedGame
        );
      } else {
        setFirebaseSyncStatus('idle');
      }
    } catch (err: any) {
      console.error(err);
      setServerError(err.message || 'حدث خطأ أثناء الاتصال بالخادم للتحقق من النقاط.');
    } finally {
      setSubmittingToServer(false);
    }
  };

  const curQuestion = currentQuestions[currentQIndex];

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-stone-200 dark:border-stone-800 pb-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
            <Gamepad2 className="w-4 h-4" />
            <span>مسابقات زراعية مفتوحة لجميع المزارعين</span>
          </div>
          <h1 className="text-2xl font-bold text-stone-900 dark:text-white mt-1">
            الألعاب الزراعية والمسابقات التفاعلية
          </h1>
          <p className="text-xs sm:text-sm text-stone-600 dark:text-stone-400 mt-0.5">
            أسئلة متجددة بالذكاء الاصطناعي حسب الصعوبة مع وسائل مساعدة ولوحة متصدرين مباشرة في Firebase.
          </p>
        </div>

        <button
          onClick={onNavigateToLeaderboard}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-300/50 hover:bg-amber-500/20 text-xs font-semibold transition-colors self-start sm:self-auto"
        >
          <Trophy className="w-4 h-4 text-amber-600" />
          <span>لوحة المتصدرين (Firebase)</span>
        </button>
      </div>

      {/* Quick rescue-the-seedling game now lives in the games area, not the home page */}
      {!selectedGame && <MurshidQuickGame />}

      {/* Featured Murshid's Agricultural Adventures Card */}
      {!selectedGame && onOpenMurshidAdventures && (
        <div className="rounded-3xl bg-gradient-to-l from-emerald-900 via-teal-900 to-[#0e1936] text-white p-5 sm:p-6 border border-emerald-400/35 shadow-md flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <MurshidCharacterSvg expression="welcome" className="w-20 h-24 shrink-0" />
            <div className="space-y-1">
              <div className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
                <Sparkles className="w-4 h-4" />
                <span>لعبة تعليمية خفيفة وسريعة · 5 مراحل تفاعلية</span>
              </div>
              <h2 className="text-lg sm:text-xl font-extrabold">مغامرات مرشد الزراعية</h2>
              <p className="text-xs text-slate-200 max-w-xl">
                رافق الشخصية العُمانية «مرشد» في تحدي التعرف على النباتات، إنقاذ النبتة، صيد الآفات، ترتيب مراحل الزراعة، واختبار الذكاء الزراعي بالصوت العربي!
              </p>
            </div>
          </div>
          <button
            onClick={onOpenMurshidAdventures}
            className="min-h-[46px] px-5 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-extrabold text-xs sm:text-sm shadow-md shrink-0 whitespace-nowrap"
          >
            ابدأ مغامرات مرشد
          </button>
        </div>
      )}

      {/* AI Quiz Configuration Bar (when selecting a game) */}
      {!selectedGame && (
        <div className="bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-800 p-4 sm:p-5 shadow-sm space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h2 className="text-sm font-bold text-stone-900 dark:text-white flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-emerald-600" />
                <span>إعدادات تحدي الذكاء الاصطناعي (Gemini Quiz)</span>
              </h2>
              <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">
                اختر مستوى الصعوبة والمحور لتوليد أسئلة جديدة في كل جولة، أو استخدم البنك المحلي.
              </p>
            </div>

            {/* Source toggle */}
            <div className="flex items-center gap-1 p-1 rounded-xl bg-stone-100 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 self-start">
              <button
                type="button"
                onClick={() => setUseAiQuestions(true)}
                className={`min-h-[44px] px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                  useAiQuestions
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'text-stone-600 dark:text-stone-300'
                }`}
              >
                أسئلة متجددة (Gemini AI)
              </button>
              <button
                type="button"
                onClick={() => setUseAiQuestions(false)}
                className={`min-h-[44px] px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                  !useAiQuestions
                    ? 'bg-white dark:bg-stone-900 text-stone-900 dark:text-white shadow-sm'
                    : 'text-stone-600 dark:text-stone-300'
                }`}
              >
                البنك المحلي السريع
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Difficulty Selector */}
            <div>
              <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1.5">
                مستوى الصعوبة والنقاط:
              </label>
              <div className="grid grid-cols-3 gap-2">
                {(
                  [
                    { id: 'easy', label: 'مبتدئ', pts: '40 نقطة' },
                    { id: 'medium', label: 'متوسط', pts: '60 نقطة' },
                    { id: 'hard', label: 'خبير', pts: '85 نقطة' },
                  ] as const
                ).map((d) => (
                  <button
                    key={d.id}
                    type="button"
                    onClick={() => setDifficulty(d.id)}
                    className={`p-2 rounded-xl border text-center transition-all ${
                      difficulty === d.id
                        ? 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-500 text-emerald-800 dark:text-emerald-300'
                        : 'bg-stone-50 dark:bg-stone-800/50 border-stone-200 dark:border-stone-700 text-stone-700 dark:text-stone-300'
                    }`}
                  >
                    <div className="text-xs font-bold">{d.label}</div>
                    <div className="text-[10px] text-stone-500 dark:text-stone-400">{d.pts}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Optional Focus Topic */}
            <div>
              <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1.5">
                تركيز موضوعي اختياري (عند تفعيل Gemini AI):
              </label>
              <input
                type="text"
                value={topicFocus}
                onChange={(e) => setTopicFocus(e.target.value)}
                disabled={!useAiQuestions}
                placeholder="مثال: النخيل العماني، الري بالأفلاج، البيوت المحمية، الجبل الأخضر..."
                className="w-full px-3 py-2.5 text-xs rounded-xl bg-stone-50 dark:bg-stone-800 border border-stone-300 dark:border-stone-700 text-stone-900 dark:text-white focus:ring-1 focus:ring-emerald-500 disabled:opacity-50"
              />
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      {!selectedGame ? (
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
                    <div
                      className={`w-11 h-11 rounded-xl bg-gradient-to-br ${g.gradient} text-white flex items-center justify-center shadow-sm`}
                    >
                      <Icon className="w-5 h-5" />
                    </div>
                    <span className="text-[11px] font-semibold text-stone-500 dark:text-stone-400">
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
                    {useAiQuestions ? 'توليد AI · 5 أسئلة' : 'البنك المحلي'}
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
      ) : loadingQuestions ? (
        <div className="bg-white dark:bg-stone-900 rounded-3xl border border-stone-200 dark:border-stone-800 p-12 text-center space-y-3">
          <Loader2 className="w-10 h-10 animate-spin text-emerald-600 mx-auto" />
          <h2 className="text-base font-bold text-stone-900 dark:text-white">
            جاري إعداد 5 أسئلة متجددة عبر Gemini...
          </h2>
          <p className="text-xs text-stone-500 dark:text-stone-400">
            يتم الآن صياغة أسئلة علمية وعُمانية بمستوى الصعوبة المختار وتسجيلها على الخادم لمنع الغش.
          </p>
        </div>
      ) : gameFinished ? (
        <div className="bg-white dark:bg-stone-900 rounded-3xl border border-stone-200 dark:border-stone-800 p-6 sm:p-8 text-center max-w-xl mx-auto shadow-sm space-y-6">
          <MurshidCharacterSvg
            expression={verifiedResult && verifiedResult.correctCount > 0 ? 'celebrate' : 'encourage'}
            isSpeaking={murshidSpeaking}
            className="w-24 h-28 mx-auto"
          />

          <div>
            <h2 className="text-2xl font-bold text-stone-900 dark:text-white">
              اكتملت الجولة بنجاح!
            </h2>
            <p className="text-xs text-stone-500 dark:text-stone-400 mt-1">
              تم التحقق من جميع الإجابات على الخادم واعتماد النقاط بدقة
            </p>
          </div>

          {submittingToServer ? (
            <div className="p-4 rounded-xl bg-stone-50 dark:bg-stone-800 text-xs text-stone-600 dark:text-stone-300 flex items-center justify-center gap-2">
              <Clock className="w-4 h-4 animate-spin text-emerald-600" />
              <span>جاري التحقق من إجاباتك واعتماد النقاط...</span>
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
                    مكافأة التتابع
                  </span>
                  <span className="text-2xl font-black text-amber-800 dark:text-amber-300 font-mono">
                    +{verifiedResult.streakBonus}
                  </span>
                </div>
              </div>

              {/* Firebase Leaderboard Sync Status */}
              {firebaseSyncStatus === 'synced' ? (
                <div className="text-xs text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 p-3 rounded-xl border border-emerald-200 dark:border-emerald-800 flex items-center justify-center gap-2">
                  <CloudCheck className="w-4 h-4 shrink-0" />
                  <span>
                    تم تسجيل نقاطك مباشرة في لوحة المتصدرين على <strong>Firebase</strong> باسم {fbUser?.displayName || user.name}!
                  </span>
                </div>
              ) : firebaseSyncStatus === 'syncing' ? (
                <div className="text-xs text-stone-500 p-2">
                  جاري مزامنة النقاط مع لوحة Firebase...
                </div>
              ) : (
                <div className="text-xs text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-800/60 p-3 rounded-xl border border-slate-200 dark:border-slate-700">
                  تم اعتماد نتيجة الجولة على لوحة التطبيق. لا يلزم تسجيل الدخول للمشاركة أو جمع النقاط.
                </div>
              )}
            </div>
          ) : serverError ? (
            <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-red-700 text-xs">
              {serverError}
            </div>
          ) : null}

          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <button
              type="button"
              onClick={() => {
                const gameTitle =
                  GAMES_CATALOG.find((g) => g.key === selectedGame)?.title || 'التحدي الزراعي';
                const earned = verifiedResult?.verifiedScore ?? 0;
                const correctCount = verifiedResult?.correctCount ?? 0;
                const totalQ = verifiedResult?.totalQuestions ?? currentQuestions.length;
                openShare({
                  kind: 'achievement',
                  title: `حققت +${earned} نقطة في ${gameTitle}!`,
                  summary: `أتممت تحدي «${gameTitle}» بإجابة صحيحة على ${correctCount} من أصل ${totalQ} أسئلة في تطبيق صديق المزارع الذكي.`,
                  highlights: [
                    `النقاط المعتمدة: +${earned}`,
                    `الإجابات الصحيحة: ${correctCount}/${totalQ}`,
                    verifiedResult?.streakBonus
                      ? `مكافأة التتابع: +${verifiedResult.streakBonus}`
                      : 'تحدي المعرفة الزراعية العُمانية',
                  ],
                  categoryLabel: 'التحديات والمسابقات الزراعية',
                  badgeMetric: `+${earned} نقطة`,
                  locationLabel: `${user.governorate} · ${user.wilayat}`,
                  page: 'games',
                  authorOrSource: user.name,
                });
              }}
              className="min-h-[44px] px-5 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs flex items-center gap-2 shadow-md whitespace-nowrap shrink-0"
            >
              <Share2 className="w-4 h-4" />
              <span>مشاركة النتيجة</span>
            </button>
            <button
              onClick={() => handleStartGame(selectedGame)}
              className="min-h-[44px] px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-2 shadow-md whitespace-nowrap shrink-0"
            >
              <RotateCcw className="w-4 h-4" />
              <span>جولة جديدة</span>
            </button>
            <button
              onClick={() => setSelectedGame(null)}
              className="min-h-[44px] px-5 py-2.5 rounded-xl bg-stone-200 dark:bg-stone-800 hover:bg-stone-300 dark:hover:bg-stone-700 text-stone-800 dark:text-stone-200 text-xs font-semibold whitespace-nowrap shrink-0"
            >
              اختيار لعبة أخرى
            </button>
            <button
              onClick={onNavigateToLeaderboard}
              className="min-h-[44px] px-5 py-2.5 rounded-xl border border-amber-400 text-amber-700 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/30 text-xs font-bold whitespace-nowrap shrink-0"
            >
              عرض الترتيب العام
            </button>
          </div>
        </div>
      ) : curQuestion ? (
        <div className="bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-800 p-5 sm:p-7 shadow-sm space-y-5">
          {/* Top Bar */}
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-stone-100 dark:border-stone-800 pb-3">
            <div className="flex items-center gap-2 text-xs">
              <button
                onClick={() => setSelectedGame(null)}
                className="text-stone-500 hover:text-stone-900 dark:hover:text-white"
              >
                خروج للقائمة
              </button>
              <span className="text-stone-300">·</span>
              <span className="font-bold text-emerald-700 dark:text-emerald-400">
                {GAMES_CATALOG.find((g) => g.key === selectedGame)?.title}
              </span>
              <span className="text-stone-300">·</span>
              <span className="text-[11px] text-stone-500">
                {questionSource === 'gemini' ? 'أسئلة Gemini AI' : 'بنك الأسئلة'}
              </span>
            </div>

            <div className="flex items-center gap-3 text-xs font-semibold">
              {streak > 1 && (
                <div className="flex items-center gap-1 text-amber-600 dark:text-amber-400">
                  <Flame className="w-4 h-4 fill-current" />
                  <span>تتابع x{streak}</span>
                </div>
              )}

              <div
                className={`flex items-center gap-1 font-mono px-2.5 py-1 rounded-lg ${
                  timeLeft <= 5
                    ? 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300'
                    : 'bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300'
                }`}
              >
                <Clock className="w-3.5 h-3.5" />
                <span>{timeLeft} ث</span>
              </div>

              <button
                type="button"
                onClick={() => setMurshidMuted(!isMuted)}
                className="min-h-[36px] min-w-[36px] flex items-center justify-center rounded-lg bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-200 hover:bg-stone-200 dark:hover:bg-stone-700"
                title={isMuted ? 'تشغيل صوت مرشد' : 'كتم صوت مرشد'}
                aria-label={isMuted ? 'تشغيل الصوت' : 'كتم الصوت'}
              >
                {isMuted ? (
                  <VolumeX className="w-4 h-4 text-rose-500" />
                ) : (
                  <Volume2 className="w-4 h-4 text-emerald-600" />
                )}
              </button>

              <span className="text-stone-500 font-mono">
                {currentQIndex + 1} / {currentQuestions.length}
              </span>
            </div>
          </div>

          {/* Progress bar */}
          <div className="w-full h-1.5 bg-stone-100 dark:bg-stone-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-emerald-600 transition-all duration-300"
              style={{
                width: `${((currentQIndex + (isAnswerSubmitted ? 1 : 0)) / currentQuestions.length) * 100}%`,
              }}
            />
          </div>

          {/* Live Murshid Companion Bar */}
          <div className="flex items-center justify-between gap-3 p-3 rounded-2xl bg-emerald-50/70 dark:bg-[#0e1936] border border-emerald-200/70 dark:border-sky-300/15">
            <div className="flex items-center gap-3 min-w-0">
              <MurshidCharacterSvg
                expression={
                  isAnswerSubmitted
                    ? selectedOption === curQuestion.correctIndex
                      ? 'celebrate'
                      : 'gentle_sad'
                    : showHintForCurrent
                      ? 'explain'
                      : 'think'
                }
                isSpeaking={murshidSpeaking}
                className="w-14 h-16 shrink-0"
              />
              <div className="min-w-0 text-xs">
                <div className="font-bold text-emerald-700 dark:text-emerald-300">
                  مُرشد · مرافِق المسابقة
                </div>
                <p className="text-stone-700 dark:text-slate-200 leading-relaxed truncate sm:whitespace-normal">
                  {feedbackPhrase || 'اقرأ السؤال جيداً واختر الإجابة الأدق، أو اطلب تلميح مُرشد!'}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                if (murshidSpeaking) {
                  stopAllMurshidAudio(setMurshidSpeaking);
                  return;
                }
                speakMurshid(curQuestion.question, {
                  muted: isMuted,
                  onSpeakingChange: setMurshidSpeaking,
                });
              }}
              className={`min-h-[44px] px-3 py-2 rounded-xl border text-xs font-bold flex items-center gap-1.5 shrink-0 whitespace-nowrap transition-colors ${
                murshidSpeaking
                  ? 'bg-rose-600 text-white border-rose-600'
                  : 'bg-white dark:bg-[#132247] border-stone-200 dark:border-sky-300/20 text-emerald-700 dark:text-emerald-300 hover:border-emerald-500'
              }`}
            >
              {murshidSpeaking ? (
                <>
                  <Square className="w-3.5 h-3.5 fill-current" />
                  <span className="hidden sm:inline">إيقاف القراءة</span>
                </>
              ) : (
                <>
                  <Volume2 className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">قراءة السؤال</span>
                </>
              )}
            </button>
          </div>

          {/* Lifelines */}
          <div className="flex flex-wrap items-center gap-2">
            {curQuestion.options.length >= 4 && (
              <button
                type="button"
                disabled={fiftyUsed || isAnswerSubmitted}
                onClick={handleUseFiftyFifty}
                className="min-h-[44px] px-3 py-1.5 rounded-lg border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800/70 text-xs font-semibold text-stone-700 dark:text-stone-200 hover:border-emerald-500 disabled:opacity-40 flex items-center gap-1.5"
              >
                <Scissors className="w-3.5 h-3.5 text-emerald-600" />
                <span>حذف إجابتين (50/50)</span>
              </button>
            )}
            <button
              type="button"
              disabled={hintUsed || isAnswerSubmitted}
              onClick={handleUseHint}
              className="min-h-[44px] px-3 py-1.5 rounded-lg border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800/70 text-xs font-semibold text-stone-700 dark:text-stone-200 hover:border-amber-500 disabled:opacity-40 flex items-center gap-1.5"
            >
              <Lightbulb className="w-3.5 h-3.5 text-amber-500" />
              <span>تلميح مُرشد</span>
            </button>
          </div>

          {/* Hint Box if activated */}
          {showHintForCurrent && (
            <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-xs text-amber-900 dark:text-amber-200 flex items-start gap-2">
              <Lightbulb className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <span>
                {curQuestion.hint || 'فكّر في طبيعة المناخ والزراعة في سلطنة عُمان.'}
              </span>
            </div>
          )}

          {/* Question */}
          <div className="space-y-4">
            <div className="text-base sm:text-lg font-bold text-stone-900 dark:text-white leading-relaxed">
              {curQuestion.question}
            </div>

            <div className="space-y-2.5">
              {curQuestion.options.map((option, optIdx) => {
                const isEliminated = eliminatedOptions.includes(optIdx);
                const isSelected = selectedOption === optIdx;
                const isCorrect = optIdx === curQuestion.correctIndex;

                let optionClass =
                  'bg-stone-50 dark:bg-stone-800/60 border-stone-200 dark:border-stone-700 hover:border-emerald-500 text-stone-800 dark:text-stone-200';

                if (isEliminated && !isAnswerSubmitted) {
                  optionClass =
                    'opacity-30 line-through bg-stone-100 dark:bg-stone-900 border-stone-200 dark:border-stone-800 cursor-not-allowed';
                } else if (isAnswerSubmitted) {
                  if (isCorrect) {
                    optionClass =
                      'bg-emerald-100 dark:bg-emerald-950/80 border-emerald-500 text-emerald-950 dark:text-emerald-200 font-bold';
                  } else if (isSelected && !isCorrect) {
                    optionClass =
                      'bg-red-100 dark:bg-red-950/80 border-red-500 text-red-950 dark:text-red-200';
                  } else {
                    optionClass = 'opacity-50 border-stone-200 dark:border-stone-800';
                  }
                }

                return (
                  <button
                    key={optIdx}
                    disabled={isAnswerSubmitted || isEliminated}
                    onClick={() => handleAnswerOption(optIdx)}
                    className={`w-full min-h-[48px] p-3.5 rounded-xl border text-right text-xs sm:text-sm transition-all flex items-center justify-between ${optionClass}`}
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

            {isAnswerSubmitted && (
              <div className="p-3.5 rounded-xl bg-stone-100 dark:bg-stone-800/80 border border-stone-200 dark:border-stone-700 text-xs text-stone-700 dark:text-stone-300">
                <span className="font-bold text-emerald-700 dark:text-emerald-400 block mb-0.5">
                  الشرح والتوضيح الزراعي:
                </span>
                {curQuestion.explanation}
              </div>
            )}

            {isAnswerSubmitted && (
              <div className="pt-2 flex justify-end">
                <button
                  onClick={handleNextQuestion}
                  className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-2 shadow-md transition-all"
                >
                  <span>
                    {currentQIndex + 1 < currentQuestions.length
                      ? 'السؤال التالي'
                      : 'اعتماد وإنهاء التحدي'}
                  </span>
                  <ChevronLeft className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
};

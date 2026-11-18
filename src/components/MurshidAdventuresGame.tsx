import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import confetti from 'canvas-confetti';
import {
  ArrowRight,
  Award,
  CheckCircle2,
  Clock,
  Gamepad2,
  Lock,
  Play,
  RotateCcw,
  Sparkles,
  Star,
  Volume2,
  VolumeX,
  ArrowUp,
  ArrowDown,
  Trophy,
  RefreshCw,
  Share2,
} from 'lucide-react';
import { UserProfile } from '../types/index.ts';
import { useShare } from '../context/ShareContext.tsx';
import {
  ADVENTURE_STAGES,
  AdventureStageId,
  CARE_TOOLS,
  CareToolKey,
  MURSHID_QUIZ_QUESTIONS,
  ORDER_ROUNDS,
  OrderStepItem,
  PEST_ENTITIES,
  PestEntityDef,
  PLANT_ID_CHALLENGES,
  SAVE_PLANT_CHALLENGES,
  StageMeta,
} from '../data/murshidAdventureData.ts';
import { MurshidCharacterSvg, MurshidMood } from './MurshidCharacterSvg.tsx';
import { MURSHID_PHRASES, pickFreshPhrase } from '../data/murshidDialogue.ts';
import { MurshidPlantIllustration } from './MurshidPlantIllustrations.tsx';
import {
  getMurshidAudioPrefs,
  playGentleErrorSfx,
  playPestPopSfx,
  playSuccessSfx,
  playTapSfx,
  playVictorySfx,
  playWaterSfx,
  setMurshidMuted,
  setMurshidVolume,
  speakMurshid,
  stopMurshidSpeech,
  subscribeMurshidAudioPrefs,
} from '../utils/murshidAudio.ts';

interface MurshidAdventuresGameProps {
  user: UserProfile;
  onScoreUpdated: (addedScore: number) => void;
  onBackToGames?: () => void;
}

interface StageProgressEntry {
  stars: number; // 0..3
  bestScore: number;
  completed: boolean;
}

interface SavedProgress {
  stages: Partial<Record<AdventureStageId, StageProgressEntry>>;
  totalEarnedPoints: number;
  soundMuted: boolean;
  soundVolume: number; // 0..100
}

const PROGRESS_STORAGE_KEY = 'sadiq_murshid_adventures_progress_v1';

const DEFAULT_PROGRESS: SavedProgress = {
  stages: {},
  totalEarnedPoints: 0,
  soundMuted: false,
  soundVolume: 80,
};

function loadProgress(): SavedProgress {
  try {
    const raw = localStorage.getItem(PROGRESS_STORAGE_KEY);
    if (!raw) return DEFAULT_PROGRESS;
    const parsed = JSON.parse(raw);
    return {
      stages: parsed?.stages && typeof parsed.stages === 'object' ? parsed.stages : {},
      totalEarnedPoints: Number(parsed?.totalEarnedPoints || 0),
      soundMuted: Boolean(parsed?.soundMuted),
      soundVolume:
        typeof parsed?.soundVolume === 'number'
          ? Math.max(0, Math.min(100, parsed.soundVolume))
          : 80,
    };
  } catch {
    return DEFAULT_PROGRESS;
  }
}

function shuffleArray<T>(items: T[]): T[] {
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

interface ActiveBugTile {
  uid: string;
  slotIndex: number;
  entity: PestEntityDef;
  expiresAt: number;
}

export const MurshidAdventuresGame: React.FC<MurshidAdventuresGameProps> = ({
  user,
  onScoreUpdated,
  onBackToGames,
}) => {
  const { openShare } = useShare();
  const [progress, setProgress] = useState<SavedProgress>(() => loadProgress());
  const [activeStageId, setActiveStageId] = useState<AdventureStageId | null>(null);
  const [phase, setPhase] = useState<'map' | 'playing' | 'summary'>('map');

  // Audio & Companion state (synced globally with murshidAudio coordinator)
  const [muted, setMuted] = useState<boolean>(() => getMurshidAudioPrefs().muted || loadProgress().soundMuted);
  const [volume, setVolume] = useState<number>(() => getMurshidAudioPrefs().volume ?? loadProgress().soundVolume);
  const [isSpeaking, setIsSpeaking] = useState<boolean>(false);
  const [murshidMood, setMurshidMood] = useState<MurshidMood>('welcome');
  const [murshidMessage, setMurshidMessage] = useState<string>(
    `أهلاً يا ${user.name.split(' ')[0]}! أنا مرشد، صديقك في المزرعة العُمانية. اختر المرحلة الأولى لنبدأ المغامرة!`
  );

  // Common gameplay state
  const [stageScore, setStageScore] = useState<number>(0);
  const [timeLeft, setTimeLeft] = useState<number>(45);
  const [summaryData, setSummaryData] = useState<{
    stage: StageMeta;
    score: number;
    stars: number;
    passed: boolean;
    messageAr: string;
    pointsSynced: number;
  } | null>(null);

  // Stage 1: Plant ID state
  const [plantDeck, setPlantDeck] = useState(() => PLANT_ID_CHALLENGES.slice(0, 4));
  const [plantIdx, setPlantIdx] = useState<number>(0);
  const [plantSelected, setPlantSelected] = useState<string | null>(null);
  const [plantAnswered, setPlantAnswered] = useState<boolean>(false);

  // Stage 2: Save Plant state
  const [saveIdx, setSaveIdx] = useState<number>(0);
  const [saveHealed, setSaveHealed] = useState<boolean>(false);
  const [saveWrongTool, setSaveWrongTool] = useState<CareToolKey | null>(null);

  // Stage 3: Pest Hunt state
  const [pestScore, setPestScore] = useState<number>(0);
  const [pestsCaught, setPestsCaught] = useState<number>(0);
  const [activeTiles, setActiveTiles] = useState<ActiveBugTile[]>([]);
  const [tilePopText, setTilePopText] = useState<Record<number, { text: string; ok: boolean }>>({});

  // Stage 4: Order Steps state
  const [orderRoundIdx, setOrderRoundIdx] = useState<number>(0);
  const [orderedSteps, setOrderedSteps] = useState<OrderStepItem[]>([]);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [orderChecked, setOrderChecked] = useState<'none' | 'right' | 'wrong'>('none');

  // Stage 5: Agri Quiz state
  const [quizIdx, setQuizIdx] = useState<number>(0);
  const [quizStreak, setQuizStreak] = useState<number>(0);
  const [quizSelected, setQuizSelected] = useState<number | null>(null);

  const stageTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const stageScoreRef = useRef<number>(0);
  const pestsCaughtRef = useRef<number>(0);
  const finishLockRef = useRef<boolean>(false);

  useEffect(() => {
    stageScoreRef.current = stageScore;
  }, [stageScore]);

  useEffect(() => {
    pestsCaughtRef.current = pestsCaught;
  }, [pestsCaught]);

  // Persist progress & audio prefs
  useEffect(() => {
    try {
      const next: SavedProgress = {
        ...progress,
        soundMuted: muted,
        soundVolume: volume,
      };
      localStorage.setItem(PROGRESS_STORAGE_KEY, JSON.stringify(next));
    } catch {
      // ignore storage errors
    }
  }, [progress, muted, volume]);

  const normalizedVol = Math.max(0, Math.min(1, volume / 100));

  const voiceSpeak = useCallback(
    (msg: string, mood: MurshidMood = 'happy') => {
      setMurshidMessage(msg);
      setMurshidMood(mood);
      speakMurshid(msg, {
        muted,
        volume: normalizedVol,
        onSpeakingChange: setIsSpeaking,
      });
    },
    [muted, normalizedVol]
  );

  // Sync bidirectionally with global murshidAudio preferences & clean up on unmount
  useEffect(() => {
    const unsub = subscribeMurshidAudioPrefs((prefs) => {
      setMuted(prefs.muted);
      setVolume(prefs.volume);
    });
    return () => {
      unsub();
      if (stageTimerRef.current) clearInterval(stageTimerRef.current);
      stopMurshidSpeech();
    };
  }, []);

  const totalStarsEarned = useMemo(() => {
    return ADVENTURE_STAGES.reduce((acc, st) => acc + (progress.stages[st.id]?.stars || 0), 0);
  }, [progress.stages]);

  const isStageUnlocked = useCallback(
    (idx: number) => {
      if (idx === 0) return true;
      const prevStage = ADVENTURE_STAGES[idx - 1];
      return Boolean(progress.stages[prevStage.id]?.completed);
    },
    [progress.stages]
  );

  const completeStage = useCallback(
    (stageId: AdventureStageId, finalScore: number, forcedPass?: boolean) => {
      if (finishLockRef.current) return;
      finishLockRef.current = true;

      if (stageTimerRef.current) {
        clearInterval(stageTimerRef.current);
        stageTimerRef.current = null;
      }

      const meta = ADVENTURE_STAGES.find((s) => s.id === stageId)!;
      const ratio = Math.min(1, Math.max(0, finalScore / meta.maxPoints));
      let stars = 0;
      if (forcedPass === false) {
        stars = ratio >= 0.45 ? 1 : 0;
      } else if (ratio >= 0.85) {
        stars = 3;
      } else if (ratio >= 0.6) {
        stars = 2;
      } else if (ratio >= 0.35 || forcedPass) {
        stars = 1;
      }
      const passed = stars >= 1;

      const prevEntry = progress.stages[stageId];
      const prevBest = prevEntry?.bestScore || 0;
      const pointsDelta = finalScore > prevBest ? finalScore - prevBest : Math.min(15, Math.round(finalScore * 0.2));

      setProgress((prev) => ({
        ...prev,
        totalEarnedPoints: prev.totalEarnedPoints + pointsDelta,
        stages: {
          ...prev.stages,
          [stageId]: {
            stars: Math.max(prevEntry?.stars || 0, stars),
            bestScore: Math.max(prevBest, finalScore),
            completed: Boolean(prevEntry?.completed || passed),
          },
        },
      }));

      if (pointsDelta > 0) {
        onScoreUpdated(pointsDelta);
      }

      if (passed) {
        playVictorySfx(muted, normalizedVol);
        confetti({ particleCount: stars === 3 ? 85 : 45, spread: 68, origin: { y: 0.62 } });
        const winText =
          stars === 3
            ? `ما شاء الله! أداء باهر يا بطل! حصلت على 3 نجوم كاملة في ${meta.titleAr}!`
            : `أحسنت يا مزارع عُمان الذكي! اجتزت ${meta.titleAr} وحصدت ${stars} ${stars === 1 ? 'نجمة' : 'نجوم'}.`;
        voiceSpeak(winText, 'celebrate');
        setSummaryData({
          stage: meta,
          score: finalScore,
          stars,
          passed: true,
          messageAr: winText,
          pointsSynced: pointsDelta,
        });
      } else {
        playGentleErrorSfx(muted, normalizedVol);
        const retryText = `محاولة طيبة! حاول مرة أخرى في ${meta.titleAr} لتحصد النجوم وتفتح المرحلة التالية.`;
        voiceSpeak(retryText, 'encourage');
        setSummaryData({
          stage: meta,
          score: finalScore,
          stars: 0,
          passed: false,
          messageAr: retryText,
          pointsSynced: pointsDelta,
        });
      }

      setPhase('summary');
    },
    [muted, normalizedVol, onScoreUpdated, progress.stages, voiceSpeak]
  );

  const startStage = useCallback(
    (stageId: AdventureStageId) => {
      const meta = ADVENTURE_STAGES.find((s) => s.id === stageId);
      if (!meta) return;

      if (stageTimerRef.current) clearInterval(stageTimerRef.current);
      finishLockRef.current = false;
      playTapSfx(muted, normalizedVol);

      setActiveStageId(stageId);
      setStageScore(0);
      stageScoreRef.current = 0;
      setTimeLeft(meta.durationSec);
      setSummaryData(null);
      setPhase('playing');

      if (stageId === 'plant_id') {
        const picked = shuffleArray(PLANT_ID_CHALLENGES).slice(0, 4);
        setPlantDeck(picked);
        setPlantIdx(0);
        setPlantSelected(null);
        setPlantAnswered(false);
        voiceSpeak(`${meta.introVoiceAr} ${picked[0].clueAr}`, 'welcome');
      } else if (stageId === 'save_plant') {
        setSaveIdx(0);
        setSaveHealed(false);
        setSaveWrongTool(null);
        voiceSpeak(`${meta.introVoiceAr} ${SAVE_PLANT_CHALLENGES[0].symptomTitleAr}`, 'surprised');
      } else if (stageId === 'pest_hunt') {
        setPestScore(0);
        setPestsCaught(0);
        pestsCaughtRef.current = 0;
        setActiveTiles([]);
        setTilePopText({});
        voiceSpeak(meta.introVoiceAr, 'explain');
      } else if (stageId === 'order_steps') {
        setOrderRoundIdx(0);
        let shuffled = shuffleArray(ORDER_ROUNDS[0].steps);
        if (shuffled.every((s, idx) => s.stepNumber === idx + 1)) {
          shuffled = [shuffled[1], shuffled[0], shuffled[3], shuffled[2]];
        }
        setOrderedSteps(shuffled);
        setOrderChecked('none');
        voiceSpeak(ORDER_ROUNDS[0].voicePromptAr, 'think');
      } else if (stageId === 'agri_quiz') {
        setQuizIdx(0);
        setQuizStreak(0);
        setQuizSelected(null);
        voiceSpeak(`${meta.introVoiceAr} ${MURSHID_QUIZ_QUESTIONS[0]?.questionAr || ''}`, 'think');
      }
    },
    [muted, normalizedVol, voiceSpeak]
  );

  // Countdown timer during active gameplay
  useEffect(() => {
    if (phase !== 'playing' || !activeStageId) return;
    if (stageTimerRef.current) clearInterval(stageTimerRef.current);

    stageTimerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          if (stageTimerRef.current) {
            clearInterval(stageTimerRef.current);
            stageTimerRef.current = null;
          }
          const finalSc = activeStageId === 'pest_hunt' ? Math.max(0, stageScoreRef.current) : stageScoreRef.current;
          completeStage(activeStageId, finalSc);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (stageTimerRef.current) {
        clearInterval(stageTimerRef.current);
        stageTimerRef.current = null;
      }
    };
  }, [phase, activeStageId, completeStage]);

  // Stage 3 Spawner loop (Pest Hunt)
  useEffect(() => {
    if (phase !== 'playing' || activeStageId !== 'pest_hunt') return;

    const spawnTick = () => {
      const now = Date.now();
      setActiveTiles((prev) => {
        const alive = prev.filter((t) => t.expiresAt > now);
        if (alive.length >= 4) return alive;

        const usedSlots = new Set(alive.map((t) => t.slotIndex));
        const freeSlots = [0, 1, 2, 3, 4, 5, 6, 7, 8].filter((s) => !usedSlots.has(s));
        if (freeSlots.length === 0) return alive;

        const slot = freeSlots[Math.floor(Math.random() * freeSlots.length)];
        // 72% harmful pest, 28% beneficial bee/ladybug
        const harmfulPool = PEST_ENTITIES.filter((e) => e.isHarmful);
        const friendlyPool = PEST_ENTITIES.filter((e) => !e.isHarmful);
        const pickHarmful = Math.random() < 0.72;
        const entity = pickHarmful
          ? harmfulPool[Math.floor(Math.random() * harmfulPool.length)]
          : friendlyPool[Math.floor(Math.random() * friendlyPool.length)];

        return [
          ...alive,
          {
            uid: `${now}-${slot}-${Math.random().toString(36).slice(2, 6)}`,
            slotIndex: slot,
            entity,
            expiresAt: now + (pickHarmful ? 2500 : 2100),
          },
        ];
      });
    };

    spawnTick();
    const interval = setInterval(spawnTick, 720);
    return () => clearInterval(interval);
  }, [phase, activeStageId]);

  const handleReturnToMap = () => {
    if (stageTimerRef.current) {
      clearInterval(stageTimerRef.current);
      stageTimerRef.current = null;
    }
    stopMurshidSpeech(setIsSpeaking);
    setActiveStageId(null);
    setPhase('map');
    setMurshidMood('welcome');
    setMurshidMessage('اختر أي مرحلة مفتوحة لتلعب وتجمع المزيد من النجوم!');
  };

  // --- Stage 1 Handler ---
  const handleSelectPlantOption = (option: string) => {
    if (plantAnswered) return;
    const current = plantDeck[plantIdx];
    if (!current) return;

    setPlantSelected(option);
    setPlantAnswered(true);

    const isRight = option === current.correctName;
    const nextScore = isRight ? stageScore + 25 : stageScore;
    if (isRight) {
      setStageScore(nextScore);
      stageScoreRef.current = nextScore;
      playSuccessSfx(muted, normalizedVol);
      const praise = pickFreshPhrase('adv-stage1-right', MURSHID_PHRASES.correct);
      voiceSpeak(`${praise} ${current.successFactAr}`, 'celebrate');
    } else {
      playGentleErrorSfx(muted, normalizedVol);
      const gentle = pickFreshPhrase('adv-stage1-wrong', MURSHID_PHRASES.wrongGentle);
      voiceSpeak(`${gentle} الإجابة الصحيحة هي: ${current.correctName}.`, 'gentle_sad');
    }

    setTimeout(() => {
      if (plantIdx + 1 < plantDeck.length) {
        const nextChallenge = plantDeck[plantIdx + 1];
        setPlantIdx((p) => p + 1);
        setPlantSelected(null);
        setPlantAnswered(false);
        voiceSpeak(nextChallenge.clueAr, 'think');
      } else {
        completeStage('plant_id', nextScore);
      }
    }, 1500);
  };

  // --- Stage 2 Handler ---
  const handleSelectCareTool = (toolKey: CareToolKey) => {
    if (saveHealed) return;
    const current = SAVE_PLANT_CHALLENGES[saveIdx];
    if (!current) return;

    if (toolKey === current.correctTool) {
      setSaveHealed(true);
      setSaveWrongTool(null);
      const nextScore = stageScore + 30;
      setStageScore(nextScore);
      stageScoreRef.current = nextScore;

      if (toolKey === 'water') {
        playWaterSfx(muted, normalizedVol);
      } else {
        playSuccessSfx(muted, normalizedVol);
      }
      voiceSpeak(current.successMsgAr, 'celebrate');

      setTimeout(() => {
        if (saveIdx + 1 < SAVE_PLANT_CHALLENGES.length) {
          const nextItem = SAVE_PLANT_CHALLENGES[saveIdx + 1];
          setSaveIdx((p) => p + 1);
          setSaveHealed(false);
          setSaveWrongTool(null);
          voiceSpeak(nextItem.symptomTitleAr, 'think');
        } else {
          completeStage('save_plant', nextScore, true);
        }
      }, 1550);
    } else {
      setSaveWrongTool(toolKey);
      playGentleErrorSfx(muted, normalizedVol);
      voiceSpeak(`ليست الأداة المناسبة هذه المرة! فكّر في الأعراض: ${current.symptomDescAr}`, 'gentle_sad');
    }
  };

  // --- Stage 3 Handler ---
  const handleTapTile = (slotIndex: number) => {
    const tile = activeTiles.find((t) => t.slotIndex === slotIndex);
    if (!tile) return;

    setActiveTiles((prev) => prev.filter((t) => t.uid !== tile.uid));

    if (tile.entity.isHarmful) {
      const nextScore = Math.min(140, stageScore + tile.entity.points);
      const nextCaught = pestsCaught + 1;
      setStageScore(nextScore);
      setPestScore(nextScore);
      stageScoreRef.current = nextScore;
      setPestsCaught(nextCaught);
      pestsCaughtRef.current = nextCaught;

      playPestPopSfx(muted, normalizedVol);
      setTilePopText((prev) => ({ ...prev, [slotIndex]: { text: `+${tile.entity.points}`, ok: true } }));
      if (nextCaught === 4) {
        setMurshidMood('encourage');
      }

      if (nextCaught >= 8) {
        setTimeout(() => {
          completeStage('pest_hunt', Math.max(nextScore, 120), true);
        }, 350);
      }
    } else {
      const nextScore = Math.max(0, stageScore + tile.entity.points);
      setStageScore(nextScore);
      setPestScore(nextScore);
      stageScoreRef.current = nextScore;
      playGentleErrorSfx(muted, normalizedVol);
      setTilePopText((prev) => ({ ...prev, [slotIndex]: { text: `${tile.entity.points}`, ok: false } }));
      voiceSpeak(`انتبه! هذه ${tile.entity.nameAr} صديقة للمزارع!`, 'surprised');
    }

    setTimeout(() => {
      setTilePopText((prev) => {
        const copy = { ...prev };
        delete copy[slotIndex];
        return copy;
      });
    }, 650);
  };

  // --- Stage 4 Handlers (Mobile Tap Swap + Desktop Drag-and-Drop) ---
  const moveStep = (idx: number, direction: -1 | 1) => {
    const target = idx + direction;
    if (target < 0 || target >= orderedSteps.length) return;
    playTapSfx(muted, normalizedVol);
    setOrderChecked('none');
    setOrderedSteps((prev) => {
      const copy = [...prev];
      [copy[idx], copy[target]] = [copy[target], copy[idx]];
      return copy;
    });
  };

  const handleDropStep = (dropIndex: number) => {
    if (dragIndex === null || dragIndex === dropIndex) return;
    playTapSfx(muted, normalizedVol);
    setOrderChecked('none');
    setOrderedSteps((prev) => {
      const copy = [...prev];
      const [moved] = copy.splice(dragIndex, 1);
      copy.splice(dropIndex, 0, moved);
      return copy;
    });
    setDragIndex(null);
  };

  const handleVerifyOrder = () => {
    const isCorrect = orderedSteps.every((step, idx) => step.stepNumber === idx + 1);
    if (isCorrect) {
      setOrderChecked('right');
      const nextScore = stageScore + 60;
      setStageScore(nextScore);
      stageScoreRef.current = nextScore;
      playSuccessSfx(muted, normalizedVol);
      voiceSpeak('ترتيب مثالي! هذا هو التسلسل الزراعي الصحيح.', 'celebrate');

      setTimeout(() => {
        if (orderRoundIdx + 1 < ORDER_ROUNDS.length) {
          const nextRound = ORDER_ROUNDS[orderRoundIdx + 1];
          let shuffled = shuffleArray(nextRound.steps);
          if (shuffled.every((s, i) => s.stepNumber === i + 1)) {
            shuffled = [shuffled[1], shuffled[0], shuffled[3], shuffled[2]];
          }
          setOrderRoundIdx((p) => p + 1);
          setOrderedSteps(shuffled);
          setOrderChecked('none');
          voiceSpeak(nextRound.voicePromptAr, 'think');
        } else {
          completeStage('order_steps', nextScore, true);
        }
      }, 1350);
    } else {
      setOrderChecked('wrong');
      playGentleErrorSfx(muted, normalizedVol);
      voiceSpeak('قريب جداً! فكّر في الخطوة التي نجهز بها التربة أولاً، ثم الغرس، ثم الرعاية، وأخيراً الحصاد.', 'gentle_sad');
    }
  };

  // --- Stage 5 Handler ---
  const handleSelectQuizOption = (optionIdx: number) => {
    if (quizSelected !== null) return;
    const current = MURSHID_QUIZ_QUESTIONS[quizIdx];
    if (!current) return;

    setQuizSelected(optionIdx);
    const isRight = optionIdx === current.correctIndex;
    let nextScore = stageScore;

    if (isRight) {
      const nextStreak = quizStreak + 1;
      setQuizStreak(nextStreak);
      nextScore = stageScore + 25 + (nextStreak >= 2 ? 5 : 0);
      setStageScore(nextScore);
      stageScoreRef.current = nextScore;
      playSuccessSfx(muted, normalizedVol);
      const praise = pickFreshPhrase('adv-stage5-right', MURSHID_PHRASES.correct);
      voiceSpeak(`${praise} ${current.explanationAr}`, 'celebrate');
    } else {
      setQuizStreak(0);
      playGentleErrorSfx(muted, normalizedVol);
      voiceSpeak(`المعلومة الصحيحة هي: ${current.options[current.correctIndex]}. ${current.explanationAr}`, 'gentle_sad');
    }

    setTimeout(() => {
      if (quizIdx + 1 < MURSHID_QUIZ_QUESTIONS.length) {
        const nextQuestion = MURSHID_QUIZ_QUESTIONS[quizIdx + 1];
        setQuizIdx((p) => p + 1);
        setQuizSelected(null);
        if (nextQuestion?.questionAr) {
          voiceSpeak(nextQuestion.questionAr, 'think');
        }
      } else {
        completeStage('agri_quiz', nextScore);
      }
    }, 1800);
  };

  const currentStageMeta = activeStageId
    ? ADVENTURE_STAGES.find((s) => s.id === activeStageId) || null
    : null;

  return (
    <div dir="rtl" className="max-w-4xl mx-auto space-y-4 overflow-x-hidden">
      {/* Compact Top Control & Audio Bar */}
      <div className="rounded-2xl bg-white dark:bg-[#132247] border border-emerald-200/80 dark:border-sky-300/15 p-3 sm:p-4 shadow-sm flex flex-wrap items-center justify-between gap-2.5">
        <div className="flex items-center gap-2 min-w-0">
          {phase !== 'map' ? (
            <button
              onClick={handleReturnToMap}
              className="min-h-[44px] px-3 py-2 rounded-xl bg-slate-100 dark:bg-white/10 hover:bg-slate-200 dark:hover:bg-white/20 text-slate-800 dark:text-white text-xs font-bold flex items-center gap-1.5 transition-colors shrink-0"
            >
              <ArrowRight className="w-4 h-4" />
              <span>المراحل</span>
            </button>
          ) : (
            onBackToGames && (
              <button
                onClick={onBackToGames}
                className="min-h-[44px] px-3 py-2 rounded-xl bg-slate-100 dark:bg-white/10 hover:bg-slate-200 dark:hover:bg-white/20 text-slate-800 dark:text-white text-xs font-bold flex items-center gap-1.5 transition-colors shrink-0"
              >
                <ArrowRight className="w-4 h-4" />
                <span>الألعاب</span>
              </button>
            )
          )}

          <div className="min-w-0">
            <h1 className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-white truncate flex items-center gap-1.5">
              <Gamepad2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <span>{currentStageMeta ? currentStageMeta.titleAr : 'مغامرات مرشد الزراعية'}</span>
            </h1>
            <p className="text-[11px] text-slate-500 dark:text-slate-300 truncate">
              {currentStageMeta ? currentStageMeta.badgeAr : 'مراحل تعليمية ممتعة مع الشخصية العُمانية مرشد'}
            </p>
          </div>
        </div>

        {/* Audio Controls + Replay + Score */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-[#0b1329] px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-sky-300/15">
            <button
              type="button"
              onClick={() => {
                const nextMuted = !muted;
                setMuted(nextMuted);
                setMurshidMuted(nextMuted);
                if (nextMuted) stopMurshidSpeech(setIsSpeaking);
              }}
              aria-label={muted ? 'تشغيل الصوت' : 'كتم الصوت'}
              className="min-h-[36px] min-w-[36px] flex items-center justify-center rounded-lg text-slate-700 dark:text-slate-200 hover:bg-white dark:hover:bg-white/10"
            >
              {muted || volume === 0 ? (
                <VolumeX className="w-4 h-4 text-rose-500" />
              ) : (
                <Volume2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              )}
            </button>
            <input
              type="range"
              min={0}
              max={100}
              value={muted ? 0 : volume}
              onChange={(e) => {
                const v = Number(e.target.value);
                setVolume(v);
                setMurshidVolume(v);
                if (v > 0 && muted) {
                  setMuted(false);
                  setMurshidMuted(false);
                }
              }}
              aria-label="مستوى الصوت"
              className="w-16 sm:w-20 accent-emerald-600 cursor-pointer"
            />
          </div>

          {phase === 'playing' && activeStageId && (
            <button
              type="button"
              onClick={() => startStage(activeStageId)}
              title="إعادة المرحلة"
              aria-label="إعادة المرحلة"
              className="min-h-[44px] px-2.5 py-1.5 rounded-xl bg-amber-500/15 text-amber-800 dark:text-amber-300 border border-amber-400/30 hover:bg-amber-500/25 text-xs font-bold flex items-center gap-1"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">إعادة</span>
            </button>
          )}

          <div className="px-3 py-2 rounded-xl bg-emerald-600/10 dark:bg-emerald-500/15 border border-emerald-500/25 text-emerald-800 dark:text-emerald-300 text-xs font-extrabold flex items-center gap-1.5 tabular-nums">
            <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
            <span>{totalStarsEarned}/15</span>
          </div>
        </div>
      </div>

      {/* Interactive Companion Strip (Always crisp & compact on mobile) */}
      <div className="rounded-2xl bg-gradient-to-l from-emerald-800 via-teal-800 to-[#0e1936] text-white p-3.5 sm:p-4 border border-emerald-400/25 shadow-md flex items-center gap-3 sm:gap-4">
        <MurshidCharacterSvg
          mood={murshidMood}
          isSpeaking={isSpeaking}
          className="w-20 h-22 sm:w-24 sm:h-26 shrink-0"
        />
        <div className="flex-1 min-w-0 space-y-2">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] font-bold text-amber-300 flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5" />
              <span>مرشد · رفيقك الزراعي</span>
            </span>
            {phase === 'playing' && (
              <div className="flex items-center gap-2 text-xs font-extrabold tabular-nums">
                <span className="px-2.5 py-1 rounded-lg bg-white/10 border border-white/15">
                  النقاط: {stageScore}
                </span>
                <span
                  className={`px-2.5 py-1 rounded-lg border flex items-center gap-1 ${
                    timeLeft <= 10
                      ? 'bg-rose-500/30 border-rose-300/60 text-rose-100 animate-pulse'
                      : 'bg-white/10 border-white/15'
                  }`}
                >
                  <Clock className="w-3.5 h-3.5" />
                  <span>{timeLeft}ث</span>
                </span>
              </div>
            )}
          </div>
          <p className="text-xs sm:text-sm font-medium text-emerald-50 leading-relaxed">
            «{murshidMessage}»
          </p>
          <button
            type="button"
            onClick={() => voiceSpeak(murshidMessage, murshidMood)}
            className="inline-flex items-center gap-1.5 text-[11px] font-bold text-amber-200 hover:text-amber-100 py-1"
          >
            <Volume2 className="w-3.5 h-3.5" />
            <span>استمع لصوت مرشد</span>
          </button>
        </div>
      </div>

      {/* PHASE 1: STAGE SELECTION MAP */}
      {phase === 'map' && (
        <div className="space-y-4">
          {/* Quick Stats Strip */}
          <div className="grid grid-cols-3 gap-2.5 sm:gap-3">
            <div className="rounded-2xl bg-white dark:bg-[#132247] border border-slate-200 dark:border-sky-300/15 p-3 text-center">
              <div className="text-[11px] text-slate-500 dark:text-slate-300">النجوم المجموعة</div>
              <div className="text-lg sm:text-xl font-black text-amber-500 tabular-nums mt-0.5">
                {totalStarsEarned} / 15 ★
              </div>
            </div>
            <div className="rounded-2xl bg-white dark:bg-[#132247] border border-slate-200 dark:border-sky-300/15 p-3 text-center">
              <div className="text-[11px] text-slate-500 dark:text-slate-300">المراحل المكتملة</div>
              <div className="text-lg sm:text-xl font-black text-emerald-600 dark:text-emerald-400 tabular-nums mt-0.5">
                {ADVENTURE_STAGES.filter((s) => progress.stages[s.id]?.completed).length} / 5
              </div>
            </div>
            <div className="rounded-2xl bg-white dark:bg-[#132247] border border-slate-200 dark:border-sky-300/15 p-3 text-center">
              <div className="text-[11px] text-slate-500 dark:text-slate-300">نقاط المغامرة</div>
              <div className="text-lg sm:text-xl font-black text-slate-900 dark:text-white tabular-nums mt-0.5">
                {progress.totalEarnedPoints}
              </div>
            </div>
          </div>

          {/* 5 Progressive Stages */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {ADVENTURE_STAGES.map((st, idx) => {
              const unlocked = isStageUnlocked(idx);
              const entry = progress.stages[st.id];
              const stars = entry?.stars || 0;

              return (
                <div
                  key={st.id}
                  className={`rounded-2xl border p-4 transition-all flex flex-col justify-between gap-3 ${
                    unlocked
                      ? 'bg-white dark:bg-[#132247] border-slate-200 dark:border-sky-300/20 shadow-sm hover:border-emerald-400'
                      : 'bg-slate-100/80 dark:bg-[#0e1936]/70 border-slate-200/70 dark:border-white/10 opacity-80'
                  }`}
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <span
                        className={`text-[11px] font-extrabold px-2.5 py-1 rounded-lg text-white bg-gradient-to-l ${st.accentGradient}`}
                      >
                        {st.badgeAr}
                      </span>
                      <div className="flex items-center gap-0.5">
                        {[1, 2, 3].map((n) => (
                          <Star
                            key={n}
                            className={`w-4 h-4 ${
                              n <= stars
                                ? 'text-amber-400 fill-amber-400'
                                : 'text-slate-300 dark:text-slate-600'
                            }`}
                          />
                        ))}
                      </div>
                    </div>

                    <h2 className="text-base font-extrabold text-slate-900 dark:text-white">
                      {st.order}. {st.titleAr}
                    </h2>
                    <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                      {st.subtitleAr}
                    </p>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-white/10">
                    <div className="text-[11px] text-slate-500 dark:text-slate-400 tabular-nums">
                      المدة: {st.durationSec}ث · أعلى نقاط: {entry?.bestScore || 0}
                    </div>

                    {unlocked ? (
                      <button
                        type="button"
                        onClick={() => startStage(st.id)}
                        className="min-h-[44px] px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-extrabold flex items-center gap-1.5 shadow-sm active:scale-[0.98]"
                      >
                        {entry?.completed ? (
                          <>
                            <RefreshCw className="w-3.5 h-3.5" />
                            <span>العب مجدداً</span>
                          </>
                        ) : (
                          <>
                            <Play className="w-3.5 h-3.5 fill-current" />
                            <span>ابدأ المرحلة</span>
                          </>
                        )}
                      </button>
                    ) : (
                      <div className="min-h-[44px] px-3 py-2 rounded-xl bg-slate-200 dark:bg-white/10 text-slate-600 dark:text-slate-300 text-[11px] font-bold flex items-center gap-1.5">
                        <Lock className="w-3.5 h-3.5" />
                        <span>أكمل المرحلة {idx}</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* PHASE 2: ACTIVE GAMEPLAY */}
      {phase === 'playing' && activeStageId === 'plant_id' && plantDeck[plantIdx] && (
        <div className="rounded-3xl bg-white dark:bg-[#132247] border border-slate-200 dark:border-sky-300/20 p-4 sm:p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between text-xs font-bold text-slate-500 dark:text-slate-300">
            <span>النبتة {plantIdx + 1} من {plantDeck.length}</span>
            <span>اختر الاسم الصحيح للنبات</span>
          </div>

          <div className="flex flex-col items-center justify-center py-2">
            <MurshidPlantIllustration
              plantKey={plantDeck[plantIdx].plantKey}
              condition="healthy"
              className="w-36 h-36 sm:w-44 sm:h-44"
            />
            <p className="mt-2 text-xs sm:text-sm font-medium text-emerald-800 dark:text-emerald-200 bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-700/40 rounded-xl px-4 py-2 text-center max-w-lg">
              تلميح: {plantDeck[plantIdx].clueAr}
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {plantDeck[plantIdx].options.map((opt) => {
              const isCorrect = opt === plantDeck[plantIdx].correctName;
              const isChosen = opt === plantSelected;
              let btnStyle =
                'bg-slate-50 dark:bg-[#0b1329] border-slate-200 dark:border-sky-300/20 text-slate-900 dark:text-white hover:border-emerald-500';
              if (plantAnswered) {
                if (isCorrect) {
                  btnStyle = 'bg-emerald-600 border-emerald-500 text-white shadow-md';
                } else if (isChosen) {
                  btnStyle = 'bg-amber-500/20 border-amber-500 text-amber-800 dark:text-amber-200';
                }
              }

              return (
                <button
                  key={opt}
                  type="button"
                  disabled={plantAnswered}
                  onClick={() => handleSelectPlantOption(opt)}
                  className={`min-h-[52px] px-4 py-3 rounded-2xl border-2 text-sm font-bold text-center transition-all active:scale-[0.98] ${btnStyle}`}
                >
                  {opt}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {phase === 'playing' && activeStageId === 'save_plant' && SAVE_PLANT_CHALLENGES[saveIdx] && (
        <div className="rounded-3xl bg-white dark:bg-[#132247] border border-slate-200 dark:border-sky-300/20 p-4 sm:p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between text-xs font-bold text-slate-500 dark:text-slate-300">
            <span>الحالة {saveIdx + 1} من {SAVE_PLANT_CHALLENGES.length}</span>
            <span>{SAVE_PLANT_CHALLENGES[saveIdx].plantNameAr}</span>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 py-2">
            <div className="relative">
              <MurshidPlantIllustration
                plantKey={SAVE_PLANT_CHALLENGES[saveIdx].plantKey}
                condition={saveHealed ? 'healthy' : SAVE_PLANT_CHALLENGES[saveIdx].condition}
                className="w-36 h-36 sm:w-44 sm:h-44"
              />
              {saveHealed && (
                <div className="mt-1 text-center text-xs font-extrabold text-emerald-600 dark:text-emerald-400 animate-bounce">
                  ✨ تعافت النبتة بنجاح!
                </div>
              )}
            </div>

            <div className="flex-1 max-w-md rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-700/40 p-4 space-y-1.5 text-center sm:text-start">
              <div className="text-sm font-extrabold text-amber-900 dark:text-amber-200">
                {saveHealed ? 'حالة ممتازة ونمو صحي!' : SAVE_PLANT_CHALLENGES[saveIdx].symptomTitleAr}
              </div>
              <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
                {saveHealed
                  ? SAVE_PLANT_CHALLENGES[saveIdx].successMsgAr
                  : SAVE_PLANT_CHALLENGES[saveIdx].symptomDescAr}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            {CARE_TOOLS.map((tool) => {
              const isSolvedTool = saveHealed && tool.key === SAVE_PLANT_CHALLENGES[saveIdx].correctTool;
              const isWrong = saveWrongTool === tool.key;
              return (
                <button
                  key={tool.key}
                  type="button"
                  disabled={saveHealed}
                  onClick={() => handleSelectCareTool(tool.key)}
                  className={`min-h-[72px] p-3 rounded-2xl border-2 flex flex-col items-center justify-center gap-1 transition-all active:scale-[0.97] ${
                    isSolvedTool
                      ? 'bg-emerald-600 border-emerald-500 text-white shadow-md'
                      : isWrong
                        ? 'bg-amber-500/20 border-amber-400 text-amber-900 dark:text-amber-200'
                        : 'bg-slate-50 dark:bg-[#0b1329] border-slate-200 dark:border-sky-300/20 hover:border-emerald-500 text-slate-900 dark:text-white'
                  }`}
                >
                  <span className="text-2xl">{tool.emoji}</span>
                  <span className="text-xs font-extrabold">{tool.labelAr}</span>
                  <span className="text-[10px] opacity-80">{tool.hintAr}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {phase === 'playing' && activeStageId === 'pest_hunt' && (
        <div className="rounded-3xl bg-white dark:bg-[#132247] border border-slate-200 dark:border-sky-300/20 p-4 sm:p-6 shadow-sm space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-bold">
            <span className="text-emerald-700 dark:text-emerald-300">
              الهدف: اصطياد ٨ آفات ضارة ({pestsCaught}/8)
            </span>
            <span className="text-amber-700 dark:text-amber-300">
              ⚠️ لا تضغط على النحلة 🐝 أو الدعسوقة 🐞!
            </span>
          </div>

          <div className="grid grid-cols-3 gap-2.5 sm:gap-3.5 max-w-md mx-auto">
            {[0, 1, 2, 3, 4, 5, 6, 7, 8].map((slot) => {
              const tile = activeTiles.find((t) => t.slotIndex === slot);
              const pop = tilePopText[slot];
              return (
                <button
                  key={slot}
                  type="button"
                  onClick={() => handleTapTile(slot)}
                  className={`relative min-h-[84px] sm:min-h-[96px] rounded-2xl border-2 flex flex-col items-center justify-center transition-all active:scale-95 select-none ${
                    tile
                      ? tile.entity.isHarmful
                        ? 'bg-rose-50 dark:bg-rose-950/40 border-rose-300 dark:border-rose-500/50 shadow-sm'
                        : 'bg-amber-50 dark:bg-amber-950/40 border-amber-300 dark:border-amber-500/50 shadow-sm'
                      : 'bg-emerald-50/70 dark:bg-[#0b1329] border-emerald-200/70 dark:border-sky-300/15'
                  }`}
                >
                  {tile ? (
                    <>
                      <span className="text-3xl sm:text-4xl animate-bounce">{tile.entity.emoji}</span>
                      <span className="text-[10px] font-bold text-slate-700 dark:text-slate-200 mt-1 px-1 truncate max-w-full">
                        {tile.entity.nameAr}
                      </span>
                    </>
                  ) : (
                    <span className="text-xl opacity-35">🌿</span>
                  )}

                  {pop && (
                    <span
                      className={`absolute top-1.5 left-1.5 text-xs font-black px-1.5 py-0.5 rounded-md ${
                        pop.ok ? 'bg-emerald-600 text-white' : 'bg-amber-500 text-slate-950'
                      }`}
                    >
                      {pop.text}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {phase === 'playing' && activeStageId === 'order_steps' && ORDER_ROUNDS[orderRoundIdx] && (
        <div className="rounded-3xl bg-white dark:bg-[#132247] border border-slate-200 dark:border-sky-300/20 p-4 sm:p-6 shadow-sm space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <div className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
                الجولة {orderRoundIdx + 1} من {ORDER_ROUNDS.length}
              </div>
              <h2 className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-white">
                {ORDER_ROUNDS[orderRoundIdx].titleAr}
              </h2>
            </div>
            <span className="text-[11px] text-slate-500 dark:text-slate-300">
              استخدم الأسهم ▲▼ أو اسحب البطاقات للترتيب
            </span>
          </div>

          <div className="space-y-2.5">
            {orderedSteps.map((step, idx) => {
              const isInRightSlot = orderChecked !== 'none' && step.stepNumber === idx + 1;
              return (
                <div
                  key={step.id}
                  draggable
                  onDragStart={() => setDragIndex(idx)}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={() => handleDropStep(idx)}
                  className={`min-h-[58px] p-3 rounded-2xl border-2 flex items-center justify-between gap-2.5 transition-colors cursor-grab active:cursor-grabbing ${
                    orderChecked === 'right' || isInRightSlot
                      ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-500'
                      : orderChecked === 'wrong'
                        ? 'bg-amber-50 dark:bg-amber-950/30 border-amber-400'
                        : 'bg-slate-50 dark:bg-[#0b1329] border-slate-200 dark:border-sky-300/20'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="w-7 h-7 rounded-lg bg-emerald-600 text-white text-xs font-black flex items-center justify-center shrink-0 tabular-nums">
                      {idx + 1}
                    </span>
                    <span className="text-xl shrink-0">{step.icon}</span>
                    <span className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">
                      {step.textAr}
                    </span>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      disabled={idx === 0}
                      onClick={() => moveStep(idx, -1)}
                      aria-label="تحريك للأعلى"
                      className="min-h-[40px] min-w-[40px] flex items-center justify-center rounded-xl bg-white dark:bg-[#132247] border border-slate-200 dark:border-sky-300/20 disabled:opacity-35 hover:border-emerald-500"
                    >
                      <ArrowUp className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      disabled={idx === orderedSteps.length - 1}
                      onClick={() => moveStep(idx, 1)}
                      aria-label="تحريك للأسفل"
                      className="min-h-[40px] min-w-[40px] flex items-center justify-center rounded-xl bg-white dark:bg-[#132247] border border-slate-200 dark:border-sky-300/20 disabled:opacity-35 hover:border-emerald-500"
                    >
                      <ArrowDown className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          <button
            type="button"
            onClick={handleVerifyOrder}
            className="w-full min-h-[48px] py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-sm flex items-center justify-center gap-2 shadow-md active:scale-[0.99]"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>تحقق من الترتيب</span>
          </button>
        </div>
      )}

      {phase === 'playing' && activeStageId === 'agri_quiz' && MURSHID_QUIZ_QUESTIONS[quizIdx] && (
        <div className="rounded-3xl bg-white dark:bg-[#132247] border border-slate-200 dark:border-sky-300/20 p-4 sm:p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between text-xs font-bold">
            <span className="text-slate-500 dark:text-slate-300">
              السؤال {quizIdx + 1} من {MURSHID_QUIZ_QUESTIONS.length}
            </span>
            {quizStreak >= 2 && (
              <span className="text-amber-600 dark:text-amber-300">
                🔥 سلسلة إجابات صحيحة ({quizStreak})
              </span>
            )}
          </div>

          <h2 className="text-base sm:text-lg font-extrabold text-slate-900 dark:text-white leading-snug">
            {MURSHID_QUIZ_QUESTIONS[quizIdx].questionAr}
          </h2>

          <div className="grid grid-cols-1 gap-2.5">
            {MURSHID_QUIZ_QUESTIONS[quizIdx].options.map((opt, idx) => {
              const isCorrect = idx === MURSHID_QUIZ_QUESTIONS[quizIdx].correctIndex;
              const isChosen = idx === quizSelected;
              let cls =
                'bg-slate-50 dark:bg-[#0b1329] border-slate-200 dark:border-sky-300/20 text-slate-900 dark:text-white hover:border-emerald-500';
              if (quizSelected !== null) {
                if (isCorrect) cls = 'bg-emerald-600 border-emerald-500 text-white shadow-md';
                else if (isChosen) cls = 'bg-amber-500/20 border-amber-500 text-amber-900 dark:text-amber-200';
              }
              return (
                <button
                  key={opt}
                  type="button"
                  disabled={quizSelected !== null}
                  onClick={() => handleSelectQuizOption(idx)}
                  className={`min-h-[50px] px-4 py-3 rounded-2xl border-2 text-start text-xs sm:text-sm font-bold transition-all active:scale-[0.99] ${cls}`}
                >
                  {opt}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* PHASE 3: END OF STAGE CELEBRATION / SUMMARY */}
      {phase === 'summary' && summaryData && (
        <div className="rounded-3xl bg-white dark:bg-[#132247] border border-emerald-300/50 dark:border-sky-300/20 p-6 text-center shadow-lg space-y-5">
          <div className="flex justify-center">
            <MurshidCharacterSvg
              expression={summaryData.passed ? 'celebrate' : 'gentle_sad'}
              isSpeaking={isSpeaking}
              className="w-28 h-32"
            />
          </div>

          <div className="flex items-center justify-center gap-2">
            {[1, 2, 3].map((n) => (
              <Star
                key={n}
                className={`w-9 h-9 transition-transform ${
                  n <= summaryData.stars
                    ? 'text-amber-400 fill-amber-400 scale-110'
                    : 'text-slate-300 dark:text-slate-600'
                }`}
              />
            ))}
          </div>

          <div className="space-y-1.5">
            <h2 className="text-xl font-extrabold text-slate-900 dark:text-white">
              {summaryData.passed ? 'مبروك يا بطل المزرعة!' : 'محاولة جميلة!'}
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 max-w-md mx-auto">
              {summaryData.messageAr}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 max-w-sm mx-auto">
            <div className="p-3 rounded-2xl bg-slate-50 dark:bg-[#0b1329] border border-slate-200 dark:border-sky-300/15">
              <div className="text-[11px] text-slate-500 dark:text-slate-300">نقاط الجولة</div>
              <div className="text-xl font-black text-emerald-600 dark:text-emerald-400 tabular-nums">
                {summaryData.score}
              </div>
            </div>
            <div className="p-3 rounded-2xl bg-slate-50 dark:bg-[#0b1329] border border-slate-200 dark:border-sky-300/15">
              <div className="text-[11px] text-slate-500 dark:text-slate-300">إضافة لرصيدك</div>
              <div className="text-xl font-black text-amber-500 tabular-nums">
                +{summaryData.pointsSynced}
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <button
              type="button"
              onClick={() =>
                openShare({
                  kind: 'achievement',
                  title: `أنهيت مرحلة «${summaryData.stage.titleAr}» في مغامرات مرشد!`,
                  summary: summaryData.messageAr,
                  highlights: [
                    `التقييم: ${summaryData.stars} من 3 نجوم`,
                    `نقاط الجولة: ${summaryData.score}`,
                    `الرصيد المضاف: +${summaryData.pointsSynced} نقطة`,
                  ],
                  categoryLabel: 'مغامرات مرشد الزراعية',
                  badgeMetric: `${summaryData.stars} ★ · ${summaryData.score} نقطة`,
                  locationLabel: `${user.governorate} · ${user.wilayat}`,
                  page: 'murshid_adventures',
                  authorOrSource: user.name,
                })
              }
              className="min-h-[46px] px-5 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-extrabold text-xs sm:text-sm flex items-center gap-2 shadow-md whitespace-nowrap shrink-0"
            >
              <Share2 className="w-4 h-4" />
              <span>مشاركة النتيجة</span>
            </button>

            <button
              type="button"
              onClick={() => startStage(summaryData.stage.id)}
              className="min-h-[46px] px-5 py-2.5 rounded-xl bg-slate-100 dark:bg-white/10 hover:bg-slate-200 dark:hover:bg-white/20 text-slate-900 dark:text-white font-bold text-xs sm:text-sm flex items-center gap-2 whitespace-nowrap shrink-0"
            >
              <RotateCcw className="w-4 h-4" />
              <span>إعادة المرحلة</span>
            </button>

            {summaryData.passed &&
              summaryData.stage.order < ADVENTURE_STAGES.length && (
                <button
                  type="button"
                  onClick={() => startStage(ADVENTURE_STAGES[summaryData.stage.order].id)}
                  className="min-h-[46px] px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs sm:text-sm flex items-center gap-2 shadow-md whitespace-nowrap shrink-0"
                >
                  <Trophy className="w-4 h-4" />
                  <span>المرحلة التالية</span>
                </button>
              )}

            <button
              type="button"
              onClick={handleReturnToMap}
              className="min-h-[46px] px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold text-xs sm:text-sm flex items-center gap-2 whitespace-nowrap shrink-0"
            >
              <Award className="w-4 h-4" />
              <span>خريطة المراحل</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

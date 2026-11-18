import React, { useEffect, useState } from 'react';
import { Bug, Droplets, Sprout, Sparkles, Timer, Trophy } from 'lucide-react';
import { MurshidCharacterSvg } from './MurshidCharacterSvg.tsx';
import {
  getMurshidAudioPrefs,
  playGentleErrorSfx,
  playTapSfx,
  playVictorySfx,
  playWaterSfx,
  speakMurshid,
} from '../utils/murshidAudio.ts';

const ROUND_SECONDS = 15;
const TILE_COUNT = 12;

type TargetKind = 'water' | 'pest';

function nextTarget() {
  return {
    index: Math.floor(Math.random() * TILE_COUNT),
    kind: (Math.random() < 0.68 ? 'water' : 'pest') as TargetKind,
  };
}

/** لعبة مرشد السريعة: اجمع قطرات الماء وتجنب الحشرات خلال 15 ثانية. */
export const MurshidQuickGame: React.FC = () => {
  const [running, setRunning] = useState(false);
  const [hasPlayed, setHasPlayed] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(ROUND_SECONDS);
  const [score, setScore] = useState(0);
  const [target, setTarget] = useState(nextTarget);
  const [bestScore, setBestScore] = useState(() => {
    try { return Number(localStorage.getItem('murshid_quick_game_best') || 0); }
    catch { return 0; }
  });

  useEffect(() => {
    if (!running) return;
    const timer = window.setInterval(() => {
      setSecondsLeft((current) => Math.max(0, current - 1));
      setTarget(nextTarget());
    }, 1000);
    return () => window.clearInterval(timer);
  }, [running]);

  useEffect(() => {
    if (running && secondsLeft <= 0) setRunning(false);
  }, [running, secondsLeft]);

  useEffect(() => {
    if (running || !hasPlayed) return;
    const prefs = getMurshidAudioPrefs();
    playVictorySfx(prefs.muted, prefs.volume / 100);
    const line = score >= 80
      ? 'يا سلام! أنقذت الشتلة وجمعت ماءً وفيراً. أنت بطل المزرعة!'
      : score >= 40
        ? 'أحسنت! حافظت على الشتلة. حاول مرة أخرى لتحقق نتيجة أعلى.'
        : 'محاولة جميلة! تذكّر: الماء للشتلة، والحشرات نتركها بعيداً عنها.';
    speakMurshid(line, { mood: score >= 80 ? 'proud' : 'cheerful' });
    if (score > bestScore) {
      setBestScore(score);
      try { localStorage.setItem('murshid_quick_game_best', String(score)); } catch { /* ignore */ }
    }
  }, [running, hasPlayed, score, bestScore]);

  const startRound = () => {
    setScore(0);
    setSecondsLeft(ROUND_SECONDS);
    setTarget(nextTarget());
    setHasPlayed(true);
    setRunning(true);
    const prefs = getMurshidAudioPrefs();
    playTapSfx(prefs.muted, prefs.volume / 100);
    speakMurshid('هيا يا صديقي! التقط قطرات الماء وساعدني في إنقاذ الشتلة، واحذر الحشرات.', {
      mood: 'cheerful',
    });
  };

  const tapTile = (index: number) => {
    if (!running) return;
    const prefs = getMurshidAudioPrefs();
    if (index !== target.index) {
      playTapSfx(prefs.muted, prefs.volume / 100);
      return;
    }
    if (target.kind === 'water') {
      setScore((current) => current + 10);
      playWaterSfx(prefs.muted, prefs.volume / 100);
    } else {
      setScore((current) => Math.max(0, current - 5));
      playGentleErrorSfx(prefs.muted, prefs.volume / 100);
    }
    setTarget(nextTarget());
  };

  return (
    <section className="rounded-3xl border border-emerald-200/80 dark:border-emerald-400/20 bg-gradient-to-br from-white via-emerald-50 to-sky-50 dark:from-[#132247] dark:via-[#102b38] dark:to-[#12203b] p-3.5 sm:p-5 shadow-sm">
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shadow-md">
          <Droplets className="w-6 h-6" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h2 className="font-black text-sm sm:text-base text-slate-900 dark:text-white">تحدي إنقاذ الشتلة</h2>
            <span className="text-[10px] font-bold px-2 py-1 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-400/15 dark:text-amber-200">15 ثانية</span>
          </div>
          <p className="text-[11px] sm:text-xs text-slate-600 dark:text-slate-300 mt-0.5">التقط قطرات الماء وتجنب الحشرات مع مرشد.</p>
        </div>
        <MurshidCharacterSvg expression={running ? 'encourage' : 'smile'} className="w-12 h-14 shrink-0" />
      </div>

      <div className="flex items-center justify-between gap-3 mt-3 mb-2 text-xs">
        <span className="font-bold text-emerald-800 dark:text-emerald-300 flex items-center gap-1"><Sparkles className="w-3.5 h-3.5" /> النقاط: {score}</span>
        <span className="font-bold text-slate-600 dark:text-slate-300 flex items-center gap-1"><Timer className="w-3.5 h-3.5" /> الوقت: {secondsLeft}ث</span>
        <span className="font-bold text-amber-700 dark:text-amber-300 flex items-center gap-1"><Trophy className="w-3.5 h-3.5" /> الأفضل: {bestScore}</span>
      </div>

      <div className="grid grid-cols-4 gap-2">
        {Array.from({ length: TILE_COUNT }, (_, index) => {
          const active = running && index === target.index;
          return (
            <button
              key={index}
              type="button"
              onClick={() => tapTile(index)}
              disabled={!running}
              aria-label={active ? (target.kind === 'water' ? 'التقط قطرة الماء' : 'تجنب الحشرة') : 'حقل اللعبة'}
              className={`aspect-square rounded-2xl border flex items-center justify-center transition-all duration-150 active:scale-90 disabled:cursor-default ${
                active
                  ? target.kind === 'water'
                    ? 'bg-sky-100 border-sky-300 text-sky-600 dark:bg-sky-400/20 dark:border-sky-300/40 dark:text-sky-200 scale-[1.03] shadow-md'
                    : 'bg-rose-100 border-rose-300 text-rose-600 dark:bg-rose-400/20 dark:border-rose-300/40 dark:text-rose-200 scale-[1.03] shadow-md'
                  : 'bg-white/80 border-emerald-100 text-emerald-700 dark:bg-white/5 dark:border-white/10 dark:text-emerald-200'
              }`}
            >
              {active ? target.kind === 'water' ? <Droplets className="w-7 h-7" /> : <Bug className="w-7 h-7" /> : <Sprout className="w-5 h-5 opacity-35" />}
            </button>
          );
        })}
      </div>

      <div className="mt-3 flex items-center justify-between gap-3">
        <p className="text-[10px] text-slate-500 dark:text-slate-400">
          {running ? 'اضغط على القطرة الزرقاء فقط؛ الحشرة تخصم من نقاطك.' : hasPlayed ? `انتهى التحدي! نتيجتك ${score} نقطة.` : 'لعبة قصيرة بأصوات ماء ونجاح وتنبيه.'}
        </p>
        <button
          type="button"
          onClick={startRound}
          className="min-h-[42px] px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-extrabold shadow-sm active:scale-95 transition"
        >
          {running ? 'ابدأ من جديد' : hasPlayed ? 'العب مجدداً' : 'ابدأ اللعب'}
        </button>
      </div>
    </section>
  );
};

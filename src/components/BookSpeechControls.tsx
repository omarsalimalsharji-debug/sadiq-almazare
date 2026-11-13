import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  Play,
  Pause,
  Square,
  SkipForward,
  SkipBack,
  Volume2,
  AlertCircle,
  Gauge,
} from 'lucide-react';
import {
  chunkParagraphForSpeech,
  getSortedArabicVoices,
  pickBestArabicVoice,
} from '../utils/arabicSpeech.ts';

interface BookSpeechControlsProps {
  paragraphs: string[];
  pageKey: string;
  activeParagraphIndex: number | null;
  onActiveParagraphChange: (index: number | null) => void;
}

const SPEED_OPTIONS = [0.85, 1.0, 1.15, 1.3];

export const BookSpeechControls: React.FC<BookSpeechControlsProps> = ({
  paragraphs,
  pageKey,
  activeParagraphIndex,
  onActiveParagraphChange,
}) => {
  const isSupported =
    typeof window !== 'undefined' &&
    'speechSynthesis' in window &&
    typeof SpeechSynthesisUtterance !== 'undefined';

  const [voicesLoaded, setVoicesLoaded] = useState<boolean>(false);
  const [arabicVoices, setArabicVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [selectedVoiceURI, setSelectedVoiceURI] = useState<string>('');
  const [rate, setRate] = useState<number>(1.0);
  const [status, setStatus] = useState<'idle' | 'playing' | 'paused'>('idle');
  const [showVoiceHelp, setShowVoiceHelp] = useState<boolean>(false);

  // Refs to coordinate async utterance callbacks cleanly
  const playbackRunIdRef = useRef<number>(0);
  const currentParaRef = useRef<number>(0);
  const statusRef = useRef<'idle' | 'playing' | 'paused'>('idle');
  const rateRef = useRef<number>(rate);
  const voiceRef = useRef<SpeechSynthesisVoice | null>(null);
  const paragraphsRef = useRef<string[]>(paragraphs);

  rateRef.current = rate;
  paragraphsRef.current = paragraphs;

  const selectedVoice =
    arabicVoices.find((v) => v.voiceURI === selectedVoiceURI) || arabicVoices[0] || null;
  voiceRef.current = selectedVoice;

  // Load device voices (ar-OM -> ar-SA -> other ar-*)
  useEffect(() => {
    if (!isSupported) return;

    const refreshVoices = () => {
      const all = window.speechSynthesis.getVoices();
      if (all.length > 0) {
        setVoicesLoaded(true);
      }
      const ar = getSortedArabicVoices(all);
      setArabicVoices(ar);
      if (ar.length > 0) {
        setSelectedVoiceURI((prev) => {
          if (prev && ar.some((v) => v.voiceURI === prev)) return prev;
          const best = pickBestArabicVoice(all);
          return best?.voiceURI || ar[0].voiceURI;
        });
      }
    };

    refreshVoices();
    const synth = window.speechSynthesis;
    if ('onvoiceschanged' in synth) {
      synth.addEventListener('voiceschanged', refreshVoices);
    }
    const timer = setTimeout(() => {
      refreshVoices();
      setVoicesLoaded(true);
    }, 800);

    return () => {
      if ('onvoiceschanged' in synth) {
        synth.removeEventListener('voiceschanged', refreshVoices);
      }
      clearTimeout(timer);
    };
  }, [isSupported]);

  const stopSpeech = useCallback(() => {
    playbackRunIdRef.current += 1;
    statusRef.current = 'idle';
    setStatus('idle');
    onActiveParagraphChange(null);
    if (isSupported) {
      try {
        window.speechSynthesis.cancel();
      } catch {
        // ignore
      }
    }
  }, [isSupported, onActiveParagraphChange]);

  // Reset cleanly when page changes or modal closes
  useEffect(() => {
    stopSpeech();
    currentParaRef.current = 0;
  }, [pageKey, stopSpeech]);

  useEffect(() => {
    return () => {
      if (isSupported) {
        try {
          window.speechSynthesis.cancel();
        } catch {
          // ignore
        }
      }
    };
  }, [isSupported]);

  const speakFromParagraph = useCallback(
    (startIndex: number) => {
      if (!isSupported) return;
      const list = paragraphsRef.current;
      if (startIndex < 0 || startIndex >= list.length) {
        stopSpeech();
        return;
      }

      const runId = ++playbackRunIdRef.current;
      try {
        window.speechSynthesis.cancel();
      } catch {
        // ignore
      }

      statusRef.current = 'playing';
      setStatus('playing');
      currentParaRef.current = startIndex;
      onActiveParagraphChange(startIndex);

      const playParaChunks = (pIdx: number, chunkIdx: number, chunks: string[]) => {
        if (playbackRunIdRef.current !== runId || statusRef.current !== 'playing') return;

        if (chunkIdx >= chunks.length) {
          const nextIdx = pIdx + 1;
          if (nextIdx >= paragraphsRef.current.length) {
            stopSpeech();
            return;
          }
          currentParaRef.current = nextIdx;
          onActiveParagraphChange(nextIdx);
          const nextChunks = chunkParagraphForSpeech(paragraphsRef.current[nextIdx]);
          if (nextChunks.length === 0) {
            playParaChunks(nextIdx, 0, []);
            return;
          }
          playParaChunks(nextIdx, 0, nextChunks);
          return;
        }

        const utt = new SpeechSynthesisUtterance(chunks[chunkIdx]);
        const v = voiceRef.current;
        if (v) {
          utt.voice = v;
          utt.lang = v.lang;
        } else {
          utt.lang = 'ar-OM';
        }
        utt.rate = rateRef.current;
        utt.pitch = 1.0;

        utt.onend = () => {
          if (playbackRunIdRef.current !== runId || statusRef.current !== 'playing') return;
          playParaChunks(pIdx, chunkIdx + 1, chunks);
        };
        utt.onerror = (ev) => {
          // Ignore intentional cancellation errors
          if (ev.error === 'canceled' || ev.error === 'interrupted') return;
          if (playbackRunIdRef.current !== runId) return;
          stopSpeech();
        };

        window.speechSynthesis.speak(utt);
      };

      const initialChunks = chunkParagraphForSpeech(list[startIndex]);
      playParaChunks(startIndex, 0, initialChunks);
    },
    [isSupported, onActiveParagraphChange, stopSpeech]
  );

  const handlePlayOrResume = () => {
    if (!isSupported) {
      setShowVoiceHelp(true);
      return;
    }
    if (arabicVoices.length === 0 && voicesLoaded) {
      setShowVoiceHelp(true);
    }
    if (status === 'paused') {
      try {
        window.speechSynthesis.resume();
        statusRef.current = 'playing';
        setStatus('playing');
        return;
      } catch {
        // fallback to restart current paragraph
      }
    }
    const startIdx = activeParagraphIndex !== null ? activeParagraphIndex : currentParaRef.current;
    speakFromParagraph(Math.max(0, Math.min(startIdx, paragraphs.length - 1)));
  };

  const handlePause = () => {
    if (!isSupported || status !== 'playing') return;
    try {
      window.speechSynthesis.pause();
      statusRef.current = 'paused';
      setStatus('paused');
    } catch {
      stopSpeech();
    }
  };

  const handlePrevParagraph = () => {
    const curr = activeParagraphIndex !== null ? activeParagraphIndex : currentParaRef.current;
    const prev = Math.max(0, curr - 1);
    currentParaRef.current = prev;
    if (status === 'playing' || status === 'paused') {
      speakFromParagraph(prev);
    } else {
      onActiveParagraphChange(prev);
    }
  };

  const handleNextParagraph = () => {
    const curr = activeParagraphIndex !== null ? activeParagraphIndex : currentParaRef.current;
    const next = Math.min(Math.max(0, paragraphs.length - 1), curr + 1);
    currentParaRef.current = next;
    if (status === 'playing' || status === 'paused') {
      speakFromParagraph(next);
    } else {
      onActiveParagraphChange(next);
    }
  };

  const handleCycleSpeed = () => {
    const idx = SPEED_OPTIONS.indexOf(rate);
    const nextRate = SPEED_OPTIONS[(idx + 1) % SPEED_OPTIONS.length];
    setRate(nextRate);
    rateRef.current = nextRate;
    if (status === 'playing') {
      speakFromParagraph(currentParaRef.current);
    }
  };

  const noArabicVoiceAvailable = !isSupported || (voicesLoaded && arabicVoices.length === 0);

  return (
    <div className="border-b border-stone-200 dark:border-stone-800 bg-emerald-50/70 dark:bg-emerald-950/30 px-3 sm:px-4 py-2.5 space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        {/* Main Playback Controls */}
        <div className="flex flex-wrap items-center gap-1.5">
          <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-900 dark:text-emerald-200 ml-1">
            <Volume2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <span>قراءة الكتاب صوتياً</span>
          </div>

          {/* Previous Paragraph (RTL SkipForward points right = previous in RTL) */}
          <button
            type="button"
            onClick={handlePrevParagraph}
            disabled={paragraphs.length === 0}
            className="min-h-[38px] min-w-[38px] px-2 rounded-lg bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-stone-700 dark:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-700 disabled:opacity-40 flex items-center justify-center"
            title="الفقرة السابقة"
          >
            <SkipForward className="w-4 h-4" />
          </button>

          {status === 'playing' ? (
            <button
              type="button"
              onClick={handlePause}
              className="min-h-[38px] px-3 rounded-lg bg-amber-500 hover:bg-amber-600 text-stone-950 font-bold text-xs flex items-center gap-1.5 shadow-sm"
            >
              <Pause className="w-3.5 h-3.5" />
              <span>إيقاف مؤقت</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={handlePlayOrResume}
              disabled={paragraphs.length === 0}
              className="min-h-[38px] px-3 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm disabled:opacity-40"
            >
              <Play className="w-3.5 h-3.5" />
              <span>{status === 'paused' ? 'استئناف' : 'تشغيل'}</span>
            </button>
          )}

          <button
            type="button"
            onClick={stopSpeech}
            disabled={status === 'idle' && activeParagraphIndex === null}
            className="min-h-[38px] min-w-[38px] px-2 rounded-lg bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-stone-700 dark:text-stone-200 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/40 disabled:opacity-40 flex items-center justify-center"
            title="إيقاف"
          >
            <Square className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            onClick={handleNextParagraph}
            disabled={paragraphs.length === 0}
            className="min-h-[38px] min-w-[38px] px-2 rounded-lg bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-stone-700 dark:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-700 disabled:opacity-40 flex items-center justify-center"
            title="الفقرة التالية"
          >
            <SkipBack className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={handleCycleSpeed}
            className="min-h-[38px] px-2.5 rounded-lg bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-xs font-mono font-bold text-stone-700 dark:text-stone-200 hover:bg-stone-100 flex items-center gap-1"
            title="تبديل سرعة القراءة"
          >
            <Gauge className="w-3.5 h-3.5 text-emerald-600" />
            <span>{rate}x</span>
          </button>
        </div>

        {/* Voice Selector */}
        <div className="flex items-center gap-2 w-full sm:w-auto">
          {arabicVoices.length > 0 ? (
            <select
              aria-label="اختيار الصوت العربي"
              value={selectedVoice?.voiceURI || ''}
              onChange={(e) => {
                setSelectedVoiceURI(e.target.value);
                if (status === 'playing') {
                  setTimeout(() => speakFromParagraph(currentParaRef.current), 40);
                }
              }}
              className="min-h-[38px] flex-1 sm:w-60 px-2.5 py-1.5 rounded-lg bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-[11px] text-stone-800 dark:text-stone-200 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            >
              {arabicVoices.map((v) => (
                <option key={v.voiceURI} value={v.voiceURI}>
                  {v.name} ({v.lang}){v.localService ? ' · دون إنترنت' : ''}
                </option>
              ))}
            </select>
          ) : (
            <button
              type="button"
              onClick={() => setShowVoiceHelp((v) => !v)}
              className="text-[11px] font-semibold text-amber-800 dark:text-amber-300 flex items-center gap-1 underline"
            >
              <AlertCircle className="w-3.5 h-3.5" />
              <span>كيفية تفعيل الصوت العربي على جهازك</span>
            </button>
          )}
        </div>
      </div>

      {/* Guidance when no Arabic TTS voice is installed */}
      {(noArabicVoiceAvailable || showVoiceHelp) && (
        <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800 text-[11px] text-amber-950 dark:text-amber-200 leading-relaxed space-y-1">
          <div className="font-bold flex items-center gap-1.5">
            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
            <span>
              {!isSupported
                ? 'متصفحك الحالي لا يدعم القراءة الصوتية المباشرة (Web Speech API).'
                : 'لم يتم العثور على صوت عربي مثبّت في نظام الجهاز حالياً.'}
            </span>
          </div>
          <p>
            لتفعيل القراءة العربية بدون إنترنت: افتح <strong>إعدادات الهاتف ← إمكانية الوصول / الإدارة العامة ← تحويل النص إلى كلام (Text-to-Speech) ← تنزيل حزمة اللغة العربية (ar-SA أو ar-OM)</strong>، ثم أعد فتح القارئ. (ملاحظة: جودة النطق تعتمد على أصوات النظام المثبّتة ولا تضمن لهجة عُمانية محددة).
          </p>
        </div>
      )}
    </div>
  );
};

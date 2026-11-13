import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Clapperboard,
  Play,
  Pause,
  SkipBack,
  SkipForward,
  RotateCcw,
  Volume2,
  VolumeX,
  Sparkles,
  Loader2,
  Film,
  Lightbulb,
  Captions,
} from 'lucide-react';
import {
  CartoonEpisode,
  INITIAL_CARTOON_EPISODES,
} from '../data/cartoonEpisodesData.ts';
import { CartoonStageCanvas } from './CartoonStageCanvas.tsx';

const CATEGORIES = [
  'الكل',
  'الري والأفلاج',
  'وقاية النخيل',
  'مكافحة الآفات',
  'التسميد والتربة',
  'البيوت المحمية',
] as const;

const SUGGESTED_TOPICS = [
  'كيف أحمي الليمون العُماني من صانعة الأنفاق؟',
  'الوقت المثالي لتلقيح النخيل في سلطنة عُمان',
  'تقليل ملوحة التربة في المزارع الساحلية بالباطنة',
];

export const CartoonVideosView: React.FC = () => {
  const [customEpisodes, setCustomEpisodes] = useState<CartoonEpisode[]>(() => {
    try {
      const saved = localStorage.getItem('farmer_flijan_custom_episodes');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const allEpisodes = useMemo(
    () => [...customEpisodes, ...INITIAL_CARTOON_EPISODES],
    [customEpisodes]
  );

  const [selectedCategory, setSelectedCategory] = useState<string>('الكل');
  const [activeEpisodeId, setActiveEpisodeId] = useState<string>(
    INITIAL_CARTOON_EPISODES[0].id
  );
  const [sceneIndex, setSceneIndex] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [isLoadingAudio, setIsLoadingAudio] = useState<boolean>(false);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1);
  const [showSubtitles, setShowSubtitles] = useState<boolean>(true);
  const [audioStatusNote, setAudioStatusNote] = useState<string | null>(null);

  // Custom AI Episode Generator state
  const [topicInput, setTopicInput] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [genError, setGenError] = useState<string | null>(null);

  const activeEpisode = useMemo(
    () =>
      allEpisodes.find((ep) => ep.id === activeEpisodeId) ||
      allEpisodes[0],
    [allEpisodes, activeEpisodeId]
  );

  const activeScene = activeEpisode.scenes[sceneIndex] || activeEpisode.scenes[0];

  const filteredEpisodes = useMemo(() => {
    if (selectedCategory === 'الكل') return allEpisodes;
    return allEpisodes.filter((ep) => ep.category === selectedCategory);
  }, [allEpisodes, selectedCategory]);

  // Audio playback & lip-sync refs
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const sourceAttachedRef = useRef<boolean>(false);
  const audioLevelRef = useRef<number>(0);
  const ttsCacheRef = useRef<Map<string, string>>(new Map());
  const playSessionRef = useRef<number>(0);
  const fallbackTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    try {
      localStorage.setItem(
        'farmer_flijan_custom_episodes',
        JSON.stringify(customEpisodes.slice(0, 8))
      );
    } catch {
      // ignore quota errors
    }
  }, [customEpisodes]);

  const stopAllAudio = useCallback(() => {
    playSessionRef.current += 1;
    if (fallbackTimerRef.current) {
      clearTimeout(fallbackTimerRef.current);
      fallbackTimerRef.current = null;
    }
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    audioLevelRef.current = 0;
  }, []);

  useEffect(() => {
    return () => {
      stopAllAudio();
    };
  }, [stopAllAudio]);

  // Update AudioAnalyser loop for Flijan's lip-sync
  useEffect(() => {
    if (!isPlaying) {
      audioLevelRef.current = 0;
      return;
    }

    let rafId = 0;
    const freqData = new Uint8Array(64);

    const tick = () => {
      if (analyserRef.current && audioRef.current && !audioRef.current.paused) {
        analyserRef.current.getByteTimeDomainData(freqData);
        let sum = 0;
        for (let i = 0; i < freqData.length; i++) {
          const val = (freqData[i] - 128) / 128;
          sum += val * val;
        }
        const rms = Math.sqrt(sum / freqData.length);
        audioLevelRef.current = Math.min(1, rms * 4.5);
      } else if (isPlaying && !isLoadingAudio) {
        // Gentle speech cadence fallback when speechSynthesis or unattached audio plays
        const t = performance.now() / 1000;
        audioLevelRef.current = 0.25 + Math.abs(Math.sin(t * 9.5)) * 0.45;
      } else {
        audioLevelRef.current = 0;
      }
      rafId = requestAnimationFrame(tick);
    };

    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [isPlaying, isLoadingAudio]);

  const ensureAudioAnalyser = useCallback(() => {
    const audioEl = audioRef.current;
    if (!audioEl) return;

    try {
      if (!audioCtxRef.current) {
        const Ctx =
          window.AudioContext ||
          (window as unknown as { webkitAudioContext: typeof AudioContext })
            .webkitAudioContext;
        if (!Ctx) return;
        audioCtxRef.current = new Ctx();
      }
      if (audioCtxRef.current.state === 'suspended') {
        audioCtxRef.current.resume().catch(() => {});
      }
      if (!sourceAttachedRef.current && audioCtxRef.current) {
        const src = audioCtxRef.current.createMediaElementSource(audioEl);
        const analyser = audioCtxRef.current.createAnalyser();
        analyser.fftSize = 128;
        src.connect(analyser);
        analyser.connect(audioCtxRef.current.destination);
        analyserRef.current = analyser;
        sourceAttachedRef.current = true;
      }
    } catch {
      // Fallback gracefully if Web Audio connection is restricted
    }
  }, []);

  const fetchSceneTts = useCallback(
    async (narration: string, mood: string): Promise<string | null> => {
      const key = `${mood}:${narration}`;
      const cached = ttsCacheRef.current.get(key);
      if (cached) return cached;

      try {
        const res = await fetch('/api/cartoon/tts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: narration, mood }),
        });
        const data = await res.json();
        if (res.ok && data.success && data.audioBase64) {
          ttsCacheRef.current.set(key, data.audioBase64);
          return data.audioBase64;
        }
      } catch {
        // Handled by caller fallback
      }
      return null;
    },
    []
  );

  const playSceneAt = useCallback(
    async (episode: CartoonEpisode, idx: number) => {
      stopAllAudio();
      const session = playSessionRef.current;
      const targetScene = episode.scenes[idx];
      if (!targetScene) {
        setIsPlaying(false);
        return;
      }

      setSceneIndex(idx);
      setIsPlaying(true);
      setIsLoadingAudio(true);
      setAudioStatusNote(null);

      ensureAudioAnalyser();

      // Prefetch next scene audio in parallel
      const nextScene = episode.scenes[idx + 1];
      if (nextScene) {
        fetchSceneTts(nextScene.narration, nextScene.flijanMood).catch(() => {});
      }

      const base64Wav = await fetchSceneTts(
        targetScene.narration,
        targetScene.flijanMood
      );

      if (playSessionRef.current !== session) return;
      setIsLoadingAudio(false);

      const advanceNext = () => {
        if (playSessionRef.current !== session) return;
        if (idx + 1 < episode.scenes.length) {
          playSceneAt(episode, idx + 1);
        } else {
          setIsPlaying(false);
          audioLevelRef.current = 0;
        }
      };

      if (base64Wav && audioRef.current) {
        const audioEl = audioRef.current;
        audioEl.src = `data:audio/wav;base64,${base64Wav}`;
        audioEl.playbackRate = playbackSpeed;
        audioEl.muted = isMuted;
        audioEl.onended = advanceNext;
        try {
          await audioEl.play();
          return;
        } catch {
          // Fall through to speechSynthesis fallback
        }
      }

      // Graceful browser speech fallback if TTS unavailable or autoplay blocked
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        setAudioStatusNote('يتم التشغيل بالصوت الاحتياطي للمتصفح');
        const utter = new SpeechSynthesisUtterance(targetScene.narration);
        utter.lang = 'ar-SA';
        utter.rate = playbackSpeed;
        utter.volume = isMuted ? 0 : 1;
        utter.onend = advanceNext;
        utter.onerror = () => {
          fallbackTimerRef.current = setTimeout(advanceNext, 5500);
        };
        window.speechSynthesis.speak(utter);
      } else {
        fallbackTimerRef.current = setTimeout(advanceNext, 6000);
      }
    },
    [ensureAudioAnalyser, fetchSceneTts, isMuted, playbackSpeed, stopAllAudio]
  );

  // Sync mute & playback rate live
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.muted = isMuted;
      audioRef.current.playbackRate = playbackSpeed;
    }
  }, [isMuted, playbackSpeed]);

  const handlePlayPause = () => {
    if (isPlaying) {
      stopAllAudio();
      setIsPlaying(false);
    } else {
      playSceneAt(activeEpisode, sceneIndex);
    }
  };

  const handleSelectEpisode = (ep: CartoonEpisode, autoPlay = true) => {
    stopAllAudio();
    setActiveEpisodeId(ep.id);
    setSceneIndex(0);
    setIsPlaying(false);
    if (autoPlay) {
      setTimeout(() => {
        playSceneAt(ep, 0);
      }, 40);
    }
  };

  const handleGenerateCustomEpisode = async (e: React.FormEvent) => {
    e.preventDefault();
    const clean = topicInput.trim();
    if (!clean) {
      setGenError('اكتب موضوعاً زراعياً أولاً ليصمم فليجان حلقته التوعوية.');
      return;
    }

    setIsGenerating(true);
    setGenError(null);
    try {
      const res = await fetch('/api/cartoon/generate-episode', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic: clean }),
      });
      const data = await res.json();
      if (!res.ok || !data.success || !data.episode) {
        throw new Error(data.error || 'تعذر توليد الحلقة');
      }

      const newEp: CartoonEpisode = data.episode;
      setCustomEpisodes((prev) => [newEp, ...prev]);
      setTopicInput('');
      setSelectedCategory('الكل');
      handleSelectEpisode(newEp, true);
    } catch (err: any) {
      setGenError(err?.message || 'حدث خطأ أثناء إنشاء الحلقة الكرتونية.');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      {/* Hidden audio element connected to Web Audio Analyser for real-time lip-sync */}
      <audio ref={audioRef} className="hidden" />

      {/* Page Header */}
      <div className="border-b border-stone-200 dark:border-stone-800 pb-4 flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
            <Clapperboard className="w-4 h-4" />
            <span>سلسلة التوعية الكرتونية · صوت عربي حي</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-stone-900 dark:text-white mt-1">
            فيديوهات «فليجان» التوعوية للمزارع العُماني
          </h1>
          <p className="text-xs sm:text-sm text-stone-600 dark:text-stone-400 mt-1">
            شاهد حلقات كرتونية متحركة بشخصية «فليجان» بالزي العُماني لتعلم أفضل ممارسات الري، وقاية النخيل، ومكافحة الآفات بأسلوب ممتع وبسيط.
          </p>
        </div>

        <div className="text-xs text-stone-500 dark:text-stone-400 flex items-center gap-2">
          <span>{allEpisodes.length} حلقات جاهزة</span>
          <span aria-hidden="true">·</span>
          <span>صوت Gemini TTS</span>
        </div>
      </div>

      {/* Main Theater + Episode Playlist Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Video Theater Stage (8 cols) */}
        <div className="lg:col-span-8 space-y-4">
          <div className="relative rounded-2xl overflow-hidden bg-stone-950 border border-stone-200 dark:border-stone-800 shadow-lg">
            <CartoonStageCanvas
              scene={activeScene}
              isPlaying={isPlaying}
              audioLevelRef={audioLevelRef}
              episodeTitle={activeEpisode.title}
              sceneIndex={sceneIndex}
              totalScenes={activeEpisode.scenes.length}
            />

            {/* Loading Audio Overlay Indicator */}
            {isLoadingAudio && (
              <div className="absolute inset-0 bg-stone-950/45 backdrop-blur-[1px] flex flex-col items-center justify-center text-white gap-2">
                <Loader2 className="w-8 h-8 animate-spin text-emerald-400" />
                <span className="text-xs font-semibold">
                  فليجان يستعد للتحدث...
                </span>
              </div>
            )}

            {/* Play Start CTA Overlay when idle at start */}
            {!isPlaying && !isLoadingAudio && (
              <button
                type="button"
                onClick={handlePlayPause}
                aria-label="تشغيل الحلقة الكرتونية"
                className="absolute inset-0 bg-stone-950/25 hover:bg-stone-950/35 transition-colors flex items-center justify-center group"
              >
                <span className="w-16 h-16 rounded-full bg-emerald-600 group-hover:bg-emerald-500 text-white shadow-2xl flex items-center justify-center transition-transform group-hover:scale-105">
                  <Play className="w-7 h-7 fill-current ml-0.5" />
                </span>
              </button>
            )}

            {/* Subtitles Overlay */}
            {showSubtitles && (
              <div className="absolute bottom-3 left-4 right-4 pointer-events-none flex justify-center">
                <div className="bg-stone-950/85 text-white px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold text-center max-w-2xl leading-relaxed border border-white/10 shadow-md">
                  {activeScene.subtitle}
                </div>
              </div>
            )}
          </div>

          {/* Player Controls Bar */}
          <div className="bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-800 p-4 space-y-4">
            {/* Scene Timeline Selector */}
            <div className="grid grid-cols-4 gap-2">
              {activeEpisode.scenes.map((sc, idx) => {
                const isCurrent = idx === sceneIndex;
                return (
                  <button
                    key={sc.id}
                    type="button"
                    onClick={() => playSceneAt(activeEpisode, idx)}
                    className={`p-2 rounded-xl text-right border transition-all ${
                      isCurrent
                        ? 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-500 text-emerald-900 dark:text-emerald-200'
                        : 'bg-stone-50 dark:bg-stone-800/50 border-stone-200 dark:border-stone-700 text-stone-600 dark:text-stone-300 hover:border-emerald-400'
                    }`}
                  >
                    <div className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                      المشهد {idx + 1}
                    </div>
                    <div className="text-[11px] font-semibold truncate mt-0.5">
                      {sc.sceneHeading}
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Playback Buttons */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handlePlayPause}
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-2 transition-colors"
                >
                  {isPlaying ? (
                    <>
                      <Pause className="w-4 h-4" />
                      <span>إيقاف مؤقت</span>
                    </>
                  ) : (
                    <>
                      <Play className="w-4 h-4 fill-current" />
                      <span>تشغيل الحلقة</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() =>
                    playSceneAt(activeEpisode, Math.max(0, sceneIndex - 1))
                  }
                  disabled={sceneIndex === 0}
                  title="المشهد السابق"
                  className="p-2 rounded-xl bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-200 hover:bg-stone-200 dark:hover:bg-stone-700 disabled:opacity-40"
                >
                  <SkipForward className="w-4 h-4" />
                </button>

                <button
                  type="button"
                  onClick={() =>
                    playSceneAt(
                      activeEpisode,
                      Math.min(activeEpisode.scenes.length - 1, sceneIndex + 1)
                    )
                  }
                  disabled={sceneIndex >= activeEpisode.scenes.length - 1}
                  title="المشهد التالي"
                  className="p-2 rounded-xl bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-200 hover:bg-stone-200 dark:hover:bg-stone-700 disabled:opacity-40"
                >
                  <SkipBack className="w-4 h-4" />
                </button>

                <button
                  type="button"
                  onClick={() => playSceneAt(activeEpisode, 0)}
                  title="إعادة من البداية"
                  className="p-2 rounded-xl bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-200 hover:bg-stone-200 dark:hover:bg-stone-700"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>
              </div>

              <div className="flex items-center gap-2">
                {/* Speed Toggle */}
                <button
                  type="button"
                  onClick={() =>
                    setPlaybackSpeed((s) =>
                      s === 1 ? 1.15 : s === 1.15 ? 0.9 : 1
                    )
                  }
                  className="px-2.5 py-1.5 rounded-lg bg-stone-100 dark:bg-stone-800 text-xs font-mono font-bold text-stone-700 dark:text-stone-200 hover:bg-stone-200 dark:hover:bg-stone-700"
                  title="سرعة الصوت"
                >
                  {playbackSpeed}x
                </button>

                {/* Subtitles Toggle */}
                <button
                  type="button"
                  onClick={() => setShowSubtitles((v) => !v)}
                  className={`p-2 rounded-lg border text-xs transition-colors ${
                    showSubtitles
                      ? 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-300 dark:border-emerald-700 text-emerald-700 dark:text-emerald-300'
                      : 'bg-stone-100 dark:bg-stone-800 border-stone-200 dark:border-stone-700 text-stone-500'
                  }`}
                  title="إظهار/إخفاء الترجمة النصية"
                >
                  <Captions className="w-4 h-4" />
                </button>

                {/* Mute Toggle */}
                <button
                  type="button"
                  onClick={() => setIsMuted((m) => !m)}
                  className="p-2 rounded-lg bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-200 hover:bg-stone-200 dark:hover:bg-stone-700"
                  title={isMuted ? 'تشغيل الصوت' : 'كتم الصوت'}
                >
                  {isMuted ? (
                    <VolumeX className="w-4 h-4 text-red-500" />
                  ) : (
                    <Volume2 className="w-4 h-4 text-emerald-600" />
                  )}
                </button>
              </div>
            </div>

            {audioStatusNote && (
              <div className="text-[11px] text-amber-700 dark:text-amber-400">
                {audioStatusNote}
              </div>
            )}

            {/* Active Episode Takeaway */}
            <div className="pt-3 border-t border-stone-100 dark:border-stone-800 flex items-start gap-2.5 text-xs text-stone-700 dark:text-stone-300">
              <Lightbulb className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold text-stone-900 dark:text-white">
                  الخلاصة العملية من فليجان:
                </span>{' '}
                {activeEpisode.takeaway}
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Episode List + Custom AI Cartoon Generator (4 cols) */}
        <div className="lg:col-span-4 space-y-5">
          {/* Custom AI Episode Studio */}
          <div className="bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-800 p-4 space-y-3 shadow-sm">
            <h2 className="text-sm font-bold text-stone-900 dark:text-white flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-emerald-600" />
              <span>اطلب حلقة كرتونية جديدة من فليجان</span>
            </h2>
            <p className="text-[11px] text-stone-500 dark:text-stone-400 leading-relaxed">
              اكتب أي سؤال أو موضوع زراعي، وسيؤلف الذكاء الاصطناعي سيناريو كرتونياً من 4 مشاهد ويرويه فليجان بالصوت والصورة فوراً.
            </p>

            <form onSubmit={handleGenerateCustomEpisode} className="space-y-2.5">
              <input
                type="text"
                value={topicInput}
                onChange={(e) => setTopicInput(e.target.value)}
                placeholder="مثال: كيف نعتني بشتلات المانجو في الصيف؟"
                className="w-full px-3 py-2 text-xs rounded-xl bg-stone-50 dark:bg-stone-800 border border-stone-300 dark:border-stone-700 text-stone-900 dark:text-white focus:ring-1 focus:ring-emerald-500"
              />

              <div className="flex flex-wrap gap-1.5">
                {SUGGESTED_TOPICS.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setTopicInput(s)}
                    className="text-[10px] px-2 py-1 rounded-md bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300 hover:text-emerald-700 dark:hover:text-emerald-400 transition-colors text-right"
                  >
                    {s}
                  </button>
                ))}
              </div>

              <button
                type="submit"
                disabled={isGenerating}
                className="w-full py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>جاري إنتاج الحلقة الكرتونية...</span>
                  </>
                ) : (
                  <>
                    <Film className="w-4 h-4" />
                    <span>إنتاج وتشغيل الحلقة فوراً</span>
                  </>
                )}
              </button>

              {genError && (
                <p className="text-[11px] text-red-600 dark:text-red-400">
                  {genError}
                </p>
              )}
            </form>
          </div>

          {/* Episode Library Filter + List */}
          <div className="bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-800 p-4 space-y-3 shadow-sm">
            <h2 className="text-sm font-bold text-stone-900 dark:text-white">
              مكتبة حلقات فليجان التوعوية
            </h2>

            {/* Category Filter Tabs */}
            <div className="flex flex-wrap gap-1.5">
              {CATEGORIES.map((cat) => {
                const active = selectedCategory === cat;
                return (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setSelectedCategory(cat)}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition-colors ${
                      active
                        ? 'bg-emerald-600 text-white'
                        : 'bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300 hover:bg-stone-200 dark:hover:bg-stone-700'
                    }`}
                  >
                    {cat}
                  </button>
                );
              })}
            </div>

            <div className="space-y-2 max-h-[420px] overflow-y-auto pr-0.5">
              {filteredEpisodes.map((ep) => {
                const isSelected = ep.id === activeEpisode.id;
                return (
                  <button
                    key={ep.id}
                    type="button"
                    onClick={() => handleSelectEpisode(ep, true)}
                    className={`w-full text-right p-3 rounded-xl border transition-all flex items-start gap-3 ${
                      isSelected
                        ? 'bg-emerald-50 dark:bg-emerald-950/50 border-emerald-500'
                        : 'bg-stone-50/70 dark:bg-stone-800/40 border-stone-200 dark:border-stone-700 hover:border-emerald-400'
                    }`}
                  >
                    <div
                      className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
                        isSelected
                          ? 'bg-emerald-600 text-white'
                          : 'bg-stone-200 dark:bg-stone-700 text-stone-700 dark:text-stone-200'
                      }`}
                    >
                      <Play className="w-4 h-4 fill-current" />
                    </div>
                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="text-xs font-bold text-stone-900 dark:text-white leading-snug">
                        {ep.title}
                      </div>
                      <div className="text-[11px] text-stone-500 dark:text-stone-400 flex items-center gap-1.5">
                        <span>{ep.category}</span>
                        <span aria-hidden="true">·</span>
                        <span>{ep.scenes.length} مشاهد</span>
                        <span aria-hidden="true">·</span>
                        <span>{ep.durationLabel}</span>
                        {ep.isCustom && (
                          <>
                            <span aria-hidden="true">·</span>
                            <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
                              حلقة مخصصة
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

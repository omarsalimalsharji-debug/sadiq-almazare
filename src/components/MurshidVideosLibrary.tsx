import React, { useEffect, useMemo, useState } from 'react';
import { Clapperboard, PlayCircle, VideoOff, RefreshCw, Clock3 } from 'lucide-react';
import { INITIAL_CARTOON_EPISODES } from '../data/cartoonEpisodesData.ts';

interface MediaEpisode {
  id: string;
  video1080pUrl?: string;
  video480pUrl?: string;
  durationSec?: number;
}

interface MurshidVideosLibraryProps {
  initialEpisodeId?: string | null;
}

export const MurshidVideosLibrary: React.FC<MurshidVideosLibraryProps> = ({ initialEpisodeId }) => {
  const [mediaEpisodes, setMediaEpisodes] = useState<Record<string, MediaEpisode>>({});
  const [selectedId, setSelectedId] = useState<string>(initialEpisodeId || INITIAL_CARTOON_EPISODES[0]?.id || '');
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  const selectedEpisode = useMemo(
    () => INITIAL_CARTOON_EPISODES.find((episode) => episode.id === selectedId) || INITIAL_CARTOON_EPISODES[0],
    [selectedId]
  );
  const selectedMedia = selectedEpisode ? mediaEpisodes[selectedEpisode.id] : undefined;

  const loadManifest = async () => {
    setLoading(true);
    setLoadError('');
    try {
      const response = await fetch('/api/cartoon/reviews', { cache: 'no-store' });
      if (!response.ok) throw new Error('تعذر الوصول إلى مكتبة المقاطع.');
      const data = await response.json();
      const episodes = Array.isArray(data?.mediaManifest?.episodes) ? data.mediaManifest.episodes : [];
      const next: Record<string, MediaEpisode> = {};
      for (const item of episodes) {
        if (item && typeof item.id === 'string') next[item.id] = item;
      }
      setMediaEpisodes(next);
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : 'تعذر تحميل بيانات المقاطع.');
      setMediaEpisodes({});
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadManifest(); }, []);
  useEffect(() => {
    if (initialEpisodeId && INITIAL_CARTOON_EPISODES.some((episode) => episode.id === initialEpisodeId)) {
      setSelectedId(initialEpisodeId);
    }
  }, [initialEpisodeId]);

  if (!selectedEpisode) return null;
  const videoUrl = selectedMedia?.video480pUrl || selectedMedia?.video1080pUrl || '';
  const poster = selectedEpisode.heroArtwork;

  return (
    <section className="max-w-5xl mx-auto space-y-5 overflow-x-hidden">
      <header className="rounded-3xl border border-emerald-200/70 dark:border-emerald-900/50 bg-white dark:bg-[#132247] p-4 sm:p-6">
        <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400 text-xs font-bold">
          <Clapperboard className="w-4 h-4" />
          <span>مكتبة فيديوهات مُرشد الزراعية</span>
        </div>
        <h1 className="mt-2 text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white">شاهد وتعلّم مع مُرشد</h1>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">اختر المقطع وشاهده مباشرة. لا توجد أدوات إنتاج أو مونتاج في هذه الصفحة.</p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1.5fr)_minmax(260px,0.8fr)] gap-4 items-start">
        <div className="rounded-3xl overflow-hidden bg-slate-950 border border-slate-200 dark:border-slate-700 shadow-lg">
          {videoUrl ? (
            <video
              key={videoUrl}
              controls
              playsInline
              preload="metadata"
              poster={poster}
              className="w-full aspect-video bg-black object-contain"
            >
              <source src={videoUrl} type="video/mp4" />
              متصفحك لا يدعم تشغيل الفيديو.
            </video>
          ) : (
            <div className="aspect-video flex flex-col items-center justify-center text-center text-white p-5 bg-gradient-to-br from-slate-900 via-[#132247] to-slate-950">
              <VideoOff className="w-10 h-10 text-amber-300 mb-3" />
              <div className="font-bold text-base">الفيديو النهائي غير متاح حالياً</div>
              <p className="text-xs text-slate-300 mt-2 max-w-md leading-relaxed">
                هذا الدرس مسجل في المكتبة، لكن ملف MP4 النهائي لم يُرفع إلى الخادم بعد. سنعرضه هنا فور جاهزيته بدلاً من تشغيل مشاهد تجريبية على أنها فيديو نهائي.
              </p>
              {loading && <span className="mt-3 text-xs text-slate-400">جارٍ التحقق من ملفات الفيديو…</span>}
              {!loading && <button type="button" onClick={loadManifest} className="mt-3 inline-flex items-center gap-2 rounded-xl bg-white/10 px-3 py-2 text-xs font-bold hover:bg-white/20"><RefreshCw className="w-3.5 h-3.5" /> إعادة الفحص</button>}
            </div>
          )}
          <div className="p-4 bg-white dark:bg-[#132247]">
            <h2 className="font-extrabold text-slate-900 dark:text-white">{selectedEpisode.title}</h2>
            <div className="mt-2 flex flex-wrap gap-3 text-xs text-slate-500 dark:text-slate-300">
              <span>{selectedEpisode.category}</span>
              {selectedMedia?.durationSec ? <span className="inline-flex items-center gap-1"><Clock3 className="w-3 h-3" />{Math.round(selectedMedia.durationSec)} ثانية</span> : <span>{selectedEpisode.durationLabel}</span>}
            </div>
            <p className="mt-3 text-sm leading-relaxed text-slate-700 dark:text-slate-200">{selectedEpisode.takeaway}</p>
          </div>
        </div>

        <aside className="space-y-2">
          <div className="flex items-center justify-between px-1">
            <h2 className="font-bold text-sm text-slate-900 dark:text-white">المقاطع المتاحة</h2>
            <span className="text-xs text-slate-500">{INITIAL_CARTOON_EPISODES.length} دروس</span>
          </div>
          {INITIAL_CARTOON_EPISODES.map((episode) => {
            const hasVideo = Boolean(mediaEpisodes[episode.id]?.video480pUrl || mediaEpisodes[episode.id]?.video1080pUrl);
            const active = selectedEpisode.id === episode.id;
            return (
              <button
                key={episode.id}
                type="button"
                onClick={() => setSelectedId(episode.id)}
                className={`w-full text-right rounded-2xl border p-3 flex items-start gap-3 transition-colors ${active ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/40' : 'border-slate-200 dark:border-sky-300/15 bg-white dark:bg-[#132247] hover:border-emerald-400'}`}
              >
                <span className="w-10 h-10 shrink-0 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-xl">🌴</span>
                <span className="min-w-0 flex-1">
                  <span className="block text-xs font-bold text-slate-900 dark:text-white leading-relaxed">{episode.title}</span>
                  <span className="mt-1 flex items-center gap-1.5 text-[10px] text-slate-500 dark:text-slate-400">
                    {hasVideo ? <PlayCircle className="w-3.5 h-3.5 text-emerald-600" /> : <VideoOff className="w-3.5 h-3.5 text-amber-600" />}
                    {hasVideo ? 'فيديو جاهز للمشاهدة' : 'الفيديو قيد التجهيز'}
                  </span>
                </span>
              </button>
            );
          })}
          {loadError && <p className="text-xs text-amber-700 dark:text-amber-300 px-1">{loadError}</p>}
        </aside>
      </div>
    </section>
  );
};

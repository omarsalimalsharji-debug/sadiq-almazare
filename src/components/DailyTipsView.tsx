import React, { useEffect, useMemo, useState } from 'react';
import { Lightbulb, MapPin, Droplets, Sprout, ShieldAlert, Volume2, Square, Share2 } from 'lucide-react';
import { useLocation } from '../context/LocationContext.tsx';
import { useShare } from '../context/ShareContext.tsx';
import { MurshidCharacterSvg } from './MurshidCharacterSvg.tsx';
import { speakMurshid, stopAllMurshidAudio } from '../utils/murshidAudio.ts';

const DAILY_AGRICULTURAL_TIPS = [
  {
    id: 1,
    title: 'تنظيم الري في أوقات نشاط الرياح',
    category: 'الري الذكي',
    tip: 'عند اشتداد سرعة الرياح الشرقية أو الشمالية الجافة، يُفضّل تحويل ري المحاصيل إلى فترات الفجر الأولى لتفادي تفكك قطرات الماء وانجرافها ورفع كفاءة الامتصاص.',
    source: 'دليل الإرشاد الزراعي العُماني',
  },
  {
    id: 2,
    title: 'خف عذوق نخيل الخلاص والفرض',
    category: 'نخيل التمر',
    tip: 'إجراء عملية خف الشماريخ من وسط العذق بمقدار الربع خلال أسبوعين من العقد يمنع تزاحم الثمار ويقلل احتمالية الإصابة بحلم الغبار (الغبير) ويرفع وزن التمرة.',
    source: 'بحوث النخيل - وزارة الثروة الزراعية',
  },
  {
    id: 3,
    title: 'التعامل مع ملوحة مياه الآبار الساحلية',
    category: 'التربة والمياه',
    tip: 'إضافة أحماض الهيوميك والفولفيك مع ماء الري كل 20 يوماً يخفف من أثر شوارد الصوديوم والكلوريد على جذور الخضروات في سهل الباطنة.',
    source: 'إدارة التربة والمياه',
  },
  {
    id: 4,
    title: 'التقليم الأخضر لأشجار المانجو والليمون',
    category: 'بساتين الفاكهة',
    tip: 'إزالة النموات المائية والسرطانات المتفرعة من أسفل منطقة التطعيم يوجه طاقة الشجرة نحو الأفرع المثمرة ويسمح بدخول الشمس لطرد الحشرات القشرية.',
    source: 'وقاية المزروعات',
  },
  {
    id: 5,
    title: 'حماية نحل العسل أثناء مكافحة الآفات',
    category: 'البيئة والنحل',
    tip: 'احرص على إخطار النحالين المجاورين قبل موعد الرش بـ 48 ساعة على الأقل، واستخدم المبيدات المصرّح بها فقط بعد غياب الشمس التزاماً بالقرار 160/2023.',
    source: 'جمعية النحالين العُمانية',
  },
  {
    id: 6,
    title: 'تغطية قواعد الأشجار بملش الخوص الطبيعي',
    category: 'التربة والمياه',
    tip: 'وضع بقايا سعف النخيل المفروم حول أحواض الأشجار في القيظ يخفض حرارة التربة السطحية بمقدار 5 درجات مئوية ويقلل فقد المياه بالتبخر بنسبة تصل إلى 30%.',
    source: 'مبادرات الزراعة المستدامة بعُمان',
  },
  {
    id: 7,
    title: 'صيانة قنوات الفلج قبل موسم الصيف',
    category: 'الري الذكي',
    tip: 'تنظيف سواقي الفلج وإزالة الأعشاب المتطفلة يضمن سرعة تدفق المياه ويقلل الفاقد قبل وصول الحصة إلى أحواض البساتين.',
    source: 'نظام الأفلاج العُماني',
  },
];

const TIP_CATEGORIES = [
  'الكل',
  'الري الذكي',
  'نخيل التمر',
  'التربة والمياه',
  'بساتين الفاكهة',
  'البيئة والنحل',
];

interface DailyTipsViewProps {
  initialTipId?: number;
}

export const DailyTipsView: React.FC<DailyTipsViewProps> = ({ initialTipId }) => {
  const { location, agroAdvice } = useLocation();
  const { openShare } = useShare();
  const [selectedCategory, setSelectedCategory] = useState<string>('الكل');
  const [murshidSpeaking, setMurshidSpeaking] = useState<boolean>(false);

  useEffect(() => {
    return () => {
      stopAllMurshidAudio();
    };
  }, []);

  const todayTip = useMemo(() => {
    if (initialTipId && Number.isFinite(initialTipId)) {
      const matched = DAILY_AGRICULTURAL_TIPS.find((t) => t.id === initialTipId);
      if (matched) return matched;
    }
    const now = new Date();
    const startOfYear = new Date(now.getFullYear(), 0, 0);
    const dayOfYear = Math.floor((now.getTime() - startOfYear.getTime()) / 86400000);
    return DAILY_AGRICULTURAL_TIPS[dayOfYear % DAILY_AGRICULTURAL_TIPS.length];
  }, [initialTipId]);

  const archiveTips = useMemo(() => {
    return DAILY_AGRICULTURAL_TIPS.filter((t) => {
      if (t.id === todayTip.id && selectedCategory === 'الكل') return false;
      return selectedCategory === 'الكل' || t.category === selectedCategory;
    });
  }, [selectedCategory, todayTip.id]);

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="border-b border-stone-200 dark:border-sky-300/15 pb-4">
        <div className="flex items-center gap-2 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
          <Lightbulb className="w-4 h-4" />
          <span>الإرشاد والتوجيه الزراعي المستمر</span>
        </div>
        <h1 className="text-2xl font-bold text-stone-900 dark:text-white mt-1">
          النصائح والإرشادات الزراعية اليومية
        </h1>
        <p className="text-xs sm:text-sm text-stone-600 dark:text-slate-300 mt-0.5">
          معلومات علمية وعملية متجددة يومياً تساعدك على تحسين الإنتاج وتوفير المياه وحماية التربة في محافظات السلطنة.
        </p>
      </div>

      {/* Featured Today Tip Card */}
      <div className="p-6 rounded-3xl bg-gradient-to-r from-[#132247] via-emerald-950 to-[#0e1936] text-white shadow-md border border-emerald-500/30 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="px-3 py-1 rounded-lg text-xs font-bold bg-emerald-500/20 text-emerald-200 border border-emerald-400/30">
            نصيحة اليوم المختارة · {todayTip.category}
          </span>
          <span className="text-xs text-slate-300 font-mono">
            {new Date().toLocaleDateString('ar-OM', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            })}
          </span>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          <MurshidCharacterSvg
            expression={murshidSpeaking ? 'speak' : 'explain'}
            isSpeaking={murshidSpeaking}
            className="w-16 h-18 sm:w-20 sm:h-22 shrink-0"
          />
          <div className="flex-1 space-y-2">
            <h2 className="text-xl font-bold text-white">{todayTip.title}</h2>
            <p className="text-sm leading-relaxed text-emerald-50 text-justify">{todayTip.tip}</p>
          </div>
        </div>

        <div className="pt-2 flex flex-wrap items-center justify-between gap-3 border-t border-white/10">
          <div className="text-[11px] text-emerald-300">المصدر المعتمد: {todayTip.source}</div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() =>
                openShare({
                  kind: 'tip',
                  title: todayTip.title,
                  summary: todayTip.tip,
                  categoryLabel: todayTip.category,
                  locationLabel: `${location.governorate} · ${location.wilayat}`,
                  page: 'daily_tips',
                  itemId: String(todayTip.id),
                  authorOrSource: todayTip.source,
                })
              }
              className="min-h-[44px] px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white border border-white/20 text-xs font-bold flex items-center gap-2 transition-colors whitespace-nowrap shrink-0"
            >
              <Share2 className="w-4 h-4 text-emerald-300" />
              <span>مشاركة النصيحة</span>
            </button>
            <button
              type="button"
              onClick={() => {
                if (murshidSpeaking) {
                  stopAllMurshidAudio(setMurshidSpeaking);
                } else {
                  speakMurshid(`${todayTip.title}. ${todayTip.tip}`, {
                    onSpeakingChange: setMurshidSpeaking,
                  });
                }
              }}
              className="min-h-[44px] px-4 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs font-extrabold flex items-center gap-2 transition-colors whitespace-nowrap shrink-0"
            >
              {murshidSpeaking ? (
                <>
                  <Square className="w-3.5 h-3.5 fill-current" />
                  <span>إيقاف الصوت</span>
                </>
              ) : (
                <>
                  <Volume2 className="w-4 h-4" />
                  <span>استمع لنصيحة اليوم بصوت مرشد</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Location-Aware Regional Agricultural Guidance */}
      <div className="bg-white dark:bg-[#132247] rounded-2xl border border-stone-200 dark:border-sky-300/15 p-5 shadow-sm space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-xs sm:text-sm font-bold text-stone-900 dark:text-white">
            <MapPin className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span>
              توجيه نطاقك الزراعي · {location.governorate} — ولاية {location.wilayat} ({location.village})
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold px-2.5 py-1 rounded-lg bg-emerald-500/12 text-emerald-700 dark:text-emerald-300">
              {agroAdvice.labelAr}
            </span>
            <button
              type="button"
              onClick={() => {
                if (murshidSpeaking) {
                  stopAllMurshidAudio(setMurshidSpeaking);
                } else {
                  speakMurshid(
                    `توجيه ولاية ${location.wilayat}: ${agroAdvice.irrigationHint}. المحاصيل الموصى بها: ${agroAdvice.cropsFocus}. مراقبة الآفات: ${agroAdvice.pestWatch}`,
                    { onSpeakingChange: setMurshidSpeaking }
                  );
                }
              }}
              className="min-h-[40px] px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 whitespace-nowrap"
            >
              {murshidSpeaking ? <Square className="w-3.5 h-3.5 fill-current" /> : <Volume2 className="w-3.5 h-3.5" />}
              <span>{murshidSpeaking ? 'إيقاف' : 'استمع لتوجيه ولايتك'}</span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
          <div className="p-3 rounded-xl bg-stone-50 dark:bg-[#0e1936] border border-stone-200/70 dark:border-sky-300/10 space-y-1">
            <div className="font-bold text-sky-700 dark:text-sky-300 flex items-center gap-1.5">
              <Droplets className="w-3.5 h-3.5 shrink-0" />
              <span>إرشاد الري المحلي</span>
            </div>
            <p className="text-stone-600 dark:text-slate-300 leading-relaxed">
              {agroAdvice.irrigationHint}
            </p>
          </div>

          <div className="p-3 rounded-xl bg-stone-50 dark:bg-[#0e1936] border border-stone-200/70 dark:border-sky-300/10 space-y-1">
            <div className="font-bold text-emerald-700 dark:text-emerald-300 flex items-center gap-1.5">
              <Sprout className="w-3.5 h-3.5 shrink-0" />
              <span>محاصيل الولاية الموصى بها</span>
            </div>
            <p className="text-stone-600 dark:text-slate-300 leading-relaxed">
              {agroAdvice.cropsFocus}
            </p>
          </div>

          <div className="p-3 rounded-xl bg-stone-50 dark:bg-[#0e1936] border border-stone-200/70 dark:border-sky-300/10 space-y-1">
            <div className="font-bold text-amber-700 dark:text-amber-300 flex items-center gap-1.5">
              <ShieldAlert className="w-3.5 h-3.5 shrink-0" />
              <span>مراقبة الآفات الحالية</span>
            </div>
            <p className="text-stone-600 dark:text-slate-300 leading-relaxed">
              {agroAdvice.pestWatch}
            </p>
          </div>
        </div>
      </div>

      {/* Category Filter + Archive Grid */}
      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-xs font-bold text-stone-800 dark:text-slate-200">
            أرشيف النصائح الزراعية الميدانية:
          </h3>
          <div className="flex flex-wrap items-center gap-1.5">
            {TIP_CATEGORIES.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                className={`min-h-[40px] px-3 py-1.5 rounded-lg text-[11px] font-bold whitespace-nowrap transition-colors ${
                  selectedCategory === cat
                    ? 'bg-emerald-600 text-white'
                    : 'bg-stone-100 dark:bg-[#132247] text-stone-600 dark:text-slate-300 border border-stone-200 dark:border-sky-300/15'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {archiveTips.map((item) => (
            <div
              key={item.id}
              className="bg-white dark:bg-[#132247] rounded-2xl border border-stone-200 dark:border-sky-300/15 p-5 shadow-sm space-y-2 flex flex-col justify-between"
            >
              <div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300">
                  {item.category}
                </span>
                <h4 className="text-sm font-bold text-stone-900 dark:text-white mt-1.5">
                  {item.title}
                </h4>
                <p className="text-xs text-stone-600 dark:text-slate-300 leading-relaxed mt-1">
                  {item.tip}
                </p>
              </div>

              <div className="pt-3 border-t border-stone-100 dark:border-sky-300/15 flex items-center justify-between gap-2">
                <span className="text-[10px] text-stone-400 truncate">{item.source}</span>
                <button
                  type="button"
                  onClick={() =>
                    openShare({
                      kind: 'tip',
                      title: item.title,
                      summary: item.tip,
                      categoryLabel: item.category,
                      locationLabel: `${location.governorate} · ${location.wilayat}`,
                      page: 'daily_tips',
                      itemId: String(item.id),
                      authorOrSource: item.source,
                    })
                  }
                  className="min-h-[36px] px-2.5 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 text-[11px] font-bold flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0"
                >
                  <Share2 className="w-3.5 h-3.5" />
                  <span>مشاركة</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

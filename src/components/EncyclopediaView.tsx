import React, { useEffect, useState } from 'react';
import {
  BookOpen,
  Search,
  Share2,
  ChevronDown,
  ChevronUp,
  Volume2,
  Square,
} from 'lucide-react';
import { useShare } from '../context/ShareContext.tsx';
import { speakMurshid, stopAllMurshidAudio } from '../utils/murshidAudio.ts';

interface Article {
  id: string;
  title: string;
  category: string;
  summary: string;
  content: string[];
  tips: string[];
}

const ENCYCLOPEDIA_ARTICLES: Article[] = [
  {
    id: "art-1",
    title: "أصناف نخيل التمر العمانية: دورة الرعاية والإنتاج التجاري",
    category: "النخيل والتمور",
    summary: "توثيق لأشهر أصناف التمور التجارية في عُمان وخصائص كل صنف من التلقيح حتى الجداد.",
    content: [
      "تعتبر سلطنة عُمان من أقدم مواطن زراعة نخيل التمر في العالم، حيث تحتوي على أكثر من ثمانية ملايين نخلة تضم ما يفوق 250 صنفاً معروفاً.",
      "تمر الخلاص: يعتبر سيد التمور في واحات الظاهرة والداخلية والباطنة، ويتميز بحلاوته الفائقة وقوامه الكهرماني ولونه الذهبي، وينضج في منتصف موسم القيظ.",
      "تمر الفرض: المحصول التخزيني والتصديري الأول في عُمان؛ يتميز بنسبة سككرياته المتوازنة ومقاومته للتلف وسهولة كبزه وتعبئته، وتزرع منه ملايين الأشجار ضمن مشروعات المليون نخلة.",
      "تمر النغال والمزناج: يتميزان بالتبكير الفائق في النضج؛ فهما يبشران بدخول موسم القيظ (طباشير الرطب) في أواخر شهر مايو ويحظيان بأسعار قياسية في بداية الموسم."
    ],
    tips: [
      "اختر 3-5 شماريخ ذكرية ناضجة لكل عذق أنثوي وقت التلقيح.",
      "احرص على خف 15-20% من الشماريخ الداخلية لتكبير حجم الثمار المتبقية.",
      "استخدم المصائد الفيرمونية لمراقبة سوسة النخيل على مدار العام."
    ]
  },
  {
    id: "art-2",
    title: "هندسة الأفلاج العمانية: عبقرية إدارة المياه عبر القرون",
    category: "إدارة المياه والري",
    summary: "شرح لأنواع الأفلاج الثلاثة الداوودية والغيلية والعينية ونظام توزيع الحصص الزمنية (الأثر).",
    content: [
      "نظام الأفلاج العماني ليس مجرد قناة مائية بل منظومة اجتماعية واقتصادية وقانونية بالغة الدقة مسجلة على لائحة التراث العالمي لمنظمة اليونسكو.",
      "الفلج الداوودي: يمتد لأميال تحت الأرض في أنفاق شاقة تبدأ من أم الفلج العميقة لتصل إلى مزارع القرية بالجاذبية البحتة دون أي مضخات، مثل فلج دارس وفلج الخطمين.",
      "الفلج الغيلي: يعتمد على تجمع مياه الأودية والطبقات السطحية الجارية ويتأثر سريعاً بمواسم هطول الأمطار والأمطار الخريفية كفلج الجيلة.",
      "الفلج العيني: يستمد مياهه من عيون طبيعية ساخنة أو باردة تتدفق من باطن الجبال كعين الكسفة في الرستاق وعين الثوارة في نخل.",
      "نظام الأثر: يقسم اليوم إلى 48 أثراً (الأثر الواحد يعادل حوالي 30 دقيقة)، ويتم توزيع حصص المياه بين ملاك الأراضي وفق سجلات تاريخية متوارثة بالغة العدالة."
    ],
    tips: [
      "صيانة قنوات الفلج (العوامد والساعد) من الطمي سنوياً يرفع تدفق المياه بنسبة 25%.",
      "الربط بين مياه الفلج وخزانات الري الحديث يحمي الحصص من الضياع الليلي."
    ]
  },
  {
    id: "art-3",
    title: "زراعة القمح العماني الأصيل (الميسياني والكوليب)",
    category: "المحاصيل الحقلية",
    summary: "دليل زراعة أصناف القمح المحلية العمانية المقاومة للجفاف والحرارة وإنتاج الخبز العماني التقليدي.",
    content: [
      "يحظى القمح العماني بمكانة استراتيجية في الأمن الغذائي الوطني، وتعد محافظات الداخلية والظاهرة وظفار من أهم مراكز إنتاجه تاريخياً.",
      "صنف الميسياني: قمح عماني صلب يتميز بارتفاع نسبة الجلوتين ولونه الذهبي ونكهته المميزة جداً في إعداد خبز الرقاق العماني والعرسية والهريس.",
      "صنف الكوليب والواديكاني: أصناف متأقلمة مع قلة المياه وتحمل تقلبات الطقس الصحراوي، ويتم بذرها في شهر نوفمبر ليتم الحصاد في مارس وأبريل."
    ],
    tips: [
      "معدل البذار الموصى به: 30 إلى 35 كجم للدونم الواحد.",
      "إضافة دفعة من السماد الفوسفاتي وقت البذر يساعد في تعميق الجذور ومقاومة الرقاد."
    ]
  },
  {
    id: "art-4",
    title: "مدرجات الجبل الأخضر: الرمان والورد العماني والجوز",
    category: "المدرجات الجبلية",
    summary: "الزراعة على ارتفاع 2000 متر في جبال الحجر وتأثير البرودة الشتوية على بساتين الفاكهة.",
    content: [
      "ينفرد الجبل الأخضر في سلطنة عُمان بمناخ متوسطي استثنائي؛ حيث تنخفض درجات الحرارة في الشتاء إلى ما دون الصفر وتعتدل في الصيف حول 25 مئوية.",
      "رمان الجبل الأخضر: يصنف من أروع ثمار الرمان عالمياً لنعومة بذوره وارتفاع سكرياته، ويحتاج إلى تنظيم دقيق للري لمنع تشقق الثمار قبل الجني في سبتمبر.",
      "تقطير ماء الورد العماني: صناعة حرفية عريقة؛ حيث تجمع بتلات الورد الصباحية في أبريل وتوضع في أوانٍ فخارية طينية (البرمة) فوق نار الحطب الهادئة لتقطير خلاصة الورد."
    ],
    tips: [
      "التقليم الشتوي لأشجار الرمان في يناير وإزالة السرطانات يرفع وزن الحبات بنسبة 30%.",
      "الحفاظ على جدران المدرجات الحجرية يمنع انجراف التربة الخصبة مع أمطار السيول."
    ]
  }
];

interface EncyclopediaViewProps {
  initialArticleId?: string | null;
}

export const EncyclopediaView: React.FC<EncyclopediaViewProps> = ({ initialArticleId }) => {
  const { openShare } = useShare();
  const [search, setSearch] = useState<string>('');
  const [expandedId, setExpandedId] = useState<string | null>(
    initialArticleId || ENCYCLOPEDIA_ARTICLES[0].id
  );
  const [speakingArticleId, setSpeakingArticleId] = useState<string | null>(null);

  useEffect(() => {
    if (initialArticleId && ENCYCLOPEDIA_ARTICLES.some((a) => a.id === initialArticleId)) {
      setExpandedId(initialArticleId);
    }
  }, [initialArticleId]);

  useEffect(() => {
    return () => {
      stopAllMurshidAudio();
    };
  }, []);

  const filtered = ENCYCLOPEDIA_ARTICLES.filter(a => 
    a.title.toLowerCase().includes(search.toLowerCase()) ||
    a.category.toLowerCase().includes(search.toLowerCase()) ||
    a.summary.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      
      {/* Header */}
      <div className="border-b border-stone-200 dark:border-stone-800 pb-4">
        <div className="flex items-center gap-2 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
          <BookOpen className="w-4 h-4" />
          <span>المعرفة التراثية والعلمية الموثقة</span>
        </div>
        <h1 className="text-2xl font-bold text-stone-900 dark:text-white mt-1">
          الموسوعة الزراعية العمانية الشاملة
        </h1>
        <p className="text-xs sm:text-sm text-stone-600 dark:text-stone-400 mt-0.5">
          أبحاث ومقالات عملية حول النخيل، هندسة الأفلاج، القمح العماني، وبساتين الجبل الأخضر وظفار.
        </p>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="w-4 h-4 text-stone-400 absolute right-3.5 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="ابحث في الموسوعة (أفلاج، تمور، قمح، رمان...)"
          className="w-full pr-10 pl-4 py-2.5 rounded-xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 text-xs text-stone-900 dark:text-white placeholder:text-stone-400 focus:outline-none focus:ring-1 focus:ring-emerald-500 shadow-sm"
        />
      </div>

      {/* Articles Accordion List */}
      <div className="space-y-4">
        {filtered.map((art) => {
          const isExpanded = expandedId === art.id;

          return (
            <div
              key={art.id}
              className="bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-800 shadow-sm overflow-hidden transition-all"
            >
              <button
                onClick={() => setExpandedId(isExpanded ? null : art.id)}
                className="w-full p-5 text-right flex items-center justify-between gap-4 hover:bg-stone-50 dark:hover:bg-stone-800/50 transition-colors"
              >
                <div>
                  <span className="text-[11px] font-bold px-2.5 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300">
                    {art.category}
                  </span>
                  <h2 className="text-base sm:text-lg font-bold text-stone-900 dark:text-white mt-1.5">
                    {art.title}
                  </h2>
                  <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">
                    {art.summary}
                  </p>
                </div>

                <div className="p-2 rounded-xl bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300 shrink-0">
                  {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                </div>
              </button>

              {isExpanded && (
                <div className="p-5 sm:p-7 pt-2 border-t border-stone-100 dark:border-stone-800 space-y-4 text-xs sm:text-sm text-stone-700 dark:text-stone-300 animate-in fade-in">
                  
                  <div className="space-y-3 leading-relaxed text-justify">
                    {art.content.map((paragraph, pIdx) => (
                      <p key={pIdx}>{paragraph}</p>
                    ))}
                  </div>

                  {art.tips && art.tips.length > 0 && (
                    <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-xs">
                      <strong className="block text-emerald-900 dark:text-emerald-300 font-bold mb-2">
                        إرشادات ميدانية للمزارع:
                      </strong>
                      <ul className="space-y-1.5 text-emerald-950 dark:text-emerald-200">
                        {art.tips.map((tip, tIdx) => (
                          <li key={tIdx} className="flex items-start gap-2">
                            <span className="text-emerald-600 font-bold">•</span>
                            <span>{tip}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  <div className="pt-3 border-t border-stone-100 dark:border-stone-800 flex flex-wrap items-center justify-between gap-2.5">
                    <span className="text-[11px] text-stone-500 dark:text-stone-400">
                      الموسوعة الزراعية العمانية · {art.category}
                    </span>
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          if (speakingArticleId === art.id) {
                            stopAllMurshidAudio();
                            setSpeakingArticleId(null);
                            return;
                          }
                          const fullNarration = [
                            art.title,
                            art.summary,
                            ...art.content,
                            ...(art.tips ? ['إرشادات ميدانية للمزارع:', ...art.tips] : []),
                          ].join('. ');
                          speakMurshid(fullNarration, {
                            mood: 'cheerful',
                            onSpeakingChange: (speaking) => {
                              setSpeakingArticleId(speaking ? art.id : null);
                            },
                            onEnd: () => setSpeakingArticleId(null),
                          });
                        }}
                        className="min-h-[44px] px-3.5 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs font-extrabold flex items-center gap-1.5 whitespace-nowrap transition-colors"
                      >
                        {speakingArticleId === art.id ? (
                          <>
                            <Square className="w-3.5 h-3.5 fill-current" />
                            <span>إيقاف القراءة</span>
                          </>
                        ) : (
                          <>
                            <Volume2 className="w-4 h-4" />
                            <span>استمع بصوت مُرشد</span>
                          </>
                        )}
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          openShare({
                            kind: 'article',
                            title: art.title,
                            summary: art.summary,
                            highlights: art.tips.slice(0, 3),
                            categoryLabel: art.category,
                            page: 'encyclopedia',
                            itemId: art.id,
                            authorOrSource: 'الموسوعة الزراعية العمانية',
                          })
                        }
                        className="min-h-[44px] px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 whitespace-nowrap transition-colors"
                      >
                        <Share2 className="w-4 h-4" />
                        <span>مشاركة المقال</span>
                      </button>
                    </div>
                  </div>

                </div>
              )}
            </div>
          );
        })}
      </div>

    </div>
  );
};

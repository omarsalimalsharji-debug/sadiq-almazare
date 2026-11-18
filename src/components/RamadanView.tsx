import React, { useEffect, useState } from 'react';
import { 
  MoonStar, 
  Sparkles, 
  Calendar, 
  Apple, 
  Heart, 
  AlertCircle, 
  Clock, 
  ChevronRight, 
  ChevronLeft, 
  BookOpen, 
  Share2,
  ShieldCheck,
  Volume2,
  Square
} from 'lucide-react';
import { RAMADAN_30_FACTS, RAMADAN_NUTRITION_TIPS, RamadanInsight, RamadanNutritionTip } from '../data/agriculturalData.ts';
import { useShare } from '../context/ShareContext.tsx';
import { speakMurshid, stopAllMurshidAudio } from '../utils/murshidAudio.ts';

interface RamadanViewProps {
  initialDay?: number;
}

export const RamadanView: React.FC<RamadanViewProps> = ({ initialDay }) => {
  const { openShare } = useShare();
  // Current Ramadan Day Selector (1 to 30)
  const [selectedDay, setSelectedDay] = useState<number>(() =>
    initialDay && initialDay >= 1 && initialDay <= 30 ? initialDay : 14
  );
  const [activeTab, setActiveTab] = useState<'facts' | 'nutrition' | 'archive'>('facts');
  const [murshidSpeaking, setMurshidSpeaking] = useState<boolean>(false);

  useEffect(() => {
    if (initialDay && initialDay >= 1 && initialDay <= 30) {
      setSelectedDay(initialDay);
    }
  }, [initialDay]);

  useEffect(() => {
    stopAllMurshidAudio(setMurshidSpeaking);
  }, [selectedDay, activeTab]);

  useEffect(() => {
    return () => {
      stopAllMurshidAudio();
    };
  }, []);

  // Daily greetings rotation
  const RAMADAN_GREETINGS = [
    "مبارك عليكم الشهر الفضيل، تقبل الله صيامكم وطاعاتكم وأصلح زروعكم وثماركم.",
    "رمضان كريم، نسأل الله أن يبارك في أرض عُمان الطيبة وأهلها ومياه أفلاجها.",
    "تقبل الله منا ومنكم صالح الأعمال، صياماً مقبولاً وذنباً مغفوراً وبركة في كل غرس.",
    "كل عام وأنتم بخير، طاب صومكم بذكر الله وشكر نعمه الوافرة في حقول وسهول الوطن."
  ];
  const greeting = RAMADAN_GREETINGS[(selectedDay - 1) % RAMADAN_GREETINGS.length];

  const currentFact: RamadanInsight = RAMADAN_30_FACTS.find(f => f.day === selectedDay) || RAMADAN_30_FACTS[0];
  const currentNutrition: RamadanNutritionTip = RAMADAN_NUTRITION_TIPS.find(n => n.day === selectedDay) || RAMADAN_NUTRITION_TIPS[(selectedDay - 1) % RAMADAN_NUTRITION_TIPS.length];

  const handleShareDayContent = () => {
    if (activeTab === 'nutrition') {
      openShare({
        kind: 'tip',
        title: `النصيحة الغذائية ليوم ${selectedDay} رمضان: ${currentNutrition.item}`,
        summary: currentNutrition.intakeAdvice,
        highlights: currentNutrition.provenBenefits.slice(0, 3),
        categoryLabel: `${currentNutrition.category} · رمضان 1447 هـ`,
        badgeMetric: `اليوم ${selectedDay} رمضان`,
        page: 'daily_tips',
        itemId: String(selectedDay),
        authorOrSource: 'الإرشاد الغذائي الرمضاني — صديق المزارع',
      });
      return;
    }

    openShare({
      kind: 'tip',
      title: `${currentFact.title} (${selectedDay} رمضان)`,
      summary: currentFact.fact,
      highlights: currentFact.hadithOrWisdom ? [currentFact.hadithOrWisdom] : undefined,
      categoryLabel: `${currentFact.category} · رمضان 1447 هـ`,
      badgeMetric: `اليوم ${selectedDay} رمضان`,
      page: 'daily_tips',
      itemId: String(selectedDay),
      authorOrSource: 'مراجع وزارة الثروة الزراعية والسمكية وموارد المياه',
    });
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      
      {/* Ramadan Hero Header Banner */}
      <div className="relative rounded-3xl overflow-hidden bg-gradient-to-r from-emerald-950 via-stone-900 to-amber-950 text-white p-6 sm:p-8 border border-amber-500/30 shadow-lg ramadan-pattern">
        
        {/* Subtle decorative crescent & stars */}
        <div className="absolute top-4 left-6 opacity-20 pointer-events-none">
          <MoonStar className="w-24 h-24 text-amber-300" />
        </div>

        <div className="relative z-10 max-w-2xl space-y-3">
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 rounded-full text-xs font-bold bg-amber-500/20 text-amber-300 border border-amber-400/30 flex items-center gap-1.5">
              <MoonStar className="w-3.5 h-3.5 text-amber-400" />
              <span>الهوية الرمضانية الذكية · سلطنة عُمان</span>
            </span>
            <span className="text-xs text-stone-300 font-mono">
              1447 هـ / 2026 م
            </span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-extrabold text-amber-100 tracking-tight">
            شهر رمضان المبارك في واحات عُمان
          </h1>

          <p className="text-xs sm:text-sm text-stone-200 leading-relaxed italic">
            «{greeting}»
          </p>

          {/* Ramadan Day & Calendar Details */}
          <div className="pt-2 flex flex-wrap items-center gap-4 text-xs">
            <div className="flex items-center gap-2 bg-emerald-950/70 border border-emerald-700/50 px-3 py-1.5 rounded-xl">
              <Calendar className="w-4 h-4 text-amber-400" />
              <span>التاريخ الهجري المعتمد:</span>
              <strong className="font-bold text-amber-300 font-mono">{selectedDay} رمضان 1447 هـ</strong>
            </div>
            <div className="text-stone-300 text-[11px]">
              توقيت سلطنة عُمان (مسقط) · الفجر 05:08 · المغرب 18:24
            </div>
          </div>
        </div>

        {/* Day Selector Pills Bar (1 to 30) */}
        <div className="mt-6 pt-5 border-t border-stone-800/80">
          <div className="flex items-center justify-between text-xs text-stone-300 mb-2 font-semibold">
            <span>اختر اليوم الرمضاني للاطلاع على المعلومة والنصيحة الغذائية:</span>
            <span className="font-mono text-amber-400">اليوم {selectedDay} من 30</span>
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto pb-2 scrollbar-none">
            {Array.from({ length: 30 }, (_, i) => i + 1).map((d) => (
              <button
                key={d}
                onClick={() => setSelectedDay(d)}
                className={`w-9 h-9 rounded-xl font-mono text-xs font-bold shrink-0 transition-all ${
                  selectedDay === d
                    ? 'bg-amber-500 text-stone-950 shadow-md scale-105'
                    : 'bg-stone-800/80 hover:bg-stone-700 text-stone-300'
                }`}
              >
                {d}
              </button>
            ))}
          </div>
        </div>

      </div>

      {/* Tabs Switcher: 30 Agricultural Insights vs Ramadan Nutrition Advice */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-stone-200 dark:border-stone-800 pb-3">
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
          <button
            onClick={() => setActiveTab('facts')}
            className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
              activeTab === 'facts'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300'
            }`}
          >
            المعلومة الزراعية اليومية ({selectedDay})
          </button>
          <button
            onClick={() => setActiveTab('nutrition')}
            className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
              activeTab === 'nutrition'
                ? 'bg-amber-600 text-white shadow-sm'
                : 'bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300'
            }`}
          >
            النصيحة الغذائية للصائم ({selectedDay})
          </button>
          <button
            onClick={() => setActiveTab('archive')}
            className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
              activeTab === 'archive'
                ? 'bg-stone-900 text-white dark:bg-stone-700 shadow-sm'
                : 'bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300'
            }`}
          >
            أرشيف الـ 30 يوماً
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => {
              if (murshidSpeaking) {
                stopAllMurshidAudio(setMurshidSpeaking);
                return;
              }
              const speechBody =
                activeTab === 'nutrition'
                  ? `النصيحة الغذائية ليوم ${selectedDay} رمضان: ${currentNutrition.item}. ${currentNutrition.intakeAdvice}. ${currentNutrition.provenBenefits.slice(0, 2).join('. ')}`
                  : `${currentFact.title}. ${currentFact.fact}. ${currentFact.hadithOrWisdom || ''}`;
              speakMurshid(speechBody, {
                mood: 'cheerful',
                onSpeakingChange: setMurshidSpeaking,
              });
            }}
            className="min-h-[44px] px-3.5 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs font-extrabold flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0"
          >
            {murshidSpeaking ? (
              <>
                <Square className="w-3.5 h-3.5 fill-current" />
                <span>إيقاف الصوت</span>
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
            onClick={handleShareDayContent}
            className="min-h-[44px] px-3.5 py-2 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 text-amber-800 dark:text-amber-300 border border-amber-400/30 text-xs font-bold flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0"
          >
            <Share2 className="w-4 h-4" />
            <span>مشاركة بطاقة اليوم</span>
          </button>
        </div>
      </div>

      {/* Tab 1: 30 Agricultural Facts Card */}
      {activeTab === 'facts' && (
        <div className="bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-800 p-6 sm:p-8 shadow-sm space-y-5 animate-in fade-in">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold px-3 py-1 rounded-md bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300">
              {currentFact.category}
            </span>
            <span className="text-xs text-stone-400 font-mono">
              اليوم الرمضاني رقم {currentFact.day}
            </span>
          </div>

          <h2 className="text-xl sm:text-2xl font-bold text-stone-900 dark:text-white leading-snug">
            {currentFact.title}
          </h2>

          <p className="text-sm sm:text-base text-stone-700 dark:text-stone-300 leading-relaxed text-justify bg-stone-50 dark:bg-stone-800/40 p-5 rounded-2xl border border-stone-200 dark:border-stone-700">
            {currentFact.fact}
          </p>

          {currentFact.hadithOrWisdom && (
            <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-300/40 text-xs text-amber-900 dark:text-amber-200 text-center font-medium">
              {currentFact.hadithOrWisdom}
            </div>
          )}

          {/* Previous / Next Day Navigation */}
          <div className="flex items-center justify-between pt-4 border-t border-stone-100 dark:border-stone-800 text-xs">
            <button
              disabled={selectedDay <= 1}
              onClick={() => setSelectedDay(prev => Math.max(1, prev - 1))}
              className="px-4 py-2 rounded-xl bg-stone-100 dark:bg-stone-800 disabled:opacity-40 flex items-center gap-1 font-semibold"
            >
              <ChevronRight className="w-4 h-4" />
              <span>اليوم السابق</span>
            </button>
            <span className="text-stone-400 text-[11px]">
              معلومة موثوقة من مراجع وزارة الثروة الزراعية
            </span>
            <button
              disabled={selectedDay >= 30}
              onClick={() => setSelectedDay(prev => Math.min(30, prev + 1))}
              className="px-4 py-2 rounded-xl bg-emerald-600 text-white disabled:opacity-40 flex items-center gap-1 font-bold"
            >
              <span>اليوم التالي</span>
              <ChevronLeft className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Tab 2: Daily Ramadan Nutrition Tip Card */}
      {activeTab === 'nutrition' && (
        <div className="bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-800 p-6 sm:p-8 shadow-sm space-y-6 animate-in fade-in">
          
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-stone-100 dark:border-stone-800 pb-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold px-2.5 py-0.5 rounded bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300">
                  {currentNutrition.category}
                </span>
                <span className="text-xs text-stone-400">
                  موسم التوفر: {currentNutrition.seasonalAvailability}
                </span>
              </div>
              <h2 className="text-2xl font-bold text-stone-900 dark:text-white mt-1">
                {currentNutrition.item}
              </h2>
            </div>

            <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-300/40 text-amber-600 flex items-center justify-center text-2xl shadow-inner">
              🍎
            </div>
          </div>

          {/* Key Nutrients Badges (unboxed clean labels) */}
          <div>
            <div className="text-xs font-semibold text-stone-500 dark:text-stone-400 mb-2">
              أبرز العناصر الغذائية:
            </div>
            <div className="flex flex-wrap gap-2 text-xs text-stone-700 dark:text-stone-300">
              {currentNutrition.keyNutrients.map((nutr, idx) => (
                <span key={idx} className="bg-stone-100 dark:bg-stone-800 px-3 py-1 rounded-lg">
                  {nutr}
                </span>
              ))}
            </div>
          </div>

          {/* Proven Benefits (3 verified benefits) */}
          <div className="space-y-2">
            <h3 className="text-xs font-bold text-stone-800 dark:text-stone-200 flex items-center gap-1.5">
              <Heart className="w-4 h-4 text-rose-500" />
              <span>الفوائد الغذائية المثبتة علمياً:</span>
            </h3>
            <ul className="space-y-2 text-xs sm:text-sm text-stone-600 dark:text-stone-300">
              {currentNutrition.provenBenefits.map((benefit, idx) => (
                <li key={idx} className="flex items-start gap-2 bg-stone-50 dark:bg-stone-800/40 p-3 rounded-xl border border-stone-200/60 dark:border-stone-700/60">
                  <span className="text-emerald-500 font-bold shrink-0">✓</span>
                  <span>{benefit}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Intake Advice for Iftar or Suhur */}
          <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-xs sm:text-sm text-emerald-950 dark:text-emerald-200">
            <div className="font-bold flex items-center gap-1.5 mb-1 text-emerald-800 dark:text-emerald-300">
              <Clock className="w-4 h-4 text-emerald-600" />
              <span>طريقة التناول في الإفطار أو السحور:</span>
            </div>
            <p className="leading-relaxed">{currentNutrition.intakeAdvice}</p>
          </div>

          {/* Safe Caution Note (No false medical claims rule) */}
          <div className="p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-xs text-amber-900 dark:text-amber-200 flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <strong className="font-bold block mb-0.5">تنبيه ومحذور صحي معتمد:</strong>
              <p className="text-[11px] leading-relaxed">{currentNutrition.cautions}</p>
            </div>
          </div>

        </div>
      )}

      {/* Tab 3: Complete 30-Day Archive List */}
      {activeTab === 'archive' && (
        <div className="bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-800 p-6 shadow-sm space-y-4 animate-in fade-in">
          <h2 className="text-base font-bold text-stone-900 dark:text-white">
            الأرشيف الكامل لمعلومات شهر رمضان المبارك (30 يوماً)
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {RAMADAN_30_FACTS.map((fact) => (
              <button
                key={fact.day}
                onClick={() => {
                  setSelectedDay(fact.day);
                  setActiveTab('facts');
                }}
                className="p-3 rounded-xl border border-stone-200 dark:border-stone-700 hover:border-amber-500 text-right text-xs transition-colors bg-stone-50/50 dark:bg-stone-800/40 flex items-start gap-3"
              >
                <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-700 dark:text-amber-400 font-bold flex items-center justify-center shrink-0 font-mono">
                  {fact.day}
                </div>
                <div>
                  <div className="font-bold text-stone-900 dark:text-white line-clamp-1">
                    {fact.title}
                  </div>
                  <div className="text-[11px] text-stone-500 line-clamp-1 mt-0.5">
                    {fact.fact}
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

    </div>
  );
};

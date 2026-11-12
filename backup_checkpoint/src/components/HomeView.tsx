import React from 'react';
import { 
  Scan, 
  Bug, 
  BookOpen, 
  Calendar, 
  Gamepad2, 
  Trophy, 
  Library, 
  Radio, 
  CloudSun, 
  Users, 
  Sparkles, 
  MoonStar, 
  ArrowLeft, 
  ShieldCheck, 
  Lightbulb, 
  CheckCircle2,
  ChevronLeft
} from 'lucide-react';
import { ActivePage, UserProfile } from '../types/index.ts';
import { QuranPlayer } from './QuranPlayer.tsx';

interface HomeViewProps {
  onNavigate: (page: ActivePage) => void;
  isRamadanMode: boolean;
  user: UserProfile;
}

export const HomeView: React.FC<HomeViewProps> = ({
  onNavigate,
  isRamadanMode,
  user
}) => {
  return (
    <div className="max-w-6xl mx-auto space-y-8">
      
      {/* 1. MANDATORY REQUIREMENT: Holy Quran Section at the top of Home page before other services */}
      <section aria-label="قسم القرآن الكريم">
        <QuranPlayer />
      </section>

      {/* 2. Hero Section with Generated Omani Farm Photography */}
      <section className="relative rounded-3xl overflow-hidden bg-stone-900 border border-stone-200 dark:border-stone-800 shadow-lg text-white">
        
        {/* Background photo */}
        <div className="absolute inset-0">
          <img
            src="/src/assets/images/hero_oman_farm_1794476730497.jpg"
            alt="واحة النخيل والأفلاج العمانية"
            className="w-full h-full object-cover opacity-35"
            referrerPolicy="no-referrer"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-stone-950 via-stone-950/60 to-transparent" />
        </div>

        <div className="relative z-10 p-6 sm:p-10 max-w-3xl space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 flex items-center gap-1.5 backdrop-blur-sm">
              <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
              <span>الإصدار الشامل المطور 2026</span>
            </span>
            <span className="text-xs text-stone-300 font-medium">
              صاحب الفكرة والمدير العام: <strong className="text-white font-bold">عمر الشرجي</strong>
            </span>
          </div>

          <h1 className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight leading-tight">
            صديق المزارع العماني
            <span className="block text-emerald-400 font-bold text-xl sm:text-2xl mt-1">
              الذكاء الاصطناعي في خدمة نخيل وأرض عُمان
            </span>
          </h1>

          <p className="text-xs sm:text-sm text-stone-200 leading-relaxed text-justify max-w-2xl">
            منصتك الرقمية المتكاملة لتشخيص أمراض النباتات والآفات فورياً بالذكاء الاصطناعي، تصفح المكتبة الزراعية، الاستماع للبث الإذاعي والقرآن الكريم، والمشاركة في الألعاب والمسابقات الثقافية بروح الهوية العمانية الأصيلة.
          </p>

          <div className="pt-2 flex flex-wrap items-center gap-3">
            <button
              onClick={() => onNavigate('plant_diagnosis')}
              className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-lg transition-transform hover:scale-102 flex items-center gap-2"
            >
              <Scan className="w-4 h-4" />
              <span>تشخيص نبات مصاب فوراً</span>
            </button>

            <button
              onClick={() => onNavigate('games')}
              className="px-5 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white border border-white/20 font-semibold text-xs backdrop-blur-sm transition-colors flex items-center gap-2"
            >
              <Gamepad2 className="w-4 h-4 text-amber-400" />
              <span>الألعاب والمسابقات (6 ألعاب)</span>
            </button>

            <button
              onClick={() => onNavigate('library')}
              className="px-5 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white border border-white/20 font-semibold text-xs backdrop-blur-sm transition-colors flex items-center gap-2"
            >
              <Library className="w-4 h-4 text-cyan-300" />
              <span>المكتبة الزراعية (12 تصنيفاً)</span>
            </button>
          </div>
        </div>
      </section>

      {/* 3. Ramadan Spotlight Banner if Ramadan mode is enabled */}
      {isRamadanMode && (
        <section className="p-5 sm:p-6 rounded-3xl bg-gradient-to-r from-amber-950 via-stone-900 to-emerald-950 border border-amber-500/40 text-white flex flex-col md:flex-row items-center justify-between gap-5 ramadan-pattern shadow-sm">
          <div className="flex items-center gap-4 text-right">
            <div className="w-14 h-14 rounded-2xl bg-amber-500/20 border border-amber-400/30 text-amber-400 flex items-center justify-center font-bold text-2xl shrink-0">
              <MoonStar className="w-8 h-8" />
            </div>
            <div>
              <div className="text-xs text-amber-300 font-bold flex items-center gap-1.5">
                <span>الهوية الرمضانية الذكية</span>
                <span>·</span>
                <span>سلطنة عُمان</span>
              </div>
              <h3 className="text-lg font-bold text-white mt-0.5">
                30 معلومة زراعية و30 نصيحة غذائية للصائم
              </h3>
              <p className="text-xs text-stone-300 mt-0.5">
                اطلع على معلومة اليوم عن شجرة النخيل والأفلاج ونصيحة التمر والموز والخضار للصائم.
              </p>
            </div>
          </div>

          <button
            onClick={() => onNavigate('daily_tips')}
            className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold text-xs shadow-md shrink-0 flex items-center gap-1.5 self-start md:self-auto"
          >
            <span>عرض قسم رمضان اليوم</span>
            <ChevronLeft className="w-4 h-4" />
          </button>
        </section>
      )}

      {/* 4. Core Agricultural Services Grid (The 19 Services Hub) */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-stone-900 dark:text-white">
              خدمات المنصة الزراعية والتقنية
            </h2>
            <p className="text-xs text-stone-500 dark:text-stone-400">
              جميع الوحدات تعمل فعلياً ومتصلة بقواعد البيانات والذكاء الاصطناعي.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          
          {/* Card 1: AI Plant Diagnosis */}
          <button
            onClick={() => onNavigate('plant_diagnosis')}
            className="p-5 rounded-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 text-right hover:border-emerald-500 transition-all shadow-sm hover:shadow-md flex flex-col justify-between group"
          >
            <div>
              <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mb-3">
                <Scan className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-sm text-stone-900 dark:text-white group-hover:text-emerald-600 transition-colors">
                تشخيص أمراض النباتات (AI)
              </h3>
              <p className="text-xs text-stone-500 dark:text-stone-400 mt-1 leading-relaxed">
                تحليل فوري لصور الأوراق والثمار وتحديد العلاج العضوي والكيميائي.
              </p>
            </div>
            <div className="mt-4 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
              <span>بدء الفحص</span>
              <ChevronLeft className="w-3.5 h-3.5" />
            </div>
          </button>

          {/* Card 2: AI Pest Diagnosis */}
          <button
            onClick={() => onNavigate('pest_diagnosis')}
            className="p-5 rounded-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 text-right hover:border-emerald-500 transition-all shadow-sm hover:shadow-md flex flex-col justify-between group"
          >
            <div>
              <div className="w-10 h-10 rounded-xl bg-red-50 dark:bg-red-950 text-red-600 dark:text-red-400 flex items-center justify-center mb-3">
                <Bug className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-sm text-stone-900 dark:text-white group-hover:text-emerald-600 transition-colors">
                تشخيص الحشرات والآفات
              </h3>
              <p className="text-xs text-stone-500 dark:text-stone-400 mt-1 leading-relaxed">
                سوسة النخيل، دوباس النخيل، صانعات الأنفاق والمكافحة الحيوية.
              </p>
            </div>
            <div className="mt-4 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
              <span>تشخيص الآفة</span>
              <ChevronLeft className="w-3.5 h-3.5" />
            </div>
          </button>

          {/* Card 3: E-Library */}
          <button
            onClick={() => onNavigate('library')}
            className="p-5 rounded-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 text-right hover:border-emerald-500 transition-all shadow-sm hover:shadow-md flex flex-col justify-between group"
          >
            <div>
              <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400 flex items-center justify-center mb-3">
                <Library className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-sm text-stone-900 dark:text-white group-hover:text-emerald-600 transition-colors">
                المكتبة الزراعية (12 تصنيفاً)
              </h3>
              <p className="text-xs text-stone-500 dark:text-stone-400 mt-1 leading-relaxed">
                قراءة إلكترونية مباشرة مع حفظ الصفحات والعلامة المائية.
              </p>
            </div>
            <div className="mt-4 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
              <span>تصفح المراجع</span>
              <ChevronLeft className="w-3.5 h-3.5" />
            </div>
          </button>

          {/* Card 4: Games & Quizzes */}
          <button
            onClick={() => onNavigate('games')}
            className="p-5 rounded-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 text-right hover:border-emerald-500 transition-all shadow-sm hover:shadow-md flex flex-col justify-between group"
          >
            <div>
              <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950 text-amber-600 dark:text-amber-400 flex items-center justify-center mb-3">
                <Gamepad2 className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-sm text-stone-900 dark:text-white group-hover:text-emerald-600 transition-colors">
                الألعاب الزراعية والمسابقات
              </h3>
              <p className="text-xs text-stone-500 dark:text-stone-400 mt-1 leading-relaxed">
                6 ألعاب أصلية بنظام نقاط موثق على الخادم ولوحة متصدرين.
              </p>
            </div>
            <div className="mt-4 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
              <span>دخول التحدي</span>
              <ChevronLeft className="w-3.5 h-3.5" />
            </div>
          </button>

          {/* Card 5: Agricultural Calendar */}
          <button
            onClick={() => onNavigate('calendar')}
            className="p-5 rounded-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 text-right hover:border-emerald-500 transition-all shadow-sm hover:shadow-md flex flex-col justify-between group"
          >
            <div>
              <div className="w-10 h-10 rounded-xl bg-teal-50 dark:bg-teal-950 text-teal-600 dark:text-teal-400 flex items-center justify-center mb-3">
                <Calendar className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-sm text-stone-900 dark:text-white group-hover:text-emerald-600 transition-colors">
                التقويم الزراعي العماني
              </h3>
              <p className="text-xs text-stone-500 dark:text-stone-400 mt-1 leading-relaxed">
                مواعيد التلقيح والجداد وبذار القمح لجميع شهور السنة.
              </p>
            </div>
            <div className="mt-4 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
              <span>عرض جدول الشهور</span>
              <ChevronLeft className="w-3.5 h-3.5" />
            </div>
          </button>

          {/* Card 6: Weather & Climate */}
          <button
            onClick={() => onNavigate('weather')}
            className="p-5 rounded-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 text-right hover:border-emerald-500 transition-all shadow-sm hover:shadow-md flex flex-col justify-between group"
          >
            <div>
              <div className="w-10 h-10 rounded-xl bg-orange-50 dark:bg-orange-950 text-orange-600 dark:text-orange-400 flex items-center justify-center mb-3">
                <CloudSun className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-sm text-stone-900 dark:text-white group-hover:text-emerald-600 transition-colors">
                الطقس والتنبيهات المناخية
              </h3>
              <p className="text-xs text-stone-500 dark:text-stone-400 mt-1 leading-relaxed">
                رصد حرارة ورطوبة ورياح محافظات عُمان الـ 11 وتأثيرها على الري.
              </p>
            </div>
            <div className="mt-4 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
              <span>استطلاع الطقس</span>
              <ChevronLeft className="w-3.5 h-3.5" />
            </div>
          </button>

          {/* Card 7: Live Radio Player */}
          <button
            onClick={() => onNavigate('radio')}
            className="p-5 rounded-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 text-right hover:border-emerald-500 transition-all shadow-sm hover:shadow-md flex flex-col justify-between group"
          >
            <div>
              <div className="w-10 h-10 rounded-xl bg-purple-50 dark:bg-purple-950 text-purple-600 dark:text-purple-400 flex items-center justify-center mb-3">
                <Radio className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-sm text-stone-900 dark:text-white group-hover:text-emerald-600 transition-colors">
                الإذاعات العمانية والبث المباشر
              </h3>
              <p className="text-xs text-stone-500 dark:text-stone-400 mt-1 leading-relaxed">
                إذاعة سلطنة عُمان، إذاعة القرآن الكريم، وصوت الشباب.
              </p>
            </div>
            <div className="mt-4 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
              <span>استماع مباشر</span>
              <ChevronLeft className="w-3.5 h-3.5" />
            </div>
          </button>

          {/* Card 8: Community Forum */}
          <button
            onClick={() => onNavigate('community')}
            className="p-5 rounded-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 text-right hover:border-emerald-500 transition-all shadow-sm hover:shadow-md flex flex-col justify-between group"
          >
            <div>
              <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mb-3">
                <Users className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-sm text-stone-900 dark:text-white group-hover:text-emerald-600 transition-colors">
                المجتمع الزراعي والدردشة
              </h3>
              <p className="text-xs text-stone-500 dark:text-stone-400 mt-1 leading-relaxed">
                تواصل مع إخوانك المزارعين والمهندسين الزراعيين في عُمان.
              </p>
            </div>
            <div className="mt-4 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
              <span>انضم للنقاش</span>
              <ChevronLeft className="w-3.5 h-3.5" />
            </div>
          </button>

        </div>
      </section>

      {/* 5. Daily Tips & Cultural Snippet */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div className="p-6 rounded-3xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
              <Lightbulb className="w-4 h-4" />
              <span>إرشاد زراعي اليوم</span>
            </span>
            <button
              onClick={() => onNavigate('daily_tips')}
              className="text-xs text-stone-400 hover:text-emerald-600"
            >
              عرض الكل
            </button>
          </div>

          <h3 className="text-base font-bold text-stone-900 dark:text-white">
            خف عذوق النخيل في واحات عُمان
          </h3>
          <p className="text-xs text-stone-600 dark:text-stone-300 leading-relaxed text-justify">
            خف الشماريخ من وسط العذق بمقدار 20% يمنع تشابك الثمار ويقلل احتمالية الإصابة بغبير النخيل ويرفع وزن حبة التمر بنسبة 25% مع ضمان جودة التمور للتسويق.
          </p>
        </div>

        <div className="p-6 rounded-3xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
              <Trophy className="w-4 h-4" />
              <span>المسابقة الثقافية العامة</span>
            </span>
            <button
              onClick={() => onNavigate('cultural_quiz')}
              className="text-xs text-stone-400 hover:text-amber-600"
            >
              دخول المسابقة
            </button>
          </div>

          <h3 className="text-base font-bold text-stone-900 dark:text-white">
            تراث الأفلاج والحصون العمانية
          </h3>
          <p className="text-xs text-stone-600 dark:text-stone-300 leading-relaxed text-justify">
            اختبر معلوماتك في تاريخ سلطنة عُمان، هندسة نظام الأثر وتوزيع حصص المياه في الأفلاج الداوودية، واكسب نقاطاً تُسجل في لوحة المتصدرين.
          </p>
        </div>
      </section>

    </div>
  );
};

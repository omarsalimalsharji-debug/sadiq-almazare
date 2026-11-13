import React, { useState, useEffect } from 'react';
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
  ChevronLeft,
  CalendarDays,
  AlertTriangle,
  Lightbulb,
  CheckCircle2,
  Wind,
  Droplets,
  Thermometer,
  ArrowRight,
  Clapperboard
} from 'lucide-react';
import { ActivePage, UserProfile } from '../types/index.ts';
import { SeasonalBanner } from './SeasonalBanner.tsx';
import { HijriDateInfo, SeasonalConfig, DEFAULT_SEASONAL_CONFIG, computeOmaniHijriState } from '../utils/islamicCalendar.ts';

interface HomeViewProps {
  onNavigate: (page: ActivePage) => void;
  isRamadanMode: boolean;
  user: UserProfile;
  hijriState?: HijriDateInfo;
  seasonalConfig?: SeasonalConfig;
}

export const HomeView: React.FC<HomeViewProps> = ({
  onNavigate,
  isRamadanMode,
  user,
  hijriState,
  seasonalConfig
}) => {
  const activeConfig = seasonalConfig || DEFAULT_SEASONAL_CONFIG;
  const activeHijri = hijriState || computeOmaniHijriState(activeConfig);
  const showRamadanTheme = activeHijri.occasion === 'ramadan';
  // Live weather alerts summary from backend Open-Meteo integration
  const [alerts, setAlerts] = useState<any[]>([]);
  const [currentWeather, setCurrentWeather] = useState<any>(null);
  const [loadingWeather, setLoadingWeather] = useState<boolean>(true);

  useEffect(() => {
    fetch('/api/weather/live?govId=dakhiliyah')
      .then(res => res.json())
      .then(data => {
        if (data.success && data.live) {
          setAlerts(data.live.alerts || []);
          setCurrentWeather({
            temperature: data.live.temperature,
            humidity: data.live.humidity,
            windSpeed: data.live.windSpeed
          });
        }
      })
      .catch(err => console.warn('Weather fetch warning:', err))
      .finally(() => setLoadingWeather(false));
  }, []);

  const gregorianDate = activeHijri.gregorianAr;
  const hijriDate = activeHijri.formattedAr;

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      {/* 0. نظام المناسبات الإسلامية والهوية الموسمية التلقائية */}
      <SeasonalBanner hijri={activeHijri} config={activeConfig} onNavigate={onNavigate} />
      
      {/* 1. شعار واسم التطبيق والهوية العمانية (App Logo & Name & Founder Omar Al-Sharji) */}
      <section className="relative rounded-3xl overflow-hidden bg-stone-900 border border-stone-200 dark:border-stone-800 shadow-lg text-white">
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
              <span>الإصدار الاحترافي 2026</span>
            </span>
            <span className="text-xs text-stone-300 font-medium">
              صاحب فكرة التطبيق ومديره: <strong className="text-white font-bold">عمر الشرجي – سلطنة عمان</strong>
            </span>
          </div>

          <h1 className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight leading-tight flex items-center gap-3">
            <span className="text-3xl sm:text-5xl">🌱</span>
            <div>
              <span>صديق المزارع الذكي</span>
              <span className="block text-emerald-400 font-bold text-lg sm:text-2xl mt-1">
                المنصة الزراعية العمانية الشاملة للذكاء الاصطناعي والإرشاد الميداني
              </span>
            </div>
          </h1>

          <p className="text-xs sm:text-sm text-stone-200 leading-relaxed text-justify max-w-2xl">
            مرحباً بك يا <strong>{user.name}</strong> في منصة «صديق المزارع». استمتع بتشخيص أمراض النباتات والآفات فورياً بالذكاء الاصطناعي، تصفح المكتبة الزراعية، الاستماع للبث الإذاعي والقرآن الكريم، والمشاركة في الألعاب والمسابقات الثقافية.
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
              onClick={() => onNavigate('pest_diagnosis')}
              className="px-5 py-2.5 rounded-xl bg-red-600/90 hover:bg-red-600 text-white font-semibold text-xs shadow-lg transition-transform hover:scale-102 flex items-center gap-2"
            >
              <Bug className="w-4 h-4" />
              <span>تشخيص الحشرات والآفات</span>
            </button>

            <button
              onClick={() => onNavigate('virtual_farm')}
              className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold text-xs shadow-lg transition-transform hover:scale-102 flex items-center gap-2"
            >
              <Sparkles className="w-4 h-4" />
              <span>مزرعتي الافتراضية (3D)</span>
            </button>

            <button
              onClick={() => onNavigate('cartoon_videos')}
              className="px-5 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs shadow-lg transition-transform hover:scale-102 flex items-center gap-2"
            >
              <Clapperboard className="w-4 h-4" />
              <span>فيديوهات فليجان الكرتونية</span>
            </button>

            <button
              onClick={() => onNavigate('games')}
              className="px-5 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white border border-white/20 font-semibold text-xs backdrop-blur-sm transition-colors flex items-center gap-2"
            >
              <Gamepad2 className="w-4 h-4 text-amber-400" />
              <span>الألعاب الزراعية (6 ألعاب)</span>
            </button>
          </div>
        </div>
      </section>

      {/* 2. التاريخ الهجري والميلادي (Hijri & Gregorian Date Bar) */}
      <section className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl p-4 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 flex items-center justify-center font-bold">
            <CalendarDays className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[11px] text-stone-500 dark:text-stone-400">التاريخ اليوم وفق تقويم سلطنة عُمان</div>
            <div className="font-bold text-stone-900 dark:text-white flex items-center gap-2 mt-0.5">
              <span>{hijriDate}</span>
              <span className="text-stone-400">|</span>
              <span className="text-stone-700 dark:text-stone-300">{gregorianDate} م</span>
            </div>
          </div>
        </div>

        {/* Current Muscat Weather Snapshot */}
        {currentWeather && (
          <div className="flex items-center gap-3 bg-stone-50 dark:bg-stone-800/60 px-4 py-2 rounded-xl text-stone-700 dark:text-stone-300">
            <div className="flex items-center gap-1.5 font-semibold">
              <Thermometer className="w-4 h-4 text-orange-500" />
              <span>{currentWeather.temperature}°C</span>
            </div>
            <div className="flex items-center gap-1 text-[11px] text-stone-500">
              <Droplets className="w-3.5 h-3.5 text-blue-500" />
              <span>رطوبة {currentWeather.humidity}%</span>
            </div>
            <div className="flex items-center gap-1 text-[11px] text-stone-500">
              <Wind className="w-3.5 h-3.5 text-emerald-500" />
              <span>رياح {currentWeather.windSpeed} كم/س</span>
            </div>
          </div>
        )}
      </section>

      {/* 3. التنبيهات الزراعية (Agricultural Alerts) */}
      <section className="bg-amber-50 dark:bg-amber-950/30 border border-amber-300 dark:border-amber-800/60 rounded-2xl p-4 sm:p-5 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2 text-amber-900 dark:text-amber-200 font-bold text-sm">
            <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0" />
            <span>التنبيهات الزراعية والمناخية المباشرة (Open-Meteo عمان)</span>
          </div>
          <button
            onClick={() => onNavigate('weather')}
            className="text-xs text-amber-800 dark:text-amber-300 hover:underline flex items-center gap-1"
          >
            <span>رصد جميع المحافظات</span>
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {alerts.length > 0 ? (
            alerts.slice(0, 2).map((alt) => (
              <div key={alt.id} className="bg-white/80 dark:bg-stone-900/80 p-3 rounded-xl border border-amber-200 dark:border-amber-900/50 text-xs space-y-1">
                <div className="font-bold text-amber-950 dark:text-amber-100 flex items-center justify-between">
                  <span>{alt.title}</span>
                  <span className={`text-[10px] px-2 py-0.5 rounded ${alt.severity === 'high' ? 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300' : 'bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-300'}`}>
                    {alt.severity === 'high' ? 'عالي الأهمية' : 'إرشادي'}
                  </span>
                </div>
                <p className="text-stone-600 dark:text-stone-300 leading-relaxed text-[11px]">
                  {alt.recommendation}
                </p>
              </div>
            ))
          ) : (
            <div className="col-span-2 text-xs text-stone-500 dark:text-stone-400 py-2">
              الظروف المناخية في محافظات سلطنة عُمان معتدلة ومناسبة للعمليات الحقلية والري المعتاد.
            </div>
          )}
        </div>
      </section>

      {/* 5. تشخيص النباتات بالذكاء الاصطناعي (AI Plant Diagnosis Quick Access) */}
      <section className="bg-white dark:bg-stone-900 rounded-3xl border border-stone-200 dark:border-stone-800 p-6 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
              <Sparkles className="w-4 h-4" />
              <span>تشخيص النباتات والآفات فورياً بنموذج Gemini 3.8 Flash</span>
            </div>
            <h2 className="text-lg font-bold text-stone-900 dark:text-white mt-1">
              الفحص والتشخيص الزراعي الذكي
            </h2>
            <p className="text-xs text-stone-500 dark:text-stone-400">
              التقط صورة للورقة أو الثمرة المصابة أو الحشرة لتحصل على التشخيص والعلاج المتوافق مع البيئة العمانية.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => onNavigate('plant_diagnosis')}
              className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-2 shadow-sm"
            >
              <Scan className="w-4 h-4" />
              <span>فحص الأمراض</span>
            </button>
            <button
              onClick={() => onNavigate('pest_diagnosis')}
              className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-bold flex items-center gap-2 shadow-sm"
            >
              <Bug className="w-4 h-4" />
              <span>فحص الحشرات</span>
            </button>
          </div>
        </div>

        {/* Diagnostic Laboratory Visual Showcase */}
        <div className="relative rounded-2xl overflow-hidden h-40 border border-stone-200 dark:border-stone-800">
          <img
            src="/src/assets/images/plant_diagnosis_lab_1794476731329.jpg"
            alt="مختبر الفحص الزراعي الذكي"
            className="w-full h-full object-cover"
            referrerPolicy="no-referrer"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-emerald-950/90 via-emerald-950/60 to-transparent p-5 flex flex-col justify-center text-white">
            <h3 className="text-base font-bold text-white">دقة تشخيصية عالية مع خطة علاج عضوية وكيميائية</h3>
            <p className="text-xs text-emerald-100 max-w-md mt-1 leading-relaxed">
              يشمل التقرير: اسم المرض أو الآفة، نسبة الثقة، الأسباب، العلاج الميداني الموصى به، والاحتياطات مع التنبيه الإرشادي الرسمي.
            </p>
          </div>
        </div>
      </section>

      {/* 6. الخدمات الزراعية (Agricultural Services Grid) */}
      <section className="space-y-4">
        <div>
          <h2 className="text-lg font-bold text-stone-900 dark:text-white">
            الخدمات الزراعية المتكاملة
          </h2>
          <p className="text-xs text-stone-500 dark:text-stone-400">
            منظومة متكاملة لخدمة النخيل والمحاصيل والمزارعين في سلطنة عمان.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <button
            onClick={() => onNavigate('calendar')}
            className="p-5 rounded-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 text-right hover:border-emerald-500 transition-all shadow-sm hover:shadow-md flex flex-col justify-between"
          >
            <div>
              <div className="w-10 h-10 rounded-xl bg-teal-50 dark:bg-teal-950 text-teal-600 dark:text-teal-400 flex items-center justify-center mb-3">
                <Calendar className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-sm text-stone-900 dark:text-white">التقويم الزراعي العماني</h3>
              <p className="text-xs text-stone-500 dark:text-stone-400 mt-1">مواعيد التلقيح والتكميم والجداد وبذار القمح لمحافظات السلطنة.</p>
            </div>
            <span className="mt-4 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
              <span>عرض التقويم</span>
              <ChevronLeft className="w-3.5 h-3.5" />
            </span>
          </button>

          <button
            onClick={() => onNavigate('encyclopedia')}
            className="p-5 rounded-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 text-right hover:border-emerald-500 transition-all shadow-sm hover:shadow-md flex flex-col justify-between"
          >
            <div>
              <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mb-3">
                <BookOpen className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-sm text-stone-900 dark:text-white">الموسوعة الزراعية الشاملة</h3>
              <p className="text-xs text-stone-500 dark:text-stone-400 mt-1">أصناف النخيل العمانية (الخلاص، الفرض، الخنيزي) والمحاصيل الحقلية.</p>
            </div>
            <span className="mt-4 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
              <span>تصفح الموسوعة</span>
              <ChevronLeft className="w-3.5 h-3.5" />
            </span>
          </button>

          <button
            onClick={() => onNavigate('community')}
            className="p-5 rounded-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 text-right hover:border-emerald-500 transition-all shadow-sm hover:shadow-md flex flex-col justify-between"
          >
            <div>
              <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400 flex items-center justify-center mb-3">
                <Users className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-sm text-stone-900 dark:text-white">المجتمع الزراعي والدردشة</h3>
              <p className="text-xs text-stone-500 dark:text-stone-400 mt-1">تبادل الخبرات مع المزارعين والمهندسين الزراعيين في ولايات السلطنة.</p>
            </div>
            <span className="mt-4 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
              <span>انضم للمجتمع</span>
              <ChevronLeft className="w-3.5 h-3.5" />
            </span>
          </button>

          <button
            onClick={() => onNavigate('weather')}
            className="p-5 rounded-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 text-right hover:border-emerald-500 transition-all shadow-sm hover:shadow-md flex flex-col justify-between"
          >
            <div>
              <div className="w-10 h-10 rounded-xl bg-orange-50 dark:bg-orange-950 text-orange-600 dark:text-orange-400 flex items-center justify-center mb-3">
                <CloudSun className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-sm text-stone-900 dark:text-white">الطقس وتنبيهات المحافظات</h3>
              <p className="text-xs text-stone-500 dark:text-stone-400 mt-1">رصد درجات الحرارة والرياح وفرص الأمطار لتنظيم جداول الري الميداني.</p>
            </div>
            <span className="mt-4 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
              <span>استطلاع الطقس</span>
              <ChevronLeft className="w-3.5 h-3.5" />
            </span>
          </button>
        </div>
      </section>

      {/* 7. الألعاب والمسابقات (Games & Quizzes) */}
      <section className="bg-gradient-to-r from-amber-950 via-stone-900 to-amber-950 text-white rounded-3xl p-6 sm:p-8 border border-amber-500/30 shadow-md space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <span className="text-xs font-bold text-amber-400 flex items-center gap-1.5">
              <Gamepad2 className="w-4 h-4" />
              <span>الألعاب التثقيفية ونظام النقاط المعتمد</span>
            </span>
            <h2 className="text-xl font-bold text-white mt-1">
              الألعاب والمسابقات الزراعية التفاعلية (6 ألعاب)
            </h2>
            <p className="text-xs text-stone-300 mt-0.5">
              تحدي المعرفة، اكتشف المحصول، الطبيب الزراعي، صح أم خطأ، تحدي السرعة، والمسابقة الثقافية العامة.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => onNavigate('leaderboard')}
              className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 text-xs font-semibold flex items-center gap-1.5"
            >
              <Trophy className="w-4 h-4 text-amber-400" />
              <span>المتصدرون</span>
            </button>
            <button
              onClick={() => onNavigate('games')}
              className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 text-xs font-bold shadow-lg"
            >
              دخول الألعاب الآن
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 pt-2">
          {['تحدي المعرفة', 'اكتشف المحصول', 'الطبيب الزراعي', 'صح أم خطأ', 'تحدي السرعة', 'المسابقة العمانية'].map((gameTitle, idx) => (
            <div key={idx} className="bg-white/5 border border-white/10 rounded-xl p-3 text-center">
              <div className="text-xs font-bold text-amber-300">{gameTitle}</div>
              <div className="text-[10px] text-stone-400 mt-1">نقاط معتمدة</div>
            </div>
          ))}
        </div>
      </section>

      {/* 8. المكتبة الزراعية (Agricultural E-Library) */}
      <section className="bg-white dark:bg-stone-900 rounded-3xl border border-stone-200 dark:border-stone-800 p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-xs font-semibold text-blue-600 dark:text-blue-400 flex items-center gap-1.5">
              <Library className="w-4 h-4" />
              <span>12 تصنيفاً معتمداً مع قارئ إلكتروني مباشر</span>
            </div>
            <h2 className="text-lg font-bold text-stone-900 dark:text-white mt-1">
              المكتبة الزراعية العمانية
            </h2>
            <p className="text-xs text-stone-500 dark:text-stone-400">
              قراءة مباشرة، تكبير الخط، حفظ آخر صفحة مقروءة، وعلامة مائية رقمية لحفظ حقوق النشر.
            </p>
          </div>

          <button
            onClick={() => onNavigate('library')}
            className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold flex items-center gap-1.5"
          >
            <span>فتح المكتبة</span>
            <ChevronLeft className="w-4 h-4" />
          </button>
        </div>
      </section>

      {/* 9. الإذاعات (Oman Radio Stations) */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-xs font-semibold text-purple-600 dark:text-purple-400 flex items-center gap-1.5">
              <Radio className="w-4 h-4" />
              <span>البث المباشر لإذاعات سلطنة عُمان</span>
            </div>
            <h2 className="text-lg font-bold text-stone-900 dark:text-white mt-1">
              الإذاعات والبث المباشر
            </h2>
            <p className="text-xs text-stone-500 dark:text-stone-400">
              استماع متواصل في الخلفية أثناء تصفح التطبيق بدون انقطاع.
            </p>
          </div>

          <button
            onClick={() => onNavigate('radio')}
            className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold flex items-center gap-1.5"
          >
            <span>صفحة الإذاعات</span>
            <ChevronLeft className="w-4 h-4" />
          </button>
        </div>
      </section>

      {/* 10. النصائح اليومية (Daily Tips) */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div className="p-6 rounded-3xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
              <Lightbulb className="w-4 h-4" />
              <span>نصيحة المزارع اليومية</span>
            </span>
            <button
              onClick={() => onNavigate('daily_tips')}
              className="text-xs text-stone-400 hover:text-emerald-600"
            >
              عرض النصائح
            </button>
          </div>

          <h3 className="text-base font-bold text-stone-900 dark:text-white">
            خف عذوق النخيل وتنظيم مياه الأفلاج
          </h3>
          <p className="text-xs text-stone-600 dark:text-stone-300 leading-relaxed text-justify">
            خف الشماريخ من وسط عذق نخلة الخلاص والفرض بمقدار 20% يمنع تشابك الثمار ويقلل احتمالية الإصابة بغبير النخيل ويرفع حجم وجودة التمور بشكل ملحوظ.
          </p>
        </div>

        {showRamadanTheme ? (
          <div className="p-6 rounded-3xl bg-gradient-to-r from-amber-950/80 to-stone-900 border border-amber-500/40 text-white shadow-sm space-y-3 ramadan-pattern">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-amber-400 flex items-center gap-1.5">
                <MoonStar className="w-4 h-4" />
                <span>رمضان مبارك · معلومة وغذاء</span>
              </span>
              <button
                onClick={() => onNavigate('daily_tips')}
                className="text-xs text-amber-300 hover:underline"
              >
                قسم رمضان
              </button>
            </div>

            <h3 className="text-base font-bold text-white">
              بركة التمر العماني في الإفطار
            </h3>
            <p className="text-xs text-stone-300 leading-relaxed text-justify">
              البدء برطب أو تمر الفرض أو الخلاص مع كوب ماء يعيد توازن سكر الدم سريعاً ويهيئ الجهاز الهضمي لاستقبال وجبة الإفطار بدون إجهاد.
            </p>
          </div>
        ) : (
          <div className="p-6 rounded-3xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
                <Trophy className="w-4 h-4" />
                <span>المسابقة الثقافية العمانية</span>
              </span>
              <button
                onClick={() => onNavigate('cultural_quiz')}
                className="text-xs text-stone-400 hover:text-amber-600"
              >
                دخول المسابقة
              </button>
            </div>

            <h3 className="text-base font-bold text-stone-900 dark:text-white">
              هندسة الأفلاج الداوودية في نزوى وبهلاء
            </h3>
            <p className="text-xs text-stone-600 dark:text-stone-300 leading-relaxed text-justify">
              تراث عريق لنظام الأثر وتوزيع حصص المياه بدقة هندسية فريدة مسجلة في قائمة التراث العالمي لليونسكو.
            </p>
          </div>
        )}
      </section>

    </div>
  );
};

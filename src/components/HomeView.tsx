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
  ChevronRight,
  CalendarDays,
  AlertTriangle,
  Lightbulb,
  Wind,
  Droplets,
  Thermometer,
  Clapperboard,
  Sprout,
  Clock,
  BookMarked,
  Bell
} from 'lucide-react';
import { ActivePage, UserProfile } from '../types/index.ts';
import { SeasonalBanner } from './SeasonalBanner.tsx';
import {
  HijriDateInfo,
  SeasonalConfig,
  DEFAULT_SEASONAL_CONFIG,
  computeOmaniHijriState
} from '../utils/islamicCalendar.ts';
import { TRANSLATIONS } from '../utils/i18n.ts';
import { useLocation } from '../context/LocationContext.tsx';

interface HomeViewProps {
  onNavigate: (page: ActivePage) => void;
  isRamadanMode: boolean;
  user: UserProfile;
  hijriState?: HijriDateInfo;
  seasonalConfig?: SeasonalConfig;
  lang?: 'ar' | 'en';
}

function getOmanTimeFormatted(lang: 'ar' | 'en'): string {
  try {
    return new Date().toLocaleTimeString(lang === 'ar' ? 'en-GB' : 'en-GB', {
      timeZone: 'Asia/Muscat',
      hour12: true,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  } catch {
    return new Date().toTimeString().slice(0, 8);
  }
}

export const HomeView: React.FC<HomeViewProps> = ({
  onNavigate,
  user,
  hijriState,
  seasonalConfig,
  lang = 'ar'
}) => {
  const t = TRANSLATIONS[lang];
  const { location } = useLocation();
  const activeConfig = seasonalConfig || DEFAULT_SEASONAL_CONFIG;
  const activeHijri = hijriState || computeOmaniHijriState(activeConfig);
  const showRamadanTheme = activeHijri.occasion === 'ramadan';
  const ArrowIcon = lang === 'ar' ? ChevronLeft : ChevronRight;

  // Live ticking Oman clock (Asia/Muscat)
  const [omanTime, setOmanTime] = useState<string>(() => getOmanTimeFormatted(lang));

  useEffect(() => {
    setOmanTime(getOmanTimeFormatted(lang));
    const timer = setInterval(() => {
      setOmanTime(getOmanTimeFormatted(lang));
    }, 1000);
    return () => clearInterval(timer);
  }, [lang]);

  // Live weather summary from backend Open-Meteo integration
  const [alerts, setAlerts] = useState<any[]>([]);
  const [currentWeather, setCurrentWeather] = useState<{
    temperature: number;
    humidity: number;
    windSpeed: number;
  } | null>(null);
  const [loadingWeather, setLoadingWeather] = useState<boolean>(true);
  const [heroImgFailed, setHeroImgFailed] = useState<boolean>(false);
  const [labImgFailed, setLabImgFailed] = useState<boolean>(false);

  useEffect(() => {
    let active = true;
    setLoadingWeather(true);
    const params = new URLSearchParams({
      govId: location.governorateId,
      lat: String(location.lat),
      lon: String(location.lon),
      wilayatId: location.wilayatId,
      wilayatName: location.wilayat,
      villageName: location.village,
    });
    fetch(`/api/weather/live?${params.toString()}`)
      .then((res) => res.json())
      .then((data) => {
        if (!active) return;
        if (data.success && data.live) {
          setAlerts(data.live.alerts || []);
          setCurrentWeather({
            temperature: data.live.temperature,
            humidity: data.live.humidity,
            windSpeed: data.live.windSpeed,
          });
        }
      })
      .catch(() => {})
      .finally(() => {
        if (active) setLoadingWeather(false);
      });
    return () => {
      active = false;
    };
  }, [
    location.governorateId,
    location.lat,
    location.lon,
    location.wilayatId,
    location.wilayat,
    location.village,
  ]);

  const gregorianDate = lang === 'ar' ? `${activeHijri.gregorianAr} م` : activeHijri.gregorianEn;
  const hijriDate = lang === 'ar' ? activeHijri.formattedAr : activeHijri.formattedEn;

  // 8 Required Core Service Modules
  const coreModules: Array<{
    id: ActivePage;
    title: string;
    desc: string;
    icon: React.ElementType;
    accentText: string;
    accentBg: string;
  }> = [
    {
      id: 'plant_diagnosis',
      title: t.diagnosis,
      desc: lang === 'ar'
        ? 'تشخيص أمراض النباتات والحشرات بالصورة مع خطة علاج متكاملة'
        : 'AI leaf, fruit, and pest diagnosis with safe field treatment steps',
      icon: Scan,
      accentText: 'text-emerald-600 dark:text-emerald-400',
      accentBg: 'bg-emerald-500/12',
    },
    {
      id: 'games',
      title: lang === 'ar' ? 'تحدي المزارع العماني' : 'Omani Farmer Challenge',
      desc: lang === 'ar'
        ? 'جولات سريعة عن المحاصيل العمانية والآفات والري، مع صور ومؤقت ونقاط وإنجازات.'
        : 'Fast rounds on Omani crops, pests, and irrigation with images, a timer, points, and achievements.',
      icon: Gamepad2,
      accentText: 'text-teal-600 dark:text-teal-300',
      accentBg: 'bg-teal-500/12',
    },
    {
      id: 'cartoon_videos',
      title: t.flijan,
      desc: lang === 'ar'
        ? 'حلقات فليجان الكرتونية التوعوية في الإرشاد الزراعي العماني'
        : 'Flijan educational cartoon series tailored for Omani farmers',
      icon: Clapperboard,
      accentText: 'text-sky-600 dark:text-sky-300',
      accentBg: 'bg-sky-500/12',
    },
    {
      id: 'games',
      title: t.games,
      desc: lang === 'ar'
        ? '6 ألعاب ومسابقات زراعية وثقافية تفاعلية بنظام النقاط'
        : '6 interactive agricultural and cultural trivia games with leaderboards',
      icon: Gamepad2,
      accentText: 'text-amber-600 dark:text-amber-300',
      accentBg: 'bg-amber-500/12',
    },
    {
      id: 'alerts',
      title: t.alerts,
      desc: lang === 'ar'
        ? 'رصد التنبيهات الزراعية والمناخية الفورية لجميع المحافظات'
        : 'Real-time weather & crop advisories across all Omani governorates',
      icon: Bell,
      accentText: 'text-orange-600 dark:text-orange-300',
      accentBg: 'bg-orange-500/12',
    },
    {
      id: 'library',
      title: t.library,
      desc: lang === 'ar'
        ? 'مكتبة زراعية إلكترونية بـ 12 تصنيفاً مع قارئ مباشر ومفضلة'
        : '12 categories of Omani agricultural guides with built-in reader',
      icon: Library,
      accentText: 'text-indigo-600 dark:text-indigo-300',
      accentBg: 'bg-indigo-500/12',
    },
    {
      id: 'quran',
      title: t.media,
      desc: lang === 'ar'
        ? 'تلاوات الشيخ هزاع البلوشي والبث المباشر لإذاعات سلطنة عُمان'
        : 'Holy Quran recitations & live Sultanate of Oman radio broadcasts',
      icon: Radio,
      accentText: 'text-cyan-600 dark:text-cyan-300',
      accentBg: 'bg-cyan-500/12',
    },
    {
      id: 'community',
      title: t.chat,
      desc: lang === 'ar'
        ? 'الدردشة الزراعية وتبادل الخبرات بين المزارعين والمهندسين'
        : 'Live agricultural discussion hub for Omani farmers and experts',
      icon: Users,
      accentText: 'text-emerald-600 dark:text-emerald-300',
      accentBg: 'bg-emerald-500/12',
    },
  ];

  return (
    <div className="max-w-6xl mx-auto space-y-6 sm:space-y-8">
      {/* Seasonal Banner (auto-activates in Ramadan / Eid) */}
      <SeasonalBanner hijri={activeHijri} config={activeConfig} onNavigate={onNavigate} lang={lang} />

      {/* 1. Hero Showcase Card: App Logo, Name, Welcome, Founder & Primary CTAs */}
      <section className="relative rounded-3xl overflow-hidden bg-[#0e1936] border border-sky-300/20 shadow-2xl text-white">
        <div className="absolute inset-0">
          {!heroImgFailed ? (
            <img
              src="/assets/images/hero_oman_farm.jpg"
              alt={lang === 'ar' ? 'واحة النخيل والأفلاج العمانية' : 'Omani Date Palm Oasis'}
              className="w-full h-full object-cover opacity-35"
              referrerPolicy="no-referrer"
              onError={() => setHeroImgFailed(true)}
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-[#132247] via-[#0b1329] to-emerald-950" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-[#0b1329] via-[#0b1329]/75 to-[#132247]/40" />
        </div>

        <div className="relative z-10 p-6 sm:p-9 lg:p-10 grid grid-cols-1 lg:grid-cols-12 gap-6 items-end">
          <div className="lg:col-span-8 space-y-4">
            <div className="text-xs text-slate-300 font-medium flex flex-wrap items-center gap-x-2 gap-y-1">
              <span className="text-emerald-300 font-semibold">{t.heroBadge}</span>
              <span className="text-slate-500">·</span>
              <span>
                {t.founderTitle}: <strong className="text-white">{t.founderName}</strong>
              </span>
            </div>

            <h1 className="heading-balance text-2xl sm:text-4xl font-extrabold text-white tracking-tight leading-tight flex items-start sm:items-center gap-3.5">
              <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-700 flex items-center justify-center text-2xl sm:text-3xl shadow-lg shadow-emerald-950/50 shrink-0">
                🌱
              </div>
              <div>
                <span>{t.appName}</span>
                <span className="block text-emerald-300 font-semibold text-sm sm:text-lg mt-1">
                  {t.welcomeFarmer} {user.name}
                </span>
              </div>
            </h1>

            <p className="text-xs sm:text-sm text-slate-200 leading-relaxed max-w-2xl">
              {t.heroDesc}
            </p>

            <div className="pt-2 flex flex-wrap items-center gap-3">
              <button
                onClick={() => onNavigate('games')}
                className="min-h-[46px] px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-[#0b1329] font-extrabold text-xs sm:text-sm shadow-lg shadow-emerald-950/40 transition-transform active:scale-[0.98] flex items-center gap-2 whitespace-nowrap"
              >
                <Gamepad2 className="w-4 h-4" />
                <span>{lang === 'ar' ? 'ابدأ التحدي' : 'Start challenge'}</span>
              </button>

              <button
                onClick={() => onNavigate('plant_diagnosis')}
                className="min-h-[46px] px-5 py-2.5 rounded-xl bg-[#132247]/90 hover:bg-[#1a2e5c] text-white border border-sky-300/25 font-bold text-xs sm:text-sm transition-colors flex items-center gap-2 whitespace-nowrap"
              >
                <Scan className="w-4 h-4 text-emerald-400" />
                <span>{t.startDiagnosisBtn}</span>
              </button>

              <button
                onClick={() => onNavigate('cartoon_videos')}
                className="min-h-[46px] px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-slate-100 border border-white/15 font-semibold text-xs sm:text-sm transition-colors flex items-center gap-2 whitespace-nowrap"
              >
                <Clapperboard className="w-4 h-4 text-sky-300" />
                <span>{t.flijan}</span>
              </button>
            </div>
          </div>

          {/* Right Quick Shortcuts for Quran & Radio in Hero Footer */}
          <div className="lg:col-span-4 flex flex-row lg:flex-col items-stretch justify-end gap-2.5">
            <button
              onClick={() => onNavigate('quran')}
              className="flex-1 lg:flex-none min-h-[48px] px-4 py-3 rounded-2xl bg-[#132247]/85 hover:bg-[#1b3063] border border-sky-300/15 text-start flex items-center justify-between gap-3 transition-colors"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <BookMarked className="w-4 h-4 text-emerald-400 shrink-0" />
                <div className="min-w-0">
                  <div className="text-xs font-bold text-white truncate">{t.quranTitle}</div>
                  <div className="text-[11px] text-slate-300 truncate">{t.reciterHazza}</div>
                </div>
              </div>
              <ArrowIcon className="w-4 h-4 text-slate-400 shrink-0" />
            </button>

            <button
              onClick={() => onNavigate('radio')}
              className="flex-1 lg:flex-none min-h-[48px] px-4 py-3 rounded-2xl bg-[#132247]/85 hover:bg-[#1b3063] border border-sky-300/15 text-start flex items-center justify-between gap-3 transition-colors"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <Radio className="w-4 h-4 text-sky-400 shrink-0" />
                <div className="min-w-0">
                  <div className="text-xs font-bold text-white truncate">{t.radioTitle}</div>
                  <div className="text-[11px] text-slate-300 truncate">{lang === 'ar' ? 'بث مباشر متواصل' : 'Live Omani Streams'}</div>
                </div>
              </div>
              <ArrowIcon className="w-4 h-4 text-slate-400 shrink-0" />
            </button>
          </div>
        </div>
      </section>

      {/* 2. Live Oman Time Clock, Hijri/Gregorian Dates & Live Weather Telemetry Strip */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Oman Clock + Hijri & Gregorian Dates */}
        <div className="lg:col-span-6 glass-card rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5 min-w-0">
            <div className="w-11 h-11 rounded-xl bg-emerald-500/12 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
              <CalendarDays className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="text-[11px] text-slate-500 dark:text-slate-300/75 font-medium">
                {t.todayDateLabel}
              </div>
              <div className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white mt-0.5 tabular-nums flex flex-wrap items-center gap-x-2">
                <span>{hijriDate}</span>
                <span className="text-slate-400">·</span>
                <span className="text-slate-600 dark:text-slate-300 font-medium">{gregorianDate}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2.5 sm:border-s border-slate-200 dark:border-sky-300/15 sm:ps-4 shrink-0">
            <Clock className="w-4 h-4 text-emerald-500 dark:text-emerald-400 shrink-0" />
            <div>
              <div className="text-[10px] text-slate-500 dark:text-slate-300/75">{t.omanTimeLabel}</div>
              <div className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-white tabular-nums tracking-wide" dir="ltr">
                {omanTime}
              </div>
            </div>
          </div>
        </div>

        {/* Live Weather Card */}
        <button
          onClick={() => onNavigate('weather')}
          className="lg:col-span-6 glass-card glass-card-hover rounded-2xl p-4 sm:p-5 text-start flex flex-col sm:flex-row sm:items-center justify-between gap-3 w-full"
        >
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-xl bg-sky-500/12 text-sky-600 dark:text-sky-300 flex items-center justify-center shrink-0">
              <CloudSun className="w-5 h-5" />
            </div>
            <div>
              <div className="text-[11px] text-slate-500 dark:text-slate-300/75 font-medium">
                {t.liveWeatherLabel} · {lang === 'ar' ? `${location.governorate} · ولاية ${location.wilayat}` : `${location.governorateEn} · ${location.wilayatEn}`}
              </div>
              {loadingWeather ? (
                <div className="text-xs font-semibold text-slate-600 dark:text-slate-300 mt-0.5">
                  {t.weatherLoading}
                </div>
              ) : currentWeather ? (
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-0.5 text-xs sm:text-sm font-bold text-slate-900 dark:text-white tabular-nums">
                  <span className="inline-flex items-center gap-1">
                    <Thermometer className="w-4 h-4 text-amber-500 dark:text-amber-400" />
                    {currentWeather.temperature}°C
                  </span>
                  <span className="inline-flex items-center gap-1 font-semibold text-slate-700 dark:text-slate-200">
                    <Droplets className="w-3.5 h-3.5 text-sky-500 dark:text-sky-400" />
                    {t.humidityLabel} {currentWeather.humidity}%
                  </span>
                  <span className="inline-flex items-center gap-1 font-semibold text-slate-700 dark:text-slate-200">
                    <Wind className="w-3.5 h-3.5 text-emerald-500 dark:text-emerald-400" />
                    {t.windLabel} {currentWeather.windSpeed} {lang === 'ar' ? 'كم/س' : 'km/h'}
                  </span>
                </div>
              ) : (
                <div className="text-xs text-slate-500 dark:text-slate-300 mt-0.5">
                  {t.weatherUnavailable}
                </div>
              )}
            </div>
          </div>

          <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1 shrink-0 whitespace-nowrap">
            <span>{t.allGovsBtn}</span>
            <ArrowIcon className="w-4 h-4" />
          </span>
        </button>
      </section>

      {/* 3. All 8 Core Modules Hub */}
      <section className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2">
          <div>
            <h2 className="heading-balance text-lg sm:text-xl font-extrabold text-slate-900 dark:text-white">
              {t.servicesHeading}
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-300/80 mt-0.5">
              {t.servicesSubheading}
            </p>
          </div>
          <div className="flex items-center gap-3 text-xs font-semibold">
            <button
              onClick={() => onNavigate('calendar')}
              className="text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1"
            >
              <Calendar className="w-3.5 h-3.5" />
              <span>{t.calendar}</span>
            </button>
            <span className="text-slate-400">·</span>
            <button
              onClick={() => onNavigate('encyclopedia')}
              className="text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1"
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span>{t.encyclopedia}</span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {coreModules.map((mod) => {
            const Icon = mod.icon;
            return (
              <button
                key={mod.id}
                onClick={() => onNavigate(mod.id)}
                className="glass-card glass-card-hover rounded-2xl p-5 text-start flex flex-col justify-between min-h-[148px]"
              >
                <div>
                  <div className={`w-11 h-11 rounded-xl ${mod.accentBg} ${mod.accentText} flex items-center justify-center mb-3.5`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <h3 className="font-bold text-sm sm:text-base text-slate-900 dark:text-white">
                    {mod.title}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-300/80 mt-1.5 leading-relaxed">
                    {mod.desc}
                  </p>
                </div>

                <span className="mt-4 text-[11px] font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                  <span>{t.openSection}</span>
                  <ArrowIcon className="w-3.5 h-3.5" />
                </span>
              </button>
            );
          })}
        </div>
      </section>

      {/* 4. Smart Diagnostic Lab Showcase + Live Alerts */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
        {/* Lab Showcase */}
        <div className="lg:col-span-7 glass-card rounded-3xl p-5 sm:p-6 flex flex-col justify-between gap-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-base sm:text-lg font-extrabold text-slate-900 dark:text-white">
                {t.smartLabTitle}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-300/80 mt-1">
                {t.smartLabDesc}
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={() => onNavigate('plant_diagnosis')}
                className="min-h-[44px] px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-[#0b1329] text-xs font-extrabold flex items-center gap-1.5 transition-colors whitespace-nowrap"
              >
                <Scan className="w-4 h-4" />
                <span>{t.plantDiagnosis}</span>
              </button>
              <button
                onClick={() => onNavigate('pest_diagnosis')}
                className="min-h-[44px] px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold flex items-center gap-1.5 transition-colors whitespace-nowrap"
              >
                <Bug className="w-4 h-4" />
                <span>{t.pestDiagnosis}</span>
              </button>
            </div>
          </div>

          <div className="relative rounded-2xl overflow-hidden h-44 border border-slate-200 dark:border-sky-300/15">
            {!labImgFailed ? (
              <img
                src="/assets/images/plant_diagnosis_lab.jpg"
                alt={t.smartLabTitle}
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
                onError={() => setLabImgFailed(true)}
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-emerald-950 via-[#132247] to-[#0b1329]" />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-[#0b1329]/90 via-[#0b1329]/55 to-transparent p-5 flex flex-col justify-end text-white">
              <h3 className="text-sm sm:text-base font-bold text-white">
                {lang === 'ar' ? 'تقرير تشخيصي دقيق مع خطة علاج عضوية وكيميائية' : 'Accurate Diagnosis with Organic & Chemical Treatment Plans'}
              </h3>
              <p className="text-[11px] sm:text-xs text-slate-200 max-w-lg mt-1 leading-relaxed">
                {lang === 'ar'
                  ? 'يعرض اسم المرض أو الآفة والأسباب وطرق الوقاية المتوافقة مع توصيات التنمية الزراعية بسلطنة عُمان.'
                  : 'Displays disease or pest identification, root causes, and treatment aligned with Oman Ministry of Agriculture guidelines.'}
              </p>
            </div>
          </div>
        </div>

        {/* Live Climate & Crop Alerts Panel */}
        <div className="lg:col-span-5 glass-card rounded-3xl p-5 sm:p-6 flex flex-col justify-between gap-4">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-amber-600 dark:text-amber-300 font-bold text-sm">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{t.liveAlertsHeading}</span>
              </div>
              <button
                onClick={() => onNavigate('alerts')}
                className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1"
              >
                <span>{t.allGovsBtn}</span>
                <ArrowIcon className="w-3.5 h-3.5" />
              </button>
            </div>

            {alerts.length > 0 ? (
              <div className="space-y-2.5">
                {alerts.slice(0, 2).map((alt) => (
                  <div
                    key={alt.id}
                    className="p-3.5 rounded-2xl bg-slate-50 dark:bg-[#0b1329]/75 border border-slate-200/80 dark:border-sky-300/10 text-xs space-y-1"
                  >
                    <div className="font-bold text-slate-900 dark:text-white flex items-center justify-between gap-2">
                      <span>{alt.title}</span>
                      <span
                        className={`text-[11px] font-semibold shrink-0 ${
                          alt.severity === 'high'
                            ? 'text-rose-600 dark:text-rose-400'
                            : 'text-amber-600 dark:text-amber-300'
                        }`}
                      >
                        {alt.severity === 'high' ? t.alertHigh : t.alertGuide}
                      </span>
                    </div>
                    <p className="text-slate-600 dark:text-slate-300 leading-relaxed text-[11px]">
                      {alt.recommendation}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-[#0b1329]/70 border border-slate-200/70 dark:border-sky-300/10 text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                {t.noAlertsText}
              </div>
            )}
          </div>

          <button
            onClick={() => onNavigate('leaderboard')}
            className="min-h-[44px] w-full px-4 py-2.5 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 border border-amber-400/30 text-amber-700 dark:text-amber-300 text-xs font-bold flex items-center justify-between transition-colors"
          >
            <span className="flex items-center gap-2">
              <Trophy className="w-4 h-4" />
              <span>{t.leaderboardTitle} · {user.totalScore} {lang === 'ar' ? 'نقطة' : 'pts'}</span>
            </span>
            <ArrowIcon className="w-4 h-4" />
          </button>
        </div>
      </section>

      {/* 5. Daily Tips & Omani Heritage / Ramadan Highlight */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div className="glass-card rounded-3xl p-6 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
              <Lightbulb className="w-4 h-4" />
              <span>{t.dailyTipHeading}</span>
            </span>
            <button
              onClick={() => onNavigate('daily_tips')}
              className="text-xs font-semibold text-slate-500 dark:text-slate-300 hover:text-emerald-400 transition-colors"
            >
              {t.viewTips}
            </button>
          </div>
          <h3 className="text-base font-bold text-slate-900 dark:text-white">
            {t.dailyTipTitle}
          </h3>
          <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
            {t.dailyTipBody}
          </p>
        </div>

        {showRamadanTheme ? (
          <div className="rounded-3xl bg-gradient-to-r from-[#132247] to-amber-950/75 border border-amber-400/35 text-white p-6 space-y-3 ramadan-pattern">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
                <MoonStar className="w-4 h-4" />
                <span>{lang === 'ar' ? 'رمضان مبارك · معلومة وغذاء' : 'Ramadan Nutrition & Blessing'}</span>
              </span>
              <button
                onClick={() => onNavigate('daily_tips')}
                className="text-xs font-semibold text-amber-200 hover:underline"
              >
                {lang === 'ar' ? 'قسم رمضان' : 'Ramadan Hub'}
              </button>
            </div>
            <h3 className="text-base font-bold text-white">
              {lang === 'ar' ? 'بركة التمر العماني في الإفطار' : 'Omani Dates at Iftar'}
            </h3>
            <p className="text-xs text-slate-200 leading-relaxed">
              {lang === 'ar'
                ? 'البدء برطب أو تمر الفرض أو الخلاص مع كوب ماء يعيد توازن الطاقة سريعاً ويهيئ الجسم لوجبة الإفطار.'
                : 'Breaking fast with Omani Fardh or Khalas dates and water gently restores natural energy.'}
            </p>
          </div>
        ) : (
          <div className="glass-card rounded-3xl p-6 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-amber-600 dark:text-amber-300 flex items-center gap-1.5">
                <Sparkles className="w-4 h-4" />
                <span>{lang === 'ar' ? 'المسابقة الثقافية العمانية' : 'Omani Cultural Heritage'}</span>
              </span>
              <button
                onClick={() => onNavigate('cultural_quiz')}
                className="text-xs font-semibold text-slate-500 dark:text-slate-300 hover:text-amber-300 transition-colors"
              >
                {t.openQuiz}
              </button>
            </div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              {t.culturalTitle}
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              {t.culturalBody}
            </p>
          </div>
        )}
      </section>
    </div>
  );
};

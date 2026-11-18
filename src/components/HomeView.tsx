import React, { useState, useEffect, useMemo } from 'react';
import {
  Sprout,
  Download,
  MessageCircle,
  BookOpen,
  Gamepad2,
  ChevronLeft,
  ChevronRight,
  MapPin,
  Thermometer,
  MoonStar,
  Volume2,
  Square,
} from 'lucide-react';
import { ActivePage, UserProfile } from '../types/index.ts';
import {
  HijriDateInfo,
  SeasonalConfig,
  DEFAULT_SEASONAL_CONFIG,
  computeOmaniHijriState,
} from '../utils/islamicCalendar.ts';
import { TRANSLATIONS } from '../utils/i18n.ts';
import { useLocation } from '../context/LocationContext.tsx';
import { MurshidCharacterSvg } from './MurshidCharacterSvg.tsx';
import { MURSHID_PHRASES, pickFreshPhrase, pickVariedPhrase } from '../data/murshidDialogue.ts';
import {
  getMurshidAudioPrefs,
  speakMurshid,
  stopAllMurshidAudio,
  subscribeMurshidAudioPrefs,
} from '../utils/murshidAudio.ts';

interface HomeViewProps {
  onNavigate: (page: ActivePage) => void;
  isRamadanMode: boolean;
  user: UserProfile;
  hijriState?: HijriDateInfo;
  seasonalConfig?: SeasonalConfig;
  lang?: 'ar' | 'en';
}

interface HomeCategoryCard {
  id: ActivePage;
  title: string;
  subtitle: string;
  icon: React.ElementType;
  cardSurface: string;
  iconWrap: string;
  pillBtn: string;
}

export const HomeView: React.FC<HomeViewProps> = ({
  onNavigate,
  user,
  hijriState,
  seasonalConfig,
  lang = 'ar',
}) => {
  const t = TRANSLATIONS[lang];
  const { location } = useLocation();
  const activeConfig = seasonalConfig || DEFAULT_SEASONAL_CONFIG;
  const activeHijri = hijriState || computeOmaniHijriState(activeConfig);
  const showSeasonalStrip = activeHijri.occasion !== 'normal';
  const ArrowIcon = lang === 'ar' ? ChevronLeft : ChevronRight;

  const [temperature, setTemperature] = useState<number | null>(null);
  const [heroImgFailed, setHeroImgFailed] = useState<boolean>(false);
  const [isSpeaking, setIsSpeaking] = useState<boolean>(false);
  const [murshidMuted, setMurshidMuted] = useState<boolean>(() => getMurshidAudioPrefs().muted);

  useEffect(() => {
    const unsub = subscribeMurshidAudioPrefs((prefs) => {
      setMurshidMuted(prefs.muted);
    });
    return () => {
      unsub();
      stopAllMurshidAudio();
    };
  }, []);

  useEffect(() => {
    let active = true;
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
        if (data?.success && typeof data?.live?.temperature === 'number') {
          setTemperature(Math.round(data.live.temperature));
        }
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [location.governorateId, location.lat, location.lon, location.wilayatId, location.wilayat, location.village]);

  const firstName = user.name?.trim().split(' ')[0] || '';
  const wilayatDisplay = lang === 'ar' ? location.wilayat : location.wilayatEn;
  const welcomePhrases = firstName
    ? MURSHID_PHRASES.homeWelcome(firstName, wilayatDisplay)
    : [
        'حياك الله في صديق المزارع! أنا مُرشد، رفيقك في المعرفة الزراعية.',
        'أهلاً بك! اختر الخدمة الزراعية التي تحتاج إليها، وأنا هنا لمساعدتك.',
      ];

  const welcomeLine = useMemo(
    () => pickVariedPhrase(welcomePhrases, firstName.length + wilayatDisplay.length),
    [firstName, wilayatDisplay]
  );

  const handleToggleMurshidVoice = () => {
    if (isSpeaking) {
      stopAllMurshidAudio(setIsSpeaking);
      return;
    }
    const phrase = pickFreshPhrase(
      'home-welcome',
      firstName
        ? MURSHID_PHRASES.homeWelcome(firstName, wilayatDisplay)
        : ['حياك الله في صديق المزارع! أنا مُرشد، جاهز لمساعدتك في شؤون مزرعتك.']
    );
    speakMurshid(phrase, {
      muted: murshidMuted,
      mood: 'cheerful',
      onSpeakingChange: setIsSpeaking,
    });
  };

  // Exactly 4 main category cards arranged in 2 rows x 2 columns
  const categoryCards: HomeCategoryCard[] = [
    {
      id: 'hub_crops',
      title: t.hubCropsTitle,
      subtitle: t.hubCropsDesc,
      icon: Sprout,
      cardSurface:
        'bg-gradient-to-b from-[#eef9e8] to-[#dff2d6] dark:from-[#132247] dark:to-[#10263f] border-emerald-200/90 dark:border-emerald-400/25 hover:border-emerald-400',
      iconWrap: 'bg-emerald-600 text-white shadow-emerald-900/15',
      pillBtn: 'bg-emerald-600 text-white',
    },
    {
      id: 'hub_advisor',
      title: t.hubAdvisorTitle,
      subtitle: t.hubAdvisorDesc,
      icon: MessageCircle,
      cardSurface:
        'bg-gradient-to-b from-[#fef6e4] to-[#fbeacc] dark:from-[#132247] dark:to-[#1e2646] border-amber-200/90 dark:border-amber-400/25 hover:border-amber-400',
      iconWrap: 'bg-amber-600 text-white shadow-amber-900/15',
      pillBtn: 'bg-emerald-600 text-white',
    },
    {
      id: 'hub_knowledge',
      title: t.hubKnowledgeTitle,
      subtitle: t.hubKnowledgeDesc,
      icon: BookOpen,
      cardSurface:
        'bg-gradient-to-b from-[#eaf5fe] to-[#d9ecfc] dark:from-[#132247] dark:to-[#11244c] border-sky-200/90 dark:border-sky-400/25 hover:border-sky-400',
      iconWrap: 'bg-sky-600 text-white shadow-sky-900/15',
      pillBtn: 'bg-sky-600 text-white',
    },
    {
      id: 'hub_games',
      title: t.hubGamesTitle,
      subtitle: t.hubGamesDesc,
      icon: Gamepad2,
      cardSurface:
        'bg-gradient-to-b from-[#eef2ff] to-[#dfe6fd] dark:from-[#132247] dark:to-[#1b224a] border-indigo-200/90 dark:border-indigo-400/25 hover:border-indigo-400',
      iconWrap: 'bg-indigo-600 text-white shadow-indigo-900/15',
      pillBtn: 'bg-indigo-600 text-white',
    },
  ];

  return (
    <div className="max-w-5xl w-full mx-auto flex-1 flex flex-col justify-between gap-2.5 sm:gap-4 min-h-0">
      {/* 1. Compact Scenic Brand Hero + Integrated Murshid Welcome Corner */}
      <section className="relative rounded-3xl overflow-hidden bg-gradient-to-br from-[#e4f3ea] via-[#f4f7ee] to-[#e3f1fa] dark:from-[#0e1b3c] dark:via-[#132247] dark:to-[#0c2635] border border-emerald-200/80 dark:border-sky-300/20 shadow-sm shrink-0">
        {/* Subtle scenic Omani farm backdrop */}
        <div className="absolute inset-0 pointer-events-none">
          {!heroImgFailed && (
            <img
              src="/assets/images/hero_oman_farm.jpg"
              alt={lang === 'ar' ? 'واحة النخيل العُمانية' : 'Omani Farm Oasis'}
              className="w-full h-full object-cover opacity-20 dark:opacity-25"
              referrerPolicy="no-referrer"
              onError={() => setHeroImgFailed(true)}
            />
          )}
          <div className="absolute inset-0 bg-gradient-to-l from-white/75 via-white/55 to-emerald-50/70 dark:from-[#0b1329]/85 dark:via-[#132247]/75 dark:to-[#0b1329]/70" />
        </div>

        <div className="relative z-10 px-3.5 py-3 sm:px-7 sm:py-5 flex items-center justify-between gap-2.5 sm:gap-6">
          {/* Brand Title + Tagline + Quick Location Weather Link */}
          <div className="min-w-0 flex-1 space-y-1 sm:space-y-2">
            <div className="flex items-center gap-2">
              <div
                className="w-9 h-9 sm:w-11 sm:h-11 rounded-2xl bg-gradient-to-br from-emerald-600 to-teal-700 text-white flex items-center justify-center shadow-sm shrink-0"
                aria-hidden="true"
              >
                <Sprout className="w-5 h-5 sm:w-6 sm:h-6" />
              </div>
              <div className="min-w-0">
                <h1 className="text-lg sm:text-2xl lg:text-3xl font-black text-emerald-950 dark:text-white leading-tight truncate">
                  {t.appShortName}
                </h1>
                <p className="text-[11px] sm:text-sm font-bold text-emerald-800/90 dark:text-emerald-300 truncate">
                  {t.homeTagline}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[11px] sm:text-xs text-slate-700 dark:text-slate-200 pt-0.5">
              <button
                type="button"
                onClick={() => onNavigate('weather')}
                className="inline-flex items-center gap-1 font-semibold hover:text-emerald-700 dark:hover:text-emerald-300 transition-colors"
              >
                <MapPin className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <span>{wilayatDisplay}</span>
                {temperature !== null && (
                  <>
                    <span className="text-slate-400">·</span>
                    <span className="inline-flex items-center gap-0.5 tabular-nums font-bold">
                      <Thermometer className="w-3 h-3 text-amber-600 dark:text-amber-400" />
                      {temperature}°C
                    </span>
                  </>
                )}
              </button>
              <span className="text-slate-400 hidden sm:inline">·</span>
              <span className="hidden sm:inline text-slate-600 dark:text-slate-300 truncate">
                {welcomeLine}
              </span>
            </div>
          </div>

          {/* Limited & Thoughtful Murshid Companion Corner */}
          <div className="flex flex-col items-center shrink-0">
            <MurshidCharacterSvg
              expression={isSpeaking ? 'speak' : 'welcome'}
              isSpeaking={isSpeaking}
              className="w-[74px] h-[80px] sm:w-24 sm:h-26 drop-shadow"
            />
            <button
              type="button"
              onClick={handleToggleMurshidVoice}
              className={`-mt-1 min-h-[32px] px-2.5 py-1 rounded-full text-[10px] sm:text-xs font-extrabold shadow-sm flex items-center gap-1 transition-colors whitespace-nowrap ${
                isSpeaking
                  ? 'bg-rose-600 hover:bg-rose-500 text-white'
                  : 'bg-emerald-600 hover:bg-emerald-500 text-white'
              }`}
              aria-label={
                isSpeaking
                  ? lang === 'ar'
                    ? 'إيقاف صوت مُرشد'
                    : 'Stop Murshid'
                  : lang === 'ar'
                    ? 'استمع لمُرشد'
                    : 'Hear Murshid'
              }
            >
              {isSpeaking ? (
                <>
                  <Square className="w-3 h-3 fill-current" />
                  <span>{lang === 'ar' ? 'إيقاف' : 'Stop'}</span>
                </>
              ) : (
                <>
                  <Volume2 className="w-3 h-3" />
                  <span>{lang === 'ar' ? (firstName ? `مرشد · ${firstName}` : 'استمع لمرشد') : 'Murshid'}</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Ultra-compact 1-line Seasonal Strip (only during Ramadan or Eid) */}
        {showSeasonalStrip && (
          <button
            type="button"
            onClick={() => onNavigate('daily_tips')}
            className="relative z-10 w-full px-3.5 py-1.5 bg-amber-500/15 dark:bg-amber-500/20 border-t border-amber-400/30 flex items-center justify-between gap-2 text-[11px] font-bold text-amber-900 dark:text-amber-200 hover:bg-amber-500/25 transition-colors"
          >
            <span className="flex items-center gap-1.5 truncate">
              <MoonStar className="w-3.5 h-3.5 text-amber-600 dark:text-amber-300 shrink-0" />
              <span className="truncate">
                {lang === 'ar'
                  ? `${activeHijri.occasionTitleAr} · ${activeHijri.formattedAr}`
                  : `${activeHijri.occasionTitleEn} · ${activeHijri.formattedEn}`}
              </span>
            </span>
            <ArrowIcon className="w-3.5 h-3.5 shrink-0" />
          </button>
        )}
      </section>

      <a
        href="https://github.com/omarsalimalsharji-debug/sadiq-almazare/releases/download/android-latest/sadiq-almazare.apk"
        className="w-full min-h-[48px] rounded-2xl bg-emerald-700 hover:bg-emerald-800 text-white font-extrabold text-sm flex items-center justify-center gap-2 shadow-md transition-colors"
        aria-label={lang === 'ar' ? 'تحميل تطبيق صديق المزارع للأندرويد APK' : 'Download Farmer Friend Android APK'}
      >
        <Download className="w-5 h-5" />
        <span>{lang === 'ar' ? 'تحميل تطبيق الأندرويد (APK)' : 'Download Android app (APK)'}</span>
      </a>

      {/* 2. Four Main Category Cards ONLY — 2x2 Responsive Grid */}
      <section
        aria-label={lang === 'ar' ? 'الأقسام الرئيسية' : 'Main Categories'}
        className="flex-1 grid grid-cols-2 gap-2.5 sm:gap-4 min-h-0"
      >
        {categoryCards.map((card) => {
          const Icon = card.icon;
          return (
            <button
              key={card.id}
              type="button"
              onClick={() => onNavigate(card.id)}
              className={`rounded-3xl border p-3 sm:p-6 text-center flex flex-col items-center justify-between gap-2 sm:gap-3 min-h-[144px] sm:min-h-[188px] shadow-sm transition-transform active:scale-[0.98] hover:shadow-md ${card.cardSurface}`}
            >
              <div
                className={`w-11 h-11 sm:w-14 sm:h-14 rounded-2xl flex items-center justify-center shadow-sm shrink-0 ${card.iconWrap}`}
              >
                <Icon className="w-5 h-5 sm:w-7 sm:h-7" />
              </div>

              <div className="space-y-0.5 sm:space-y-1 px-0.5">
                <h2 className="font-extrabold text-[13px] sm:text-lg text-slate-900 dark:text-white leading-snug">
                  {card.title}
                </h2>
                <p className="text-[10px] sm:text-xs text-slate-600 dark:text-slate-300/90 line-clamp-1">
                  {card.subtitle}
                </p>
              </div>

              <span
                className={`inline-flex items-center justify-center w-9 h-5.5 sm:w-11 sm:h-6 rounded-full shadow-xs shrink-0 ${card.pillBtn}`}
                aria-hidden="true"
              >
                <ArrowIcon className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </span>
            </button>
          );
        })}
      </section>
    </div>
  );
};

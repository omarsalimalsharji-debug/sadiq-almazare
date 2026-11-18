import React, { useEffect, useState } from 'react';
import {
  ArrowRight,
  ArrowLeft,
  Scan,
  Bug,
  CloudSun,
  Calendar,
  Users,
  Lightbulb,
  BookMarked,
  Radio,
  Library,
  BookOpen,
  Clapperboard,
  Gamepad2,
  Trophy,
  Landmark,
  Volume2,
  Square,
  ChevronLeft,
  ChevronRight,
  MoonStar,
} from 'lucide-react';
import { ActivePage, UserProfile } from '../types/index.ts';
import { useLocation } from '../context/LocationContext.tsx';
import { MurshidCharacterSvg } from './MurshidCharacterSvg.tsx';
import {
  getMurshidAudioPrefs,
  speakMurshid,
  stopAllMurshidAudio,
  subscribeMurshidAudioPrefs,
} from '../utils/murshidAudio.ts';

export type HubPageId = 'hub_crops' | 'hub_advisor' | 'hub_knowledge' | 'hub_games';

interface CategoryHubViewProps {
  hubId: HubPageId;
  user: UserProfile;
  isRamadanMode: boolean;
  onNavigate: (page: ActivePage, itemId?: string) => void;
  lang?: 'ar' | 'en';
}

interface HubServiceTile {
  id: ActivePage;
  itemId?: string;
  titleAr: string;
  titleEn: string;
  subtitleAr: string;
  subtitleEn: string;
  icon: React.ElementType;
  tintClass: string;
  iconBgClass: string;
}

export const CategoryHubView: React.FC<CategoryHubViewProps> = ({
  hubId,
  user,
  isRamadanMode,
  onNavigate,
  lang = 'ar',
}) => {
  const { location } = useLocation();
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [muted, setMuted] = useState<boolean>(() => getMurshidAudioPrefs().muted);

  useEffect(() => {
    const unsub = subscribeMurshidAudioPrefs((p) => setMuted(p.muted));
    return () => {
      unsub();
      stopAllMurshidAudio();
    };
  }, [hubId]);

  const BackArrow = lang === 'ar' ? ArrowRight : ArrowLeft;
  const TileArrow = lang === 'ar' ? ChevronLeft : ChevronRight;

  const hubMeta: Record<
    HubPageId,
    {
      titleAr: string;
      titleEn: string;
      subtitleAr: string;
      subtitleEn: string;
      voiceIntroAr: string;
      headerTint: string;
      tiles: HubServiceTile[];
    }
  > = {
    hub_crops: {
      titleAr: 'العناية بالمحاصيل والتشخيص',
      titleEn: 'Crops Care & Smart Diagnosis',
      subtitleAr: `أدوات الفحص الميداني والمناخ في ولاية ${location.wilayat}`,
      subtitleEn: `Field diagnostics, pests & climate in ${location.wilayatEn}`,
      voiceIntroAr: `أهلاً بك في قسم العناية بالمحاصيل لولاية ${location.wilayat}. هنا تفحص النباتات والآفات بالصورة وتتابع الطقس والتقويم الزراعي.`,
      headerTint:
        'bg-gradient-to-l from-emerald-50 to-teal-50/70 dark:from-[#132247] dark:to-emerald-950/50 border-emerald-200/80 dark:border-emerald-400/25',
      tiles: [
        {
          id: 'plant_diagnosis',
          titleAr: 'فحص أمراض النباتات',
          titleEn: 'Smart Plant Scan',
          subtitleAr: 'تشخيص بالصورة وخطة علاج واضحة',
          subtitleEn: 'Photo disease check & care plan',
          icon: Scan,
          tintClass:
            'bg-emerald-50/90 dark:bg-[#132247] border-emerald-200/90 dark:border-emerald-400/25 hover:border-emerald-400',
          iconBgClass: 'bg-emerald-600 text-white',
        },
        {
          id: 'pest_diagnosis',
          titleAr: 'تشخيص الحشرات والآفات',
          titleEn: 'Insect & Pest Check',
          subtitleAr: 'تمييز الآفات والمكافحة الآمنة',
          subtitleEn: 'Identify pests & safe control',
          icon: Bug,
          tintClass:
            'bg-amber-50/90 dark:bg-[#132247] border-amber-200/90 dark:border-amber-400/25 hover:border-amber-400',
          iconBgClass: 'bg-amber-600 text-white',
        },
        {
          id: 'weather',
          titleAr: 'الطقس والتنبيهات',
          titleEn: 'Weather & Alerts',
          subtitleAr: 'الحرارة والرياح وجدولة الري والرش',
          subtitleEn: 'Live forecast & spraying status',
          icon: CloudSun,
          tintClass:
            'bg-sky-50/90 dark:bg-[#132247] border-sky-200/90 dark:border-sky-400/25 hover:border-sky-400',
          iconBgClass: 'bg-sky-600 text-white',
        },
        {
          id: 'calendar',
          titleAr: 'التقويم الزراعي العُماني',
          titleEn: 'Omani Crop Calendar',
          subtitleAr: 'مواسم النخيل والمحاصيل والخضروات',
          subtitleEn: 'Monthly palm & crop schedules',
          icon: Calendar,
          tintClass:
            'bg-teal-50/90 dark:bg-[#132247] border-teal-200/90 dark:border-teal-400/25 hover:border-teal-400',
          iconBgClass: 'bg-teal-600 text-white',
        },
      ],
    },

    hub_advisor: {
      titleAr: 'مرشدك الزراعي والمجتمع',
      titleEn: 'Agri Guide & Community',
      subtitleAr: 'استشارات مُرشد الفورية، ديوانية المزارعين، القرآن والإذاعة',
      subtitleEn: 'Instant Murshid advice, farmer forum, Quran & live radio',
      voiceIntroAr:
        'حياك الله في ركن مرشدك الزراعي. يمكنك التحدث معي في الدردشة الذكية أو استعراض نصيحة اليوم والاستماع للقرآن والإذاعة.',
      headerTint:
        'bg-gradient-to-l from-amber-50 to-emerald-50/60 dark:from-[#132247] dark:to-amber-950/35 border-amber-200/80 dark:border-amber-400/25',
      tiles: [
        {
          id: 'community',
          titleAr: 'اسأل مُرشد والديوانية',
          titleEn: 'Ask Murshid & Forum',
          subtitleAr: 'استشارات فورية وتجارب المزارعين',
          subtitleEn: 'Live AI consultation & farmer chat',
          icon: Users,
          tintClass:
            'bg-emerald-50/90 dark:bg-[#132247] border-emerald-200/90 dark:border-emerald-400/25 hover:border-emerald-400',
          iconBgClass: 'bg-emerald-600 text-white',
        },
        {
          id: 'daily_tips',
          titleAr: isRamadanMode ? 'النصائح اليومية ورمضان' : 'النصائح الزراعية اليومية',
          titleEn: isRamadanMode ? 'Daily & Ramadan Tips' : 'Daily Agri Tips',
          subtitleAr: `توصيات ولاية ${location.wilayat} المتجددة`,
          subtitleEn: `Fresh guidance for ${location.wilayatEn}`,
          icon: isRamadanMode ? MoonStar : Lightbulb,
          tintClass:
            'bg-amber-50/90 dark:bg-[#132247] border-amber-200/90 dark:border-amber-400/25 hover:border-amber-400',
          iconBgClass: 'bg-amber-600 text-white',
        },
        {
          id: 'quran',
          titleAr: 'القرآن الكريم',
          titleEn: 'The Holy Quran',
          subtitleAr: 'تلاوة الشيخ هزاع البلوشي',
          subtitleEn: 'Recitation by Sheikh Hazza Al-Balushi',
          icon: BookMarked,
          tintClass:
            'bg-teal-50/90 dark:bg-[#132247] border-teal-200/90 dark:border-teal-400/25 hover:border-teal-400',
          iconBgClass: 'bg-teal-700 text-white',
        },
        {
          id: 'radio',
          titleAr: 'الإذاعات العُمانية المباشرة',
          titleEn: 'Oman Live Radio',
          subtitleAr: 'بث مباشر للبرامج الزراعية والثقافية',
          subtitleEn: 'Live national & agricultural streams',
          icon: Radio,
          tintClass:
            'bg-sky-50/90 dark:bg-[#132247] border-sky-200/90 dark:border-sky-400/25 hover:border-sky-400',
          iconBgClass: 'bg-sky-600 text-white',
        },
      ],
    },

    hub_knowledge: {
      titleAr: 'المعلومات والمكتبة الزراعية',
      titleEn: 'Knowledge & Agri Library',
      subtitleAr: 'كتب موثقة منها دليل الزراعة في ولاية سمائل والموسوعة والحلقات',
      subtitleEn: 'Omani guides including Wilayat Samail book, encyclopedia & series',
      voiceIntroAr:
        'في المكتبة والمعرفة الزراعية تجد دليل الزراعة في ولاية سمائل، والموسوعة الشاملة، وحلقات مرشد التوعوية.',
      headerTint:
        'bg-gradient-to-l from-sky-50 to-indigo-50/60 dark:from-[#132247] dark:to-sky-950/50 border-sky-200/80 dark:border-sky-400/25',
      tiles: [
        {
          id: 'library',
          itemId: 'book-samail-guide-2026',
          titleAr: 'دليل الزراعة في ولاية سمائل',
          titleEn: 'Samail Agricultural Guide',
          subtitleAr: 'الكتاب المرجعي المحدّث مع القراءة الصوتية',
          subtitleEn: 'Featured guide with interactive reader',
          icon: BookOpen,
          tintClass:
            'bg-emerald-50/90 dark:bg-[#132247] border-emerald-200/90 dark:border-emerald-400/25 hover:border-emerald-400',
          iconBgClass: 'bg-emerald-600 text-white',
        },
        {
          id: 'library',
          titleAr: 'المكتبة الزراعية الكاملة',
          titleEn: 'Full Agri Library (12)',
          subtitleAr: '12 قسماً للكتب والمراجع العُمانية',
          subtitleEn: '12 verified agricultural book categories',
          icon: Library,
          tintClass:
            'bg-sky-50/90 dark:bg-[#132247] border-sky-200/90 dark:border-sky-400/25 hover:border-sky-400',
          iconBgClass: 'bg-sky-600 text-white',
        },
        {
          id: 'encyclopedia',
          titleAr: 'الموسوعة الزراعية الشاملة',
          titleEn: 'Agri Encyclopedia',
          subtitleAr: 'أبحاث النخيل والأفلاج والجبل الأخضر',
          subtitleEn: 'Date palms, Aflaj, wheat & terraces',
          icon: BookOpen,
          tintClass:
            'bg-amber-50/90 dark:bg-[#132247] border-amber-200/90 dark:border-amber-400/25 hover:border-amber-400',
          iconBgClass: 'bg-amber-600 text-white',
        },
        {
          id: 'cartoon_videos',
          titleAr: 'حلقات مُرشد التوعوية',
          titleEn: 'Murshid Cartoons',
          subtitleAr: 'مشاهد كرتونية تعليمية بصوت مُرشد',
          subtitleEn: 'Animated lessons voiced by Murshid',
          icon: Clapperboard,
          tintClass:
            'bg-indigo-50/90 dark:bg-[#132247] border-indigo-200/90 dark:border-indigo-400/25 hover:border-indigo-400',
          iconBgClass: 'bg-indigo-600 text-white',
        },
      ],
    },

    hub_games: {
      titleAr: 'الألعاب والتسلية التعليمية',
      titleEn: 'Games & Learning Fun',
      subtitleAr: `مراحل ممتعة ومسابقات بنظام النقاط · رصيدك الحالي: ${user.totalScore} نقطة`,
      subtitleEn: `Play, learn & earn points · Current score: ${user.totalScore} pts`,
      voiceIntroAr: `مرحباً بك في ساحة الألعاب والتسلية! رصيدك الآن ${user.totalScore} نقطة. اختر مغامرات مرشد أو أحد التحديات لتكسب النجوم.`,
      headerTint:
        'bg-gradient-to-l from-indigo-50 to-sky-50/70 dark:from-[#132247] dark:to-indigo-950/50 border-indigo-200/80 dark:border-indigo-400/25',
      tiles: [
        {
          id: 'murshid_adventures',
          titleAr: 'مغامرات مُرشد الزراعية',
          titleEn: "Murshid's Adventures",
          subtitleAr: '5 مراحل تفاعلية ممتعة مع مُرشد',
          subtitleEn: '5 fun interactive farming stages',
          icon: Gamepad2,
          tintClass:
            'bg-emerald-50/90 dark:bg-[#132247] border-emerald-200/90 dark:border-emerald-400/25 hover:border-emerald-400',
          iconBgClass: 'bg-emerald-600 text-white',
        },
        {
          id: 'games',
          titleAr: 'الألعاب الزراعية (6 تحديات)',
          titleEn: 'Agri Quiz Challenges',
          subtitleAr: 'اختبارات المعرفة واكتشاف المحاصيل',
          subtitleEn: 'Knowledge, Speed & Crop Guess games',
          icon: Gamepad2,
          tintClass:
            'bg-sky-50/90 dark:bg-[#132247] border-sky-200/90 dark:border-sky-400/25 hover:border-sky-400',
          iconBgClass: 'bg-sky-600 text-white',
        },
        {
          id: 'cultural_quiz',
          titleAr: 'المسابقة الثقافية العُمانية',
          titleEn: 'Omani Cultural Quiz',
          subtitleAr: 'التراث والأفلاج ومعالم السلطنة',
          subtitleEn: 'Omani heritage & Aflaj trivia',
          icon: Landmark,
          tintClass:
            'bg-amber-50/90 dark:bg-[#132247] border-amber-200/90 dark:border-amber-400/25 hover:border-amber-400',
          iconBgClass: 'bg-amber-600 text-white',
        },
        {
          id: 'leaderboard',
          titleAr: 'لوحة المتصدرين وإنجازاتي',
          titleEn: 'Leaderboards & Rank',
          subtitleAr: `ترتيبك #${user.rank || 1} · ${user.totalScore} نقطة`,
          subtitleEn: `Rank #${user.rank || 1} · ${user.totalScore} points`,
          icon: Trophy,
          tintClass:
            'bg-indigo-50/90 dark:bg-[#132247] border-indigo-200/90 dark:border-indigo-400/25 hover:border-indigo-400',
          iconBgClass: 'bg-indigo-600 text-white',
        },
      ],
    },
  };

  const meta = hubMeta[hubId];

  const handleToggleVoiceIntro = () => {
    if (isSpeaking) {
      stopAllMurshidAudio(setIsSpeaking);
      return;
    }
    speakMurshid(meta.voiceIntroAr, {
      muted,
      mood: 'cheerful',
      onSpeakingChange: setIsSpeaking,
    });
  };

  return (
    <div className="max-w-4xl mx-auto space-y-3.5 sm:space-y-5">
      {/* Compact Hub Header with Back & Murshid Voice Intro */}
      <div className={`rounded-3xl border p-4 sm:p-5 shadow-sm ${meta.headerTint}`}>
        <div className="flex items-center justify-between gap-2 mb-3">
          <button
            type="button"
            onClick={() => onNavigate('home')}
            className="min-h-[44px] px-3.5 py-2 rounded-xl bg-white dark:bg-[#0b1329] hover:bg-slate-100 dark:hover:bg-[#1a2e5c] border border-slate-200 dark:border-sky-300/20 text-slate-800 dark:text-white text-xs font-bold flex items-center gap-1.5 transition-colors whitespace-nowrap"
          >
            <BackArrow className="w-4 h-4" />
            <span>{lang === 'ar' ? 'الرئيسية' : 'Home'}</span>
          </button>

          <button
            type="button"
            onClick={handleToggleVoiceIntro}
            className={`min-h-[44px] px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors whitespace-nowrap ${
              isSpeaking
                ? 'bg-rose-600 hover:bg-rose-500 text-white'
                : 'bg-emerald-600 hover:bg-emerald-500 text-white'
            }`}
          >
            {isSpeaking ? (
              <>
                <Square className="w-3.5 h-3.5 fill-current" />
                <span>{lang === 'ar' ? 'إيقاف مُرشد' : 'Stop'}</span>
              </>
            ) : (
              <>
                <Volume2 className="w-4 h-4" />
                <span>{lang === 'ar' ? 'توجيه مُرشد' : 'Hear Guide'}</span>
              </>
            )}
          </button>
        </div>

        <div className="flex items-center gap-3.5">
          <MurshidCharacterSvg
            expression={isSpeaking ? 'speak' : 'explain'}
            isSpeaking={isSpeaking}
            className="w-14 h-16 sm:w-16 sm:h-18 shrink-0"
          />
          <div className="min-w-0">
            <h1 className="text-lg sm:text-2xl font-extrabold text-slate-900 dark:text-white leading-tight">
              {lang === 'ar' ? meta.titleAr : meta.titleEn}
            </h1>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 mt-1">
              {lang === 'ar' ? meta.subtitleAr : meta.subtitleEn}
            </p>
          </div>
        </div>
      </div>

      {/* Organized 2x2 Service Grid */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4">
        {meta.tiles.map((tile, idx) => {
          const Icon = tile.icon;
          return (
            <button
              key={`${tile.id}-${idx}`}
              type="button"
              onClick={() => onNavigate(tile.id, tile.itemId)}
              className={`rounded-3xl border p-4 sm:p-5 text-center flex flex-col items-center justify-between gap-3 min-h-[156px] sm:min-h-[178px] shadow-sm transition-transform active:scale-[0.98] ${tile.tintClass}`}
            >
              <div
                className={`w-12 h-12 sm:w-14 sm:h-14 rounded-2xl flex items-center justify-center shadow-sm ${tile.iconBgClass}`}
              >
                <Icon className="w-6 h-6 sm:w-7 sm:h-7" />
              </div>

              <div className="space-y-1">
                <h2 className="font-extrabold text-sm sm:text-base text-slate-900 dark:text-white leading-snug">
                  {lang === 'ar' ? tile.titleAr : tile.titleEn}
                </h2>
                <p className="text-[11px] sm:text-xs text-slate-600 dark:text-slate-300 line-clamp-2">
                  {lang === 'ar' ? tile.subtitleAr : tile.subtitleEn}
                </p>
              </div>

              <span className="inline-flex items-center justify-center w-9 h-6 rounded-full bg-emerald-600 text-white">
                <TileArrow className="w-4 h-4" />
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

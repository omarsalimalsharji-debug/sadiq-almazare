import React from 'react';
import { MoonStar, Sparkles, CalendarDays, ChevronLeft, BookOpen } from 'lucide-react';
import { HijriDateInfo, SeasonalConfig } from '../utils/islamicCalendar.ts';
import { ActivePage } from '../types/index.ts';

interface SeasonalBannerProps {
  hijri: HijriDateInfo;
  config: SeasonalConfig;
  onNavigate: (page: ActivePage) => void;
}

const LanternSVG: React.FC<{ className?: string }> = ({ className = '' }) => (
  <svg viewBox="0 0 64 110" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
    <line x1="32" y1="0" x2="32" y2="18" stroke="#FBBF24" strokeWidth="2.5" />
    <path d="M22 24C22 19 26.5 16 32 16C37.5 16 42 19 42 24H22Z" fill="#D97706" stroke="#FDE68A" strokeWidth="1.5" />
    <path d="M18 28L23 24H41L46 28L42 66L37 74H27L22 66L18 28Z" fill="url(#lanternGlow)" stroke="#FBBF24" strokeWidth="2" />
    <path d="M26 74H38L35 82H29L26 74Z" fill="#B45309" stroke="#FDE68A" strokeWidth="1.2" />
    <circle cx="32" cy="46" r="7" fill="#FEF3C7" opacity="0.9" />
    <defs>
      <radialGradient id="lanternGlow" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(32 46) rotate(90) scale(24 16)">
        <stop stopColor="#FDE68A" stopOpacity="0.95" />
        <stop offset="1" stopColor="#92400E" stopOpacity="0.85" />
      </radialGradient>
    </defs>
  </svg>
);

const CrescentSVG: React.FC<{ className?: string }> = ({ className = '' }) => (
  <svg viewBox="0 0 64 64" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
    <path
      d="M42.5 47.2C32.1 47.2 23.6 38.7 23.6 28.3C23.6 20.6 28.3 14 35 11.1C33.4 10.7 31.7 10.5 30 10.5C18.4 10.5 9 19.9 9 31.5C9 43.1 18.4 52.5 30 52.5C38.4 52.5 45.6 47.6 49 40.5C47 44.5 44.9 47.2 42.5 47.2Z"
      fill="#FCD34D"
      stroke="#FEF3C7"
      strokeWidth="1.5"
    />
    <path d="M47 18L49 23L54 25L49 27L47 32L45 27L40 25L45 23L47 18Z" fill="#FDE68A" />
  </svg>
);

export const SeasonalBanner: React.FC<SeasonalBannerProps> = ({ hijri, config, onNavigate }) => {
  if (hijri.occasion === 'normal') return null;

  const isRamadan = hijri.occasion === 'ramadan';
  const isEidFitr = hijri.occasion === 'eid_fitr';
  const isEidAdha = hijri.occasion === 'eid_adha';

  const bgGradient = isRamadan
    ? 'from-amber-950 via-stone-900 to-emerald-950 border-amber-500/50'
    : isEidFitr
      ? 'from-emerald-900 via-teal-900 to-amber-900 border-amber-400/60'
      : 'from-teal-950 via-emerald-950 to-stone-900 border-amber-500/50';

  return (
    <section
      aria-label={hijri.occasionTitleAr}
      className={`relative rounded-3xl overflow-hidden bg-gradient-to-r ${bgGradient} border text-white p-5 sm:p-7 shadow-lg ${
        config.enablePatterns ? 'ramadan-pattern' : ''
      }`}
    >
      {/* Hanging Lanterns when enabled */}
      {config.enableLanterns && (
        <div className="pointer-events-none absolute top-0 left-4 sm:left-10 flex items-start gap-4 opacity-90">
          <LanternSVG className="w-8 sm:w-10 h-14 sm:h-16 drop-shadow-[0_0_10px_rgba(251,191,36,0.65)]" />
          <LanternSVG className="w-6 sm:w-8 h-11 sm:h-12 hidden sm:block drop-shadow-[0_0_8px_rgba(251,191,36,0.55)]" />
        </div>
      )}

      <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-5">
        <div className="flex items-start sm:items-center gap-4">
          <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-amber-500/15 border border-amber-400/40 flex items-center justify-center shrink-0 shadow-inner">
            {isRamadan ? (
              <CrescentSVG className="w-10 h-10" />
            ) : (
              <Sparkles className="w-8 h-8 text-amber-300" />
            )}
          </div>

          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2 text-xs text-amber-300 font-bold">
              <span>{hijri.occasionTitleAr}</span>
              <span>·</span>
              <span className="text-amber-100/90 font-normal flex items-center gap-1">
                <CalendarDays className="w-3.5 h-3.5" />
                {hijri.formattedAr}
              </span>
            </div>

            <h2 className="text-lg sm:text-xl font-extrabold text-white leading-snug">
              {isRamadan && `اليوم ${hijri.ramadanDay} من شهر رمضان المبارك`}
              {isEidFitr && 'عيدكم مبارك · عيد الفطر السعيد في سلطنة عُمان'}
              {isEidAdha && 'أضحى مبارك · عيد الأضحى المبارك'}
            </h2>

            <p className="text-xs sm:text-sm text-stone-200 max-w-2xl leading-relaxed">
              {hijri.greetingAr}
            </p>

            {isEidAdha && (
              <p className="text-[11px] text-amber-200/90 pt-0.5">
                {hijri.occasionSubtitleAr} · تذكير بتنظيم سقي المحاصيل وتبادل الزيارات وصلة الرحم.
              </p>
            )}
            {isEidFitr && (
              <p className="text-[11px] text-amber-200/90 pt-0.5">
                تاريخ العيد وفق تقويم سلطنة عُمان الرسمي: {hijri.formattedAr} ({hijri.gregorianAr})
              </p>
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 self-start md:self-center shrink-0">
          {isRamadan && (
            <button
              onClick={() => onNavigate('daily_tips')}
              className="px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold text-xs shadow-md flex items-center gap-1.5 transition-colors"
            >
              <MoonStar className="w-4 h-4" />
              <span>معلومات ونصائح رمضان (30 يوماً)</span>
              <ChevronLeft className="w-4 h-4" />
            </button>
          )}
          {(isEidFitr || isEidAdha) && (
            <button
              onClick={() => onNavigate('virtual_farm')}
              className="px-4 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-stone-950 font-bold text-xs shadow-md flex items-center gap-1.5 transition-colors"
            >
              <Sparkles className="w-4 h-4" />
              <span>تهنئة المزرعة الافتراضية</span>
              <ChevronLeft className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </section>
  );
};

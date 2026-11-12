import React, { useState } from 'react';
import { 
  CloudSun, 
  Wind, 
  Droplets, 
  Thermometer, 
  Compass, 
  AlertTriangle, 
  Calendar,
  CheckCircle2,
  ChevronDown
} from 'lucide-react';
import { OMANI_GOVERNORATES } from '../data/agriculturalData.ts';

export const WeatherView: React.FC = () => {
  const [selectedGovId, setSelectedGovId] = useState<string>('muscat');
  const selectedGov = OMANI_GOVERNORATES.find(g => g.id === selectedGovId) || OMANI_GOVERNORATES[0];

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      
      {/* Header */}
      <div className="border-b border-stone-200 dark:border-stone-800 pb-4">
        <div className="flex items-center gap-2 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
          <CloudSun className="w-4 h-4" />
          <span>الأرصاد والمناخ الزراعي في سلطنة عُمان</span>
        </div>
        <h1 className="text-2xl font-bold text-stone-900 dark:text-white mt-1">
          الطقس والتنبيهات المناخية الزراعية
        </h1>
        <p className="text-xs sm:text-sm text-stone-600 dark:text-stone-400 mt-0.5">
          متابعة درجات الحرارة والرطوبة والرياح وتأثيرها المباشر على ري المحاصيل ورش المبيدات في كافة المحافظات.
        </p>
      </div>

      {/* Governorate Selector Horizontal Buttons */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
        {OMANI_GOVERNORATES.map((gov) => {
          const isSelected = gov.id === selectedGovId;
          return (
            <button
              key={gov.id}
              onClick={() => setSelectedGovId(gov.id)}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all border ${
                isSelected
                  ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                  : 'bg-white dark:bg-stone-900 text-stone-700 dark:text-stone-300 border-stone-200 dark:border-stone-800 hover:border-emerald-300'
              }`}
            >
              {gov.name}
            </button>
          );
        })}
      </div>

      {/* Main Weather Card */}
      <div className="rounded-3xl bg-gradient-to-br from-emerald-800 via-stone-900 to-emerald-950 text-white p-6 sm:p-8 shadow-md border border-emerald-700/40 space-y-6">
        
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-emerald-800/60 pb-5">
          <div>
            <div className="text-xs text-emerald-300 font-semibold">
              سلطنة عُمان · محطة الرصد الميداني
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-white mt-0.5">
              {selectedGov.name}
            </h2>
            <div className="text-xs text-stone-300 mt-1">
              الولايات التابعة: {selectedGov.wilayat}
            </div>
          </div>

          <div className="flex items-baseline gap-2 self-start sm:self-auto font-mono">
            <span className="text-5xl sm:text-6xl font-black text-amber-300">
              {selectedGov.avgTemp}°
            </span>
            <span className="text-sm text-stone-300">مئوية (سليزيوس)</span>
          </div>
        </div>

        {/* 3 Metric cards: Humidity, Wind, Atmosphere */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-4 rounded-2xl bg-white/10 backdrop-blur-sm border border-white/10 flex items-center gap-3">
            <Droplets className="w-6 h-6 text-cyan-300 shrink-0" />
            <div>
              <div className="text-[11px] text-stone-300 font-medium">الرطوبة النسبية</div>
              <div className="text-xl font-bold font-mono">{selectedGov.humidity}%</div>
              <div className="text-[10px] text-stone-400">
                {selectedGov.humidity > 60 ? 'رطوبة عالية تتطلب تهوية' : 'رطوبة معتدلة'}
              </div>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-white/10 backdrop-blur-sm border border-white/10 flex items-center gap-3">
            <Wind className="w-6 h-6 text-emerald-300 shrink-0" />
            <div>
              <div className="text-[11px] text-stone-300 font-medium">سرعة الرياح</div>
              <div className="text-xl font-bold font-mono">18 كم/ساعة</div>
              <div className="text-[10px] text-stone-400">رياح شرقية خفيفة إلى معتدلة</div>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-white/10 backdrop-blur-sm border border-white/10 flex items-center gap-3">
            <Thermometer className="w-6 h-6 text-amber-300 shrink-0" />
            <div>
              <div className="text-[11px] text-stone-300 font-medium">معدل التبخر اليومي</div>
              <div className="text-xl font-bold font-mono">6.2 ملم/يوم</div>
              <div className="text-[10px] text-stone-400">ينصح بجدولة الري صباحاً ومساءً</div>
            </div>
          </div>
        </div>

        {/* Climate Note */}
        <div className="p-4 rounded-2xl bg-emerald-950/60 border border-emerald-600/40 text-xs leading-relaxed text-emerald-100">
          <strong className="block text-amber-300 font-bold mb-1">
            الخاصية المناخية لـ {selectedGov.name}:
          </strong>
          {selectedGov.climateNote}
        </div>

      </div>

      {/* Agricultural Advice based on climate */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div className="p-5 rounded-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 shadow-sm space-y-3">
          <h3 className="text-xs font-bold text-stone-800 dark:text-stone-200 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>توصيات الري الحقلي اليوم:</span>
          </h3>
          <ul className="space-y-2 text-xs text-stone-600 dark:text-stone-300">
            <li className="flex items-start gap-2">
              <span className="text-emerald-500 font-bold">•</span>
              <span>تجنب تشغيل مضخات الري في أوقات الظهيرة (11 صباحاً - 3 ظهراً) لتقليل فاقد التبخر بنسبة 35%.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-emerald-500 font-bold">•</span>
              <span>في مزارع النخيل: الحفاظ على ري أسبوعي منتظم للأصناف التي تقترب من مرحلة الخلال والرطب.</span>
            </li>
          </ul>
        </div>

        <div className="p-5 rounded-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 shadow-sm space-y-3">
          <h3 className="text-xs font-bold text-stone-800 dark:text-stone-200 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-600" />
            <span>تنبيهات الوقاية والرش الكيماوي:</span>
          </h3>
          <ul className="space-y-2 text-xs text-stone-600 dark:text-stone-300">
            <li className="flex items-start gap-2">
              <span className="text-amber-500 font-bold">•</span>
              <span>إذا تجاوزت سرعة الرياح 20 كم/ساعة، يجب إيقاف رش المبيدات فوراً لتفادي تطاير الرذاذ وهدره.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-amber-500 font-bold">•</span>
              <span>في البيوت المحمية: تشغيل خلايا التبريد والمراوح وتفقد مستوى ملوحة مياه التبريد دورياً.</span>
            </li>
          </ul>
        </div>
      </div>

    </div>
  );
};

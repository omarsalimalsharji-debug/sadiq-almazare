import React, { useState, useEffect, useCallback } from 'react';
import { 
  CloudSun, 
  Wind, 
  Droplets, 
  Thermometer, 
  AlertTriangle, 
  CheckCircle2,
  RefreshCw,
  Sprout
} from 'lucide-react';
import { OMANI_GOVERNORATES } from '../data/agriculturalData.ts';

interface WeatherViewProps {
  defaultGovernorateName?: string;
}

export const WeatherView: React.FC<WeatherViewProps> = ({ defaultGovernorateName }) => {
  const [selectedGovId, setSelectedGovId] = useState<string>(() => {
    if (defaultGovernorateName) {
      const match = OMANI_GOVERNORATES.find(
        (g) => g.name.includes(defaultGovernorateName) || defaultGovernorateName.includes(g.name)
      );
      if (match) return match.id;
    }
    return 'muscat';
  });
  const [liveWeatherData, setLiveWeatherData] = useState<{
    temperature: number;
    humidity: number;
    windSpeed: number;
    rain: number;
    source: string;
    recordedAt?: string;
    alerts: Array<{
      id: string;
      title: string;
      message: string;
      severity: string;
      recommendation: string;
    }>;
  } | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const selectedGov = OMANI_GOVERNORATES.find(g => g.id === selectedGovId) || OMANI_GOVERNORATES[0];

  const loadWeather = useCallback(async (govId: string) => {
    setLoading(true);
    setFetchError(null);
    try {
      const res = await fetch(`/api/weather/live?govId=${encodeURIComponent(govId)}`);
      const data = await res.json();
      if (res.ok && data.success && data.live) {
        setLiveWeatherData({
          temperature: Math.round(data.live.temperature),
          humidity: Math.round(data.live.humidity),
          windSpeed: Math.round(data.live.windSpeed),
          rain: Number(data.live.rain || 0),
          source: data.live.source || 'Open-Meteo',
          recordedAt: data.live.recordedAt,
          alerts: (data.live.alerts || []).map((msg: string, idx: number) => ({
            id: `alt-${idx}`,
            title: 'تنبيه مناخي ميداني',
            message: msg,
            severity: idx === 0 && (data.live.windSpeed >= 20 || data.live.temperature >= 36) ? 'high' : 'medium',
            recommendation: msg
          }))
        });
      } else {
        setLiveWeatherData(null);
        setFetchError(data.error || 'تعذر الحصول على قراءة الطقس الحية من المحطة حالياً.');
      }
    } catch {
      setLiveWeatherData(null);
      setFetchError('تعذر الاتصال بخدمة الأرصاد الحية (Open-Meteo)؛ تأكد من اتصال الإنترنت ثم أعد المحاولة.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadWeather(selectedGov.id);
  }, [selectedGov.id, loadWeather]);

  const temperature = liveWeatherData ? liveWeatherData.temperature : null;
  const humidity = liveWeatherData ? liveWeatherData.humidity : null;
  const windSpeed = liveWeatherData ? liveWeatherData.windSpeed : null;
  const rain = liveWeatherData ? liveWeatherData.rain : 0;

  const isSpraySafe = windSpeed !== null && windSpeed < 20 && rain === 0 && (temperature === null || temperature < 35);
  const irrigationWindow =
    temperature !== null && temperature >= 34
      ? 'الري الليلي والفجر (بعد 6 مساءً - قبل 7 صباحاً)'
      : 'الصباح الباكر أو المساء (تجنب الظهيرة)';

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      
      {/* Header */}
      <div className="border-b border-slate-200 dark:border-sky-300/15 pb-4 flex flex-col sm:flex-row sm:items-end justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
            <CloudSun className="w-4 h-4" />
            <span>الأرصاد والمناخ الزراعي في سلطنة عُمان</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
            الطقس والتنبيهات المناخية الزراعية
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 mt-0.5">
            قراءات حية لجميع محافظات السلطنة مع مؤشرات جاهزية الرش وجدولة الري الحقلي.
          </p>
        </div>

        <button
          onClick={() => loadWeather(selectedGov.id)}
          disabled={loading}
          className="min-h-[44px] px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white text-xs font-bold flex items-center gap-2 self-start sm:self-auto"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          <span>{loading ? 'جاري التحديث...' : 'تحديث القراءة'}</span>
        </button>
      </div>

      {/* Governorate Selector Horizontal Buttons */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
        {OMANI_GOVERNORATES.map((gov) => {
          const isSelected = gov.id === selectedGovId;
          return (
            <button
              key={gov.id}
              onClick={() => setSelectedGovId(gov.id)}
              className={`min-h-[44px] px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all border ${
                isSelected
                  ? 'bg-emerald-600 text-white border-emerald-500 shadow-sm'
                  : 'bg-white dark:bg-[#132247] text-slate-700 dark:text-slate-200 border-slate-200 dark:border-sky-300/15 hover:border-emerald-400'
              }`}
            >
              {gov.name}
            </button>
          );
        })}
      </div>

      {fetchError && (
        <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 text-amber-900 dark:text-amber-200 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
            <span>{fetchError}</span>
          </div>
          <button
            onClick={() => loadWeather(selectedGov.id)}
            className="min-h-[44px] px-4 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold shrink-0"
          >
            إعادة المحاولة
          </button>
        </div>
      )}

      {/* Main Weather Card */}
      <div className="rounded-3xl bg-gradient-to-br from-[#132247] via-[#0e1936] to-emerald-950 text-white p-6 sm:p-8 shadow-lg border border-sky-300/20 space-y-6">
        
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-sky-300/15 pb-5">
          <div>
            <div className="flex items-center gap-2 text-xs text-emerald-300 font-semibold">
              <span>{liveWeatherData?.source || 'سلطنة عُمان · محطة الرصد الميداني الحية'}</span>
              {loading && <RefreshCw className="w-3 h-3 animate-spin text-emerald-400" />}
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-white mt-0.5">
              {selectedGov.name}
            </h2>
            <div className="text-xs text-slate-300 mt-1">
              الولايات التابعة: {selectedGov.wilayat}
            </div>
          </div>

          <div className="flex items-baseline gap-2 self-start sm:self-auto font-mono tabular-nums">
            <span className="text-5xl sm:text-6xl font-black text-amber-300">
              {temperature !== null ? `${temperature}°` : '--'}
            </span>
            <span className="text-sm text-slate-300">مئوية</span>
          </div>
        </div>

        {/* 3 Metric cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-4 rounded-2xl bg-white/10 backdrop-blur-sm border border-white/15 flex items-center gap-3">
            <Droplets className="w-6 h-6 text-cyan-300 shrink-0" />
            <div>
              <div className="text-[11px] text-slate-300 font-medium">الرطوبة النسبية الحالية</div>
              <div className="text-xl font-bold font-mono tabular-nums">{humidity !== null ? `${humidity}%` : '--'}</div>
              <div className="text-[10px] text-slate-300/80">
                {humidity === null ? 'بانتظار القراءة الحية' : humidity > 65 ? 'رطوبة عالية تتطلب تهوية البيوت المحمية' : 'رطوبة معتدلة مناسبة'}
              </div>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-white/10 backdrop-blur-sm border border-white/15 flex items-center gap-3">
            <Wind className="w-6 h-6 text-emerald-300 shrink-0" />
            <div>
              <div className="text-[11px] text-slate-300 font-medium">سرعة الرياح والأمطار</div>
              <div className="text-xl font-bold font-mono tabular-nums">
                {windSpeed !== null ? `${windSpeed} كم/س` : '--'}
                {rain > 0 ? ` · ${rain} ملم` : ''}
              </div>
              <div className="text-[10px] text-slate-300/80">
                {windSpeed === null ? 'بانتظار القراءة الحية' : windSpeed >= 20 ? 'رياح نشطة: يمنع رش المبيدات' : 'رياح هادئة نسبياً'}
              </div>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-white/10 backdrop-blur-sm border border-white/15 flex items-center gap-3">
            <Thermometer className="w-6 h-6 text-amber-300 shrink-0" />
            <div>
              <div className="text-[11px] text-slate-300 font-medium">معدل التبخر التقديري</div>
              <div className="text-xl font-bold font-mono tabular-nums">
                {temperature !== null ? `${temperature > 32 ? '7.5' : '5.2'} ملم/يوم` : '--'}
              </div>
              <div className="text-[10px] text-slate-300/80">{irrigationWindow}</div>
            </div>
          </div>
        </div>

        {/* Live Field Suitability Summary */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-between gap-2">
            <span className="text-slate-200 font-semibold flex items-center gap-2">
              <Sprout className="w-4 h-4 text-emerald-400 shrink-0" />
              جاهزية الرش الوقائي:
            </span>
            <span className={`font-bold ${isSpraySafe ? 'text-emerald-300' : 'text-amber-300'}`}>
              {windSpeed === null ? 'بانتظار القراءة' : isSpraySafe ? 'مناسبة في الفجر/المساء' : 'يُفضّل تأجيل الرش'}
            </span>
          </div>
          <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-between gap-2">
            <span className="text-slate-200 font-semibold">أفضل وقت للري:</span>
            <span className="font-bold text-cyan-300">{irrigationWindow}</span>
          </div>
        </div>

        {/* Climate Note */}
        <div className="p-4 rounded-2xl bg-emerald-950/60 border border-emerald-500/30 text-xs leading-relaxed text-emerald-100">
          <strong className="block text-amber-300 font-bold mb-1">
            الخاصية المناخية والزراعية لـ {selectedGov.name}:
          </strong>
          {selectedGov.climateNote}
        </div>

      </div>

      {/* Active Weather Alerts for this Governorate */}
      {liveWeatherData?.alerts && liveWeatherData.alerts.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-xs font-bold text-amber-800 dark:text-amber-300 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-600" />
            <span>تنبيهات مناخية نشطة لمحافظة {selectedGov.name}:</span>
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {liveWeatherData.alerts.map(alt => (
              <div key={alt.id} className="p-4 rounded-2xl bg-amber-50 dark:bg-[#132247] border border-amber-300 dark:border-amber-500/35 text-xs space-y-1.5">
                <div className="font-bold text-amber-950 dark:text-amber-200 flex items-center justify-between">
                  <span>{alt.title}</span>
                  <span className="text-[11px] font-bold text-amber-700 dark:text-amber-300">
                    {alt.severity === 'high' ? 'عالي الأهمية' : 'إرشادي'}
                  </span>
                </div>
                <p className="text-slate-700 dark:text-slate-200 text-[11px] leading-relaxed">
                  {alt.message}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Agricultural Advice based on climate */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div className="p-5 rounded-2xl bg-white dark:bg-[#132247] border border-slate-200 dark:border-sky-300/15 shadow-sm space-y-3">
          <h3 className="text-xs font-bold text-slate-800 dark:text-white flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
            <span>توصيات الري الحقلي والأفلاج:</span>
          </h3>
          <ul className="space-y-2 text-xs text-slate-600 dark:text-slate-300">
            <li className="flex items-start gap-2">
              <span className="text-emerald-500 font-bold">•</span>
              <span>تجنب تشغيل مضخات الري في أوقات الظهيرة (11 صباحاً - 3 ظهراً) لتقليل فاقد التبخر.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-emerald-500 font-bold">•</span>
              <span>في مزارع النخيل: الحفاظ على ري منتظم للأصناف التي تقترب من مرحلة الخلال والرطب.</span>
            </li>
          </ul>
        </div>

        <div className="p-5 rounded-2xl bg-white dark:bg-[#132247] border border-slate-200 dark:border-sky-300/15 shadow-sm space-y-3">
          <h3 className="text-xs font-bold text-slate-800 dark:text-white flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-500" />
            <span>تنبيهات الوقاية والرش الميداني:</span>
          </h3>
          <ul className="space-y-2 text-xs text-slate-600 dark:text-slate-300">
            <li className="flex items-start gap-2">
              <span className="text-amber-500 font-bold">•</span>
              <span>إذا تجاوزت سرعة الرياح 20 كم/ساعة، يجب إيقاف الرش فوراً لتفادي تطاير الرذاذ وهدره.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-amber-500 font-bold">•</span>
              <span>في البيوت المحمية: متابعة خلايا التبريد والمراوح وفحص ملوحة المياه دورياً.</span>
            </li>
          </ul>
        </div>
      </div>

    </div>
  );
};

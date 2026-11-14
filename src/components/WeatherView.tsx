import React, { useState, useEffect, useCallback } from 'react';
import { 
  CloudSun, 
  Wind, 
  Droplets, 
  Thermometer, 
  Compass, 
  AlertTriangle, 
  Calendar,
  CheckCircle2,
  ChevronDown,
  RefreshCw
} from 'lucide-react';
import { OMANI_GOVERNORATES } from '../data/agriculturalData.ts';

export const WeatherView: React.FC = () => {
  const [selectedGovId, setSelectedGovId] = useState<string>('muscat');
  const [liveWeatherData, setLiveWeatherData] = useState<{
    temperature: number;
    humidity: number;
    windSpeed: number;
    weatherCode: number;
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
          weatherCode: 0,
          alerts: (data.live.alerts || []).map((msg: string, idx: number) => ({
            id: `alt-${idx}`,
            title: "تنبيه مناخي ميداني",
            message: msg,
            severity: "high",
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

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      
      {/* Header */}
      <div className="border-b border-stone-200 dark:border-stone-800 pb-4 flex flex-col sm:flex-row sm:items-end justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
            <CloudSun className="w-4 h-4" />
            <span>الأرصاد والمناخ الزراعي في سلطنة عُمان</span>
          </div>
          <h1 className="text-2xl font-bold text-stone-900 dark:text-white mt-1">
            الطقس والتنبيهات المناخية الزراعية
          </h1>
          <p className="text-xs sm:text-sm text-stone-600 dark:text-stone-400 mt-0.5">
            بيانات طقس حية مباشرة عبر محطات الأرصاد (Open-Meteo) مع تأثير درجات الحرارة والرطوبة والرياح على ري النخيل والمحاصيل.
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
              className={`min-h-[40px] px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all border ${
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

      {fetchError && (
        <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 text-amber-900 dark:text-amber-200 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
            <span>{fetchError}</span>
          </div>
          <button
            onClick={() => loadWeather(selectedGov.id)}
            className="min-h-[38px] px-4 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold shrink-0"
          >
            إعادة المحاولة
          </button>
        </div>
      )}

      {/* Main Weather Card */}
      <div className="rounded-3xl bg-gradient-to-br from-emerald-800 via-stone-900 to-emerald-950 text-white p-6 sm:p-8 shadow-md border border-emerald-700/40 space-y-6">
        
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-emerald-800/60 pb-5">
          <div>
            <div className="flex items-center gap-2 text-xs text-emerald-300 font-semibold">
              <span>سلطنة عُمان · محطة الرصد الميداني الحية</span>
              {loading && <RefreshCw className="w-3 h-3 animate-spin text-emerald-400" />}
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
              {temperature !== null ? `${temperature}°` : '--'}
            </span>
            <span className="text-sm text-stone-300">مئوية (سليزيوس)</span>
          </div>
        </div>

        {/* 3 Metric cards: Humidity, Wind, Atmosphere */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-4 rounded-2xl bg-white/10 backdrop-blur-sm border border-white/10 flex items-center gap-3">
            <Droplets className="w-6 h-6 text-cyan-300 shrink-0" />
            <div>
              <div className="text-[11px] text-stone-300 font-medium">الرطوبة النسبية الحالية</div>
              <div className="text-xl font-bold font-mono">{humidity !== null ? `${humidity}%` : '--'}</div>
              <div className="text-[10px] text-stone-400">
                {humidity === null ? 'بانتظار القراءة الحية' : humidity > 60 ? 'رطوبة عالية تتطلب تهوية البيوت المحمية' : 'رطوبة معتدلة مناسبة'}
              </div>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-white/10 backdrop-blur-sm border border-white/10 flex items-center gap-3">
            <Wind className="w-6 h-6 text-emerald-300 shrink-0" />
            <div>
              <div className="text-[11px] text-stone-300 font-medium">سرعة الرياح</div>
              <div className="text-xl font-bold font-mono">{windSpeed !== null ? `${windSpeed} كم/ساعة` : '--'}</div>
              <div className="text-[10px] text-stone-400">
                {windSpeed === null ? 'بانتظار القراءة الحية' : windSpeed > 20 ? 'رياح نشطة: يمنع رش المبيدات' : 'رياح هادئة: مناسبة للرش الميداني'}
              </div>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-white/10 backdrop-blur-sm border border-white/10 flex items-center gap-3">
            <Thermometer className="w-6 h-6 text-amber-300 shrink-0" />
            <div>
              <div className="text-[11px] text-stone-300 font-medium">معدل التبخر اليومي المقدر</div>
              <div className="text-xl font-bold font-mono">
                {temperature !== null ? `${temperature > 32 ? '7.5' : '5.2'} ملم/يوم` : '--'}
              </div>
              <div className="text-[10px] text-stone-400">ينصح بجدولة الري صباحاً ومساءً</div>
            </div>
          </div>
        </div>

        {/* Climate Note */}
        <div className="p-4 rounded-2xl bg-emerald-950/60 border border-emerald-600/40 text-xs leading-relaxed text-emerald-100">
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
              <div key={alt.id} className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800/60 text-xs space-y-1.5">
                <div className="font-bold text-amber-950 dark:text-amber-100 flex items-center justify-between">
                  <span>{alt.title}</span>
                  <span className={`text-[10px] px-2 py-0.5 rounded ${alt.severity === 'high' ? 'bg-red-200 text-red-900 dark:bg-red-900/60 dark:text-red-200' : 'bg-amber-200 text-amber-900 dark:bg-amber-900/60 dark:text-amber-200'}`}>
                    {alt.severity === 'high' ? 'عالي الأهمية' : 'إرشادي'}
                  </span>
                </div>
                <p className="text-stone-700 dark:text-stone-300 text-[11px] leading-relaxed">
                  {alt.message}
                </p>
                <div className="text-emerald-700 dark:text-emerald-300 font-semibold text-[11px] pt-1">
                  💡 الإجراء الموصى به: {alt.recommendation}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Agricultural Advice based on climate */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div className="p-5 rounded-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 shadow-sm space-y-3">
          <h3 className="text-xs font-bold text-stone-800 dark:text-stone-200 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>توصيات الري الحقلي والأفلاج:</span>
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

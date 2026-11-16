import React, { useMemo, useState } from 'react';
import {
  MapPin,
  Navigation,
  Star,
  ChevronDown,
  ChevronUp,
  RotateCcw,
  Loader2,
  X,
} from 'lucide-react';
import { useLocation } from '../context/LocationContext.tsx';
import { OMAN_ADMINISTRATIVE_DATA } from '../data/omanLocationsData.ts';

interface LocationSelectorBarProps {
  lang?: 'ar' | 'en';
}

export const LocationSelectorBar: React.FC<LocationSelectorBarProps> = ({ lang = 'ar' }) => {
  const {
    location,
    favoriteFarm,
    gpsStatus,
    gpsMessage,
    setGovernorateById,
    setWilayatById,
    setVillageName,
    detectGpsLocation,
    saveAsFavorite,
    resetToFavorite,
    clearGpsMessage,
  } = useLocation();

  const [expanded, setExpanded] = useState<boolean>(false);
  const [customVillageDraft, setCustomVillageDraft] = useState<string>('');
  const [showCustomVillageInput, setShowCustomVillageInput] = useState<boolean>(false);

  const selectedGovObj = useMemo(
    () =>
      OMAN_ADMINISTRATIVE_DATA.find((g) => g.id === location.governorateId) ||
      OMAN_ADMINISTRATIVE_DATA[0],
    [location.governorateId]
  );

  const selectedWilayatObj = useMemo(
    () =>
      selectedGovObj.wilayats.find((w) => w.id === location.wilayatId) ||
      selectedGovObj.wilayats[0],
    [selectedGovObj, location.wilayatId]
  );

  const isCurrentFavorite =
    favoriteFarm &&
    favoriteFarm.wilayatId === location.wilayatId &&
    favoriteFarm.village === location.village;

  return (
    <section
      aria-label={lang === 'ar' ? 'الموقع الجغرافي الزراعي' : 'Agricultural Location'}
      className="mb-4 sm:mb-5 rounded-2xl bg-white/90 dark:bg-[#132247]/85 border border-slate-200/80 dark:border-sky-300/15 px-3.5 py-2.5 shadow-sm"
    >
      {/* Compact Single-Strip Header (Non-sticky, zero clutter) */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2.5 min-w-0 flex-1">
          <div className="w-8 h-8 rounded-xl bg-emerald-500/12 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
            <MapPin className="w-4 h-4" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white truncate">
              {lang === 'ar'
                ? `سلطنة عُمان ← ${location.governorate} ← ولاية ${location.wilayat} ← ${location.village}`
                : `Oman · ${location.governorateEn} · ${location.wilayatEn} · ${location.village}`}
            </div>
            <div className="text-[11px] text-slate-500 dark:text-slate-300/80 flex flex-wrap items-center gap-x-2 gap-y-0.5 tabular-nums" dir="ltr">
              <span>
                {location.lat.toFixed(4)}°N, {location.lon.toFixed(4)}°E
              </span>
              {location.locationMode === 'gps' && location.accuracyMeters ? (
                <span className="text-emerald-600 dark:text-emerald-400 font-semibold" dir="rtl">
                  · GPS (±{location.accuracyMeters} م)
                </span>
              ) : null}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={detectGpsLocation}
            disabled={gpsStatus === 'requesting'}
            className="min-h-[40px] px-2.5 sm:px-3 py-1.5 rounded-xl bg-emerald-500/12 hover:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-500/25 text-xs font-bold flex items-center gap-1.5 transition-colors disabled:opacity-60 whitespace-nowrap"
            title={lang === 'ar' ? 'تحديد الموقع عبر GPS (اختياري)' : 'Detect GPS Location'}
          >
            {gpsStatus === 'requesting' ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Navigation className="w-3.5 h-3.5" />
            )}
            <span className="hidden xs:inline sm:inline">
              {lang === 'ar' ? 'تحديد GPS' : 'GPS'}
            </span>
          </button>

          <button
            type="button"
            onClick={saveAsFavorite}
            className={`min-h-[40px] min-w-[40px] px-2.5 py-1.5 rounded-xl border text-xs font-bold flex items-center justify-center gap-1 transition-colors ${
              isCurrentFavorite
                ? 'bg-amber-500/15 border-amber-400/40 text-amber-600 dark:text-amber-300'
                : 'bg-slate-50 dark:bg-[#0b1329]/70 border-slate-200 dark:border-sky-300/15 text-slate-600 dark:text-slate-300 hover:border-amber-400/40'
            }`}
            title={lang === 'ar' ? 'حفظ كموقع مزرعتي المفضل' : 'Save favorite farm'}
            aria-label={lang === 'ar' ? 'حفظ كموقع مزرعتي المفضل' : 'Save favorite farm'}
          >
            <Star className={`w-3.5 h-3.5 ${isCurrentFavorite ? 'fill-amber-400 text-amber-400' : ''}`} />
          </button>

          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            className="min-h-[40px] px-2.5 sm:px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-[#0b1329]/80 hover:bg-slate-200 dark:hover:bg-[#0b1329] border border-slate-200 dark:border-sky-300/15 text-slate-700 dark:text-slate-200 text-xs font-bold flex items-center gap-1 transition-colors whitespace-nowrap"
          >
            <span>{lang === 'ar' ? (expanded ? 'إغلاق' : 'تغيير الموقع') : (expanded ? 'Close' : 'Change')}</span>
            {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* Optional Non-Blocking Status Banner */}
      {gpsMessage && (
        <div className="mt-2.5 px-3 py-2 rounded-xl bg-sky-500/10 border border-sky-400/25 text-xs text-slate-800 dark:text-sky-100 flex items-center justify-between gap-2">
          <span>{gpsMessage}</span>
          <button
            type="button"
            onClick={clearGpsMessage}
            className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-white shrink-0"
            aria-label="إغلاق"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Expanded 4-Level Cascading Selector: سلطنة عُمان ← المحافظة ← الولاية ← القرية أو المنطقة */}
      {expanded && (
        <div className="mt-3 pt-3 border-t border-slate-200/80 dark:border-sky-300/15 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs">
            <div>
              <label className="block font-bold text-slate-600 dark:text-slate-300 mb-1">
                المحافظة (11 محافظة):
              </label>
              <select
                value={selectedGovObj.id}
                onChange={(e) => {
                  setShowCustomVillageInput(false);
                  setGovernorateById(e.target.value);
                }}
                className="w-full min-h-[44px] px-3 rounded-xl bg-slate-50 dark:bg-[#0b1329] border border-slate-300 dark:border-sky-300/20 text-slate-900 dark:text-white font-semibold"
              >
                {OMAN_ADMINISTRATIVE_DATA.map((gov) => (
                  <option key={gov.id} value={gov.id}>
                    {gov.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-bold text-slate-600 dark:text-slate-300 mb-1">
                الولاية ({selectedGovObj.wilayats.length} ولايات):
              </label>
              <select
                value={selectedWilayatObj.id}
                onChange={(e) => {
                  setShowCustomVillageInput(false);
                  setWilayatById(e.target.value);
                }}
                className="w-full min-h-[44px] px-3 rounded-xl bg-slate-50 dark:bg-[#0b1329] border border-slate-300 dark:border-sky-300/20 text-slate-900 dark:text-white font-semibold"
              >
                {selectedGovObj.wilayats.map((wil) => (
                  <option key={wil.id} value={wil.id}>
                    ولاية {wil.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-bold text-slate-600 dark:text-slate-300 mb-1">
                القرية أو المنطقة الزراعية:
              </label>
              {!showCustomVillageInput ? (
                <select
                  value={
                    selectedWilayatObj.villages.includes(location.village)
                      ? location.village
                      : '__custom__'
                  }
                  onChange={(e) => {
                    if (e.target.value === '__custom__') {
                      setCustomVillageDraft(location.village);
                      setShowCustomVillageInput(true);
                    } else {
                      setVillageName(e.target.value);
                    }
                  }}
                  className="w-full min-h-[44px] px-3 rounded-xl bg-slate-50 dark:bg-[#0b1329] border border-slate-300 dark:border-sky-300/20 text-slate-900 dark:text-white font-semibold"
                >
                  {selectedWilayatObj.villages.map((vill) => (
                    <option key={vill} value={vill}>
                      {vill}
                    </option>
                  ))}
                  {!selectedWilayatObj.villages.includes(location.village) && (
                    <option value={location.village}>{location.village}</option>
                  )}
                  <option value="__custom__">+ كتابة اسم قرية أو مزرعة أخرى...</option>
                </select>
              ) : (
                <div className="flex items-center gap-1.5">
                  <input
                    type="text"
                    value={customVillageDraft}
                    onChange={(e) => setCustomVillageDraft(e.target.value)}
                    placeholder="اكتب اسم القرية أو الوادي..."
                    className="flex-1 min-w-0 min-h-[44px] px-3 rounded-xl bg-slate-50 dark:bg-[#0b1329] border border-slate-300 dark:border-sky-300/20 text-slate-900 dark:text-white"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (customVillageDraft.trim()) setVillageName(customVillageDraft);
                      setShowCustomVillageInput(false);
                    }}
                    className="min-h-[44px] px-3 rounded-xl bg-emerald-600 text-white font-bold shrink-0"
                  >
                    حفظ
                  </button>
                </div>
              )}
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 text-xs pt-1">
            <div className="text-slate-500 dark:text-slate-300/80">
              تتزامن القراءات المناخية، التشخيص الذكي، التوصيات الزراعية، والتقويم مباشرة مع هذا الموقع.
            </div>

            {favoriteFarm && (
              <button
                type="button"
                onClick={resetToFavorite}
                className="min-h-[38px] px-3 py-1.5 rounded-xl bg-amber-500/12 hover:bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-400/30 font-bold flex items-center gap-1.5 shrink-0"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>العودة للمزرعة المفضلة ({favoriteFarm.wilayat})</span>
              </button>
            )}
          </div>
        </div>
      )}
    </section>
  );
};

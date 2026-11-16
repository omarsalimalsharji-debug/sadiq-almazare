import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import {
  AGRO_ZONE_ADVICE,
  findNearestOmanLocation,
  formatOmanLocationPath,
  matchOmanLocationByNames,
  OMAN_ADMINISTRATIVE_DATA,
  OmanAgroZone,
} from '../data/omanLocationsData.ts';

export type GeoDetectionStatus =
  | 'idle'
  | 'requesting'
  | 'resolved'
  | 'denied'
  | 'unavailable'
  | 'error';

export interface UnifiedLocationState {
  governorateId: string;
  governorate: string;
  governorateEn: string;
  wilayatId: string;
  wilayat: string;
  wilayatEn: string;
  village: string;
  lat: number;
  lon: number;
  agroZone: OmanAgroZone;
  locationMode: 'manual' | 'gps';
  accuracyMeters?: number;
  withinOman: boolean;
  updatedAt: number;
}

export interface FavoriteFarmLocation {
  governorateId: string;
  governorate: string;
  wilayatId: string;
  wilayat: string;
  village: string;
  lat: number;
  lon: number;
  agroZone: OmanAgroZone;
  savedAt: number;
}

interface LocationContextValue {
  location: UnifiedLocationState;
  favoriteFarm: FavoriteFarmLocation | null;
  gpsStatus: GeoDetectionStatus;
  gpsMessage: string | null;
  formattedPath: string;
  agroAdvice: (typeof AGRO_ZONE_ADVICE)[OmanAgroZone];
  setGovernorateById: (govId: string) => void;
  setWilayatById: (wilayatId: string) => void;
  setVillageName: (village: string) => void;
  setManualSelection: (params: {
    governorateId: string;
    wilayatId?: string;
    village?: string;
  }) => void;
  detectGpsLocation: () => Promise<void>;
  saveAsFavorite: () => void;
  resetToFavorite: () => void;
  clearGpsMessage: () => void;
}

const STORAGE_LOCATION_KEY = 'sadiq_unified_location_v1';
const STORAGE_FAV_FARM_KEY = 'sadiq_favorite_farm_location_v1';

const DEFAULT_MATCH = matchOmanLocationByNames('محافظة الداخلية', 'نزوى', 'نزوى المركز');

const DEFAULT_LOCATION_STATE: UnifiedLocationState = {
  governorateId: DEFAULT_MATCH.governorate.id,
  governorate: DEFAULT_MATCH.governorate.name,
  governorateEn: DEFAULT_MATCH.governorate.nameEn,
  wilayatId: DEFAULT_MATCH.wilayat.id,
  wilayat: DEFAULT_MATCH.wilayat.name,
  wilayatEn: DEFAULT_MATCH.wilayat.nameEn,
  village: DEFAULT_MATCH.village,
  lat: DEFAULT_MATCH.wilayat.lat,
  lon: DEFAULT_MATCH.wilayat.lon,
  agroZone: DEFAULT_MATCH.wilayat.agroZone,
  locationMode: 'manual',
  withinOman: true,
  updatedAt: Date.now(),
};

const LocationContext = createContext<LocationContextValue | undefined>(undefined);

interface LocationProviderProps {
  children: React.ReactNode;
  initialGovernorate?: string;
  initialWilayat?: string;
  initialVillage?: string;
  onLocationSync?: (loc: UnifiedLocationState) => void;
}

export const LocationProvider: React.FC<LocationProviderProps> = ({
  children,
  initialGovernorate,
  initialWilayat,
  initialVillage,
  onLocationSync,
}) => {
  const [location, setLocation] = useState<UnifiedLocationState>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_LOCATION_KEY);
      if (saved) {
        const parsed = JSON.parse(saved) as Partial<UnifiedLocationState>;
        if (parsed && parsed.governorateId && parsed.wilayatId && typeof parsed.lat === 'number') {
          return {
            ...DEFAULT_LOCATION_STATE,
            ...parsed,
            withinOman: parsed.withinOman !== false,
          } as UnifiedLocationState;
        }
      }
    } catch {
      // ignore storage failure
    }
    if (initialGovernorate || initialWilayat) {
      const matched = matchOmanLocationByNames(initialGovernorate, initialWilayat, initialVillage);
      return {
        governorateId: matched.governorate.id,
        governorate: matched.governorate.name,
        governorateEn: matched.governorate.nameEn,
        wilayatId: matched.wilayat.id,
        wilayat: matched.wilayat.name,
        wilayatEn: matched.wilayat.nameEn,
        village: matched.village,
        lat: matched.wilayat.lat,
        lon: matched.wilayat.lon,
        agroZone: matched.wilayat.agroZone,
        locationMode: 'manual',
        withinOman: true,
        updatedAt: Date.now(),
      };
    }
    return DEFAULT_LOCATION_STATE;
  });

  const [favoriteFarm, setFavoriteFarm] = useState<FavoriteFarmLocation | null>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_FAV_FARM_KEY);
      if (raw) return JSON.parse(raw) as FavoriteFarmLocation;
    } catch {
      // ignore
    }
    return null;
  });

  const [gpsStatus, setGpsStatus] = useState<GeoDetectionStatus>('idle');
  const [gpsMessage, setGpsMessage] = useState<string | null>(null);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_LOCATION_KEY, JSON.stringify(location));
    } catch {
      // ignore quota failure
    }
    onLocationSync?.(location);
  }, [location, onLocationSync]);

  const setManualSelection = useCallback(
    (params: { governorateId: string; wilayatId?: string; village?: string }) => {
      const gov =
        OMAN_ADMINISTRATIVE_DATA.find((g) => g.id === params.governorateId) ||
        OMAN_ADMINISTRATIVE_DATA[0];
      const wil =
        gov.wilayats.find((w) => w.id === params.wilayatId) || gov.wilayats[0];
      const vill =
        params.village !== undefined
          ? params.village.trim() || wil.villages[0] || wil.name
          : wil.villages[0] || wil.name;

      setLocation({
        governorateId: gov.id,
        governorate: gov.name,
        governorateEn: gov.nameEn,
        wilayatId: wil.id,
        wilayat: wil.name,
        wilayatEn: wil.nameEn,
        village: vill,
        lat: wil.lat,
        lon: wil.lon,
        agroZone: wil.agroZone,
        locationMode: 'manual',
        accuracyMeters: undefined,
        withinOman: true,
        updatedAt: Date.now(),
      });
      setGpsMessage(null);
    },
    []
  );

  const setGovernorateById = useCallback(
    (govId: string) => {
      setManualSelection({ governorateId: govId });
    },
    [setManualSelection]
  );

  const setWilayatById = useCallback(
    (wilayatId: string) => {
      const gov =
        OMAN_ADMINISTRATIVE_DATA.find((g) =>
          g.wilayats.some((w) => w.id === wilayatId)
        ) || OMAN_ADMINISTRATIVE_DATA[0];
      setManualSelection({ governorateId: gov.id, wilayatId });
    },
    [setManualSelection]
  );

  const setVillageName = useCallback((village: string) => {
    const clean = village.trim().slice(0, 80);
    setLocation((prev) => ({
      ...prev,
      village: clean || prev.wilayat,
      locationMode: 'manual',
      updatedAt: Date.now(),
    }));
  }, []);

  const detectGpsLocation = useCallback(async () => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      setGpsStatus('unavailable');
      setGpsMessage('متصفحك أو جهازك لا يدعم GPS التلقائي؛ يمكنك اختيار المحافظة والولاية والقرية يدوياً.');
      return;
    }

    setGpsStatus('requesting');
    setGpsMessage('جاري طلب الإذن وتحديد الإحداثيات الجغرافية...');

    const getPos = () =>
      new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 120000,
        });
      });

    try {
      const pos = await getPos();
      const lat = Math.round(pos.coords.latitude * 100000) / 100000;
      const lon = Math.round(pos.coords.longitude * 100000) / 100000;
      const accuracyMeters = pos.coords.accuracy ? Math.round(pos.coords.accuracy) : undefined;

      try {
        const res = await fetch(`/api/location/reverse?lat=${lat}&lon=${lon}`);
        const data = await res.json();
        if (res.ok && data.success && data.resolved) {
          const r = data.resolved;
          setLocation({
            governorateId: r.governorateId,
            governorate: r.governorate,
            governorateEn: r.governorateEn,
            wilayatId: r.wilayatId,
            wilayat: r.wilayat,
            wilayatEn: r.wilayatEn,
            village: r.village,
            lat,
            lon,
            agroZone: r.agroZone,
            locationMode: 'gps',
            accuracyMeters,
            withinOman: Boolean(r.withinOman),
            updatedAt: Date.now(),
          });
          setGpsStatus('resolved');
          setGpsMessage(
            r.withinOman
              ? `تم تحديد موقعك: ${r.governorate} ← ولاية ${r.wilayat} ← ${r.village}`
              : 'ملاحظة: إحداثياتك خارج حدود سلطنة عُمان حالياً؛ تم ربطك بأقرب محطة ولاية عُمانية ويمكنك التعديل يدوياً.'
          );
          return;
        }
      } catch {
        // Fallback smoothly to offline Haversine matching
      }

      const fallback = findNearestOmanLocation(lat, lon);
      setLocation({
        governorateId: fallback.governorate.id,
        governorate: fallback.governorate.name,
        governorateEn: fallback.governorate.nameEn,
        wilayatId: fallback.wilayat.id,
        wilayat: fallback.wilayat.name,
        wilayatEn: fallback.wilayat.nameEn,
        village: fallback.village,
        lat,
        lon,
        agroZone: fallback.wilayat.agroZone,
        locationMode: 'gps',
        accuracyMeters,
        withinOman: fallback.withinOman,
        updatedAt: Date.now(),
      });
      setGpsStatus('resolved');
      setGpsMessage(
        fallback.withinOman
          ? `تم تحديد أقرب موقع زراعي: ${fallback.governorate.name} ← ولاية ${fallback.wilayat.name}`
          : 'إحداثياتك خارج سلطنة عُمان؛ يمكنك اختيار ولاية مزرعتك يدوياً من القائمة.'
      );
    } catch (err: any) {
      if (err?.code === 1) {
        setGpsStatus('denied');
        setGpsMessage('لم تتم مشاركة الموقع الدقيق — لا تقلق، يمكنك اختيار المحافظة والولاية والقرية يدوياً بكل سهولة.');
      } else if (err?.code === 3) {
        setGpsStatus('error');
        setGpsMessage('انتهت مهلة إشارة GPS؛ يمكنك المحاولة مجدداً أو اختيار الولاية يدوياً.');
      } else {
        setGpsStatus('error');
        setGpsMessage('تعذر الوصول لإشارة GPS حالياً؛ اعتمد الاختيار اليدوي للموقع.');
      }
    }
  }, []);

  const saveAsFavorite = useCallback(() => {
    const fav: FavoriteFarmLocation = {
      governorateId: location.governorateId,
      governorate: location.governorate,
      wilayatId: location.wilayatId,
      wilayat: location.wilayat,
      village: location.village,
      lat: location.lat,
      lon: location.lon,
      agroZone: location.agroZone,
      savedAt: Date.now(),
    };
    setFavoriteFarm(fav);
    try {
      localStorage.setItem(STORAGE_FAV_FARM_KEY, JSON.stringify(fav));
    } catch {
      // ignore
    }
    setGpsMessage(`تم حفظ «${location.governorate} ← ولاية ${location.wilayat} ← ${location.village}» كموقع مزرعتك المفضل.`);
  }, [location]);

  const resetToFavorite = useCallback(() => {
    if (!favoriteFarm) return;
    const matchedGov =
      OMAN_ADMINISTRATIVE_DATA.find((g) => g.id === favoriteFarm.governorateId) ||
      OMAN_ADMINISTRATIVE_DATA[0];
    setLocation({
      governorateId: favoriteFarm.governorateId,
      governorate: favoriteFarm.governorate,
      governorateEn: matchedGov.nameEn,
      wilayatId: favoriteFarm.wilayatId,
      wilayat: favoriteFarm.wilayat,
      wilayatEn:
        matchedGov.wilayats.find((w) => w.id === favoriteFarm.wilayatId)?.nameEn ||
        favoriteFarm.wilayat,
      village: favoriteFarm.village,
      lat: favoriteFarm.lat,
      lon: favoriteFarm.lon,
      agroZone: favoriteFarm.agroZone,
      locationMode: 'manual',
      withinOman: true,
      updatedAt: Date.now(),
    });
    setGpsMessage(`تمت استعادة موقع مزرعتك المفضل: ولاية ${favoriteFarm.wilayat}.`);
  }, [favoriteFarm]);

  const clearGpsMessage = useCallback(() => setGpsMessage(null), []);

  const formattedPath = useMemo(
    () =>
      formatOmanLocationPath({
        governorate: location.governorate,
        wilayat: location.wilayat,
        village: location.village,
        includeCountry: true,
      }),
    [location.governorate, location.wilayat, location.village]
  );

  const agroAdvice = AGRO_ZONE_ADVICE[location.agroZone] || AGRO_ZONE_ADVICE.interior_oasis;

  const value: LocationContextValue = {
    location,
    favoriteFarm,
    gpsStatus,
    gpsMessage,
    formattedPath,
    agroAdvice,
    setGovernorateById,
    setWilayatById,
    setVillageName,
    setManualSelection,
    detectGpsLocation,
    saveAsFavorite,
    resetToFavorite,
    clearGpsMessage,
  };

  return <LocationContext.Provider value={value}>{children}</LocationContext.Provider>;
};

export function useLocation(): LocationContextValue {
  const ctx = useContext(LocationContext);
  if (!ctx) {
    throw new Error('useLocation must be used inside LocationProvider');
  }
  return ctx;
}

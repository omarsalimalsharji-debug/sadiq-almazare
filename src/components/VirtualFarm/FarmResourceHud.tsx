import React from 'react';
import {
  Droplets,
  Gift,
  FastForward,
  Volume2,
  VolumeX,
  Bell,
  BellOff,
  RefreshCw,
  MapPin,
} from 'lucide-react';

interface FarmResourceHudProps {
  level: number;
  farmDay: number;
  ambientTemp: number;
  coins: number;
  points: number;
  waterLiters: number;
  maxWaterLiters: number;
  waterPct: number;
  wilayatName: string;
  falajReady: boolean;
  canClaimDaily: boolean;
  busyAction: boolean;
  flijanOpen: boolean;
  flijanAvatarUrl: string;
  soundEnabled: boolean;
  notificationsEnabled: boolean;
  unreadNotifs: number;
  onCollectFalaj: () => void;
  onClaimDaily: () => void;
  onAdvanceDay: () => void;
  onToggleFlijan: () => void;
  onToggleSound: () => void;
  onOpenNotifications: () => void;
  onSync: () => void;
}

export const FarmResourceHud: React.FC<FarmResourceHudProps> = ({
  level,
  farmDay,
  ambientTemp,
  coins,
  points,
  waterLiters,
  maxWaterLiters,
  waterPct,
  wilayatName,
  falajReady,
  canClaimDaily,
  busyAction,
  flijanOpen,
  flijanAvatarUrl,
  soundEnabled,
  notificationsEnabled,
  unreadNotifs,
  onCollectFalaj,
  onClaimDaily,
  onAdvanceDay,
  onToggleFlijan,
  onToggleSound,
  onOpenNotifications,
  onSync,
}) => {
  return (
    <div className="rounded-2xl bg-[#0b1329] text-white px-2.5 py-2 border border-sky-400/20 shadow-md flex items-center justify-between gap-2">
      {/* Compact Resource Strip */}
      <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar text-[11px] font-bold">
        <div className="px-2 py-1 rounded-xl bg-emerald-600/25 border border-emerald-400/35 text-emerald-300 shrink-0 flex items-center gap-1 tabular-nums">
          <span>🌴</span>
          <span>م{level}</span>
        </div>

        <div className="px-2 py-1 rounded-xl bg-[#132247] border border-sky-400/20 text-sky-100 shrink-0 flex items-center gap-1 whitespace-nowrap">
          <MapPin className="w-3 h-3 text-emerald-400 shrink-0" />
          <span className="truncate max-w-[96px]">{wilayatName}</span>
        </div>

        <div className="px-2 py-1 rounded-xl bg-[#132247] border border-sky-400/20 text-sky-100 shrink-0 tabular-nums whitespace-nowrap">
          🌤️ ي{farmDay || 1} · {ambientTemp ?? 26}°م
        </div>

        <div className="px-2 py-1 rounded-xl bg-amber-500/15 border border-amber-400/30 text-amber-300 shrink-0 tabular-nums whitespace-nowrap">
          🪙 {coins}
        </div>

        <div className="px-2 py-1 rounded-xl bg-emerald-500/15 border border-emerald-400/30 text-emerald-300 shrink-0 tabular-nums whitespace-nowrap">
          ⭐ {points}
        </div>

        <div
          className={`px-2 py-1 rounded-xl border shrink-0 flex items-center gap-1 tabular-nums ${
            waterPct < 25
              ? 'bg-red-500/20 border-red-400/40 text-red-300'
              : 'bg-sky-500/15 border-sky-400/30 text-sky-300'
          }`}
          title={`خزان المياه: ${waterLiters}/${maxWaterLiters} لتر`}
        >
          <Droplets className="w-3 h-3" />
          <span>{waterPct}%</span>
        </div>
      </div>

      {/* Compact Right Controls (>= 40px mobile-friendly targets, zero backdrop-blur) */}
      <div className="flex items-center gap-1 shrink-0">
        {falajReady && (
          <button
            onClick={onCollectFalaj}
            disabled={busyAction}
            className="min-h-[40px] px-2.5 py-1.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-[10px] font-extrabold flex items-center gap-1 whitespace-nowrap"
            title="استلام نوبة الفلج (+120 لتر مجاناً)"
          >
            <Droplets className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">نوبة الفلج</span>
          </button>
        )}

        {canClaimDaily && (
          <button
            onClick={onClaimDaily}
            disabled={busyAction}
            className="min-h-[40px] px-2.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 text-[10px] font-extrabold flex items-center gap-1 whitespace-nowrap"
            title="استلام مكافأة الدخول اليومي"
          >
            <Gift className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">هدية</span>
          </button>
        )}

        <button
          onClick={onAdvanceDay}
          disabled={busyAction}
          className="min-h-[40px] min-w-[40px] px-2 py-1.5 rounded-xl bg-[#132247] hover:bg-sky-900 border border-sky-400/25 text-sky-100 text-[10px] font-bold flex items-center justify-center gap-1 whitespace-nowrap"
          title="الانتقال إلى اليوم الزراعي التالي"
        >
          <FastForward className="w-3.5 h-3.5 text-amber-300" />
          <span className="hidden md:inline">يوم تالٍ</span>
        </button>

        <button
          onClick={onToggleFlijan}
          className={`min-h-[40px] min-w-[40px] p-1 rounded-full border-2 flex items-center justify-center transition-colors ${
            flijanOpen ? 'border-emerald-400' : 'border-sky-400/30 opacity-85'
          }`}
          title={flijanOpen ? 'إخفاء مرشد المزرعة فليجان' : 'إظهار مرشد المزرعة فليجان'}
          aria-label="تبديل مرشد المزرعة فليجان"
        >
          <img
            src={flijanAvatarUrl}
            alt="فليجان"
            className="w-7 h-7 rounded-full object-cover object-top"
          />
        </button>

        <button
          onClick={onToggleSound}
          className="min-h-[40px] min-w-[40px] p-1.5 rounded-xl bg-[#132247] hover:bg-sky-900 border border-sky-400/20 text-sky-100 flex items-center justify-center"
          title={soundEnabled ? 'كتم الصوت' : 'تفعيل الصوت'}
          aria-label="تبديل الصوت"
        >
          {soundEnabled ? (
            <Volume2 className="w-3.5 h-3.5 text-emerald-400" />
          ) : (
            <VolumeX className="w-3.5 h-3.5 text-stone-400" />
          )}
        </button>

        <button
          onClick={onOpenNotifications}
          className="relative min-h-[40px] min-w-[40px] p-1.5 rounded-xl bg-[#132247] hover:bg-sky-900 border border-sky-400/20 text-sky-100 flex items-center justify-center"
          title="تنبيهات المزرعة"
          aria-label="تنبيهات المزرعة"
        >
          {notificationsEnabled ? (
            <Bell className="w-3.5 h-3.5 text-amber-400" />
          ) : (
            <BellOff className="w-3.5 h-3.5 text-stone-400" />
          )}
          {unreadNotifs > 0 && notificationsEnabled && (
            <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-red-600 text-[9px] font-bold flex items-center justify-center text-white tabular-nums">
              {unreadNotifs}
            </span>
          )}
        </button>

        <button
          onClick={onSync}
          className="hidden sm:flex min-h-[40px] min-w-[40px] p-1.5 rounded-xl bg-[#132247] hover:bg-sky-900 border border-sky-400/20 text-sky-100 items-center justify-center"
          title="مزامنة الوقت"
          aria-label="مزامنة الوقت"
        >
          <RefreshCw className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};

import React, { useState, useEffect, useCallback } from 'react';
import {
  Sprout,
  Droplets,
  Sparkles,
  ShoppingBag,
  Trophy,
  BookOpen,
  Bot,
  Bell,
  BellOff,
  RefreshCw,
  Gift,
  ChevronDown,
  ChevronUp,
  Volume2,
  VolumeX,
  Thermometer,
  Wind,
  SunMedium,
  ShieldAlert,
  AlertTriangle,
  CheckCircle2,
  X,
  Shovel,
  Layers,
  Scissors,
  Bug,
  Wheat,
  RotateCcw,
  Users,
  Flag,
  Lock,
  Camera,
  Send,
  Award,
  CalendarDays,
  FastForward,
  ShieldCheck,
} from 'lucide-react';
import { UserProfile } from '../../types/index.ts';
import {
  VIRTUAL_CROPS,
  VIRTUAL_SHOP_ITEMS,
  FARM_ACHIEVEMENTS,
  VirtualCropDef,
  VirtualShopItem,
} from '../../data/virtualFarmData.ts';
import { FarmScene3D, FarmCameraPreset, FarmPlotState } from './FarmScene3D.tsx';

interface VirtualFarmViewProps {
  user: UserProfile;
  onPointsChanged?: () => void;
}

type ActiveModal =
  | null
  | 'seeds'
  | 'shop'
  | 'greenhouse'
  | 'crops_guide'
  | 'advisor'
  | 'social'
  | 'notifications';

// Lightweight Web Audio API procedural sound effects (Zero 404 external audio files)
function playFarmTone(kind: 'action' | 'water' | 'harvest' | 'warn', enabled: boolean) {
  if (!enabled || typeof window === 'undefined') return;
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);

    const now = ctx.currentTime;
    if (kind === 'harvest') {
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(523.25, now);
      osc.frequency.setValueAtTime(659.25, now + 0.08);
      osc.frequency.setValueAtTime(783.99, now + 0.16);
      gain.gain.setValueAtTime(0.12, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
      osc.start(now);
      osc.stop(now + 0.36);
    } else if (kind === 'water') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(340, now);
      osc.frequency.linearRampToValueAtTime(580, now + 0.16);
      gain.gain.setValueAtTime(0.08, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);
      osc.start(now);
      osc.stop(now + 0.23);
    } else if (kind === 'warn') {
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(220, now);
      osc.frequency.setValueAtTime(180, now + 0.1);
      gain.gain.setValueAtTime(0.06, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
      osc.start(now);
      osc.stop(now + 0.26);
    } else {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(440, now);
      osc.frequency.exponentialRampToValueAtTime(620, now + 0.09);
      gain.gain.setValueAtTime(0.07, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
      osc.start(now);
      osc.stop(now + 0.13);
    }
    setTimeout(() => ctx.close().catch(() => {}), 500);
  } catch {
    // Ignore audio context autoplay restrictions
  }
}

export const VirtualFarmView: React.FC<VirtualFarmViewProps> = ({ user }) => {
  const [farm, setFarm] = useState<any>(null);
  const [crops, setCrops] = useState<VirtualCropDef[]>(VIRTUAL_CROPS);
  const [selectedPlotId, setSelectedPlotId] = useState<string>('plot-0');
  const [cameraPreset, setCameraPreset] = useState<FarmCameraPreset>('overview');
  const [presetTrigger, setPresetTrigger] = useState<number>(0);

  const [loading, setLoading] = useState<boolean>(true);
  const [busyAction, setBusyAction] = useState<boolean>(false);
  const [dockCollapsed, setDockCollapsed] = useState<boolean>(false);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [fertChoice, setFertChoice] = useState<'fert_organic' | 'fert_npk'>('fert_organic');

  const [toast, setToast] = useState<{ type: 'ok' | 'warn' | 'err'; text: string } | null>(null);
  const [activeModal, setActiveModal] = useState<ActiveModal>(null);

  // Server time offset for exact real-time stage countdowns
  const [serverOffsetMs, setServerOffsetMs] = useState<number>(0);
  const [tickNow, setTickNow] = useState<number>(Date.now());

  // Sub-modals state
  const [guideCropId, setGuideCropId] = useState<string>('faradh_palm');
  const [advisorPrompt, setAdvisorPrompt] = useState<string>('');
  const [advisorReply, setAdvisorReply] = useState<string | null>(null);
  const [advisorLoading, setAdvisorLoading] = useState<boolean>(false);

  const [socialData, setSocialData] = useState<{
    leaderboard: any[];
    friendships: any[];
    competitions: any[];
  }>({ leaderboard: [], friendships: [], competitions: [] });
  const [boardTab, setBoardTab] = useState<'all' | 'weekly' | 'monthly'>('all');

  const showToast = (type: 'ok' | 'warn' | 'err', text: string) => {
    setToast({ type, text });
    setTimeout(() => {
      setToast((curr) => (curr?.text === text ? null : curr));
    }, 4500);
  };

  const fetchFarmState = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const qs = new URLSearchParams({
        userId: user.id,
        userName: user.name,
        governorate: user.governorate,
      });
      const res = await fetch(`/api/virtual-farm/state?${qs.toString()}`);
      const data = await res.json();
      if (data.success && data.farm) {
        setFarm(data.farm);
        if (Array.isArray(data.crops) && data.crops.length > 0) setCrops(data.crops);
        if (data.serverTime) setServerOffsetMs(data.serverTime - Date.now());
      } else if (data.error) {
        showToast('err', data.error);
      }
    } catch {
      showToast('err', 'تعذر مزامنة بيانات المزرعة مع الخادم.');
    } finally {
      setLoading(false);
    }
  }, [user.id, user.name, user.governorate]);

  const fetchSocial = useCallback(async () => {
    try {
      const res = await fetch(`/api/virtual-farm/social?userId=${encodeURIComponent(user.id)}`);
      const data = await res.json();
      if (data.success) {
        setSocialData({
          leaderboard: data.leaderboard || [],
          friendships: data.friendships || [],
          competitions: data.competitions || [],
        });
      }
    } catch {
      // ignore
    }
  }, [user.id]);

  useEffect(() => {
    fetchFarmState();
    fetchSocial();
    const syncTimer = setInterval(() => fetchFarmState(true), 12000);
    const clockTimer = setInterval(() => setTickNow(Date.now()), 1000);
    return () => {
      clearInterval(syncTimer);
      clearInterval(clockTimer);
    };
  }, [fetchFarmState, fetchSocial]);

  const performAction = async (action: string, plotId?: string, payload?: any) => {
    setBusyAction(true);
    try {
      const res = await fetch('/api/virtual-farm/action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          userName: user.name,
          governorate: user.governorate,
          action,
          plotId,
          payload,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        playFarmTone('warn', soundEnabled);
        showToast('err', data.error || 'تعذر تنفيذ العملية.');
        return false;
      }

      setFarm(data.farm);
      if (data.serverTime) setServerOffsetMs(data.serverTime - Date.now());

      if (data.warning) {
        playFarmTone('warn', soundEnabled);
        showToast('warn', data.warning);
      } else if (data.feedback) {
        if (action === 'harvest') playFarmTone('harvest', soundEnabled);
        else if (action === 'irrigate') playFarmTone('water', soundEnabled);
        else playFarmTone('action', soundEnabled);
        showToast('ok', data.feedback);
      }
      return true;
    } catch {
      showToast('err', 'خطأ في الاتصال بالخادم.');
      return false;
    } finally {
      setBusyAction(false);
    }
  };

  const handleAskAdvisor = async (customQ?: string) => {
    setAdvisorLoading(true);
    setAdvisorReply(null);
    const plot = farm?.plots?.find((p: FarmPlotState) => p.id === selectedPlotId);
    const crop = plot?.cropId ? crops.find((c) => c.id === plot.cropId) : null;
    try {
      const res = await fetch('/api/virtual-farm/advisor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cropName: crop?.nameAr || 'أرض زراعية',
          stageName: crop ? crop.stages[plot.stageIndex]?.name : 'تجهيز التربة',
          moisture: plot?.moisture,
          nutrients: plot?.nutrients,
          health: plot?.health,
          pestType: plot?.pestType,
          greenhouseTemp: farm?.greenhouseTemp,
          userQuestion: customQ || advisorPrompt || 'ما هي أفضل خطوة أعملها الآن لهذا المحصول؟',
        }),
      });
      const data = await res.json();
      setAdvisorReply(data.advice || 'تأكد من انتظام الري وتوازن السماد العضوي والتهوية الجيدة.');
    } catch {
      setAdvisorReply('تعذر استشارة الذكاء الاصطناعي حالياً؛ حافظ على رطوبة معتدلة ومكافحة حيوية آمنة.');
    } finally {
      setAdvisorLoading(false);
    }
  };

  const handleSocialAction = async (payload: any) => {
    try {
      const res = await fetch('/api/virtual-farm/social/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          userName: user.name,
          ...payload,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        showToast('err', data.error || 'تعذر تنفيذ الطلب');
        return;
      }
      showToast('ok', data.message || 'تم تحديث التفاعل بنجاح');
      fetchSocial();
    } catch {
      showToast('err', 'تعذر الاتصال بالخادم');
    }
  };

  if (loading && !farm) {
    return (
      <div className="max-w-5xl mx-auto p-10 rounded-3xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 text-center space-y-3">
        <Sprout className="w-10 h-10 text-emerald-600 mx-auto" />
        <div className="font-bold text-base text-stone-900 dark:text-white">
          جاري تجهيز مزرعتك العُمانية ثلاثية الأبعاد...
        </div>
        <p className="text-xs text-stone-500">مزامنة النمو الحقيقي للتربة والمحاصيل من الخادم</p>
      </div>
    );
  }

  if (!farm) {
    return (
      <div className="max-w-3xl mx-auto p-8 rounded-3xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 text-center space-y-3">
        <ShieldAlert className="w-10 h-10 text-red-600 mx-auto" />
        <div className="font-bold text-red-800 dark:text-red-300">
          {toast?.text || 'تعذر تحميل المزرعة الافتراضية'}
        </div>
        <button
          onClick={() => fetchFarmState()}
          className="px-4 py-2 rounded-xl bg-emerald-600 text-white text-xs font-bold"
        >
          إعادة المحاولة
        </button>
      </div>
    );
  }

  const selectedPlot: FarmPlotState =
    farm.plots.find((p: FarmPlotState) => p.id === selectedPlotId) || farm.plots[0];
  const selectedCrop = selectedPlot?.cropId
    ? crops.find((c) => c.id === selectedPlot.cropId)
    : undefined;
  const currentStage =
    selectedCrop && selectedPlot
      ? selectedCrop.stages[selectedPlot.stageIndex] || selectedCrop.stages[0]
      : null;

  const estServerNow = tickNow + serverOffsetMs;
  const stageDurationMs = (currentStage?.durationSec || 0) * 1000;
  const stageElapsedMs = selectedPlot?.lastStageAdvanceAt
    ? Math.max(0, estServerNow - selectedPlot.lastStageAdvanceAt)
    : 0;
  const remainingSec =
    stageDurationMs > 0 ? Math.max(0, Math.ceil((stageDurationMs - stageElapsedMs) / 1000)) : 0;
  const stagePct =
    stageDurationMs > 0 ? Math.min(100, Math.round((stageElapsedMs / stageDurationMs) * 100)) : 100;

  const isHarvestReady =
    !!selectedCrop && selectedPlot.stageIndex >= selectedCrop.stages.length - 1;

  const unreadNotifs = (farm.notifications || []).filter((n: any) => !n.isRead).length;
  const todayKey = new Date(estServerNow).toLocaleDateString('en-CA', { timeZone: 'Asia/Muscat' });
  const canClaimDaily = farm.lastDailyLoginKey !== todayKey;

  const sortedLeaderboard = [...socialData.leaderboard].sort((a, b) => {
    if (boardTab === 'weekly') return (b.weeklyPoints || 0) - (a.weeklyPoints || 0);
    if (boardTab === 'monthly') return (b.monthlyPoints || 0) - (a.monthlyPoints || 0);
    return (b.points || 0) - (a.points || 0);
  });

  const guideCrop = crops.find((c) => c.id === guideCropId) || crops[0];

  return (
    <div className="max-w-7xl mx-auto space-y-4">
      {/* Top Status & Controls Header */}
      <div className="rounded-2xl bg-stone-900 text-white p-4 border border-stone-800 shadow-md flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-emerald-600 flex items-center justify-center text-2xl shrink-0">
            🌴
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-lg font-extrabold text-white">{farm.farmName}</h1>
              <span className="text-[11px] px-2 py-0.5 rounded-md bg-emerald-950 text-emerald-300 border border-emerald-700 font-bold">
                المستوى {farm.level}
              </span>
              <span className="text-[11px] px-2 py-0.5 rounded-md bg-stone-800 text-stone-300">
                {farm.governorate}
              </span>
            </div>
            <div className="text-[11px] text-stone-400 mt-0.5">
              المزارع: {farm.ownerName} · النمو الحقيقي مستمر في الخادم · لعبة مجانية 100%
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 text-xs">
          <div className="px-3 py-1.5 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-300 font-bold">
            🪙 {farm.coins} عملة
          </div>
          <div className="px-3 py-1.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 font-bold">
            ⭐ {farm.points} نقطة ({farm.dailyPointsEarned || 0}/{350} اليوم)
          </div>
          <div className="px-3 py-1.5 rounded-xl bg-sky-500/15 border border-sky-500/30 text-sky-300 font-bold flex items-center gap-1">
            <Droplets className="w-3.5 h-3.5" />
            <span>{farm.waterLiters}/{farm.maxWaterLiters} لتر</span>
          </div>

          {canClaimDaily && (
            <button
              onClick={() => performAction('daily_login')}
              disabled={busyAction}
              className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold flex items-center gap-1.5"
            >
              <Gift className="w-3.5 h-3.5" />
              <span>مكافأة اليوم</span>
            </button>
          )}

          <button
            onClick={() => fetchFarmState(true)}
            className="p-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-200"
            title="مزامنة الوقت الحقيقي من الخادم"
          >
            <RefreshCw className="w-4 h-4" />
          </button>

          <button
            onClick={() => setSoundEnabled((s) => !s)}
            className="p-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-200"
            title={soundEnabled ? 'كتم مؤثرات اللعبة' : 'تفعيل مؤثرات اللعبة'}
          >
            {soundEnabled ? <Volume2 className="w-4 h-4 text-emerald-400" /> : <VolumeX className="w-4 h-4 text-stone-400" />}
          </button>

          <button
            onClick={() => setActiveModal('notifications')}
            className="relative p-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-200"
            title="تنبيهات المزرعة"
          >
            {farm.notificationsEnabled ? <Bell className="w-4 h-4 text-amber-400" /> : <BellOff className="w-4 h-4 text-stone-400" />}
            {unreadNotifs > 0 && farm.notificationsEnabled && (
              <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-red-600 text-[10px] font-bold flex items-center justify-center text-white">
                {unreadNotifs}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Quick Feature Bar above 3D Canvas (no clutter over canvas) */}
      <div className="flex flex-wrap items-center justify-between gap-2 bg-white dark:bg-stone-900 p-2.5 rounded-2xl border border-stone-200 dark:border-stone-800 shadow-sm text-xs">
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            onClick={() => setActiveModal('shop')}
            className="px-3 py-1.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800 font-bold flex items-center gap-1.5"
          >
            <ShoppingBag className="w-3.5 h-3.5" />
            <span>المتجر والمخزن</span>
          </button>
          <button
            onClick={() => setActiveModal('greenhouse')}
            className="px-3 py-1.5 rounded-xl bg-cyan-50 dark:bg-cyan-950/40 text-cyan-800 dark:text-cyan-300 border border-cyan-200 dark:border-cyan-800 font-bold flex items-center gap-1.5"
          >
            <Thermometer className="w-3.5 h-3.5" />
            <span>البيت المحمي ({farm.greenhouseTemp}°م)</span>
          </button>
          <button
            onClick={() => setActiveModal('crops_guide')}
            className="px-3 py-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 font-bold flex items-center gap-1.5"
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>ملف المحاصيل (10 نقاط)</span>
          </button>
          <button
            onClick={() => {
              setActiveModal('advisor');
              if (!advisorReply) handleAskAdvisor();
            }}
            className="px-3 py-1.5 rounded-xl bg-purple-50 dark:bg-purple-950/40 text-purple-800 dark:text-purple-300 border border-purple-200 dark:border-purple-800 font-bold flex items-center gap-1.5"
          >
            <Bot className="w-3.5 h-3.5" />
            <span>المستشار الزراعي AI</span>
          </button>
          <button
            onClick={() => {
              fetchSocial();
              setActiveModal('social');
            }}
            className="px-3 py-1.5 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-800 dark:text-blue-300 border border-blue-200 dark:border-blue-800 font-bold flex items-center gap-1.5"
          >
            <Trophy className="w-3.5 h-3.5" />
            <span>الأصدقاء ومنافسات عُمان</span>
          </button>
        </div>

        {/* Camera Presets */}
        <div className="flex items-center gap-1 text-[11px]">
          <Camera className="w-3.5 h-3.5 text-stone-400 ml-1" />
          {(
            [
              ['overview', 'نظرة شاملة'],
              ['field', 'الحقل'],
              ['greenhouse', 'البيت المحمي'],
              ['falaj', 'الفلج والخزان'],
            ] as Array<[FarmCameraPreset, string]>
          ).map(([key, label]) => (
            <button
              key={key}
              onClick={() => {
                setCameraPreset(key);
                setPresetTrigger((n) => n + 1);
              }}
              className={`px-2.5 py-1 rounded-lg font-semibold transition-colors ${
                cameraPreset === key
                  ? 'bg-emerald-600 text-white'
                  : 'bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300 hover:bg-stone-200'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Samail Daily Almanac, Weather, Falaj Turn & Book Advice Bar */}
      <div className="rounded-2xl bg-gradient-to-l from-emerald-50 via-stone-50 to-sky-50 dark:from-emerald-950/30 dark:via-stone-900 dark:to-sky-950/30 border border-emerald-200/80 dark:border-emerald-900/60 p-3 shadow-sm space-y-2 text-xs">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <span className="px-2.5 py-1 rounded-xl bg-emerald-700 text-white font-bold flex items-center gap-1.5">
              <CalendarDays className="w-3.5 h-3.5" />
              <span>اليوم الزراعي {farm.farmDay || 1}</span>
            </span>
            <span className="px-2.5 py-1 rounded-xl bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-stone-800 dark:text-stone-200 font-bold">
              🌦️ {farm.seasonName || 'الموسم العُماني المعتدل'} · {farm.ambientTemp ?? 26}°م
            </span>
            {farm.falajTurnActive ? (
              farm.falajCollectedDay === farm.farmDay ? (
                <span className="px-2.5 py-1 rounded-xl bg-sky-100 dark:bg-sky-900/50 border border-sky-300 dark:border-sky-700 text-sky-800 dark:text-sky-200 font-bold flex items-center gap-1">
                  <Droplets className="w-3.5 h-3.5" />
                  <span>تم استلام نوبة الفلج اليوم ✓</span>
                </span>
              ) : (
                <button
                  onClick={() => performAction('collect_falaj')}
                  disabled={busyAction}
                  className="px-3 py-1 rounded-xl bg-sky-600 hover:bg-sky-500 disabled:opacity-50 text-white font-bold flex items-center gap-1.5 shadow-sm animate-pulse"
                >
                  <Droplets className="w-3.5 h-3.5" />
                  <span>استلام نوبة الفلج (+120 لتر مجاناً)</span>
                </button>
              )
            ) : (
              <span className="px-2.5 py-1 rounded-xl bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300 font-semibold">
                💧 نوبة الفلج القادمة بعد {(farm.farmDay || 1) % 3 === 2 ? 2 : 1} يوم
              </span>
            )}
          </div>

          <button
            onClick={() => performAction('advance_day')}
            disabled={busyAction}
            className="px-3 py-1.5 rounded-xl bg-stone-900 dark:bg-stone-700 hover:bg-stone-800 disabled:opacity-50 text-white font-bold flex items-center gap-1.5 shrink-0"
            title="محاكاة الانتقال إلى اليوم الزراعي التالي"
          >
            <FastForward className="w-3.5 h-3.5" />
            <span>يوم تالٍ</span>
          </button>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-[11px] text-stone-700 dark:text-stone-300 pt-1 border-t border-emerald-200/60 dark:border-stone-800">
          <div className="flex items-start gap-1.5">
            <BookOpen className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
            <span>
              <strong className="text-emerald-800 dark:text-emerald-300">إرشاد اليوم (دليل سمائل): </strong>
              {selectedCrop?.dailyTipsByStage?.[selectedPlot?.stageIndex || 0] ||
                farm.dailyBookTip ||
                farm.seasonHint}
            </span>
          </div>
          {selectedCrop?.safeControlHint && (
            <div className="flex items-start gap-1.5 text-amber-800 dark:text-amber-300 bg-amber-50/80 dark:bg-amber-950/30 px-2.5 py-1 rounded-lg border border-amber-200/70 dark:border-amber-800/50 shrink-0 sm:max-w-md">
              <ShieldCheck className="w-3.5 h-3.5 shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" />
              <span>
                <strong>المكافحة الآمنة (160/2023): </strong>
                {selectedCrop.safeControlHint}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Feedback Toast Banner */}
      {toast && (
        <div
          className={`p-3 rounded-xl text-xs font-bold flex items-center justify-between border ${
            toast.type === 'ok'
              ? 'bg-emerald-50 dark:bg-emerald-950 border-emerald-300 dark:border-emerald-700 text-emerald-900 dark:text-emerald-200'
              : toast.type === 'warn'
                ? 'bg-amber-50 dark:bg-amber-950 border-amber-300 dark:border-amber-700 text-amber-900 dark:text-amber-200'
                : 'bg-red-50 dark:bg-red-950 border-red-300 dark:border-red-700 text-red-900 dark:text-red-200'
          }`}
        >
          <span className="flex items-center gap-2">
            {toast.type === 'ok' ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertTriangle className="w-4 h-4 shrink-0" />}
            {toast.text}
          </span>
          <button onClick={() => setToast(null)} className="px-2">×</button>
        </div>
      )}

      {/* 3D Interactive Viewport + Collapsible Bottom Control Dock (NO backdrop-blur over WebGL) */}
      <div className="relative rounded-3xl overflow-hidden border border-stone-200 dark:border-stone-800 bg-sky-100 shadow-lg h-[480px] sm:h-[560px]">
        <FarmScene3D
          farm={farm}
          crops={crops}
          selectedPlotId={selectedPlotId}
          onSelectPlot={setSelectedPlotId}
          cameraPreset={cameraPreset}
          presetTrigger={presetTrigger}
        />

        {/* Minimal Top-Right Plot Selector Pills for Mobile Accessibility */}
        <div className="absolute top-3 right-3 flex flex-wrap gap-1 max-w-[260px] sm:max-w-md pointer-events-auto">
          {farm.plots.map((p: FarmPlotState) => {
            const c = p.cropId ? crops.find((x) => x.id === p.cropId) : null;
            return (
              <button
                key={p.id}
                onClick={() => setSelectedPlotId(p.id)}
                className={`px-2 py-1 rounded-lg text-[10px] font-bold border transition-colors ${
                  selectedPlotId === p.id
                    ? 'bg-emerald-600 text-white border-emerald-400'
                    : p.isUnlocked
                      ? 'bg-stone-900/85 text-stone-100 border-stone-700 hover:bg-stone-800'
                      : 'bg-stone-800/70 text-stone-400 border-stone-700'
                }`}
              >
                {p.isGreenhouse ? '🏡' : '🌱'} {p.plotIndex + 1}
                {!p.isUnlocked ? '🔒' : c ? `·${c.nameAr.split(' ')[0]}` : ''}
              </button>
            );
          })}
        </div>

        {/* Collapsible Bottom Control Dock (Zero backdrop-blur over WebGL) */}
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 w-[96%] max-w-4xl pointer-events-auto">
          <div className="flex justify-center mb-1">
            <button
              onClick={() => setDockCollapsed((v) => !v)}
              className="px-3 py-1 rounded-t-xl bg-stone-900 text-stone-200 border border-b-0 border-stone-700 text-[11px] font-bold flex items-center gap-1"
            >
              {dockCollapsed ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              <span>{dockCollapsed ? 'إظهار أدوات المزرعة' : 'إخفاء اللوحة للمعاينة'}</span>
            </button>
          </div>

          {!dockCollapsed && (
            <div className="rounded-2xl bg-stone-900/95 text-white border border-stone-700 p-3 sm:p-4 shadow-2xl space-y-3">
              {/* Plot Telemetry Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-stone-800 pb-2 text-xs">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-extrabold text-emerald-400">
                    القطعة #{selectedPlot.plotIndex + 1} {selectedPlot.isGreenhouse ? '(داخل البيت المحمي)' : '(الحقل المكشوف)'}
                  </span>
                  {!selectedPlot.isUnlocked ? (
                    <span className="px-2 py-0.5 rounded bg-amber-900/60 text-amber-300 text-[11px]">
                      قطعة مقفلة — افتحها من المتجر
                    </span>
                  ) : selectedCrop && currentStage ? (
                    <>
                      <span className="font-bold text-white">{selectedCrop.nameAr}</span>
                      <span className="px-2 py-0.5 rounded bg-emerald-900/70 text-emerald-200 text-[11px]">
                        المرحلة {selectedPlot.stageIndex + 1}/{selectedCrop.stages.length}: {currentStage.name}
                      </span>
                      {!isHarvestReady && (
                        <span className="text-[11px] font-mono text-amber-300">
                          {selectedPlot.blockedReason
                            ? 'متوقف النمو'
                            : remainingSec > 0
                              ? `المرحلة التالية خلال ${remainingSec}ث (${stagePct}%)`
                              : 'جاري التحديث...'}
                        </span>
                      )}
                    </>
                  ) : (
                    <span className="text-stone-300 text-[11px]">
                      {selectedPlot.soilLeveled
                        ? 'التربة محروثة ومسواة — جاهزة للزراعة!'
                        : selectedPlot.soilPrepared
                          ? 'التربة محروثة — تحتاج للتسوية الآن'
                          : 'أرض بكر — تحتاج إلى الحرث ثم التسوية'}
                    </span>
                  )}
                </div>

                {/* Plot Meters */}
                {selectedPlot.isUnlocked && (
                  <div className="flex flex-wrap items-center gap-2 text-[11px]">
                    <span className={selectedPlot.moisture > 90 || selectedPlot.moisture < 30 ? 'text-amber-300 font-bold' : 'text-sky-300'}>
                      💧 رطوبة {Math.round(selectedPlot.moisture)}%
                    </span>
                    <span className={selectedPlot.nutrients > 94 || selectedPlot.nutrients < 30 ? 'text-amber-300 font-bold' : 'text-emerald-300'}>
                      🧪 غذاء {Math.round(selectedPlot.nutrients)}%
                    </span>
                    <span className={selectedPlot.health < 60 ? 'text-red-400 font-bold' : 'text-lime-300'}>
                      ❤️ صحة {Math.round(selectedPlot.health)}%
                    </span>
                    {selectedPlot.weedsLevel >= 15 && (
                      <span className="text-yellow-300 font-bold">🌿 أعشاب {Math.round(selectedPlot.weedsLevel)}%</span>
                    )}
                    {selectedPlot.pestType && (
                      <span className="text-red-400 font-bold">🐛 {selectedPlot.pestType}</span>
                    )}
                  </div>
                )}
              </div>

              {/* Educational Blocker / Warning */}
              {selectedPlot.blockedReason && (
                <div className="px-3 py-1.5 rounded-lg bg-amber-950 border border-amber-700 text-amber-200 text-[11px] flex items-center gap-2">
                  <AlertTriangle className="w-3.5 h-3.5 shrink-0 text-amber-400" />
                  <span>{selectedPlot.blockedReason}</span>
                </div>
              )}

              {/* The 10 Interactive Agricultural Operations */}
              {selectedPlot.isUnlocked ? (
                <div className="space-y-2">
                  <div className="grid grid-cols-5 sm:grid-cols-10 gap-1.5 text-[11px]">
                    <button
                      onClick={() => performAction('plow', selectedPlot.id)}
                      disabled={busyAction || !!selectedPlot.cropId || selectedPlot.soilPrepared}
                      className="p-2 rounded-xl bg-stone-800 hover:bg-stone-700 disabled:opacity-40 flex flex-col items-center gap-1"
                    >
                      <Shovel className="w-4 h-4 text-amber-400" />
                      <span>1. حرث</span>
                    </button>

                    <button
                      onClick={() => performAction('level_soil', selectedPlot.id)}
                      disabled={busyAction || !!selectedPlot.cropId || !selectedPlot.soilPrepared || selectedPlot.soilLeveled}
                      className="p-2 rounded-xl bg-stone-800 hover:bg-stone-700 disabled:opacity-40 flex flex-col items-center gap-1"
                    >
                      <Layers className="w-4 h-4 text-amber-300" />
                      <span>2. تسوية</span>
                    </button>

                    <button
                      onClick={() => setActiveModal('seeds')}
                      disabled={busyAction || !!selectedPlot.cropId || !selectedPlot.soilLeveled}
                      className="p-2 rounded-xl bg-emerald-700 hover:bg-emerald-600 disabled:opacity-40 flex flex-col items-center gap-1 font-bold"
                    >
                      <Sprout className="w-4 h-4 text-white" />
                      <span>3. زراعة</span>
                    </button>

                    <button
                      onClick={() => performAction('irrigate', selectedPlot.id)}
                      disabled={busyAction || !selectedPlot.cropId}
                      className="p-2 rounded-xl bg-sky-700 hover:bg-sky-600 disabled:opacity-40 flex flex-col items-center gap-1"
                    >
                      <Droplets className="w-4 h-4 text-sky-200" />
                      <span>4. ري</span>
                    </button>

                    <button
                      onClick={() => performAction('fertilize', selectedPlot.id, { fertType: fertChoice })}
                      disabled={busyAction || !selectedPlot.cropId}
                      className="p-2 rounded-xl bg-lime-800 hover:bg-lime-700 disabled:opacity-40 flex flex-col items-center gap-1"
                    >
                      <Sparkles className="w-4 h-4 text-lime-200" />
                      <span>5. تسميد</span>
                    </button>

                    <button
                      onClick={() => performAction('weed', selectedPlot.id)}
                      disabled={busyAction || selectedPlot.weedsLevel < 10}
                      className="p-2 rounded-xl bg-stone-800 hover:bg-stone-700 disabled:opacity-40 flex flex-col items-center gap-1"
                    >
                      <Sprout className="w-4 h-4 text-yellow-400" />
                      <span>6. أعشاب</span>
                    </button>

                    <button
                      onClick={() => performAction('prune', selectedPlot.id)}
                      disabled={busyAction || !selectedPlot.cropId || selectedPlot.pruned}
                      className="p-2 rounded-xl bg-stone-800 hover:bg-stone-700 disabled:opacity-40 flex flex-col items-center gap-1"
                    >
                      <Scissors className="w-4 h-4 text-teal-300" />
                      <span>7. تقليم</span>
                    </button>

                    <button
                      onClick={() => performAction('pest_control', selectedPlot.id)}
                      disabled={busyAction || !selectedPlot.pestType}
                      className="p-2 rounded-xl bg-red-800 hover:bg-red-700 disabled:opacity-40 flex flex-col items-center gap-1"
                    >
                      <Bug className="w-4 h-4 text-red-200" />
                      <span>8. مكافحة</span>
                    </button>

                    <button
                      onClick={() => performAction('harvest', selectedPlot.id)}
                      disabled={busyAction || !isHarvestReady}
                      className="p-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 disabled:opacity-40 disabled:bg-stone-800 disabled:text-stone-400 flex flex-col items-center gap-1 font-extrabold"
                    >
                      <Wheat className="w-4 h-4" />
                      <span>9. حصاد</span>
                    </button>

                    <button
                      onClick={() => performAction('clear_reset', selectedPlot.id)}
                      disabled={busyAction}
                      className="p-2 rounded-xl bg-stone-800 hover:bg-stone-700 disabled:opacity-40 flex flex-col items-center gap-1"
                    >
                      <RotateCcw className="w-4 h-4 text-stone-300" />
                      <span>10. تهيئة</span>
                    </button>
                  </div>

                  {/* Inventory Strip */}
                  <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-stone-300 pt-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span>نوع السماد المختار:</span>
                      <button
                        onClick={() => setFertChoice('fert_organic')}
                        className={`px-2 py-0.5 rounded-md border ${
                          fertChoice === 'fert_organic'
                            ? 'bg-emerald-700 border-emerald-500 text-white'
                            : 'bg-stone-800 border-stone-700 text-stone-300'
                        }`}
                      >
                        عضوي ({farm.inventory?.fert_organic || 0})
                      </button>
                      <button
                        onClick={() => setFertChoice('fert_npk')}
                        className={`px-2 py-0.5 rounded-md border ${
                          fertChoice === 'fert_npk'
                            ? 'bg-amber-700 border-amber-500 text-white'
                            : 'bg-stone-800 border-stone-700 text-stone-300'
                        }`}
                      >
                        مركب NPK ({farm.inventory?.fert_npk || 0})
                      </button>
                      <span className="px-2 py-0.5 rounded-md bg-stone-800 border border-stone-700">
                        مكافحة حيوية نيم: {farm.inventory?.pest_neem || 0}
                      </span>
                    </div>
                    <span className="text-[10px] text-stone-400">
                      تلميح: اسحب للتدوير · مرر للتكبير · انقر على قطعة لاختيارها
                    </span>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between gap-3 py-1 text-xs">
                  <span className="text-stone-300 flex items-center gap-2">
                    <Lock className="w-4 h-4 text-amber-400" />
                    <span>
                      {selectedPlot.isGreenhouse
                        ? 'هذا السرير محجوز لتوسعة البيت المحمي (المستوى التالي).'
                        : 'استصلح هذه القطعة بالعملات الافتراضية من المتجر لزيادة إنتاج مزرعتك.'}
                    </span>
                  </span>
                  <button
                    onClick={() =>
                      performAction('buy_item', undefined, {
                        itemId: selectedPlot.isGreenhouse ? 'upgrade_greenhouse' : 'expand_plot',
                      })
                    }
                    className="px-4 py-1.5 rounded-xl bg-amber-500 text-stone-950 font-bold shrink-0"
                  >
                    فتح الآن ({selectedPlot.isGreenhouse ? 180 : 120} عملة)
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Modal 1: Seed Picker */}
      {activeModal === 'seeds' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-950/75">
          <div className="bg-white dark:bg-stone-900 rounded-3xl w-full max-w-2xl max-h-[85vh] overflow-y-auto p-6 border border-stone-200 dark:border-stone-800 space-y-4">
            <div className="flex items-center justify-between border-b border-stone-200 dark:border-stone-800 pb-3">
              <h3 className="font-bold text-base text-stone-900 dark:text-white">
                اختر المحصول للزراعة في القطعة #{selectedPlot.plotIndex + 1}
              </h3>
              <button onClick={() => setActiveModal(null)} className="p-1 text-stone-400 hover:text-stone-700">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              {crops.map((c) => {
                const suitable = selectedPlot.isGreenhouse ? c.greenhouseSuitable : c.openFieldSuitable;
                return (
                  <div
                    key={c.id}
                    className={`p-3.5 rounded-2xl border space-y-2 ${
                      suitable
                        ? 'border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800/50'
                        : 'border-stone-200 dark:border-stone-800 opacity-50'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-bold text-stone-900 dark:text-white flex items-center gap-1.5">
                        <span>{c.nameAr}</span>
                        {c.bookCitationCode && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-900/50 text-amber-800 dark:text-amber-300 font-bold">
                            {c.bookCitationCode}
                          </span>
                        )}
                      </span>
                      <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-100 dark:bg-emerald-900/50 text-emerald-800 dark:text-emerald-300 shrink-0">
                        {c.category}
                      </span>
                    </div>
                    <div className="text-[11px] text-stone-500 dark:text-stone-400">
                      الموسم: {c.preferredSeason}
                    </div>
                    <div className="text-[11px] text-stone-500 dark:text-stone-400">
                      المناطق: {c.omaniRegions}
                    </div>
                    <div className="flex items-center justify-between pt-1">
                      <span className="text-amber-700 dark:text-amber-300 font-bold">
                        البذور: {c.seedCostCoins} 🪙 · العائد: {c.harvestCoins} 🪙
                      </span>
                      <button
                        disabled={!suitable || busyAction}
                        onClick={async () => {
                          const ok = await performAction('plant', selectedPlot.id, { cropId: c.id });
                          if (ok) setActiveModal(null);
                        }}
                        className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:bg-stone-400 text-white font-bold"
                      >
                        {suitable ? 'زراعة الآن' : selectedPlot.isGreenhouse ? 'للحقل فقط' : 'للبيت المحمي فقط'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Modal 2: Virtual Currency Farm Shop (Zero Real-Money Purchases) */}
      {activeModal === 'shop' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-950/75">
          <div className="bg-white dark:bg-stone-900 rounded-3xl w-full max-w-2xl max-h-[85vh] overflow-y-auto p-6 border border-stone-200 dark:border-stone-800 space-y-4">
            <div className="flex items-center justify-between border-b border-stone-200 dark:border-stone-800 pb-3">
              <div>
                <h3 className="font-bold text-base text-stone-900 dark:text-white">
                  متجر المزرعة الافتراضي (عملات اللعب المجانية فقط)
                </h3>
                <p className="text-[11px] text-stone-500">رصيدك الحالي: {farm.coins} عملة افتراضية · لا توجد أي مشتريات بمال حقيقي</p>
              </div>
              <button onClick={() => setActiveModal(null)} className="p-1 text-stone-400 hover:text-stone-700">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              {VIRTUAL_SHOP_ITEMS.map((item: VirtualShopItem) => (
                <div key={item.id} className="p-4 rounded-2xl border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800/40 flex flex-col justify-between gap-3">
                  <div>
                    <div className="font-bold text-stone-900 dark:text-white">{item.nameAr}</div>
                    <p className="text-[11px] text-stone-500 dark:text-stone-400 mt-1">{item.description}</p>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-amber-600 dark:text-amber-400">{item.costCoins} 🪙</span>
                    <button
                      disabled={busyAction || farm.coins < item.costCoins}
                      onClick={() => performAction('buy_item', undefined, { itemId: item.id })}
                      className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:bg-stone-400 text-white font-bold"
                    >
                      شراء وتوريد
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Modal 3: Greenhouse Control */}
      {activeModal === 'greenhouse' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-950/75">
          <div className="bg-white dark:bg-stone-900 rounded-3xl w-full max-w-md p-6 border border-stone-200 dark:border-stone-800 space-y-5">
            <div className="flex items-center justify-between border-b border-stone-200 dark:border-stone-800 pb-3">
              <h3 className="font-bold text-base text-stone-900 dark:text-white">
                غرفة التحكم بالبيت المحمي (المستوى {farm.greenhouseLevel})
              </h3>
              <button onClick={() => setActiveModal(null)} className="p-1 text-stone-400 hover:text-stone-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-3 rounded-2xl bg-orange-50 dark:bg-orange-950/30 border border-orange-200 dark:border-orange-800">
                <div className="text-stone-500">درجة الحرارة الداخلية</div>
                <div className="text-xl font-black text-orange-600 mt-1">{farm.greenhouseTemp}°C</div>
              </div>
              <div className="p-3 rounded-2xl bg-sky-50 dark:bg-sky-950/30 border border-sky-200 dark:border-sky-800">
                <div className="text-stone-500">الرطوبة النسبية</div>
                <div className="text-xl font-black text-sky-600 mt-1">{farm.greenhouseHumidity}%</div>
              </div>
            </div>

            <div className="space-y-3 text-xs">
              <div className="flex items-center justify-between p-3 rounded-xl bg-stone-50 dark:bg-stone-800">
                <span className="font-bold flex items-center gap-2">
                  <Wind className="w-4 h-4 text-cyan-600" />
                  <span>مراوح التهوية والتبريد الصحراوي</span>
                </span>
                <button
                  onClick={() =>
                    performAction('greenhouse_control', undefined, {
                      ventilation: !farm.greenhouseVentilation,
                    })
                  }
                  className={`px-3 py-1 rounded-lg font-bold ${
                    farm.greenhouseVentilation ? 'bg-emerald-600 text-white' : 'bg-stone-300 text-stone-800'
                  }`}
                >
                  {farm.greenhouseVentilation ? 'يعمل' : 'متوقف'}
                </button>
              </div>

              <div className="flex items-center justify-between p-3 rounded-xl bg-stone-50 dark:bg-stone-800">
                <span className="font-bold flex items-center gap-2">
                  <Droplets className="w-4 h-4 text-sky-600" />
                  <span>الري الآلي بالتنقيط</span>
                </span>
                <button
                  onClick={() =>
                    performAction('greenhouse_control', undefined, {
                      irrigationAuto: !farm.greenhouseIrrigationAuto,
                    })
                  }
                  className={`px-3 py-1 rounded-lg font-bold ${
                    farm.greenhouseIrrigationAuto ? 'bg-emerald-600 text-white' : 'bg-stone-300 text-stone-800'
                  }`}
                >
                  {farm.greenhouseIrrigationAuto ? 'مفعل' : 'يدوي'}
                </button>
              </div>

              <div className="p-3 rounded-xl bg-stone-50 dark:bg-stone-800 space-y-2">
                <div className="flex items-center justify-between font-bold">
                  <span className="flex items-center gap-2">
                    <SunMedium className="w-4 h-4 text-amber-500" />
                    <span>نسبة التظليل (الراشيل)</span>
                  </span>
                  <span>{farm.greenhouseShading}%</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={80}
                  step={10}
                  value={farm.greenhouseShading}
                  onChange={(e) =>
                    performAction('greenhouse_control', undefined, {
                      shading: Number(e.target.value),
                    })
                  }
                  className="w-full accent-emerald-600"
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal 4: 10-Point Agricultural Crop Guide */}
      {activeModal === 'crops_guide' && guideCrop && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-950/75">
          <div className="bg-white dark:bg-stone-900 rounded-3xl w-full max-w-3xl max-h-[85vh] overflow-y-auto p-6 border border-stone-200 dark:border-stone-800 space-y-4">
            <div className="flex items-center justify-between border-b border-stone-200 dark:border-stone-800 pb-3">
              <h3 className="font-bold text-base text-stone-900 dark:text-white">
                الملف العلمي الشامل للمحاصيل (10 نقاط زراعية معتمدة)
              </h3>
              <button onClick={() => setActiveModal(null)} className="p-1 text-stone-400 hover:text-stone-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex flex-wrap gap-1.5">
              {crops.map((c) => (
                <button
                  key={c.id}
                  onClick={() => setGuideCropId(c.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold ${
                    guideCrop.id === c.id
                      ? 'bg-emerald-600 text-white'
                      : 'bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300'
                  }`}
                >
                  {c.nameAr}
                </button>
              ))}
            </div>

            <div className="p-4 rounded-2xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 text-xs space-y-1.5">
              <div className="font-extrabold text-sm text-emerald-900 dark:text-emerald-200 flex flex-wrap items-center gap-2">
                <span>{guideCrop.nameAr} ({guideCrop.nameEn})</span>
                {guideCrop.bookCitationCode && (
                  <span className="text-[11px] px-2 py-0.5 rounded-md bg-amber-100 dark:bg-amber-900/50 text-amber-800 dark:text-amber-300">
                    توثيق كتاب سمائل {guideCrop.bookCitationCode}
                  </span>
                )}
              </div>
              <div className="text-stone-600 dark:text-stone-300">الموسم المفضل: {guideCrop.preferredSeason} · المحافظات: {guideCrop.omaniRegions}</div>
              {guideCrop.safeControlHint && (
                <div className="text-[11px] text-amber-800 dark:text-amber-300 pt-1">
                  <strong>المكافحة الآمنة (القرار 160/2023): </strong>
                  {guideCrop.safeControlHint}
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              {[
                ['1. تجهيز الأرض', guideCrop.guide['1_landPrep']],
                ['2. نوع التربة المناسبة', guideCrop.guide['2_soilType']],
                ['3. البذور أو الشتلات', guideCrop.guide['3_seedsOrSeedlings']],
                ['4. طريقة الزراعة والمسافات', guideCrop.guide['4_plantingMethod']],
                ['5. احتياجات الري', guideCrop.guide['5_irrigationNeeds']],
                ['6. برنامج التسميد', guideCrop.guide['6_fertilization']],
                ['7. مراحل النمو', guideCrop.guide['7_growthStagesSummary']],
                ['8. الأمراض والآفات الشائعة', guideCrop.guide['8_diseasesAndPests']],
                ['9. الوقاية والمكافحة الآمنة', guideCrop.guide['9_preventionAndControl']],
                ['10. علامات النضج والحصاد', guideCrop.guide['10_harvestAndYield']],
              ].map(([title, text], i) => (
                <div key={i} className="p-3 rounded-xl bg-stone-50 dark:bg-stone-800/50 border border-stone-200 dark:border-stone-800 space-y-1">
                  <div className="font-bold text-emerald-700 dark:text-emerald-400">{title}</div>
                  <p className="text-stone-600 dark:text-stone-300 leading-relaxed">{text}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Modal 5: Safe AI Advisor inside Virtual Farm */}
      {activeModal === 'advisor' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-950/75">
          <div className="bg-white dark:bg-stone-900 rounded-3xl w-full max-w-lg p-6 border border-stone-200 dark:border-stone-800 space-y-4">
            <div className="flex items-center justify-between border-b border-stone-200 dark:border-stone-800 pb-3">
              <h3 className="font-bold text-base text-stone-900 dark:text-white flex items-center gap-2">
                <Bot className="w-5 h-5 text-purple-600" />
                <span>المستشار الزراعي الذكي (القطعة #{selectedPlot.plotIndex + 1})</span>
              </h3>
              <button onClick={() => setActiveModal(null)} className="p-1 text-stone-400 hover:text-stone-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 rounded-2xl bg-purple-50 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-800 text-xs leading-relaxed text-stone-800 dark:text-stone-200 min-h-[90px]">
              {advisorLoading ? 'جاري تحليل حالة المحصول وتجهيز الإرشاد الآمن...' : advisorReply || 'اكتب سؤالك للمستشار الزراعي.'}
            </div>

            <div className="flex gap-2 text-xs">
              <input
                type="text"
                value={advisorPrompt}
                onChange={(e) => setAdvisorPrompt(e.target.value)}
                placeholder="اسأل عن الري، التسميد، أو مكافحة الآفة بأمان..."
                className="flex-1 p-2.5 rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-stone-900 dark:text-white"
              />
              <button
                onClick={() => handleAskAdvisor()}
                disabled={advisorLoading}
                className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold flex items-center gap-1"
              >
                <Send className="w-4 h-4" />
                <span>اسأل</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal 6: Social, Friends, Oman Leaderboards, Achievements & Audit Log */}
      {activeModal === 'social' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-950/75">
          <div className="bg-white dark:bg-stone-900 rounded-3xl w-full max-w-3xl max-h-[88vh] overflow-y-auto p-6 border border-stone-200 dark:border-stone-800 space-y-5 text-xs">
            <div className="flex items-center justify-between border-b border-stone-200 dark:border-stone-800 pb-3">
              <h3 className="font-bold text-base text-stone-900 dark:text-white flex items-center gap-2">
                <Trophy className="w-5 h-5 text-amber-500" />
                <span>لوحة ترتيب عُمان · الأصدقاء · المنافسات · الإنجازات</span>
              </h3>
              <button onClick={() => setActiveModal(null)} className="p-1 text-stone-400 hover:text-stone-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Active Competitions */}
            {socialData.competitions.length > 0 && (
              <div className="space-y-2">
                <div className="font-bold text-stone-800 dark:text-stone-200">المسابقات والمنافسات المفتوحة في سلطنة عُمان:</div>
                {socialData.competitions.map((comp) => (
                  <div key={comp.id} className="p-3 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 flex items-center justify-between">
                    <div>
                      <div className="font-bold text-amber-900 dark:text-amber-200">{comp.title}</div>
                      <div className="text-[11px] text-stone-600 dark:text-stone-300">{comp.description}</div>
                    </div>
                    <span className="px-2.5 py-1 rounded-lg bg-amber-500 text-stone-950 font-bold shrink-0">+{comp.prizePoints} نقطة</span>
                  </div>
                ))}
              </div>
            )}

            {/* Leaderboard */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-stone-800 dark:text-stone-200">الترتيب العام للاعبي سلطنة عُمان:</span>
                <div className="flex gap-1">
                  {(['all', 'weekly', 'monthly'] as const).map((t) => (
                    <button
                      key={t}
                      onClick={() => setBoardTab(t)}
                      className={`px-2.5 py-1 rounded-lg font-bold ${
                        boardTab === t ? 'bg-emerald-600 text-white' : 'bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300'
                      }`}
                    >
                      {t === 'all' ? 'الكل' : t === 'weekly' ? 'أسبوعي' : 'شهري'}
                    </button>
                  ))}
                </div>
              </div>

              <div className="divide-y divide-stone-100 dark:divide-stone-800 border border-stone-200 dark:border-stone-800 rounded-2xl overflow-hidden">
                {sortedLeaderboard.map((player, idx) => {
                  const pts = boardTab === 'weekly' ? player.weeklyPoints : boardTab === 'monthly' ? player.monthlyPoints : player.points;
                  const isMe = player.userId === user.id;
                  return (
                    <div key={player.userId} className={`p-3 flex items-center justify-between ${isMe ? 'bg-emerald-50/70 dark:bg-emerald-950/30' : ''}`}>
                      <div className="flex items-center gap-3">
                        <span className="w-6 h-6 rounded-full bg-stone-200 dark:bg-stone-800 flex items-center justify-center font-bold">
                          {idx + 1}
                        </span>
                        <div>
                          <div className="font-bold text-stone-900 dark:text-white">
                            {player.name} {isMe && '(أنت)'}
                          </div>
                          <div className="text-[11px] text-stone-500">
                            {player.governorate} · المستوى {player.level} · {player.achievementsCount} إنجازات
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-black text-emerald-600 font-mono">{pts} نقطة</span>
                        {!isMe && (
                          <>
                            <button
                              onClick={() => handleSocialAction({ action: 'send_invite', targetUserId: player.userId })}
                              className="px-2.5 py-1 rounded-lg bg-blue-600 text-white font-bold flex items-center gap-1"
                            >
                              <Users className="w-3 h-3" />
                              <span>تحدي</span>
                            </button>
                            <button
                              onClick={() => handleSocialAction({ action: 'report_player', targetUserId: player.userId, reason: 'طلب مراجعة نزاهة النقاط' })}
                              className="p-1.5 rounded-lg bg-stone-100 dark:bg-stone-800 text-stone-500 hover:text-red-500"
                              title="إبلاغ عن مخالفة"
                            >
                              <Flag className="w-3.5 h-3.5" />
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Friend Invites */}
            {socialData.friendships.length > 0 && (
              <div className="space-y-2">
                <div className="font-bold text-stone-800 dark:text-stone-200">طلبات الصداقة والمنافسة:</div>
                {socialData.friendships.map((fr) => (
                  <div key={fr.id} className="p-3 rounded-xl bg-stone-50 dark:bg-stone-800 flex items-center justify-between">
                    <span>
                      {fr.requesterName} ↔ {fr.recipientName} ({fr.status === 'accepted' ? 'متنافسون ✅' : fr.status === 'pending' ? 'بانتظار القبول' : 'مرفوضة'})
                    </span>
                    {fr.status === 'pending' && fr.recipientId === user.id && (
                      <div className="flex gap-1.5">
                        <button
                          onClick={() => handleSocialAction({ action: 'respond_invite', friendshipId: fr.id, status: 'accepted' })}
                          className="px-2.5 py-1 rounded-lg bg-emerald-600 text-white font-bold"
                        >
                          قبول
                        </button>
                        <button
                          onClick={() => handleSocialAction({ action: 'respond_invite', friendshipId: fr.id, status: 'declined' })}
                          className="px-2.5 py-1 rounded-lg bg-stone-300 text-stone-800 font-bold"
                        >
                          رفض
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Achievements & Audit Logs */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <div className="font-bold text-stone-800 dark:text-stone-200 flex items-center gap-1.5">
                  <Award className="w-4 h-4 text-amber-500" />
                  <span>الإنجازات ({(farm.achievements || []).length}/{FARM_ACHIEVEMENTS.length})</span>
                </div>
                <div className="space-y-1.5">
                  {FARM_ACHIEVEMENTS.map((ach) => {
                    const unlocked = (farm.achievements || []).includes(ach.id);
                    return (
                      <div
                        key={ach.id}
                        className={`p-2.5 rounded-xl border flex items-center justify-between ${
                          unlocked
                            ? 'bg-amber-50/70 dark:bg-amber-950/30 border-amber-300 dark:border-amber-700'
                            : 'bg-stone-50 dark:bg-stone-800/40 border-stone-200 dark:border-stone-800 opacity-60'
                        }`}
                      >
                        <span>{ach.icon} {ach.titleAr}</span>
                        <span className="font-bold text-emerald-600">+{ach.rewardPoints}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-2">
                <div className="font-bold text-stone-800 dark:text-stone-200">سجل النقاط الموثق من الخادم:</div>
                <div className="max-h-56 overflow-y-auto divide-y divide-stone-100 dark:divide-stone-800 border border-stone-200 dark:border-stone-800 rounded-xl p-2">
                  {(farm.logs || []).slice(0, 12).map((l: any) => (
                    <div key={l.id} className="py-1.5 flex items-center justify-between gap-2">
                      <span className="text-stone-600 dark:text-stone-300">{l.description}</span>
                      {l.pointsDelta > 0 && <span className="font-bold text-emerald-600 shrink-0">+{l.pointsDelta}</span>}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal 7: Farm Notifications & User Preference Toggle */}
      {activeModal === 'notifications' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-950/75">
          <div className="bg-white dark:bg-stone-900 rounded-3xl w-full max-w-md p-6 border border-stone-200 dark:border-stone-800 space-y-4 text-xs">
            <div className="flex items-center justify-between border-b border-stone-200 dark:border-stone-800 pb-3">
              <h3 className="font-bold text-base text-stone-900 dark:text-white">تنبيهات المزرعة الافتراضية</h3>
              <button onClick={() => setActiveModal(null)} className="p-1 text-stone-400 hover:text-stone-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex items-center justify-between p-3 rounded-xl bg-stone-50 dark:bg-stone-800">
              <span className="font-bold">استلام إشعارات الري والحصاد والمنافسات</span>
              <button
                onClick={() => performAction('toggle_notifications')}
                className={`px-3 py-1 rounded-lg font-bold ${
                  farm.notificationsEnabled ? 'bg-emerald-600 text-white' : 'bg-stone-400 text-white'
                }`}
              >
                {farm.notificationsEnabled ? 'مفعلة' : 'موقفة'}
              </button>
            </div>

            <div className="max-h-72 overflow-y-auto space-y-2">
              {(farm.notifications || []).map((n: any) => (
                <div key={n.id} className="p-3 rounded-xl border border-stone-200 dark:border-stone-800 bg-stone-50/70 dark:bg-stone-800/40">
                  <div className="font-bold text-stone-900 dark:text-white">{n.title}</div>
                  <p className="text-stone-600 dark:text-stone-300 mt-0.5">{n.message}</p>
                </div>
              ))}
            </div>

            <button
              onClick={() => performAction('mark_notifications_read')}
              className="w-full py-2 rounded-xl bg-stone-200 dark:bg-stone-800 font-bold text-stone-800 dark:text-stone-200"
            >
              تحديد الكل كمقروء
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

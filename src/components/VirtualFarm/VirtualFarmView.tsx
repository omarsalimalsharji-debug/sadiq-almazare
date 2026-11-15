import React, { useState, useEffect, useCallback, useRef } from 'react';
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
  Gamepad2,
  Footprints,
  Store,
  ClipboardCheck,
  Hammer,
  Package,
  TrendingUp,
  Heart,
  Home,
} from 'lucide-react';
import { UserProfile } from '../../types/index.ts';
import {
  VIRTUAL_CROPS,
  VIRTUAL_SHOP_ITEMS,
  FARM_ACHIEVEMENTS,
  FARM_LIVESTOCK_DEFS,
  FARM_BUILDING_DEFS,
  VirtualCropDef,
  VirtualShopItem,
} from '../../data/virtualFarmData.ts';
import {
  FarmScene3D,
  FarmCameraPreset,
  FarmPlotState,
  MoveVector2,
  NearbyFarmTarget,
  FarmVisualCommand,
} from './FarmScene3D.tsx';
import { FarmerAnimMode } from './OmaniModels3D.ts';

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
  | 'notifications'
  | 'livestock'
  | 'market'
  | 'quests';

type FarmSoundKind = 'action' | 'water' | 'plow' | 'plant' | 'harvest' | 'cow' | 'warn';

// Rich procedural Web Audio API game SFX (Zero 404 external audio files)
function playFarmTone(kind: FarmSoundKind, enabled: boolean) {
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
      osc.frequency.setValueAtTime(1046.5, now + 0.25);
      gain.gain.setValueAtTime(0.13, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);
      osc.start(now);
      osc.stop(now + 0.46);
    } else if (kind === 'water') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(320, now);
      osc.frequency.linearRampToValueAtTime(640, now + 0.12);
      osc.frequency.linearRampToValueAtTime(480, now + 0.24);
      gain.gain.setValueAtTime(0.09, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.28);
      osc.start(now);
      osc.stop(now + 0.29);
    } else if (kind === 'plow') {
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(160, now);
      osc.frequency.exponentialRampToValueAtTime(85, now + 0.16);
      gain.gain.setValueAtTime(0.14, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
      osc.start(now);
      osc.stop(now + 0.19);
    } else if (kind === 'plant') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(410, now);
      osc.frequency.setValueAtTime(590, now + 0.07);
      gain.gain.setValueAtTime(0.09, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
      osc.start(now);
      osc.stop(now + 0.21);
    } else if (kind === 'cow') {
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(145, now);
      osc.frequency.linearRampToValueAtTime(170, now + 0.14);
      osc.frequency.linearRampToValueAtTime(128, now + 0.34);
      gain.gain.setValueAtTime(0.055, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.36);
      osc.start(now);
      osc.stop(now + 0.37);
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
      osc.frequency.exponentialRampToValueAtTime(640, now + 0.09);
      gain.gain.setValueAtTime(0.075, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.13);
      osc.start(now);
      osc.stop(now + 0.14);
    }
    setTimeout(() => ctx.close().catch(() => {}), 550);
  } catch {
    // Ignore audio context restrictions
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
  const [dockCollapsed, setDockCollapsed] = useState<boolean>(true);
  const [joystickEnabled, setJoystickEnabled] = useState<boolean>(true);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [fertChoice, setFertChoice] = useState<'fert_organic' | 'fert_npk'>('fert_organic');
  const [nearbyTarget, setNearbyTarget] = useState<NearbyFarmTarget | null>(null);
  const [visualCommand, setVisualCommand] = useState<FarmVisualCommand | null>(null);
  const cmdNonceRef = useRef<number>(1);

  // 60fps Virtual Thumb Joystick refs (mutated directly without React re-renders)
  const moveInputRef = useRef<MoveVector2>({ x: 0, y: 0 });
  const joyPadRef = useRef<HTMLDivElement | null>(null);
  const thumbKnobRef = useRef<HTMLDivElement | null>(null);
  const activePointerIdRef = useRef<number | null>(null);

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
  const [marketTab, setMarketTab] = useState<'sell' | 'buildings'>('sell');

  const showToast = useCallback((type: 'ok' | 'warn' | 'err', text: string) => {
    setToast({ type, text });
    setTimeout(() => {
      setToast((curr) => (curr?.text === text ? null : curr));
    }, 4500);
  }, []);

  const updateJoystickFromPointer = (clientX: number, clientY: number) => {
    const pad = joyPadRef.current;
    if (!pad) return;
    const rect = pad.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const maxR = Math.max(24, rect.width * 0.36);

    let dx = clientX - cx;
    let dy = clientY - cy;
    const dist = Math.hypot(dx, dy);
    if (dist > maxR) {
      dx = (dx / dist) * maxR;
      dy = (dy / dist) * maxR;
    }

    moveInputRef.current.x = dx / maxR;
    moveInputRef.current.y = -dy / maxR;
    if (thumbKnobRef.current) {
      thumbKnobRef.current.style.transform = `translate(${dx}px, ${dy}px)`;
    }
  };

  const resetJoystick = () => {
    activePointerIdRef.current = null;
    moveInputRef.current.x = 0;
    moveInputRef.current.y = 0;
    if (thumbKnobRef.current) {
      thumbKnobRef.current.style.transform = 'translate(0px, 0px)';
    }
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
        if (action === 'harvest' || action === 'claim_quest' || action === 'sell_market') playFarmTone('harvest', soundEnabled);
        else if (action === 'irrigate' || action === 'collect_falaj') playFarmTone('water', soundEnabled);
        else if (action === 'plow' || action === 'level_soil' || action === 'upgrade_building') playFarmTone('plow', soundEnabled);
        else if (action === 'plant') playFarmTone('plant', soundEnabled);
        else if (action === 'feed_livestock' || action === 'collect_livestock') playFarmTone('cow', soundEnabled);
        else playFarmTone('action', soundEnabled);
        showToast('ok', data.feedback);
      }

      const animMap: Record<string, FarmerAnimMode> = {
        plow: 'plow',
        level_soil: 'level_soil',
        plant: 'plant',
        irrigate: 'irrigate',
        fertilize: 'fertilize',
        weed: 'weed',
        prune: 'prune',
        pest_control: 'pest_control',
        harvest: 'harvest',
        feed_livestock: 'feed_livestock',
        collect_livestock: 'collect_livestock',
        sell_market: 'sell_market',
        upgrade_building: 'upgrade_building',
      };
      const animMode = animMap[action];
      if (animMode) {
        cmdNonceRef.current += 1;
        setVisualCommand({
          nonce: cmdNonceRef.current,
          plotId,
          action: animMode,
        });
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
  const claimableQuestsCount = (farm.quests || []).filter((q: any) => !q.claimed && (q.progress || 0) >= (q.target || 1)).length;
  const totalWarehouseCount =
    Object.values(farm.warehouse?.crops || {}).reduce((s: number, v: any) => s + Number(v || 0), 0) +
    Object.values(farm.warehouse?.goods || {}).reduce((s: number, v: any) => s + Number(v || 0), 0);
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
      <div className="rounded-2xl bg-[#132247] text-white p-4 border border-sky-400/20 shadow-lg flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
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
              <span className="text-[11px] px-2 py-0.5 rounded-md bg-[#0b1329]/80 border border-sky-400/20 text-sky-200">
                {farm.governorate}
              </span>
            </div>
            <div className="text-[11px] text-sky-200/75 mt-0.5">
              المزارع: {farm.ownerName} · تحرّك بالمزرعة عبر عصا التحكم أو WASD · لعبة مجانية 100%
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
            className="p-2 rounded-xl bg-[#0b1329]/80 hover:bg-sky-950 text-sky-100 border border-sky-400/20"
            title="مزامنة الوقت الحقيقي من الخادم"
          >
            <RefreshCw className="w-4 h-4" />
          </button>

          <button
            onClick={() => setSoundEnabled((s) => !s)}
            className="p-2 rounded-xl bg-[#0b1329]/80 hover:bg-sky-950 text-sky-100 border border-sky-400/20"
            title={soundEnabled ? 'كتم مؤثرات اللعبة' : 'تفعيل مؤثرات اللعبة'}
          >
            {soundEnabled ? <Volume2 className="w-4 h-4 text-emerald-400" /> : <VolumeX className="w-4 h-4 text-stone-400" />}
          </button>

          <button
            onClick={() => setActiveModal('notifications')}
            className="relative p-2 rounded-xl bg-[#0b1329]/80 hover:bg-sky-950 text-sky-100 border border-sky-400/20"
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
      <div className="flex flex-wrap items-center justify-between gap-2 bg-white dark:bg-[#132247] p-2.5 rounded-2xl border border-stone-200 dark:border-sky-400/20 shadow-sm text-xs">
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            onClick={() => setActiveModal('livestock')}
            className="px-3 py-1.5 rounded-xl bg-lime-50 dark:bg-lime-950/40 text-lime-800 dark:text-lime-300 border border-lime-200 dark:border-lime-800 font-bold flex items-center gap-1.5"
          >
            <Home className="w-3.5 h-3.5" />
            <span>الحظيرة والمنحل 🐄</span>
          </button>
          <button
            onClick={() => {
              setMarketTab('sell');
              setActiveModal('market');
            }}
            className="px-3 py-1.5 rounded-xl bg-teal-50 dark:bg-teal-950/40 text-teal-800 dark:text-teal-300 border border-teal-200 dark:border-teal-800 font-bold flex items-center gap-1.5"
          >
            <Store className="w-3.5 h-3.5" />
            <span>السوق والمباني ({totalWarehouseCount})</span>
          </button>
          <button
            onClick={() => setActiveModal('quests')}
            className="relative px-3 py-1.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-300 border border-rose-200 dark:border-rose-800 font-bold flex items-center gap-1.5"
          >
            <ClipboardCheck className="w-3.5 h-3.5" />
            <span>المهام اليومية</span>
            {claimableQuestsCount > 0 && (
              <span className="px-1.5 py-0.2 rounded-full bg-amber-500 text-stone-950 text-[10px] font-black tabular-nums">
                {claimableQuestsCount}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveModal('shop')}
            className="px-3 py-1.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800 font-bold flex items-center gap-1.5"
          >
            <ShoppingBag className="w-3.5 h-3.5" />
            <span>المتجر والإمدادات</span>
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
            <span>ملف المحاصيل</span>
          </button>
          <button
            onClick={() => {
              setActiveModal('advisor');
              if (!advisorReply) handleAskAdvisor();
            }}
            className="px-3 py-1.5 rounded-xl bg-purple-50 dark:bg-purple-950/40 text-purple-800 dark:text-purple-300 border border-purple-200 dark:border-purple-800 font-bold flex items-center gap-1.5"
          >
            <Bot className="w-3.5 h-3.5" />
            <span>المستشار AI</span>
          </button>
          <button
            onClick={() => {
              fetchSocial();
              setActiveModal('social');
            }}
            className="px-3 py-1.5 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-800 dark:text-blue-300 border border-blue-200 dark:border-blue-800 font-bold flex items-center gap-1.5"
          >
            <Trophy className="w-3.5 h-3.5" />
            <span>المنافسات</span>
          </button>
        </div>

        {/* Camera Presets */}
        <div className="flex flex-wrap items-center gap-1 text-[11px]">
          <Camera className="w-3.5 h-3.5 text-sky-400 ml-1" />
          {(
            [
              ['overview', 'شامل'],
              ['farmer', 'المزارع 🚶'],
              ['pasture', 'الأبقار والماعز'],
              ['field', 'الحقل'],
              ['greenhouse', 'البيت المحمي'],
              ['falaj', 'الفلج'],
              ['apiary', 'المنحل 🍯'],
              ['market', 'السوق 🏪'],
            ] as Array<[FarmCameraPreset, string]>
          ).map(([key, label]) => (
            <button
              key={key}
              onClick={() => {
                setCameraPreset(key);
                setPresetTrigger((n) => n + 1);
                if (key === 'farmer') setDockCollapsed(true);
              }}
              className={`px-2.5 py-1 rounded-lg font-semibold transition-colors ${
                cameraPreset === key
                  ? 'bg-emerald-600 text-white'
                  : 'bg-stone-100 dark:bg-[#0b1329]/80 text-stone-700 dark:text-sky-200 border border-transparent dark:border-sky-400/20 hover:bg-stone-200 dark:hover:bg-sky-950'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Samail Daily Almanac, Weather, Falaj Turn & Book Advice Bar */}
      <div className="rounded-2xl bg-gradient-to-l from-emerald-50 via-stone-50 to-sky-50 dark:from-[#132247] dark:via-[#101c3b] dark:to-[#132247] border border-emerald-200/80 dark:border-sky-400/20 p-3 shadow-sm space-y-2 text-xs">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <span className="px-2.5 py-1 rounded-xl bg-emerald-700 text-white font-bold flex items-center gap-1.5">
              <CalendarDays className="w-3.5 h-3.5" />
              <span>اليوم الزراعي {farm.farmDay || 1}</span>
            </span>
            <span className="px-2.5 py-1 rounded-xl bg-white dark:bg-[#0b1329]/80 border border-stone-200 dark:border-sky-400/20 text-stone-800 dark:text-sky-100 font-bold">
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
                  className="px-3 py-1 rounded-xl bg-sky-600 hover:bg-sky-500 disabled:opacity-50 text-white font-bold flex items-center gap-1.5 shadow-sm"
                >
                  <Droplets className="w-3.5 h-3.5" />
                  <span>استلام نوبة الفلج (+120 لتر مجاناً)</span>
                </button>
              )
            ) : (
              <span className="px-2.5 py-1 rounded-xl bg-stone-100 dark:bg-[#0b1329]/70 text-stone-600 dark:text-sky-200 font-semibold">
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

      {/* 3D Interactive Game World Viewport (85%+ unobstructed view, ZERO backdrop-blur over WebGL) */}
      <div className="relative rounded-3xl overflow-hidden border border-stone-200 dark:border-sky-400/25 bg-[#0b1329] shadow-2xl h-[560px] sm:h-[640px]">
        <FarmScene3D
          farm={farm}
          crops={crops}
          selectedPlotId={selectedPlotId}
          onSelectPlot={setSelectedPlotId}
          onInspectFeature={(msg, kind) => {
            if (kind === 'cow' || kind === 'goat') playFarmTone('cow', soundEnabled);
            else if (kind === 'tractor') playFarmTone('plow', soundEnabled);
            else playFarmTone('action', soundEnabled);
            if (kind === 'market') {
              setMarketTab('sell');
              setActiveModal('market');
            } else if (kind === 'bees') {
              setActiveModal('livestock');
            }
            showToast('ok', msg);
          }}
          onNearbyChange={(target) => {
            setNearbyTarget(target);
            if (target?.type === 'plot' && target.plotId) {
              setSelectedPlotId(target.plotId);
            }
          }}
          cameraPreset={cameraPreset}
          presetTrigger={presetTrigger}
          moveInputRef={moveInputRef}
          visualCommand={visualCommand}
        />

        {/* Top-Left Game Controls + Active Plot Telemetry Pill (Solid/High-Opacity, ZERO backdrop-blur) */}
        <div className="absolute top-3 left-3 flex flex-col items-start gap-1.5 z-20 pointer-events-auto max-w-[54%]">
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              onClick={() => {
                setCameraPreset('farmer');
                setPresetTrigger((n) => n + 1);
                setDockCollapsed(true);
                setJoystickEnabled(true);
              }}
              className={`px-2.5 py-1.5 rounded-xl text-[11px] font-bold border flex items-center gap-1.5 transition-colors ${
                cameraPreset === 'farmer'
                  ? 'bg-emerald-600 text-white border-emerald-400'
                  : 'bg-[#132247]/95 text-sky-100 border-sky-400/30 hover:bg-[#192d5c]'
              }`}
              title="وضع التجول ومتابعة المزارع العماني"
            >
              <Footprints className="w-3.5 h-3.5" />
              <span>تجول بالمزارع</span>
            </button>

            <button
              onClick={() => setJoystickEnabled((v) => !v)}
              className={`px-2.5 py-1.5 rounded-xl text-[11px] font-bold border flex items-center gap-1 transition-colors ${
                joystickEnabled
                  ? 'bg-[#132247]/95 text-emerald-300 border-emerald-400/40'
                  : 'bg-[#132247]/85 text-sky-300/70 border-sky-400/20'
              }`}
              title="إظهار أو إخفاء عصا الحركة باللمس"
            >
              <Gamepad2 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{joystickEnabled ? 'إخفاء العصا' : 'عصا الحركة'}</span>
            </button>
          </div>

          {/* Compact Telemetry Pill when docked/exploring */}
          {dockCollapsed && (
            <div className="px-2.5 py-1.5 rounded-xl bg-[#0b1329]/90 border border-sky-400/25 text-[10px] sm:text-[11px] text-white space-y-0.5 shadow-lg">
              <div className="flex flex-wrap items-center gap-1.5 font-bold">
                <span className="text-emerald-400">
                  القطعة #{selectedPlot.plotIndex + 1}
                </span>
                {!selectedPlot.isUnlocked ? (
                  <span className="text-amber-300">🔒 مقفلة</span>
                ) : selectedCrop && currentStage ? (
                  <>
                    <span>· {selectedCrop.nameAr}</span>
                    <span className="text-sky-300">({currentStage.name})</span>
                    {!isHarvestReady && remainingSec > 0 && !selectedPlot.blockedReason && (
                      <span className="text-amber-300 font-mono">{remainingSec}ث</span>
                    )}
                  </>
                ) : (
                  <span className="text-sky-200">
                    {selectedPlot.soilLeveled ? '· جاهزة للزراعة' : selectedPlot.soilPrepared ? '· جاهزة للتسوية' : '· بكر'}
                  </span>
                )}
              </div>
              {selectedPlot.isUnlocked && (
                <div className="flex flex-wrap items-center gap-2 text-[10px]">
                  <span className={selectedPlot.moisture < 30 || selectedPlot.moisture > 90 ? 'text-amber-300 font-bold' : 'text-sky-300'}>
                    💧 {Math.round(selectedPlot.moisture)}%
                  </span>
                  <span className={selectedPlot.nutrients < 30 || selectedPlot.nutrients > 94 ? 'text-amber-300 font-bold' : 'text-emerald-300'}>
                    🧪 {Math.round(selectedPlot.nutrients)}%
                  </span>
                  <span className={selectedPlot.health < 60 ? 'text-red-400 font-bold' : 'text-lime-300'}>
                    ❤️ {Math.round(selectedPlot.health)}%
                  </span>
                  {selectedPlot.weedsLevel >= 15 && <span className="text-yellow-300 font-bold">🌿 {Math.round(selectedPlot.weedsLevel)}%</span>}
                  {selectedPlot.pestType && <span className="text-red-400 font-bold">🐛 آفة!</span>}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Top-Right Plot Selector Pills */}
        <div className="absolute top-3 right-3 flex flex-wrap justify-end gap-1 max-w-[190px] sm:max-w-md z-20 pointer-events-auto">
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
                      ? 'bg-[#132247]/92 text-sky-100 border-sky-400/30 hover:bg-[#192d5c]'
                      : 'bg-[#0b1329]/85 text-sky-300/60 border-sky-400/15'
                }`}
              >
                {p.isGreenhouse ? '🏡' : '🌱'} {p.plotIndex + 1}
                {!p.isUnlocked ? '🔒' : c ? `·${c.nameAr.split(' ')[0]}` : ''}
              </button>
            );
          })}
        </div>

        {/* Left Thumb: Virtual Thumb Joystick (ZERO re-renders during movement) */}
        {joystickEnabled && (
          <div
            className={`absolute z-20 pointer-events-auto transition-all ${
              dockCollapsed ? 'bottom-4 left-4' : 'top-14 left-3'
            }`}
          >
            <div
              ref={joyPadRef}
              onPointerDown={(e) => {
                e.stopPropagation();
                activePointerIdRef.current = e.pointerId;
                e.currentTarget.setPointerCapture(e.pointerId);
                updateJoystickFromPointer(e.clientX, e.clientY);
              }}
              onPointerMove={(e) => {
                if (activePointerIdRef.current !== e.pointerId) return;
                e.stopPropagation();
                updateJoystickFromPointer(e.clientX, e.clientY);
              }}
              onPointerUp={(e) => {
                if (activePointerIdRef.current !== e.pointerId) return;
                e.stopPropagation();
                if (e.currentTarget.hasPointerCapture(e.pointerId)) {
                  e.currentTarget.releasePointerCapture(e.pointerId);
                }
                resetJoystick();
              }}
              onPointerCancel={resetJoystick}
              className="w-24 h-24 sm:w-28 sm:h-28 rounded-full bg-[#132247]/92 border-2 border-sky-400/45 shadow-2xl flex items-center justify-center relative touch-none select-none cursor-grab active:cursor-grabbing"
              aria-label="عصا التحكم لحركة المزارع العماني"
            >
              <span className="absolute top-1.5 text-[9px] text-sky-300/60 font-bold pointer-events-none">▲</span>
              <span className="absolute bottom-1.5 text-[9px] text-sky-300/60 font-bold pointer-events-none">▼</span>
              <span className="absolute left-2 text-[9px] text-sky-300/60 font-bold pointer-events-none">◀</span>
              <span className="absolute right-2 text-[9px] text-sky-300/60 font-bold pointer-events-none">▶</span>
              <div
                ref={thumbKnobRef}
                className="w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-emerald-500 border-2 border-emerald-200 shadow-lg pointer-events-none flex items-center justify-center text-white text-xs font-extrabold"
              >
                🚶
              </div>
            </div>
            <div className="text-[10px] text-center font-bold text-white/95 bg-[#0b1329]/85 rounded-lg px-2 py-0.5 mt-1 border border-sky-400/20">
              حرّك المزارع
            </div>
          </div>
        )}

        {/* Right Thumb: Smart Contextual Game Action Wheel (when 10-tool drawer is collapsed) */}
        {dockCollapsed && (
          <div className="absolute bottom-4 right-4 z-20 pointer-events-auto flex flex-col items-end gap-2 max-w-[60%]">
            {/* Nearby Landmark Quick Prompts */}
            {nearbyTarget?.type === 'falaj' && farm.falajTurnActive && farm.falajCollectedDay !== farm.farmDay && (
              <button
                onClick={() => performAction('collect_falaj')}
                disabled={busyAction}
                className="px-3.5 py-2 rounded-2xl bg-sky-500 hover:bg-sky-400 text-white font-extrabold text-xs shadow-xl border border-sky-200 flex items-center gap-1.5"
              >
                <Droplets className="w-4 h-4" />
                <span>استلام نوبة الفلج (+120 لتر)</span>
              </button>
            )}
            {nearbyTarget?.type === 'greenhouse' && (
              <button
                onClick={() => setActiveModal('greenhouse')}
                className="px-3.5 py-2 rounded-2xl bg-cyan-600 hover:bg-cyan-500 text-white font-extrabold text-xs shadow-xl border border-cyan-300 flex items-center gap-1.5"
              >
                <Thermometer className="w-4 h-4" />
                <span>تحكم البيت المحمي ({farm.greenhouseTemp}°م)</span>
              </button>
            )}
            {nearbyTarget?.type === 'cows' && (
              <button
                onClick={() => setActiveModal('livestock')}
                className="px-3.5 py-2 rounded-2xl bg-amber-600 hover:bg-amber-500 text-white font-extrabold text-xs shadow-xl border border-amber-300 flex items-center gap-1.5"
              >
                <span>🐄 فتح الحظيرة وجمع الإنتاج</span>
              </button>
            )}
            {nearbyTarget?.type === 'apiary' && (
              <button
                onClick={() => setActiveModal('livestock')}
                className="px-3.5 py-2 rounded-2xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-extrabold text-xs shadow-xl border border-amber-200 flex items-center gap-1.5"
              >
                <span>🍯 فحص المنحل وجني العسل</span>
              </button>
            )}
            {(nearbyTarget?.type === 'market' || nearbyTarget?.type === 'barn') && (
              <button
                onClick={() => {
                  setMarketTab(nearbyTarget?.type === 'barn' ? 'buildings' : 'sell');
                  setActiveModal('market');
                }}
                className="px-3.5 py-2 rounded-2xl bg-teal-600 hover:bg-teal-500 text-white font-extrabold text-xs shadow-xl border border-teal-200 flex items-center gap-1.5"
              >
                <Store className="w-4 h-4" />
                <span>{nearbyTarget.type === 'barn' ? 'تطوير مباني المزرعة' : 'دخول سوق المزرعة'}</span>
              </button>
            )}

            {/* Primary Plot Game Buttons */}
            <div className="flex flex-wrap justify-end gap-2">
              {!selectedPlot.isUnlocked ? (
                <button
                  onClick={() =>
                    performAction('buy_item', undefined, {
                      itemId: selectedPlot.isGreenhouse ? 'upgrade_greenhouse' : 'expand_plot',
                    })
                  }
                  disabled={busyAction}
                  className="px-4 py-2.5 rounded-2xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-extrabold text-xs shadow-2xl border-2 border-amber-200 flex items-center gap-1.5"
                >
                  <Lock className="w-4 h-4" />
                  <span>فتح القطعة ({selectedPlot.isGreenhouse ? 180 : 120} 🪙)</span>
                </button>
              ) : !selectedPlot.cropId ? (
                !selectedPlot.soilPrepared ? (
                  <button
                    onClick={() => performAction('plow', selectedPlot.id)}
                    disabled={busyAction}
                    className="px-4 py-2.5 rounded-2xl bg-amber-600 hover:bg-amber-500 text-white font-extrabold text-xs sm:text-sm shadow-2xl border-2 border-amber-300 flex items-center gap-2"
                  >
                    <Shovel className="w-4 h-4" />
                    <span>حرث القطعة #{selectedPlot.plotIndex + 1}</span>
                  </button>
                ) : !selectedPlot.soilLeveled ? (
                  <button
                    onClick={() => performAction('level_soil', selectedPlot.id)}
                    disabled={busyAction}
                    className="px-4 py-2.5 rounded-2xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-extrabold text-xs sm:text-sm shadow-2xl border-2 border-amber-200 flex items-center gap-2"
                  >
                    <Layers className="w-4 h-4" />
                    <span>تسوية التربة #{selectedPlot.plotIndex + 1}</span>
                  </button>
                ) : (
                  <button
                    onClick={() => setActiveModal('seeds')}
                    disabled={busyAction}
                    className="px-4 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs sm:text-sm shadow-2xl border-2 border-emerald-300 flex items-center gap-2"
                  >
                    <Sprout className="w-4 h-4" />
                    <span>ازرع المحصول #{selectedPlot.plotIndex + 1}</span>
                  </button>
                )
              ) : (
                <>
                  {isHarvestReady && (
                    <button
                      onClick={() => performAction('harvest', selectedPlot.id)}
                      disabled={busyAction}
                      className="px-4 py-2.5 rounded-2xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-extrabold text-xs sm:text-sm shadow-2xl border-2 border-amber-200 flex items-center gap-1.5"
                    >
                      <Wheat className="w-4 h-4" />
                      <span>حصاد #{selectedPlot.plotIndex + 1}!</span>
                    </button>
                  )}
                  {selectedPlot.pestType && (
                    <button
                      onClick={() => performAction('pest_control', selectedPlot.id)}
                      disabled={busyAction}
                      className="px-3.5 py-2.5 rounded-2xl bg-red-600 hover:bg-red-500 text-white font-extrabold text-xs shadow-2xl border-2 border-red-300 flex items-center gap-1.5"
                    >
                      <Bug className="w-4 h-4" />
                      <span>علاج الآفة</span>
                    </button>
                  )}
                  {selectedPlot.weedsLevel >= 10 && (
                    <button
                      onClick={() => performAction('weed', selectedPlot.id)}
                      disabled={busyAction}
                      className="px-3.5 py-2.5 rounded-2xl bg-yellow-600 hover:bg-yellow-500 text-white font-extrabold text-xs shadow-2xl border-2 border-yellow-300 flex items-center gap-1.5"
                    >
                      <Sprout className="w-4 h-4" />
                      <span>تعشيب</span>
                    </button>
                  )}
                  <button
                    onClick={() => performAction('irrigate', selectedPlot.id)}
                    disabled={busyAction}
                    className="px-3.5 py-2.5 rounded-2xl bg-sky-600 hover:bg-sky-500 text-white font-extrabold text-xs shadow-2xl border-2 border-sky-300 flex items-center gap-1.5"
                  >
                    <Droplets className="w-4 h-4" />
                    <span>ري</span>
                  </button>
                  <button
                    onClick={() => performAction('fertilize', selectedPlot.id, { fertType: fertChoice })}
                    disabled={busyAction}
                    className="px-3.5 py-2.5 rounded-2xl bg-lime-700 hover:bg-lime-600 text-white font-extrabold text-xs shadow-2xl border-2 border-lime-300 flex items-center gap-1.5"
                  >
                    <Sparkles className="w-4 h-4" />
                    <span>تسميد</span>
                  </button>
                </>
              )}

              <button
                onClick={() => setDockCollapsed(false)}
                className="px-3 py-2.5 rounded-2xl bg-[#132247]/95 hover:bg-[#192d5c] text-sky-100 border border-sky-400/35 text-xs font-bold shadow-xl flex items-center gap-1"
                title="فتح لوحة الأدوات الكاملة (10 عمليات زراعية)"
              >
                <ChevronUp className="w-4 h-4" />
                <span>كل الأدوات (10)</span>
              </button>
            </div>
          </div>
        )}

        {/* Full 10-Operation Drawer (when expanded by player) */}
        {!dockCollapsed && (
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 w-[96%] max-w-4xl pointer-events-auto z-20">
            <div className="flex justify-center mb-1">
              <button
                onClick={() => setDockCollapsed(true)}
                className="px-3.5 py-1 rounded-t-xl bg-[#132247] text-sky-100 border border-b-0 border-sky-400/30 text-[11px] font-bold flex items-center gap-1"
              >
                <ChevronDown className="w-3.5 h-3.5" />
                <span>إغلاق اللوحة والعودة لوضع اللعب الحر</span>
              </button>
            </div>

            <div className="rounded-2xl bg-[#132247]/95 text-white border border-sky-400/25 p-3 sm:p-4 shadow-2xl space-y-3">
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
          </div>
        )}
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

      {/* Modal 8: Omani Livestock Barn & Beehive Apiary */}
      {activeModal === 'livestock' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-950/75">
          <div className="bg-white dark:bg-[#132247] rounded-3xl w-full max-w-2xl max-h-[88vh] overflow-y-auto p-6 border border-stone-200 dark:border-sky-400/25 space-y-4 text-xs">
            <div className="flex items-center justify-between border-b border-stone-200 dark:border-sky-400/20 pb-3">
              <div>
                <h3 className="font-bold text-base text-stone-900 dark:text-white flex items-center gap-2">
                  <span>🐄 الحظيرة العُمانية ومنحل العسل</span>
                </h3>
                <p className="text-[11px] text-stone-500 dark:text-sky-200/80 mt-0.5">
                  رصيد الأعلاف: <strong className="text-emerald-600 dark:text-emerald-400 tabular-nums">{farm.inventory?.fodder_pack ?? 0}</strong> حزمة برسيم · مستوى الحظيرة {farm.buildings?.livestockShelter || 1} · المنحل {farm.buildings?.beehiveApiary || 1}
                </p>
              </div>
              <button onClick={() => setActiveModal(null)} className="p-2 min-h-[44px] min-w-[44px] flex items-center justify-center text-stone-400 hover:text-stone-700 dark:hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {FARM_LIVESTOCK_DEFS.map((def) => {
                const state = farm.livestock?.[def.id] || { fedAt: 0, lastCollectedAt: 0, happiness: 85 };
                const elapsedSec = Math.floor((estServerNow - (state.lastCollectedAt || 0)) / 1000);
                const remSec = Math.max(0, def.cooldownSec - elapsedSec);
                const ready = remSec === 0;
                const stock = farm.warehouse?.goods?.[def.productId] || 0;

                return (
                  <div key={def.id} className="p-4 rounded-2xl border border-stone-200 dark:border-sky-400/20 bg-stone-50 dark:bg-[#0b1329]/70 space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="font-bold text-sm text-stone-900 dark:text-white">
                          {def.icon} {def.nameAr}
                        </div>
                        <p className="text-[11px] text-stone-500 dark:text-sky-200/70 mt-0.5">{def.description}</p>
                      </div>
                      <span className="text-[11px] font-bold text-amber-600 dark:text-amber-300 tabular-nums shrink-0">
                        المخزن: {stock}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-stone-600 dark:text-sky-200">
                      <span className="flex items-center gap-1">
                        <Heart className="w-3.5 h-3.5 text-rose-500" />
                        النشاط: <strong className="tabular-nums">{state.happiness ?? 85}%</strong>
                      </span>
                      <span className={`font-bold tabular-nums ${ready ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-300'}`}>
                        {ready ? `جاهز: ${def.productNameAr} ✓` : `يتكوّن خلال ${remSec}ث`}
                      </span>
                    </div>

                    <div className="flex gap-2">
                      <button
                        disabled={busyAction}
                        onClick={() => performAction('feed_livestock', undefined, { kind: def.id })}
                        className="flex-1 min-h-[44px] px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold"
                      >
                        {def.id === 'bees' ? 'فحص وتلقيح' : 'إطعام (-1 علف)'}
                      </button>
                      <button
                        disabled={busyAction || !ready}
                        onClick={() => performAction('collect_livestock', undefined, { kind: def.id })}
                        className="flex-1 min-h-[44px] px-3 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:bg-stone-300 dark:disabled:bg-stone-700 text-stone-950 dark:disabled:text-stone-400 font-extrabold"
                      >
                        {ready ? `جمع ${def.productNameAr}` : `انتظر (${remSec}ث)`}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 p-3 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-700/40 text-[11px]">
              <span className="text-amber-900 dark:text-amber-200 font-semibold">
                هل نفدت الأعلاف؟ يمكنك شراء حزم البرسيم العُماني أو بيع منتجات الحظيرة في السوق اليومي.
              </span>
              <div className="flex gap-2">
                <button
                  disabled={busyAction || farm.coins < 28}
                  onClick={() => performAction('buy_item', undefined, { itemId: 'fodder_pack' })}
                  className="px-3 py-2 rounded-xl bg-amber-500 text-stone-950 font-bold disabled:opacity-50"
                >
                  شراء 5 أعلاف (28 🪙)
                </button>
                <button
                  onClick={() => {
                    setMarketTab('sell');
                    setActiveModal('market');
                  }}
                  className="px-3 py-2 rounded-xl bg-teal-600 text-white font-bold"
                >
                  اذهب للسوق 🏪
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal 9: Dynamic Daily Omani Souq Market & Upgradable Farm Buildings */}
      {activeModal === 'market' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-950/75">
          <div className="bg-white dark:bg-[#132247] rounded-3xl w-full max-w-3xl max-h-[88vh] overflow-y-auto p-6 border border-stone-200 dark:border-sky-400/25 space-y-4 text-xs">
            <div className="flex items-center justify-between border-b border-stone-200 dark:border-sky-400/20 pb-3">
              <div>
                <h3 className="font-bold text-base text-stone-900 dark:text-white flex items-center gap-2">
                  <Store className="w-5 h-5 text-teal-500" />
                  <span>سوق المزرعة اليومي وتطوير المنشآت</span>
                </h3>
                <p className="text-[11px] text-stone-500 dark:text-sky-200/80 mt-0.5">
                  رصيدك: <strong className="text-amber-500 tabular-nums">{farm.coins} 🪙</strong> · علاوة المخزن: <strong className="text-emerald-500">+{Math.max(0, ((farm.buildings?.barnStorage || 1) - 1) * 12)}%</strong> على الأسعار
                </p>
              </div>
              <button onClick={() => setActiveModal(null)} className="p-2 min-h-[44px] min-w-[44px] flex items-center justify-center text-stone-400 hover:text-stone-700 dark:hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => setMarketTab('sell')}
                className={`flex-1 min-h-[44px] rounded-xl font-bold flex items-center justify-center gap-2 ${
                  marketTab === 'sell'
                    ? 'bg-teal-600 text-white'
                    : 'bg-stone-100 dark:bg-[#0b1329]/80 text-stone-700 dark:text-sky-200'
                }`}
              >
                <TrendingUp className="w-4 h-4" />
                <span>سوق المزرعة والمخزن ({totalWarehouseCount})</span>
              </button>
              <button
                onClick={() => setMarketTab('buildings')}
                className={`flex-1 min-h-[44px] rounded-xl font-bold flex items-center justify-center gap-2 ${
                  marketTab === 'buildings'
                    ? 'bg-emerald-600 text-white'
                    : 'bg-stone-100 dark:bg-[#0b1329]/80 text-stone-700 dark:text-sky-200'
                }`}
              >
                <Hammer className="w-4 h-4" />
                <span>تطوير مباني المزرعة (4)</span>
              </button>
            </div>

            {marketTab === 'sell' ? (
              <div className="space-y-4">
                <div className="p-3 rounded-2xl bg-teal-50 dark:bg-teal-950/30 border border-teal-200 dark:border-teal-700/40 flex flex-wrap items-center justify-between gap-2 text-[11px]">
                  <span className="font-bold text-teal-900 dark:text-teal-200">
                    📈 أسعار اليوم الزراعي {farm.farmDay || 1} تتجدد مع كل يوم وموسم — راقب الأصناف ذات الطلب المرتفع!
                  </span>
                </div>

                <div className="space-y-2">
                  <div className="font-bold text-stone-800 dark:text-sky-100 flex items-center gap-1.5">
                    <Package className="w-4 h-4 text-amber-500" />
                    <span>منتجات الحظيرة والمنحل الطازجة</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {FARM_LIVESTOCK_DEFS.map((def) => {
                      const qty = Number(farm.warehouse?.goods?.[def.productId] || 0);
                      const mult = Number(farm.marketMultipliers?.[def.productId] || 1.1);
                      const barnBonus = 1 + Math.max(0, (farm.buildings?.barnStorage || 1) - 1) * 0.12;
                      const unitPrice = Math.max(15, Math.round(def.baseSellPrice * mult * barnBonus));
                      const isHot = (farm.hotItems || []).includes(def.productId);
                      return (
                        <div key={def.productId} className="p-3.5 rounded-2xl border border-stone-200 dark:border-sky-400/20 bg-stone-50 dark:bg-[#0b1329]/70 flex flex-col justify-between gap-2.5">
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <div className="font-bold text-stone-900 dark:text-white">
                                {def.icon} {def.productNameAr}
                              </div>
                              <div className="text-[11px] text-stone-500 dark:text-sky-200/75 tabular-nums">
                                السعر اليوم: <strong className="text-amber-500">{unitPrice} 🪙</strong> · معامل {mult.toFixed(2)}×
                                {isHot && <span className="text-emerald-500 font-bold"> · طلب مرتفع!</span>}
                              </div>
                            </div>
                            <span className="font-black text-sm text-sky-600 dark:text-sky-300 tabular-nums">×{qty}</span>
                          </div>
                          <div className="flex gap-2">
                            <button
                              disabled={busyAction || qty <= 0}
                              onClick={() => performAction('sell_market', undefined, { itemType: 'good', itemId: def.productId, quantity: 1 })}
                              className="flex-1 min-h-[44px] rounded-xl bg-teal-600 hover:bg-teal-500 disabled:bg-stone-300 dark:disabled:bg-stone-800 text-white dark:disabled:text-stone-500 font-bold"
                            >
                              بيع (1)
                            </button>
                            {qty > 1 && (
                              <button
                                disabled={busyAction}
                                onClick={() => performAction('sell_market', undefined, { itemType: 'good', itemId: def.productId, quantity: 'all' })}
                                className="min-h-[44px] px-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-extrabold"
                              >
                                بيع الكل ({qty * unitPrice} 🪙)
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="font-bold text-stone-800 dark:text-sky-100 flex items-center gap-1.5">
                    <Wheat className="w-4 h-4 text-emerald-500" />
                    <span>صناديق المحاصيل المحصودة في المخزن</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {crops.map((crop) => {
                      const qty = Number(farm.warehouse?.crops?.[crop.id] || 0);
                      const base = Math.max(30, Math.round(crop.harvestCoins * 0.72));
                      const mult = Number(farm.marketMultipliers?.[crop.id] || 1.1);
                      const barnBonus = 1 + Math.max(0, (farm.buildings?.barnStorage || 1) - 1) * 0.12;
                      const unitPrice = Math.max(15, Math.round(base * mult * barnBonus));
                      const isHot = (farm.hotItems || []).includes(crop.id);
                      return (
                        <div key={crop.id} className={`p-3.5 rounded-2xl border border-stone-200 dark:border-sky-400/20 bg-stone-50 dark:bg-[#0b1329]/70 flex items-center justify-between gap-2 ${qty === 0 ? 'opacity-65' : ''}`}>
                          <div>
                            <div className="font-bold text-stone-900 dark:text-white">{crop.nameAr}</div>
                            <div className="text-[11px] text-stone-500 dark:text-sky-200/75 tabular-nums">
                              {unitPrice} 🪙/صندوق · معامل {mult.toFixed(2)}×{isHot ? ' · طلب عالٍ!' : ''}
                            </div>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <span className="font-black text-sky-600 dark:text-sky-300 tabular-nums">×{qty}</span>
                            <button
                              disabled={busyAction || qty <= 0}
                              onClick={() => performAction('sell_market', undefined, { itemType: 'crop', itemId: crop.id, quantity: 'all' })}
                              className="min-h-[44px] px-3 rounded-xl bg-teal-600 hover:bg-teal-500 disabled:bg-stone-300 dark:disabled:bg-stone-800 text-white dark:disabled:text-stone-500 font-bold"
                            >
                              {qty > 0 ? `بيع (${qty * unitPrice} 🪙)` : 'فارغ'}
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {FARM_BUILDING_DEFS.map((b) => {
                  const lv = Number(farm.buildings?.[b.id] || 1);
                  const isMax = lv >= b.maxLevel;
                  const cost = b.baseCostCoins * lv;
                  return (
                    <div key={b.id} className="p-4 rounded-2xl border border-stone-200 dark:border-sky-400/20 bg-stone-50 dark:bg-[#0b1329]/70 flex flex-col justify-between gap-3">
                      <div className="space-y-1">
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-bold text-sm text-stone-900 dark:text-white">
                            {b.icon} {b.nameAr}
                          </span>
                          <span className="font-extrabold text-emerald-600 dark:text-emerald-400 tabular-nums">
                            المستوى {lv}/{b.maxLevel}
                          </span>
                        </div>
                        <p className="text-[11px] text-stone-500 dark:text-sky-200/75 leading-relaxed">{b.benefitText}</p>
                      </div>
                      <button
                        disabled={busyAction || isMax || farm.coins < cost}
                        onClick={() => performAction('upgrade_building', undefined, { buildingId: b.id })}
                        className="w-full min-h-[44px] rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:bg-stone-300 dark:disabled:bg-stone-800 text-white dark:disabled:text-stone-400 font-extrabold"
                      >
                        {isMax ? 'أعلى مستوى ✓' : `تطوير إلى المستوى ${lv + 1} (${cost} 🪙)`}
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal 10: Daily Farm Quests */}
      {activeModal === 'quests' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-950/75">
          <div className="bg-white dark:bg-[#132247] rounded-3xl w-full max-w-lg p-6 border border-stone-200 dark:border-sky-400/25 space-y-4 text-xs">
            <div className="flex items-center justify-between border-b border-stone-200 dark:border-sky-400/20 pb-3">
              <div>
                <h3 className="font-bold text-base text-stone-900 dark:text-white flex items-center gap-2">
                  <ClipboardCheck className="w-5 h-5 text-rose-500" />
                  <span>المهام الزراعية اليومية (اليوم {farm.farmDay || 1})</span>
                </h3>
                <p className="text-[11px] text-stone-500 dark:text-sky-200/75 mt-0.5">
                  أكمل المهام واحصل على عملات ونقاط ومياه فلج مجانية!
                </p>
              </div>
              <button onClick={() => setActiveModal(null)} className="p-2 min-h-[44px] min-w-[44px] flex items-center justify-center text-stone-400 hover:text-stone-700 dark:hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              {(farm.quests || []).map((q: any) => {
                const pct = Math.min(100, Math.round(((q.progress || 0) / Math.max(1, q.target || 1)) * 100));
                const ready = !q.claimed && (q.progress || 0) >= (q.target || 1);
                return (
                  <div key={q.id} className="p-4 rounded-2xl border border-stone-200 dark:border-sky-400/20 bg-stone-50 dark:bg-[#0b1329]/75 space-y-2.5">
                    <div className="flex items-start justify-between gap-2">
                      <div className="font-bold text-sm text-stone-900 dark:text-white">{q.titleAr}</div>
                      <span className="font-black text-emerald-600 dark:text-emerald-400 tabular-nums shrink-0">
                        {q.progress || 0}/{q.target || 1}
                      </span>
                    </div>

                    <div className="w-full h-2 rounded-full bg-stone-200 dark:bg-stone-800 overflow-hidden">
                      <div className="h-full bg-emerald-500 transition-all" style={{ width: `${pct}%` }} />
                    </div>

                    <div className="flex items-center justify-between gap-2 pt-1">
                      <span className="text-[11px] font-bold text-amber-600 dark:text-amber-300 tabular-nums">
                        المكافأة: +{q.rewardCoins} 🪙 · +{q.rewardPoints} ⭐ · +{q.rewardWater}💧
                      </span>
                      <button
                        disabled={busyAction || !ready}
                        onClick={() => performAction('claim_quest', undefined, { questId: q.id })}
                        className={`min-h-[44px] px-4 rounded-xl font-extrabold ${
                          q.claimed
                            ? 'bg-stone-200 dark:bg-stone-800 text-stone-500'
                            : ready
                              ? 'bg-amber-500 hover:bg-amber-400 text-stone-950'
                              : 'bg-stone-200 dark:bg-stone-800 text-stone-400'
                        }`}
                      >
                        {q.claimed ? 'تم الاستلام ✓' : ready ? 'استلام المكافأة!' : 'قيد التنفيذ'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

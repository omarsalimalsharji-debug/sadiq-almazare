import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Sprout,
  Droplets,
  Sparkles,
  ShoppingBag,
  Trophy,
  BookOpen,
  Bot,
  ChevronDown,
  ChevronUp,
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
  Gamepad2,
  Footprints,
  Store,
  ClipboardCheck,
  Hammer,
  Package,
  TrendingUp,
  Heart,
  Home,
  Wrench,
  BarChart3,
} from 'lucide-react';
import { UserProfile } from '../../types/index.ts';
import { useLocation } from '../../context/LocationContext.tsx';
import {
  VIRTUAL_CROPS,
  VIRTUAL_SHOP_ITEMS,
  FARM_ACHIEVEMENTS,
  FARM_LIVESTOCK_DEFS,
  FARM_BUILDING_DEFS,
  FARM_TOOL_UPGRADES,
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
import { FarmResourceHud } from './FarmResourceHud.tsx';
import { FarmFlijanAdvisorBar } from './FarmFlijanAdvisorBar.tsx';
import { playFarmSound } from '../../utils/farmSoundEffects.ts';

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

const FLIJAN_AVATAR_URL = '/assets/aistudio/1794816965473_a524a589.jpg';

const CROP_EMOJIS: Record<string, string> = {
  faradh_palm: '🌴',
  omani_cucumber: '🥒',
  tomato: '🍅',
  onion: '🧅',
  garlic: '🧄',
  omani_wheat: '🌾',
  sesame: '🌼',
  potato: '🥔',
  omani_lemon: '🍋',
  omani_mango: '🥭',
  omani_banana: '🍌',
  watermelon: '🍉',
  omani_alfalfa: '🌿',
};

const CAMERA_LABELS: Array<[FarmCameraPreset, string]> = [
  ['overview', 'شامل'],
  ['farmer', 'المزارع'],
  ['field', 'الحقل'],
  ['pasture', 'الحظيرة'],
  ['greenhouse', 'المحمي'],
  ['falaj', 'الفلج'],
  ['apiary', 'المنحل'],
  ['market', 'السوق'],
];

export const VirtualFarmView: React.FC<VirtualFarmViewProps> = ({ user, onPointsChanged }) => {
  const { location } = useLocation();
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
  const [flijanOpen, setFlijanOpen] = useState<boolean>(true);
  const [flijanSpeaking, setFlijanSpeaking] = useState<boolean>(false);
  const [flijanCustomMsg, setFlijanCustomMsg] = useState<string | null>(null);
  const [fertChoice, setFertChoice] = useState<'fert_organic' | 'fert_npk'>('fert_organic');
  const [nearbyTarget, setNearbyTarget] = useState<NearbyFarmTarget | null>(null);
  const [visualCommand, setVisualCommand] = useState<FarmVisualCommand | null>(null);
  const cmdNonceRef = useRef<number>(1);
  const flijanAudioRef = useRef<HTMLAudioElement | null>(null);

  // 60fps Virtual Thumb Joystick refs
  const moveInputRef = useRef<MoveVector2>({ x: 0, y: 0 });
  const joyPadRef = useRef<HTMLDivElement | null>(null);
  const thumbKnobRef = useRef<HTMLDivElement | null>(null);
  const activePointerIdRef = useRef<number | null>(null);

  const [toast, setToast] = useState<{ type: 'ok' | 'warn' | 'err'; text: string } | null>(null);
  const [activeModal, setActiveModal] = useState<ActiveModal>(null);

  // Server time offset
  const [serverOffsetMs, setServerOffsetMs] = useState<number>(0);
  const [tickNow, setTickNow] = useState<number>(Date.now());

  // Sub-modals state
  const [seedCategoryFilter, setSeedCategoryFilter] = useState<string>('all');
  const [shopTab, setShopTab] = useState<'supplies' | 'tools'>('supplies');
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
  const [marketTab, setMarketTab] = useState<'sell' | 'buildings' | 'stats'>('sell');

  const showToast = useCallback((type: 'ok' | 'warn' | 'err', text: string) => {
    setToast({ type, text });
    setTimeout(() => {
      setToast((curr) => (curr?.text === text ? null : curr));
    }, 4500);
  }, []);

  const stopFlijanVoice = useCallback(() => {
    if (flijanAudioRef.current) {
      flijanAudioRef.current.pause();
      flijanAudioRef.current = null;
    }
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    setFlijanSpeaking(false);
  }, []);

  const speakFlijanTip = useCallback(
    async (text: string) => {
      stopFlijanVoice();
      if (!text.trim()) return;
      setFlijanSpeaking(true);
      try {
        const res = await fetch('/api/cartoon/tts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            text,
            mood: 'cheerful',
          }),
        });
        if (!res.ok) throw new Error('TTS unavailable');
        const data = await res.json();
        const audioSrc = data?.audioBase64
          ? `data:${data.mimeType || 'audio/wav'};base64,${data.audioBase64}`
          : data?.audioUrl;
        if (audioSrc) {
          const audio = new Audio(audioSrc);
          flijanAudioRef.current = audio;
          audio.onended = () => {
            setFlijanSpeaking(false);
            flijanAudioRef.current = null;
          };
          audio.onerror = () => {
            setFlijanSpeaking(false);
            flijanAudioRef.current = null;
          };
          await audio.play();
          return;
        }
      } catch {
        // Fallback to browser Arabic speech synthesis if available
        if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
          const utter = new SpeechSynthesisUtterance(text);
          utter.lang = 'ar-OM';
          utter.rate = 0.96;
          utter.onend = () => setFlijanSpeaking(false);
          utter.onerror = () => setFlijanSpeaking(false);
          window.speechSynthesis.speak(utter);
          return;
        }
      }
      setFlijanSpeaking(false);
    },
    [stopFlijanVoice]
  );

  useEffect(() => {
    return () => {
      stopFlijanVoice();
    };
  }, [stopFlijanVoice]);

  const updateJoystickFromPointer = (clientX: number, clientY: number) => {
    const pad = joyPadRef.current;
    if (!pad) return;
    const rect = pad.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const maxR = Math.max(20, rect.width * 0.36);

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
        governorate: location.governorate || user.governorate,
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
      if (!silent) showToast('err', 'تعذر مزامنة بيانات المزرعة مع الخادم.');
    } finally {
      setLoading(false);
    }
  }, [user.id, user.name, user.governorate, location.governorate, showToast]);

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
          governorate: location.governorate || user.governorate,
          action,
          plotId,
          payload,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        playFarmSound('warn', soundEnabled);
        showToast('err', data.error || 'تعذر تنفيذ العملية.');
        return false;
      }

      setFarm(data.farm);
      if (data.serverTime) setServerOffsetMs(data.serverTime - Date.now());
      if (onPointsChanged) onPointsChanged();

      if (data.warning) {
        playFarmSound('warn', soundEnabled);
        showToast('warn', data.warning);
        setFlijanCustomMsg(data.warning);
      } else if (data.feedback) {
        if (action === 'harvest' || action === 'claim_quest') {
          playFarmSound('harvest', soundEnabled);
        } else if (action === 'sell_market' || action === 'daily_login') {
          playFarmSound('coin', soundEnabled);
        } else if (action === 'upgrade_tool' || action === 'upgrade_building' || action === 'buy_item') {
          playFarmSound('upgrade', soundEnabled);
        } else if (action === 'irrigate' || action === 'collect_falaj') {
          playFarmSound('water', soundEnabled);
        } else if (action === 'plow') {
          playFarmSound('plow', soundEnabled);
        } else if (action === 'level_soil') {
          playFarmSound('level_soil', soundEnabled);
        } else if (action === 'plant') {
          playFarmSound('plant', soundEnabled);
        } else if (action === 'fertilize') {
          playFarmSound('fertilize', soundEnabled);
        } else if (action === 'weed' || action === 'prune') {
          playFarmSound('weed', soundEnabled);
        } else if (action === 'pest_control') {
          playFarmSound('pest_control', soundEnabled);
        } else if (action === 'feed_livestock' || action === 'collect_livestock') {
          playFarmSound('cow', soundEnabled);
        } else {
          playFarmSound('action', soundEnabled);
        }

        showToast('ok', data.feedback);
        if (action === 'harvest') {
          setFlijanCustomMsg('ما شاء الله! مبارك لك الحصاد الوفير يا بطل — تقدر تبيع المحصول الآن في السوق!');
        } else if (action === 'upgrade_tool') {
          setFlijanCustomMsg('تطوير ممتاز للمعدات! ستلاحظ سرعة وتوفيراً أكبر في مزرعتك.');
        } else {
          setFlijanCustomMsg(null);
        }
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
        upgrade_tool: 'upgrade_building',
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
          governorate: location.governorate,
          wilayat: location.wilayat,
          village: location.village,
          agroZone: location.agroZone,
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
      <div className="max-w-4xl mx-auto p-8 rounded-3xl bg-[#132247] border border-sky-400/20 text-center space-y-3 text-white">
        <img
          src={FLIJAN_AVATAR_URL}
          alt="فليجان"
          className="w-16 h-16 rounded-full object-cover object-top mx-auto border-2 border-emerald-400"
        />
        <div className="font-bold text-base">جاري تجهيز مزرعتك العُمانية ثلاثية الأبعاد...</div>
        <p className="text-xs text-sky-200/80">مزامنة النمو الحقيقي للتربة والمحاصيل من الخادم</p>
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
  const claimableQuestsCount = (farm.quests || []).filter(
    (q: any) => !q.claimed && (q.progress || 0) >= (q.target || 1)
  ).length;
  const totalWarehouseCount =
    Object.values(farm.warehouse?.crops || {}).reduce((s: number, v: any) => s + Number(v || 0), 0) +
    Object.values(farm.warehouse?.goods || {}).reduce((s: number, v: any) => s + Number(v || 0), 0);
  const waterPct = Math.min(100, Math.round(((farm.waterLiters || 0) / Math.max(1, farm.maxWaterLiters || 300)) * 100));
  const todayKey = new Date(estServerNow).toLocaleDateString('en-CA', { timeZone: 'Asia/Muscat' });
  const canClaimDaily = farm.lastDailyLoginKey !== todayKey;

  const sortedLeaderboard = [...socialData.leaderboard].sort((a, b) => {
    if (boardTab === 'weekly') return (b.weeklyPoints || 0) - (a.weeklyPoints || 0);
    if (boardTab === 'monthly') return (b.monthlyPoints || 0) - (a.monthlyPoints || 0);
    return (b.points || 0) - (a.points || 0);
  });

  const guideCrop = crops.find((c) => c.id === guideCropId) || crops[0];
  const filteredSeedCrops =
    seedCategoryFilter === 'all'
      ? crops
      : crops.filter((c) => c.category === seedCategoryFilter);

  // Live contextual Omani guide dialogue for Flijan
  const computeFlijanTip = (): string => {
    if (flijanCustomMsg) return flijanCustomMsg;
    if (!selectedPlot.isUnlocked) {
      return `يا هلا ${farm.ownerName.split(' ')[0]}! القطعة #${selectedPlot.plotIndex + 1} مقفلة حالياً، افتحها لزيادة دخلك وإنتاجك.`;
    }
    if (!selectedPlot.cropId) {
      if (!selectedPlot.soilPrepared) {
        return `القطعة #${selectedPlot.plotIndex + 1} جاهزة للتجهيز! اضغط زر «حرث» لتقليب التربة وتهويتها.`;
      }
      if (!selectedPlot.soilLeveled) {
        return 'أحسنت في الحرث! الخطوة التالية هي «تسوية التربة» قبل وضع البذور.';
      }
      return 'التربة مستوية ومثالية الآن! افتح «متجر البذور» واختر محصولاً عُمانياً لزراعته.';
    }
    if (isHarvestReady) {
      return `بشائر الخير! محصول ${selectedCrop?.nameAr} نضج بالكامل — اضغط «حصاد» واجمع أرباحك!`;
    }
    if (selectedPlot.pestType) {
      return `انتبه! ظهرت آفة «${selectedPlot.pestType}» — عالجها فوراً بمستخلص النيم الآمن للنحل!`;
    }
    if (selectedPlot.moisture > 90) {
      return 'تحذير! الرطوبة مرتفعة جداً (>90%)، أوقف الري مؤقتاً حتى لا تختنق الجذور.';
    }
    if (selectedPlot.moisture < 35) {
      return 'التربة عطشى يا بطل! اسقِ المحصول بالماء المتوازن من خزان الفلج.';
    }
    if (selectedPlot.nutrients < 35) {
      return 'المحصول يحتاج غذاءً! أضف دفعة سماد عضوي أو مركب لدعم النمو.';
    }
    if (selectedPlot.weedsLevel >= 20) {
      return 'الأعشاب الضارة بدأت تنافس النبات، اضغط «تعشيب» لتنظيف القطعة.';
    }
    return (
      selectedCrop?.dailyTipsByStage?.[selectedPlot.stageIndex] ||
      farm.dailyBookTip ||
      'مزرعتك تسير بشكل ممتاز! استمر بمتابعة الرطوبة والتسميد والمكافحة الآمنة.'
    );
  };
  const flijanTip = computeFlijanTip();

  const cycleCameraPreset = () => {
    const idx = CAMERA_LABELS.findIndex(([k]) => k === cameraPreset);
    const next = CAMERA_LABELS[(idx + 1) % CAMERA_LABELS.length][0];
    setCameraPreset(next);
    setPresetTrigger((n) => n + 1);
  };

  return (
    <div className="w-full max-w-7xl mx-auto space-y-2 overflow-x-hidden pb-2">
      {/* 1. Modular Mobile-First FS-Style Top Status Strip */}
      <FarmResourceHud
        level={farm.level}
        farmDay={farm.farmDay || 1}
        ambientTemp={farm.ambientTemp ?? 26}
        coins={farm.coins}
        points={farm.points}
        waterLiters={farm.waterLiters}
        maxWaterLiters={farm.maxWaterLiters}
        waterPct={waterPct}
        wilayatName={location.wilayat}
        falajReady={Boolean(farm.falajTurnActive && farm.falajCollectedDay !== farm.farmDay)}
        canClaimDaily={canClaimDaily}
        busyAction={busyAction}
        flijanOpen={flijanOpen}
        flijanAvatarUrl={FLIJAN_AVATAR_URL}
        soundEnabled={soundEnabled}
        notificationsEnabled={Boolean(farm.notificationsEnabled)}
        unreadNotifs={unreadNotifs}
        onCollectFalaj={() => performAction('collect_falaj')}
        onClaimDaily={() => performAction('daily_login')}
        onAdvanceDay={() => performAction('advance_day')}
        onToggleFlijan={() => setFlijanOpen((v) => !v)}
        onToggleSound={() => setSoundEnabled((s) => !s)}
        onOpenNotifications={() => setActiveModal('notifications')}
        onSync={() => fetchFarmState(true)}
      />

      {/* Feedback Toast Banner (Floating crisp bar above or over top edge, non-cluttering) */}
      {toast && (
        <div
          className={`px-3 py-2 rounded-xl text-xs font-bold flex items-center justify-between border ${
            toast.type === 'ok'
              ? 'bg-emerald-950/95 border-emerald-500/60 text-emerald-200'
              : toast.type === 'warn'
                ? 'bg-amber-950/95 border-amber-500/60 text-amber-200'
                : 'bg-red-950/95 border-red-500/60 text-red-200'
          }`}
        >
          <span className="flex items-center gap-2 leading-snug">
            {toast.type === 'ok' ? <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" /> : <AlertTriangle className="w-4 h-4 shrink-0 text-amber-400" />}
            <span>{toast.text}</span>
          </span>
          <button onClick={() => setToast(null)} className="px-2 text-base leading-none">×</button>
        </div>
      )}

      {/* 2. Full-Bleed Mobile-First 3D Interactive Game Viewport */}
      <div className="relative rounded-2xl sm:rounded-3xl overflow-hidden border border-sky-400/25 bg-[#0b1329] shadow-2xl h-[66dvh] min-h-[440px] sm:h-[620px] lg:h-[660px]">
        <FarmScene3D
          farm={farm}
          crops={crops}
          selectedPlotId={selectedPlotId}
          onSelectPlot={setSelectedPlotId}
          onInspectFeature={(msg, kind) => {
            if (kind === 'cow' || kind === 'goat') playFarmSound('cow', soundEnabled);
            else if (kind === 'tractor') playFarmSound('plow', soundEnabled);
            else playFarmSound('action', soundEnabled);
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
          flijanSpeaking={flijanSpeaking}
        />

        {/* Top-Left: Camera & Plot Telemetry Pill (Solid/Translucent, ZERO backdrop-blur) */}
        <div className="absolute top-2.5 left-2.5 flex flex-col items-start gap-1.5 z-20 pointer-events-auto max-w-[50%] sm:max-w-[44%]">
          <div className="flex items-center gap-1">
            <button
              onClick={cycleCameraPreset}
              className="px-2 py-1.5 rounded-xl bg-[#0b1329]/92 hover:bg-[#132247] text-sky-100 border border-sky-400/30 text-[10px] font-bold flex items-center gap-1"
              title="تغيير زاوية الكاميرا"
            >
              <Camera className="w-3 h-3 text-sky-300" />
              <span>{CAMERA_LABELS.find(([k]) => k === cameraPreset)?.[1] || 'شامل'}</span>
            </button>

            <button
              onClick={() => {
                setCameraPreset((prev) => (prev === 'farmer' ? 'overview' : 'farmer'));
                setPresetTrigger((n) => n + 1);
                setDockCollapsed(true);
                setJoystickEnabled(true);
              }}
              className={`p-1.5 rounded-xl border text-[10px] font-bold flex items-center gap-1 ${
                cameraPreset === 'farmer'
                  ? 'bg-emerald-600 text-white border-emerald-400'
                  : 'bg-[#0b1329]/92 text-sky-100 border-sky-400/30'
              }`}
              title="متابعة المزارع"
            >
              <Footprints className="w-3.5 h-3.5" />
            </button>

            <button
              onClick={() => setJoystickEnabled((v) => !v)}
              className={`p-1.5 rounded-xl border text-[10px] font-bold ${
                joystickEnabled
                  ? 'bg-[#0b1329]/92 text-emerald-300 border-emerald-400/40'
                  : 'bg-[#0b1329]/85 text-sky-300/60 border-sky-400/20'
              }`}
              title={joystickEnabled ? 'إخفاء عصا الحركة' : 'إظهار عصا الحركة'}
            >
              <Gamepad2 className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Active Plot Telemetry Card */}
          {dockCollapsed && (
            <div className="px-2.5 py-1.5 rounded-xl bg-[#0b1329]/92 border border-sky-400/25 text-[10px] sm:text-[11px] text-white space-y-0.5 shadow-lg">
              <div className="flex flex-wrap items-center gap-1 font-bold leading-tight">
                <span className="text-emerald-400">#{selectedPlot.plotIndex + 1}</span>
                {!selectedPlot.isUnlocked ? (
                  <span className="text-amber-300">🔒 مقفلة</span>
                ) : selectedCrop && currentStage ? (
                  <>
                    <span>{CROP_EMOJIS[selectedCrop.id] || '🌱'} {selectedCrop.nameAr.split(' ')[0]}</span>
                    <span className="text-sky-300">· {currentStage.name.split(' ')[0]}</span>
                    {!isHarvestReady && remainingSec > 0 && !selectedPlot.blockedReason && (
                      <span className="text-amber-300 font-mono">{remainingSec}ث</span>
                    )}
                  </>
                ) : (
                  <span className="text-sky-200">
                    {selectedPlot.soilLeveled ? 'جاهزة للزراعة' : selectedPlot.soilPrepared ? 'تحتاج تسوية' : 'أرض بكر'}
                  </span>
                )}
              </div>
              {selectedPlot.isUnlocked && (
                <div className="flex flex-wrap items-center gap-2 text-[10px] tabular-nums">
                  <span className={selectedPlot.moisture < 30 || selectedPlot.moisture > 90 ? 'text-amber-300 font-bold' : 'text-sky-300'}>
                    💧{Math.round(selectedPlot.moisture)}%
                  </span>
                  <span className={selectedPlot.nutrients < 30 || selectedPlot.nutrients > 94 ? 'text-amber-300 font-bold' : 'text-emerald-300'}>
                    🧪{Math.round(selectedPlot.nutrients)}%
                  </span>
                  <span className={selectedPlot.health < 60 ? 'text-red-400 font-bold' : 'text-lime-300'}>
                    ❤️{Math.round(selectedPlot.health)}%
                  </span>
                  {selectedPlot.weedsLevel >= 15 && <span className="text-yellow-300 font-bold">🌿</span>}
                  {selectedPlot.pestType && <span className="text-red-400 font-bold">🐛</span>}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Top-Right: Single-Row Compact Plot Switcher Strip */}
        <div className="absolute top-2.5 right-2.5 z-20 pointer-events-auto max-w-[46%] sm:max-w-[50%]">
          <div className="flex items-center gap-1 overflow-x-auto no-scrollbar bg-[#0b1329]/88 p-1 rounded-xl border border-sky-400/20">
            {farm.plots.map((p: FarmPlotState) => {
              const ready =
                p.cropId &&
                (() => {
                  const cr = crops.find((x) => x.id === p.cropId);
                  return cr ? p.stageIndex >= cr.stages.length - 1 : false;
                })();
              return (
                <button
                  key={p.id}
                  onClick={() => setSelectedPlotId(p.id)}
                  className={`px-2 py-1 rounded-lg text-[10px] font-bold shrink-0 border transition-colors ${
                    selectedPlotId === p.id
                      ? 'bg-emerald-600 text-white border-emerald-300'
                      : ready
                        ? 'bg-amber-500 text-stone-950 border-amber-300'
                        : p.isUnlocked
                          ? 'bg-[#132247] text-sky-100 border-sky-400/25'
                          : 'bg-[#0b1329] text-sky-300/50 border-sky-400/15'
                  }`}
                >
                  {!p.isUnlocked ? '🔒' : p.cropId ? (CROP_EMOJIS[p.cropId] || '🌱') : p.isGreenhouse ? '🏡' : '🟫'}
                  {p.plotIndex + 1}
                </button>
              );
            })}
          </div>
        </div>

        {/* Flijan In-Game Companion Bar (Modular, collapsible, zero pulse/blur) */}
        {flijanOpen && dockCollapsed && (
          <FarmFlijanAdvisorBar
            flijanAvatarUrl={FLIJAN_AVATAR_URL}
            flijanSpeaking={flijanSpeaking}
            flijanTip={flijanTip}
            regionLabel={`${location.wilayat} · ${location.village}`}
            onToggleSpeak={() => (flijanSpeaking ? stopFlijanVoice() : speakFlijanTip(flijanTip))}
            onOpenAdvisor={() => {
              setActiveModal('advisor');
              handleAskAdvisor();
            }}
            onClose={() => {
              stopFlijanVoice();
              setFlijanOpen(false);
            }}
          />
        )}

        {/* Left Thumb: Touch Thumb Joystick */}
        {joystickEnabled && (
          <div
            className={`absolute z-20 pointer-events-auto transition-all ${
              dockCollapsed ? 'bottom-3 left-3' : 'top-14 left-2.5'
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
              className="w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-[#0b1329]/90 border-2 border-sky-400/45 shadow-2xl flex items-center justify-center relative touch-none select-none cursor-grab active:cursor-grabbing"
              aria-label="عصا التحكم لحركة المزارع العماني"
            >
              <span className="absolute top-1 text-[8px] text-sky-300/60 font-bold pointer-events-none">▲</span>
              <span className="absolute bottom-1 text-[8px] text-sky-300/60 font-bold pointer-events-none">▼</span>
              <span className="absolute left-1.5 text-[8px] text-sky-300/60 font-bold pointer-events-none">◀</span>
              <span className="absolute right-1.5 text-[8px] text-sky-300/60 font-bold pointer-events-none">▶</span>
              <div
                ref={thumbKnobRef}
                className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-emerald-500 border-2 border-emerald-200 shadow-lg pointer-events-none flex items-center justify-center text-white text-xs font-extrabold"
              >
                🚶
              </div>
            </div>
          </div>
        )}

        {/* Right Thumb: Compact Contextual Touch Action Controls */}
        {dockCollapsed && (
          <div className="absolute bottom-3 right-3 z-20 pointer-events-auto flex flex-col items-end gap-1.5 max-w-[64%]">
            {/* Contextual Proximity Prompt */}
            {nearbyTarget?.type === 'falaj' && farm.falajTurnActive && farm.falajCollectedDay !== farm.farmDay && (
              <button
                onClick={() => performAction('collect_falaj')}
                disabled={busyAction}
                className="px-3 py-2 rounded-xl bg-sky-500 hover:bg-sky-400 text-white font-extrabold text-[11px] shadow-xl border border-sky-200 flex items-center gap-1"
              >
                <Droplets className="w-3.5 h-3.5" />
                <span>نوبة الفلج (+120ل)</span>
              </button>
            )}
            {nearbyTarget?.type === 'greenhouse' && (
              <button
                onClick={() => setActiveModal('greenhouse')}
                className="px-3 py-2 rounded-xl bg-cyan-600 text-white font-extrabold text-[11px] shadow-xl border border-cyan-300 flex items-center gap-1"
              >
                <Thermometer className="w-3.5 h-3.5" />
                <span>البيت المحمي</span>
              </button>
            )}
            {(nearbyTarget?.type === 'cows' || nearbyTarget?.type === 'apiary') && (
              <button
                onClick={() => setActiveModal('livestock')}
                className="px-3 py-2 rounded-xl bg-amber-500 text-stone-950 font-extrabold text-[11px] shadow-xl border border-amber-200"
              >
                {nearbyTarget.type === 'apiary' ? '🍯 فحص المنحل' : '🐄 فتح الحظيرة'}
              </button>
            )}
            {(nearbyTarget?.type === 'market' || nearbyTarget?.type === 'barn') && (
              <button
                onClick={() => {
                  setMarketTab(nearbyTarget?.type === 'barn' ? 'buildings' : 'sell');
                  setActiveModal('market');
                }}
                className="px-3 py-2 rounded-xl bg-teal-600 text-white font-extrabold text-[11px] shadow-xl border border-teal-200 flex items-center gap-1"
              >
                <Store className="w-3.5 h-3.5" />
                <span>{nearbyTarget.type === 'barn' ? 'تطوير المباني' : 'دخول السوق'}</span>
              </button>
            )}

            {/* Primary Smart Action Buttons */}
            <div className="flex flex-wrap justify-end gap-1.5">
              {!selectedPlot.isUnlocked ? (
                <button
                  onClick={() =>
                    performAction('buy_item', undefined, {
                      itemId: selectedPlot.isGreenhouse ? 'upgrade_greenhouse' : 'expand_plot',
                    })
                  }
                  disabled={busyAction}
                  className="min-h-[44px] px-3.5 py-2 rounded-2xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-extrabold text-xs shadow-2xl border-2 border-amber-200 flex items-center gap-1.5"
                >
                  <Lock className="w-4 h-4" />
                  <span>فتح ({selectedPlot.isGreenhouse ? 180 : 120} 🪙)</span>
                </button>
              ) : !selectedPlot.cropId ? (
                !selectedPlot.soilPrepared ? (
                  <button
                    onClick={() => performAction('plow', selectedPlot.id)}
                    disabled={busyAction}
                    className="min-h-[44px] px-4 py-2 rounded-2xl bg-amber-600 hover:bg-amber-500 text-white font-extrabold text-xs shadow-2xl border-2 border-amber-300 flex items-center gap-1.5"
                  >
                    <Shovel className="w-4 h-4" />
                    <span>{(farm.tools?.plow || 1) >= 2 ? 'حرث وتسوية 🚜' : `حرث #${selectedPlot.plotIndex + 1}`}</span>
                  </button>
                ) : !selectedPlot.soilLeveled ? (
                  <button
                    onClick={() => performAction('level_soil', selectedPlot.id)}
                    disabled={busyAction}
                    className="min-h-[44px] px-4 py-2 rounded-2xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-extrabold text-xs shadow-2xl border-2 border-amber-200 flex items-center gap-1.5"
                  >
                    <Layers className="w-4 h-4" />
                    <span>تسوية #{selectedPlot.plotIndex + 1}</span>
                  </button>
                ) : (
                  <button
                    onClick={() => setActiveModal('seeds')}
                    disabled={busyAction}
                    className="min-h-[44px] px-4 py-2 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs shadow-2xl border-2 border-emerald-300 flex items-center gap-1.5"
                  >
                    <Sprout className="w-4 h-4" />
                    <span>زراعة بذور #{selectedPlot.plotIndex + 1}</span>
                  </button>
                )
              ) : (
                <>
                  {isHarvestReady && (
                    <button
                      onClick={() => performAction('harvest', selectedPlot.id)}
                      disabled={busyAction}
                      className="min-h-[44px] px-3.5 py-2 rounded-2xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-extrabold text-xs shadow-2xl border-2 border-amber-200 flex items-center gap-1"
                    >
                      <Wheat className="w-4 h-4" />
                      <span>حصاد!</span>
                    </button>
                  )}
                  {selectedPlot.pestType && (
                    <button
                      onClick={() => performAction('pest_control', selectedPlot.id)}
                      disabled={busyAction}
                      className="min-h-[44px] px-3 py-2 rounded-2xl bg-red-600 hover:bg-red-500 text-white font-extrabold text-xs shadow-2xl border-2 border-red-300 flex items-center gap-1"
                    >
                      <Bug className="w-4 h-4" />
                      <span>علاج</span>
                    </button>
                  )}
                  {selectedPlot.weedsLevel >= 10 && (
                    <button
                      onClick={() => performAction('weed', selectedPlot.id)}
                      disabled={busyAction}
                      className="min-h-[44px] px-3 py-2 rounded-2xl bg-yellow-600 hover:bg-yellow-500 text-white font-extrabold text-xs shadow-2xl border-2 border-yellow-300 flex items-center gap-1"
                    >
                      <Sprout className="w-4 h-4" />
                      <span>تعشيب</span>
                    </button>
                  )}
                  <button
                    onClick={() => performAction('irrigate', selectedPlot.id)}
                    disabled={busyAction}
                    className="min-h-[44px] px-3 py-2 rounded-2xl bg-sky-600 hover:bg-sky-500 text-white font-extrabold text-xs shadow-2xl border-2 border-sky-300 flex items-center gap-1"
                  >
                    <Droplets className="w-4 h-4" />
                    <span>ري</span>
                  </button>
                  <button
                    onClick={() => performAction('fertilize', selectedPlot.id, { fertType: fertChoice })}
                    disabled={busyAction}
                    className="min-h-[44px] px-3 py-2 rounded-2xl bg-lime-700 hover:bg-lime-600 text-white font-extrabold text-xs shadow-2xl border-2 border-lime-300 flex items-center gap-1"
                  >
                    <Sparkles className="w-4 h-4" />
                    <span>تسميد</span>
                  </button>
                </>
              )}

              <button
                onClick={() => setDockCollapsed(false)}
                className="min-h-[44px] px-2.5 py-2 rounded-2xl bg-[#0b1329]/95 hover:bg-[#132247] text-sky-100 border border-sky-400/35 text-[11px] font-bold shadow-xl flex items-center gap-1"
                title="فتح جميع الأدوات الزراعية"
              >
                <ChevronUp className="w-4 h-4" />
                <span>أدوات</span>
              </button>
            </div>
          </div>
        )}

        {/* Full 10-Operation Drawer */}
        {!dockCollapsed && (
          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 w-[96%] max-w-4xl pointer-events-auto z-20">
            <div className="flex justify-center mb-1">
              <button
                onClick={() => setDockCollapsed(true)}
                className="px-3.5 py-1 rounded-t-xl bg-[#0b1329] text-sky-100 border border-b-0 border-sky-400/30 text-[11px] font-bold flex items-center gap-1"
              >
                <ChevronDown className="w-3.5 h-3.5" />
                <span>إغلاق اللوحة</span>
              </button>
            </div>

            <div className="rounded-2xl bg-[#0b1329]/95 text-white border border-sky-400/30 p-3 shadow-2xl space-y-2.5">
              {/* Plot Telemetry Header */}
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-sky-400/15 pb-2 text-[11px]">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="font-extrabold text-emerald-400">
                    قطعة #{selectedPlot.plotIndex + 1} {selectedPlot.isGreenhouse ? '(بيت محمي)' : '(حقل)'}
                  </span>
                  {selectedCrop && currentStage && (
                    <>
                      <span className="font-bold">{selectedCrop.nameAr}</span>
                      <span className="px-1.5 py-0.5 rounded bg-emerald-900/70 text-emerald-200">
                        {currentStage.name}
                      </span>
                      {!isHarvestReady && remainingSec > 0 && !selectedPlot.blockedReason && (
                        <span className="font-mono text-amber-300">{remainingSec}ث ({stagePct}%)</span>
                      )}
                    </>
                  )}
                </div>

                {selectedPlot.isUnlocked && (
                  <div className="flex items-center gap-2 text-[10px]">
                    <span className="text-sky-300">💧{Math.round(selectedPlot.moisture)}%</span>
                    <span className="text-emerald-300">🧪{Math.round(selectedPlot.nutrients)}%</span>
                    <span className="text-lime-300">❤️{Math.round(selectedPlot.health)}%</span>
                    {selectedPlot.weedsLevel >= 15 && <span className="text-yellow-300">🌿{Math.round(selectedPlot.weedsLevel)}%</span>}
                    {selectedPlot.pestType && <span className="text-red-400">🐛 {selectedPlot.pestType}</span>}
                  </div>
                )}
              </div>

              {selectedPlot.blockedReason && (
                <div className="px-2.5 py-1.5 rounded-lg bg-amber-950 border border-amber-700 text-amber-200 text-[10px] flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5 shrink-0 text-amber-400" />
                  <span>{selectedPlot.blockedReason}</span>
                </div>
              )}

              {selectedPlot.isUnlocked ? (
                <div className="space-y-2">
                  <div className="grid grid-cols-5 sm:grid-cols-10 gap-1 text-[10px]">
                    <button
                      onClick={() => performAction('plow', selectedPlot.id)}
                      disabled={busyAction || !!selectedPlot.cropId || selectedPlot.soilPrepared}
                      className="min-h-[44px] p-1.5 rounded-xl bg-[#132247] hover:bg-sky-900 disabled:opacity-40 flex flex-col items-center justify-center gap-0.5"
                    >
                      <Shovel className="w-3.5 h-3.5 text-amber-400" />
                      <span>حرث</span>
                    </button>
                    <button
                      onClick={() => performAction('level_soil', selectedPlot.id)}
                      disabled={busyAction || !!selectedPlot.cropId || !selectedPlot.soilPrepared || selectedPlot.soilLeveled}
                      className="min-h-[44px] p-1.5 rounded-xl bg-[#132247] hover:bg-sky-900 disabled:opacity-40 flex flex-col items-center justify-center gap-0.5"
                    >
                      <Layers className="w-3.5 h-3.5 text-amber-300" />
                      <span>تسوية</span>
                    </button>
                    <button
                      onClick={() => setActiveModal('seeds')}
                      disabled={busyAction || !!selectedPlot.cropId || !selectedPlot.soilLeveled}
                      className="min-h-[44px] p-1.5 rounded-xl bg-emerald-700 hover:bg-emerald-600 disabled:opacity-40 flex flex-col items-center justify-center gap-0.5 font-bold"
                    >
                      <Sprout className="w-3.5 h-3.5 text-white" />
                      <span>زراعة</span>
                    </button>
                    <button
                      onClick={() => performAction('irrigate', selectedPlot.id)}
                      disabled={busyAction || !selectedPlot.cropId}
                      className="min-h-[44px] p-1.5 rounded-xl bg-sky-700 hover:bg-sky-600 disabled:opacity-40 flex flex-col items-center justify-center gap-0.5"
                    >
                      <Droplets className="w-3.5 h-3.5 text-sky-200" />
                      <span>ري</span>
                    </button>
                    <button
                      onClick={() => performAction('fertilize', selectedPlot.id, { fertType: fertChoice })}
                      disabled={busyAction || !selectedPlot.cropId}
                      className="min-h-[44px] p-1.5 rounded-xl bg-lime-800 hover:bg-lime-700 disabled:opacity-40 flex flex-col items-center justify-center gap-0.5"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-lime-200" />
                      <span>تسميد</span>
                    </button>
                    <button
                      onClick={() => performAction('weed', selectedPlot.id)}
                      disabled={busyAction || selectedPlot.weedsLevel < 10}
                      className="min-h-[44px] p-1.5 rounded-xl bg-[#132247] hover:bg-sky-900 disabled:opacity-40 flex flex-col items-center justify-center gap-0.5"
                    >
                      <Sprout className="w-3.5 h-3.5 text-yellow-400" />
                      <span>تعشيب</span>
                    </button>
                    <button
                      onClick={() => performAction('prune', selectedPlot.id)}
                      disabled={busyAction || !selectedPlot.cropId || selectedPlot.pruned}
                      className="min-h-[44px] p-1.5 rounded-xl bg-[#132247] hover:bg-sky-900 disabled:opacity-40 flex flex-col items-center justify-center gap-0.5"
                    >
                      <Scissors className="w-3.5 h-3.5 text-teal-300" />
                      <span>تقليم</span>
                    </button>
                    <button
                      onClick={() => performAction('pest_control', selectedPlot.id)}
                      disabled={busyAction || !selectedPlot.pestType}
                      className="min-h-[44px] p-1.5 rounded-xl bg-red-800 hover:bg-red-700 disabled:opacity-40 flex flex-col items-center justify-center gap-0.5"
                    >
                      <Bug className="w-3.5 h-3.5 text-red-200" />
                      <span>مكافحة</span>
                    </button>
                    <button
                      onClick={() => performAction('harvest', selectedPlot.id)}
                      disabled={busyAction || !isHarvestReady}
                      className="min-h-[44px] p-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 disabled:opacity-40 disabled:bg-[#132247] disabled:text-stone-400 flex flex-col items-center justify-center gap-0.5 font-extrabold"
                    >
                      <Wheat className="w-3.5 h-3.5" />
                      <span>حصاد</span>
                    </button>
                    <button
                      onClick={() => performAction('clear_reset', selectedPlot.id)}
                      disabled={busyAction}
                      className="min-h-[44px] p-1.5 rounded-xl bg-[#132247] hover:bg-sky-900 disabled:opacity-40 flex flex-col items-center justify-center gap-0.5"
                    >
                      <RotateCcw className="w-3.5 h-3.5 text-stone-300" />
                      <span>تهيئة</span>
                    </button>
                  </div>

                  <div className="flex flex-wrap items-center gap-1.5 text-[10px] text-sky-200">
                    <button
                      onClick={() => setFertChoice('fert_organic')}
                      className={`px-2 py-1 rounded-lg border ${
                        fertChoice === 'fert_organic'
                          ? 'bg-emerald-700 border-emerald-400 text-white font-bold'
                          : 'bg-[#132247] border-sky-400/20'
                      }`}
                    >
                      سماد عضوي ({farm.inventory?.fert_organic || 0})
                    </button>
                    <button
                      onClick={() => setFertChoice('fert_npk')}
                      className={`px-2 py-1 rounded-lg border ${
                        fertChoice === 'fert_npk'
                          ? 'bg-amber-700 border-amber-400 text-white font-bold'
                          : 'bg-[#132247] border-sky-400/20'
                      }`}
                    >
                      مركب NPK ({farm.inventory?.fert_npk || 0})
                    </button>
                    <span className="px-2 py-1 rounded-lg bg-[#132247] border border-sky-400/20">
                      🛡️ نيم: {farm.inventory?.pest_neem || 0}
                    </span>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between gap-2 text-xs">
                  <span className="text-sky-200">قطعة مقفلة — افتحها لزراعة المزيد</span>
                  <button
                    onClick={() =>
                      performAction('buy_item', undefined, {
                        itemId: selectedPlot.isGreenhouse ? 'upgrade_greenhouse' : 'expand_plot',
                      })
                    }
                    className="min-h-[44px] px-4 rounded-xl bg-amber-500 text-stone-950 font-bold"
                  >
                    فتح ({selectedPlot.isGreenhouse ? 180 : 120} 🪙)
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* 3. Compact Mobile-First Game Navigation Bar Under Viewport */}
      <div className="grid grid-cols-4 sm:grid-cols-8 gap-1.5 text-[11px] font-bold">
        <button
          onClick={() => setActiveModal('seeds')}
          className="min-h-[44px] px-2 py-1.5 rounded-xl bg-emerald-600/15 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-300 border border-emerald-500/30 flex flex-col sm:flex-row items-center justify-center gap-1"
        >
          <Sprout className="w-4 h-4 shrink-0" />
          <span className="truncate">البذور</span>
        </button>

        <button
          onClick={() => {
            setShopTab('supplies');
            setActiveModal('shop');
          }}
          className="min-h-[44px] px-2 py-1.5 rounded-xl bg-amber-500/15 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border border-amber-500/30 flex flex-col sm:flex-row items-center justify-center gap-1"
        >
          <ShoppingBag className="w-4 h-4 shrink-0" />
          <span className="truncate">المتجر والآلات</span>
        </button>

        <button
          onClick={() => {
            setMarketTab('sell');
            setActiveModal('market');
          }}
          className="min-h-[44px] px-2 py-1.5 rounded-xl bg-teal-500/15 dark:bg-teal-950/40 text-teal-800 dark:text-teal-300 border border-teal-500/30 flex flex-col sm:flex-row items-center justify-center gap-1"
        >
          <Store className="w-4 h-4 shrink-0" />
          <span className="truncate">السوق ({totalWarehouseCount})</span>
        </button>

        <button
          onClick={() => setActiveModal('livestock')}
          className="min-h-[44px] px-2 py-1.5 rounded-xl bg-lime-500/15 dark:bg-lime-950/40 text-lime-800 dark:text-lime-300 border border-lime-500/30 flex flex-col sm:flex-row items-center justify-center gap-1"
        >
          <Home className="w-4 h-4 shrink-0" />
          <span className="truncate">الحظيرة 🐄</span>
        </button>

        <button
          onClick={() => setActiveModal('quests')}
          className="relative min-h-[44px] px-2 py-1.5 rounded-xl bg-rose-500/15 dark:bg-rose-950/40 text-rose-800 dark:text-rose-300 border border-rose-500/30 flex flex-col sm:flex-row items-center justify-center gap-1"
        >
          <ClipboardCheck className="w-4 h-4 shrink-0" />
          <span className="truncate">المهام</span>
          {claimableQuestsCount > 0 && (
            <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-amber-500 text-stone-950 text-[9px] font-black flex items-center justify-center">
              {claimableQuestsCount}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveModal('greenhouse')}
          className="min-h-[44px] px-2 py-1.5 rounded-xl bg-cyan-500/15 dark:bg-cyan-950/40 text-cyan-800 dark:text-cyan-300 border border-cyan-500/30 flex flex-col sm:flex-row items-center justify-center gap-1"
        >
          <Thermometer className="w-4 h-4 shrink-0" />
          <span className="truncate">المحمي {farm.greenhouseTemp}°</span>
        </button>

        <button
          onClick={() => {
            setActiveModal('advisor');
            if (!advisorReply) handleAskAdvisor();
          }}
          className="min-h-[44px] px-2 py-1.5 rounded-xl bg-purple-500/15 dark:bg-purple-950/40 text-purple-800 dark:text-purple-300 border border-purple-500/30 flex flex-col sm:flex-row items-center justify-center gap-1"
        >
          <Bot className="w-4 h-4 shrink-0" />
          <span className="truncate">المستشار</span>
        </button>

        <button
          onClick={() => {
            fetchSocial();
            setActiveModal('social');
          }}
          className="min-h-[44px] px-2 py-1.5 rounded-xl bg-blue-500/15 dark:bg-blue-950/40 text-blue-800 dark:text-blue-300 border border-blue-500/30 flex flex-col sm:flex-row items-center justify-center gap-1"
        >
          <Trophy className="w-4 h-4 shrink-0" />
          <span className="truncate">الترتيب</span>
        </button>
      </div>

      {/* Subtle Bottom Almanac Link */}
      <div className="flex items-center justify-between gap-2 px-3 py-2 rounded-xl bg-white dark:bg-[#132247]/70 border border-stone-200 dark:border-sky-400/20 text-[11px] text-stone-700 dark:text-sky-200">
        <span className="truncate">
          <strong className="text-emerald-700 dark:text-emerald-300">إرشاد اليوم: </strong>
          {farm.dailyBookTip || farm.seasonHint}
        </span>
        <button
          onClick={() => setActiveModal('crops_guide')}
          className="shrink-0 px-2.5 py-1 rounded-lg bg-emerald-600/15 text-emerald-700 dark:text-emerald-300 font-bold flex items-center gap-1"
        >
          <BookOpen className="w-3.5 h-3.5" />
          <span>موسوعة المحاصيل</span>
        </button>
      </div>

      {/* Modal 1: Illustrated Seed Shop (Inspired by Reference Seed Shop Card Style) */}
      {activeModal === 'seeds' && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-stone-950/80">
          <div className="bg-[#f8f5ec] dark:bg-[#132247] rounded-t-3xl sm:rounded-3xl w-full max-w-2xl max-h-[88dvh] overflow-y-auto p-4 sm:p-6 border border-amber-300/60 dark:border-sky-400/25 space-y-4">
            <div className="flex items-center justify-between border-b border-amber-200 dark:border-sky-400/20 pb-3">
              <div>
                <h3 className="font-extrabold text-base text-stone-900 dark:text-white flex items-center gap-2">
                  <span>🌱 متجر البذور والشتلات العُمانية</span>
                </h3>
                <p className="text-[11px] text-stone-600 dark:text-sky-200/80 mt-0.5">
                  القطعة #{selectedPlot.plotIndex + 1} · رصيدك: <strong className="text-amber-600 dark:text-amber-300">{farm.coins} 🪙</strong>
                </p>
              </div>
              <button onClick={() => setActiveModal(null)} className="p-2 min-h-[44px] min-w-[44px] flex items-center justify-center text-stone-500 hover:text-stone-900 dark:text-sky-200">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Preparation Helper Alert if Plot is not leveled yet */}
            {!selectedPlot.cropId && (!selectedPlot.soilPrepared || !selectedPlot.soilLeveled) && (
              <div className="p-3 rounded-2xl bg-amber-100 dark:bg-amber-950/50 border border-amber-300 dark:border-amber-700 flex items-center justify-between gap-2 text-xs">
                <span className="font-bold text-amber-900 dark:text-amber-200">
                  {selectedPlot.soilPrepared
                    ? 'التربة محروثة — اضغط «تسوية الآن» قبل الزراعة:'
                    : 'القطعة بكر — احرثها أولاً لتصبح جاهزة للبذر:'}
                </span>
                <button
                  disabled={busyAction}
                  onClick={() => performAction(selectedPlot.soilPrepared ? 'level_soil' : 'plow', selectedPlot.id)}
                  className="px-3 py-1.5 rounded-xl bg-amber-600 text-white font-bold shrink-0"
                >
                  {selectedPlot.soilPrepared ? 'تسوية الآن' : 'حرث الآن'}
                </button>
              </div>
            )}

            {/* Category Filter Chips */}
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar text-[11px] font-bold">
              {[
                ['all', 'الكل'],
                ['حمضيات وفاكهة', 'نخيل وفاكهة 🌴'],
                ['خضراوات', 'خضراوات 🍅'],
                ['محاصيل حقلية', 'حقلية وأعلاف 🌾'],
              ].map(([val, label]) => (
                <button
                  key={val}
                  onClick={() => setSeedCategoryFilter(val)}
                  className={`px-3 py-1.5 rounded-xl shrink-0 border ${
                    seedCategoryFilter === val
                      ? 'bg-emerald-600 text-white border-emerald-500'
                      : 'bg-white dark:bg-[#0b1329]/80 text-stone-700 dark:text-sky-200 border-stone-200 dark:border-sky-400/20'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            {/* Illustrated Seed Cards Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              {filteredSeedCrops.map((c) => {
                const suitable = selectedPlot.isGreenhouse ? c.greenhouseSuitable : c.openFieldSuitable;
                const canPlantHere = suitable && !selectedPlot.cropId && selectedPlot.soilPrepared && selectedPlot.soilLeveled;
                return (
                  <div
                    key={c.id}
                    className={`p-3.5 rounded-2xl border-2 space-y-2.5 transition-all ${
                      suitable
                        ? 'border-amber-200/80 dark:border-sky-400/25 bg-white dark:bg-[#0b1329]/80 shadow-sm'
                        : 'border-stone-200 dark:border-stone-800 opacity-55 bg-stone-100 dark:bg-stone-900'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-700/50 flex items-center justify-center text-3xl shrink-0">
                        {CROP_EMOJIS[c.id] || '🌱'}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="font-extrabold text-stone-900 dark:text-white flex items-center justify-between gap-1">
                          <span className="truncate">{c.nameAr}</span>
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-300 shrink-0">
                            {c.category}
                          </span>
                        </div>
                        <div className="text-[10px] text-stone-500 dark:text-sky-200/70 mt-0.5 truncate">
                          {c.omaniRegions}
                        </div>
                        {c.id === 'omani_alfalfa' && (
                          <div className="text-[10px] font-bold text-lime-700 dark:text-lime-400 mt-0.5">
                            +2 حزمة علف للحظيرة مع كل حصاد 🐄
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-1 border-t border-stone-100 dark:border-sky-400/10">
                      <div className="font-bold text-[11px] tabular-nums">
                        <span className="text-stone-700 dark:text-sky-200">البذور: {c.seedCostCoins} 🪙</span>
                        <span className="mx-1.5 text-stone-300">|</span>
                        <span className="text-emerald-700 dark:text-emerald-400">العائد: {c.harvestCoins} 🪙</span>
                      </div>
                      <button
                        disabled={!canPlantHere || busyAction || farm.coins < c.seedCostCoins}
                        onClick={async () => {
                          const ok = await performAction('plant', selectedPlot.id, { cropId: c.id });
                          if (ok) setActiveModal(null);
                        }}
                        className="min-h-[38px] px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:bg-stone-300 dark:disabled:bg-stone-800 text-white dark:disabled:text-stone-500 font-extrabold text-[11px]"
                      >
                        {!suitable
                          ? selectedPlot.isGreenhouse
                            ? 'حقل مكشوف'
                            : 'بيت محمي'
                          : !selectedPlot.soilLeveled
                            ? 'جهّز الأرض أولاً'
                            : selectedPlot.cropId
                              ? 'قطعة مزروعة'
                              : 'زراعة الآن'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Modal 2: Farm Shop + Tool & Equipment Upgrades */}
      {activeModal === 'shop' && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-stone-950/80">
          <div className="bg-white dark:bg-[#132247] rounded-t-3xl sm:rounded-3xl w-full max-w-2xl max-h-[88dvh] overflow-y-auto p-4 sm:p-6 border border-stone-200 dark:border-sky-400/25 space-y-4">
            <div className="flex items-center justify-between border-b border-stone-200 dark:border-sky-400/20 pb-3">
              <div>
                <h3 className="font-bold text-base text-stone-900 dark:text-white">
                  متجر المزرعة وتطوير المعدات
                </h3>
                <p className="text-[11px] text-stone-500 dark:text-sky-200/80">
                  رصيدك الحالي: <strong className="text-amber-500">{farm.coins} 🪙</strong> · عملات اللعب المجانية فقط
                </p>
              </div>
              <button onClick={() => setActiveModal(null)} className="p-2 min-h-[44px] min-w-[44px] flex items-center justify-center text-stone-400 hover:text-stone-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex gap-2 text-xs font-bold">
              <button
                onClick={() => setShopTab('supplies')}
                className={`flex-1 min-h-[44px] rounded-xl flex items-center justify-center gap-1.5 ${
                  shopTab === 'supplies'
                    ? 'bg-emerald-600 text-white'
                    : 'bg-stone-100 dark:bg-[#0b1329]/80 text-stone-700 dark:text-sky-200'
                }`}
              >
                <ShoppingBag className="w-4 h-4" />
                <span>الإمدادات والأراضي</span>
              </button>
              <button
                onClick={() => setShopTab('tools')}
                className={`flex-1 min-h-[44px] rounded-xl flex items-center justify-center gap-1.5 ${
                  shopTab === 'tools'
                    ? 'bg-amber-500 text-stone-950'
                    : 'bg-stone-100 dark:bg-[#0b1329]/80 text-stone-700 dark:text-sky-200'
                }`}
              >
                <Wrench className="w-4 h-4" />
                <span>تطوير الأدوات والمعدات (4)</span>
              </button>
            </div>

            {shopTab === 'supplies' ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                {VIRTUAL_SHOP_ITEMS.map((item: VirtualShopItem) => (
                  <div key={item.id} className="p-3.5 rounded-2xl border border-stone-200 dark:border-sky-400/20 bg-stone-50 dark:bg-[#0b1329]/70 flex flex-col justify-between gap-3">
                    <div>
                      <div className="font-bold text-stone-900 dark:text-white">{item.nameAr}</div>
                      <p className="text-[11px] text-stone-500 dark:text-sky-200/75 mt-1">{item.description}</p>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-amber-600 dark:text-amber-400">{item.costCoins} 🪙</span>
                      <button
                        disabled={busyAction || farm.coins < item.costCoins}
                        onClick={() => performAction('buy_item', undefined, { itemId: item.id })}
                        className="min-h-[40px] px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:bg-stone-400 text-white font-bold"
                      >
                        شراء الآن
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                {FARM_TOOL_UPGRADES.map((t) => {
                  const lv = Number(farm.tools?.[t.id] || 1);
                  const isMax = lv >= t.maxLevel;
                  const cost = t.baseCostCoins * lv;
                  return (
                    <div key={t.id} className="p-4 rounded-2xl border border-stone-200 dark:border-sky-400/25 bg-stone-50 dark:bg-[#0b1329]/75 flex flex-col justify-between gap-3">
                      <div className="space-y-2">
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-extrabold text-sm text-stone-900 dark:text-white">
                            {t.icon} {t.nameAr}
                          </span>
                          <span className="px-2 py-0.5 rounded-lg bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 font-bold text-[11px]">
                            م {lv}/{t.maxLevel}
                          </span>
                        </div>
                        <p className="text-[11px] text-stone-600 dark:text-sky-200/80">{t.description}</p>
                        <div className="space-y-1 text-[10px]">
                          {t.levelBenefits.map((b, idx) => (
                            <div
                              key={idx}
                              className={`px-2 py-1 rounded-lg ${
                                idx + 1 <= lv
                                  ? 'bg-emerald-100 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-300 font-bold'
                                  : 'bg-stone-100 dark:bg-stone-900/60 text-stone-500 dark:text-stone-400'
                              }`}
                            >
                              {idx + 1 <= lv ? '✓ ' : '○ '}
                              {b}
                            </div>
                          ))}
                        </div>
                      </div>
                      <button
                        disabled={busyAction || isMax || farm.coins < cost}
                        onClick={() => performAction('upgrade_tool', undefined, { toolId: t.id })}
                        className="min-h-[44px] w-full rounded-xl bg-amber-500 hover:bg-amber-400 disabled:bg-stone-300 dark:disabled:bg-stone-800 text-stone-950 dark:disabled:text-stone-400 font-extrabold"
                      >
                        {isMax ? 'الحد الأقصى للتطوير ✓' : `ترقية للمستوى ${lv + 1} (${cost} 🪙)`}
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal 3: Greenhouse Control */}
      {activeModal === 'greenhouse' && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-stone-950/80">
          <div className="bg-white dark:bg-[#132247] rounded-t-3xl sm:rounded-3xl w-full max-w-md p-5 sm:p-6 border border-stone-200 dark:border-sky-400/25 space-y-5">
            <div className="flex items-center justify-between border-b border-stone-200 dark:border-sky-400/20 pb-3">
              <h3 className="font-bold text-base text-stone-900 dark:text-white">
                غرفة التحكم بالبيت المحمي (المستوى {farm.greenhouseLevel})
              </h3>
              <button onClick={() => setActiveModal(null)} className="p-2 min-h-[44px] min-w-[44px] flex items-center justify-center text-stone-400 hover:text-stone-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-3 rounded-2xl bg-orange-50 dark:bg-orange-950/30 border border-orange-200 dark:border-orange-800">
                <div className="text-stone-500 dark:text-orange-200">الحرارة الداخلية</div>
                <div className="text-xl font-black text-orange-600 mt-1">{farm.greenhouseTemp}°C</div>
              </div>
              <div className="p-3 rounded-2xl bg-sky-50 dark:bg-sky-950/30 border border-sky-200 dark:border-sky-800">
                <div className="text-stone-500 dark:text-sky-200">الرطوبة النسبية</div>
                <div className="text-xl font-black text-sky-600 mt-1">{farm.greenhouseHumidity}%</div>
              </div>
            </div>

            <div className="space-y-3 text-xs">
              <div className="flex items-center justify-between p-3 rounded-xl bg-stone-50 dark:bg-[#0b1329]/70">
                <span className="font-bold flex items-center gap-2 text-stone-800 dark:text-white">
                  <Wind className="w-4 h-4 text-cyan-600" />
                  <span>مراوح التهوية والتبريد الصحراوي</span>
                </span>
                <button
                  onClick={() =>
                    performAction('greenhouse_control', undefined, {
                      ventilation: !farm.greenhouseVentilation,
                    })
                  }
                  className={`min-h-[38px] px-3 py-1 rounded-lg font-bold ${
                    farm.greenhouseVentilation ? 'bg-emerald-600 text-white' : 'bg-stone-300 text-stone-800'
                  }`}
                >
                  {farm.greenhouseVentilation ? 'يعمل' : 'متوقف'}
                </button>
              </div>

              <div className="flex items-center justify-between p-3 rounded-xl bg-stone-50 dark:bg-[#0b1329]/70">
                <span className="font-bold flex items-center gap-2 text-stone-800 dark:text-white">
                  <Droplets className="w-4 h-4 text-sky-600" />
                  <span>الري الآلي بالتنقيط</span>
                </span>
                <button
                  onClick={() =>
                    performAction('greenhouse_control', undefined, {
                      irrigationAuto: !farm.greenhouseIrrigationAuto,
                    })
                  }
                  className={`min-h-[38px] px-3 py-1 rounded-lg font-bold ${
                    farm.greenhouseIrrigationAuto ? 'bg-emerald-600 text-white' : 'bg-stone-300 text-stone-800'
                  }`}
                >
                  {farm.greenhouseIrrigationAuto ? 'مفعل' : 'يدوي'}
                </button>
              </div>

              <div className="p-3 rounded-xl bg-stone-50 dark:bg-[#0b1329]/70 space-y-2 text-stone-800 dark:text-white">
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
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-stone-950/80">
          <div className="bg-white dark:bg-[#132247] rounded-t-3xl sm:rounded-3xl w-full max-w-3xl max-h-[88dvh] overflow-y-auto p-4 sm:p-6 border border-stone-200 dark:border-sky-400/25 space-y-4">
            <div className="flex items-center justify-between border-b border-stone-200 dark:border-sky-400/20 pb-3">
              <h3 className="font-bold text-base text-stone-900 dark:text-white">
                الملف العلمي الشامل للمحاصيل ({crops.length} محصولاً عُمانياً)
              </h3>
              <button onClick={() => setActiveModal(null)} className="p-2 min-h-[44px] min-w-[44px] flex items-center justify-center text-stone-400 hover:text-stone-700">
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
                      : 'bg-stone-100 dark:bg-[#0b1329]/80 text-stone-700 dark:text-sky-200'
                  }`}
                >
                  {CROP_EMOJIS[c.id] || '🌱'} {c.nameAr}
                </button>
              ))}
            </div>

            <div className="p-4 rounded-2xl bg-emerald-50/70 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-xs space-y-1.5">
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
                <div key={i} className="p-3 rounded-xl bg-stone-50 dark:bg-[#0b1329]/70 border border-stone-200 dark:border-sky-400/15 space-y-1">
                  <div className="font-bold text-emerald-700 dark:text-emerald-400">{title}</div>
                  <p className="text-stone-600 dark:text-stone-300 leading-relaxed">{text}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Modal 5: Safe AI Advisor */}
      {activeModal === 'advisor' && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-stone-950/80">
          <div className="bg-white dark:bg-[#132247] rounded-t-3xl sm:rounded-3xl w-full max-w-lg p-5 sm:p-6 border border-stone-200 dark:border-sky-400/25 space-y-4">
            <div className="flex items-center justify-between border-b border-stone-200 dark:border-sky-400/20 pb-3">
              <h3 className="font-bold text-base text-stone-900 dark:text-white flex items-center gap-2">
                <img src={FLIJAN_AVATAR_URL} alt="فليجان" className="w-7 h-7 rounded-full object-cover object-top" />
                <span>المستشار الزراعي الذكي (قطعة #{selectedPlot.plotIndex + 1})</span>
              </h3>
              <button onClick={() => setActiveModal(null)} className="p-2 min-h-[44px] min-w-[44px] flex items-center justify-center text-stone-400 hover:text-stone-700">
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
                className="flex-1 p-2.5 rounded-xl border border-stone-300 dark:border-sky-400/25 bg-stone-50 dark:bg-[#0b1329]/80 text-stone-900 dark:text-white"
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
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-stone-950/80">
          <div className="bg-white dark:bg-[#132247] rounded-t-3xl sm:rounded-3xl w-full max-w-3xl max-h-[88dvh] overflow-y-auto p-4 sm:p-6 border border-stone-200 dark:border-sky-400/25 space-y-5 text-xs">
            <div className="flex items-center justify-between border-b border-stone-200 dark:border-sky-400/20 pb-3">
              <h3 className="font-bold text-base text-stone-900 dark:text-white flex items-center gap-2">
                <Trophy className="w-5 h-5 text-amber-500" />
                <span>الترتيب العام · المنافسات · الإنجازات</span>
              </h3>
              <button onClick={() => setActiveModal(null)} className="p-2 min-h-[44px] min-w-[44px] flex items-center justify-center text-stone-400 hover:text-stone-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            {socialData.competitions.length > 0 && (
              <div className="space-y-2">
                <div className="font-bold text-stone-800 dark:text-sky-100">المنافسات المفتوحة في سلطنة عُمان:</div>
                {socialData.competitions.map((comp) => (
                  <div key={comp.id} className="p-3 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 flex items-center justify-between gap-2">
                    <div>
                      <div className="font-bold text-amber-900 dark:text-amber-200">{comp.title}</div>
                      <div className="text-[11px] text-stone-600 dark:text-stone-300">{comp.description}</div>
                    </div>
                    <span className="px-2.5 py-1 rounded-lg bg-amber-500 text-stone-950 font-bold shrink-0">+{comp.prizePoints} نقطة</span>
                  </div>
                ))}
              </div>
            )}

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-stone-800 dark:text-sky-100">الترتيب العام:</span>
                <div className="flex gap-1">
                  {(['all', 'weekly', 'monthly'] as const).map((t) => (
                    <button
                      key={t}
                      onClick={() => setBoardTab(t)}
                      className={`px-2.5 py-1 rounded-lg font-bold ${
                        boardTab === t ? 'bg-emerald-600 text-white' : 'bg-stone-100 dark:bg-[#0b1329]/80 text-stone-600 dark:text-sky-200'
                      }`}
                    >
                      {t === 'all' ? 'الكل' : t === 'weekly' ? 'أسبوعي' : 'شهري'}
                    </button>
                  ))}
                </div>
              </div>

              <div className="divide-y divide-stone-100 dark:divide-sky-400/15 border border-stone-200 dark:border-sky-400/20 rounded-2xl overflow-hidden">
                {sortedLeaderboard.map((player, idx) => {
                  const pts = boardTab === 'weekly' ? player.weeklyPoints : boardTab === 'monthly' ? player.monthlyPoints : player.points;
                  const isMe = player.userId === user.id;
                  return (
                    <div key={player.userId} className={`p-3 flex items-center justify-between gap-2 ${isMe ? 'bg-emerald-50/70 dark:bg-emerald-950/30' : ''}`}>
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className="w-6 h-6 rounded-full bg-stone-200 dark:bg-[#0b1329] flex items-center justify-center font-bold shrink-0">
                          {idx + 1}
                        </span>
                        <div className="min-w-0">
                          <div className="font-bold text-stone-900 dark:text-white truncate">
                            {player.name} {isMe && '(أنت)'}
                          </div>
                          <div className="text-[11px] text-stone-500 dark:text-sky-200/70 truncate">
                            {player.governorate} · م{player.level} · {player.achievementsCount} إنجازات
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <span className="font-black text-emerald-600 dark:text-emerald-400 font-mono">{pts} نقطة</span>
                        {!isMe && (
                          <>
                            <button
                              onClick={() => handleSocialAction({ action: 'send_invite', targetUserId: player.userId })}
                              className="px-2 py-1 rounded-lg bg-blue-600 text-white font-bold flex items-center gap-1"
                            >
                              <Users className="w-3 h-3" />
                              <span>تحدي</span>
                            </button>
                            <button
                              onClick={() => handleSocialAction({ action: 'report_player', targetUserId: player.userId, reason: 'طلب مراجعة نزاهة النقاط' })}
                              className="p-1.5 rounded-lg bg-stone-100 dark:bg-stone-800 text-stone-500 hover:text-red-500"
                              title="إبلاغ"
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

            {socialData.friendships.length > 0 && (
              <div className="space-y-2">
                <div className="font-bold text-stone-800 dark:text-sky-100">طلبات الصداقة والمنافسة:</div>
                {socialData.friendships.map((fr) => (
                  <div key={fr.id} className="p-3 rounded-xl bg-stone-50 dark:bg-[#0b1329]/70 flex items-center justify-between">
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

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <div className="font-bold text-stone-800 dark:text-sky-100 flex items-center gap-1.5">
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
                            : 'bg-stone-50 dark:bg-[#0b1329]/50 border-stone-200 dark:border-sky-400/15 opacity-60'
                        }`}
                      >
                        <span>{ach.icon} {ach.titleAr}</span>
                        <span className="font-bold text-emerald-600 dark:text-emerald-400">+{ach.rewardPoints}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-2">
                <div className="font-bold text-stone-800 dark:text-sky-100">سجل النقاط الموثق:</div>
                <div className="max-h-56 overflow-y-auto divide-y divide-stone-100 dark:divide-sky-400/10 border border-stone-200 dark:border-sky-400/20 rounded-xl p-2">
                  {(farm.logs || []).slice(0, 12).map((l: any) => (
                    <div key={l.id} className="py-1.5 flex items-center justify-between gap-2">
                      <span className="text-stone-600 dark:text-stone-300">{l.description}</span>
                      {l.pointsDelta > 0 && <span className="font-bold text-emerald-600 dark:text-emerald-400 shrink-0">+{l.pointsDelta}</span>}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal 7: Farm Notifications */}
      {activeModal === 'notifications' && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-stone-950/80">
          <div className="bg-white dark:bg-[#132247] rounded-t-3xl sm:rounded-3xl w-full max-w-md p-5 sm:p-6 border border-stone-200 dark:border-sky-400/25 space-y-4 text-xs">
            <div className="flex items-center justify-between border-b border-stone-200 dark:border-sky-400/20 pb-3">
              <h3 className="font-bold text-base text-stone-900 dark:text-white">تنبيهات المزرعة الافتراضية</h3>
              <button onClick={() => setActiveModal(null)} className="p-2 min-h-[44px] min-w-[44px] flex items-center justify-center text-stone-400 hover:text-stone-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex items-center justify-between p-3 rounded-xl bg-stone-50 dark:bg-[#0b1329]/70">
              <span className="font-bold">استلام إشعارات الري والحصاد</span>
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
                <div key={n.id} className="p-3 rounded-xl border border-stone-200 dark:border-sky-400/15 bg-stone-50/70 dark:bg-[#0b1329]/60">
                  <div className="font-bold text-stone-900 dark:text-white">{n.title}</div>
                  <p className="text-stone-600 dark:text-stone-300 mt-0.5">{n.message}</p>
                </div>
              ))}
            </div>

            <button
              onClick={() => performAction('mark_notifications_read')}
              className="w-full min-h-[44px] py-2 rounded-xl bg-stone-200 dark:bg-[#0b1329] font-bold text-stone-800 dark:text-sky-100"
            >
              تحديد الكل كمقروء
            </button>
          </div>
        </div>
      )}

      {/* Modal 8: Omani Livestock Barn & Beehive Apiary */}
      {activeModal === 'livestock' && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-stone-950/80">
          <div className="bg-white dark:bg-[#132247] rounded-t-3xl sm:rounded-3xl w-full max-w-2xl max-h-[88dvh] overflow-y-auto p-4 sm:p-6 border border-stone-200 dark:border-sky-400/25 space-y-4 text-xs">
            <div className="flex items-center justify-between border-b border-stone-200 dark:border-sky-400/20 pb-3">
              <div>
                <h3 className="font-bold text-base text-stone-900 dark:text-white">
                  🐄 الحظيرة العُمانية ومنحل العسل
                </h3>
                <p className="text-[11px] text-stone-500 dark:text-sky-200/80 mt-0.5">
                  رصيد الأعلاف: <strong className="text-emerald-600 dark:text-emerald-400 tabular-nums">{farm.inventory?.fodder_pack ?? 0}</strong> حزمة برسيم · م الحظيرة {farm.buildings?.livestockShelter || 1}
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
                نصيحة: زراعة القت العُماني تمنحك حزمتي علف مجاناً مع كل حصاد!
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
                  السوق 🏪
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal 9: Dynamic Daily Omani Souq Market, Buildings & Harvest Log */}
      {activeModal === 'market' && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-stone-950/80">
          <div className="bg-white dark:bg-[#132247] rounded-t-3xl sm:rounded-3xl w-full max-w-3xl max-h-[88dvh] overflow-y-auto p-4 sm:p-6 border border-stone-200 dark:border-sky-400/25 space-y-4 text-xs">
            <div className="flex items-center justify-between border-b border-stone-200 dark:border-sky-400/20 pb-3">
              <div>
                <h3 className="font-bold text-base text-stone-900 dark:text-white flex items-center gap-2">
                  <Store className="w-5 h-5 text-teal-500" />
                  <span>سوق المزرعة اليومي وتطوير المنشآت</span>
                </h3>
                <p className="text-[11px] text-stone-500 dark:text-sky-200/80 mt-0.5">
                  رصيدك: <strong className="text-amber-500 tabular-nums">{farm.coins} 🪙</strong> · علاوة المخزن: <strong className="text-emerald-500">+{Math.max(0, ((farm.buildings?.barnStorage || 1) - 1) * 12)}%</strong>
                </p>
              </div>
              <button onClick={() => setActiveModal(null)} className="p-2 min-h-[44px] min-w-[44px] flex items-center justify-center text-stone-400 hover:text-stone-700 dark:hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-3 gap-1.5 font-bold">
              <button
                onClick={() => setMarketTab('sell')}
                className={`min-h-[44px] rounded-xl flex items-center justify-center gap-1.5 ${
                  marketTab === 'sell'
                    ? 'bg-teal-600 text-white'
                    : 'bg-stone-100 dark:bg-[#0b1329]/80 text-stone-700 dark:text-sky-200'
                }`}
              >
                <TrendingUp className="w-4 h-4 shrink-0" />
                <span>السوق ({totalWarehouseCount})</span>
              </button>
              <button
                onClick={() => setMarketTab('buildings')}
                className={`min-h-[44px] rounded-xl flex items-center justify-center gap-1.5 ${
                  marketTab === 'buildings'
                    ? 'bg-emerald-600 text-white'
                    : 'bg-stone-100 dark:bg-[#0b1329]/80 text-stone-700 dark:text-sky-200'
                }`}
              >
                <Hammer className="w-4 h-4 shrink-0" />
                <span>المباني (4)</span>
              </button>
              <button
                onClick={() => setMarketTab('stats')}
                className={`min-h-[44px] rounded-xl flex items-center justify-center gap-1.5 ${
                  marketTab === 'stats'
                    ? 'bg-amber-500 text-stone-950'
                    : 'bg-stone-100 dark:bg-[#0b1329]/80 text-stone-700 dark:text-sky-200'
                }`}
              >
                <BarChart3 className="w-4 h-4 shrink-0" />
                <span>سجل الإنتاج</span>
              </button>
            </div>

            {marketTab === 'sell' ? (
              <div className="space-y-4">
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
                                اليوم: <strong className="text-amber-500">{unitPrice} 🪙</strong> · {mult.toFixed(2)}×
                                {isHot && <span className="text-emerald-500 font-bold"> · طلب عالٍ!</span>}
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
                                الكل ({qty * unitPrice} 🪙)
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
                        <div key={crop.id} className={`p-3 rounded-2xl border border-stone-200 dark:border-sky-400/20 bg-stone-50 dark:bg-[#0b1329]/70 flex items-center justify-between gap-2 ${qty === 0 ? 'opacity-65' : ''}`}>
                          <div>
                            <div className="font-bold text-stone-900 dark:text-white">
                              {CROP_EMOJIS[crop.id] || '🌱'} {crop.nameAr}
                            </div>
                            <div className="text-[11px] text-stone-500 dark:text-sky-200/75 tabular-nums">
                              {unitPrice} 🪙/صندوق · {mult.toFixed(2)}×{isHot ? ' · طلب عالٍ!' : ''}
                            </div>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <span className="font-black text-sky-600 dark:text-sky-300 tabular-nums">×{qty}</span>
                            <button
                              disabled={busyAction || qty <= 0}
                              onClick={() => performAction('sell_market', undefined, { itemType: 'crop', itemId: crop.id, quantity: 'all' })}
                              className="min-h-[40px] px-3 rounded-xl bg-teal-600 hover:bg-teal-500 disabled:bg-stone-300 dark:disabled:bg-stone-800 text-white dark:disabled:text-stone-500 font-bold"
                            >
                              {qty > 0 ? `بيع (${qty * unitPrice})` : 'فارغ'}
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            ) : marketTab === 'buildings' ? (
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
                        {isMax ? 'أعلى مستوى ✓' : `تطوير إلى م${lv + 1} (${cost} 🪙)`}
                      </button>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="space-y-4">
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  <div className="p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-700/40">
                    <div className="text-[11px] text-stone-600 dark:text-emerald-200">إجمالي الحصادات</div>
                    <div className="text-xl font-black text-emerald-700 dark:text-emerald-300 mt-1 tabular-nums">
                      {farm.harvestStats?.totalHarvests || 0} عملية
                    </div>
                  </div>
                  <div className="p-3.5 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-700/40">
                    <div className="text-[11px] text-stone-600 dark:text-amber-200">عوائد الحصاد</div>
                    <div className="text-xl font-black text-amber-700 dark:text-amber-300 mt-1 tabular-nums">
                      {farm.harvestStats?.totalEarnedCoins || 0} 🪙
                    </div>
                  </div>
                  <div className="col-span-2 sm:col-span-1 p-3.5 rounded-2xl bg-sky-50 dark:bg-sky-950/30 border border-sky-200 dark:border-sky-700/40">
                    <div className="text-[11px] text-stone-600 dark:text-sky-200">ترقية المعدات</div>
                    <div className="text-xl font-black text-sky-700 dark:text-sky-300 mt-1 tabular-nums">
                      {(farm.tools?.plow || 1) + (farm.tools?.irrigation || 1) + (farm.tools?.sprayer || 1) + (farm.tools?.harvester || 1)}/12
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {crops.map((c) => {
                    const harvestedBoxes = Number(farm.harvestStats?.byCrop?.[c.id] || 0);
                    return (
                      <div key={c.id} className="p-3 rounded-xl border border-stone-200 dark:border-sky-400/20 bg-stone-50 dark:bg-[#0b1329]/70 flex items-center justify-between">
                        <span className="font-bold text-stone-900 dark:text-white">
                          {CROP_EMOJIS[c.id] || '🌱'} {c.nameAr}
                        </span>
                        <span className="font-extrabold text-emerald-600 dark:text-emerald-400 tabular-nums">
                          {harvestedBoxes} صندوق محصود
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal 10: Daily Farm Quests */}
      {activeModal === 'quests' && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-stone-950/80">
          <div className="bg-white dark:bg-[#132247] rounded-t-3xl sm:rounded-3xl w-full max-w-lg p-5 sm:p-6 border border-stone-200 dark:border-sky-400/25 space-y-4 text-xs">
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
                        +{q.rewardCoins} 🪙 · +{q.rewardPoints} ⭐ · +{q.rewardWater}💧
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

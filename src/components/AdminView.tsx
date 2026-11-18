import React, { useState, useEffect, useCallback } from 'react';
import {
  ShieldCheck,
  Activity,
  Send,
  Plus,
  Lock,
  MoonStar,
  CheckCircle2,
  AlertTriangle,
  KeyRound,
  Play,
  RotateCcw,
  Users,
  Eye,
  Smartphone,
  Monitor,
  Tablet,
  UserPlus,
  PauseCircle,
  PlayCircle,
  Trash2,
  Filter,
  ClipboardList,
  LogOut,
} from 'lucide-react';
import { UserProfile } from '../types/index.ts';
import { GAME_QUESTIONS, Question } from '../data/agriculturalData.ts';
import {
  SeasonalConfig,
  DEFAULT_SEASONAL_CONFIG,
  computeOmaniHijriState,
  generateSeasonalTestScenarios,
} from '../utils/islamicCalendar.ts';

interface AdminViewProps {
  user: UserProfile;
  onBroadcastSuccess: (msg: string) => void;
  seasonalConfig?: SeasonalConfig;
  onSeasonalConfigUpdated?: (cfg: SeasonalConfig) => void;
}

type AdminTab =
  | 'overview'
  | 'visitors'
  | 'moderation'
  | 'support'
  | 'security'
  | 'seasonal'
  | 'broadcast'
  | 'questions'
  | 'audit';

export const AdminView: React.FC<AdminViewProps> = ({
  user,
  onBroadcastSuccess,
  seasonalConfig,
  onSeasonalConfigUpdated,
}) => {
  const [adminToken, setAdminToken] = useState<string>(
    () => localStorage.getItem('farmer_admin_token') || ''
  );
  const [staffRole, setStaffRole] = useState<'admin' | 'moderator' | null>(() => {
    const r = localStorage.getItem('farmer_staff_role');
    return r === 'admin' || r === 'moderator' ? r : null;
  });
  const [mustChangePassword, setMustChangePassword] = useState<boolean>(
    () => localStorage.getItem('farmer_force_pw_change') === '1'
  );

  const [activeTab, setActiveTab] = useState<AdminTab>(() => {
    if (localStorage.getItem('farmer_force_pw_change') === '1') return 'security';
    if (localStorage.getItem('farmer_staff_role') === 'moderator') return 'moderation';
    return 'overview';
  });

  const [inlinePassword, setInlinePassword] = useState<string>('');
  const [stats, setStats] = useState<any>(null);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [moderationLogs, setModerationLogs] = useState<any[]>([]);
  const [supportTickets, setSupportTickets] = useState<any[]>([]);
  const [statusMsg, setStatusMsg] = useState<{ ok: boolean; text: string } | null>(null);

  // Visitor Analytics state
  const [visitorAnalytics, setVisitorAnalytics] = useState<{
    todayCount: number;
    weekCount: number;
    totalCount: number;
    activeNowCount: number;
    last7Days: Array<{ dateKey: string; labelAr: string; count: number }>;
    recentVisitors: Array<{
      anonLabel: string;
      deviceType: string;
      browserLabel: string;
      firstVisitAt: number;
      lastSeenAt: number;
      visitCount: number;
      lastPage: string;
      isActiveNow: boolean;
    }>;
  } | null>(null);

  // Moderators & Banned Words state
  const [moderators, setModerators] = useState<Array<{
    id: string;
    username: string;
    displayName: string;
    isPaused: boolean;
    createdAt: number;
  }>>([]);
  const [newModName, setNewModName] = useState<string>('');
  const [newModUsername, setNewModUsername] = useState<string>('');
  const [newModPassword, setNewModPassword] = useState<string>('');
  const [confirmDeleteModId, setConfirmDeleteModId] = useState<string | null>(null);

  const [bannedWords, setBannedWords] = useState<string[]>([]);
  const [newBannedWord, setNewBannedWord] = useState<string>('');

  // Broadcast alert form
  const [alertTitle, setAlertTitle] = useState<string>('');
  const [alertMessage, setAlertMessage] = useState<string>('');
  const [alertType, setAlertType] = useState<'weather' | 'crop_advice' | 'ramadan' | 'system'>('weather');
  const [alertTargetGov, setAlertTargetGov] = useState<string>('كافة محافظات سلطنة عُمان');
  const [broadcastLoading, setBroadcastLoading] = useState<boolean>(false);

  // Questions state
  const [newQType, setNewQType] = useState<string>('knowledge');
  const [newQuestionText, setNewQuestionText] = useState<string>('');
  const [opt0, setOpt0] = useState<string>('');
  const [opt1, setOpt1] = useState<string>('');
  const [opt2, setOpt2] = useState<string>('');
  const [opt3, setOpt3] = useState<string>('');
  const [correctIdx, setCorrectIdx] = useState<number>(0);
  const [explanation, setExplanation] = useState<string>('');
  const [questionsList, setQuestionsList] = useState<Question[]>(GAME_QUESTIONS);

  // Seasonal Config state
  const [seasonForm, setSeasonForm] = useState<SeasonalConfig>(
    seasonalConfig || DEFAULT_SEASONAL_CONFIG
  );
  const [testResults, setTestResults] = useState<Array<{
    id: string;
    labelAr: string;
    expected: string;
    actual: string;
    hijriAr: string;
    passed: boolean;
  }>>([]);

  // Admin Password Change state
  const [currentPassword, setCurrentPassword] = useState<string>('');
  const [newPassword, setNewPassword] = useState<string>('');
  const [confirmNewPassword, setConfirmNewPassword] = useState<string>('');

  const authHeaders = useCallback(
    (): Record<string, string> => ({
      'Content-Type': 'application/json',
      'x-admin-token': adminToken,
    }),
    [adminToken]
  );

  const fetchAdminData = useCallback(async () => {
    try {
      const [qRes, sRes] = await Promise.all([
        fetch('/api/admin/questions'),
        fetch('/api/seasonal/config'),
      ]);
      const qData = await qRes.json();
      if (qData.success && Array.isArray(qData.questions)) setQuestionsList(qData.questions);
      const sData = await sRes.json();
      if (sData.success && sData.config) setSeasonForm(sData.config);

      if (!adminToken) return;

      const meRes = await fetch('/api/auth/me', { headers: { 'x-admin-token': adminToken } });
      if (!meRes.ok) {
        localStorage.removeItem('farmer_admin_token');
        localStorage.removeItem('farmer_staff_role');
        localStorage.removeItem('farmer_force_pw_change');
        setAdminToken('');
        setStaffRole(null);
        return;
      }
      const meData = await meRes.json();
      const role: 'admin' | 'moderator' = meData.session?.role || 'admin';
      const forceChange = Boolean(meData.session?.mustChangePassword);
      setStaffRole(role);
      setMustChangePassword(forceChange);
      localStorage.setItem('farmer_staff_role', role);
      if (forceChange) {
        localStorage.setItem('farmer_force_pw_change', '1');
        setActiveTab('security');
        return;
      }
      localStorage.removeItem('farmer_force_pw_change');

      const [statsRes, logsRes, modLogsRes, ticketsRes] = await Promise.all([
        fetch('/api/admin/stats', { headers: { 'x-admin-token': adminToken } }),
        fetch('/api/admin/audit-logs', { headers: { 'x-admin-token': adminToken } }),
        fetch('/api/staff/moderation-logs', { headers: { 'x-admin-token': adminToken } }),
        fetch('/api/staff/support-tickets', { headers: { 'x-admin-token': adminToken } }),
      ]);

      if (statsRes.ok) {
        const statsData = await statsRes.json();
        if (statsData.success) setStats(statsData.stats);
      }
      if (logsRes.ok) {
        const logsData = await logsRes.json();
        if (logsData.success) setAuditLogs(logsData.logs);
      }
      if (modLogsRes.ok) {
        const modLogsData = await modLogsRes.json();
        if (modLogsData.success) setModerationLogs(modLogsData.moderationLogs || []);
      }
      if (ticketsRes.ok) {
        const ticketsData = await ticketsRes.json();
        if (ticketsData.success) setSupportTickets(ticketsData.tickets || []);
      }

      if (role === 'admin') {
        const [visRes, modsRes, bwRes] = await Promise.all([
          fetch('/api/admin/visitors', { headers: { 'x-admin-token': adminToken } }),
          fetch('/api/admin/moderators', { headers: { 'x-admin-token': adminToken } }),
          fetch('/api/admin/banned-words', { headers: { 'x-admin-token': adminToken } }),
        ]);

        if (visRes.ok) {
          const visData = await visRes.json();
          if (visData.success) setVisitorAnalytics(visData.analytics);
        }
        if (modsRes.ok) {
          const modsData = await modsRes.json();
          if (modsData.success) setModerators(modsData.moderators || []);
        }
        if (bwRes.ok) {
          const bwData = await bwRes.json();
          if (bwData.success) setBannedWords(bwData.words || []);
        }
      }
    } catch (e) {
      console.warn('Failed to fetch admin data:', e);
    }
  }, [adminToken]);

  useEffect(() => {
    fetchAdminData();
  }, [fetchAdminData]);

  const handleInlineVerifyPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatusMsg(null);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: 'admin', password: inlinePassword.trim() }),
      });
      const data = await res.json();
      if (data.success && data.token) {
        localStorage.setItem('farmer_admin_token', data.token);
        localStorage.setItem('farmer_staff_role', data.role || 'admin');
        setAdminToken(data.token);
        setStaffRole(data.role || 'admin');
        setInlinePassword('');
        if (data.mustChangePassword) {
          localStorage.setItem('farmer_force_pw_change', '1');
          setMustChangePassword(true);
          setActiveTab('security');
          setStatusMsg({
            ok: false,
            text: 'تم تسجيل الدخول بكلمة السر الابتدائية. يرجى تعيين كلمة سر جديدة (8 خانات فأكثر) الآن.',
          });
        } else {
          localStorage.removeItem('farmer_force_pw_change');
          setMustChangePassword(false);
          setStatusMsg({ ok: true, text: 'تم التحقق من صلاحية الجلسة الإدارية بنجاح!' });
        }
      } else {
        setStatusMsg({ ok: false, text: data.error || 'كلمة السر غير صحيحة.' });
      }
    } catch {
      setStatusMsg({ ok: false, text: 'تعذر التحقق من الخادم.' });
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatusMsg(null);
    if (newPassword.trim().length < 8) {
      setStatusMsg({ ok: false, text: 'يجب أن تتكون كلمة السر الجديدة من 8 خانات على الأقل.' });
      return;
    }
    if (newPassword.trim() !== confirmNewPassword.trim()) {
      setStatusMsg({ ok: false, text: 'كلمة السر الجديدة وتأكيدها غير متطابقين.' });
      return;
    }
    try {
      const res = await fetch('/api/admin/change-pin', {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({
          currentPassword: currentPassword.trim(),
          newPassword: newPassword.trim(),
          confirmPassword: confirmNewPassword.trim(),
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        localStorage.removeItem('farmer_force_pw_change');
        setMustChangePassword(false);
        setStatusMsg({ ok: true, text: data.message });
        setCurrentPassword('');
        setNewPassword('');
        setConfirmNewPassword('');
        fetchAdminData();
      } else {
        setStatusMsg({ ok: false, text: data.error || 'تعذر تغيير كلمة السر.' });
      }
    } catch {
      setStatusMsg({ ok: false, text: 'تعذر الاتصال بالخادم.' });
    }
  };

  const handleAddModerator = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatusMsg(null);
    if (newModPassword.trim().length < 8) {
      setStatusMsg({ ok: false, text: 'كلمة سر المشرف يجب أن لا تقل عن 8 خانات.' });
      return;
    }
    try {
      const res = await fetch('/api/admin/moderators', {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({
          displayName: newModName.trim(),
          username: newModUsername.trim(),
          password: newModPassword.trim(),
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setNewModName('');
        setNewModUsername('');
        setNewModPassword('');
        setStatusMsg({ ok: true, text: `تمت إضافة المشرف «${data.moderator.displayName}» بنجاح!` });
        fetchAdminData();
      } else {
        setStatusMsg({ ok: false, text: data.error || 'تعذر إضافة المشرف.' });
      }
    } catch {
      setStatusMsg({ ok: false, text: 'تعذر الاتصال بالخادم.' });
    }
  };

  const handleTogglePauseModerator = async (modId: string, nextPaused: boolean) => {
    try {
      const res = await fetch(`/api/admin/moderators/${modId}`, {
        method: 'PATCH',
        headers: authHeaders(),
        body: JSON.stringify({ isPaused: nextPaused }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setStatusMsg({
          ok: true,
          text: nextPaused ? 'تم إيقاف حساب المشرف مؤقتاً وإلغاء جلساته.' : 'تم تفعيل حساب المشرف.',
        });
        fetchAdminData();
      } else {
        setStatusMsg({ ok: false, text: data.error || 'تعذر تحديث حالة المشرف.' });
      }
    } catch {
      setStatusMsg({ ok: false, text: 'خطأ في الاتصال بالخادم.' });
    }
  };

  const handleDeleteModerator = async (modId: string) => {
    try {
      const res = await fetch(`/api/admin/moderators/${modId}`, {
        method: 'DELETE',
        headers: authHeaders(),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setConfirmDeleteModId(null);
        setStatusMsg({ ok: true, text: 'تم حذف المشرف نهائياً.' });
        fetchAdminData();
      } else {
        setStatusMsg({ ok: false, text: data.error || 'تعذر حذف المشرف.' });
      }
    } catch {
      setStatusMsg({ ok: false, text: 'تعذر حذف المشرف.' });
    }
  };

  const handleSaveBannedWords = async (updatedList: string[]) => {
    try {
      const res = await fetch('/api/admin/banned-words', {
        method: 'PUT',
        headers: authHeaders(),
        body: JSON.stringify({ words: updatedList }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setBannedWords(data.words);
        setStatusMsg({ ok: true, text: 'تم تحديث قائمة الكلمات الممنوعة وتفعيل الحجب التلقائي بـ ***.' });
        fetchAdminData();
      } else {
        setStatusMsg({ ok: false, text: data.error || 'تعذر تحديث قائمة الكلمات الممنوعة.' });
      }
    } catch {
      setStatusMsg({ ok: false, text: 'خطأ في الاتصال بالخادم.' });
    }
  };

  const handleAddBannedWord = async (e: React.FormEvent) => {
    e.preventDefault();
    const w = newBannedWord.trim();
    if (w.length < 2) {
      setStatusMsg({ ok: false, text: 'أدخل كلمة مكونة من حرفين فأكثر.' });
      return;
    }
    if (bannedWords.includes(w)) {
      setNewBannedWord('');
      return;
    }
    const next = [...bannedWords, w];
    setNewBannedWord('');
    await handleSaveBannedWords(next);
  };

  const handleBroadcastAlert = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!alertTitle.trim() || !alertMessage.trim()) return;
    setBroadcastLoading(true);
    setStatusMsg(null);
    try {
      const res = await fetch('/api/admin/broadcast-alert', {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({
          title: alertTitle,
          message: alertMessage,
          type: alertType,
          targetGovernorate: alertTargetGov,
          senderName: user.name,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setStatusMsg({ ok: true, text: 'تم نشر التنبيه في مركز الإشعارات للمحافظة المحددة. يظهر للمزارعين عند فتح التطبيق أو تحديث المركز.' });
        onBroadcastSuccess(alertTitle);
        setAlertTitle('');
        setAlertMessage('');
        fetchAdminData();
      } else {
        setStatusMsg({ ok: false, text: data.error || 'يرجى التحقق من جلسة المدير أولاً.' });
      }
    } catch {
      setStatusMsg({ ok: false, text: 'تعذر بث التنبيه حالياً.' });
    } finally {
      setBroadcastLoading(false);
    }
  };

  const handleCreateQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newQuestionText.trim() || !opt0.trim() || !opt1.trim()) return;
    const options = [opt0, opt1];
    if (opt2.trim()) options.push(opt2);
    if (opt3.trim()) options.push(opt3);

    try {
      const res = await fetch('/api/admin/questions', {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({
          gameType: newQType,
          question: newQuestionText,
          options,
          correctIndex: correctIdx,
          explanation,
          points: 100,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setQuestionsList((prev) => [data.question, ...prev]);
        setNewQuestionText('');
        setOpt0('');
        setOpt1('');
        setOpt2('');
        setOpt3('');
        setExplanation('');
        setStatusMsg({ ok: true, text: 'تم إضافة السؤال واعتماده فورياً في اللعبة!' });
        fetchAdminData();
      } else {
        setStatusMsg({ ok: false, text: data.error || 'تعذر إضافة السؤال.' });
      }
    } catch {
      setStatusMsg({ ok: false, text: 'تعذر الاتصال بالخادم.' });
    }
  };

  const handleSaveSeasonalConfig = async (cfgToSave: SeasonalConfig = seasonForm) => {
    try {
      const res = await fetch('/api/admin/seasonal-config', {
        method: 'PUT',
        headers: authHeaders(),
        body: JSON.stringify(cfgToSave),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setSeasonForm(data.config);
        if (onSeasonalConfigUpdated) onSeasonalConfigUpdated(data.config);
        setStatusMsg({ ok: true, text: 'تم حفظ إعدادات التقويم الهجري والمناسبات وتعميمها فوراً!' });
        fetchAdminData();
      } else {
        setStatusMsg({ ok: false, text: data.error || 'يرجى التحقق من جلسة المدير أولاً.' });
      }
    } catch {
      setStatusMsg({ ok: false, text: 'تعذر حفظ إعدادات المناسبات.' });
    }
  };

  const handleRunSeasonalTests = () => {
    const scenarios = generateSeasonalTestScenarios(
      seasonForm.referenceCalendar,
      seasonForm.hijriOffsetDays
    );
    const results = scenarios.map((sc) => {
      const info = computeOmaniHijriState({
        ...seasonForm,
        overrideOccasion: 'auto',
        simulatedDateIso: sc.simulatedIso,
      });
      return {
        id: sc.id,
        labelAr: sc.labelAr,
        expected: sc.expectedOccasion,
        actual: info.occasion,
        hijriAr: info.formattedAr,
        passed: info.occasion === sc.expectedOccasion,
      };
    });
    setTestResults(results);
  };

  const liveHijri = computeOmaniHijriState(seasonForm);
  const scenarios = generateSeasonalTestScenarios(
    seasonForm.referenceCalendar,
    seasonForm.hijriOffsetDays
  );

  const isModeratorOnly = staffRole === 'moderator';
  const max7DayCount = Math.max(
    1,
    ...(visitorAnalytics?.last7Days || []).map((d) => d.count)
  );

  const handleUpdateTicketStatus = async (ticketId: string, status: 'open' | 'in_progress' | 'resolved') => {
    try {
      const res = await fetch(`/api/staff/support-tickets/${ticketId}`, {
        method: 'PATCH',
        headers: authHeaders(),
        body: JSON.stringify({ status }),
      });
      const data = await res.json();
      if (!res.ok) {
        setStatusMsg({ ok: false, text: data.error || 'تعذر تحديث حالة الطلب.' });
        return;
      }
      setSupportTickets((prev) => prev.map((t) => (t.id === ticketId ? data.ticket : t)));
      setStatusMsg({ ok: true, text: 'تم تحديث حالة تذكرة المزارع بنجاح.' });
    } catch {
      setStatusMsg({ ok: false, text: 'تعذر الاتصال بالخادم.' });
    }
  };

  const allTabs: Array<{ id: AdminTab; label: string; adminOnly?: boolean }> = [
    { id: 'overview', label: 'نظرة عامة', adminOnly: true },
    { id: 'visitors', label: 'معرفة الزوار', adminOnly: true },
    { id: 'moderation', label: 'المشرفون والكلمات الممنوعة' },
    { id: 'support', label: `بلاغات ومقترحات المزارعين (${supportTickets.filter((t) => t.status !== 'resolved').length})` },
    { id: 'security', label: 'تغيير كلمة السر', adminOnly: true },
    { id: 'seasonal', label: 'المناسبات والتقويم', adminOnly: true },
    { id: 'broadcast', label: 'بث التنبيهات', adminOnly: true },
    { id: 'questions', label: 'بنك الأسئلة', adminOnly: true },
    { id: 'audit', label: 'سجل التدقيق' },
  ];

  const visibleTabs = allTabs.filter((t) => {
    if (mustChangePassword) return t.id === 'security';
    if (isModeratorOnly) return !t.adminOnly;
    return true;
  });

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Admin Header */}
      <div className="rounded-2xl bg-gradient-to-r from-[#132247] to-[#0e1936] text-white p-5 sm:p-6 shadow-md border border-sky-300/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-emerald-400">
            <ShieldCheck className="w-4 h-4" />
            <span>
              {isModeratorOnly ? 'لوحة الإشراف والرقابة المجتمعية' : 'لوحة الإدارة المركزية والأمان'}
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold mt-1 text-white">
            {isModeratorOnly ? 'لوحة مشرف المجتمع' : 'لوحة تحكم مدير المنصة'}
          </h1>
          <div className="text-xs text-slate-300 mt-1">
            صاحب الفكرة والمدير العام: <strong className="text-emerald-300 font-bold">عمر بن سالم الشرجي</strong> ·{' '}
            {isModeratorOnly ? `المشرف: ${user.name}` : 'صلاحيات الإدارة الكاملة'}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 text-[11px]">
          <span className="px-3 py-1.5 rounded-lg bg-emerald-950/80 text-emerald-300 border border-emerald-700/60 font-semibold">
            {adminToken ? 'جلسة إدارية موثقة' : 'بانتظار توثيق الدخول'}
          </span>
          {adminToken && (
            <button
              type="button"
              onClick={async () => {
                try {
                  await fetch('/api/auth/logout', { method: 'POST', headers: { 'x-admin-token': adminToken } });
                } catch {
                  // Ignore offline error
                }
                localStorage.removeItem('farmer_admin_token');
                localStorage.removeItem('farmer_staff_role');
                localStorage.removeItem('farmer_force_pw_change');
                setAdminToken('');
                setStaffRole(null);
                setMustChangePassword(false);
                setStatusMsg({ ok: true, text: 'تم إنهاء الجلسة الإدارية بنجاح.' });
              }}
              className="min-h-[40px] px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white font-bold flex items-center gap-1.5 transition-colors"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>إنهاء الجلسة</span>
            </button>
          )}
        </div>
      </div>

      {/* Inline Password Auth Prompt if session token missing */}
      {!adminToken && (
        <form
          onSubmit={handleInlineVerifyPassword}
          className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-700 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs"
        >
          <div className="flex items-center gap-2 text-amber-900 dark:text-amber-200 font-bold">
            <Lock className="w-4 h-4 shrink-0" />
            <span>للوصول إلى لوحة الإدارة وإحصائيات الزوار، أدخل كلمة سر المدير:</span>
          </div>
          <div className="flex gap-2 w-full sm:w-auto">
            <input
              type="password"
              value={inlinePassword}
              onChange={(e) => setInlinePassword(e.target.value)}
              placeholder="كلمة سر المدير"
              className="min-h-[44px] flex-1 sm:w-44 px-3 py-2 rounded-xl border border-amber-300 bg-white dark:bg-stone-900 text-stone-900 dark:text-white"
            />
            <button
              type="submit"
              className="min-h-[44px] px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold"
            >
              توثيق الدخول
            </button>
          </div>
        </form>
      )}

      {/* Mandatory First-Login Password Change Notice */}
      {mustChangePassword && adminToken && (
        <div className="p-4 rounded-2xl bg-red-50 dark:bg-red-950/40 border-2 border-red-300 dark:border-red-700 text-xs space-y-1 text-red-900 dark:text-red-200">
          <div className="font-bold flex items-center gap-2 text-sm">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>إجراء أمني إلزامي: يرجى تغيير كلمة السر الافتراضية الآن</span>
          </div>
          <p>
            كلمة السر الابتدائية صالحة للدخول الأول فقط. عيّن كلمة سر جديدة لا تقل عن 8 خانات ليتم تشفيرها (hash + salt) وإلغاء الكلمة الابتدائية نهائياً.
          </p>
        </div>
      )}

      {statusMsg && (
        <div
          className={`p-3.5 rounded-xl border text-xs flex items-center justify-between gap-2 ${
            statusMsg.ok
              ? 'bg-emerald-100 dark:bg-emerald-950 border-emerald-300 dark:border-emerald-700 text-emerald-900 dark:text-emerald-200'
              : 'bg-red-100 dark:bg-red-950 border-red-300 dark:border-red-700 text-red-900 dark:text-red-200'
          }`}
        >
          <span>{statusMsg.text}</span>
          <button
            type="button"
            onClick={() => setStatusMsg(null)}
            className="min-h-[36px] min-w-[36px] font-bold px-2"
          >
            ×
          </button>
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto border-b border-stone-200 dark:border-stone-800 pb-2">
        {visibleTabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`min-h-[44px] px-4 py-2 rounded-xl text-xs font-bold transition-colors whitespace-nowrap ${
              activeTab === tab.id
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300 hover:bg-stone-200 dark:hover:bg-stone-700'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab 1: Overview */}
      {activeTab === 'overview' && !isModeratorOnly && !mustChangePassword && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
            <div className="p-4 rounded-2xl bg-white dark:bg-[#132247] border border-stone-200 dark:border-sky-300/15 shadow-sm">
              <span className="text-stone-400 text-[11px] font-semibold block">الزوار النشطون الآن</span>
              <span className="text-2xl font-black text-emerald-600 font-mono">
                {stats?.activeVisitorsNow ?? 0}
              </span>
              <span className="text-[10px] text-stone-400 block mt-0.5">
                اليوم: {stats?.todayVisitors ?? 0} · الإجمالي: {stats?.totalVisitors ?? 0}
              </span>
            </div>

            <div className="p-4 rounded-2xl bg-white dark:bg-[#132247] border border-stone-200 dark:border-sky-300/15 shadow-sm">
              <span className="text-stone-400 text-[11px] font-semibold block">المشرفون النشطون</span>
              <span className="text-2xl font-black text-stone-900 dark:text-white font-mono">
                {stats?.activeModerators ?? 0}
              </span>
              <span className="text-[10px] text-stone-400 block mt-0.5">
                كلمات ممنوعة: {stats?.bannedWordsCount ?? 0}
              </span>
            </div>

            <div className="p-4 rounded-2xl bg-white dark:bg-[#132247] border border-stone-200 dark:border-sky-300/15 shadow-sm">
              <span className="text-stone-400 text-[11px] font-semibold block">قراءات المكتبة</span>
              <span className="text-2xl font-black text-amber-600 font-mono">
                {stats?.totalReads?.toLocaleString() || '0'}
              </span>
              <span className="text-[10px] text-stone-400 block mt-0.5">قراءة محمية بعلامة مائية</span>
            </div>

            <div className="p-4 rounded-2xl bg-white dark:bg-[#132247] border border-stone-200 dark:border-sky-300/15 shadow-sm">
              <span className="text-stone-400 text-[11px] font-semibold block">المشاركات والمسابقات</span>
              <span className="text-2xl font-black text-stone-900 dark:text-white font-mono">
                {stats?.totalSubmissions ?? 0}
              </span>
              <span className="text-[10px] text-stone-400 block mt-0.5">بنك الأسئلة: {questionsList.length}</span>
            </div>
          </div>

          <div className="p-5 rounded-2xl bg-white dark:bg-[#132247] border border-stone-200 dark:border-sky-300/15 shadow-sm space-y-2">
            <h3 className="font-bold text-xs text-stone-800 dark:text-stone-200">
              حالة النظام والأمان والبنية التحتية:
            </h3>
            <div className="text-xs text-stone-600 dark:text-stone-300 leading-relaxed">
              {stats?.systemStatus || 'يعمل النظام بكفاءة عالية مع تشفير كلمات السر (scrypt + salt) وحماية PWA.'}
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Visitor Analytics */}
      {activeTab === 'visitors' && !isModeratorOnly && !mustChangePassword && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            <div className="p-4 rounded-2xl bg-white dark:bg-[#132247] border border-stone-200 dark:border-sky-300/15 shadow-sm">
              <div className="flex items-center justify-between text-stone-400 text-xs">
                <span>زوار اليوم</span>
                <Eye className="w-4 h-4 text-emerald-500" />
              </div>
              <div className="text-2xl font-black text-stone-900 dark:text-white font-mono mt-1">
                {visitorAnalytics?.todayCount ?? 0}
              </div>
              <span className="text-[10px] text-stone-400">بتوقيت مسقط</span>
            </div>

            <div className="p-4 rounded-2xl bg-white dark:bg-[#132247] border border-stone-200 dark:border-sky-300/15 shadow-sm">
              <div className="flex items-center justify-between text-stone-400 text-xs">
                <span>زوار الأسبوع</span>
                <Users className="w-4 h-4 text-cyan-500" />
              </div>
              <div className="text-2xl font-black text-stone-900 dark:text-white font-mono mt-1">
                {visitorAnalytics?.weekCount ?? 0}
              </div>
              <span className="text-[10px] text-stone-400">آخر 7 أيام</span>
            </div>

            <div className="p-4 rounded-2xl bg-white dark:bg-[#132247] border border-stone-200 dark:border-sky-300/15 shadow-sm">
              <div className="flex items-center justify-between text-stone-400 text-xs">
                <span>إجمالي الزوار</span>
                <Activity className="w-4 h-4 text-amber-500" />
              </div>
              <div className="text-2xl font-black text-stone-900 dark:text-white font-mono mt-1">
                {visitorAnalytics?.totalCount ?? 0}
              </div>
              <span className="text-[10px] text-stone-400">الأجهزة الفريدة المسجلة</span>
            </div>

            <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 shadow-sm">
              <div className="flex items-center justify-between text-emerald-700 dark:text-emerald-300 text-xs font-bold">
                <span>الزوار النشطون الآن</span>
                <Activity className="w-4 h-4 text-emerald-500" />
              </div>
              <div className="text-2xl font-black text-emerald-700 dark:text-emerald-300 font-mono mt-1">
                {visitorAnalytics?.activeNowCount ?? 0}
              </div>
              <span className="text-[10px] text-emerald-600 dark:text-emerald-400">نشط خلال آخر 5 دقائق</span>
            </div>
          </div>

          {/* 7-Day Simple Bar Chart */}
          <div className="bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-800 p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-sm text-stone-900 dark:text-white">
                مخطط الزوار خلال آخر 7 أيام
              </h3>
              <button
                type="button"
                onClick={fetchAdminData}
                className="min-h-[38px] px-3 rounded-lg bg-stone-100 dark:bg-stone-800 text-xs font-bold text-stone-600 dark:text-stone-300 hover:bg-stone-200"
              >
                تحديث
              </button>
            </div>

            <div className="grid grid-cols-7 gap-2 items-end h-44 pt-4 border-b border-stone-100 dark:border-stone-800 pb-2">
              {(visitorAnalytics?.last7Days || []).map((day) => {
                const heightPct = Math.max(8, Math.round((day.count / max7DayCount) * 100));
                return (
                  <div key={day.dateKey} className="flex flex-col items-center justify-end h-full gap-1.5">
                    <span className="text-[11px] font-mono font-bold text-emerald-700 dark:text-emerald-400">
                      {day.count}
                    </span>
                    <div className="w-full max-w-[40px] flex-1 flex items-end justify-center">
                      <div
                        style={{ height: `${day.count === 0 ? 6 : heightPct}%` }}
                        className={`w-full rounded-t-xl transition-all duration-500 ${
                          day.count > 0
                            ? 'bg-emerald-600 dark:bg-emerald-500'
                            : 'bg-stone-200 dark:bg-stone-800'
                        }`}
                        title={`${day.labelAr}: ${day.count} زائر`}
                      />
                    </div>
                    <span className="text-[10px] text-stone-500 text-center truncate w-full">
                      {day.labelAr}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Recent Visitors List */}
          <div className="bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-800 p-5 shadow-sm space-y-3">
            <h3 className="font-bold text-sm text-stone-900 dark:text-white">
              قائمة بآخر الزوار ({visitorAnalytics?.recentVisitors?.length || 0})
            </h3>
            {!visitorAnalytics?.recentVisitors?.length ? (
              <div className="text-xs text-stone-400 py-6 text-center">
                لم تُسجّل زيارات بعد.
              </div>
            ) : (
              <div className="divide-y divide-stone-100 dark:divide-stone-800 text-xs">
                {visitorAnalytics.recentVisitors.map((v, idx) => (
                  <div
                    key={`${v.anonLabel}-${idx}`}
                    className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-stone-100 dark:bg-stone-800 flex items-center justify-center text-emerald-600 shrink-0">
                        {v.deviceType === 'هاتف' ? (
                          <Smartphone className="w-4 h-4" />
                        ) : v.deviceType === 'جهاز لوحي' ? (
                          <Tablet className="w-4 h-4" />
                        ) : (
                          <Monitor className="w-4 h-4" />
                        )}
                      </div>
                      <div>
                        <div className="font-bold text-stone-900 dark:text-white flex items-center gap-2">
                          <span className="font-mono">{v.anonLabel}</span>
                          <span className="px-2 py-0.5 rounded bg-stone-100 dark:bg-stone-800 text-[10px] font-semibold">
                            {v.deviceType}
                          </span>
                          {v.isActiveNow && (
                            <span className="px-2 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 text-[10px] font-bold">
                              نشط الآن
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-stone-400 mt-0.5">
                          {v.browserLabel} · الصفحة: {v.lastPage} · الزيارات: {v.visitCount}
                        </div>
                      </div>
                    </div>

                    <div className="text-[11px] text-stone-400 font-mono">
                      آخر دخول: {new Date(v.lastSeenAt).toLocaleString('ar-OM')}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab 3: Moderators, Banned Words & Moderation Action Log */}
      {activeTab === 'moderation' && !mustChangePassword && (
        <div className="space-y-6 text-xs">
          {/* Admin-only sections: Moderators CRUD + Banned Words */}
          {!isModeratorOnly && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Add & Manage Moderators */}
              <div className="bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-800 p-5 shadow-sm space-y-4">
                <h2 className="text-sm font-bold text-stone-900 dark:text-white flex items-center gap-2">
                  <UserPlus className="w-4 h-4 text-emerald-600" />
                  <span>إدارة المشرفين (المدير فقط)</span>
                </h2>

                <form onSubmit={handleAddModerator} className="space-y-2.5">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <input
                      type="text"
                      required
                      value={newModName}
                      onChange={(e) => setNewModName(e.target.value)}
                      placeholder="الاسم الظاهر (مثال: خالد العامري)"
                      className="min-h-[44px] px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800"
                    />
                    <input
                      type="text"
                      required
                      value={newModUsername}
                      onChange={(e) => setNewModUsername(e.target.value)}
                      placeholder="اسم المستخدم (إنجليزي: khalid_mod)"
                      className="min-h-[44px] px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800"
                    />
                  </div>
                  <div className="flex flex-col sm:flex-row gap-2">
                    <input
                      type="password"
                      required
                      minLength={8}
                      value={newModPassword}
                      onChange={(e) => setNewModPassword(e.target.value)}
                      placeholder="كلمة سر المشرف (8 خانات فأكثر)"
                      className="min-h-[44px] flex-1 px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800"
                    />
                    <button
                      type="submit"
                      className="min-h-[44px] px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold flex items-center justify-center gap-1.5"
                    >
                      <Plus className="w-4 h-4" />
                      <span>إضافة مشرف</span>
                    </button>
                  </div>
                </form>

                <div className="divide-y divide-stone-100 dark:divide-stone-800 pt-2">
                  {moderators.length === 0 ? (
                    <div className="py-4 text-center text-stone-400">
                      لا يوجد مشرفون مضافون حالياً.
                    </div>
                  ) : (
                    moderators.map((mod) => (
                      <div key={mod.id} className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div>
                          <div className="font-bold text-stone-900 dark:text-white flex items-center gap-2">
                            <span>{mod.displayName}</span>
                            <span
                              className={`text-[10px] px-2 py-0.5 rounded font-bold ${
                                mod.isPaused
                                  ? 'bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300'
                                  : 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300'
                              }`}
                            >
                              {mod.isPaused ? 'موقوف مؤقتاً' : 'نشط'}
                            </span>
                          </div>
                          <div className="text-[11px] text-stone-400 font-mono">@{mod.username}</div>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleTogglePauseModerator(mod.id, !mod.isPaused)}
                            className={`min-h-[40px] px-3 rounded-xl font-bold flex items-center gap-1 ${
                              mod.isPaused
                                ? 'bg-emerald-600 text-white'
                                : 'bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300'
                            }`}
                          >
                            {mod.isPaused ? (
                              <>
                                <PlayCircle className="w-4 h-4" />
                                <span>تفعيل</span>
                              </>
                            ) : (
                              <>
                                <PauseCircle className="w-4 h-4" />
                                <span>إيقاف مؤقت</span>
                              </>
                            )}
                          </button>

                          {confirmDeleteModId === mod.id ? (
                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() => handleDeleteModerator(mod.id)}
                                className="min-h-[40px] px-3 rounded-xl bg-red-600 text-white font-bold"
                              >
                                تأكيد الحذف
                              </button>
                              <button
                                type="button"
                                onClick={() => setConfirmDeleteModId(null)}
                                className="min-h-[40px] px-2.5 rounded-xl bg-stone-200 dark:bg-stone-800 font-bold"
                              >
                                إلغاء
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => setConfirmDeleteModId(mod.id)}
                              className="min-h-[40px] px-3 rounded-xl bg-red-50 dark:bg-red-950/50 text-red-600 dark:text-red-400 font-bold flex items-center gap-1"
                            >
                              <Trash2 className="w-4 h-4" />
                              <span>حذف</span>
                            </button>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Editable Banned Words List */}
              <div className="bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-800 p-5 shadow-sm space-y-4">
                <h2 className="text-sm font-bold text-stone-900 dark:text-white flex items-center gap-2">
                  <Filter className="w-4 h-4 text-amber-500" />
                  <span>قائمة الكلمات الممنوعة (حجب تلقائي بـ ***)</span>
                </h2>
                <p className="text-stone-500">
                  أي كلمة مدرجة هنا تُستبدل تلقائياً بالرمز <strong>***</strong> في منشورات المجتمع والدردشة قبل النشر.
                </p>

                <form onSubmit={handleAddBannedWord} className="flex gap-2">
                  <input
                    type="text"
                    value={newBannedWord}
                    onChange={(e) => setNewBannedWord(e.target.value)}
                    placeholder="أضف كلمة ممنوعة..."
                    className="min-h-[44px] flex-1 px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800"
                  />
                  <button
                    type="submit"
                    className="min-h-[44px] px-4 py-2 rounded-xl bg-stone-900 dark:bg-emerald-700 text-white font-bold"
                  >
                    إضافة كلمة
                  </button>
                </form>

                <div className="flex flex-wrap gap-2 pt-2">
                  {bannedWords.length === 0 ? (
                    <span className="text-stone-400">القائمة فارغة حالياً.</span>
                  ) : (
                    bannedWords.map((word) => (
                      <span
                        key={word}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-red-800 dark:text-red-300 font-bold"
                      >
                        <span>{word}</span>
                        <button
                          type="button"
                          onClick={() => handleSaveBannedWords(bannedWords.filter((w) => w !== word))}
                          className="w-5 h-5 rounded-full hover:bg-red-200 dark:hover:bg-red-900 flex items-center justify-center text-xs"
                          title="إزالة الكلمة"
                        >
                          ×
                        </button>
                      </span>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Moderation Action Log (Visible to Admin & Active Moderators) */}
          <div className="bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-800 p-5 shadow-sm space-y-3">
            <h2 className="text-sm font-bold text-stone-900 dark:text-white flex items-center gap-2">
              <ClipboardList className="w-4 h-4 text-emerald-600" />
              <span>سجل الإجراءات الرقابية (من حذف ماذا ومتى)</span>
            </h2>
            {moderationLogs.length === 0 ? (
              <div className="py-6 text-center text-stone-400">
                لا توجد إجراءات حذف أو تعديل مسجلة حتى الآن.
              </div>
            ) : (
              <div className="divide-y divide-stone-100 dark:divide-stone-800">
                {moderationLogs.map((log) => (
                  <div
                    key={log.id}
                    className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                  >
                    <div>
                      <div className="font-bold text-stone-900 dark:text-white flex flex-wrap items-center gap-2">
                        <span>{log.actionType}</span>
                        <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300">
                          {log.actorName} ({log.actorRole === 'admin' ? 'مدير' : 'مشرف'})
                        </span>
                      </div>
                      <div className="text-[11px] text-stone-500 mt-0.5 break-words">
                        {log.targetType}: {log.targetPreview}
                      </div>
                    </div>
                    <div className="text-[10px] text-stone-400 font-mono shrink-0">
                      {new Date(log.timestamp).toLocaleString('ar-OM')}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab 4: Change Admin Password (scrypt + salt, min 8 chars) */}
      {activeTab === 'security' && !isModeratorOnly && (
        <form
          onSubmit={handleChangePassword}
          className="bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-800 p-5 sm:p-6 shadow-sm space-y-4 max-w-lg text-xs"
        >
          <h2 className="text-base font-bold text-stone-900 dark:text-white flex items-center gap-2">
            <KeyRound className="w-5 h-5 text-amber-500" />
            <span>تغيير كلمة سر المدير</span>
          </h2>
          <p className="text-stone-500 leading-relaxed">
            تُحفظ كلمة السر مشفّرةً بخوارزمية <strong className="font-mono">scrypt + random salt</strong> في قاعدة البيانات ولا تُخزن كنص صريح إطلاقاً. تُحظر المحاولات مؤقتاً بعد 5 إدخالات خاطئة.
          </p>

          <div>
            <label className="block font-bold mb-1">كلمة السر الحالية:</label>
            <input
              type="password"
              required
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              placeholder="أدخل كلمة السر الحالية"
              autoComplete="current-password"
              className="min-h-[44px] w-full px-3 py-2.5 rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800"
            />
          </div>

          <div>
            <label className="block font-bold mb-1">كلمة السر الجديدة (8 خانات على الأقل):</label>
            <input
              type="password"
              required
              minLength={8}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="أدخل كلمة سر قوية (8 خانات فأكثر)"
              autoComplete="new-password"
              className="min-h-[44px] w-full px-3 py-2.5 rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800"
            />
            {newPassword.length > 0 && newPassword.length < 8 && (
              <span className="text-[11px] text-red-500 mt-1 block">
                متبقي {8 - newPassword.length} خانات على الأقل للوصول للحد الأدنى.
              </span>
            )}
          </div>

          <div>
            <label className="block font-bold mb-1">تأكيد كلمة السر الجديدة:</label>
            <input
              type="password"
              required
              minLength={8}
              value={confirmNewPassword}
              onChange={(e) => setConfirmNewPassword(e.target.value)}
              placeholder="أعد كتابة كلمة السر الجديدة"
              autoComplete="new-password"
              className="min-h-[44px] w-full px-3 py-2.5 rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800"
            />
          </div>

          <button
            type="submit"
            className="min-h-[44px] w-full sm:w-auto px-6 py-2.5 rounded-xl bg-stone-900 dark:bg-emerald-700 hover:bg-stone-800 text-white font-bold"
          >
            تحديث وحفظ كلمة السر المشفرة
          </button>
        </form>
      )}

      {/* Tab 5: Dynamic Islamic Seasonal & Oman Hijri Calendar Management */}
      {activeTab === 'seasonal' && !isModeratorOnly && !mustChangePassword && (
        <div className="space-y-6">
          <div className="bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-800 p-6 shadow-sm space-y-5 text-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-stone-100 dark:border-stone-800 pb-4">
              <div>
                <h2 className="text-base font-bold text-stone-900 dark:text-white flex items-center gap-2">
                  <MoonStar className="w-5 h-5 text-amber-500" />
                  <span>نظام المناسبات الإسلامية والهوية الموسمية التلقائية (سلطنة عُمان)</span>
                </h2>
                <p className="text-stone-500 mt-1">
                  الحالة الفعالة الآن: <strong className="text-emerald-600">{liveHijri.formattedAr}</strong> · المناسبة: <strong>{liveHijri.occasionTitleAr}</strong>
                </p>
              </div>
              {seasonForm.simulatedDateIso && (
                <button
                  onClick={() => handleSaveSeasonalConfig({ ...seasonForm, simulatedDateIso: null, overrideOccasion: 'auto' })}
                  className="min-h-[44px] px-3 py-1.5 rounded-xl bg-amber-500 text-stone-950 font-bold flex items-center gap-1.5"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>العودة للتاريخ الحقيقي الآن</span>
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block font-bold mb-1">التقويم الهجري المرجعي:</label>
                <select
                  value={seasonForm.referenceCalendar}
                  onChange={(e) => setSeasonForm({ ...seasonForm, referenceCalendar: e.target.value as any })}
                  className="min-h-[44px] w-full p-2.5 rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800"
                >
                  <option value="oman-official">التقويم الرسمي لسلطنة عُمان (أم القرى + إزاحة الهلال)</option>
                  <option value="islamic-umalqura">تقويم أم القرى (الفلكي)</option>
                  <option value="islamic-civil">التقويم الهجري المدني</option>
                </select>
              </div>

              <div>
                <label className="block font-bold mb-1">تعديل إزاحة استطلاع الهلال العُماني (بالأيام):</label>
                <select
                  value={seasonForm.hijriOffsetDays}
                  onChange={(e) => setSeasonForm({ ...seasonForm, hijriOffsetDays: Number(e.target.value) })}
                  className="min-h-[44px] w-full p-2.5 rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 font-bold"
                >
                  {[-3, -2, -1, 0, 1, 2, 3].map((d) => (
                    <option key={d} value={d}>
                      {d === 0 ? '0 يوم (مطابق للتقويم)' : d > 0 ? `+${d} يوم (تقديم)` : `${d} يوم (تأخير يوم عن الرؤية)`}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold mb-1">وضع التفعيل:</label>
                <select
                  value={seasonForm.overrideOccasion}
                  onChange={(e) => setSeasonForm({ ...seasonForm, overrideOccasion: e.target.value as any })}
                  className="min-h-[44px] w-full p-2.5 rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 font-bold"
                >
                  <option value="auto">تلقائي ذكي حسب التاريخ الهجري (الموصى به)</option>
                  <option value="ramadan">فرض هوية رمضان مؤقتاً</option>
                  <option value="eid_fitr">فرض هوية عيد الفطر مؤقتاً</option>
                  <option value="eid_adha">فرض هوية عيد الأضحى مؤقتاً</option>
                  <option value="normal">فرض الأيام العادية</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3">
              <div>
                <label className="block font-bold mb-1">عبارة تهنئة رمضان:</label>
                <input
                  type="text"
                  value={seasonForm.ramadanGreeting}
                  onChange={(e) => setSeasonForm({ ...seasonForm, ramadanGreeting: e.target.value })}
                  className="min-h-[44px] w-full p-2.5 rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800"
                />
              </div>
              <div>
                <label className="block font-bold mb-1">عبارة تهنئة عيد الفطر:</label>
                <input
                  type="text"
                  value={seasonForm.eidFitrGreeting}
                  onChange={(e) => setSeasonForm({ ...seasonForm, eidFitrGreeting: e.target.value })}
                  className="min-h-[44px] w-full p-2.5 rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800"
                />
              </div>
              <div>
                <label className="block font-bold mb-1">عبارة تهنئة عيد الأضحى:</label>
                <input
                  type="text"
                  value={seasonForm.eidAdhaGreeting}
                  onChange={(e) => setSeasonForm({ ...seasonForm, eidAdhaGreeting: e.target.value })}
                  className="min-h-[44px] w-full p-2.5 rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800"
                />
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-4">
              <label className="flex items-center gap-2 font-bold cursor-pointer min-h-[44px]">
                <input
                  type="checkbox"
                  checked={seasonForm.enableLanterns}
                  onChange={(e) => setSeasonForm({ ...seasonForm, enableLanterns: e.target.checked })}
                />
                <span>إظهار الفوانيس والهلال المضيء في البطاقة الموسمية</span>
              </label>

              <label className="flex items-center gap-2 font-bold cursor-pointer min-h-[44px]">
                <input
                  type="checkbox"
                  checked={seasonForm.enablePatterns}
                  onChange={(e) => setSeasonForm({ ...seasonForm, enablePatterns: e.target.checked })}
                />
                <span>تفعيل الزخارف الإسلامية الهندسية الخفيفة</span>
              </label>
            </div>

            <button
              onClick={() => handleSaveSeasonalConfig(seasonForm)}
              className="min-h-[44px] px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold shadow-sm"
            >
              حفظ وتطبيق إعدادات الهوية الموسمية
            </button>
          </div>

          <div className="bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-800 p-6 shadow-sm space-y-4 text-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="font-bold text-sm text-stone-900 dark:text-white">
                  مُختبِر التحقق الآلي للانتقال التلقائي بين المواسم (8 سيناريوهات هجرية)
                </h3>
              </div>
              <button
                onClick={handleRunSeasonalTests}
                className="min-h-[44px] px-4 py-2 rounded-xl bg-stone-900 dark:bg-emerald-700 text-white font-bold flex items-center gap-1.5 shrink-0"
              >
                <Play className="w-3.5 h-3.5" />
                <span>تشغيل الاختبار الآلي للـ 8 حالات</span>
              </button>
            </div>

            {testResults.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {testResults.map((r) => (
                  <div
                    key={r.id}
                    className={`p-3 rounded-xl border flex items-center justify-between ${
                      r.passed
                        ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800'
                        : 'bg-red-50 border-red-200'
                    }`}
                  >
                    <div>
                      <div className="font-bold text-stone-900 dark:text-white">{r.labelAr}</div>
                      <div className="text-[11px] text-stone-500">
                        {r.hijriAr} · النتيجة: <strong className="font-mono">{r.actual}</strong>
                      </div>
                    </div>
                    <span className="font-bold text-emerald-700 dark:text-emerald-300 flex items-center gap-1">
                      <CheckCircle2 className="w-4 h-4" />
                      {r.passed ? 'نجح' : 'فشل'}
                    </span>
                  </div>
                ))}
              </div>
            )}

            <div className="flex flex-wrap gap-2 pt-2">
              {scenarios.map((sc) => (
                <button
                  key={sc.id}
                  onClick={() =>
                    handleSaveSeasonalConfig({
                      ...seasonForm,
                      overrideOccasion: 'auto',
                      simulatedDateIso: sc.simulatedIso,
                    })
                  }
                  className="min-h-[40px] px-3 py-1.5 rounded-xl bg-stone-100 dark:bg-stone-800 hover:bg-emerald-600 hover:text-white font-semibold transition-colors"
                >
                  {sc.labelAr}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Tab 7: Broadcast alerts */}
      {activeTab === 'broadcast' && !isModeratorOnly && !mustChangePassword && (
        <form onSubmit={handleBroadcastAlert} className="bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-800 p-6 shadow-sm space-y-4">
          <h2 className="text-base font-bold text-stone-900 dark:text-white">
            بث تنبيه زراعي أو مناخي رسمي للمزارعين
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block font-semibold mb-1">عنوان التنبيه:</label>
              <input
                type="text"
                required
                value={alertTitle}
                onChange={(e) => setAlertTitle(e.target.value)}
                placeholder="مثال: تنبيه أمطار غزيرة ورياح هابطة على جبال الحجر"
                className="min-h-[44px] w-full p-2.5 rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-stone-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block font-semibold mb-1">نوع الإشعار:</label>
              <select
                value={alertType}
                onChange={(e: any) => setAlertType(e.target.value)}
                className="min-h-[44px] w-full p-2.5 rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-stone-900 dark:text-white"
              >
                <option value="weather">تنبيه طقس ومناخ (أمطار/رياح/حرارة)</option>
                <option value="crop_advice">إرشاد زراعي عاجل (نخيل/خضار)</option>
                <option value="ramadan">إشعار رمضاني وتغذوي</option>
                <option value="system">إعلان عام من الإدارة</option>
              </select>
            </div>
          </div>

          <div className="text-xs">
            <label className="block font-semibold mb-1">المحافظة المستهدفة:</label>
            <input
              type="text"
              value={alertTargetGov}
              onChange={(e) => setAlertTargetGov(e.target.value)}
              className="min-h-[44px] w-full p-2.5 rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-stone-900 dark:text-white"
            />
          </div>

          <div className="text-xs">
            <label className="block font-semibold mb-1">نص وتفاصيل التنبيه الموجه للمزارعين:</label>
            <textarea
              rows={3}
              required
              value={alertMessage}
              onChange={(e) => setAlertMessage(e.target.value)}
              placeholder="اكتب التوجيهات الميدانية بدقة..."
              className="w-full p-2.5 rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-stone-900 dark:text-white"
            />
          </div>

          <button
            type="submit"
            disabled={broadcastLoading}
            className="min-h-[44px] px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md flex items-center gap-2"
          >
            <Send className="w-4 h-4" />
            <span>{broadcastLoading ? 'جاري البث الفوري...' : 'إرسال وبث التنبيه الآن'}</span>
          </button>
        </form>
      )}

      {/* Tab 8: Questions Management */}
      {activeTab === 'questions' && !isModeratorOnly && !mustChangePassword && (
        <div className="space-y-6">
          <form onSubmit={handleCreateQuestion} className="bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-800 p-6 shadow-sm space-y-4">
            <h2 className="text-base font-bold text-stone-900 dark:text-white">
              إضافة سؤال جديد لبنك الألعاب والمسابقات
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div>
                <label className="block font-semibold mb-1">اللعبة المستهدفة:</label>
                <select
                  value={newQType}
                  onChange={(e) => setNewQType(e.target.value)}
                  className="min-h-[44px] w-full p-2.5 rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-stone-900 dark:text-white"
                >
                  <option value="knowledge">1. تحدي المعرفة الزراعية</option>
                  <option value="guess_crop">2. اكتشف المحصول</option>
                  <option value="plant_doctor">3. الطبيب الزراعي</option>
                  <option value="true_false">4. صح أم خطأ</option>
                  <option value="speed">5. تحدي السرعة</option>
                  <option value="cultural">6. المسابقة الثقافية عن عُمان</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold mb-1">رقم الإجابة الصحيحة:</label>
                <select
                  value={correctIdx}
                  onChange={(e) => setCorrectIdx(Number(e.target.value))}
                  className="min-h-[44px] w-full p-2.5 rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-stone-900 dark:text-white font-bold"
                >
                  <option value={0}>الخيار الأول هو الصحيح</option>
                  <option value={1}>الخيار الثاني هو الصحيح</option>
                  <option value={2}>الخيار الثالث هو الصحيح</option>
                  <option value={3}>الخيار الرابع هو الصحيح</option>
                </select>
              </div>
            </div>

            <div className="text-xs">
              <label className="block font-semibold mb-1">نص السؤال:</label>
              <input
                type="text"
                required
                value={newQuestionText}
                onChange={(e) => setNewQuestionText(e.target.value)}
                className="min-h-[44px] w-full p-2.5 rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-stone-900 dark:text-white"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <input type="text" required value={opt0} onChange={(e) => setOpt0(e.target.value)} placeholder="الخيار 1" className="min-h-[44px] p-2.5 rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800" />
              <input type="text" required value={opt1} onChange={(e) => setOpt1(e.target.value)} placeholder="الخيار 2" className="min-h-[44px] p-2.5 rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800" />
              <input type="text" value={opt2} onChange={(e) => setOpt2(e.target.value)} placeholder="الخيار 3 (اختياري)" className="min-h-[44px] p-2.5 rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800" />
              <input type="text" value={opt3} onChange={(e) => setOpt3(e.target.value)} placeholder="الخيار 4 (اختياري)" className="min-h-[44px] p-2.5 rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800" />
            </div>

            <textarea
              rows={2}
              value={explanation}
              onChange={(e) => setExplanation(e.target.value)}
              placeholder="شرح وتوضيح الإجابة الصحيحة..."
              className="w-full p-2.5 rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-xs"
            />

            <button
              type="submit"
              className="min-h-[44px] px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              <span>إضافة السؤال وتعميمه في اللعبة</span>
            </button>
          </form>

          <div className="bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-800 p-5 shadow-sm space-y-3">
            <h3 className="font-bold text-xs text-stone-800 dark:text-stone-200">
              قائمة الأسئلة الحالية ({questionsList.length} سؤال):
            </h3>
            <div className="space-y-2 max-h-96 overflow-y-auto divide-y divide-stone-100 dark:divide-stone-800">
              {questionsList.map((q, idx) => (
                <div key={q.id || idx} className="pt-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-stone-900 dark:text-white">
                      {idx + 1}. {q.question}
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-stone-100 dark:bg-stone-800 text-stone-500">
                      {q.gameType}
                    </span>
                  </div>
                  <div className="text-[11px] text-emerald-600 dark:text-emerald-400 mt-1">
                    الإجابة الصحيحة: {q.options[q.correctIndex]}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Tab: Farmer Support Tickets */}
      {activeTab === 'support' && !mustChangePassword && (
        <div className="bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-800 p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-base font-bold text-stone-900 dark:text-white flex items-center gap-2">
              <ClipboardList className="w-4 h-4 text-emerald-600" />
              <span>مقترحات واستفسارات المزارعين ({supportTickets.length})</span>
            </h2>
          </div>

          {supportTickets.length === 0 ? (
            <div className="p-8 text-center text-xs text-stone-500">
              لا توجد رسائل أو مقترحات واردة من المزارعين حتى الآن.
            </div>
          ) : (
            <div className="space-y-3 text-xs">
              {supportTickets.map((t) => (
                <div
                  key={t.id}
                  className="p-4 rounded-2xl border border-stone-200 dark:border-stone-800 bg-stone-50/70 dark:bg-stone-800/40 space-y-2"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="font-bold text-stone-900 dark:text-white flex items-center gap-2">
                      <span>{t.senderName}</span>
                      <span className="text-[11px] font-normal text-stone-500">({t.contact})</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[10px] text-stone-400">
                        {new Date(t.createdAt).toLocaleString('ar-OM')}
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                          t.status === 'resolved'
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-300'
                            : t.status === 'in_progress'
                              ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-300'
                              : 'bg-sky-100 text-sky-800 dark:bg-sky-900/50 dark:text-sky-300'
                        }`}
                      >
                        {t.status === 'resolved' ? 'تم الحل' : t.status === 'in_progress' ? 'قيد المتابعة' : 'جديد'}
                      </span>
                    </div>
                  </div>
                  <p className="text-stone-700 dark:text-stone-300 leading-relaxed">{t.message}</p>
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    <button
                      type="button"
                      onClick={() => handleUpdateTicketStatus(t.id, 'in_progress')}
                      className="min-h-[36px] px-3 py-1 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-bold text-[11px]"
                    >
                      قيد المتابعة
                    </button>
                    <button
                      type="button"
                      onClick={() => handleUpdateTicketStatus(t.id, 'resolved')}
                      className="min-h-[36px] px-3 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px]"
                    >
                      تم الحل
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab 9: Audit Logs */}
      {activeTab === 'audit' && !mustChangePassword && (
        <div className="bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-800 p-6 shadow-sm space-y-4">
          <h2 className="text-base font-bold text-stone-900 dark:text-white flex items-center gap-2">
            <Activity className="w-4 h-4 text-emerald-600" />
            <span>سجل العمليات الحساسة وتدقيق الأمان (Audit Trail)</span>
          </h2>

          <div className="divide-y divide-stone-100 dark:divide-stone-800 text-xs">
            {auditLogs.map((log) => (
              <div key={log.id} className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <div className="font-bold text-stone-900 dark:text-white flex items-center gap-2">
                    <span>{log.action}</span>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-stone-100 dark:bg-stone-800 text-stone-500">
                      بواسطة: {log.performedBy}
                    </span>
                  </div>
                  <div className="text-[11px] text-stone-500 dark:text-stone-400 mt-0.5">
                    {log.details}
                  </div>
                </div>

                <div className="text-[10px] text-stone-400 font-mono self-end sm:self-auto">
                  {new Date(log.timestamp).toLocaleString('ar-OM')}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

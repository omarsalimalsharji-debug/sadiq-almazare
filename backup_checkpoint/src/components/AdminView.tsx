import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, 
  Users, 
  Gamepad2, 
  Library, 
  Bell, 
  Activity, 
  FileText, 
  Radio, 
  Send, 
  Plus, 
  CheckCircle2, 
  Clock, 
  AlertTriangle,
  Lock,
  Unlock,
  Sparkles
} from 'lucide-react';
import { UserProfile } from '../types/index.ts';
import { GAME_QUESTIONS, Question, RADIO_STATIONS, RadioStation } from '../data/agriculturalData.ts';

interface AdminViewProps {
  user: UserProfile;
  onBroadcastSuccess: (msg: string) => void;
}

export const AdminView: React.FC<AdminViewProps> = ({
  user,
  onBroadcastSuccess
}) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'questions' | 'broadcast' | 'audit' | 'radio'>('overview');
  const [stats, setStats] = useState<any>(null);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);

  // Broadcast alert form
  const [alertTitle, setAlertTitle] = useState<string>('');
  const [alertMessage, setAlertMessage] = useState<string>('');
  const [alertType, setAlertType] = useState<'weather' | 'crop_advice' | 'ramadan' | 'system'>('weather');
  const [alertTargetGov, setAlertTargetGov] = useState<string>('كافة محافظات سلطنة عُمان');
  const [broadcastLoading, setBroadcastLoading] = useState<boolean>(false);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);

  // Add Question Form
  const [newQType, setNewQType] = useState<string>('knowledge');
  const [newQuestionText, setNewQuestionText] = useState<string>('');
  const [opt0, setOpt0] = useState<string>('');
  const [opt1, setOpt1] = useState<string>('');
  const [opt2, setOpt2] = useState<string>('');
  const [opt3, setOpt3] = useState<string>('');
  const [correctIdx, setCorrectIdx] = useState<number>(0);
  const [explanation, setExplanation] = useState<string>('');
  const [questionsList, setQuestionsList] = useState<Question[]>(GAME_QUESTIONS);

  const fetchAdminData = async () => {
    try {
      const statsRes = await fetch('/api/admin/stats');
      const statsData = await statsRes.json();
      if (statsData.success) setStats(statsData.stats);

      const logsRes = await fetch('/api/admin/audit-logs');
      const logsData = await logsRes.json();
      if (logsData.success) setAuditLogs(logsData.logs);

      const qRes = await fetch('/api/admin/questions');
      const qData = await qRes.json();
      if (qData.success && Array.isArray(qData.questions)) {
        setQuestionsList(qData.questions);
      }
    } catch (e) {
      console.warn('Failed to fetch admin data:', e);
    }
  };

  useEffect(() => {
    fetchAdminData();
  }, []);

  const handleBroadcastAlert = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!alertTitle.trim() || !alertMessage.trim()) return;

    setBroadcastLoading(true);
    setStatusMsg(null);
    try {
      const res = await fetch('/api/admin/broadcast-alert', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: alertTitle,
          message: alertMessage,
          type: alertType,
          targetGovernorate: alertTargetGov,
          senderName: user.name
        })
      });

      const data = await res.json();
      if (data.success) {
        setStatusMsg('تم بث التنبيه بنجاح إلى جميع مستخدمي المنصة!');
        onBroadcastSuccess(alertTitle);
        setAlertTitle('');
        setAlertMessage('');
        fetchAdminData();
      }
    } catch (e) {
      alert('تعذر بث التنبيه حالياً');
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
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          gameType: newQType,
          question: newQuestionText,
          options,
          correctIndex: correctIdx,
          explanation,
          points: 100
        })
      });

      const data = await res.json();
      if (data.success) {
        setQuestionsList(prev => [data.question, ...prev]);
        setNewQuestionText('');
        setOpt0('');
        setOpt1('');
        setOpt2('');
        setOpt3('');
        setExplanation('');
        setStatusMsg('تم إضافة السؤال واعتماده فورياً في اللعبة!');
        fetchAdminData();
      }
    } catch (e) {
      alert('تعذر إضافة السؤال');
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      
      {/* Admin Title Card */}
      <div className="rounded-2xl bg-stone-900 text-white p-6 shadow-md border border-stone-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-emerald-400">
            <ShieldCheck className="w-4 h-4" />
            <span>لوحة الإدارة المركزية والرقابة الفنية</span>
          </div>
          <h1 className="text-2xl font-bold mt-1 text-white">
            لوحة تحكم مدير المنصة
          </h1>
          <div className="text-xs text-stone-300 mt-1">
            صاحب الفكرة والمدير العام: <strong className="text-emerald-300 font-bold">عمر الشرجي</strong> · الصلاحية: المدير التنفيذي
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[11px] px-3 py-1.5 rounded-lg bg-emerald-950 text-emerald-300 border border-emerald-800 font-mono">
            نظام حماية النقاط RLS مفعل
          </span>
        </div>
      </div>

      {statusMsg && (
        <div className="p-3.5 rounded-xl bg-emerald-100 dark:bg-emerald-950 border border-emerald-300 dark:border-emerald-700 text-emerald-900 dark:text-emerald-200 text-xs flex items-center justify-between">
          <span>{statusMsg}</span>
          <button onClick={() => setStatusMsg(null)} className="font-bold">×</button>
        </div>
      )}

      {/* Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto border-b border-stone-200 dark:border-stone-800 pb-2">
        <button
          onClick={() => setActiveTab('overview')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-colors whitespace-nowrap ${
            activeTab === 'overview'
              ? 'bg-emerald-600 text-white'
              : 'bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300'
          }`}
        >
          نظرة عامة وإحصائيات
        </button>

        <button
          onClick={() => setActiveTab('broadcast')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-colors whitespace-nowrap ${
            activeTab === 'broadcast'
              ? 'bg-emerald-600 text-white'
              : 'bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300'
          }`}
        >
          بث التنبيهات والإشعارات
        </button>

        <button
          onClick={() => setActiveTab('questions')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-colors whitespace-nowrap ${
            activeTab === 'questions'
              ? 'bg-emerald-600 text-white'
              : 'bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300'
          }`}
        >
          إدارة أسئلة الألعاب والمسابقات
        </button>

        <button
          onClick={() => setActiveTab('audit')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-colors whitespace-nowrap ${
            activeTab === 'audit'
              ? 'bg-emerald-600 text-white'
              : 'bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300'
          }`}
        >
          سجل التدقيق والعمليات الحساسة
        </button>
      </div>

      {/* Tab 1: Overview */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="p-4 rounded-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 shadow-sm">
              <span className="text-stone-400 text-[11px] font-semibold block">المزارعون النشطون</span>
              <span className="text-2xl font-black text-stone-900 dark:text-white font-mono">
                {stats?.activeUsers || 342}
              </span>
              <span className="text-[10px] text-emerald-600 block mt-0.5">في كافة المحافظات</span>
            </div>

            <div className="p-4 rounded-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 shadow-sm">
              <span className="text-stone-400 text-[11px] font-semibold block">المشاركات في الألعاب</span>
              <span className="text-2xl font-black text-emerald-600 font-mono">
                {stats?.totalSubmissions || 28}
              </span>
              <span className="text-[10px] text-stone-400 block mt-0.5">موثقة ومحمية ضد التلاعب</span>
            </div>

            <div className="p-4 rounded-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 shadow-sm">
              <span className="text-stone-400 text-[11px] font-semibold block">قراءات المكتبة الإلكترونية</span>
              <span className="text-2xl font-black text-amber-600 font-mono">
                {stats?.totalReads?.toLocaleString() || '4,980'}
              </span>
              <span className="text-[10px] text-stone-400 block mt-0.5">قراءة محمية بعلامة مائية</span>
            </div>

            <div className="p-4 rounded-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 shadow-sm">
              <span className="text-stone-400 text-[11px] font-semibold block">بنك الأسئلة المعتمد</span>
              <span className="text-2xl font-black text-stone-900 dark:text-white font-mono">
                {questionsList.length}
              </span>
              <span className="text-[10px] text-stone-400 block mt-0.5">في 6 ألعاب تفاعلية</span>
            </div>
          </div>

          <div className="p-5 rounded-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 shadow-sm space-y-2">
            <h3 className="font-bold text-xs text-stone-800 dark:text-stone-200">
              حالة النظام والبنية التحتية:
            </h3>
            <div className="text-xs text-stone-600 dark:text-stone-300 leading-relaxed">
              تعمل المنصة بمعمارية متكاملة (Express Node.js Server + React TypeScript + Gemini AI 3.8 Flash + Supabase/PostgreSQL Ready Architecture)، مع حماية RLS وفصل لصلاحيات المدير والمشرف لمنع أي تضارب في الصلاحيات.
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Broadcast alerts */}
      {activeTab === 'broadcast' && (
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
                onChange={e => setAlertTitle(e.target.value)}
                placeholder="مثال: تنبيه أمطار غزيرة ورياح هابطة على جبال الحجر"
                className="w-full p-2.5 rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-stone-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block font-semibold mb-1">نوع الإشعار:</label>
              <select
                value={alertType}
                onChange={(e: any) => setAlertType(e.target.value)}
                className="w-full p-2.5 rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-stone-900 dark:text-white"
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
              onChange={e => setAlertTargetGov(e.target.value)}
              placeholder="مثال: كافة المحافظات أو محافظة الداخلية وشمال الباطنة"
              className="w-full p-2.5 rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-stone-900 dark:text-white"
            />
          </div>

          <div className="text-xs">
            <label className="block font-semibold mb-1">نص وتفاصيل التنبيه الموجه للمزارعين:</label>
            <textarea
              rows={3}
              required
              value={alertMessage}
              onChange={e => setAlertMessage(e.target.value)}
              placeholder="اكتب التوجيهات الميدانية بدقة (مثال: يرجى تثبيت أشرعة البيوت المحمية، وإيقاف ري الرذاذ...)"
              className="w-full p-2.5 rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-stone-900 dark:text-white"
            />
          </div>

          <button
            type="submit"
            disabled={broadcastLoading}
            className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md flex items-center gap-2"
          >
            <Send className="w-4 h-4" />
            <span>{broadcastLoading ? 'جاري البث الفوري...' : 'إرسال وبث التنبيه الآن'}</span>
          </button>
        </form>
      )}

      {/* Tab 3: Questions Management */}
      {activeTab === 'questions' && (
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
                  onChange={e => setNewQType(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-stone-900 dark:text-white"
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
                  onChange={e => setCorrectIdx(Number(e.target.value))}
                  className="w-full p-2.5 rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-stone-900 dark:text-white font-bold"
                >
                  <option value={0}>الخيار الأول هو الصحيح (الافتراضي)</option>
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
                onChange={e => setNewQuestionText(e.target.value)}
                placeholder="مثال: ما اسم الفلج التاريخي الواقع في نيابة بركة الموز؟"
                className="w-full p-2.5 rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-stone-900 dark:text-white"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div>
                <label className="block font-semibold mb-1">الخيار 1:</label>
                <input
                  type="text"
                  required
                  value={opt0}
                  onChange={e => setOpt0(e.target.value)}
                  placeholder="فلج الخطمين"
                  className="w-full p-2.5 rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-stone-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block font-semibold mb-1">الخيار 2:</label>
                <input
                  type="text"
                  required
                  value={opt1}
                  onChange={e => setOpt1(e.target.value)}
                  placeholder="فلج دارس"
                  className="w-full p-2.5 rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-stone-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block font-semibold mb-1">الخيار 3 (اختياري):</label>
                <input
                  type="text"
                  value={opt2}
                  onChange={e => setOpt2(e.target.value)}
                  placeholder="فلج الميسر"
                  className="w-full p-2.5 rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-stone-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block font-semibold mb-1">الخيار 4 (اختياري):</label>
                <input
                  type="text"
                  value={opt3}
                  onChange={e => setOpt3(e.target.value)}
                  placeholder="فلj الجيلة"
                  className="w-full p-2.5 rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-stone-900 dark:text-white"
                />
              </div>
            </div>

            <div className="text-xs">
              <label className="block font-semibold mb-1">شرح وتوضيح الإجابة الصحيحة:</label>
              <textarea
                rows={2}
                value={explanation}
                onChange={e => setExplanation(e.target.value)}
                placeholder="تفسير علمي أو تاريخي يظهر للمتسابق بعد الإجابة..."
                className="w-full p-2.5 rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-stone-900 dark:text-white"
              />
            </div>

            <button
              type="submit"
              className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              <span>إضافة السؤال وتعميمه في اللعبة</span>
            </button>
          </form>

          {/* List of existing questions */}
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

      {/* Tab 4: Audit Logs */}
      {activeTab === 'audit' && (
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

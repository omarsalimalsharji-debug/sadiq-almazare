import React, { useState, useEffect } from 'react';
import {
  Users,
  MessageSquare,
  Heart,
  Send,
  Trash2,
  ShieldCheck,
  AlertCircle,
  X,
  Bot,
  Sparkles,
  CheckCircle2,
  ShieldAlert,
  Loader2,
  Share2,
} from 'lucide-react';
import { UserProfile } from '../types/index.ts';

interface Comment {
  id: string;
  authorName: string;
  authorRole: string;
  comment: string;
  timestamp: number;
}

interface Post {
  id: string;
  authorName: string;
  authorRole: string;
  authorGovernorate: string;
  content: string;
  cropCategory: string;
  timestamp: number;
  likes: number;
  likedBy: string[];
  comments: Comment[];
}

interface CommunityViewProps {
  user: UserProfile;
}

type PendingDelete =
  | { kind: 'post'; postId: string; preview: string }
  | { kind: 'comment'; postId: string; commentId: string; preview: string };

interface AiChatMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  practicalSteps?: string[];
  safetyReminder?: string;
  suggestedFollowUps?: string[];
  timestamp: number;
}

const STARTER_AI_QUESTIONS = [
  'ما أفضل جدول لري النخيل في القيظ مع مياه الفلج؟',
  'كيف أواجه ملوحة التربة في مزارع الباطنة عضوياً؟',
  'متى وكيف أعالج سوسة النخيل الحمراء بأمان؟',
  'أفضل تسميد عضوي للرمان والليمون العُماني في الجبل الأخضر؟',
];

export const CommunityView: React.FC<CommunityViewProps> = ({ user }) => {
  const [activeTab, setActiveTab] = useState<'ai_chat' | 'forum'>('ai_chat');
  const [posts, setPosts] = useState<Post[]>([]);
  const [newContent, setNewContent] = useState<string>('');
  const [newCategory, setNewCategory] = useState<string>('نخيل التمر');
  const [commentInputs, setCommentInputs] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [feedback, setFeedback] = useState<{ ok: boolean; text: string } | null>(null);
  const [canModerate, setCanModerate] = useState<boolean>(false);
  const [pendingDelete, setPendingDelete] = useState<PendingDelete | null>(null);
  const [deleting, setDeleting] = useState<boolean>(false);

  // Live AI Agricultural Chat state
  const [aiCropFocus, setAiCropFocus] = useState<string>('نخيل التمر');
  const [aiInput, setAiInput] = useState<string>('');
  const [aiLoading, setAiLoading] = useState<boolean>(false);
  const [aiMessages, setAiMessages] = useState<AiChatMessage[]>([
    {
      id: 'ai-welcome',
      role: 'assistant',
      text: `مرحباً بك يا ${user.name} في الدردشة الزراعية الذكية لمزارعي سلطنة عُمان! أنا مستشارك الزراعي الميداني لمحافظة ${user.governorate}. اسألني عن الري، التسميد، مكافحة الآفات حسب القرار الوزاري 160/2023، أو إدارة البيوت المحمية.`,
      practicalSteps: [
        'اختر المحصول من القائمة أعلاه لتخصيص الإرشادات وفق مناخ محافظتك.',
        'اكتب سؤالك بالتفصيل أو اختر أحد الأسئلة السريعة الجاهزة.',
      ],
      safetyReminder:
        'توصياتنا متوافقة مع اشتراطات سلامة النحل وفترة التحريم والقرار الوزاري رقم 160/2023.',
      timestamp: Date.now(),
    },
  ]);

  const fetchPosts = async () => {
    try {
      const res = await fetch('/api/community/posts');
      const data = await res.json();
      if (data.success && Array.isArray(data.posts)) {
        setPosts(data.posts);
      }
    } catch (e) {
      console.warn('Failed to fetch posts:', e);
    }
  };

  // Verify staff session with the server before showing moderation controls
  useEffect(() => {
    fetchPosts();
    const token = localStorage.getItem('farmer_admin_token');
    if (!token) {
      setCanModerate(false);
      return;
    }
    fetch('/api/auth/me', {
      headers: { 'x-admin-token': token },
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        setCanModerate(Boolean(data?.success && (data.session?.role === 'admin' || data.session?.role === 'moderator')));
      })
      .catch(() => setCanModerate(false));
  }, [user.id, user.isAdmin, user.isModerator]);

  const handleCreatePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newContent.trim()) return;

    setIsSubmitting(true);
    setFeedback(null);
    try {
      const res = await fetch('/api/community/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          authorName: user.name,
          authorRole: user.role,
          authorGovernorate: user.governorate,
          cropCategory: newCategory,
          content: newContent,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setPosts((prev) => [data.post, ...prev]);
        setNewContent('');
        setFeedback({ ok: true, text: 'تم نشر مشاركتك في المجتمع الزراعي.' });
      } else {
        setFeedback({ ok: false, text: data.error || 'تعذر نشر المشاركة حالياً.' });
      }
    } catch {
      setFeedback({ ok: false, text: 'تعذر نشر المشاركة حالياً. تحقق من الاتصال بالإنترنت.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLike = async (postId: string) => {
    try {
      const res = await fetch(`/api/community/posts/${postId}/like`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id }),
      });
      const data = await res.json();
      if (data.success) {
        setPosts((prev) =>
          prev.map((p) => {
            if (p.id === postId) {
              const hasLiked = p.likedBy.includes(user.id);
              return {
                ...p,
                likes: data.likes,
                likedBy: hasLiked ? p.likedBy.filter((id) => id !== user.id) : [...p.likedBy, user.id],
              };
            }
            return p;
          })
        );
      }
    } catch {
      // ignore transient network errors
    }
  };

  const handleAddComment = async (postId: string) => {
    const text = commentInputs[postId];
    if (!text || !text.trim()) return;
    setFeedback(null);

    try {
      const res = await fetch(`/api/community/posts/${postId}/comment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          authorName: user.name,
          authorRole: user.role,
          comment: text.trim(),
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setPosts((prev) =>
          prev.map((p) => {
            if (p.id === postId) {
              return {
                ...p,
                comments: [...p.comments, data.comment],
              };
            }
            return p;
          })
        );
        setCommentInputs((prev) => ({ ...prev, [postId]: '' }));
      } else {
        setFeedback({ ok: false, text: data.error || 'تعذر إضافة الرد.' });
      }
    } catch {
      setFeedback({ ok: false, text: 'تعذر إضافة الرد حالياً.' });
    }
  };

  const handleConfirmDelete = async () => {
    if (!pendingDelete) return;
    const token = localStorage.getItem('farmer_admin_token');
    if (!token) {
      setFeedback({ ok: false, text: 'انتهت جلسة الإشراف. يرجى إعادة تسجيل الدخول.' });
      setPendingDelete(null);
      return;
    }

    setDeleting(true);
    setFeedback(null);
    try {
      const url =
        pendingDelete.kind === 'post'
          ? `/api/community/posts/${pendingDelete.postId}`
          : `/api/community/posts/${pendingDelete.postId}/comments/${pendingDelete.commentId}`;

      const res = await fetch(url, {
        method: 'DELETE',
        headers: { 'x-admin-token': token },
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setFeedback({ ok: false, text: data.error || 'لا تملك صلاحية الحذف أو تم إيقاف حسابك.' });
        return;
      }

      if (pendingDelete.kind === 'post') {
        setPosts((prev) => prev.filter((p) => p.id !== pendingDelete.postId));
        setFeedback({ ok: true, text: 'تم حذف المنشور وتسجيل الإجراء في سجل الرقابة.' });
      } else {
        setPosts((prev) =>
          prev.map((p) =>
            p.id === pendingDelete.postId
              ? { ...p, comments: (p.comments || []).filter((c) => c.id !== pendingDelete.commentId) }
              : p
          )
        );
        setFeedback({ ok: true, text: 'تم حذف رسالة الدردشة/التعليق وتسجيل الإجراء.' });
      }
    } catch {
      setFeedback({ ok: false, text: 'تعذر تنفيذ الحذف حالياً.' });
    } finally {
      setDeleting(false);
      setPendingDelete(null);
    }
  };

  const handleSendAiChat = async (questionOverride?: string) => {
    const questionText = (questionOverride ?? aiInput).trim();
    if (!questionText || aiLoading) return;

    const userMsg: AiChatMessage = {
      id: `u-${Date.now()}`,
      role: 'user',
      text: questionText,
      timestamp: Date.now(),
    };
    const nextHistory = [...aiMessages, userMsg];
    setAiMessages(nextHistory);
    if (!questionOverride) setAiInput('');
    setAiLoading(true);

    try {
      const res = await fetch('/api/community/ai-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: questionText,
          governorate: user.governorate,
          cropFocus: aiCropFocus,
          history: nextHistory.slice(-6).map((m) => ({ role: m.role, text: m.text })),
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'تعذر الحصول على إجابة الآن');
      }
      setAiMessages((prev) => [
        ...prev,
        {
          id: `a-${Date.now()}`,
          role: 'assistant',
          text: data.reply,
          practicalSteps: data.practicalSteps,
          safetyReminder: data.safetyReminder,
          suggestedFollowUps: data.suggestedFollowUps,
          timestamp: Date.now(),
        },
      ]);
    } catch {
      setAiMessages((prev) => [
        ...prev,
        {
          id: `a-${Date.now()}`,
          role: 'assistant',
          text: 'تعذر الوصول الفوري للخادم، يمكنك مراجعة الإرشادات الأساسية أو طرح الاستفسار في ديوانية المزارعين.',
          timestamp: Date.now(),
        },
      ]);
    } finally {
      setAiLoading(false);
    }
  };

  const handleShareAdviceToForum = (msg: AiChatMessage) => {
    const formatted = `${msg.text}${
      msg.practicalSteps?.length
        ? '\n\nالخطوات العملية:\n' + msg.practicalSteps.map((s, i) => `${i + 1}. ${s}`).join('\n')
        : ''
    }`;
    setNewCategory(aiCropFocus);
    setNewContent(formatted);
    setActiveTab('forum');
    setFeedback({ ok: true, text: 'تم نقل الإجابة إلى نموذج النشر في ديوانية المزارعين.' });
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="border-b border-stone-200 dark:border-stone-800 pb-4 flex flex-col sm:flex-row sm:items-end justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
            <Users className="w-4 h-4" />
            <span>ديوانية المزارعين والخبراء الزراعيين</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-stone-900 dark:text-white mt-1">
            المجتمع الزراعي والدردشة الإرشادية
          </h1>
          <p className="text-xs sm:text-sm text-stone-600 dark:text-stone-400 mt-0.5">
            اطرح استفساراتك الميدانية وتبادل النصائح مع المزارعين والمهندسين في كافة محافظات عُمان.
          </p>
        </div>

        {canModerate && (
          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800 text-[11px] font-bold text-amber-800 dark:text-amber-300 self-start sm:self-auto">
            <ShieldCheck className="w-4 h-4" />
            <span>وضع الإشراف مفعّل (يمكنك حذف المنشورات والرسائل)</span>
          </div>
        )}
      </div>

      {feedback && (
        <div
          className={`p-3.5 rounded-xl border text-xs flex items-center justify-between gap-2 ${
            feedback.ok
              ? 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200'
              : 'bg-red-50 dark:bg-red-950/60 border-red-200 dark:border-red-800 text-red-800 dark:text-red-200'
          }`}
        >
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{feedback.text}</span>
          </div>
          <button
            type="button"
            onClick={() => setFeedback(null)}
            className="min-h-[36px] min-w-[36px] flex items-center justify-center rounded-lg hover:bg-black/5"
            aria-label="إغلاق"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Mode Switcher: AI Agricultural Chat vs Farmer Forum */}
      <div className="flex flex-wrap items-center gap-2 p-1.5 rounded-2xl bg-stone-100 dark:bg-[#132247] border border-stone-200 dark:border-sky-300/15 w-fit">
        <button
          type="button"
          onClick={() => setActiveTab('ai_chat')}
          className={`min-h-[42px] px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-colors ${
            activeTab === 'ai_chat'
              ? 'bg-emerald-600 text-white shadow-sm'
              : 'text-stone-600 dark:text-slate-300 hover:text-stone-900 dark:hover:text-white'
          }`}
        >
          <Bot className="w-4 h-4" />
          <span>المستشار الزراعي الذكي AI</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('forum')}
          className={`min-h-[42px] px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-colors ${
            activeTab === 'forum'
              ? 'bg-emerald-600 text-white shadow-sm'
              : 'text-stone-600 dark:text-slate-300 hover:text-stone-900 dark:hover:text-white'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>ديوانية المزارعين ({posts.length})</span>
        </button>
      </div>

      {/* TAB 1: LIVE AI AGRICULTURAL CHAT ASSISTANT */}
      {activeTab === 'ai_chat' && (
        <div className="bg-white dark:bg-[#132247] rounded-3xl border border-stone-200 dark:border-sky-300/15 shadow-sm overflow-hidden flex flex-col">
          {/* Chat Context Bar */}
          <div className="p-4 sm:p-5 border-b border-stone-100 dark:border-sky-300/15 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-stone-50/70 dark:bg-[#0e1936]">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <div className="text-xs sm:text-sm font-bold text-stone-900 dark:text-white">
                  المستشار الزراعي العُماني المباشر
                </div>
                <div className="text-[11px] text-stone-500 dark:text-slate-300/80">
                  مخصص لمحافظة {user.governorate} · ملتزم بقرار حظر المبيدات 160/2023
                </div>
              </div>
            </div>

            <select
              value={aiCropFocus}
              onChange={(e) => setAiCropFocus(e.target.value)}
              className="min-h-[40px] px-3 py-1.5 text-xs font-semibold rounded-xl bg-white dark:bg-[#132247] border border-stone-200 dark:border-sky-300/20 text-stone-800 dark:text-white focus:outline-none"
            >
              <option value="نخيل التمر">نخيل التمر</option>
              <option value="الحمضيات والفاكهة">الليمون العُماني والفاكهة</option>
              <option value="البيوت المحمية">البيوت المحمية والخضار</option>
              <option value="الري والأفلاج">الري ومياه الأفلاج</option>
              <option value="تربية النحل والمواشي">تربية النحل والمواشي</option>
            </select>
          </div>

          {/* Conversation Messages */}
          <div className="p-4 sm:p-5 space-y-4 max-h-[520px] overflow-y-auto bg-stone-50/30 dark:bg-[#0b1329]/45">
            {aiMessages.map((msg) => (
              <div
                key={msg.id}
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[92%] sm:max-w-[84%] rounded-2xl p-4 text-xs sm:text-sm space-y-3 ${
                    msg.role === 'user'
                      ? 'bg-emerald-600 text-white rounded-ee-sm shadow-sm'
                      : 'bg-white dark:bg-[#132247] text-stone-800 dark:text-slate-100 border border-stone-200 dark:border-sky-300/15 rounded-es-sm shadow-sm'
                  }`}
                >
                  <p className="leading-relaxed whitespace-pre-line">{msg.text}</p>

                  {msg.practicalSteps && msg.practicalSteps.length > 0 && (
                    <div className="p-3 rounded-xl bg-emerald-50/70 dark:bg-emerald-950/35 border border-emerald-200 dark:border-emerald-700/40 space-y-1.5 text-xs">
                      <div className="font-bold text-emerald-800 dark:text-emerald-300 flex items-center gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>خطوات التنفيذ الميداني:</span>
                      </div>
                      <ul className="space-y-1 text-stone-700 dark:text-slate-200">
                        {msg.practicalSteps.map((step, i) => (
                          <li key={i} className="flex items-start gap-2">
                            <span className="font-bold text-emerald-600 dark:text-emerald-400">
                              {i + 1}.
                            </span>
                            <span>{step}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {msg.safetyReminder && (
                    <div className="p-2.5 rounded-xl bg-amber-50/80 dark:bg-amber-950/35 border border-amber-200 dark:border-amber-700/40 text-[11px] font-semibold text-amber-900 dark:text-amber-200 flex items-start gap-1.5">
                      <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                      <span>{msg.safetyReminder}</span>
                    </div>
                  )}

                  {msg.role === 'assistant' && msg.id !== 'ai-welcome' && (
                    <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => handleShareAdviceToForum(msg)}
                        className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1"
                      >
                        <Share2 className="w-3.5 h-3.5" />
                        <span>مشاركة هذه الإرشادات في الديوانية</span>
                      </button>
                    </div>
                  )}

                  {msg.suggestedFollowUps && msg.suggestedFollowUps.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {msg.suggestedFollowUps.map((q, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => handleSendAiChat(q)}
                          className="text-[11px] px-2.5 py-1 rounded-lg bg-stone-100 dark:bg-[#0e1936] border border-stone-200 dark:border-sky-300/20 text-stone-700 dark:text-sky-200 hover:border-emerald-500 transition-colors text-start"
                        >
                          {q}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}

            {aiLoading && (
              <div className="flex justify-start">
                <div className="px-4 py-3 rounded-2xl bg-white dark:bg-[#132247] border border-stone-200 dark:border-sky-300/15 text-xs font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>المستشار الذكي يحلل معطيات محافظتك ويجيب الآن...</span>
                </div>
              </div>
            )}
          </div>

          {/* Starter Prompts + Input Bar */}
          <div className="p-4 border-t border-stone-100 dark:border-sky-300/15 bg-white dark:bg-[#0e1936] space-y-3">
            <div className="flex flex-wrap gap-1.5">
              {STARTER_AI_QUESTIONS.map((q) => (
                <button
                  key={q}
                  type="button"
                  disabled={aiLoading}
                  onClick={() => handleSendAiChat(q)}
                  className="text-[11px] px-2.5 py-1.5 rounded-lg bg-stone-100 dark:bg-[#132247] border border-stone-200 dark:border-sky-300/15 text-stone-700 dark:text-slate-200 hover:border-emerald-500 transition-colors disabled:opacity-50"
                >
                  {q}
                </button>
              ))}
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSendAiChat();
              }}
              className="flex items-center gap-2"
            >
              <input
                type="text"
                value={aiInput}
                onChange={(e) => setAiInput(e.target.value)}
                placeholder="اكتب استفسارك الزراعي للمستشار الذكي..."
                className="min-h-[46px] flex-1 px-3.5 py-2 text-xs sm:text-sm rounded-xl bg-stone-100 dark:bg-[#132247] border border-stone-200 dark:border-sky-300/20 text-stone-900 dark:text-white placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
              <button
                type="submit"
                disabled={aiLoading || !aiInput.trim()}
                className="min-h-[46px] px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 disabled:opacity-50 transition-colors shrink-0"
              >
                <Send className="w-4 h-4" />
                <span>اسأل</span>
              </button>
            </form>
          </div>
        </div>
      )}

      {/* TAB 2: FARMER COMMUNITY FORUM */}
      {activeTab === 'forum' && (
        <div className="space-y-6">
          {/* Create New Post Form */}
      <form
        onSubmit={handleCreatePost}
        className="bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-800 p-4 sm:p-5 shadow-sm space-y-3"
      >
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-full bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-300 flex items-center justify-center font-bold text-xs">
              🌱
            </div>
            <div>
              <span className="font-bold text-xs text-stone-900 dark:text-white">{user.name}</span>
              <span className="text-[10px] text-stone-400 block">
                {user.role} · {user.governorate}
              </span>
            </div>
          </div>

          <select
            value={newCategory}
            onChange={(e) => setNewCategory(e.target.value)}
            className="min-h-[44px] px-3 py-1.5 text-xs rounded-xl bg-stone-100 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-stone-700 dark:text-stone-300 focus:outline-none"
          >
            <option value="نخيل التمر">نخيل التمر والتمور</option>
            <option value="البيوت المحمية">خضار وبيوت محمية</option>
            <option value="الحمضيات والفاكهة">حمضيات وفاكهة</option>
            <option value="الري والأفلاج">الري ومياه الأفلاج</option>
            <option value="مكافحة الآفات">مكافحة الآفات والأمراض</option>
            <option value="استفسار عام">استفسار عام</option>
          </select>
        </div>

        <textarea
          rows={3}
          value={newContent}
          onChange={(e) => setNewContent(e.target.value)}
          placeholder="اكتب استفسارك أو تجربتك الزراعية هنا (تُفلتر الكلمات الممنوعة تلقائياً)..."
          className="w-full p-3 text-xs sm:text-sm rounded-xl bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-stone-900 dark:text-white placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
        />

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-1">
          <span className="text-[11px] text-stone-400">
            تخضع المشاركات والردود للفلترة التلقائية والإشراف الميداني
          </span>
          <button
            type="submit"
            disabled={isSubmitting || !newContent.trim()}
            className="min-h-[44px] px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-sm flex items-center justify-center gap-1.5 disabled:opacity-50 transition-all"
          >
            <Send className="w-4 h-4" />
            <span>{isSubmitting ? 'جاري النشر...' : 'نشر في المجتمع'}</span>
          </button>
        </div>
      </form>

      {/* Posts List */}
      <div className="space-y-4">
        {posts.map((post) => {
          const hasLiked = post.likedBy?.includes(user.id);

          return (
            <article
              key={post.id}
              className="bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-800 p-4 sm:p-6 shadow-sm space-y-4"
            >
              {/* Post Header */}
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-full bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300 flex items-center justify-center font-bold text-sm shrink-0">
                    {post.authorName.charAt(0)}
                  </div>
                  <div className="min-w-0">
                    <div className="font-bold text-xs sm:text-sm text-stone-900 dark:text-white flex flex-wrap items-center gap-1.5">
                      <span className="truncate">{post.authorName}</span>
                      <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 font-semibold">
                        {post.authorRole}
                      </span>
                    </div>
                    <div className="text-[11px] text-stone-400">
                      {post.authorGovernorate} · {new Date(post.timestamp).toLocaleDateString('ar-OM')}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-[10px] px-2.5 py-1 rounded-lg bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300 font-medium">
                    {post.cropCategory}
                  </span>

                  {canModerate && (
                    <button
                      type="button"
                      onClick={() =>
                        setPendingDelete({
                          kind: 'post',
                          postId: post.id,
                          preview: `${post.authorName}: ${post.content.slice(0, 70)}`,
                        })
                      }
                      className="min-h-[44px] px-3 rounded-xl bg-red-50 dark:bg-red-950/50 hover:bg-red-600 hover:text-white text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800 text-xs font-bold flex items-center gap-1.5 transition-colors"
                      title="حذف هذا المنشور"
                    >
                      <Trash2 className="w-4 h-4" />
                      <span className="hidden sm:inline">حذف</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Post Content */}
              <p className="text-xs sm:text-sm text-stone-800 dark:text-stone-200 leading-relaxed whitespace-pre-line break-words">
                {post.content}
              </p>

              {/* Like & Comments Stats Bar */}
              <div className="flex items-center gap-4 pt-2 border-t border-stone-100 dark:border-stone-800 text-xs">
                <button
                  type="button"
                  onClick={() => handleLike(post.id)}
                  className={`min-h-[44px] px-2 flex items-center gap-1.5 transition-colors font-semibold ${
                    hasLiked ? 'text-rose-600' : 'text-stone-500 hover:text-rose-600'
                  }`}
                >
                  <Heart className={`w-4 h-4 ${hasLiked ? 'fill-current text-rose-600' : ''}`} />
                  <span>{post.likes} إعجاب</span>
                </button>

                <div className="flex items-center gap-1.5 text-stone-500 font-semibold">
                  <MessageSquare className="w-4 h-4" />
                  <span>{post.comments?.length || 0} تعليقات</span>
                </div>
              </div>

              {/* Comments / Chat Section */}
              {post.comments && post.comments.length > 0 && (
                <div className="space-y-2 pt-2 bg-stone-50/70 dark:bg-stone-800/30 p-3 rounded-xl border border-stone-100 dark:border-stone-800/80">
                  {post.comments.map((comm) => (
                    <div
                      key={comm.id}
                      className="text-xs space-y-1 p-2.5 rounded-xl bg-white dark:bg-stone-800 border border-stone-200/60 dark:border-stone-700/60"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <span className="font-bold text-stone-900 dark:text-white truncate">
                            {comm.authorName}
                          </span>
                          <span className="text-[10px] text-emerald-700 dark:text-emerald-400 shrink-0">
                            ({comm.authorRole})
                          </span>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <span className="text-[10px] text-stone-400">
                            {new Date(comm.timestamp).toLocaleTimeString('ar-OM', {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                          {canModerate && (
                            <button
                              type="button"
                              onClick={() =>
                                setPendingDelete({
                                  kind: 'comment',
                                  postId: post.id,
                                  commentId: comm.id,
                                  preview: `${comm.authorName}: ${comm.comment.slice(0, 70)}`,
                                })
                              }
                              className="min-h-[36px] min-w-[36px] flex items-center justify-center rounded-lg bg-red-50 dark:bg-red-950/60 hover:bg-red-600 text-red-600 hover:text-white transition-colors"
                              title="حذف التعليق / الرسالة"
                              aria-label="حذف التعليق"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                      <p className="text-stone-600 dark:text-stone-300 leading-relaxed break-words">
                        {comm.comment}
                      </p>
                    </div>
                  ))}
                </div>
              )}

              {/* Add Comment Input */}
              <div className="flex items-center gap-2 pt-1">
                <input
                  type="text"
                  value={commentInputs[post.id] || ''}
                  onChange={(e) => setCommentInputs({ ...commentInputs, [post.id]: e.target.value })}
                  placeholder="أضف تعليقاً أو رسالة دردشة للمزارع..."
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddComment(post.id);
                    }
                  }}
                  className="min-h-[44px] flex-1 px-3 py-2 text-xs rounded-xl bg-stone-100 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-stone-900 dark:text-white placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
                <button
                  type="button"
                  onClick={() => handleAddComment(post.id)}
                  className="min-h-[44px] px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all shadow-sm"
                >
                  رد
                </button>
              </div>
            </article>
          );
        })}
      </div>
        </div>
      )}

      {/* Explicit Confirmation Modal for Staff Deletion */}
      {pendingDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-950/70 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 p-5 shadow-2xl space-y-4 text-xs">
            <div className="flex items-center gap-2 text-red-600 dark:text-red-400 font-bold text-sm">
              <Trash2 className="w-5 h-5" />
              <span>
                {pendingDelete.kind === 'post' ? 'تأكيد حذف المنشور' : 'تأكيد حذف رسالة الدردشة / التعليق'}
              </span>
            </div>
            <p className="text-stone-600 dark:text-stone-300 leading-relaxed">
              هل أنت متأكد من حذف هذا المحتوى نهائياً؟ سيتم تسجيل العملية باسمك في سجل الإجراءات الرقابية.
            </p>
            <div className="p-3 rounded-xl bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300 italic break-words">
              «{pendingDelete.preview}»
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={deleting}
                onClick={handleConfirmDelete}
                className="min-h-[44px] flex-1 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold transition-colors disabled:opacity-60"
              >
                {deleting ? 'جاري الحذف...' : 'نعم، احذف نهائياً'}
              </button>
              <button
                type="button"
                disabled={deleting}
                onClick={() => setPendingDelete(null)}
                className="min-h-[44px] flex-1 rounded-xl bg-stone-200 dark:bg-stone-800 text-stone-800 dark:text-stone-200 font-bold"
              >
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

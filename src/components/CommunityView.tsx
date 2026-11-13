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

export const CommunityView: React.FC<CommunityViewProps> = ({ user }) => {
  const [posts, setPosts] = useState<Post[]>([]);
  const [newContent, setNewContent] = useState<string>('');
  const [newCategory, setNewCategory] = useState<string>('نخيل التمر');
  const [commentInputs, setCommentInputs] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [feedback, setFeedback] = useState<{ ok: boolean; text: string } | null>(null);
  const [canModerate, setCanModerate] = useState<boolean>(false);
  const [pendingDelete, setPendingDelete] = useState<PendingDelete | null>(null);
  const [deleting, setDeleting] = useState<boolean>(false);

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

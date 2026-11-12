import React, { useState, useEffect } from 'react';
import { 
  Users, 
  MessageSquare, 
  Heart, 
  Send, 
  Plus, 
  UserCircle, 
  Clock, 
  ShieldCheck, 
  CheckCircle,
  HelpCircle
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

export const CommunityView: React.FC<CommunityViewProps> = ({ user }) => {
  const [posts, setPosts] = useState<Post[]>([]);
  const [newContent, setNewContent] = useState<string>('');
  const [newCategory, setNewCategory] = useState<string>('نخيل التمر');
  const [commentInputs, setCommentInputs] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

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

  useEffect(() => {
    fetchPosts();
  }, []);

  const handleCreatePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newContent.trim()) return;

    setIsSubmitting(true);
    try {
      const res = await fetch('/api/community/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          authorName: user.name,
          authorRole: user.role,
          authorGovernorate: user.governorate,
          cropCategory: newCategory,
          content: newContent
        })
      });

      const data = await res.json();
      if (data.success) {
        setPosts(prev => [data.post, ...prev]);
        setNewContent('');
      }
    } catch (e) {
      alert('تعذر نشر المشاركة حالياً');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLike = async (postId: string) => {
    try {
      const res = await fetch(`/api/community/posts/${postId}/like`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id })
      });
      const data = await res.json();
      if (data.success) {
        setPosts(prev => prev.map(p => {
          if (p.id === postId) {
            const hasLiked = p.likedBy.includes(user.id);
            return {
              ...p,
              likes: data.likes,
              likedBy: hasLiked ? p.likedBy.filter(id => id !== user.id) : [...p.likedBy, user.id]
            };
          }
          return p;
        }));
      }
    } catch (e) {
      // ignore
    }
  };

  const handleAddComment = async (postId: string) => {
    const text = commentInputs[postId];
    if (!text || !text.trim()) return;

    try {
      const res = await fetch(`/api/community/posts/${postId}/comment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          authorName: user.name,
          authorRole: user.role,
          comment: text.trim()
        })
      });

      const data = await res.json();
      if (data.success) {
        setPosts(prev => prev.map(p => {
          if (p.id === postId) {
            return {
              ...p,
              comments: [...p.comments, data.comment]
            };
          }
          return p;
        }));
        setCommentInputs(prev => ({ ...prev, [postId]: '' }));
      }
    } catch (e) {
      alert('تعذر إضافة الرد');
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      
      {/* Header */}
      <div className="border-b border-stone-200 dark:border-stone-800 pb-4">
        <div className="flex items-center gap-2 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
          <Users className="w-4 h-4" />
          <span>ديوانية المزارعين والخبراء الزراعيين</span>
        </div>
        <h1 className="text-2xl font-bold text-stone-900 dark:text-white mt-1">
          المجتمع الزراعي والدردشة الإرشادية
        </h1>
        <p className="text-xs sm:text-sm text-stone-600 dark:text-stone-400 mt-0.5">
          اطرح استفساراتك الميدانية، تبادل النصائح الزراعية مع إخوانك المزارعين والمهندسين في كافة محافظات عُمان.
        </p>
      </div>

      {/* Create New Post Form */}
      <form onSubmit={handleCreatePost} className="bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-800 p-5 shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-300 flex items-center justify-center font-bold text-xs">
              🌱
            </div>
            <div>
              <span className="font-bold text-xs text-stone-900 dark:text-white">
                {user.name}
              </span>
              <span className="text-[10px] text-stone-400 block">
                {user.role} · {user.governorate}
              </span>
            </div>
          </div>

          <select
            value={newCategory}
            onChange={(e) => setNewCategory(e.target.value)}
            className="px-2.5 py-1 text-xs rounded-lg bg-stone-100 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-stone-700 dark:text-stone-300 focus:outline-none"
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
          placeholder="اكتب استفسارك أو تجربتك الزراعية هنا ليتفاعل معها المزارعون والمهندسون..."
          className="w-full p-3 text-xs rounded-xl bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-stone-900 dark:text-white placeholder:text-stone-400 focus:outline-none focus:ring-1 focus:ring-emerald-500"
        />

        <div className="flex items-center justify-between pt-1">
          <span className="text-[11px] text-stone-400">
            يرجى الالتزام بالإرشادات العلمية المعتمدة واحترام آراء الجميع
          </span>
          <button
            type="submit"
            disabled={isSubmitting || !newContent.trim()}
            className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-sm flex items-center gap-1.5 disabled:opacity-50 transition-all"
          >
            <Send className="w-3.5 h-3.5" />
            <span>نشر في المجتمع</span>
          </button>
        </div>
      </form>

      {/* Posts List */}
      <div className="space-y-4">
        {posts.map((post) => {
          const hasLiked = post.likedBy?.includes(user.id);

          return (
            <div
              key={post.id}
              className="bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-800 p-5 sm:p-6 shadow-sm space-y-4"
            >
              {/* Post Header */}
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300 flex items-center justify-center font-bold text-sm">
                    {post.authorName.charAt(0)}
                  </div>
                  <div>
                    <div className="font-bold text-xs sm:text-sm text-stone-900 dark:text-white flex items-center gap-2">
                      <span>{post.authorName}</span>
                      <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 font-semibold">
                        {post.authorRole}
                      </span>
                    </div>
                    <div className="text-[11px] text-stone-400">
                      {post.authorGovernorate} · {new Date(post.timestamp).toLocaleDateString('ar-OM')}
                    </div>
                  </div>
                </div>

                <span className="text-[10px] px-2.5 py-1 rounded bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300 font-medium">
                  {post.cropCategory}
                </span>
              </div>

              {/* Post Content */}
              <p className="text-xs sm:text-sm text-stone-800 dark:text-stone-200 leading-relaxed whitespace-pre-line text-justify">
                {post.content}
              </p>

              {/* Like & Comments Stats Bar */}
              <div className="flex items-center gap-4 pt-2 border-t border-stone-100 dark:border-stone-800 text-xs">
                <button
                  onClick={() => handleLike(post.id)}
                  className={`flex items-center gap-1.5 transition-colors font-semibold ${
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

              {/* Comments Section */}
              {post.comments && post.comments.length > 0 && (
                <div className="space-y-2 pt-2 bg-stone-50/50 dark:bg-stone-800/30 p-3 rounded-xl border border-stone-100 dark:border-stone-800/80">
                  {post.comments.map((comm) => (
                    <div key={comm.id} className="text-xs space-y-1 p-2 rounded-lg bg-white dark:bg-stone-800 border border-stone-200/50 dark:border-stone-700/50">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-stone-900 dark:text-white">
                            {comm.authorName}
                          </span>
                          <span className="text-[10px] text-emerald-700 dark:text-emerald-400">
                            ({comm.authorRole})
                          </span>
                        </div>
                        <span className="text-[10px] text-stone-400">
                          {new Date(comm.timestamp).toLocaleTimeString('ar-OM', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <p className="text-stone-600 dark:text-stone-300 leading-relaxed">
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
                  placeholder="أضف تعليقاً أو نصيحة زراعية للمزارع..."
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddComment(post.id);
                    }
                  }}
                  className="flex-1 px-3 py-2 text-xs rounded-xl bg-stone-100 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-stone-900 dark:text-white placeholder:text-stone-400 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
                <button
                  type="button"
                  onClick={() => handleAddComment(post.id)}
                  className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all shadow-sm"
                >
                  رد
                </button>
              </div>

            </div>
          );
        })}
      </div>

    </div>
  );
};

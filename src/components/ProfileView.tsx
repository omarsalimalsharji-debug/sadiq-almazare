import React, { useState } from 'react';
import { 
  UserCircle, 
  Trophy, 
  Bookmark, 
  MapPin, 
  Award, 
  ShieldCheck, 
  Edit3, 
  Check, 
  BookOpen,
  Sparkles
} from 'lucide-react';
import { UserProfile } from '../types/index.ts';
import { OMANI_GOVERNORATES, INITIAL_BOOKS } from '../data/agriculturalData.ts';

interface ProfileViewProps {
  user: UserProfile;
  onUpdateUser: (updated: Partial<UserProfile>) => void;
  onNavigateToLibrary: () => void;
}

export const ProfileView: React.FC<ProfileViewProps> = ({
  user,
  onUpdateUser,
  onNavigateToLibrary
}) => {
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [name, setName] = useState<string>(user.name);
  const [gov, setGov] = useState<string>(user.governorate);
  const [wilayat, setWilayat] = useState<string>(user.wilayat);
  const [role, setRole] = useState<string>(user.role);
  const [savedMsg, setSavedMsg] = useState<string | null>(null);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateUser({
      name: name.trim() || user.name,
      governorate: gov,
      wilayat: wilayat.trim() || user.wilayat,
      role: role as any
    });
    setIsEditing(false);
    setSavedMsg('تم حفظ بيانات الملف الشخصي بنجاح!');
    setTimeout(() => setSavedMsg(null), 3000);
  };

  const bookmarkedBooks = INITIAL_BOOKS.filter(b => user.bookmarkedBookIds?.includes(b.id));

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      
      {/* Title */}
      <div className="border-b border-stone-200 dark:border-stone-800 pb-4">
        <div className="flex items-center gap-2 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
          <UserCircle className="w-4 h-4" />
          <span>حساب المزارع الشخصي وسجل الإنجازات</span>
        </div>
        <h1 className="text-2xl font-bold text-stone-900 dark:text-white mt-1">
          الملف الشخصي
        </h1>
        <p className="text-xs sm:text-sm text-stone-600 dark:text-stone-400 mt-0.5">
          إدارة بياناتك ومحافظتك والاطلاع على رصيد نقاطك والكتب المحفوظة في مفضلتك.
        </p>
      </div>

      {savedMsg && (
        <div className="p-3 rounded-xl bg-emerald-100 dark:bg-emerald-950 border border-emerald-300 text-emerald-900 dark:text-emerald-200 text-xs flex items-center justify-between">
          <span>{savedMsg}</span>
          <Check className="w-4 h-4 text-emerald-600" />
        </div>
      )}

      {/* Main Profile Info Card */}
      <div className="bg-white dark:bg-stone-900 rounded-3xl border border-stone-200 dark:border-stone-800 p-6 sm:p-8 shadow-sm space-y-6">
        
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-600 to-teal-800 text-white flex items-center justify-center font-bold text-2xl shadow-md">
              {user.name.charAt(0)}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold text-stone-900 dark:text-white">
                  {user.name}
                </h2>
                {user.isAdmin ? (
                  <span className="text-[10px] px-2 py-0.5 rounded bg-stone-900 text-white dark:bg-emerald-800 font-semibold">
                    مدير التطبيق
                  </span>
                ) : (
                  <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 font-semibold">
                    {user.role}
                  </span>
                )}
              </div>
              <div className="text-xs text-stone-500 dark:text-stone-400 mt-1 flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-emerald-600" />
                <span>{user.governorate} · ولاية {user.wilayat}</span>
              </div>
            </div>
          </div>

          <button
            onClick={() => setIsEditing(!isEditing)}
            className="px-4 py-2 rounded-xl border border-stone-300 dark:border-stone-700 hover:bg-stone-50 dark:hover:bg-stone-800 text-xs font-semibold flex items-center gap-1.5 text-stone-700 dark:text-stone-300 transition-colors"
          >
            <Edit3 className="w-3.5 h-3.5" />
            <span>{isEditing ? 'إلغاء التعديل' : 'تعديل البيانات'}</span>
          </button>
        </div>

        {/* Stats Strip */}
        <div className="grid grid-cols-3 gap-3 pt-4 border-t border-stone-100 dark:border-stone-800 text-center">
          <div className="p-3 rounded-2xl bg-stone-50 dark:bg-stone-800/60">
            <span className="text-[11px] text-stone-500 block font-medium">مجموع النقاط المعتمدة</span>
            <span className="text-2xl font-black text-emerald-600 font-mono">{user.totalScore}</span>
          </div>

          <div className="p-3 rounded-2xl bg-stone-50 dark:bg-stone-800/60">
            <span className="text-[11px] text-stone-500 block font-medium">الجولات المكتملة</span>
            <span className="text-2xl font-black text-stone-800 dark:text-stone-200 font-mono">{user.participations}</span>
          </div>

          <div className="p-3 rounded-2xl bg-stone-50 dark:bg-stone-800/60">
            <span className="text-[11px] text-stone-500 block font-medium">الترتيب في عُمان</span>
            <span className="text-2xl font-black text-amber-500 font-mono">#{user.rank || 1}</span>
          </div>
        </div>

        {/* Edit Form */}
        {isEditing && (
          <form onSubmit={handleSave} className="p-4 rounded-2xl bg-stone-50 dark:bg-stone-800/60 border border-stone-200 dark:border-stone-700 space-y-3 text-xs animate-in fade-in">
            <div className="font-bold text-stone-900 dark:text-white">
              تحديث بيانات المزارع:
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold mb-1">الاسم الكامل:</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={e => setName(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block font-semibold mb-1">الصفة / الدور:</label>
                <select
                  value={role}
                  onChange={e => setRole(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-white"
                >
                  <option value="مزارع">مزارع</option>
                  <option value="مهندس زراعي">مهندس زراعي</option>
                  <option value="مرشد زراعي">مرشد زراعي</option>
                  <option value="مهتم بالزراعة">مهتم بالزراعة والبيئة</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold mb-1">المحافظة:</label>
                <select
                  value={gov}
                  onChange={e => setGov(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-white"
                >
                  {OMANI_GOVERNORATES.map(g => (
                    <option key={g.id} value={g.name}>{g.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold mb-1">الولاية:</label>
                <input
                  type="text"
                  required
                  value={wilayat}
                  onChange={e => setWilayat(e.target.value)}
                  placeholder="مثال: نزوى، صحم، بهلاء، الرستاق..."
                  className="w-full p-2.5 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-white"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsEditing(false)}
                className="px-4 py-2 rounded-xl bg-stone-200 dark:bg-stone-700 text-stone-700 dark:text-stone-300"
              >
                إلغاء
              </button>
              <button
                type="submit"
                className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
              >
                حفظ التغييرات
              </button>
            </div>
          </form>
        )}

      </div>

      {/* Bookmarked Books from E-Library */}
      <div className="bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-800 p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-sm text-stone-900 dark:text-white flex items-center gap-2">
            <Bookmark className="w-4 h-4 text-emerald-600" />
            <span>الكتب والمراجع المحفوظة في المفضلة ({bookmarkedBooks.length})</span>
          </h3>

          <button
            onClick={onNavigateToLibrary}
            className="text-xs text-emerald-600 dark:text-emerald-400 hover:underline font-semibold"
          >
            تصفح المكتبة كاملة
          </button>
        </div>

        {bookmarkedBooks.length === 0 ? (
          <div className="text-center py-8 text-stone-400 text-xs">
            لم تقم بحفظ أي مراجع في المفضلة بعد. انقر على أيقونة الإشارة المرجعية أثناء تصفح المكتبة.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {bookmarkedBooks.map(book => (
              <div
                key={book.id}
                className="p-3.5 rounded-xl bg-stone-50 dark:bg-stone-800/50 border border-stone-200 dark:border-stone-700 flex items-center justify-between"
              >
                <div>
                  <div className="font-bold text-xs text-stone-900 dark:text-white line-clamp-1">
                    {book.title}
                  </div>
                  <div className="text-[11px] text-stone-500">
                    {book.category} · {book.author}
                  </div>
                </div>

                <button
                  onClick={onNavigateToLibrary}
                  className="px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-[11px] font-bold shrink-0"
                >
                  قراءة
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
};

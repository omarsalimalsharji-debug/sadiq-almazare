import React, { useState, useEffect } from 'react';
import { 
  UserCircle, 
  Bookmark, 
  MapPin, 
  Edit3, 
  Check, 
  Cloud,
  Download
} from 'lucide-react';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { UserProfile } from '../types/index.ts';
import { INITIAL_BOOKS } from '../data/agriculturalData.ts';
import { OMAN_ADMINISTRATIVE_DATA, matchOmanLocationByNames } from '../data/omanLocationsData.ts';
import { useLocation } from '../context/LocationContext.tsx';
import {
  auth,
  db,
  handleFirestoreError,
  OperationType,
} from '../firebase.ts';

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
  const { location, setManualSelection } = useLocation();
  const initialMatched = matchOmanLocationByNames(
    location.governorate || user.governorate,
    location.wilayat || user.wilayat,
    location.village || user.village
  );

  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [name, setName] = useState<string>(user.name);
  const [govId, setGovId] = useState<string>(initialMatched.governorate.id);
  const [wilayatId, setWilayatId] = useState<string>(initialMatched.wilayat.id);
  const [village, setVillage] = useState<string>(initialMatched.village);
  const [role, setRole] = useState<string>(user.role);
  const [savedMsg, setSavedMsg] = useState<string | null>(null);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [fbUser, setFbUser] = useState<FirebaseUser | null>(auth.currentUser);

  const selectedGovObj =
    OMAN_ADMINISTRATIVE_DATA.find((g) => g.id === govId) || OMAN_ADMINISTRATIVE_DATA[0];
  const selectedWilayatObj =
    selectedGovObj.wilayats.find((w) => w.id === wilayatId) || selectedGovObj.wilayats[0];

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (current) => {
      setFbUser(current);
    });
    return () => unsub();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSyncError(null);
    const nextName = name.trim() || user.name;
    const nextGov = selectedGovObj.name;
    const nextWilayat = selectedWilayatObj.name;
    const nextVillage = village.trim() || selectedWilayatObj.villages[0] || nextWilayat;

    setManualSelection({
      governorateId: selectedGovObj.id,
      wilayatId: selectedWilayatObj.id,
      village: nextVillage,
    });

    onUpdateUser({
      name: nextName,
      governorate: nextGov,
      wilayat: nextWilayat,
      village: nextVillage,
      role: role as any
    });
    setIsEditing(false);

    if (fbUser && fbUser.uid) {
      const userPath = `users/${fbUser.uid}`;
      try {
        await updateDoc(doc(db, 'users', fbUser.uid), {
          displayName: nextName.slice(0, 80),
          governorate: nextGov.slice(0, 60),
          wilayat: nextWilayat.slice(0, 80),
          village: nextVillage.slice(0, 100),
          updatedAt: serverTimestamp(),
        });
        setSavedMsg('تم حفظ البيانات والمزامنة سحابياً مع حسابك في Firebase بنجاح.');
      } catch (err) {
        try {
          handleFirestoreError(err, OperationType.UPDATE, userPath);
        } catch {
          setSyncError('تم الحفظ محلياً، وتعذر تحديث السجل السحابي حالياً.');
        }
      }
    } else {
      setSavedMsg('تم حفظ بيانات الملف الشخصي وتحديث الموقع الجغرافي بنجاح.');
    }
    setTimeout(() => setSavedMsg(null), 3500);
  };

  const bookmarkedBooks = INITIAL_BOOKS.filter(b => user.bookmarkedBookIds?.includes(b.id));

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      
      {/* Title */}
      <div className="border-b border-slate-200 dark:border-sky-300/15 pb-4">
        <div className="flex items-center gap-2 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
          <UserCircle className="w-4 h-4" />
          <span>حساب المزارع الشخصي وسجل الإنجازات</span>
        </div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
          الملف الشخصي
        </h1>
        <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 mt-0.5">
          إدارة بياناتك ومحافظتك والاطلاع على رصيد نقاطك والكتب المحفوظة دون الحاجة إلى حساب.
        </p>
      </div>

      {savedMsg && (
        <div className="p-3.5 rounded-xl bg-emerald-100 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-700/60 text-emerald-900 dark:text-emerald-200 text-xs flex items-center justify-between">
          <span>{savedMsg}</span>
          <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
        </div>
      )}

      {syncError && (
        <div className="p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-700/60 text-amber-900 dark:text-amber-200 text-xs">
          {syncError}
        </div>
      )}

      {/* Main Profile Info Card */}
      <div className="bg-white dark:bg-[#132247] rounded-3xl border border-slate-200 dark:border-sky-300/15 p-6 sm:p-8 shadow-sm space-y-6">
        
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-600 to-teal-800 text-white flex items-center justify-center font-bold text-2xl shadow-md">
              {user.name.charAt(0)}
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                  {user.name}
                </h2>
                <span className="text-slate-500 dark:text-slate-300">
                  · {user.isAdmin ? 'مدير التطبيق' : user.role}
                </span>
              </div>
              <div className="text-xs text-slate-500 dark:text-slate-300 mt-1 flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                <span>
                  {location.governorate} · ولاية {location.wilayat}
                  {location.village ? ` · ${location.village}` : ''}
                </span>
              </div>
            </div>
          </div>

          <button
            onClick={() => setIsEditing(!isEditing)}
            className="min-h-[44px] px-4 py-2 rounded-xl border border-slate-300 dark:border-sky-300/20 hover:bg-slate-50 dark:hover:bg-[#0e1936] text-xs font-semibold flex items-center gap-1.5 text-slate-700 dark:text-slate-200 transition-colors"
          >
            <Edit3 className="w-3.5 h-3.5" />
            <span>{isEditing ? 'إلغاء التعديل' : 'تعديل البيانات'}</span>
          </button>
        </div>

        {/* Stats Strip */}
        <div className="grid grid-cols-3 gap-3 pt-4 border-t border-slate-100 dark:border-sky-300/15 text-center">
          <div className="p-3 rounded-2xl bg-slate-50 dark:bg-[#0e1936]">
            <span className="text-[11px] text-slate-500 dark:text-slate-300 block font-medium">مجموع النقاط المعتمدة</span>
            <span className="text-2xl font-black text-emerald-600 dark:text-emerald-400 font-mono tabular-nums">{user.totalScore}</span>
          </div>

          <div className="p-3 rounded-2xl bg-slate-50 dark:bg-[#0e1936]">
            <span className="text-[11px] text-slate-500 dark:text-slate-300 block font-medium">الجولات المكتملة</span>
            <span className="text-2xl font-black text-slate-800 dark:text-white font-mono tabular-nums">{user.participations}</span>
          </div>

          <div className="p-3 rounded-2xl bg-slate-50 dark:bg-[#0e1936]">
            <span className="text-[11px] text-slate-500 dark:text-slate-300 block font-medium">الترتيب في عُمان</span>
            <span className="text-2xl font-black text-amber-500 font-mono tabular-nums">#{user.rank || 1}</span>
          </div>
        </div>

        {/* Local-first farmer profile */}
        <div className="p-4 rounded-2xl bg-slate-50 dark:bg-[#0e1936] border border-slate-200 dark:border-sky-300/15 flex items-center gap-3 text-xs">
          <Cloud className="w-5 h-5 shrink-0 text-emerald-500" />
          <div>
            <div className="font-bold text-slate-900 dark:text-white">ملفك الزراعي متاح دون تسجيل دخول</div>
            <div className="text-[11px] text-slate-500 dark:text-slate-300 mt-0.5">تُحفظ تفضيلات الملف والموقع على هذا الجهاز، ويمكنك استخدام خدمات التطبيق مباشرة.</div>
          </div>
        </div>

        {/* Edit Form */}
        {isEditing && (
          <form onSubmit={handleSave} className="p-4 rounded-2xl bg-slate-50 dark:bg-[#0e1936] border border-slate-200 dark:border-sky-300/15 space-y-3 text-xs">
            <div className="font-bold text-slate-900 dark:text-white">
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
                  className="w-full min-h-[44px] p-2.5 rounded-xl border border-slate-300 dark:border-sky-300/20 bg-white dark:bg-[#132247] text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block font-semibold mb-1">الصفة / الدور:</label>
                <select
                  value={role}
                  onChange={e => setRole(e.target.value)}
                  className="w-full min-h-[44px] p-2.5 rounded-xl border border-slate-300 dark:border-sky-300/20 bg-white dark:bg-[#132247] text-slate-900 dark:text-white"
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
                  value={selectedGovObj.id}
                  onChange={(e) => {
                    const nextGovObj =
                      OMAN_ADMINISTRATIVE_DATA.find((g) => g.id === e.target.value) ||
                      OMAN_ADMINISTRATIVE_DATA[0];
                    setGovId(nextGovObj.id);
                    const firstWil = nextGovObj.wilayats[0];
                    setWilayatId(firstWil.id);
                    setVillage(firstWil.villages[0] || firstWil.name);
                  }}
                  className="w-full min-h-[44px] p-2.5 rounded-xl border border-slate-300 dark:border-sky-300/20 bg-white dark:bg-[#132247] text-slate-900 dark:text-white"
                >
                  {OMAN_ADMINISTRATIVE_DATA.map((g) => (
                    <option key={g.id} value={g.id}>{g.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold mb-1">الولاية:</label>
                <select
                  value={selectedWilayatObj.id}
                  onChange={(e) => {
                    const nextWilObj =
                      selectedGovObj.wilayats.find((w) => w.id === e.target.value) ||
                      selectedGovObj.wilayats[0];
                    setWilayatId(nextWilObj.id);
                    setVillage(nextWilObj.villages[0] || nextWilObj.name);
                  }}
                  className="w-full min-h-[44px] p-2.5 rounded-xl border border-slate-300 dark:border-sky-300/20 bg-white dark:bg-[#132247] text-slate-900 dark:text-white"
                >
                  {selectedGovObj.wilayats.map((w) => (
                    <option key={w.id} value={w.id}>ولاية {w.name}</option>
                  ))}
                </select>
              </div>

              <div className="sm:col-span-2">
                <label className="block font-semibold mb-1">القرية أو المنطقة الزراعية:</label>
                <input
                  type="text"
                  list="profile-oman-villages"
                  value={village}
                  onChange={(e) => setVillage(e.target.value)}
                  placeholder="اختر أو اكتب اسم القرية أو المنطقة..."
                  className="w-full min-h-[44px] p-2.5 rounded-xl border border-slate-300 dark:border-sky-300/20 bg-white dark:bg-[#132247] text-slate-900 dark:text-white"
                />
                <datalist id="profile-oman-villages">
                  {selectedWilayatObj.villages.map((v) => (
                    <option key={v} value={v} />
                  ))}
                </datalist>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsEditing(false)}
                className="min-h-[44px] px-4 py-2 rounded-xl bg-slate-200 dark:bg-[#132247] text-slate-700 dark:text-slate-200 font-semibold"
              >
                إلغاء
              </button>
              <button
                type="submit"
                className="min-h-[44px] px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
              >
                حفظ التغييرات
              </button>
            </div>
          </form>
        )}

      </div>

      {/* Official Android app download */}
      <div className="rounded-2xl border border-emerald-300/70 dark:border-emerald-700/50 bg-gradient-to-br from-emerald-50 to-white dark:from-emerald-950/50 dark:to-[#132247] p-5 sm:p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="w-12 h-12 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shrink-0">
              <Download className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-slate-900 dark:text-white">تطبيق صديق المزارع لهاتفك</h3>
              <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 leading-6">حمّل أحدث نسخة أندرويد الموقّعة واستمتع بخدمات صديق المزارع مباشرة من هاتفك.</p>
              <span className="inline-flex mt-2 text-[10px] font-semibold text-emerald-700 dark:text-emerald-300">أحدث إصدار متاح</span>
            </div>
          </div>
          <a
            href="https://github.com/omarsalimalsharji-debug/sadiq-almazare/releases/latest/download/app-release.apk"
            className="min-h-[46px] px-5 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold inline-flex items-center justify-center gap-2 transition-colors shrink-0"
          >
            <Download className="w-4 h-4" />
            تحميل التطبيق
          </a>
        </div>
      </div>

      {/* Bookmarked Books from E-Library */}
      <div className="bg-white dark:bg-[#132247] rounded-2xl border border-slate-200 dark:border-sky-300/15 p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
            <Bookmark className="w-4 h-4 text-emerald-500" />
            <span>الكتب والمراجع المحفوظة في المفضلة ({bookmarkedBooks.length})</span>
          </h3>

          <button
            onClick={onNavigateToLibrary}
            className="min-h-[44px] px-3 text-xs text-emerald-600 dark:text-emerald-400 hover:underline font-semibold"
          >
            تصفح المكتبة كاملة
          </button>
        </div>

        {bookmarkedBooks.length === 0 ? (
          <div className="text-center py-8 text-slate-400 text-xs">
            لم تقم بحفظ أي مراجع في المفضلة بعد. انقر على أيقونة الإشارة المرجعية أثناء تصفح المكتبة.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {bookmarkedBooks.map(book => (
              <div
                key={book.id}
                className="p-3.5 rounded-xl bg-slate-50 dark:bg-[#0e1936] border border-slate-200 dark:border-sky-300/15 flex items-center justify-between gap-3"
              >
                <div>
                  <div className="font-bold text-xs text-slate-900 dark:text-white line-clamp-1">
                    {book.title}
                  </div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-300">
                    {book.category} · {book.author}
                  </div>
                </div>

                <button
                  onClick={onNavigateToLibrary}
                  className="min-h-[40px] px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold shrink-0"
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

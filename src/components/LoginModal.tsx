import React, { useState } from 'react';
import {
  X,
  LogIn,
  LogOut,
  ShieldCheck,
  UserCheck,
  User,
  AlertCircle,
  Globe,
  KeyRound,
} from 'lucide-react';
import { UserProfile } from '../types/index.ts';
import { signInWithGoogleFarmer, signOutFirebase } from '../firebase.ts';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: UserProfile;
  onSwitchUser: (newUser: UserProfile, options?: { mustChangePassword?: boolean }) => void;
}

export const LoginModal: React.FC<LoginModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onSwitchUser,
}) => {
  const [staffTab, setStaffTab] = useState<'admin' | 'moderator'>('admin');
  const [adminPassword, setAdminPassword] = useState<string>('');
  const [modUsername, setModUsername] = useState<string>('');
  const [modPassword, setModPassword] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);

  if (!isOpen) return null;

  const handleLoginStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (staffTab === 'admin' && !adminPassword.trim()) {
      setError('يرجى إدخال كلمة سر مدير التطبيق.');
      return;
    }
    if (staffTab === 'moderator' && (!modUsername.trim() || !modPassword.trim())) {
      setError('يرجى إدخال اسم المستخدم وكلمة السر للمشرف.');
      return;
    }

    setLoading(true);
    try {
      const payload =
        staffTab === 'admin'
          ? { mode: 'admin', password: adminPassword.trim() }
          : { mode: 'moderator', username: modUsername.trim(), password: modPassword.trim() };

      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setError(data.error || 'تعذر التحقق من بيانات الدخول.');
        return;
      }

      localStorage.setItem('farmer_admin_token', data.token);
      localStorage.setItem('farmer_staff_role', data.role || staffTab);
      if (data.mustChangePassword) {
        localStorage.setItem('farmer_force_pw_change', '1');
      } else {
        localStorage.removeItem('farmer_force_pw_change');
      }

      if (data.role === 'moderator') {
        onSwitchUser({
          ...currentUser,
          id: data.user?.id || 'mod-user',
          name: `${data.user?.name || modUsername} (مشرف)`,
          role: 'مشرف',
          governorate: 'سلطنة عُمان',
          wilayat: 'مسقط',
          isAdmin: false,
          isModerator: true,
        });
      } else {
        onSwitchUser(
          {
            ...currentUser,
            id: data.user?.id || 'admin-omar',
            name: 'عمر الشرجي (صاحب الفكرة والمدير العام)',
            role: 'مدير التطبيق',
            governorate: 'محافظة مسقط',
            wilayat: 'مسقط',
            isAdmin: true,
            isModerator: true,
            rank: 1,
          },
          { mustChangePassword: Boolean(data.mustChangePassword) }
        );
      }

      setAdminPassword('');
      setModUsername('');
      setModPassword('');
      onClose();
    } catch {
      setError('تعذر الاتصال بخادم التحقق حالياً.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setLoading(true);
    setError(null);
    try {
      const fbUser = await signInWithGoogleFarmer();
      const isBootstrapAdmin =
        fbUser.email?.toLowerCase() === 'alsharji73@gmail.com' && fbUser.emailVerified;

      onSwitchUser({
        ...currentUser,
        id: fbUser.uid,
        name: fbUser.displayName || 'مزارع عُماني',
        role: isBootstrapAdmin ? 'مدير التطبيق' : 'مزارع',
        isAdmin: isBootstrapAdmin,
        isModerator: isBootstrapAdmin,
      });
      onClose();
    } catch (err: any) {
      setError(err?.message || 'تعذر تسجيل الدخول عبر حساب Google.');
    } finally {
      setLoading(false);
    }
  };

  const handleLoginAsFarmer = () => {
    localStorage.removeItem('farmer_admin_token');
    localStorage.removeItem('farmer_staff_role');
    localStorage.removeItem('farmer_force_pw_change');
    onSwitchUser({
      ...currentUser,
      id: 'usr-farmer-1',
      name: 'سالم بن سعيد الحارثي',
      role: 'مزارع',
      governorate: 'محافظة الداخلية',
      wilayat: 'نزوى',
      isAdmin: false,
      isModerator: false,
    });
    onClose();
  };

  const handleLoginAsEngineer = () => {
    localStorage.removeItem('farmer_admin_token');
    localStorage.removeItem('farmer_staff_role');
    localStorage.removeItem('farmer_force_pw_change');
    onSwitchUser({
      ...currentUser,
      id: 'usr-eng-1',
      name: 'المهندس / أحمد المعمري',
      role: 'مهندس زراعي',
      governorate: 'محافظة شمال الباطنة',
      wilayat: 'صحار',
      isAdmin: false,
      isModerator: false,
    });
    onClose();
  };

  const handleLogout = async () => {
    const token = localStorage.getItem('farmer_admin_token');
    if (token) {
      fetch('/api/auth/logout', {
        method: 'POST',
        headers: { 'x-admin-token': token },
      }).catch(() => {});
    }
    localStorage.removeItem('farmer_admin_token');
    localStorage.removeItem('farmer_staff_role');
    localStorage.removeItem('farmer_force_pw_change');
    try {
      await signOutFirebase();
    } catch {
      // ignore
    }
    onSwitchUser({
      ...currentUser,
      id: 'guest-' + Date.now(),
      name: 'مزارع عماني (زائر)',
      role: 'مزارع',
      isAdmin: false,
      isModerator: false,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-950/70 backdrop-blur-sm overflow-y-auto">
      <div className="bg-white dark:bg-stone-900 rounded-3xl w-full max-w-md p-5 sm:p-6 border border-stone-200 dark:border-stone-800 shadow-2xl space-y-5 text-stone-900 dark:text-stone-100 my-auto">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-stone-100 dark:border-stone-800 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400 flex items-center justify-center">
              <LogIn className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-sm">تسجيل الدخول وتبديل الحساب</h3>
              <span className="text-[11px] text-stone-400">الحساب الحالي: {currentUser.name}</span>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl text-stone-400 hover:text-stone-700 dark:hover:text-white"
            aria-label="إغلاق"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Google Firebase Auth */}
        <button
          type="button"
          disabled={loading}
          onClick={handleGoogleLogin}
          className="min-h-[44px] w-full p-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-sm transition-colors"
        >
          <Globe className="w-4 h-4" />
          <span>تسجيل الدخول بحساب Google (حفظ سحابي ومنافسات)</span>
        </button>

        {/* Quick Profiles */}
        <div className="space-y-2 text-xs">
          <div className="font-semibold text-stone-600 dark:text-stone-300">أو اختر ملفاً للتصفح:</div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <button
              type="button"
              onClick={handleLoginAsFarmer}
              className="min-h-[44px] p-2.5 rounded-xl border border-stone-200 dark:border-stone-700 hover:border-emerald-500 text-right flex items-center justify-between transition-colors bg-stone-50/50 dark:bg-stone-800/40"
            >
              <div>
                <div className="font-bold">سالم الحارثي</div>
                <div className="text-[10px] text-stone-500">مزارع - نزوى</div>
              </div>
              <User className="w-4 h-4 text-emerald-600 shrink-0" />
            </button>

            <button
              type="button"
              onClick={handleLoginAsEngineer}
              className="min-h-[44px] p-2.5 rounded-xl border border-stone-200 dark:border-stone-700 hover:border-emerald-500 text-right flex items-center justify-between transition-colors bg-stone-50/50 dark:bg-stone-800/40"
            >
              <div>
                <div className="font-bold">م. أحمد المعمري</div>
                <div className="text-[10px] text-stone-500">مهندس زراعي - صحار</div>
              </div>
              <User className="w-4 h-4 text-cyan-600 shrink-0" />
            </button>
          </div>
        </div>

        {/* Staff Auth: Admin OR Moderator */}
        <div className="pt-3 border-t border-stone-100 dark:border-stone-800 space-y-3">
          <div className="grid grid-cols-2 gap-1.5 p-1 rounded-xl bg-stone-100 dark:bg-stone-800 text-xs">
            <button
              type="button"
              onClick={() => {
                setStaffTab('admin');
                setError(null);
              }}
              className={`min-h-[40px] rounded-lg font-bold flex items-center justify-center gap-1.5 transition-all ${
                staffTab === 'admin'
                  ? 'bg-white dark:bg-stone-900 text-emerald-700 dark:text-emerald-400 shadow-sm'
                  : 'text-stone-500'
              }`}
            >
              <ShieldCheck className="w-4 h-4" />
              <span>دخول المدير</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setStaffTab('moderator');
                setError(null);
              }}
              className={`min-h-[40px] rounded-lg font-bold flex items-center justify-center gap-1.5 transition-all ${
                staffTab === 'moderator'
                  ? 'bg-white dark:bg-stone-900 text-emerald-700 dark:text-emerald-400 shadow-sm'
                  : 'text-stone-500'
              }`}
            >
              <UserCheck className="w-4 h-4" />
              <span>دخول المشرف</span>
            </button>
          </div>

          <form onSubmit={handleLoginStaff} className="space-y-3 text-xs">
            {staffTab === 'admin' ? (
              <>
                <div className="flex items-center gap-2 text-stone-600 dark:text-stone-300">
                  <KeyRound className="w-4 h-4 text-amber-500 shrink-0" />
                  <span className="font-bold">دخول مدير التطبيق (عمر الشرجي):</span>
                </div>
                <input
                  type="password"
                  value={adminPassword}
                  onChange={(e) => setAdminPassword(e.target.value)}
                  placeholder="أدخل كلمة سر المدير"
                  autoComplete="current-password"
                  className="min-h-[44px] w-full px-3 py-2.5 rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-stone-900 dark:text-white"
                />
              </>
            ) : (
              <>
                <div className="flex items-center gap-2 text-stone-600 dark:text-stone-300">
                  <UserCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span className="font-bold">دخول مشرف المجتمع والدردشة:</span>
                </div>
                <input
                  type="text"
                  value={modUsername}
                  onChange={(e) => setModUsername(e.target.value)}
                  placeholder="اسم مستخدم المشرف (مثال: salim_mod)"
                  autoComplete="username"
                  className="min-h-[44px] w-full px-3 py-2.5 rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-stone-900 dark:text-white"
                />
                <input
                  type="password"
                  value={modPassword}
                  onChange={(e) => setModPassword(e.target.value)}
                  placeholder="كلمة سر المشرف"
                  autoComplete="current-password"
                  className="min-h-[44px] w-full px-3 py-2.5 rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-stone-900 dark:text-white"
                />
              </>
            )}

            {error && (
              <div className="p-2.5 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-[11px] text-red-700 dark:text-red-300 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="min-h-[44px] w-full px-4 py-2.5 rounded-xl bg-stone-900 text-white dark:bg-emerald-700 font-bold hover:bg-stone-800 disabled:opacity-60 transition-colors"
            >
              {loading
                ? 'جاري التحقق الآمن...'
                : staffTab === 'admin'
                  ? 'دخول كمدير التطبيق'
                  : 'دخول كمشرف'}
            </button>
          </form>
        </div>

        {/* Logout action */}
        {(currentUser.isAdmin || currentUser.isModerator || !currentUser.id.startsWith('guest-')) && (
          <div className="pt-2 border-t border-stone-100 dark:border-stone-800 flex justify-between items-center text-xs">
            <span className="text-stone-400">تسجيل الخروج من الحساب</span>
            <button
              type="button"
              onClick={handleLogout}
              className="min-h-[44px] px-2 text-red-500 hover:underline flex items-center gap-1 font-semibold"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>تسجيل الخروج والعودة كزائر</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

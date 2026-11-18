import React, { useState } from 'react';
import { X, ShieldCheck, LogOut, KeyRound, AlertCircle, Loader2 } from 'lucide-react';
import { UserProfile } from '../types/index.ts';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: UserProfile;
  onSwitchUser: (newUser: UserProfile, options?: { mustChangePassword?: boolean }) => void;
}

export const LoginModal: React.FC<LoginModalProps> = ({ isOpen, onClose, currentUser, onSwitchUser }) => {
  const [staffTab, setStaffTab] = useState<'admin' | 'moderator'>('admin');
  const [adminPassword, setAdminPassword] = useState('');
  const [modUsername, setModUsername] = useState('');
  const [modPassword, setModPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleLoginStaff = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    const password = staffTab === 'admin' ? adminPassword.trim() : modPassword.trim();
    if (!password || (staffTab === 'moderator' && !modUsername.trim())) {
      setError(staffTab === 'admin' ? 'يرجى إدخال كلمة سر المدير.' : 'يرجى إدخال اسم المستخدم وكلمة السر للمشرف.');
      return;
    }

    setLoading(true);
    try {
      const payload = staffTab === 'admin'
        ? { mode: 'admin', password }
        : { mode: 'moderator', username: modUsername.trim(), password };
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await response.json();
      if (!response.ok || !data.success) {
        setError(data.error || 'تعذر التحقق من بيانات الدخول.');
        return;
      }

      localStorage.setItem('farmer_admin_token', data.token);
      localStorage.setItem('farmer_staff_role', data.role || staffTab);
      if (data.mustChangePassword) localStorage.setItem('farmer_force_pw_change', '1');
      else localStorage.removeItem('farmer_force_pw_change');

      if (data.role === 'moderator') {
        onSwitchUser({
          ...currentUser,
          id: data.user?.id || 'mod-user',
          name: data.user?.name || modUsername,
          role: 'مشرف',
          governorate: 'سلطنة عُمان',
          wilayat: 'مسقط',
          isAdmin: false,
          isModerator: true,
        });
      } else {
        onSwitchUser({
          ...currentUser,
          id: data.user?.id || 'admin-omar',
          name: data.user?.name || 'مدير التطبيق',
          role: 'مدير التطبيق',
          governorate: 'سلطنة عُمان',
          wilayat: 'مسقط',
          isAdmin: true,
          isModerator: true,
          rank: 1,
        }, { mustChangePassword: Boolean(data.mustChangePassword) });
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

  const handleLogout = async () => {
    const token = localStorage.getItem('farmer_admin_token');
    if (token) {
      try {
        await fetch('/api/auth/logout', { method: 'POST', headers: { 'x-admin-token': token } });
      } catch {
        // Local credentials are cleared even if the network is unavailable.
      }
    }
    localStorage.removeItem('farmer_admin_token');
    localStorage.removeItem('farmer_staff_role');
    localStorage.removeItem('farmer_force_pw_change');
    onSwitchUser({
      ...currentUser,
      id: 'guest-' + Date.now(),
      name: '',
      role: 'مزارع',
      isAdmin: false,
      isModerator: false,
    });
    onClose();
  };

  const isStaff = currentUser.isAdmin || currentUser.isModerator;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm">
      <section className="w-full max-w-md rounded-3xl border border-slate-200 dark:border-sky-300/15 bg-white dark:bg-[#0e1936] p-5 sm:p-6 shadow-2xl space-y-5 text-slate-900 dark:text-white">
        <header className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400 flex items-center justify-center"><ShieldCheck className="w-5 h-5" /></span>
            <div>
              <h2 className="font-extrabold text-base">دخول الإدارة والمشرفين</h2>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">استخدام التطبيق الزراعي متاح للجميع دون تسجيل دخول</p>
            </div>
          </div>
          <button type="button" onClick={onClose} aria-label="إغلاق" className="min-w-10 min-h-10 rounded-xl hover:bg-slate-100 dark:hover:bg-white/10 flex items-center justify-center"><X className="w-5 h-5" /></button>
        </header>

        {isStaff ? (
          <div className="space-y-3">
            <p className="text-sm">تم الدخول بصفة <strong>{currentUser.role}</strong>.</p>
            <button type="button" onClick={handleLogout} className="w-full min-h-11 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-sm flex items-center justify-center gap-2"><LogOut className="w-4 h-4" /> تسجيل خروج الإدارة</button>
          </div>
        ) : (
          <form onSubmit={handleLoginStaff} className="space-y-4">
            <div className="grid grid-cols-2 gap-1.5 rounded-xl bg-slate-100 dark:bg-[#132247] p-1">
              <button type="button" onClick={() => { setStaffTab('admin'); setError(null); }} className={`min-h-10 rounded-lg text-xs font-bold ${staffTab === 'admin' ? 'bg-white dark:bg-slate-900 text-emerald-700 shadow-sm' : 'text-slate-500'}`}>مدير التطبيق</button>
              <button type="button" onClick={() => { setStaffTab('moderator'); setError(null); }} className={`min-h-10 rounded-lg text-xs font-bold ${staffTab === 'moderator' ? 'bg-white dark:bg-slate-900 text-emerald-700 shadow-sm' : 'text-slate-500'}`}>المشرف</button>
            </div>

            {staffTab === 'moderator' && (
              <label className="block space-y-1.5 text-xs font-semibold">
                <span>اسم المستخدم</span>
                <input value={modUsername} onChange={(e) => setModUsername(e.target.value)} autoComplete="username" className="w-full min-h-11 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-[#132247] px-3 text-sm" placeholder="اسم المستخدم" />
              </label>
            )}
            <label className="block space-y-1.5 text-xs font-semibold">
              <span>{staffTab === 'admin' ? 'كلمة سر المدير' : 'كلمة السر'}</span>
              <span className="relative block">
                <KeyRound className="absolute right-3 top-3.5 w-4 h-4 text-slate-400" />
                <input type="password" value={staffTab === 'admin' ? adminPassword : modPassword} onChange={(e) => staffTab === 'admin' ? setAdminPassword(e.target.value) : setModPassword(e.target.value)} autoComplete="current-password" className="w-full min-h-11 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-[#132247] pr-10 pl-3 text-sm" placeholder="••••••••" />
              </span>
            </label>

            {error && <div role="alert" className="rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 p-3 text-xs text-rose-700 dark:text-rose-300 flex gap-2"><AlertCircle className="w-4 h-4 shrink-0" />{error}</div>}
            <button type="submit" disabled={loading} className="w-full min-h-11 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-60 text-white font-bold text-sm flex items-center justify-center gap-2">
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
              {loading ? 'جارٍ التحقق…' : 'دخول آمن'}
            </button>
          </form>
        )}
      </section>
    </div>
  );
};

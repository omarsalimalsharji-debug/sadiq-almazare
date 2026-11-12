import React, { useState } from 'react';
import { 
  X, 
  LogIn, 
  LogOut, 
  ShieldCheck, 
  User, 
  Lock, 
  CheckCircle2, 
  AlertCircle 
} from 'lucide-react';
import { UserProfile } from '../types/index.ts';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: UserProfile;
  onSwitchUser: (newUser: UserProfile) => void;
}

export const LoginModal: React.FC<LoginModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onSwitchUser
}) => {
  const [adminPin, setAdminPin] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleLoginAsAdmin = (e: React.FormEvent) => {
    e.preventDefault();
    // Default PIN: 2026 or "عمر"
    if (adminPin === '2026' || adminPin.trim() === 'عمر') {
      onSwitchUser({
        ...currentUser,
        id: 'admin-omar',
        name: 'عمر الشرجي (صاحب الفكرة والمدير العام)',
        role: 'مدير التطبيق',
        governorate: 'محافظة مسقط',
        wilayat: 'مسقط',
        isAdmin: true,
        rank: 1
      });
      setError(null);
      setAdminPin('');
      onClose();
    } else {
      setError('رمز الدخول الإداري غير صحيح (رمز التجربة السريع: 2026)');
    }
  };

  const handleLoginAsFarmer = () => {
    onSwitchUser({
      ...currentUser,
      id: 'usr-farmer-1',
      name: 'سالم بن سعيد الحارثي',
      role: 'مزارع',
      governorate: 'محافظة الداخلية',
      wilayat: 'نزوى',
      isAdmin: false
    });
    onClose();
  };

  const handleLoginAsEngineer = () => {
    onSwitchUser({
      ...currentUser,
      id: 'usr-eng-1',
      name: 'المهندس / أحمد المعمري',
      role: 'مهندس زراعي',
      governorate: 'محافظة شمال الباطنة',
      wilayat: 'صحار',
      isAdmin: false
    });
    onClose();
  };

  const handleLogout = () => {
    onSwitchUser({
      ...currentUser,
      id: 'guest-' + Date.now(),
      name: 'مزارع عماني (زائر)',
      role: 'مزارع',
      isAdmin: false
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-950/70 backdrop-blur-sm">
      <div className="bg-white dark:bg-stone-900 rounded-3xl w-full max-w-md p-6 border border-stone-200 dark:border-stone-800 shadow-2xl space-y-5 text-stone-900 dark:text-stone-100">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-stone-100 dark:border-stone-800 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400 flex items-center justify-center">
              <LogIn className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-sm">
                تسجيل الدخول وتبديل الحساب
              </h3>
              <span className="text-[11px] text-stone-400">
                الحساب الحالي: {currentUser.name}
              </span>
            </div>
          </div>

          <button onClick={onClose} className="p-1 rounded-lg text-stone-400 hover:text-stone-700 dark:hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Roles Quick Switch */}
        <div className="space-y-2 text-xs">
          <div className="font-semibold text-stone-600 dark:text-stone-300">
            اختر حساب الدخول:
          </div>

          <button
            type="button"
            onClick={handleLoginAsFarmer}
            className="w-full p-3 rounded-xl border border-stone-200 dark:border-stone-700 hover:border-emerald-500 text-right flex items-center justify-between transition-colors bg-stone-50/50 dark:bg-stone-800/40"
          >
            <div>
              <div className="font-bold">سالم الحارثي (مزارع - نزوى)</div>
              <div className="text-[11px] text-stone-500">مستخدم عام، يشارك في الألعاب ويتصفح المكتبة</div>
            </div>
            <User className="w-4 h-4 text-emerald-600" />
          </button>

          <button
            type="button"
            onClick={handleLoginAsEngineer}
            className="w-full p-3 rounded-xl border border-stone-200 dark:border-stone-700 hover:border-emerald-500 text-right flex items-center justify-between transition-colors bg-stone-50/50 dark:bg-stone-800/40"
          >
            <div>
              <div className="font-bold">م. أحمد المعمري (مهندس زراعي - صحار)</div>
              <div className="text-[11px] text-stone-500">إرشاد زراعي وإجابة على استفسارات المجتمع</div>
            </div>
            <User className="w-4 h-4 text-cyan-600" />
          </button>
        </div>

        {/* Admin Login with PIN */}
        <div className="pt-2 border-t border-stone-100 dark:border-stone-800">
          <form onSubmit={handleLoginAsAdmin} className="space-y-3 text-xs">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-amber-500" />
              <span className="font-bold">دخول مدير التطبيق (عمر الشرجي):</span>
            </div>

            <div className="flex gap-2">
              <input
                type="password"
                value={adminPin}
                onChange={e => setAdminPin(e.target.value)}
                placeholder="أدخل رمز المدير (الرمز السريع: 2026)"
                className="flex-1 p-2.5 rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-stone-900 dark:text-white"
              />
              <button
                type="submit"
                className="px-4 py-2.5 rounded-xl bg-stone-900 text-white dark:bg-emerald-700 font-bold hover:bg-stone-800"
              >
                دخول كمدير
              </button>
            </div>

            {error && (
              <div className="text-[11px] text-red-500 flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                <span>{error}</span>
              </div>
            )}
          </form>
        </div>

        {/* Logout action */}
        {currentUser.isAdmin && (
          <div className="pt-2 border-t border-stone-100 dark:border-stone-800 flex justify-between items-center text-xs">
            <span className="text-stone-400">أنت مسجل حالياً كمدير</span>
            <button
              onClick={handleLogout}
              className="text-red-500 hover:underline flex items-center gap-1 font-semibold"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>تسجيل الخروج والعودة كمزارع</span>
            </button>
          </div>
        )}

      </div>
    </div>
  );
};

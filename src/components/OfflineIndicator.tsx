import React from 'react';
import { WifiOff } from 'lucide-react';
import { useOnlineStatus } from '../hooks/useOnlineStatus.ts';

export const OfflineIndicator: React.FC = () => {
  const isOnline = useOnlineStatus();

  if (isOnline) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed bottom-20 sm:bottom-4 left-4 right-4 sm:right-auto z-50 flex items-center justify-center sm:justify-start gap-2 rounded-xl bg-amber-600 px-3.5 py-2.5 text-xs font-bold text-white shadow-lg border border-amber-400/50"
    >
      <WifiOff className="w-4 h-4 shrink-0 animate-pulse" />
      <span>وضع عدم الاتصال — يتم عرض البيانات المحفوظة مؤقتاً</span>
    </div>
  );
};

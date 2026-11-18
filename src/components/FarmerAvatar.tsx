import React from 'react';
import { Sprout, Leaf, TreePalm, Tractor, Shovel, Wheat, Flower2, Droplets } from 'lucide-react';

export const FARMER_AVATARS = [
  { id: 'palm', label: 'نخلة عُمانية', Icon: TreePalm, shell: 'from-emerald-500 to-teal-800', glow: 'bg-amber-300/25' },
  { id: 'farmer', label: 'المزارع', Icon: Sprout, shell: 'from-lime-500 to-emerald-800', glow: 'bg-lime-200/25' },
  { id: 'leaf', label: 'ورقة خضراء', Icon: Leaf, shell: 'from-green-500 to-emerald-900', glow: 'bg-emerald-200/25' },
  { id: 'tractor', label: 'الآلة الزراعية', Icon: Tractor, shell: 'from-amber-500 to-orange-800', glow: 'bg-yellow-200/25' },
  { id: 'soil', label: 'خدمة التربة', Icon: Shovel, shell: 'from-orange-500 to-amber-900', glow: 'bg-amber-200/25' },
  { id: 'harvest', label: 'موسم الحصاد', Icon: Wheat, shell: 'from-yellow-500 to-amber-800', glow: 'bg-yellow-100/25' },
  { id: 'flower', label: 'زهرة المزرعة', Icon: Flower2, shell: 'from-pink-500 to-rose-800', glow: 'bg-pink-200/25' },
  { id: 'water', label: 'مياه الري', Icon: Droplets, shell: 'from-sky-500 to-blue-900', glow: 'bg-cyan-200/25' },
] as const;

interface FarmerAvatarProps {
  seed?: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const FarmerAvatar: React.FC<FarmerAvatarProps> = ({ seed = 'palm', size = 'md', className = '' }) => {
  const avatar = FARMER_AVATARS.find((item) => item.id === seed) || FARMER_AVATARS[0];
  const Icon = avatar.Icon;
  const dimensions = size === 'lg' ? 'w-20 h-20 rounded-[1.6rem]' : size === 'sm' ? 'w-10 h-10 rounded-xl' : 'w-16 h-16 rounded-2xl';
  const iconSize = size === 'lg' ? 36 : size === 'sm' ? 20 : 28;
  return (
    <div className={`relative ${dimensions} shrink-0 overflow-hidden bg-gradient-to-br ${avatar.shell} text-white shadow-lg ring-1 ring-white/25 ${className}`} role="img" aria-label={avatar.label}>
      <div className={`absolute -right-3 -top-3 w-12 h-12 rounded-full blur-md ${avatar.glow}`} />
      <div className="absolute inset-0 flex items-center justify-center">
        <Icon size={iconSize} strokeWidth={1.8} />
      </div>
      <div className="absolute bottom-1 left-1 w-2 h-2 rounded-full bg-white/70" />
    </div>
  );
};

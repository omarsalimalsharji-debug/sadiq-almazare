import React from 'react';
import { Volume2, Bot } from 'lucide-react';

interface FarmFlijanAdvisorBarProps {
  flijanAvatarUrl: string;
  flijanSpeaking: boolean;
  flijanTip: string;
  regionLabel: string;
  onToggleSpeak: () => void;
  onOpenAdvisor: () => void;
  onClose: () => void;
}

export const FarmFlijanAdvisorBar: React.FC<FarmFlijanAdvisorBarProps> = ({
  flijanAvatarUrl,
  flijanSpeaking,
  flijanTip,
  regionLabel,
  onToggleSpeak,
  onOpenAdvisor,
  onClose,
}) => {
  return (
    <div className="absolute top-20 sm:top-16 right-2.5 z-20 pointer-events-auto max-w-[270px] sm:max-w-xs">
      <div className="rounded-2xl bg-[#0b1329]/95 border border-emerald-400/40 p-2.5 shadow-xl flex items-start gap-2 text-white">
        <div className="relative shrink-0">
          <img
            src={flijanAvatarUrl}
            alt="فليجان"
            className={`w-10 h-10 rounded-full object-cover object-top border-2 transition-colors ${
              flijanSpeaking ? 'border-amber-400' : 'border-emerald-400'
            }`}
          />
        </div>
        <div className="min-w-0 flex-1 space-y-1">
          <div className="flex items-center justify-between gap-1">
            <div className="min-w-0">
              <span className="text-[10px] font-extrabold text-emerald-300 block truncate">
                فليجان المرشد · {regionLabel}
              </span>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <button
                onClick={onToggleSpeak}
                className={`min-h-[28px] px-2 py-0.5 rounded-md text-[10px] font-bold flex items-center gap-0.5 ${
                  flijanSpeaking ? 'bg-amber-500 text-stone-950' : 'bg-emerald-600/85 text-white'
                }`}
                title="استمع لصوت فليجان"
              >
                <Volume2 className="w-3 h-3" />
                <span>{flijanSpeaking ? 'إيقاف' : 'اسمع'}</span>
              </button>
              <button
                onClick={onOpenAdvisor}
                className="min-h-[28px] px-1.5 py-0.5 rounded-md bg-purple-600/80 hover:bg-purple-500 text-white text-[10px] font-bold flex items-center"
                title="اسأل المستشار"
                aria-label="اسأل المستشار"
              >
                <Bot className="w-3 h-3" />
              </button>
              <button
                onClick={onClose}
                className="min-h-[28px] min-w-[24px] text-sky-300/75 hover:text-white px-1 text-sm leading-none flex items-center justify-center"
                title="تصغير"
                aria-label="تصغير مرشد المزرعة"
              >
                ×
              </button>
            </div>
          </div>
          <p className="text-[11px] text-sky-100 leading-relaxed line-clamp-3">{flijanTip}</p>
        </div>
      </div>
    </div>
  );
};

import React, { useState } from 'react';
import { 
  Calendar as CalendarIcon, 
  Sun, 
  CloudRain, 
  AlertCircle, 
  CheckCircle2, 
  Leaf, 
  Sprout 
} from 'lucide-react';
import { OMAN_AGRICULTURAL_CALENDAR } from '../data/agriculturalData.ts';

export const CalendarView: React.FC = () => {
  const [selectedMonthIdx, setSelectedMonthIdx] = useState<number>(() => {
    // Current month index (0 to 11)
    return new Date().getMonth();
  });

  const monthData = OMAN_AGRICULTURAL_CALENDAR[selectedMonthIdx] || OMAN_AGRICULTURAL_CALENDAR[0];

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      
      {/* Header */}
      <div className="border-b border-stone-200 dark:border-stone-800 pb-4">
        <div className="flex items-center gap-2 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
          <CalendarIcon className="w-4 h-4" />
          <span>المواسم الزراعية في سلطنة عُمان</span>
        </div>
        <h1 className="text-2xl font-bold text-stone-900 dark:text-white mt-1">
          التقويم الزراعي ومواعيد الزراعة والخدمة
        </h1>
        <p className="text-xs sm:text-sm text-stone-600 dark:text-stone-400 mt-0.5">
          دليل زمني شامل يحدد مواعيد تلقيح النخيل، جداد القيظ، زراعة القمح، حصاد الخضروات، وصيانة الأفلاج.
        </p>
      </div>

      {/* Month Switcher Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-2">
        {OMAN_AGRICULTURAL_CALENDAR.map((item, idx) => {
          const isSelected = idx === selectedMonthIdx;
          return (
            <button
              key={idx}
              onClick={() => setSelectedMonthIdx(idx)}
              className={`p-3 rounded-xl border text-center transition-all ${
                isSelected
                  ? 'bg-emerald-600 text-white border-emerald-600 shadow-md font-bold'
                  : 'bg-white dark:bg-stone-900 text-stone-700 dark:text-stone-300 border-stone-200 dark:border-stone-800 hover:border-emerald-300 text-xs'
              }`}
            >
              <div className="font-semibold text-xs truncate">
                {item.month.split(' ')[0]}
              </div>
              <div className={`text-[10px] mt-0.5 ${isSelected ? 'text-emerald-100' : 'text-stone-400'}`}>
                {item.season}
              </div>
            </button>
          );
        })}
      </div>

      {/* Selected Month Detail Card */}
      <div className="bg-white dark:bg-stone-900 rounded-3xl border border-stone-200 dark:border-stone-800 p-6 sm:p-8 shadow-sm space-y-6">
        
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-stone-100 dark:border-stone-800 pb-4">
          <div>
            <span className="text-xs font-bold px-3 py-1 rounded-md bg-emerald-50 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300">
              {monthData.season}
            </span>
            <h2 className="text-2xl font-bold text-stone-900 dark:text-white mt-2">
              جدول الأعمال الزراعية لشهر {monthData.month}
            </h2>
          </div>

          <div className="text-xs text-stone-400 font-mono">
            الشهر {selectedMonthIdx + 1} من 12
          </div>
        </div>

        {/* Major Activities List */}
        <div className="space-y-3">
          <h3 className="text-xs font-bold text-stone-800 dark:text-stone-200 flex items-center gap-2">
            <Sprout className="w-4 h-4 text-emerald-600" />
            <span>المهام والعمليات الحقلية ذات الأولوية هذا الشهر:</span>
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {monthData.activities.map((act, idx) => (
              <div
                key={idx}
                className="p-3.5 rounded-xl bg-stone-50 dark:bg-stone-800/40 border border-stone-200/60 dark:border-stone-700/60 flex items-start gap-3 text-xs sm:text-sm text-stone-700 dark:text-stone-300"
              >
                <div className="w-6 h-6 rounded-lg bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300 flex items-center justify-center font-bold text-xs shrink-0 font-mono">
                  {idx + 1}
                </div>
                <span className="leading-relaxed">{act}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Precautions Alert */}
        <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-300/40 text-xs sm:text-sm text-amber-950 dark:text-amber-200 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <strong className="block font-bold mb-0.5 text-amber-800 dark:text-amber-300">
              تنبيهات ومحاذير هذا الشهر:
            </strong>
            <p className="leading-relaxed">{monthData.precautions}</p>
          </div>
        </div>

      </div>

    </div>
  );
};

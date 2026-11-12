import React, { useState } from 'react';
import { 
  Radio as RadioIcon, 
  Play, 
  Pause, 
  Volume2, 
  VolumeX, 
  RefreshCw,
  Signal,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { RADIO_STATIONS, RadioStation } from '../data/agriculturalData.ts';
import { useAudio } from '../context/AudioContext.tsx';

export const RadioPlayer: React.FC = () => {
  const { 
    trackType,
    currentRadio, 
    isPlaying, 
    playbackStatus,
    playRadio, 
    togglePlay, 
    volume, 
    setVolume, 
    isMuted, 
    toggleMute,
    errorMessage
  } = useAudio();

  const [stations] = useState<RadioStation[]>(RADIO_STATIONS);
  
  // Selected station
  const activeStation = currentRadio || stations[0];
  const isThisRadioPlaying = isPlaying && trackType === 'radio';

  const handleStationClick = (st: RadioStation) => {
    playRadio(st.id);
  };

  return (
    <div className="rounded-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 p-5 sm:p-6 shadow-sm">
      <div className="flex flex-col md:flex-row items-center justify-between gap-5 border-b border-stone-100 dark:border-stone-800 pb-5">
        
        {/* Station Logo & Information */}
        <div className="flex items-center gap-4 w-full md:w-auto text-right">
          <div className="w-14 h-14 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 flex items-center justify-center text-emerald-700 dark:text-emerald-400 font-bold shrink-0 shadow-sm text-center p-1 leading-tight text-xs">
            {activeStation.logoText}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold px-2 py-0.5 rounded bg-emerald-100 dark:bg-emerald-900/40 text-emerald-800 dark:text-emerald-300">
                {activeStation.category}
              </span>
              <div className="flex items-center gap-1.5 text-xs text-stone-500 dark:text-stone-400">
                <Signal className={`w-3.5 h-3.5 ${isThisRadioPlaying ? 'text-emerald-500 animate-pulse' : 'text-stone-400'}`} />
                <span>
                  {playbackStatus === 'buffering' && trackType === 'radio'
                    ? 'جاري الاتصال بالبث...'
                    : isThisRadioPlaying
                    ? 'البث المباشر يعمل بجودة عالية'
                    : 'جاهز للبث المباشر'}
                </span>
              </div>
            </div>
            <h3 className="text-lg font-bold text-stone-900 dark:text-white mt-1">
              {activeStation.name}
            </h3>
            <p className="text-xs text-stone-500 dark:text-stone-400">
              {activeStation.subtitle}
            </p>
          </div>
        </div>

        {/* Audio Player Controls */}
        <div className="flex items-center gap-4 w-full md:w-auto justify-end">
          <button
            onClick={() => {
              if (trackType === 'radio') {
                togglePlay();
              } else {
                playRadio(activeStation.id);
              }
            }}
            className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold flex items-center gap-2.5 shadow-md transition-transform hover:scale-102 active:scale-98 text-sm"
          >
            {playbackStatus === 'buffering' && trackType === 'radio' ? (
              <>
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>جاري الاتصال...</span>
              </>
            ) : isThisRadioPlaying ? (
              <>
                <Pause className="w-4 h-4 fill-current" />
                <span>إيقاف البث</span>
              </>
            ) : (
              <>
                <Play className="w-4 h-4 fill-current" />
                <span>استماع مباشر</span>
              </>
            )}
          </button>

          {/* Volume Control */}
          <div className="flex items-center gap-2">
            <button 
              onClick={toggleMute}
              className="text-stone-500 hover:text-stone-900 dark:text-stone-400 dark:hover:text-white"
            >
              {isMuted ? <VolumeX className="w-4 h-4 text-red-500" /> : <Volume2 className="w-4 h-4" />}
            </button>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={isMuted ? 0 : volume}
              onChange={(e) => setVolume(Number(e.target.value))}
              className="w-24 accent-emerald-600 h-1.5 bg-stone-200 dark:bg-stone-700 rounded cursor-pointer"
            />
          </div>
        </div>

      </div>

      {errorMessage && trackType === 'radio' && (
        <div className="mt-3 p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 rounded-xl text-xs text-red-700 dark:text-red-300 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Stations List Grid */}
      <div className="mt-5">
        <div className="text-xs font-semibold text-stone-500 dark:text-stone-400 mb-3">
          الإذاعات المتوفرة للبث المباشر في سلطنة عُمان:
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {stations.map((st) => {
            const isSelected = st.id === activeStation.id;
            const isPlayingThis = isSelected && isThisRadioPlaying;
            return (
              <button
                key={st.id}
                onClick={() => handleStationClick(st)}
                className={`p-3 rounded-xl text-right transition-all border text-xs flex flex-col justify-between ${
                  isSelected 
                    ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-500 text-emerald-950 dark:text-emerald-200 shadow-sm' 
                    : 'bg-stone-50 dark:bg-stone-800/60 border-stone-200 dark:border-stone-700 text-stone-700 dark:text-stone-300 hover:border-emerald-300'
                }`}
              >
                <div className="flex items-center justify-between w-full mb-1">
                  <span className="font-bold">{st.name}</span>
                  {isPlayingThis ? (
                    <span className="flex h-2 w-2 relative">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                    </span>
                  ) : (
                    <span className="text-[10px] text-stone-400">بث مباشر</span>
                  )}
                </div>
                <div className="text-[11px] text-stone-500 dark:text-stone-400 line-clamp-1">
                  {st.subtitle}
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};

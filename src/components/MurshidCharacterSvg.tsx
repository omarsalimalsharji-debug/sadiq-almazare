import React, { useId } from 'react';
import { MurshidExpression } from '../data/murshidDialogue.ts';

export type LegacyMurshidMood = 'idle' | 'happy' | 'encouraging' | 'thinking' | 'celebrating';
export type MurshidMood = MurshidExpression | LegacyMurshidMood;

export function normalizeMurshidExpression(
  expression?: MurshidExpression,
  mood?: MurshidMood
): MurshidExpression {
  const raw = expression || mood || 'idle';
  switch (raw) {
    case 'happy':
      return 'smile';
    case 'encouraging':
      return 'encourage';
    case 'thinking':
      return 'think';
    case 'celebrating':
      return 'celebrate';
    default:
      return raw as MurshidExpression;
  }
}

interface MurshidCharacterSvgProps {
  expression?: MurshidExpression;
  mood?: MurshidMood;
  isSpeaking?: boolean;
  className?: string;
}

/**
 * «مُرشد» — الشخصية الكرتونية الرسمية الحديثة لتطبيق صديق المزارع (عُمان)
 * تصميم عصري بالكامل: قبعة زراعية عمانية، سترة حقلية خضراء بشعار النبتة، أطراف متفاعلة، و10 تعابير واضحة.
 */
export const MurshidCharacterSvg: React.FC<MurshidCharacterSvgProps> = ({
  expression,
  mood,
  isSpeaking = false,
  className = 'w-28 h-28',
}) => {
  const uid = useId().replace(/:/g, '');
  const activeExpr = normalizeMurshidExpression(expression, mood);

  const isTalking = isSpeaking || activeExpr === 'speak';
  const isWelcome = activeExpr === 'welcome';
  const isCelebrate = activeExpr === 'celebrate';
  const isThink = activeExpr === 'think';
  const isSurprised = activeExpr === 'surprised';
  const isGentleSad = activeExpr === 'gentle_sad';
  const isExplain = activeExpr === 'explain';
  const isEncourage = activeExpr === 'encourage';

  return (
    <div className={`relative inline-flex items-center justify-center select-none ${className}`}>
      <style>{`
        @keyframes murshidBreath {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-3px); }
        }
        @keyframes murshidEyeBlink {
          0%, 91%, 100% { transform: scaleY(1); }
          95% { transform: scaleY(0.12); }
        }
        @keyframes murshidMouthTalk {
          0%, 100% { transform: scaleY(0.5); }
          50% { transform: scaleY(1.22); }
        }
        @keyframes murshidRightWave {
          0%, 100% { transform: rotate(0deg); }
          50% { transform: rotate(-16deg); }
        }
        @keyframes murshidExplainArm {
          0%, 100% { transform: rotate(0deg); }
          50% { transform: rotate(10deg); }
        }
        .m-breath { animation: murshidBreath 3.1s ease-in-out infinite; }
        .m-blink { transform-box: fill-box; transform-origin: center; animation: murshidEyeBlink 4.1s ease-in-out infinite; }
        .m-talk { transform-box: fill-box; transform-origin: center; animation: murshidMouthTalk 0.23s ease-in-out infinite; }
        .m-wave { transform-box: fill-box; transform-origin: 85% 85%; animation: murshidRightWave 1s ease-in-out infinite; }
        .m-explain { transform-box: fill-box; transform-origin: 15% 25%; animation: murshidExplainArm 1.4s ease-in-out infinite; }
      `}</style>

      <svg
        viewBox="0 0 200 215"
        className="w-full h-full m-breath drop-shadow-md"
        role="img"
        aria-label="شخصية مرشد الزراعية"
      >
        <defs>
          <radialGradient id={`halo-${uid}`} cx="50%" cy="46%" r="50%">
            <stop offset="0%" stopColor={isGentleSad ? '#cbd5e1' : '#d1fae5'} stopOpacity="0.92" />
            <stop offset="100%" stopColor="#0f766e" stopOpacity="0.08" />
          </radialGradient>
          <linearGradient id={`vest-${uid}`} x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#10b981" />
            <stop offset="55%" stopColor="#047857" />
            <stop offset="100%" stopColor="#064e3b" />
          </linearGradient>
          <linearGradient id={`hat-${uid}`} x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#ead2a4" />
            <stop offset="100%" stopColor="#c69c5b" />
          </linearGradient>
          <linearGradient id={`shirt-${uid}`} x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#ffffff" />
            <stop offset="100%" stopColor="#e2e8f0" />
          </linearGradient>
        </defs>

        {/* Clean background halo matching app identity */}
        <circle cx="100" cy="108" r="88" fill={`url(#halo-${uid})`} />

        {/* Celebrate Sparkles / Surprised Accent */}
        {isCelebrate && (
          <g fill="#f59e0b">
            <path d="M24 52 L27 42 L30 52 L40 55 L30 58 L27 68 L24 58 L14 55 Z" />
            <path d="M170 46 L172 38 L174 46 L182 48 L174 50 L172 58 L170 50 L162 48 Z" />
            <circle cx="36" cy="126" r="4" fill="#10b981" />
            <circle cx="164" cy="122" r="4" fill="#fbbf24" />
          </g>
        )}

        {isSurprised && (
          <g fill="#f59e0b" opacity="0.9">
            <rect x="164" y="34" width="5" height="17" rx="2.5" transform="rotate(14 166 42)" />
            <circle cx="164" cy="57" r="3" />
          </g>
        )}

        {isThink && (
          <g fill="#94a3b8" opacity="0.75">
            <circle cx="160" cy="48" r="3.5" />
            <circle cx="170" cy="36" r="5" />
          </g>
        )}

        {/* Hat Back Brim */}
        <ellipse
          cx="100"
          cy="56"
          rx="62"
          ry="14"
          fill="#a97e42"
          stroke="#785323"
          strokeWidth="1.8"
        />

        {/* Shirt & Modern Field Vest Body */}
        <path
          d="M60 136 C60 120 76 113 100 113 C124 113 140 120 140 136 L146 196 C146 200 141 203 135 203 L65 203 C59 203 54 200 54 196 Z"
          fill={`url(#shirt-${uid})`}
          stroke="#cbd5e1"
          strokeWidth="1.8"
        />

        {/* Emerald Agricultural Field Vest */}
        <path
          d="M64 123 L84 115 L91 142 L91 203 L62 203 C59 203 57 200 57 196 Z"
          fill={`url(#vest-${uid})`}
          stroke="#064e3b"
          strokeWidth="1.5"
        />
        <path
          d="M136 123 L116 115 L109 142 L109 203 L138 203 C141 203 143 200 143 196 Z"
          fill={`url(#vest-${uid})`}
          stroke="#064e3b"
          strokeWidth="1.5"
        />

        {/* Collar Accent */}
        <path
          d="M84 115 L100 132 L116 115"
          fill="none"
          stroke="#047857"
          strokeWidth="2.8"
          strokeLinejoin="round"
        />
        {/* Modern Omani Geometric Placket Strip */}
        <line x1="100" y1="132" x2="100" y2="198" stroke="#cbd5e1" strokeWidth="2.2" />
        <path d="M97 148 L100 143 L103 148 L100 153 Z" fill="#f59e0b" />
        <path d="M97 166 L100 161 L103 166 L100 171 Z" fill="#10b981" />

        {/* Field Utility Pocket + Leaf Emblem on Vest */}
        <rect x="115" y="156" width="20" height="22" rx="4" fill="#065f46" stroke="#34d399" strokeWidth="1" />
        <path d="M121 150 C126 144 134 146 132 152 C128 156 122 154 121 150 Z" fill="#fbbf24" />

        {/* Right Arm (Viewer Left) */}
        {isWelcome || isCelebrate || isEncourage ? (
          <g className={isWelcome || isCelebrate ? 'm-wave' : ''}>
            <path
              d="M61 131 C44 131 32 113 30 92"
              fill="none"
              stroke="#ffffff"
              strokeWidth="13"
              strokeLinecap="round"
            />
            <path
              d="M61 131 C44 131 32 113 30 92"
              fill="none"
              stroke="#cbd5e1"
              strokeWidth="1.6"
              strokeLinecap="round"
            />
            <circle cx="29" cy="87" r="8" fill="#e2a573" stroke="#b57745" strokeWidth="1.5" />
          </g>
        ) : isThink ? (
          <g>
            <path
              d="M61 132 C46 138 56 116 74 106"
              fill="none"
              stroke="#ffffff"
              strokeWidth="12"
              strokeLinecap="round"
            />
            <circle cx="76" cy="105" r="7.5" fill="#e2a573" stroke="#b57745" strokeWidth="1.4" />
          </g>
        ) : (
          <g>
            <path
              d="M61 132 C46 142 42 158 45 170"
              fill="none"
              stroke="#ffffff"
              strokeWidth="12.5"
              strokeLinecap="round"
            />
            <circle cx="46" cy="172" r="7.5" fill="#e2a573" stroke="#b57745" strokeWidth="1.4" />
          </g>
        )}

        {/* Left Arm (Viewer Right) */}
        {isCelebrate ? (
          <g>
            <path
              d="M139 131 C156 131 168 113 170 92"
              fill="none"
              stroke="#ffffff"
              strokeWidth="13"
              strokeLinecap="round"
            />
            <circle cx="171" cy="87" r="8" fill="#e2a573" stroke="#b57745" strokeWidth="1.5" />
          </g>
        ) : isExplain || isTalking ? (
          <g className="m-explain">
            <path
              d="M139 131 C154 133 164 123 166 110"
              fill="none"
              stroke="#ffffff"
              strokeWidth="12.5"
              strokeLinecap="round"
            />
            <circle cx="167" cy="107" r="7.5" fill="#e2a573" stroke="#b57745" strokeWidth="1.4" />
            {/* Fresh Green Sprout Prop in Hand */}
            <line x1="167" y1="103" x2="170" y2="86" stroke="#15803d" strokeWidth="2.4" strokeLinecap="round" />
            <path d="M170 86 C162 81 162 74 170 78 Z" fill="#22c55e" />
            <path d="M170 86 C178 81 178 74 170 78 Z" fill="#16a34a" />
          </g>
        ) : (
          <g>
            <path
              d="M139 132 C154 142 157 157 153 169"
              fill="none"
              stroke="#ffffff"
              strokeWidth="12.5"
              strokeLinecap="round"
            />
            <circle cx="152" cy="171" r="7.5" fill="#e2a573" stroke="#b57745" strokeWidth="1.4" />
            {/* Small Sprout */}
            <line x1="152" y1="167" x2="155" y2="150" stroke="#15803d" strokeWidth="2.3" strokeLinecap="round" />
            <path d="M155 150 C148 145 148 139 155 142 Z" fill="#22c55e" />
            <path d="M155 150 C162 145 162 139 155 142 Z" fill="#16a34a" />
          </g>
        )}

        {/* Neck */}
        <rect x="91" y="99" width="18" height="20" rx="7" fill="#d99a67" />

        {/* Ears */}
        <ellipse cx="58" cy="79" rx="6.5" ry="9.5" fill="#d4915e" stroke="#b57745" strokeWidth="1.2" />
        <ellipse cx="142" cy="79" rx="6.5" ry="9.5" fill="#d4915e" stroke="#b57745" strokeWidth="1.2" />

        {/* Brand-New Friendly Face */}
        <rect
          x="60"
          y="40"
          width="80"
          height="69"
          rx="34"
          fill="#e7ad7b"
          stroke="#b57745"
          strokeWidth="1.6"
        />

        {/* Hair Sideburns & Temple Hair */}
        <path d="M61 65 Q61 50 72 49 L66 68 Z" fill="#1e293b" />
        <path d="M139 65 Q139 50 128 49 L134 68 Z" fill="#1e293b" />

        {/* Rosy Warm Cheeks (muted subtly when gentle_sad) */}
        <ellipse
          cx="73"
          cy="86"
          rx="7.5"
          ry="4.2"
          fill="#f43f5e"
          opacity={isGentleSad ? 0.1 : 0.24}
        />
        <ellipse
          cx="127"
          cy="86"
          rx="7.5"
          ry="4.2"
          fill="#f43f5e"
          opacity={isGentleSad ? 0.1 : 0.24}
        />

        {/* Modern Agricultural Hat with Omani Woven Band */}
        <g>
          <path
            d="M62 52 C63 26 79 18 100 18 C121 18 137 26 138 52 Z"
            fill={`url(#hat-${uid})`}
            stroke="#926a32"
            strokeWidth="1.8"
          />
          {/* Omani Emerald & Gold Geometric Ribbon */}
          <path d="M62 47 Q100 53 138 47 L138 54 Q100 60 62 54 Z" fill="#047857" />
          <path d="M95 50 L100 45 L105 50 L100 55 Z" fill="#fbbf24" />
          <path d="M78 49 L82 46 L86 49 L82 52 Z" fill="#fde68a" />
          <path d="M114 49 L118 46 L122 49 L118 52 Z" fill="#fde68a" />
          {/* Curved Sun-Guard Front Brim */}
          <path
            d="M39 55 Q100 67 161 55 Q100 59 39 55 Z"
            fill="#d9b77c"
            stroke="#926a32"
            strokeWidth="1.5"
          />
        </g>

        {/* Expressive Eyebrows for All 10 States */}
        {isSurprised ? (
          <>
            <path d="M71 58 Q80 50 89 56" fill="none" stroke="#1e293b" strokeWidth="3.2" strokeLinecap="round" />
            <path d="M111 56 Q120 50 129 58" fill="none" stroke="#1e293b" strokeWidth="3.2" strokeLinecap="round" />
          </>
        ) : isThink ? (
          <>
            <path d="M71 62 Q80 57 89 61" fill="none" stroke="#1e293b" strokeWidth="3" strokeLinecap="round" />
            <path d="M111 63 Q120 62 129 64" fill="none" stroke="#1e293b" strokeWidth="3" strokeLinecap="round" />
          </>
        ) : isGentleSad ? (
          <>
            <path d="M71 64 Q80 61 89 58" fill="none" stroke="#1e293b" strokeWidth="3" strokeLinecap="round" />
            <path d="M111 58 Q120 61 129 64" fill="none" stroke="#1e293b" strokeWidth="3" strokeLinecap="round" />
          </>
        ) : isCelebrate || isEncourage ? (
          <>
            <path d="M71 59 Q80 53 89 58" fill="none" stroke="#1e293b" strokeWidth="3.1" strokeLinecap="round" />
            <path d="M111 58 Q120 53 129 59" fill="none" stroke="#1e293b" strokeWidth="3.1" strokeLinecap="round" />
          </>
        ) : (
          <>
            <path d="M71 61 Q80 56 89 61" fill="none" stroke="#1e293b" strokeWidth="3" strokeLinecap="round" />
            <path d="M111 61 Q120 56 129 61" fill="none" stroke="#1e293b" strokeWidth="3" strokeLinecap="round" />
          </>
        )}

        {/* Blinking Expressive Eyes */}
        <g className="m-blink">
          <ellipse
            cx="80"
            cy="74"
            rx="7.5"
            ry={isSurprised ? 9.5 : 8}
            fill="#ffffff"
          />
          <circle cx="81" cy="74" r={isSurprised ? 3.8 : 4.5} fill="#1e293b" />
          <circle cx="82.7" cy="72" r="1.7" fill="#ffffff" />

          <ellipse
            cx="120"
            cy="74"
            rx="7.5"
            ry={isSurprised ? 9.5 : 8}
            fill="#ffffff"
          />
          <circle cx="119" cy="74" r={isSurprised ? 3.8 : 4.5} fill="#1e293b" />
          <circle cx="120.7" cy="72" r="1.7" fill="#ffffff" />
        </g>

        {/* Friendly Nose */}
        <path d="M98 79 Q100 84 103 81" fill="none" stroke="#b57745" strokeWidth="2.2" strokeLinecap="round" />

        {/* Dynamic Mouth across Speech + All 10 Expressions */}
        {isTalking ? (
          <ellipse
            cx="100"
            cy="95"
            rx="8.5"
            ry="5.8"
            fill="#881337"
            stroke="#4c0519"
            strokeWidth="1.2"
            className="m-talk"
          />
        ) : isSurprised ? (
          <ellipse cx="100" cy="95" rx="5.5" ry="6.2" fill="#881337" stroke="#4c0519" strokeWidth="1.5" />
        ) : isGentleSad ? (
          <path d="M89 98 Q100 91 111 98" fill="none" stroke="#4c0519" strokeWidth="2.5" strokeLinecap="round" />
        ) : isThink ? (
          <path d="M92 95 Q100 92 108 95" fill="none" stroke="#4c0519" strokeWidth="2.5" strokeLinecap="round" />
        ) : isCelebrate || isWelcome || isEncourage ? (
          <path d="M86 91 Q100 106 114 91 Z" fill="#881337" stroke="#4c0519" strokeWidth="1.4" />
        ) : (
          <path d="M89 92 Q100 100 111 92" fill="none" stroke="#4c0519" strokeWidth="2.7" strokeLinecap="round" />
        )}
      </svg>
    </div>
  );
};

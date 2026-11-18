import React from 'react';
import {
  PlantConditionKey,
  PlantIllustrationKey,
} from '../data/murshidAdventureData.ts';

interface PlantIllustrationProps {
  plantKey: PlantIllustrationKey;
  condition?: PlantConditionKey | 'healthy';
  className?: string;
}

/**
 * Clean, lightweight botanical SVG illustrations for Murshid's Agricultural Adventures.
 * Supports visual symptoms (thirsty, nutrient_low, pest_attack, overgrown) and instant healthy recovery!
 */
export const MurshidPlantIllustration: React.FC<PlantIllustrationProps> = ({
  plantKey,
  condition = 'healthy',
  className = 'w-40 h-40',
}) => {
  const isThirsty = condition === 'thirsty';
  const isYellow = condition === 'nutrient_low';
  const hasPests = condition === 'pest_attack';
  const isOvergrown = condition === 'overgrown';

  const leafPrimary = isYellow ? '#eab308' : isThirsty ? '#84cc16' : '#16a34a';
  const leafSecondary = isYellow ? '#ca8a04' : isThirsty ? '#65a30d' : '#15803d';
  const soilColor = isThirsty ? '#d6b48a' : '#784e2c';

  return (
    <svg
      viewBox="0 0 180 180"
      className={`${className} select-none drop-shadow-sm transition-all duration-500`}
      role="img"
      aria-label={plantKey}
    >
      {/* Background sky circle */}
      <circle cx="90" cy="86" r="76" fill={isThirsty ? '#fef3c7' : '#ecfdf5'} />

      {/* Ground / Soil mound */}
      <ellipse cx="90" cy="146" rx="58" ry="16" fill={soilColor} />
      {isThirsty && (
        <path
          d="M52 146 L62 142 L70 148 M104 143 L114 149 L124 144"
          stroke="#92400e"
          strokeWidth="1.6"
          fill="none"
          strokeLinecap="round"
        />
      )}

      {/* Botanical Illustration */}
      <g
        transform={isThirsty ? 'translate(0, 6) rotate(4 90 140)' : ''}
        className="transition-transform duration-500"
      >
        {plantKey === 'date_palm' && (
          <g>
            {/* Palm Trunk */}
            <path d="M84 144 Q87 104 86 68 L94 68 Q95 104 96 144 Z" fill="#92400e" />
            <path d="M85 128 L95 126 M86 112 L94 110 M86 96 L94 94 M86 80 L94 78" stroke="#78350f" strokeWidth="2" />
            {/* Fronds */}
            <path d="M90 68 Q56 44 38 64 Q62 56 88 70 Z" fill={leafPrimary} />
            <path d="M90 68 Q124 44 142 64 Q118 56 92 70 Z" fill={leafPrimary} />
            <path d="M90 66 Q58 22 44 34 Q70 36 88 66 Z" fill={leafSecondary} />
            <path d="M90 66 Q122 22 136 34 Q110 36 92 66 Z" fill={leafSecondary} />
            <path d="M90 64 Q90 22 90 18 Q98 34 92 64 Z" fill={leafPrimary} />
            {/* Golden Dates Clusters */}
            <circle cx="76" cy="76" r="4" fill="#d97706" />
            <circle cx="81" cy="82" r="4" fill="#f59e0b" />
            <circle cx="104" cy="76" r="4" fill="#d97706" />
            <circle cx="99" cy="82" r="4" fill="#f59e0b" />
          </g>
        )}

        {plantKey === 'pomegranate' && (
          <g>
            <path d="M86 144 L88 86 L93 86 L94 144 Z" fill="#78350f" />
            <ellipse cx="90" cy="72" rx="38" ry="30" fill={leafPrimary} />
            <ellipse cx="68" cy="78" rx="22" ry="18" fill={leafSecondary} />
            <ellipse cx="112" cy="78" rx="22" ry="18" fill={leafSecondary} />
            {/* Pomegranate fruits with crown */}
            <circle cx="72" cy="76" r="11" fill="#dc2626" />
            <path d="M68 65 L72 60 L76 65" fill="#dc2626" />
            <circle cx="104" cy="68" r="12" fill="#e11d48" />
            <path d="M100 56 L104 51 L108 56" fill="#e11d48" />
            <circle cx="90" cy="88" r="9.5" fill="#dc2626" />
          </g>
        )}

        {plantKey === 'omani_lime' && (
          <g>
            <path d="M86 144 L88 88 L93 88 L94 144 Z" fill="#7c2d12" />
            <circle cx="90" cy="72" r="34" fill={leafPrimary} />
            <circle cx="66" cy="80" r="20" fill={leafSecondary} />
            <circle cx="114" cy="80" r="20" fill={leafSecondary} />
            {/* Bright Omani Limes */}
            <ellipse cx="70" cy="74" rx="8" ry="9" fill="#facc15" stroke="#ca8a04" strokeWidth="1.2" />
            <ellipse cx="106" cy="70" rx="8.5" ry="9.5" fill="#fde047" stroke="#ca8a04" strokeWidth="1.2" />
            <ellipse cx="90" cy="88" rx="7.5" ry="8.5" fill="#facc15" stroke="#ca8a04" strokeWidth="1.2" />
          </g>
        )}

        {plantKey === 'tomato' && (
          <g>
            <path d="M90 144 L90 66" stroke={leafSecondary} strokeWidth="5" strokeLinecap="round" />
            <path d="M90 116 Q66 106 58 112" stroke={leafSecondary} strokeWidth="4" fill="none" strokeLinecap="round" />
            <path d="M90 98 Q114 88 122 95" stroke={leafSecondary} strokeWidth="4" fill="none" strokeLinecap="round" />
            {/* Leaves */}
            <ellipse cx="72" cy="88" rx="14" ry="8" fill={leafPrimary} transform="rotate(-18 72 88)" />
            <ellipse cx="108" cy="76" rx="14" ry="8" fill={leafPrimary} transform="rotate(18 108 76)" />
            <ellipse cx="90" cy="60" rx="12" ry="8" fill={leafPrimary} />
            {/* Red Tomatoes */}
            <circle cx="64" cy="112" r="10.5" fill="#ef4444" />
            <circle cx="61" cy="108" r="2.5" fill="#fca5a5" />
            <circle cx="116" cy="96" r="11" fill="#dc2626" />
            <circle cx="112" cy="92" r="2.5" fill="#fca5a5" />
            <circle cx="88" cy="98" r="9" fill="#ef4444" />
          </g>
        )}

        {plantKey === 'mango' && (
          <g>
            <path d="M84 144 L87 82 L94 82 L96 144 Z" fill="#78350f" />
            <ellipse cx="90" cy="66" rx="40" ry="30" fill={leafSecondary} />
            <ellipse cx="90" cy="62" rx="34" ry="24" fill={leafPrimary} />
            {/* Golden Mangoes */}
            <path d="M68 72 C62 72 60 88 70 92 C78 90 77 72 68 72 Z" fill="#fb923c" />
            <path d="M110 68 C104 68 102 85 112 89 C120 87 119 68 110 68 Z" fill="#f59e0b" />
            <path d="M90 80 C84 80 83 94 92 98 C98 96 98 80 90 80 Z" fill="#fbbf24" />
          </g>
        )}

        {plantKey === 'garlic' && (
          <g>
            {/* Green shoots above ground */}
            <path d="M88 122 Q74 84 62 56" stroke={leafPrimary} strokeWidth="6" fill="none" strokeLinecap="round" />
            <path d="M90 122 Q90 76 92 44" stroke={leafSecondary} strokeWidth="6" fill="none" strokeLinecap="round" />
            <path d="M92 122 Q106 84 118 58" stroke={leafPrimary} strokeWidth="6" fill="none" strokeLinecap="round" />
            {/* Garlic bulb */}
            <ellipse cx="90" cy="134" rx="22" ry="18" fill="#fefce8" stroke="#d6d3d1" strokeWidth="2" />
            <path d="M82 118 Q80 134 83 150 M90 116 L90 152 M98 118 Q100 134 97 150" stroke="#e7e5e4" strokeWidth="1.8" fill="none" />
          </g>
        )}

        {/* Overgrown dry branches overlay */}
        {isOvergrown && (
          <g stroke="#78350f" strokeWidth="3.2" strokeLinecap="round" fill="none">
            <path d="M52 94 L32 82 M42 88 L36 74" />
            <path d="M126 92 L148 78 M138 86 L146 68" />
            <path d="M62 52 L44 38 M118 52 L138 38" />
          </g>
        )}

        {/* Pest attack overlay */}
        {hasPests && (
          <g>
            <circle cx="66" cy="70" r="5" fill="#991b1b" />
            <circle cx="106" cy="64" r="5" fill="#991b1b" />
            <circle cx="88" cy="84" r="4.5" fill="#991b1b" />
            <text x="58" y="64" fontSize="16">🐛</text>
            <text x="104" y="60" fontSize="16">🪲</text>
          </g>
        )}

        {/* Thirsty water request icon */}
        {isThirsty && (
          <g>
            <circle cx="132" cy="44" r="14" fill="#ffffff" stroke="#f59e0b" strokeWidth="2" />
            <text x="123" y="50" fontSize="16">💦</text>
          </g>
        )}

        {/* Yellow nutrient-low indicator */}
        {isYellow && (
          <g>
            <circle cx="132" cy="44" r="14" fill="#ffffff" stroke="#eab308" strokeWidth="2" />
            <text x="124" y="50" fontSize="15">🍂</text>
          </g>
        )}
      </g>
    </svg>
  );
};

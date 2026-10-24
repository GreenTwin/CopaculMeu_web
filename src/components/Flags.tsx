import React from 'react';

interface FlagProps {
  size?: number; // height in pixels
  className?: string;
  style?: React.CSSProperties;
}

/**
 * Romania Flag SVG (🇷🇴)
 * Proportions: 3:2, colors: Cobalt blue (#002B7F), Golden yellow (#FCD116), Bright red (#CE1126)
 */
export const RomaniaFlag: React.FC<FlagProps> = ({ size = 16, className = '', style }) => {
  const width = Math.round((size * 3) / 2);
  return (
    <svg
      width={width}
      height={size}
      viewBox="0 0 30 20"
      className={`flag-svg flag-ro ${className}`}
      style={{
        borderRadius: '3px',
        display: 'inline-block',
        verticalAlign: 'middle',
        boxShadow: '0 0 0 1px rgba(0, 0, 0, 0.15)',
        flexShrink: 0,
        ...style,
      }}
      aria-label="Română (RO)"
    >
      <rect width="10" height="20" fill="#002B7F" />
      <rect x="10" width="10" height="20" fill="#FCD116" />
      <rect x="20" width="10" height="20" fill="#CE1126" />
    </svg>
  );
};

/**
 * United Kingdom / English Flag SVG (🇬🇧)
 * Official Union Flag geometry with accurate saltire offsets and crosses.
 */
export const GreatBritainFlag: React.FC<FlagProps> = ({ size = 16, className = '', style }) => {
  const width = Math.round((size * 3) / 2);
  return (
    <svg
      width={width}
      height={size}
      viewBox="0 0 60 40"
      className={`flag-svg flag-gb ${className}`}
      style={{
        borderRadius: '3px',
        display: 'inline-block',
        verticalAlign: 'middle',
        boxShadow: '0 0 0 1px rgba(0, 0, 0, 0.15)',
        flexShrink: 0,
        ...style,
      }}
      aria-label="English (EN)"
    >
      <clipPath id="gb-flag-clip">
        <rect width="60" height="40" rx="3" />
      </clipPath>
      <g clipPath="url(#gb-flag-clip)">
        {/* Deep navy field */}
        <rect width="60" height="40" fill="#012169" />

        {/* White saltires */}
        <line x1="0" y1="0" x2="60" y2="40" stroke="#FFFFFF" strokeWidth="8" />
        <line x1="60" y1="0" x2="0" y2="40" stroke="#FFFFFF" strokeWidth="8" />

        {/* Red St Patrick saltire with pinwheel counterchange */}
        <polygon points="0,0 30,20 26,20 0,2.67" fill="#C8102E" />
        <polygon points="60,40 30,20 34,20 60,37.33" fill="#C8102E" />
        <polygon points="60,0 30,20 30,17.33 56,0" fill="#C8102E" />
        <polygon points="0,40 30,20 30,22.67 4,40" fill="#C8102E" />

        {/* White St George cross */}
        <rect x="24" y="0" width="12" height="40" fill="#FFFFFF" />
        <rect x="0" y="14" width="60" height="12" fill="#FFFFFF" />

        {/* Red St George cross */}
        <rect x="26" y="0" width="8" height="40" fill="#C8102E" />
        <rect x="0" y="16" width="60" height="8" fill="#C8102E" />
      </g>
    </svg>
  );
};

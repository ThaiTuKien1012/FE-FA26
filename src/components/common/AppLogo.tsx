import React from 'react';

interface AppLogoProps {
  className?: string;
  size?: number | string;
  variant?: 'system' | 'system-contrast' | 'original';
}

export const AppLogo: React.FC<AppLogoProps> = ({
  className = 'w-8 h-8',
  size,
  variant = 'system'
}) => {
  // Color configuration
  // 'system': Synchronized with the app's Deep Pine (#1E3A2F) and Vibrant Mint/Emerald (#10B981 / #00B589)
  // 'system-contrast': Pine (#1E3A2F) and Pale Mint Sage (#CAEADA)
  // 'original': Purple (#594CE8) and Cyan (#00BFDE) from reference screenshot
  
  const getColors = () => {
    switch (variant) {
      case 'original':
        return {
          primary: '#594CE8',
          accent: '#00BFDE'
        };
      case 'system-contrast':
        return {
          primary: '#1E3A2F',
          accent: '#7ED8AA'
        };
      case 'system':
      default:
        return {
          primary: '#1E3A2F',
          accent: '#10B981'
        };
    }
  };

  const { primary, accent } = getColors();

  return (
    <svg
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`shrink-0 select-none ${className}`}
      style={size ? { width: size, height: size } : undefined}
      aria-label="RetailSpace HUPM Logo"
    >
      <defs>
        {/* Subtle gradient for primary forest tile */}
        <linearGradient id="hupm-tile-primary" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#25473A" />
          <stop offset="100%" stopColor={primary} />
        </linearGradient>

        {/* Subtle gradient for vibrant mint accent tile */}
        <linearGradient id="hupm-tile-accent" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#34D399" />
          <stop offset="100%" stopColor={accent} />
        </linearGradient>
      </defs>

      {/* Top-Left: Primary Pine Green Squircle */}
      <rect
        x="2"
        y="2"
        width="46"
        height="46"
        rx="14"
        fill={variant === 'system' ? 'url(#hupm-tile-primary)' : primary}
      />

      {/* Top-Right: Accent Mint Green Squircle */}
      <rect
        x="52"
        y="2"
        width="46"
        height="46"
        rx="14"
        fill={variant === 'system' ? 'url(#hupm-tile-accent)' : accent}
      />

      {/* Bottom-Left: Accent Mint Green Squircle */}
      <rect
        x="2"
        y="52"
        width="46"
        height="46"
        rx="14"
        fill={variant === 'system' ? 'url(#hupm-tile-accent)' : accent}
      />

      {/* Bottom-Right: Primary Pine Green Squircle */}
      <rect
        x="52"
        y="52"
        width="46"
        height="46"
        rx="14"
        fill={variant === 'system' ? 'url(#hupm-tile-primary)' : primary}
      />
    </svg>
  );
};

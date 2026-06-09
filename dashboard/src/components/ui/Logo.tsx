'use client';

interface LogoProps {
  variant?: 'full' | 'icon';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

function RobotIcon({ size = 40, className = '' }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      <defs>
        <linearGradient id="violetGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#c084fc" />
          <stop offset="100%" stopColor="#a855f7" />
        </linearGradient>
      </defs>

      {/* Antenna with glow */}
      <circle cx="32" cy="8" r="3" fill="url(#violetGrad)">
        <animate attributeName="r" values="3;3.5;3" dur="2s" repeatCount="indefinite" />
      </circle>
      <line x1="32" y1="11" x2="32" y2="18" stroke="url(#violetGrad)" strokeWidth="2" strokeLinecap="round" />

      {/* Wifi waves */}
      <path d="M26 6C26 6 28.5 3 32 3C35.5 3 38 6 38 6" stroke="#c084fc" strokeWidth="1.5" strokeLinecap="round" fill="none" opacity="0.9" />
      <path d="M23 3.5C23 3.5 26.5 -0.5 32 -0.5C37.5 -0.5 41 3.5 41 3.5" stroke="#a855f7" strokeWidth="1.5" strokeLinecap="round" fill="none" opacity="0.6" />

      {/* Head - main body with gradient */}
      <ellipse cx="32" cy="34" rx="16" ry="17" fill="url(#violetGrad)" fillOpacity="0.15" stroke="url(#violetGrad)" strokeOpacity="0.5" strokeWidth="1.5" />
      <ellipse cx="32" cy="34" rx="14" ry="15" fill="url(#violetGrad)" fillOpacity="0.08" />

      {/* Grid lines on body */}
      <line x1="24" y1="44" x2="40" y2="44" stroke="#c084fc" strokeOpacity="0.25" strokeWidth="1" />
      <line x1="25" y1="47" x2="39" y2="47" stroke="#c084fc" strokeOpacity="0.2" strokeWidth="1" />
      <line x1="26" y1="50" x2="38" y2="50" stroke="#a855f7" strokeOpacity="0.15" strokeWidth="1" />

      {/* Eyes - violet glow */}
      <circle cx="26" cy="32" r="4" fill="url(#violetGrad)">
        <animate attributeName="opacity" values="1;0.7;1" dur="2.5s" repeatCount="indefinite" />
      </circle>
      <circle cx="38" cy="32" r="4" fill="url(#violetGrad)">
        <animate attributeName="opacity" values="1;0.7;1" dur="2.5s" repeatCount="indefinite" begin="0.3s" />
      </circle>

      {/* Eye glow rings */}
      <circle cx="26" cy="32" r="6" fill="none" stroke="#c084fc" strokeOpacity="0.4">
        <animate attributeName="strokeOpacity" values="0.4;0.1;0.4" dur="2.5s" repeatCount="indefinite" />
      </circle>
      <circle cx="38" cy="32" r="6" fill="none" stroke="#c084fc" strokeOpacity="0.4">
        <animate attributeName="strokeOpacity" values="0.4;0.1;0.4" dur="2.5s" repeatCount="indefinite" begin="0.3s" />
      </circle>

      {/* Mouth / speaker */}
      <rect x="27" y="40" width="10" height="2" rx="1" fill="#c084fc" fillOpacity="0.4" />

      {/* Side arrows */}
      <path d="M50 33L54 33L52 31M54 33L52 35" stroke="#a855f7" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M56 33L60 33L58 31M60 33L58 35" stroke="#a855f7" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" opacity="0.6" />

      {/* Left circuit lines */}
      <circle cx="8" cy="38" r="2" fill="#a855f7" opacity="0.8" />
      <line x1="10" y1="38" x2="16" y2="38" stroke="#a855f7" strokeWidth="1" opacity="0.5" />
      <circle cx="8" cy="42" r="1.5" fill="#a855f7" opacity="0.5" />
      <line x1="9.5" y1="42" x2="14" y2="42" stroke="#a855f7" strokeWidth="1" opacity="0.3" />
    </svg>
  );
}

export default function Logo({ variant = 'full', size = 'md', className = '' }: LogoProps) {
  const iconSizes = { sm: 32, md: 40, lg: 56 };
  const iconSize = iconSizes[size];

  if (variant === 'icon') {
    return <RobotIcon size={iconSize} className={className} />;
  }

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <RobotIcon size={iconSize} />
      <div className="flex flex-col">
        <span className="text-white font-bold text-sm tracking-wide leading-tight">AUTO PRÉVIAS</span>
        <span className="text-[#c084fc] font-bold text-[11px] tracking-[0.2em] leading-tight">— HOT 2.0 —</span>
      </div>
    </div>
  );
}

export { RobotIcon };

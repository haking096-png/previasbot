'use client';

interface LogoProps {
  variant?: 'full' | 'icon';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

function RobotIcon({ size = 40, className = '' }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      {/* Antenna */}
      <circle cx="32" cy="8" r="2.5" fill="#3b82f6" />
      <line x1="32" y1="10.5" x2="32" y2="18" stroke="#3b82f6" strokeWidth="2" strokeLinecap="round" />
      
      {/* Wifi waves */}
      <path d="M26 6C26 6 28.5 3 32 3C35.5 3 38 6 38 6" stroke="#3b82f6" strokeWidth="1.5" strokeLinecap="round" fill="none" opacity="0.8" />
      <path d="M23 3.5C23 3.5 26.5 -0.5 32 -0.5C37.5 -0.5 41 3.5 41 3.5" stroke="#3b82f6" strokeWidth="1.5" strokeLinecap="round" fill="none" opacity="0.5" />
      
      {/* Head - main body */}
      <ellipse cx="32" cy="34" rx="16" ry="17" fill="white" fillOpacity="0.12" stroke="white" strokeOpacity="0.3" strokeWidth="1" />
      <ellipse cx="32" cy="34" rx="14" ry="15" fill="white" fillOpacity="0.06" />
      
      {/* Grid lines on body */}
      <line x1="24" y1="44" x2="40" y2="44" stroke="white" strokeOpacity="0.15" strokeWidth="1" />
      <line x1="25" y1="47" x2="39" y2="47" stroke="white" strokeOpacity="0.12" strokeWidth="1" />
      <line x1="26" y1="50" x2="38" y2="50" stroke="white" strokeOpacity="0.08" strokeWidth="1" />
      
      {/* Eyes */}
      <circle cx="26" cy="32" r="4" fill="#06b6d4" className="robot-eye">
        <animate attributeName="opacity" values="1;0.6;1" dur="3s" repeatCount="indefinite" />
      </circle>
      <circle cx="38" cy="32" r="4" fill="#06b6d4" className="robot-eye">
        <animate attributeName="opacity" values="1;0.6;1" dur="3s" repeatCount="indefinite" begin="0.2s" />
      </circle>
      
      {/* Eye glow */}
      <circle cx="26" cy="32" r="5.5" fill="none" stroke="#06b6d4" strokeOpacity="0.3">
        <animate attributeName="strokeOpacity" values="0.3;0.1;0.3" dur="3s" repeatCount="indefinite" />
      </circle>
      <circle cx="38" cy="32" r="5.5" fill="none" stroke="#06b6d4" strokeOpacity="0.3">
        <animate attributeName="strokeOpacity" values="0.3;0.1;0.3" dur="3s" repeatCount="indefinite" begin="0.2s" />
      </circle>
      
      {/* Mouth / speaker */}
      <rect x="27" y="40" width="10" height="2" rx="1" fill="white" fillOpacity="0.2" />
      
      {/* Side arrows */}
      <path d="M50 33L54 33L52 31M54 33L52 35" stroke="#3b82f6" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M56 33L60 33L58 31M60 33L58 35" stroke="#3b82f6" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" opacity="0.6" />
      
      {/* Left circuit lines */}
      <circle cx="8" cy="38" r="2" fill="#3b82f6" opacity="0.7" />
      <line x1="10" y1="38" x2="16" y2="38" stroke="#3b82f6" strokeWidth="1" opacity="0.5" />
      <circle cx="8" cy="42" r="1.5" fill="#3b82f6" opacity="0.5" />
      <line x1="9.5" y1="42" x2="14" y2="42" stroke="#3b82f6" strokeWidth="1" opacity="0.3" />
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
        <span className="text-white font-bold text-sm tracking-wide font-display leading-tight">AUTO PRÉVIAS</span>
        <span className="text-[#3b82f6] font-bold text-[11px] tracking-[0.2em] leading-tight">— HOT 2.0 —</span>
      </div>
    </div>
  );
}

export { RobotIcon };

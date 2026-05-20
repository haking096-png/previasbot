'use client';

import { useEffect, useState } from 'react';

interface Props {
  value: number;
  max: number;
  size?: number;
  strokeWidth?: number;
  color?: string;
  delay?: number;
}

export default function ProgressRing({ value, max, size = 48, strokeWidth = 3, color = 'var(--accent-cyan)', delay = 0 }: Props) {
  const [mounted, setMounted] = useState(false);
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const percentage = max > 0 ? Math.min(value / max, 1) : 0;
  const offset = circumference - percentage * circumference;

  useEffect(() => {
    const timer = setTimeout(() => setMounted(true), delay + 300);
    return () => clearTimeout(timer);
  }, [delay]);

  return (
    <svg width={size} height={size} className="transform -rotate-90">
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke="rgba(56, 97, 150, 0.15)"
        strokeWidth={strokeWidth}
      />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={mounted ? offset : circumference}
        style={{
          transition: 'stroke-dashoffset 1.2s cubic-bezier(0.4, 0, 0.2, 1)',
          filter: `drop-shadow(0 0 4px ${color})`,
        }}
      />
    </svg>
  );
}

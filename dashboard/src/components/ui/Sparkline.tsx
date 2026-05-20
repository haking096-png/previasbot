'use client';

import { useEffect, useState } from 'react';

interface Props {
  data: number[];
  width?: number;
  height?: number;
  color?: string;
  delay?: number;
}

export default function Sparkline({ data, width = 80, height = 28, color = 'var(--accent-cyan)', delay = 0 }: Props) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setMounted(true), delay + 200);
    return () => clearTimeout(timer);
  }, [delay]);

  if (data.length < 2) return null;

  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  const padding = 2;

  const points = data.map((val, i) => {
    const x = padding + (i / (data.length - 1)) * (width - padding * 2);
    const y = padding + (1 - (val - min) / range) * (height - padding * 2);
    return `${x},${y}`;
  }).join(' ');

  const areaPoints = `${padding},${height - padding} ${points} ${width - padding},${height - padding}`;
  const pathLength = data.length * 20;

  return (
    <svg width={width} height={height} className="overflow-visible">
      <defs>
        <linearGradient id={`sparkGrad-${color.replace(/[^a-z0-9]/gi, '')}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.2" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon
        points={areaPoints}
        fill={`url(#sparkGrad-${color.replace(/[^a-z0-9]/gi, '')})`}
        opacity={mounted ? 1 : 0}
        style={{ transition: 'opacity 0.8s ease' }}
      />
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeDasharray={pathLength}
        strokeDashoffset={mounted ? 0 : pathLength}
        style={{
          transition: `stroke-dashoffset 1.5s cubic-bezier(0.4, 0, 0.2, 1)`,
          filter: `drop-shadow(0 0 3px ${color})`,
        }}
      />
    </svg>
  );
}

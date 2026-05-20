'use client';

import { useEffect, useState } from 'react';

interface Props {
  data: { label: string; value: number }[];
  height?: number;
  color?: string;
}

export default function MiniBarChart({ data, height = 120, color = 'var(--accent-cyan)' }: Props) {
  const [mounted, setMounted] = useState(false);
  const max = Math.max(...data.map(d => d.value), 1);

  useEffect(() => {
    const timer = setTimeout(() => setMounted(true), 400);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="flex items-end gap-2 w-full" style={{ height }}>
      {data.map((item, i) => {
        const barHeight = (item.value / max) * (height - 24);
        return (
          <div key={item.label} className="flex-1 flex flex-col items-center gap-1.5">
            <div className="relative w-full flex justify-center">
              <div
                className="w-full max-w-[28px] rounded-t-[4px] relative group/bar cursor-default"
                style={{
                  height: mounted ? barHeight : 0,
                  background: `linear-gradient(180deg, ${color} 0%, rgba(6, 182, 212, 0.3) 100%)`,
                  transition: `height 0.8s cubic-bezier(0.4, 0, 0.2, 1) ${i * 80}ms`,
                  boxShadow: mounted ? `0 0 8px -2px ${color}` : 'none',
                }}
              >
                <div className="absolute -top-7 left-1/2 -translate-x-1/2 px-1.5 py-0.5 rounded bg-[var(--surface-card)] border border-[var(--border-subtle)] text-[9px] text-[var(--text-primary)] font-medium opacity-0 group-hover/bar:opacity-100 transition-opacity whitespace-nowrap">
                  {item.value}
                </div>
              </div>
            </div>
            <span className="text-[9px] text-[var(--text-muted)] font-medium">{item.label}</span>
          </div>
        );
      })}
    </div>
  );
}

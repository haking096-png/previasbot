'use client';

import { ReactNode } from 'react';

interface Props {
  children: ReactNode;
  className?: string;
}

export default function AnimatedBorderCard({ children, className = '' }: Props) {
  return (
    <div className={`group/border relative rounded-[var(--radius-lg)] p-[1px] transition-all duration-300 ${className}`}>
      <div
        className="absolute inset-0 rounded-[var(--radius-lg)] opacity-0 group-hover/border:opacity-100 transition-opacity duration-500"
        style={{
          background: `conic-gradient(from var(--border-angle), var(--accent-cyan), var(--accent-blue), var(--accent-indigo), var(--accent-cyan))`,
          animation: 'rotate-border 3s linear infinite',
          animationPlayState: 'paused',
        }}
      />
      <div
        className="absolute inset-0 rounded-[var(--radius-lg)] opacity-0 group-hover/border:opacity-100 transition-opacity duration-500 blur-md"
        style={{
          background: `conic-gradient(from var(--border-angle), var(--accent-cyan), var(--accent-blue), var(--accent-indigo), var(--accent-cyan))`,
          animation: 'rotate-border 3s linear infinite',
          animationPlayState: 'paused',
        }}
      />
      <div className="relative rounded-[calc(var(--radius-lg)-1px)] bg-[var(--surface-card)] overflow-hidden h-full">
        {children}
      </div>
      <style jsx>{`
        .group\/border:hover div[style*="conic-gradient"] {
          animation-play-state: running !important;
        }
      `}</style>
    </div>
  );
}

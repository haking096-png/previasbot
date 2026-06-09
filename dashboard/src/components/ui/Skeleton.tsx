'use client';

import { HTMLAttributes, forwardRef } from 'react';

interface SkeletonProps extends HTMLAttributes<HTMLDivElement> {
  variant?: 'text' | 'circular' | 'rectangular';
  width?: string | number;
  height?: string | number;
  animation?: 'pulse' | 'wave' | 'none';
}

const Skeleton = forwardRef<HTMLDivElement, SkeletonProps>(
  (
    {
      variant = 'rectangular',
      width,
      height,
      animation = 'wave',
      className = '',
      style,
      ...props
    },
    ref
  ) => {
    const baseStyles = `
      bg-[var(--bg-tertiary)]
      ${animation === 'wave' ? 'animate-pulse' : ''}
      ${animation === 'pulse' ? 'animate-pulse' : ''}
    `;

    const variantStyles: Record<string, string> = {
      text: 'rounded h-4 w-full',
      circular: 'rounded-full',
      rectangular: 'rounded-xl',
    };

    const defaultDimensions: Record<string, { width: string; height: string }> = {
      text: { width: '100%', height: '1rem' },
      circular: { width: '2.5rem', height: '2.5rem' },
      rectangular: { width: '100%', height: '6rem' },
    };

    const computedStyle = {
      ...style,
      width: width || defaultDimensions[variant].width,
      height: height || defaultDimensions[variant].height,
    };

    return (
      <div
        ref={ref}
        className={`${baseStyles} ${variantStyles[variant]} ${className}`}
        style={computedStyle}
        {...props}
      />
    );
  }
);

Skeleton.displayName = 'Skeleton';

// Pre-built skeleton patterns
export function SkeletonCard() {
  return (
    <div className="bg-[var(--bg-secondary)] border border-[var(--border-default)] rounded-xl p-4 space-y-3">
      <Skeleton variant="rectangular" height="12rem" />
      <div className="space-y-2">
        <Skeleton variant="text" width="80%" />
        <Skeleton variant="text" width="60%" />
      </div>
      <div className="flex gap-2">
        <Skeleton variant="rectangular" width="4rem" height="2rem" />
        <Skeleton variant="rectangular" width="4rem" height="2rem" />
      </div>
    </div>
  );
}

export function SkeletonTable({ rows = 5 }: { rows?: number }) {
  return (
    <div className="bg-[var(--bg-secondary)] border border-[var(--border-default)] rounded-xl overflow-hidden">
      <div className="flex gap-4 px-4 py-3 bg-[var(--bg-tertiary)] border-b border-[var(--border-default)]">
        <Skeleton variant="text" width="3rem" height="0.75rem" />
        <Skeleton variant="text" width="5rem" height="0.75rem" />
        <Skeleton variant="text" width="8rem" height="0.75rem" />
        <Skeleton variant="text" width="4rem" height="0.75rem" />
      </div>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex gap-4 px-4 py-3 border-b border-[var(--border-default)] last:border-0">
          <Skeleton variant="text" width="3rem" height="0.75rem" />
          <Skeleton variant="text" width="5rem" height="0.75rem" />
          <Skeleton variant="text" width="8rem" height="0.75rem" />
          <Skeleton variant="text" width="4rem" height="0.75rem" />
        </div>
      ))}
    </div>
  );
}

export function SkeletonGrid({ items = 8 }: { items?: number }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {Array.from({ length: items }).map((_, i) => (
        <SkeletonCard key={i} />
      ))}
    </div>
  );
}

export default Skeleton;

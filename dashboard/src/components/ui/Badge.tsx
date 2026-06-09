'use client';

import { HTMLAttributes, forwardRef } from 'react';

type BadgeVariant = 'default' | 'success' | 'warning' | 'danger' | 'info' | 'purple';
type BadgeSize = 'sm' | 'md';

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
  size?: BadgeSize;
  dot?: boolean;
  pulse?: boolean;
}

const Badge = forwardRef<HTMLSpanElement, BadgeProps>(
  (
    {
      children,
      variant = 'default',
      size = 'sm',
      dot = false,
      pulse = false,
      className = '',
      ...props
    },
    ref
  ) => {
    const baseStyles = 'inline-flex items-center gap-1.5 font-medium rounded-md';

    const variantStyles: Record<BadgeVariant, string> = {
      default: 'bg-[var(--bg-tertiary)] text-[var(--text-secondary)]',
      success: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20',
      warning: 'bg-amber-500/10 text-amber-400 border border-amber-500/20',
      danger: 'bg-red-500/10 text-red-400 border border-red-500/20',
      info: 'bg-violet-500/10 text-violet-400 border border-violet-500/20',
      purple: 'bg-violet-500/10 text-violet-400 border border-violet-500/20',
    };

    const sizeStyles: Record<BadgeSize, string> = {
      sm: 'px-2 py-0.5 text-[10px]',
      md: 'px-2.5 py-1 text-xs',
    };

    const dotColors: Record<BadgeVariant, string> = {
      default: 'bg-[var(--text-muted)]',
      success: 'bg-emerald-400',
      warning: 'bg-amber-400',
      danger: 'bg-red-400',
      info: 'bg-violet-400',
      purple: 'bg-violet-400',
    };

    return (
      <span
        ref={ref}
        className={`${baseStyles} ${variantStyles[variant]} ${sizeStyles[size]} ${className}`}
        {...props}
      >
        {dot && (
          <span
            className={`relative w-1.5 h-1.5 rounded-full ${dotColors[variant]} ${
              pulse ? 'animate-pulse' : ''
            }`}
          />
        )}
        {children}
      </span>
    );
  }
);

Badge.displayName = 'Badge';

export default Badge;

// Status-specific badges
export function StatusBadge({
  status,
  className = '',
}: {
  status: string;
  className?: string;
}) {
  const statusConfig: Record<string, { variant: BadgeVariant; label: string }> = {
    // Media statuses
    PENDING: { variant: 'default', label: 'Pendente' },
    ANALYZING: { variant: 'info', label: 'Analisando' },
    ANALYZED: { variant: 'success', label: 'Analisada' },
    GENERATING_PREVIEW: { variant: 'warning', label: 'Gerando' },
    READY: { variant: 'success', label: 'Pronta' },
    ERROR: { variant: 'danger', label: 'Erro' },

    // Post statuses
    SCHEDULED: { variant: 'info', label: 'Agendado' },
    PUBLISHING: { variant: 'warning', label: 'Publicando' },
    PUBLISHED: { variant: 'success', label: 'Publicado' },
    FAILED: { variant: 'danger', label: 'Falhou' },
    CANCELLED: { variant: 'default', label: 'Cancelado' },

    // Health statuses
    HEALTHY: { variant: 'success', label: 'Online' },
    WARNING: { variant: 'warning', label: 'Atenção' },
    UNKNOWN: { variant: 'default', label: 'Desconhecido' },
    INFO: { variant: 'info', label: 'Info' },
  };

  const config = statusConfig[status] || { variant: 'default' as BadgeVariant, label: status };

  return (
    <Badge variant={config.variant} dot pulse={config.variant === 'success' || config.variant === 'warning'}>
      {config.label}
    </Badge>
  );
}

// Count badge (for sidebar)
export function CountBadge({
  count,
  className = '',
}: {
  count: number;
  className?: string;
}) {
  if (count === 0) return null;

  return (
    <span
      className={`
        min-w-[1.25rem] h-5 px-1.5 flex items-center justify-center
        text-[10px] font-semibold rounded-full
        bg-[var(--accent-primary)] text-white
        ${className}
      `}
    >
      {count > 99 ? '99+' : count}
    </span>
  );
}

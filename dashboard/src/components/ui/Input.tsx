'use client';

import { InputHTMLAttributes, TextareaHTMLAttributes, forwardRef, useState } from 'react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, hint, className = '', id, ...props }, ref) => {
    const inputId = id || label?.toLowerCase().replace(/\s+/g, '-');

    return (
      <div className="space-y-1.5">
        {label && (
          <label
            htmlFor={inputId}
            className="block text-xs font-medium text-[var(--text-secondary)]"
          >
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          className={`
            w-full bg-[var(--bg-tertiary)] border rounded-xl
            px-4 py-2.5 text-sm text-[var(--text-primary)]
            placeholder-[var(--text-muted)]
            transition-all duration-150
            focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)]/10
            ${error
              ? 'border-[var(--accent-danger)] focus:border-[var(--accent-danger)]'
              : 'border-[var(--border-default)] focus:border-[var(--accent-primary)]'
            }
            ${className}
          `}
          {...props}
        />
        {error && (
          <p className="text-[10px] text-[var(--accent-danger)]">{error}</p>
        )}
        {hint && !error && (
          <p className="text-[10px] text-[var(--text-muted)]">{hint}</p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  hint?: string;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ label, error, hint, className = '', id, ...props }, ref) => {
    const inputId = id || label?.toLowerCase().replace(/\s+/g, '-');

    return (
      <div className="space-y-1.5">
        {label && (
          <label
            htmlFor={inputId}
            className="block text-xs font-medium text-[var(--text-secondary)]"
          >
            {label}
          </label>
        )}
        <textarea
          ref={ref}
          id={inputId}
          className={`
            w-full bg-[var(--bg-tertiary)] border rounded-xl
            px-4 py-3 text-sm text-[var(--text-primary)]
            placeholder-[var(--text-muted)]
            transition-all duration-150 resize-y min-h-[100px]
            focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)]/10
            ${error
              ? 'border-[var(--accent-danger)] focus:border-[var(--accent-danger)]'
              : 'border-[var(--border-default)] focus:border-[var(--accent-primary)]'
            }
            ${className}
          `}
          {...props}
        />
        {error && (
          <p className="text-[10px] text-[var(--accent-danger)]">{error}</p>
        )}
        {hint && !error && (
          <p className="text-[10px] text-[var(--text-muted)]">{hint}</p>
        )}
      </div>
    );
  }
);

Textarea.displayName = 'Textarea';

interface SelectProps extends InputHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  options: { value: string; label: string }[];
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, error, options, className = '', id, ...props }, ref) => {
    const inputId = id || label?.toLowerCase().replace(/\s+/g, '-');

    return (
      <div className="space-y-1.5">
        {label && (
          <label
            htmlFor={inputId}
            className="block text-xs font-medium text-[var(--text-secondary)]"
          >
            {label}
          </label>
        )}
        <select
          ref={ref}
          id={inputId}
          className={`
            w-full bg-[var(--bg-tertiary)] border rounded-xl
            px-4 py-2.5 text-sm text-[var(--text-primary)]
            transition-all duration-150 cursor-pointer
            focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)]/10
            ${error
              ? 'border-[var(--accent-danger)] focus:border-[var(--accent-danger)]'
              : 'border-[var(--border-default)] focus:border-[var(--accent-primary)]'
            }
            ${className}
          `}
          {...props}
        >
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        {error && (
          <p className="text-[10px] text-[var(--accent-danger)]">{error}</p>
        )}
      </div>
    );
  }
);

Select.displayName = 'Select';

// Toggle Switch component
interface ToggleProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: string;
  disabled?: boolean;
}

export function Toggle({ checked, onChange, label, disabled }: ToggleProps) {
  return (
    <label className={`inline-flex items-center gap-3 ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => !disabled && onChange(!checked)}
        className={`
          relative inline-flex h-6 w-11 flex-shrink-0 rounded-full border-2 border-transparent
          transition-colors duration-200 ease-in-out
          focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)]/10 focus:ring-offset-2 focus:ring-offset-[var(--bg-primary)]
          ${checked ? 'bg-[var(--accent-primary)]' : 'bg-[var(--bg-tertiary)]'}
          ${disabled ? 'cursor-not-allowed' : 'cursor-pointer'}
        `}
      >
        <span
          className={`
            pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow
            transition duration-200 ease-in-out
            ${checked ? 'translate-x-5' : 'translate-x-0'}
          `}
        />
      </button>
      {label && (
        <span className="text-sm text-[var(--text-primary)]">{label}</span>
      )}
    </label>
  );
}

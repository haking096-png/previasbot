'use client';

import { useState, useEffect } from 'react';

type StatusType = 'generating' | 'success' | 'error' | 'idle';

interface GenerationLoaderProps {
  status: StatusType;
  message?: string;
  size?: 'sm' | 'md' | 'lg';
  showProgress?: boolean;
}

export default function GenerationLoader({
  status,
  message = 'Gerando...',
  size = 'md',
  showProgress = true,
}: GenerationLoaderProps) {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (status === 'generating' && showProgress) {
      setProgress(0);
      const interval = setInterval(() => {
        setProgress(p => {
          if (p >= 95) {
            clearInterval(interval);
            return 95;
          }
          return p + Math.random() * 8;
        });
      }, 500);
      return () => clearInterval(interval);
    } else if (status === 'success') {
      setProgress(100);
    }
  }, [status, showProgress]);

  const sizeClasses = {
    sm: 'w-8 h-8',
    md: 'w-12 h-12',
    lg: 'w-20 h-20',
  };

  const textSizes = {
    sm: 'text-xs',
    md: 'text-sm',
    lg: 'text-base',
  };

  if (status === 'idle') return null;

  return (
    <div className="flex flex-col items-center justify-center gap-3 p-4">
      {status === 'generating' && (
        <>
          <div className="relative">
            <div className={`${sizeClasses[size]} rounded-full border-2 border-cyan-500/20`} />
            <div className={`${sizeClasses[size]} rounded-full border-2 border-transparent border-t-cyan-500 absolute inset-0 animate-spin`} />
            <div className="absolute inset-0 flex items-center justify-center">
              <svg className={`${size === 'lg' ? 'w-8 h-8' : size === 'md' ? 'w-5 h-5' : 'w-4 h-4'} text-cyan-400`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
          </div>
          <div className="text-center">
            <p className={`${textSizes[size]} text-cyan-400 font-medium`}>{message}</p>
            {showProgress && (
              <div className="w-32 h-1 bg-[#1e293b] rounded-full overflow-hidden mt-2">
                <div
                  className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
            )}
          </div>
        </>
      )}

      {status === 'success' && (
        <>
          <div className="relative">
            <div className={`${sizeClasses[size]} rounded-full bg-emerald-500/20 flex items-center justify-center animate-[scale-in_0.3s_ease-out]`}>
              <svg className={`${size === 'lg' ? 'w-10 h-10' : size === 'md' ? 'w-7 h-7' : 'w-5 h-5'} text-emerald-400`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
              </svg>
            </div>
          </div>
          <p className={`${textSizes[size]} text-emerald-400 font-semibold`}>
            {message || 'Concluído!'}
          </p>
        </>
      )}

      {status === 'error' && (
        <>
          <div className={`${sizeClasses[size]} rounded-full bg-red-500/20 flex items-center justify-center`}>
            <svg className={`${size === 'lg' ? 'w-10 h-10' : size === 'md' ? 'w-7 h-7' : 'w-5 h-5'} text-red-400`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <p className={`${textSizes[size]} text-red-400 font-semibold`}>
            {message || 'Erro!'}
          </p>
        </>
      )}
    </div>
  );
}
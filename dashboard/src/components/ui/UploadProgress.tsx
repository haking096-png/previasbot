'use client';

import { UploadProgressItem } from './types';
import { formatFileSize } from './FileDropzone';

interface UploadProgressProps {
  items: UploadProgressItem[];
  currentIndex: number;
  isUploading: boolean;
  onCancel?: () => void;
}

export function UploadProgress({ items, currentIndex, isUploading, onCancel }: UploadProgressProps) {
  const completedCount = items.filter(i => i.status === 'completed').length;
  const errorCount = items.filter(i => i.status === 'error').length;
  const totalProgress = items.length > 0
    ? Math.round(items.reduce((acc, item) => acc + item.progress, 0) / items.length)
    : 0;

  return (
    <div className="space-y-3">
      {/* Header with progress */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <svg className="w-4 h-4 animate-spin text-violet-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            <span className="text-xs text-[#f1f5f9] font-medium">
              Enviando {currentIndex + 1}/{items.length}...
            </span>
          </div>
        </div>

        {onCancel && isUploading && (
          <button
            onClick={onCancel}
            className="text-xs text-red-400 hover:text-red-300 transition-colors"
          >
            Cancelar
          </button>
        )}
      </div>

      {/* Overall progress bar */}
      <div className="h-2 bg-[#1e293b] rounded-full overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-violet-500 to-violet-400 transition-all duration-300 ease-out"
          style={{ width: `${totalProgress}%` }}
        />
      </div>

      {/* Stats */}
      <div className="flex items-center gap-4 text-xs">
        <span className="text-[#64748b]">
          {completedCount} concluído{completedCount !== 1 ? 's' : ''}
        </span>
        {errorCount > 0 && (
          <span className="text-red-400">
            {errorCount} erro{errorCount !== 1 ? 's' : ''}
          </span>
        )}
        <span className="text-[#475569]">
          {totalProgress}%
        </span>
      </div>

      {/* Individual file list */}
      <div className="space-y-1.5 max-h-40 overflow-y-auto">
        {items.map((item, index) => (
          <div
            key={item.id}
            className={`
              flex items-center gap-2 px-3 py-2 rounded-lg text-xs
              ${item.status === 'error' ? 'bg-red-500/5' : item.status === 'completed' ? 'bg-emerald-500/5' : 'bg-[#1e293b]'}
            `}
          >
            {/* Status icon */}
            <div className="w-4 h-4 flex-shrink-0">
              {item.status === 'completed' && (
                <svg className="w-4 h-4 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              )}
              {item.status === 'error' && (
                <svg className="w-4 h-4 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              )}
              {item.status === 'uploading' && (
                <div className="w-4 h-4 border-2 border-violet-400 border-t-transparent rounded-full animate-spin" />
              )}
              {item.status === 'pending' && (
                <div className="w-4 h-4 border-2 border-[#334155] rounded-full" />
              )}
            </div>

            {/* File name */}
            <span className={`flex-1 truncate ${item.status === 'error' ? 'text-red-400' : 'text-[#f1f5f9]'}`}>
              {item.name}
            </span>

            {/* Size */}
            <span className="text-[#64748b] flex-shrink-0">
              {formatFileSize(item.size)}
            </span>

            {/* Progress or error */}
            {item.status === 'uploading' && (
              <span className="text-[#64748b] w-8 text-right">
                {item.progress}%
              </span>
            )}
            {item.status === 'error' && (
              <span className="text-red-400 text-[10px] max-w-[100px] truncate">
                {item.error}
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
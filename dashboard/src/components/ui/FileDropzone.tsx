'use client';

import { useCallback, useState } from 'react';
import { FileWithPreview, ValidationResult } from './types';

const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/jpg', 'image/webp', 'video/mp4'];
const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB

interface FileDropzoneProps {
  files: FileWithPreview[];
  onFilesSelected: (files: FileWithPreview[]) => void;
  disabled?: boolean;
}

export function FileDropzone({ files, onFilesSelected, disabled }: FileDropzoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [dragCounter, setDragCounter] = useState(0);

  const validateFile = useCallback((file: File): ValidationResult => {
    const isValidType = ACCEPTED_TYPES.includes(file.type);
    const isValidSize = file.size <= MAX_FILE_SIZE;

    const errors: string[] = [];
    if (!isValidType) {
      errors.push('Tipo não suportado');
    }
    if (!isValidSize) {
      const sizeMB = (file.size / (1024 * 1024)).toFixed(1);
      errors.push(`Muito grande (${sizeMB}MB)`);
    }

    return {
      valid: isValidType && isValidSize,
      errors,
    };
  }, []);

  const processFiles = useCallback((fileList: FileList | File[]) => {
    const newFiles: FileWithPreview[] = [];

    for (let i = 0; i < fileList.length; i++) {
      const file = fileList[i];
      const validation = validateFile(file);

      newFiles.push({
        file,
        preview: file.type.startsWith('image/') ? URL.createObjectURL(file) : undefined,
        validation,
        id: `${Date.now()}-${i}-${file.name}`,
      });
    }

    onFilesSelected([...files, ...newFiles]);
  }, [files, onFilesSelected, validateFile]);

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragCounter(prev => prev + 1);
    if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
      setIsDragging(true);
    }
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragCounter(prev => {
      const newCounter = prev - 1;
      if (newCounter === 0) {
        setIsDragging(false);
      }
      return newCounter;
    });
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    setDragCounter(0);

    if (disabled) return;

    const droppedFiles = e.dataTransfer.files;
    if (droppedFiles && droppedFiles.length > 0) {
      processFiles(droppedFiles);
    }
  }, [disabled, processFiles]);

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processFiles(e.target.files);
      e.target.value = ''; // Reset input
    }
  }, [processFiles]);

  return (
    <div
      className={`
        relative border-2 border-dashed rounded-xl p-8 text-center transition-all duration-200
        ${isDragging
          ? 'border-[#a855f7] bg-violet-500/5'
          : 'border-[#1e293b] bg-[#0a0e1a] hover:border-[#334155]'
        }
        ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
      `}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      onClick={() => !disabled && document.getElementById('dropzone-input')?.click()}
    >
      <input
        id="dropzone-input"
        type="file"
        accept={ACCEPTED_TYPES.join(',')}
        multiple
        onChange={handleFileInput}
        className="hidden"
        disabled={disabled}
      />

      <div className="flex flex-col items-center gap-3">
        <div className={`
          w-14 h-14 rounded-full flex items-center justify-center transition-colors
          ${isDragging ? 'bg-violet-500/10' : 'bg-[#1e293b]'}
        `}>
          <svg
            className={`w-7 h-7 ${isDragging ? 'text-violet-400' : 'text-[#64748b]'}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
            />
          </svg>
        </div>

        <div>
          <p className="text-sm font-medium text-[#f1f5f9]">
            {isDragging ? 'Solte os arquivos aqui' : 'Arraste imagens aqui'}
          </p>
          <p className="text-xs text-[#64748b] mt-1">
            ou clique para selecionar
          </p>
        </div>

        <div className="flex items-center gap-2 text-[10px] text-[#475569]">
          <span>JPG</span>
          <span className="w-1 h-1 rounded-full bg-[#334155]" />
          <span>PNG</span>
          <span className="w-1 h-1 rounded-full bg-[#334155]" />
          <span>WEBP</span>
          <span className="w-1 h-1 rounded-full bg-[#334155]" />
          <span>MP4</span>
          <span className="w-1 h-1 rounded-full bg-[#334155]" />
          <span>até 50MB</span>
        </div>
      </div>

      {isDragging && (
        <div className="absolute inset-0 rounded-xl bg-violet-500/5 pointer-events-none" />
      )}
    </div>
  );
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
}
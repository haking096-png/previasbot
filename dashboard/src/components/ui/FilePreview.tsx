'use client';

import { FileWithPreview } from './types';
import { formatFileSize } from './FileDropzone';

interface FilePreviewItemProps {
  file: FileWithPreview;
  onRemove: (id: string) => void;
}

export function FilePreviewItem({ file, onRemove }: FilePreviewItemProps) {
  const { file: fileData, preview, validation, id } = file;
  const name = fileData.name;

  return (
    <div className={`
      flex items-center gap-3 px-3 py-2.5 rounded-lg border transition-colors
      ${validation.valid
        ? 'bg-[#0a0e1a] border-[#1e293b] hover:border-[#334155]'
        : 'bg-red-500/5 border-red-500/20'
      }
    `}>
      {/* Thumbnail */}
      <div className="w-10 h-10 rounded-lg overflow-hidden bg-[#1e293b] flex-shrink-0 flex items-center justify-center">
        {preview ? (
          <img
            src={preview}
            alt={name}
            className="w-full h-full object-cover"
          />
        ) : fileData.type.startsWith('video/') ? (
          <svg className="w-5 h-5 text-[#64748b]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
          </svg>
        ) : (
          <svg className="w-5 h-5 text-[#64748b]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        )}
      </div>

      {/* File info */}
      <div className="flex-1 min-w-0">
        <p className="text-sm text-[#f1f5f9] font-medium truncate">
          {name}
        </p>
        <div className="flex items-center gap-2 mt-0.5">
          <span className="text-xs text-[#64748b]">
            {formatFileSize(fileData.size)}
          </span>
          {fileData.type && (
            <>
              <span className="w-1 h-1 rounded-full bg-[#334155]" />
              <span className="text-xs text-[#475569]">
                {fileData.type.split('/')[1]?.toUpperCase() || 'FILE'}
              </span>
            </>
          )}
        </div>
      </div>

      {/* Validation status */}
      <div className="flex-shrink-0">
        {validation.valid ? (
          <div className="w-5 h-5 rounded-full bg-emerald-500/10 flex items-center justify-center">
            <svg className="w-3 h-3 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
            </svg>
          </div>
        ) : (
          <div className="flex items-center gap-1.5" title={validation.errors.join(', ')}>
            <div className="w-5 h-5 rounded-full bg-red-500/10 flex items-center justify-center">
              <svg className="w-3 h-3 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <span className="text-xs text-red-400 max-w-[80px] truncate">
              {validation.errors[0]}
            </span>
          </div>
        )}
      </div>

      {/* Remove button */}
      <button
        onClick={() => onRemove(id)}
        className="flex-shrink-0 w-7 h-7 rounded-full bg-[#1e293b] hover:bg-red-500/10 hover:text-red-400 text-[#64748b] transition-colors flex items-center justify-center"
        title="Remover"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
}

interface FilePreviewListProps {
  files: FileWithPreview[];
  onRemove: (id: string) => void;
}

export function FilePreviewList({ files, onRemove }: FilePreviewListProps) {
  if (files.length === 0) return null;

  const validCount = files.filter(f => f.validation.valid).length;
  const invalidCount = files.length - validCount;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs text-[#64748b]">
          {files.length} arquivo(s) selecionado(s)
          {invalidCount > 0 && (
            <span className="text-red-400 ml-2">({invalidCount} inválido(s))</span>
          )}
        </span>
        {files.length > 1 && (
          <button
            onClick={() => files.forEach(f => onRemove(f.id))}
            className="text-xs text-[#64748b] hover:text-red-400 transition-colors"
          >
            Remover todos
          </button>
        )}
      </div>

      <div className="space-y-1.5 max-h-60 overflow-y-auto">
        {files.map(file => (
          <FilePreviewItem key={file.id} file={file} onRemove={onRemove} />
        ))}
      </div>

      {validCount > 0 && (
        <div className="mt-3 p-2 bg-emerald-500/5 border border-emerald-500/20 rounded-lg">
          <p className="text-xs text-emerald-400">
            Pronto para enviar: {validCount} arquivo(s)
          </p>
        </div>
      )}
    </div>
  );
}
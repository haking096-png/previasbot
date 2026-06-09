// Types for file upload components

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

export interface FileWithPreview {
  id: string;
  file: File;
  preview?: string;
  validation: ValidationResult;
}

export interface UploadProgressItem {
  id: string;
  name: string;
  size: number;
  progress: number; // 0-100
  status: 'pending' | 'uploading' | 'completed' | 'error';
  error?: string;
}

export interface UploadState {
  isUploading: boolean;
  currentIndex: number;
  totalCount: number;
  items: UploadProgressItem[];
}
'use client';

import React, { useCallback, useState } from 'react';

interface CSVFileDropProps {
  onFileSelect: (file: File) => void;
  maxFileSize?: number; // in MB
  accept?: string;
  disabled?: boolean;
}

export function CSVFileDropZone({
  onFileSelect,
  maxFileSize = 10,
  accept = '.csv,.txt',
  disabled = false
}: CSVFileDropProps) {
  const [dragActive, setDragActive] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const validateFile = useCallback((file: File): string | null => {
    // Check file type
    const validTypes = ['text/csv', 'text/plain', 'application/csv'];
    if (!validTypes.includes(file.type) && !file.name.toLowerCase().endsWith('.csv')) {
      return 'Please select a CSV file';
    }

    // Check file size
    const sizeInMB = file.size / (1024 * 1024);
    if (sizeInMB > maxFileSize) {
      return `File size must be less than ${maxFileSize}MB`;
    }

    return null;
  }, [maxFileSize]);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (disabled) return;

    const files = e.dataTransfer.files;
    if (files && files[0]) {
      const file = files[0];
      const validationError = validateFile(file);
      
      if (validationError) {
        setError(validationError);
        return;
      }
      
      setError(null);
      onFileSelect(file);
    }
  }, [disabled, validateFile, onFileSelect]);

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (disabled) return;
    
    const files = e.target.files;
    if (files && files[0]) {
      const file = files[0];
      const validationError = validateFile(file);
      
      if (validationError) {
        setError(validationError);
        return;
      }
      
      setError(null);
      onFileSelect(file);
    }
  }, [disabled, validateFile, onFileSelect]);

  return (
    <div className="w-full">
      <div
        className={`
          relative border-2 border-dashed rounded-lg p-8 text-center transition-colors
          ${dragActive 
            ? 'border-blue-400 bg-blue-50' 
            : 'border-gray-300 hover:border-gray-400'
          }
          ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
        `}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        <input
          type="file"
          accept={accept}
          onChange={handleFileInput}
          disabled={disabled}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
        />
        
        <div className="space-y-4">
          <div className="mx-auto w-12 h-12 text-gray-400">
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
          </div>
          
          <div>
            <p className="text-lg font-medium text-gray-900">
              Drop your CSV file here
            </p>
            <p className="text-sm text-gray-500">
              or click to browse (max {maxFileSize}MB)
            </p>
          </div>
          
          <div className="text-xs text-gray-400">
            Supports: CSV, TXT files with comma or semicolon delimiters
          </div>
        </div>
      </div>
      
      {error && (
        <div className="mt-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">
          {error}
        </div>
      )}
    </div>
  );
}
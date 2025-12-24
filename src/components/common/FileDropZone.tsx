import React, { useCallback, useState } from 'react';

interface FileDropZoneProps {
  onFilesDropped: (files: File[]) => void;
  className?: string;
}

export function FileDropZone({ onFilesDropped, className = '' }: FileDropZoneProps) {
  const [isDragging, setIsDragging] = useState(false);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      onFilesDropped(files);
    }
  }, [onFilesDropped]);

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`
        border-2 border-dashed rounded-lg p-8 text-center transition-colors cursor-pointer
        ${isDragging ? 'border-blue-500 bg-blue-50' : 'border-slate-300 hover:border-blue-400 hover:bg-slate-50'}
        ${className}
      `}
    >
      <div className="text-3xl mb-2">📂</div>
      <p className="font-bold text-slate-700">여기로 파일을 끌어놓으세요</p>
      <p className="text-xs text-slate-500 mt-1">
        파일명 분석을 통해 자동으로 품목을 등록합니다. <br/>
        (지원: PDF, DWG, STEP, DXF 등)
      </p>
    </div>
  );
}
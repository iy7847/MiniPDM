import React from 'react';

interface MobileModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  // [추가] 너비 조절을 위한 Prop (기본값: max-w-sm)
  // 예: 'max-w-lg', 'max-w-2xl', 'max-w-4xl', 'md:w-3/4'
  maxWidth?: string; 
}

export function MobileModal({ isOpen, onClose, title, children, footer, maxWidth = 'max-w-sm' }: MobileModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div 
        className={`bg-white w-full ${maxWidth} rounded-lg shadow-xl overflow-hidden flex flex-col max-h-[90vh] transition-all`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="bg-slate-50 p-4 border-b flex justify-between items-center shrink-0">
          <h3 className="font-bold text-slate-700">{title}</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1">
            ✕
          </button>
        </div>

        <div className="p-4 space-y-4 overflow-y-auto">
          {children}
        </div>

        {footer && (
          <div className="p-4 border-t bg-slate-50 flex gap-2 shrink-0">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
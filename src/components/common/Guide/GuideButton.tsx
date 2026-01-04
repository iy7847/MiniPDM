import React from 'react';

interface GuideButtonProps {
    onClick: () => void;
    className?: string;
}

export function GuideButton({ onClick, className = '' }: GuideButtonProps) {
    return (
        <button
            onClick={onClick}
            className={`
        w-8 h-8 flex items-center justify-center rounded-full 
        bg-indigo-100 text-indigo-600 font-bold hover:bg-indigo-200 
        transition-all active:scale-95 shadow-sm border border-indigo-200
        ${className}
      `}
            title="사용 가이드 (도움말)"
        >
            ?
        </button>
    );
}

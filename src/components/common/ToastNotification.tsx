import { useEffect, useState } from 'react';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface Toast {
    id: string;
    message: string;
    type: ToastType;
    duration?: number;
}

interface ToastItemProps {
    toast: Toast;
    onRemove: (id: string) => void;
}

const ICONS: Record<ToastType, string> = {
    success: '✅',
    error: '❌',
    info: 'ℹ️',
    warning: '⚠️',
};

const BG_CLASSES: Record<ToastType, string> = {
    success: 'bg-emerald-600 border-emerald-500',
    error: 'bg-red-600 border-red-500',
    info: 'bg-blue-600 border-blue-500',
    warning: 'bg-amber-500 border-amber-400',
};

function ToastItem({ toast, onRemove }: ToastItemProps) {
    const [visible, setVisible] = useState(false);

    useEffect(() => {
        // 마운트 후 애니메이션 시작
        const showTimer = setTimeout(() => setVisible(true), 10);
        const duration = toast.duration ?? 3500;
        const hideTimer = setTimeout(() => setVisible(false), duration);
        const removeTimer = setTimeout(() => onRemove(toast.id), duration + 350);

        return () => {
            clearTimeout(showTimer);
            clearTimeout(hideTimer);
            clearTimeout(removeTimer);
        };
    }, [toast.id, toast.duration, onRemove]);

    return (
        <div
            className={`
        flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg border
        text-white text-sm font-semibold max-w-[340px] min-w-[240px]
        transition-all duration-300 ease-out
        ${BG_CLASSES[toast.type]}
        ${visible ? 'translate-x-0 opacity-100' : 'translate-x-8 opacity-0'}
      `}
        >
            <span className="text-base flex-shrink-0">{ICONS[toast.type]}</span>
            <span className="flex-1 leading-snug">{toast.message}</span>
            <button
                onClick={() => onRemove(toast.id)}
                className="ml-1 text-white/70 hover:text-white flex-shrink-0 leading-none text-lg transition-colors"
                aria-label="닫기"
            >
                ×
            </button>
        </div>
    );
}

interface ToastContainerProps {
    toasts: Toast[];
    onRemove: (id: string) => void;
}

export function ToastContainer({ toasts, onRemove }: ToastContainerProps) {
    if (toasts.length === 0) return null;

    return (
        <div
            className="fixed bottom-6 right-6 z-[9999] flex flex-col gap-2 pointer-events-none"
            role="alert"
            aria-live="polite"
        >
            {toasts.map(toast => (
                <div key={toast.id} className="pointer-events-auto">
                    <ToastItem toast={toast} onRemove={onRemove} />
                </div>
            ))}
        </div>
    );
}

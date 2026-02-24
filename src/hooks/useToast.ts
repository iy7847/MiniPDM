import { useState, useCallback } from 'react';
import { Toast, ToastType } from '../components/common/ToastNotification';

let counter = 0;

export function useToast() {
    const [toasts, setToasts] = useState<Toast[]>([]);

    const addToast = useCallback((message: string, type: ToastType = 'info', duration?: number) => {
        const id = `toast-${++counter}`;
        setToasts(prev => [...prev, { id, message, type, duration }]);
    }, []);

    const removeToast = useCallback((id: string) => {
        setToasts(prev => prev.filter(t => t.id !== id));
    }, []);

    const toast = {
        success: (msg: string, duration?: number) => addToast(msg, 'success', duration),
        error: (msg: string, duration?: number) => addToast(msg, 'error', duration ?? 5000),
        info: (msg: string, duration?: number) => addToast(msg, 'info', duration),
        warning: (msg: string, duration?: number) => addToast(msg, 'warning', duration),
    };

    return { toasts, toast, removeToast };
}

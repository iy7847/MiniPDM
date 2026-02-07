import React, { useState, useEffect } from 'react';
import { MobileModal } from './MobileModal';
import { Button } from './ui/Button';
import { Input } from './ui/Input';

interface PromptModalProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    message: string;
    defaultValue?: string;
    type?: string;
    onSubmit: (value: string) => void;
}

export function PromptModal({
    isOpen,
    onClose,
    title,
    message,
    defaultValue = '',
    type = 'text',
    onSubmit,
}: PromptModalProps) {
    const [value, setValue] = useState(defaultValue);

    useEffect(() => {
        if (isOpen) {
            setValue(defaultValue);
        }
    }, [isOpen, defaultValue]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSubmit(value);
        onClose();
    };

    return (
        <MobileModal
            isOpen={isOpen}
            onClose={onClose}
            title={title}
            footer={
                <div className="flex w-full gap-2">
                    <Button onClick={onClose} variant="glass" className="flex-1">
                        취소
                    </Button>
                    <Button onClick={handleSubmit} variant="primary" className="flex-1 shadow-glow" type="submit">
                        확인
                    </Button>
                </div>
            }
        >
            <form onSubmit={handleSubmit} className="space-y-4">
                <p className="text-sm text-slate-600 whitespace-pre-wrap">{message}</p>
                <Input
                    autoFocus
                    type={type}
                    value={value}
                    onChange={(e) => setValue(e.target.value)}
                    className="w-full"
                />
            </form>
        </MobileModal>
    );
}

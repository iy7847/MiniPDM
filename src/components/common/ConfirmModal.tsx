import { MobileModal } from './MobileModal';
import { Button } from './ui/Button';

interface ConfirmModalProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    message: string;
    onConfirm: () => void;
}

export function ConfirmModal({
    isOpen,
    onClose,
    title,
    message,
    onConfirm,
}: ConfirmModalProps) {
    return (
        <MobileModal
            isOpen={isOpen}
            onClose={onClose}
            title={title}
            footer={
                <div className="flex w-full gap-2">
                    <Button onClick={onClose} variant="glass" className="flex-1">
                        아니오
                    </Button>
                    <Button onClick={() => { onConfirm(); onClose(); }} variant="primary" className="flex-1 shadow-glow font-bold">
                        예
                    </Button>
                </div>
            }
        >
            <p className="text-sm text-slate-600 whitespace-pre-wrap">{message}</p>
        </MobileModal>
    );
}

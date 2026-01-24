interface ProductionCompleteModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (note: string) => void;
    itemCount: number;
}

export function ProductionCompleteModal({ isOpen, onClose, onConfirm, itemCount }: ProductionCompleteModalProps) {
    if (!isOpen) return null;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const formData = new FormData(e.target as HTMLFormElement);
        const note = formData.get('note') as string;
        onConfirm(note);
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-md animate-scale-in">
                <div className="p-4 border-b border-slate-100 flex justify-between items-center">
                    <h3 className="font-bold text-lg text-slate-800">✅ 생산 완료 처리</h3>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600">✕</button>
                </div>

                <form onSubmit={handleSubmit} className="p-4 space-y-4">
                    <p className="text-sm text-slate-600">
                        선택한 <strong className="text-blue-600">{itemCount}개</strong> 품목을 완료 처리하시겠습니까?
                    </p>

                    <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-500">비고 (선택사항)</label>
                        <textarea
                            name="note"
                            className="w-full border rounded p-2 text-sm outline-none focus:ring-2 focus:ring-blue-100 min-h-[80px]"
                            placeholder="특이사항이나 메모를 입력하세요."
                        />
                    </div>

                    <div className="flex justify-end gap-2 pt-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 text-sm font-bold text-slate-500 hover:bg-slate-100 rounded"
                        >
                            취소
                        </button>
                        <button
                            type="submit"
                            className="px-4 py-2 text-sm font-bold text-white bg-green-600 hover:bg-green-700 rounded shadow-sm"
                        >
                            완료 처리
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

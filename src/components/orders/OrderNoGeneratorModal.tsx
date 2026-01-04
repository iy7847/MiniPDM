import { useState, useEffect } from 'react';

interface OrderNoGeneratorModalProps {
    isOpen: boolean;
    onClose: () => void;
    poNo: string;
    onGenerate: (format: string, overwrite: boolean) => void;
}

export function OrderNoGeneratorModal({ isOpen, onClose, poNo, onGenerate }: OrderNoGeneratorModalProps) {
    const [format, setFormat] = useState('{PO}-{SEQ}');
    const [overwrite, setOverwrite] = useState(false);

    useEffect(() => {
        if (isOpen) {
            setFormat(`${poNo}-{SEQ}`);
            setOverwrite(false);
        }
    }, [isOpen, poNo]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded p-6 shadow-xl w-96">
                <h3 className="text-lg font-bold mb-4">수주번호 생성</h3>

                <div className="mb-4">
                    <label className="block text-sm font-bold text-slate-700 mb-1">생성 형식</label>
                    <input
                        className="w-full border rounded p-2 text-sm"
                        value={format}
                        onChange={(e) => setFormat(e.target.value)}
                        placeholder="{PO}-{SEQ}"
                    />
                    <p className="text-xs text-slate-500 mt-1">
                        {'{PO}'}: PO번호 ({poNo})<br />
                        {'{SEQ}'}: 3자리 연번 (예: 001)
                    </p>
                </div>

                <div className="mb-6 flex items-center gap-2">
                    <input
                        type="checkbox"
                        id="overwrite"
                        checked={overwrite}
                        onChange={(e) => setOverwrite(e.target.checked)}
                    />
                    <label htmlFor="overwrite" className="text-sm">기존 번호 덮어쓰기</label>
                </div>

                <div className="flex justify-end gap-2">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 bg-slate-100 rounded text-slate-700 hover:bg-slate-200 font-bold"
                    >
                        취소
                    </button>
                    <button
                        onClick={() => {
                            onGenerate(format, overwrite);
                            onClose();
                        }}
                        className="px-4 py-2 bg-blue-600 rounded text-white hover:bg-blue-700 font-bold"
                    >
                        생성
                    </button>
                </div>
            </div>
        </div>
    );
}

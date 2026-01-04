import React, { useState } from 'react';
import { MobileModal } from '../common/MobileModal';

interface ClipboardMatchModalProps {
    isOpen: boolean;
    onClose: () => void;
    onMatch: (matches: { part_no: string; po_no: string; qty: number; unit_price: number; due_date: string }[], currency: string) => void;
    defaultCurrency?: string;
}

export function ClipboardMatchModal({ isOpen, onClose, onMatch, defaultCurrency = 'KRW' }: ClipboardMatchModalProps) {
    const [text, setText] = useState('');
    const [previewData, setPreviewData] = useState<string[][]>([]);
    const [poCol, setPoCol] = useState<number>(-1);
    const [partNoCol, setPartNoCol] = useState<number>(-1);
    const [qtyCol, setQtyCol] = useState<number>(-1);
    const [unitPriceCol, setUnitPriceCol] = useState<number>(-1);
    const [dueDateCol, setDueDateCol] = useState<number>(-1);
    const [currency, setCurrency] = useState(defaultCurrency);

    const handlePaste = (e: React.ClipboardEvent) => {
        e.preventDefault();
        const pasted = e.clipboardData.getData('text');
        setText(pasted);
        const rows = pasted.trim().split('\n').map(row => row.split('\t'));
        setPreviewData(rows);

        // Auto-detect columns (simple guess)
        if (rows.length > 0) {
            const header = rows[0];
            header.forEach((col, idx) => {
                const lower = col.toLowerCase();
                if (lower.includes('po') || lower.includes('발주')) setPoCol(idx);
                if (lower.includes('part') || lower.includes('도번')) setPartNoCol(idx); // Removed '품번' ambiguity
                if (lower.includes('qty') || lower.includes('수량')) setQtyCol(idx);
                if (lower.includes('price') || lower.includes('단가')) setUnitPriceCol(idx);
                if (lower.includes('date') || lower.includes('납기')) setDueDateCol(idx);
            });
        }
    };

    const handleReset = () => {
        setText('');
        setPreviewData([]);
        setPoCol(-1);
        setPartNoCol(-1);
        setQtyCol(-1);
        setUnitPriceCol(-1);
        setDueDateCol(-1);
        setCurrency(defaultCurrency);
    };

    const handleApply = () => {
        if (partNoCol === -1 || poCol === -1) {
            alert('도번(Part No)과 PO 번호 열을 반드시 선택해주세요.');
            return;
        }

        const matches = previewData.map(row => ({
            part_no: partNoCol !== -1 ? row[partNoCol]?.trim() : '',
            po_no: poCol !== -1 ? row[poCol]?.trim() : '',
            qty: qtyCol !== -1 ? Number(row[qtyCol]?.trim() || 0) : 0,
            unit_price: unitPriceCol !== -1 ? Number(row[unitPriceCol]?.replace(/[^0-9.]/g, '') || 0) : 0,
            due_date: dueDateCol !== -1 ? row[dueDateCol]?.trim() : ''
        })).filter(m => m.part_no && m.po_no); // Require both

        onMatch(matches, currency);
        onClose();
    };

    return (
        <MobileModal
            isOpen={isOpen}
            onClose={onClose}
            title="엑셀 데이터 붙여넣기 매칭"
            maxWidth="max-w-4xl"
            footer={
                <div className="flex gap-2">
                    <button
                        onClick={handleReset}
                        className="flex-1 py-3 bg-slate-100 text-slate-700 font-bold rounded hover:bg-slate-200"
                    >
                        초기화 (Reset)
                    </button>
                    <button
                        onClick={handleApply}
                        disabled={previewData.length === 0}
                        className="flex-[2] py-3 bg-blue-600 text-white font-bold rounded disabled:bg-slate-300"
                    >
                        적용하기 ({previewData.length}건)
                    </button>
                </div>
            }
        >
            <div className="flex flex-col h-full gap-4">
                <div className="bg-blue-50 p-4 rounded text-sm text-blue-800">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="font-bold">💡 사용 방법</p>
                            <ul className="list-disc ml-4 mt-1 space-y-1">
                                <li>엑셀에서 데이터를 복사(Ctrl+C)하여 아래 영역에 붙여넣기(Ctrl+V)하세요.</li>
                                <li>자동으로 열을 인식하지만, 맞지 않다면 직접 선택해주세요.</li>
                                <li>도번(Part No)을 기준으로 매칭되며, PO번호/수량/단가/납기일이 업데이트됩니다.</li>
                            </ul>
                        </div>
                        <div className="bg-white p-2 rounded shadow-sm border border-blue-200">
                            <label className="block text-xs font-bold text-slate-500 mb-1">통화 (Currency)</label>
                            <select
                                className="border p-1 rounded text-sm font-bold text-slate-700 outline-none w-32"
                                value={currency}
                                onChange={(e) => setCurrency(e.target.value)}
                            >
                                <option value="KRW">KRW (₩)</option>
                                <option value="USD">USD ($)</option>
                                <option value="EUR">EUR (€)</option>
                                <option value="JPY">JPY (¥)</option>
                                <option value="CNY">CNY (¥)</option>
                            </select>
                        </div>
                    </div>
                </div>

                <textarea
                    className="w-full h-32 border p-2 rounded text-xs font-mono whitespace-pre"
                    placeholder="여기에 엑셀 데이터를 붙여넣으세요..."
                    value={text}
                    onPaste={handlePaste}
                    onChange={e => setText(e.target.value)}
                />

                {previewData.length > 0 && (
                    <div className="flex-1 overflow-auto border rounded">
                        <table className="w-full text-xs divide-y">
                            <thead className="bg-slate-100 sticky top-0">
                                <tr>
                                    {previewData[0].map((_, idx) => (
                                        <th key={idx} className="p-2 border-r min-w-[100px]">
                                            <select
                                                className="w-full border p-1 rounded font-bold"
                                                value={
                                                    idx === poCol ? 'po' :
                                                        idx === partNoCol ? 'part' :
                                                            idx === qtyCol ? 'qty' :
                                                                idx === unitPriceCol ? 'price' :
                                                                    idx === dueDateCol ? 'date' : ''
                                                }
                                                onChange={(e) => {
                                                    const val = e.target.value;
                                                    if (val === 'po') setPoCol(idx);
                                                    else if (val === 'part') setPartNoCol(idx);
                                                    else if (val === 'qty') setQtyCol(idx);
                                                    else if (val === 'price') setUnitPriceCol(idx);
                                                    else if (val === 'date') setDueDateCol(idx);
                                                    else {
                                                        if (idx === poCol) setPoCol(-1);
                                                        if (idx === partNoCol) setPartNoCol(-1);
                                                        if (idx === qtyCol) setQtyCol(-1);
                                                        if (idx === unitPriceCol) setUnitPriceCol(-1);
                                                        if (idx === dueDateCol) setDueDateCol(-1);
                                                    }
                                                }}
                                            >
                                                <option value="">(무시)</option>
                                                <option value="part" className="font-bold text-blue-600">도번 (Part No)*</option>
                                                <option value="po" className="font-bold text-green-600">PO 번호 (업데이트)</option>
                                                <option value="qty">수량 (Qty)</option>
                                                <option value="price">단가 (Unit Price)</option>
                                                <option value="date">납기일 (Due Date)</option>
                                            </select>
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="divide-y">
                                {previewData.slice(0, 50).map((row, rIdx) => (
                                    <tr key={rIdx} className="hover:bg-slate-50">
                                        {row.map((cell, cIdx) => (
                                            <td key={cIdx} className={`p-2 border-r truncate max-w-[150px] ${cIdx === poCol ? 'bg-green-50' :
                                                cIdx === partNoCol ? 'bg-blue-50' : ''
                                                }`}>
                                                {cell}
                                            </td>
                                        ))}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        {previewData.length > 50 && <div className="p-2 text-center text-slate-400 italic">... 외 {previewData.length - 50}행 생략됨</div>}
                    </div>
                )}
            </div>
        </MobileModal>
    );
}

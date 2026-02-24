import React, { useState } from 'react';
import { MobileModal } from '../common/MobileModal';

interface ImportedItem {
    part_name: string;
    spec?: string;
    drawing_number?: string;
    qty: number;
    unit_price: number;
    original_material_name?: string;
    material_text?: string;
    post_process_text?: string;
    heat_treatment_text?: string;
}

interface ImportItemsModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (items: ImportedItem[]) => void;
}

export function ImportItemsModal({ isOpen, onClose, onConfirm }: ImportItemsModalProps) {
    const [previewItems, setPreviewItems] = useState<ImportedItem[]>([]);
    const [rawRows, setRawRows] = useState<string[][]>([]);
    const [columnMapping, setColumnMapping] = useState<Record<number, string>>({});

    // Default to 'tab' or 'auto', simpler separator logic can remain for text paste
    // But mainly we rely on HTML table parsing for Excel

    const applyHeuristicMapping = (firstRow: string[], allRows: string[][]) => {
        const newMapping: Record<number, string> = {};
        // Detect likely numbers
        // If last column is number -> unit_price or total
        // If 2nd last is number -> qty
        // First col -> part_name
        if (firstRow.length >= 2) {
            newMapping[0] = 'part_name';
            const lastIdx = firstRow.length - 1;
            newMapping[lastIdx] = 'unit_price';
            if (firstRow.length >= 3) newMapping[lastIdx - 1] = 'qty';
            if (firstRow.length >= 4) newMapping[1] = 'spec';
        }
        setColumnMapping(newMapping);
        updatePreview(allRows, newMapping);
    };

    const handlePaste = (e: React.ClipboardEvent) => {
        const htmlData = e.clipboardData.getData('text/html');
        const textData = e.clipboardData.getData('text/plain');

        setRawRows([]);
        setPreviewItems([]);
        setColumnMapping({});

        if (htmlData && htmlData.includes('<table')) {
            const parser = new DOMParser();
            const doc = parser.parseFromString(htmlData, 'text/html');
            const trs = Array.from(doc.querySelectorAll('tr'));
            const rows = trs.map(tr =>
                Array.from(tr.querySelectorAll('td, th')).map(td => td.textContent?.trim() || '')
            );
            const cleanRows = rows.filter(r => r.some(c => c.trim().length > 0));

            if (cleanRows.length > 0) {
                setRawRows(cleanRows);

                const newMapping: Record<number, string> = {};
                // Try to find header row if possible, or just use first row heuristics
                // Simple heuristic: check first row for keywords
                const header = cleanRows[0].map(c => c.toLowerCase());

                header.forEach((text, idx) => {
                    if (text.includes('part') || text.includes('품명') || text.includes('number')) { newMapping[idx] = 'part_name'; }
                    if (text.includes('spec') || text.includes('규격') || text.includes('desc')) newMapping[idx] = 'spec';
                    if (text.includes('drawing') || text.includes('dwg') || text.includes('도번') || text.includes('도면')) newMapping[idx] = 'drawing_number';
                    if (text.includes('qty') || text.includes('수량') || text.includes('quantity')) newMapping[idx] = 'qty';
                    if (text.includes('price') || text.includes('단가') || text.includes('unit')) newMapping[idx] = 'unit_price';
                });

                setColumnMapping(newMapping);
                updatePreview(cleanRows, newMapping);
            }
            return;
        }

        if (textData) {
            // Fallback for plain text (e.g. from Notepad or simple copy)
            // Assume Tab separated values usually
            const lines = textData.split(/\r?\n/).filter(l => l.trim().length > 0);
            const rows = lines.map(line => line.split('\t').map(c => c.trim()));

            if (rows.length > 0) {
                setRawRows(rows);
                applyHeuristicMapping(rows[0], rows);
            }
        }
    };

    const handleColumnMappingChange = (colIndex: number, field: string) => {
        const newMapping = { ...columnMapping, [colIndex]: field };
        if (!field) delete newMapping[colIndex];
        setColumnMapping(newMapping);
        updatePreview(rawRows, newMapping);
    };

    const updatePreview = (rows: string[][], mapping: Record<number, string>) => {
        const partNameIndex = Object.keys(mapping).find(k => mapping[parseInt(k)] === 'part_name');
        if (!partNameIndex) {
            setPreviewItems([]);
            return;
        }
        const items = rows.map(row => {
            const raw: Record<string, string | number> = {};
            Object.entries(mapping).forEach(([colIdx, field]) => {
                const val = row[parseInt(colIdx)];
                if (field === 'qty' || field === 'unit_price') {
                    raw[field] = parseInt(val?.replace(/[^0-9]/g, '') || '0');
                } else {
                    raw[field] = val;
                }
            });
            if (!raw['part_name']) return null;
            if (!raw['qty']) raw['qty'] = 1;
            if (!raw['unit_price']) raw['unit_price'] = 0;
            return raw as unknown as ImportedItem;
        }).filter((x): x is ImportedItem => x !== null);
        setPreviewItems(items);
    };

    const handleConfirm = () => {
        onConfirm(previewItems);
        onClose();
        setPreviewItems([]);
        setRawRows([]);
    };

    return (
        <MobileModal
            isOpen={isOpen}
            onClose={onClose}
            title="📂 엑셀/표 붙여넣기 (Paste)"
            maxWidth="max-w-4xl"
        >
            <div className="flex flex-col h-[70vh] gap-4">
                {rawRows.length === 0 ? (
                    <div className="flex-none">
                        <label className="text-sm font-bold text-slate-600 mb-1">
                            엑셀이나 웹페이지 표를 복사(Ctrl+C)하여 붙여넣기(Ctrl+V) 하세요.
                        </label>
                        <div
                            className="border-2 border-dashed border-slate-300 rounded bg-slate-50 flex items-center justify-center p-8 text-center cursor-text hover:bg-slate-100 transition-colors h-48"
                            tabIndex={0}
                            onPaste={handlePaste}
                        >
                            <div className="pointer-events-none">
                                <span className="text-4xl block mb-2">📋</span>
                                <p className="font-bold text-slate-500">여기를 클릭 후, Ctrl + V 를 누르세요</p>
                                <p className="text-xs text-slate-400 mt-2">이미지/OCR 기능은 제거되었습니다. 텍스트 데이터만 지원합니다.</p>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="flex-none flex justify-between items-center bg-blue-50 p-3 rounded border border-blue-100">
                        <div className="text-sm text-blue-800 font-bold">
                            💡 각 열(Column)의 헤더를 클릭하여 데이터를 지정해주세요.
                        </div>
                        <button
                            onClick={() => { setRawRows([]); setPreviewItems([]); }}
                            className="text-xs bg-white border border-slate-300 px-3 py-1 rounded hover:bg-slate-50 font-bold shadow-sm"
                        >
                            🔄 초기화 / 다시 붙여넣기
                        </button>
                    </div>
                )}

                {/* Raw Grid */}
                {rawRows.length > 0 && (
                    <div className="flex-1 overflow-auto border rounded relative bg-white shadow-sm">
                        <table className="w-full text-xs text-left border-collapse">
                            <thead className="sticky top-0 bg-white z-10 shadow-sm">
                                <tr>
                                    <th className="p-2 w-10 bg-slate-100 border text-center font-bold text-slate-500">#</th>
                                    {Array.from({ length: Math.max(...rawRows.map(r => r.length)) }).map((_, colIndex) => (
                                        <th key={colIndex} className="p-1 min-w-[120px] border bg-slate-50">
                                            <select
                                                className={`w-full text-xs p-1.5 border rounded font-bold ${columnMapping[colIndex] ? 'bg-blue-100 text-blue-700 border-blue-300' : 'text-slate-400 bg-white'}`}
                                                value={columnMapping[colIndex] || ''}
                                                onChange={(e) => handleColumnMappingChange(colIndex, e.target.value)}
                                            >
                                                <option value="">(무시)</option>
                                                <option value="part_name">품명 (Part Name) *</option>
                                                <option value="spec">규격 (Spec)</option>
                                                <option value="drawing_number">도번 (Dwg No)</option>
                                                <option value="qty">수량 (Qty)</option>
                                                <option value="unit_price">단가 (Price)</option>
                                                {/* New Options */}
                                                <option value="original_material_name">도면재질 (Drawing Mat.)</option>
                                                <option value="material_text">실제 재질 (Material)</option>
                                                <option value="post_process_text">후처리 (Post Proc.)</option>
                                                <option value="heat_treatment_text">열처리 (Heat Treat.)</option>
                                            </select>
                                        </th>
                                    ))}
                                    <th className="p-1 w-10 bg-slate-100 border text-center"></th>
                                </tr>
                            </thead>
                            <tbody>
                                {rawRows.map((row, rowIndex) => (
                                    <tr key={rowIndex} className={`hover:bg-blue-50 transition-colors ${rowIndex < 1 ? 'bg-slate-50' : ''}`}>
                                        <td className="p-2 border text-center text-slate-400 bg-slate-50 font-mono">{rowIndex + 1}</td>
                                        {Array.from({ length: Math.max(...rawRows.map(r => r.length)) }).map((_, colIndex) => (
                                            <td key={colIndex} className={`p-2 border truncate max-w-[200px] ${columnMapping[colIndex] ? 'bg-blue-50/30' : ''}`}>
                                                {row[colIndex] || ''}
                                            </td>
                                        ))}
                                        <td className="p-1 border text-center">
                                            <button
                                                onClick={() => { const n = [...rawRows]; n.splice(rowIndex, 1); setRawRows(n); updatePreview(n, columnMapping); }}
                                                className="text-slate-300 hover:text-red-500 font-bold px-2 py-1"
                                            >
                                                ×
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                <div className="h-40 flex flex-col border rounded bg-slate-50 overflow-hidden shrink-0">
                    <div className="bg-slate-200 p-2 font-bold text-xs text-slate-700">최종 결과 ({previewItems.length}건)</div>
                    <div className="flex-1 overflow-auto p-2">
                        <table className="w-full text-xs text-left">
                            <thead><tr className="border-b"><th className="p-1">No.</th><th className="p-1">품명</th><th className="p-1">규격</th><th className="p-1">도번</th><th className="p-1">수량</th><th className="p-1">단가</th><th className="p-1">도면재질</th><th className="p-1">실제재질</th><th className="p-1">후처리</th><th className="p-1">열처리</th></tr></thead>
                            <tbody>
                                {previewItems.map((item, i) => (
                                    <tr key={i} className="border-b border-slate-100">
                                        <td className="p-1 text-slate-400">{i + 1}</td>
                                        <td className="p-1 font-bold text-blue-700">{item.part_name}</td>
                                        <td className="p-1">{item.spec}</td>
                                        <td className="p-1">{item.drawing_number}</td>
                                        <td className="p-1">{item.qty}</td>
                                        <td className="p-1 text-right">{item.unit_price}</td>
                                        <td className="p-1 text-slate-500">{item.original_material_name}</td>
                                        <td className="p-1 text-slate-500">{item.material_text}</td>
                                        <td className="p-1 text-slate-500">{item.post_process_text}</td>
                                        <td className="p-1 text-slate-500">{item.heat_treatment_text}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                <div className="mt-4 flex justify-end gap-2">
                    <button onClick={onClose} className="px-4 py-2 border rounded text-slate-600 font-bold">취소</button>
                    <button
                        onClick={handleConfirm}
                        disabled={previewItems.length === 0}
                        className="px-4 py-2 bg-blue-600 text-white rounded font-bold hover:bg-blue-700 disabled:bg-slate-300"
                    >
                        적용 ({previewItems.length}건)
                    </button>
                </div>

            </div>

        </MobileModal >
    );
}

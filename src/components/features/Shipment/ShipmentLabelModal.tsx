import { useRef, useState, useEffect, useMemo } from 'react';
import { supabase } from '../../../lib/supabaseClient';
import Barcode from 'react-barcode';
import { useReactToPrint } from 'react-to-print';
import { MobileModal } from '../../common/MobileModal';

interface ShipmentLabelModalProps {
    isOpen: boolean;
    onClose: () => void;
    items: any[]; // Shipment items with order_items details
}

export function ShipmentLabelModal({ isOpen, onClose, items }: ShipmentLabelModalProps) {
    const [labelWidth, setLabelWidth] = useState(55);
    const [labelHeight, setLabelHeight] = useState(35);
    const [splitByQty, setSplitByQty] = useState(false);
    const printRef = useRef(null);

    useEffect(() => {
        if (isOpen) {
            const fetchSettings = async () => {
                const { data: { user } } = await supabase.auth.getUser();
                if (user) {
                    const { data: profile } = await supabase.from('profiles').select('company_id').eq('id', user.id).single();
                    if (profile?.company_id) {
                        const { data: company } = await supabase.from('companies').select('label_printer_width, label_printer_height').eq('id', profile.company_id).single();
                        if (company) {
                            setLabelWidth(company.label_printer_width || 55);
                            setLabelHeight(company.label_printer_height || 35);
                        }
                    }
                }
            };
            fetchSettings();
        }
    }, [isOpen]);

    const handlePrint = useReactToPrint({
        contentRef: printRef,
        documentTitle: `Shipment_Labels`,
    });

    const labelItems = useMemo(() => {
        if (!splitByQty) {
            return items.map(item => ({
                ...item,
                labelQty: item.qty,
                displayIndex: null,
                totalIndex: null
            }));
        }

        // Split items by quantity
        const expandedItems: any[] = [];
        items.forEach(item => {
            const qty = item.qty || 1;
            for (let i = 1; i <= qty; i++) {
                expandedItems.push({
                    ...item,
                    labelQty: 1,
                    displayIndex: i,
                    totalIndex: qty
                });
            }
        });
        return expandedItems;
    }, [items, splitByQty]);

    return (
        <MobileModal
            isOpen={isOpen}
            onClose={onClose}
            title="📦 출하 라벨 출력"
            maxWidth="max-w-4xl"
            footer={
                <div className="flex w-full gap-2">
                    <button onClick={() => handlePrint()} className="flex-1 py-3 bg-indigo-600 text-white font-bold rounded hover:bg-indigo-700 shadow-lg">
                        🖨️ 인쇄 시작 ({labelItems.length}장)
                    </button>
                </div>
            }
        >
            <div className="bg-slate-100 p-4 overflow-auto max-h-[70vh] rounded border flex flex-col gap-4">
                {/* 설정 영역 */}
                <div className="bg-white p-3 rounded shadow-sm flex flex-col md:flex-row gap-4 justify-between items-center">
                    <div className="flex items-center gap-4">
                        <label className="flex items-center gap-2 cursor-pointer select-none">
                            <input
                                type="checkbox"
                                checked={splitByQty}
                                onChange={e => setSplitByQty(e.target.checked)}
                                className="w-5 h-5 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                            />
                            <span className="font-bold text-slate-700">수량별 낱개 출력 (Split by Qty)</span>
                        </label>
                    </div>

                    <div className="flex gap-2 items-center">
                        <span className="font-bold text-slate-700 text-sm">Size:</span>
                        <input
                            type="number"
                            value={labelWidth}
                            onChange={(e) => setLabelWidth(Number(e.target.value))}
                            className="w-14 border rounded px-1 py-1 text-sm bg-slate-50 font-bold text-center"
                        />
                        <span className="text-slate-400">x</span>
                        <input
                            type="number"
                            value={labelHeight}
                            onChange={(e) => setLabelHeight(Number(e.target.value))}
                            className="w-14 border rounded px-1 py-1 text-sm bg-slate-50 font-bold text-center"
                        />
                        <span className="text-slate-500 text-xs">mm</span>
                    </div>
                </div>

                {/* 인쇄 영역 (미리보기) */}
                <div className="overflow-auto bg-slate-300 p-8 flex justify-center">
                    <div
                        ref={printRef}
                        className="bg-white print:m-0 flex flex-col gap-1 items-start"
                        style={{ width: `${labelWidth}mm`, minHeight: '100px' }}
                    >
                        {labelItems.map((item, idx) => (
                            <div key={idx}
                                style={{
                                    width: `${labelWidth}mm`,
                                    height: `${labelHeight}mm`,
                                    pageBreakAfter: 'always',
                                    breakInside: 'avoid',
                                    overflow: 'hidden'
                                }}
                                className="border border-slate-300 bg-white relative box-border"
                            >
                                <div className="w-full h-full flex flex-col relative px-[2mm] py-[1.5mm]">
                                    {/* 1. Header: Item Name & Qty */}
                                    <div className="w-full flex justify-between items-end border-b-2 border-slate-800 pb-[1mm] mb-[1mm]">
                                        <h3
                                            className="font-bold text-slate-700 truncate"
                                            style={{
                                                fontSize: `${Math.max(10, labelWidth / 6)}px`,
                                                maxWidth: '70%'
                                            }}
                                        >
                                            {item.part_name}
                                        </h3>
                                        <span className="text-[12px] text-black font-extrabold leading-tight">
                                            {splitByQty
                                                ? `${item.displayIndex}/${item.totalIndex}`
                                                : `Qty: ${item.labelQty}`}
                                        </span>
                                    </div>

                                    {/* 2. Main: Part No (Largest) */}
                                    <div className="w-full flex flex-col justify-center flex-1">
                                        <p
                                            className="font-black text-black leading-none text-center break-all"
                                            style={{
                                                fontSize: `${Math.max(16, labelWidth / 3.5)}px`,
                                                lineHeight: '1.1'
                                            }}
                                        >
                                            {item.part_no}
                                        </p>
                                    </div>

                                    {/* 3. Footer: Barcode (Using part_no or order item no) */}
                                    <div className="flex flex-col items-center w-full mt-auto">
                                        <div className="w-full flex justify-center overflow-hidden" style={{ height: '35px' }}>
                                            <Barcode
                                                value={item.part_no || 'UNKNOWN'}
                                                width={1.6}
                                                height={35}
                                                fontSize={0}
                                                margin={0}
                                                displayValue={false}
                                            />
                                        </div>
                                        {/* Optional: Show Part No text below barcode if needed, or keeping explicit text above */}
                                        {/* For shipment labels, often the text is just the part no repeated or order no */}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
            <p className="text-xs text-slate-500 mt-2 text-center">
                * 라벨 프린터 설정에서 용지 크기를 {labelWidth}x{labelHeight}mm로 설정해주세요.
            </p>
        </MobileModal>
    );
}

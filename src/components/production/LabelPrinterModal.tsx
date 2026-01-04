import { useRef, useState, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';
import Barcode from 'react-barcode';
import { useReactToPrint } from 'react-to-print';
import { MobileModal } from '../common/MobileModal';
import { Order, OrderItem } from '../../types/order';

interface LabelPrinterModalProps {
    isOpen: boolean;
    onClose: () => void;
    order: Order | null;
    items: OrderItem[];
}

export function LabelPrinterModal({ isOpen, onClose, order, items }: LabelPrinterModalProps) {
    const [labelWidth, setLabelWidth] = useState(55);
    const [labelHeight, setLabelHeight] = useState(35);
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
        documentTitle: `Labels_${order?.po_no}`,
    });

    if (!order) return null;

    return (
        <MobileModal
            isOpen={isOpen}
            onClose={onClose}
            title="📦 라벨 출력"
            maxWidth="max-w-4xl"
            footer={
                <div className="flex w-full gap-2">
                    <button onClick={() => handlePrint()} className="flex-1 py-3 bg-indigo-600 text-white font-bold rounded hover:bg-indigo-700 shadow-lg">
                        🖨️ 인쇄 시작
                    </button>
                </div>
            }
        >
            <div className="bg-slate-100 p-4 overflow-auto max-h-[70vh] rounded border flex flex-col gap-4">
                {/* 설정 영역 */}
                <div className="bg-white p-3 rounded shadow-sm flex items-center justify-between">
                    <span className="font-bold text-slate-700">라벨 크기 (mm):</span>
                    <div className="flex gap-2 items-center">
                        <input
                            type="number"
                            value={labelWidth}
                            onChange={(e) => setLabelWidth(Number(e.target.value))}
                            className="w-16 border rounded px-2 py-1 text-sm bg-slate-50 font-bold text-center"
                        />
                        <span className="text-slate-400">x</span>
                        <input
                            type="number"
                            value={labelHeight}
                            onChange={(e) => setLabelHeight(Number(e.target.value))}
                            className="w-16 border rounded px-2 py-1 text-sm bg-slate-50 font-bold text-center"
                        />
                    </div>
                </div>

                {/* 인쇄 영역 (미리보기) */}
                <div className="overflow-auto bg-slate-300 p-8 flex justify-center">
                    <div
                        ref={printRef}
                        className="bg-white print:m-0 flex flex-col gap-1 items-start"
                        style={{ width: `${labelWidth}mm`, minHeight: '100px' }} // Container width fits label width
                    >
                        {items.map((item, idx) => (
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
                                {/* Dynamic Layout based on sticker concept */}
                                <div className="w-full h-full flex flex-col relative px-[2mm] py-[1.5mm]">
                                    {/* 1. Header: Item Name & Qty */}
                                    <div className="w-full flex justify-between items-end border-b-2 border-slate-800 pb-[1mm] mb-[1mm]">
                                        <h3
                                            className="font-bold text-slate-700 truncate"
                                            style={{
                                                fontSize: `${Math.max(10, labelWidth / 6)}px`,
                                                maxWidth: '75%'
                                            }}
                                        >
                                            {item.part_name}
                                        </h3>
                                        <span className="text-[12px] text-black font-extrabold leading-tight">
                                            Qty: {item.qty}
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
                                        {(item.spec) && (
                                            <p className="text-center text-[9px] text-slate-500 font-semibold mt-[1mm] truncate px-2">
                                                {item.spec}
                                            </p>
                                        )}
                                    </div>

                                    {/* 3. Details: Post-processing */}
                                    {(item.post_processing_name || (item as any).post_processing) && (
                                        <div className="w-full text-center mb-[1mm]">
                                            <span className="text-[9px] font-bold text-blue-700 border border-blue-200 bg-blue-50 px-2 py-0.5 rounded-full inline-block truncate max-w-full">
                                                {item.post_processing_name || (item as any).post_processing}
                                            </span>
                                        </div>
                                    )}

                                    {/* 4. Footer: Barcode (Order No) */}
                                    <div className="flex flex-col items-center w-full">
                                        {/* Barcode component with less margin to avoid cut-off */}
                                        <div className="w-full flex justify-center overflow-hidden" style={{ height: '35px' }}>
                                            <Barcode
                                                value={item.order_item_no || `${order.po_no.replace(/PO[-]/g, '')}-${idx + 1}`}
                                                width={1.6}
                                                height={35}
                                                fontSize={0} // Hide default text
                                                margin={0}
                                                displayValue={false} // Manually render text for better control
                                            />
                                        </div>
                                        <span className="text-[8px] font-mono font-bold text-slate-600 mt-[1px]">
                                            {item.order_item_no || `${order.po_no.replace(/PO[-]/g, '')}-${idx + 1}`}
                                        </span>
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

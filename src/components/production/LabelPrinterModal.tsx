import { useRef, useState } from 'react';
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
    const [printMode, setPrintMode] = useState<'a4' | 'label'>('a4');
    const printRef = useRef(null);

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
                    <span className="font-bold text-slate-700">용지 설정:</span>
                    <div className="flex bg-slate-100 rounded p-1">
                        <button
                            onClick={() => setPrintMode('a4')}
                            className={`px-4 py-1 rounded text-sm font-bold transition-colors ${printMode === 'a4' ? 'bg-white shadow text-blue-600' : 'text-slate-400'}`}
                        >
                            A4 (2단)
                        </button>
                        <button
                            onClick={() => setPrintMode('label')}
                            className={`px-4 py-1 rounded text-sm font-bold transition-colors ${printMode === 'label' ? 'bg-white shadow text-blue-600' : 'text-slate-400'}`}
                        >
                            라벨지 (1장씩)
                        </button>
                    </div>
                </div>

                {/* 인쇄 영역 */}
                <div className="overflow-auto bg-slate-300 p-4 flex justify-center">
                    <div
                        ref={printRef}
                        className={`bg-white ${printMode === 'a4' ? 'w-[210mm] p-8 grid grid-cols-2 gap-4' : 'w-[100mm] flex flex-col gap-1'} print:m-0`}
                        style={{ minHeight: printMode === 'a4' ? '297mm' : 'auto' }}
                    >
                        {items.map((item, idx) => (
                            <div key={idx}
                                className={`
                        border-2 border-slate-800 flex flex-col items-center justify-between break-inside-avoid page-break-after-always
                        ${printMode === 'a4' ? 'h-[200px] p-2' : 'h-[60mm] w-[100mm] p-2 mb-1'}
                    `}
                            >
                                <div className="w-full text-center border-b-2 border-slate-800 pb-1 mb-1">
                                    <h3 className={`${printMode === 'a4' ? 'text-xl' : 'text-lg'} font-black text-slate-900 truncate`}>{item.part_name}</h3>
                                    <p className="text-sm font-bold text-slate-600 truncate">{item.part_no}</p>
                                </div>

                                <div className="flex w-full justify-between px-2 text-xs font-bold mb-1">
                                    <span>{item.spec}</span>
                                    <span>Qty: {item.qty}</span>
                                </div>

                                <div className="flex-1 flex items-center justify-center overflow-hidden">
                                    {/* Barcode: OrderID-ItemID */}
                                    <Barcode value={`${order.po_no.replace('PO-', '')}-${idx + 1}`} width={1.5} height={printMode === 'a4' ? 40 : 30} fontSize={10} />
                                </div>

                                <div className="w-full text-center border-t border-slate-800 pt-1 mt-1 text-[10px] text-slate-500">
                                    DueDate: {new Date(order.delivery_date).toLocaleDateString()}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
            <p className="text-xs text-slate-500 mt-2 text-center">
                * 인쇄 시 '배경 그래픽 포함' 옵션을 체크하면 더 선명합니다.
            </p>
        </MobileModal>
    );
}

import { useRef } from 'react';
import { useReactToPrint } from 'react-to-print';
import Barcode from 'react-barcode';
import { Shipment, ShipmentWithItems } from '../../../types/shipment';
import { Button } from '../../common/ui/Button';

interface ShipmentLabelProps {
    shipment: ShipmentWithItems;
    onClose?: () => void;
}

export function ShipmentLabelPrinter({ shipment, onClose }: ShipmentLabelProps) {
    const componentRef = useRef<HTMLDivElement>(null);

    // Setup Print Handler
    const handlePrint = useReactToPrint({
        // @ts-ignore - 'content' is correct locally but types might mismatch slightly
        content: () => componentRef.current,
        documentTitle: `Label_${shipment.shipment_no}`,
        onAfterPrint: () => onClose && onClose()
    });

    return (
        <div className="flex flex-col items-center gap-4">
            <div className="bg-gray-100 p-4 rounded border">
                {/* Print Preview Area */}
                <div ref={componentRef} className="bg-white p-4 w-[100mm] min-h-[60mm] text-xs font-sans text-black border border-dashed border-gray-300 print:border-0">
                    {/* Label Content - 100mm x 60mm typical size */}
                    <div className="flex justify-between items-start border-b-2 border-black pb-2 mb-2">
                        <div>
                            <h1 className="text-xl font-bold">MiniPDM</h1>
                            <p className="text-[10px]">Shipment Label</p>
                        </div>
                        <div className="w-[120px] overflow-hidden">
                            <Barcode value={shipment.shipment_no} width={1} height={30} fontSize={10} displayValue={false} />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 mb-2">
                        <div>
                            <span className="font-bold block">Shipment No:</span>
                            <span>{shipment.shipment_no}</span>
                        </div>
                        <div>
                            <span className="font-bold block">Date:</span>
                            <span>{shipment.shipped_at ? shipment.shipped_at.substring(0, 10) : '-'}</span>
                        </div>
                    </div>

                    <div className="mb-2">
                        <span className="font-bold block">To:</span>
                        <div className="whitespace-pre-wrap">
                            {shipment.recipient_name} ({shipment.recipient_contact})<br />
                            {shipment.recipient_address}
                        </div>
                    </div>

                    <div className="border-t border-black pt-1">
                        <span className="font-bold">Contents:</span>
                        <ul className="list-disc pl-4 mt-1">
                            {shipment.shipment_items.slice(0, 5).map((item, idx) => (
                                <li key={idx}>
                                    {item.quantity} x Item (ID: {item.order_item_id.substring(0, 8)}...)
                                </li>
                            ))}
                            {shipment.shipment_items.length > 5 && <li>...and {shipment.shipment_items.length - 5} more</li>}
                        </ul>
                    </div>
                </div>
            </div>

            <div className="flex gap-2">
                <Button variant="secondary" onClick={onClose}>닫기</Button>
                <Button variant="primary" onClick={handlePrint}>🖨️ 인쇄하기</Button>
            </div>
        </div>
    );
}

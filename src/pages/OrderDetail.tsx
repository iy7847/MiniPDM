import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { Order, OrderItem } from '../types/order';
import { FileDropZone } from '../components/common/FileDropZone';
import { LabelPrinterModal } from '../components/production/LabelPrinterModal';

interface OrderDetailProps {
    orderId: string | null;
    onBack: () => void;
}

export function OrderDetail({ orderId, onBack }: OrderDetailProps) {
    const [loading, setLoading] = useState(false);
    const [order, setOrder] = useState<Order | null>(null);
    const [items, setItems] = useState<OrderItem[]>([]);
    const [isLabelModalOpen, setIsLabelModalOpen] = useState(false);

    useEffect(() => {
        if (orderId) fetchOrder(orderId);
    }, [orderId]);

    const fetchOrder = async (id: string) => {
        setLoading(true);
        const { data: orderData, error: orderError } = await supabase
            .from('orders').select('*').eq('id', id).single();

        if (orderError) {
            console.error(orderError);
            setLoading(false);
            return;
        }
        setOrder(orderData);

        const { data: itemData } = await supabase
            .from('order_items').select('*').eq('order_id', id);

        if (itemData) setItems(itemData as OrderItem[]);
        setLoading(false);
    };

    const handlePoFileDrop = (files: File[]) => {
        alert(`[PO Parser] ${files.length}개 파일이 업로드되었습니다.\n(현재는 데모 모드로, 실제 파싱 로직은 구현되지 않았습니다.)`);
        // TODO: Implement parsing logic
    };

    if (loading) return <div>Loading...</div>;

    return (
        <div className="h-full flex flex-col bg-white rounded-lg shadow border border-slate-200 overflow-hidden">
            <div className="flex justify-between items-center p-4 border-b bg-slate-50 shrink-0">
                <div className="flex items-center gap-3">
                    <button onClick={onBack} className="text-slate-500 hover:text-slate-700 font-bold">← 뒤로</button>
                    <h2 className="text-lg font-bold text-slate-800">
                        {orderId ? '수주 상세 (Order Detail)' : '새 수주 작성'}
                    </h2>
                </div>
                <div>
                    <button
                        onClick={() => setIsLabelModalOpen(true)}
                        className="px-3 py-2 bg-indigo-600 text-white text-sm font-bold rounded hover:bg-indigo-700 shadow-sm flex items-center gap-1"
                    >
                        🏷️ 생산 라벨 출력
                    </button>
                </div>
            </div>
            <div className="p-8 overflow-auto">
                <div className="flex gap-6 mb-8">
                    <div className="flex-1">
                        <h3 className="text-lg font-bold mb-4">기본 정보</h3>
                        {order ? (
                            <div className="grid grid-cols-2 gap-4">
                                <div className="p-4 bg-slate-50 rounded border">
                                    <span className="block text-xs font-bold text-slate-500">PO No.</span>
                                    <span className="text-lg font-bold text-blue-700">{order.po_no}</span>
                                </div>
                                <div className="p-4 bg-slate-50 rounded border">
                                    <span className="block text-xs font-bold text-slate-500">납기일 (Delivery Date)</span>
                                    <span className="text-lg font-bold text-slate-700">{new Date(order.delivery_date).toLocaleDateString()}</span>
                                </div>
                                <div className="p-4 bg-slate-50 rounded border col-span-2">
                                    <span className="block text-xs font-bold text-slate-500">비고 (Note)</span>
                                    <span className="text-sm text-slate-700">{order.note || '-'}</span>
                                </div>
                            </div>
                        ) : (
                            <div className="text-slate-400">정보가 없습니다.</div>
                        )}
                    </div>
                    <div className="w-1/3">
                        <h3 className="text-lg font-bold mb-4">발주서 (PO) 파일</h3>
                        <FileDropZone onFilesDropped={handlePoFileDrop} className="h-40 text-sm" />
                        <p className="text-xs text-slate-400 mt-1 text-center">PDF 파일을 이곳에 드래그하세요.</p>
                    </div>
                </div>

                <h3 className="text-lg font-bold mb-4">주문 품목 ({items.length})</h3>
                <div className="border rounded overflow-hidden">
                    <table className="min-w-full divide-y divide-slate-200">
                        <thead className="bg-slate-50">
                            <tr>
                                <th className="px-4 py-2 text-left text-xs font-bold text-slate-500">품명</th>
                                <th className="px-4 py-2 text-left text-xs font-bold text-slate-500">도번</th>
                                <th className="px-4 py-2 text-left text-xs font-bold text-slate-500">규격</th>
                                <th className="px-4 py-2 text-left text-xs font-bold text-slate-500">재질</th>
                                <th className="px-4 py-2 text-right text-xs font-bold text-slate-500">수량</th>
                                <th className="px-4 py-2 text-right text-xs font-bold text-slate-500">단가</th>
                                <th className="px-4 py-2 text-center text-xs font-bold text-slate-500">상태</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200 bg-white">
                            {items.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="px-4 py-8 text-center text-slate-400">
                                        아직 등록된 품목이 없습니다.
                                    </td>
                                </tr>
                            ) : (
                                items.map(item => (
                                    <tr key={item.id} className="hover:bg-slate-50">
                                        <td className="px-4 py-3 text-sm font-bold text-slate-700">{item.part_name}</td>
                                        <td className="px-4 py-3 text-sm text-slate-600">{item.part_no}</td>
                                        <td className="px-4 py-3 text-sm text-slate-500">{item.spec}</td>
                                        <td className="px-4 py-3 text-sm text-slate-500">{item.material_name}</td>
                                        <td className="px-4 py-3 text-right text-sm font-bold">{item.qty}</td>
                                        <td className="px-4 py-3 text-right text-sm text-slate-600">
                                            {item.unit_price?.toLocaleString()}
                                        </td>
                                        <td className="px-4 py-3 text-center">
                                            <span className="px-2 py-1 text-xs bg-slate-100 rounded text-slate-500 font-bold">
                                                {item.process_status}
                                            </span>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            <LabelPrinterModal
                isOpen={isLabelModalOpen}
                onClose={() => setIsLabelModalOpen(false)}
                order={order}
                items={items}
            />
        </div>
    );
}

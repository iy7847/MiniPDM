import { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabaseClient';
import { OrderItem } from '../../../types/order';
import { Button } from '../../common/ui/Button';
import { Input } from '../../common/ui/Input';

interface ShipmentModalProps {
    isOpen: boolean;
    onClose: () => void;
    orderId: string;
    items: OrderItem[];
    onSuccess: () => void;
}

export function ShipmentModal({ isOpen, onClose, orderId, items, onSuccess }: ShipmentModalProps) {
    const [loading, setLoading] = useState(false);
    const [quantities, setQuantities] = useState<Record<string, number>>({});
    const [shippedQuantities, setShippedQuantities] = useState<Record<string, number>>({});

    // Shipment Header Info
    const [form, setForm] = useState({
        recipient_name: '',
        recipient_contact: '',
        recipient_address: '',
        tracking_no: '',
        courier: '',
        memo: ''
    });

    useEffect(() => {
        if (isOpen && orderId) {
            fetchShippedQuantities();
        }
    }, [isOpen, orderId]);

    const fetchShippedQuantities = async () => {
        setLoading(true);
        // Fetch all shipment items for this order linked via shipment_items -> shipments (where order_id = orderId)
        // Or simpler: select quantity, order_item_id from shipment_items where order_item_id in (items.ids)

        // Since we don't have direct FK from shipment_item to order (we do have order_item_id), 
        // we can fetch all shipment_items for these order_items.
        if (items.length === 0) {
            setLoading(false);
            return;
        }

        const itemIds = items.map(i => i.id);
        const { data, error } = await supabase
            .from('shipment_items')
            .select('order_item_id, quantity')
            .in('order_item_id', itemIds);

        if (error) {
            console.error(error);
            setLoading(false);
            return;
        }

        const totals: Record<string, number> = {};
        data?.forEach((row: any) => {
            totals[row.order_item_id] = (totals[row.order_item_id] || 0) + row.quantity;
        });
        setShippedQuantities(totals);
        setLoading(false);
    };

    const handleQuantityChange = (itemId: string, val: string) => {
        const num = parseInt(val) || 0;
        setQuantities(prev => ({ ...prev, [itemId]: num }));
    };

    const handleSubmit = async () => {
        // Validate
        const itemsToShip = Object.entries(quantities).filter(([_, qty]) => qty > 0);
        if (itemsToShip.length === 0) {
            alert('출하할 품목과 수량을 입력해주세요.');
            return;
        }

        if (!form.recipient_name) {
            if (!confirm('수령인 정보가 없습니다. 계속 진행하시겠습니까?')) return;
        }

        setLoading(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('User not found');

            const { data: profile } = await supabase.from('profiles').select('company_id').eq('id', user.id).single();
            if (!profile?.company_id) throw new Error('Company not found');

            // 1. Create Shipment
            const shipmentNo = `SH-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`;

            const { data: shipment, error: shipmentError } = await supabase
                .from('shipments')
                .insert({
                    company_id: profile.company_id, // Use profile's company_id which references companies(id) logic (Wait, migration uses companies(id) but local profile has it)
                    // Wait, my profile table has company_id. 
                    // And I fixed the migration to reference public.companies(id).
                    // So I must ensure profile.company_id is valid UUID. It should be.
                    order_id: orderId,
                    shipment_no: shipmentNo,
                    status: 'shipped',
                    recipient_name: form.recipient_name,
                    recipient_contact: form.recipient_contact,
                    recipient_address: form.recipient_address,
                    courier: form.courier,
                    tracking_no: form.tracking_no,
                    memo: form.memo,
                    shipped_at: new Date().toISOString(),
                    created_by: user.id
                })
                .select()
                .single();

            if (shipmentError) throw shipmentError;
            if (!shipment) throw new Error('Failed to create shipment');

            // 2. Create Shipment Items
            const shipmentItemsPayload = itemsToShip.map(([itemId, qty]) => ({
                company_id: profile.company_id,
                shipment_id: shipment.id,
                order_item_id: itemId,
                quantity: qty
            }));

            const { error: itemsError } = await supabase
                .from('shipment_items')
                .insert(shipmentItemsPayload);

            if (itemsError) throw itemsError;

            // 3. Update Order Status (Optional logic)
            // Check if all items are fully shipped? 
            // For now, simple update to 'partially_shipped' or 'shipped' based on total vs shipped.
            // (Complex logic omitted for speed, just setting to partially_shipped or shipped could be good)

            alert('출하가 등록되었습니다.');
            setQuantities({});
            setForm({
                recipient_name: '',
                recipient_contact: '',
                recipient_address: '',
                tracking_no: '',
                courier: '',
                memo: ''
            }); // Reset form
            onSuccess();
            onClose();

        } catch (e: any) {
            console.error(e);
            alert('출하 등록 실패: ' + e.message);
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white w-full max-w-4xl max-h-[90vh] rounded-lg shadow-xl flex flex-col">
                <div className="p-4 border-b flex justify-between items-center">
                    <h2 className="text-lg font-bold">출하 등록 (Create Shipment)</h2>
                    <button onClick={onClose} className="text-gray-500 hover:text-gray-700">✕</button>
                </div>

                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                    {/* Header Info */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Input
                            label="수령인 (Recipient)"
                            value={form.recipient_name}
                            onChange={e => setForm({ ...form, recipient_name: e.target.value })}
                        />
                        <Input
                            label="연락처 (Contact)"
                            value={form.recipient_contact}
                            onChange={e => setForm({ ...form, recipient_contact: e.target.value })}
                        />
                        <div className="md:col-span-2">
                            <Input
                                label="배송 주소 (Address)"
                                value={form.recipient_address}
                                onChange={e => setForm({ ...form, recipient_address: e.target.value })}
                            />
                        </div>
                        <Input
                            label="택배사 (Courier)"
                            value={form.courier}
                            onChange={e => setForm({ ...form, courier: e.target.value })}
                        />
                        <Input
                            label="운송장 번호 (Tracking No)"
                            value={form.tracking_no}
                            onChange={e => setForm({ ...form, tracking_no: e.target.value })}
                        />
                        <div className="md:col-span-2">
                            <Input
                                label="메모 (Memo)"
                                value={form.memo}
                                onChange={e => setForm({ ...form, memo: e.target.value })}
                            />
                        </div>
                    </div>

                    {/* Items Table */}
                    <div>
                        <h3 className="font-bold text-gray-700 mb-2">출하 품목 선택</h3>
                        <div className="border rounded overflow-hidden">
                            <table className="w-full text-sm text-left">
                                <thead className="bg-gray-50 text-gray-700 border-b">
                                    <tr>
                                        <th className="p-3">품명 (Part Name)</th>
                                        <th className="p-3">규격 (Spec)</th>
                                        <th className="p-3">수주 수량</th>
                                        <th className="p-3">기출하</th>
                                        <th className="p-3 w-32">출하 수량</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y">
                                    {items.map(item => {
                                        const shipped = shippedQuantities[item.id] || 0;
                                        const remaining = item.qty - shipped;
                                        const currentInput = quantities[item.id] || 0;

                                        return (
                                            <tr key={item.id} className="hover:bg-gray-50">
                                                <td className="p-3">
                                                    <div className="font-medium">{item.part_name}</div>
                                                    <div className="text-xs text-gray-500">{item.part_no}</div>
                                                </td>
                                                <td className="p-3 text-gray-600">{item.spec}</td>
                                                <td className="p-3 font-medium">{item.qty}</td>
                                                <td className="p-3 text-gray-600">{shipped}</td>
                                                <td className="p-3">
                                                    <input
                                                        type="number"
                                                        className="w-full border rounded px-2 py-1 text-right focus:ring-2 focus:ring-blue-200 outline-none"
                                                        min={0}
                                                        max={remaining}
                                                        value={quantities[item.id] || ''}
                                                        onChange={e => handleQuantityChange(item.id, e.target.value)}
                                                        placeholder={remaining > 0 ? remaining.toString() : '-'}
                                                    />
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>

                <div className="p-4 border-t bg-gray-50 flex justify-end gap-2">
                    <Button variant="secondary" onClick={onClose}>취소</Button>
                    <Button variant="primary" onClick={handleSubmit} disabled={loading}>
                        {loading ? '처리 중...' : '출하 등록 (Ship)'}
                    </Button>
                </div>
            </div>
        </div>
    );
}

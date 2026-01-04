import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useProfile } from '../hooks/useProfile';
import { PageHeader } from '../components/common/ui/PageHeader';
import { Section } from '../components/common/ui/Section';
import { Card } from '../components/common/ui/Card';
import { Button } from '../components/common/ui/Button';
import { ShipmentLabelModal } from '../components/features/Shipment/ShipmentLabelModal';

export function ShipmentList({ onNavigate }: { onNavigate: (page: string, id?: string | null) => void }) {
    const { profile } = useProfile();
    const [items, setItems] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [clients, setClients] = useState<{ id: string, name: string }[]>([]);
    const [selectedItemIds, setSelectedItemIds] = useState<Set<string>>(new Set());
    const [isLabelModalOpen, setIsLabelModalOpen] = useState(false);

    const [filters, setFilters] = useState({
        status: 'unshipped', // 'unshipped' | 'shipped' | 'all'
        clientId: '',
        startDate: '', // For Delivery Date (Requested Date)
        endDate: '',
        keyword: ''
    });

    useEffect(() => {
        if (profile?.company_id) {
            fetchClients();
            fetchItems();
        }
    }, [filters, profile]);

    const fetchClients = async () => {
        if (!profile?.company_id) return;
        const { data } = await supabase
            .from('clients')
            .select('id, name')
            .eq('company_id', profile.company_id)
            .order('name');
        setClients(data || []);
    };

    const fetchItems = async () => {
        if (!profile?.company_id) return;

        setLoading(true);
        // We need to fetch order_items and join orders and shipment_items
        let query = supabase
            .from('order_items')
            .select(`
                *,
                orders!inner(
                    id, 
                    po_no, 
                    delivery_date, 
                    client_id,
                    clients!inner(name)
                ),
                shipment_items(
                    id,
                    shipment_id,
                    created_at,
                    shipments(
                        shipment_no,
                        created_at
                    )
                )
            `)
            .eq('orders.company_id', profile.company_id)
            .order('orders(delivery_date)', { ascending: true });

        // 1. Client Filter
        if (filters.clientId) {
            query = query.eq('orders.client_id', filters.clientId);
        }

        // 2. Date Filter (on orders.delivery_date)
        if (filters.startDate) {
            query = query.gte('orders.delivery_date', filters.startDate);
        }
        if (filters.endDate) {
            query = query.lte('orders.delivery_date', filters.endDate);
        }

        // 3. Keyword
        if (filters.keyword) {
            query = query.or(`part_no.ilike.%${filters.keyword}%,part_name.ilike.%${filters.keyword}%,orders.po_no.ilike.%${filters.keyword}%`);
        }

        const { data, error } = await query;
        if (error) {
            console.error("Error fetching items:", error);
            setItems([]);
        } else {
            // Client-side filtering for joined tables (Status) involves checking shipment_items
            let filtered = data || [];

            if (filters.status === 'unshipped') {
                filtered = filtered.filter((i: any) => !i.shipment_items || i.shipment_items.length === 0);
            } else if (filters.status === 'shipped') {
                filtered = filtered.filter((i: any) => i.shipment_items && i.shipment_items.length > 0);
            }

            setItems(filtered);
            setSelectedItemIds(new Set()); // Reset selection on fetch
        }
        setLoading(false);
    };

    const handleUpdateDeliveryDate = async (orderId: string, newDate: string) => {
        if (!confirm("납기일을 수정하시겠습니까? (동일 수주 건의 모든 품목에 적용됩니다)")) return;

        const { error } = await supabase
            .from('orders')
            .update({ delivery_date: newDate })
            .eq('id', orderId);

        if (!error) {
            // Optimistic update for all items belonging to this order
            setItems(prev => prev.map(i => i.orders.id === orderId ? { ...i, orders: { ...i.orders, delivery_date: newDate } } : i));
        } else {
            alert("납기일 수정 중 오류가 발생했습니다.");
        }
    };

    const handleCompleteShipment = async (item: any, shipmentDate: string) => {
        if (!confirm(`[${item.part_no}] 품목을 출하 처리하시겠습니까?`)) return;

        try {
            // 1. Create Shipment Record (One shipment per action for now)
            const today = new Date().toLocaleDateString('ko-KR', { year: '2-digit', month: '2-digit', day: '2-digit' }).replace(/\. /g, '').replace('.', '');
            const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
            const shipmentNo = `SH${today}-${random}`; // e.g. SH240104-123

            const { data: shipment, error: shipError } = await supabase
                .from('shipments')
                .insert({
                    company_id: profile?.company_id,
                    order_id: item.orders.id,
                    shipment_no: shipmentNo,
                    status: 'shipped',
                    recipient_name: item.orders.clients?.name,
                    shipped_at: new Date(shipmentDate).toISOString()
                })
                .select()
                .single();

            if (shipError) throw shipError;

            // 2. Create Shipment Item
            const { error: itemError } = await supabase
                .from('shipment_items')
                .insert({
                    company_id: profile?.company_id,
                    shipment_id: shipment.id,
                    order_item_id: item.id,
                    quantity: item.qty // Full qty shipment
                });

            if (itemError) throw itemError;

            alert("출하가 완료되었습니다.");
            fetchItems(); // Refresh

        } catch (e: any) {
            console.error(e);
            alert("출하 처리 중 오류가 발생했습니다: " + e.message);
        }
    };

    const handleCancelShipment = async (shipmentItemId: string) => {
        if (!confirm("출하를 취소(삭제) 하시겠습니까?")) return;

        const { error } = await supabase.from('shipment_items').delete().eq('id', shipmentItemId);

        if (!error) {
            fetchItems();
        } else {
            alert("취소 실패: " + error.message);
        }
    };

    const toggleSelection = (id: string) => {
        const next = new Set(selectedItemIds);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        setSelectedItemIds(next);
    };

    const toggleAll = () => {
        if (selectedItemIds.size === items.length) {
            setSelectedItemIds(new Set());
        } else {
            setSelectedItemIds(new Set(items.map(i => i.id)));
        }
    };

    const getSelectedItems = () => {
        return items.filter(i => selectedItemIds.has(i.id));
    };

    return (
        <div className="h-full flex flex-col bg-slate-50 relative">
            <div className="flex-1 overflow-y-auto p-4 md:p-8 space-y-6">
                <PageHeader
                    title="🚛 출하 관리 (Shipment Management)"
                    actions={
                        <Button
                            onClick={() => {
                                if (selectedItemIds.size === 0) {
                                    alert('출력할 품목을 선택해주세요.');
                                    return;
                                }
                                setIsLabelModalOpen(true);
                            }}
                            className={`bg-indigo-600 hover:bg-indigo-700 text-white font-bold ${selectedItemIds.size > 0 ? 'animate-pulse' : ''}`}
                        >
                            🖨️ 라벨 인쇄 ({selectedItemIds.size})
                        </Button>
                    }
                />

                {/* Filters */}
                <Section>
                    <Card className="p-4 space-y-4">
                        {/* Status Tabs */}
                        <div className="flex space-x-1 border-b">
                            {[
                                { key: 'unshipped', label: '미출하 (Unshipped)' },
                                { key: 'shipped', label: '출하 완료 (Shipped)' },
                                { key: 'all', label: '전체 (All)' },
                            ].map(tab => (
                                <button
                                    key={tab.key}
                                    onClick={() => setFilters({ ...filters, status: tab.key })}
                                    className={`px-4 py-2 text-sm font-bold border-b-2 transition-colors ${filters.status === tab.key
                                        ? 'border-blue-600 text-blue-600'
                                        : 'border-transparent text-slate-500 hover:text-slate-700'
                                        }`}
                                >
                                    {tab.label}
                                </button>
                            ))}
                        </div>

                        <div className="flex flex-col md:flex-row gap-4 items-end">
                            {/* Client Filter */}
                            <div className="flex flex-col gap-1 w-full md:w-auto">
                                <span className="text-xs font-bold text-slate-500">거래처 (Client)</span>
                                <select
                                    className="border p-2 rounded text-sm w-full md:w-48 outline-none focus:ring-2 focus:ring-blue-100 bg-white"
                                    value={filters.clientId}
                                    onChange={e => setFilters({ ...filters, clientId: e.target.value })}
                                >
                                    <option value="">전체 (All Clients)</option>
                                    {clients.map(c => (
                                        <option key={c.id} value={c.id}>{c.name}</option>
                                    ))}
                                </select>
                            </div>

                            {/* Date Filter */}
                            <div className="flex flex-col gap-1 w-full md:w-auto">
                                <span className="text-xs font-bold text-slate-500">출하요청일 (Requested Date)</span>
                                <div className="flex items-center gap-2">
                                    <input
                                        type="date"
                                        className="border p-2 rounded text-sm outline-none focus:ring-2 focus:ring-blue-100 text-slate-600"
                                        value={filters.startDate}
                                        onChange={e => setFilters({ ...filters, startDate: e.target.value })}
                                    />
                                    <span className="text-slate-400">~</span>
                                    <input
                                        type="date"
                                        className="border p-2 rounded text-sm outline-none focus:ring-2 focus:ring-blue-100 text-slate-600"
                                        value={filters.endDate}
                                        onChange={e => setFilters({ ...filters, endDate: e.target.value })}
                                    />
                                </div>
                            </div>

                            {/* Keyword */}
                            <div className="flex flex-col gap-1 w-full md:flex-1">
                                <span className="text-xs font-bold text-slate-500">검색 (Search)</span>
                                <input
                                    className="border p-2 rounded text-sm w-full outline-none focus:ring-2 focus:ring-blue-100 placeholder:text-slate-400"
                                    placeholder="도번 / 품명 / PO 검색"
                                    value={filters.keyword}
                                    onChange={e => setFilters({ ...filters, keyword: e.target.value })}
                                />
                            </div>
                        </div>
                    </Card>
                </Section>

                <Section title={`품목 목록 (${items.length}건)`}>
                    <Card noPadding className="overflow-hidden min-h-[400px]">
                        <table className="min-w-full divide-y divide-slate-200">
                            <thead className="bg-slate-50">
                                <tr>
                                    <th className="px-3 py-3 w-[40px] text-center">
                                        <input type="checkbox" onChange={toggleAll} checked={items.length > 0 && selectedItemIds.size === items.length} className="w-4 h-4 rounded" />
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider w-[15%]">업체 / PO</th>
                                    <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider w-[35%]">품목 정보 (Item Info)</th>
                                    <th className="px-6 py-3 text-center text-xs font-bold text-slate-500 uppercase tracking-wider w-[10%]">재질/수량</th>
                                    <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider w-[15%]">출하 요청일</th>
                                    <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider w-[20%]">출하 처리</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-slate-200">
                                {loading ? (
                                    <tr><td colSpan={6} className="text-center py-20 text-slate-400">로딩 중...</td></tr>
                                ) : items.length === 0 ? (
                                    <tr><td colSpan={6} className="text-center py-20 text-slate-400">데이터가 없습니다.</td></tr>
                                ) : (
                                    items.map((item) => (
                                        <ShipmentItemRow
                                            key={item.id}
                                            item={item}
                                            isSelected={selectedItemIds.has(item.id)}
                                            onToggleSelection={() => toggleSelection(item.id)}
                                            onUpdateDate={handleUpdateDeliveryDate}
                                            onComplete={handleCompleteShipment}
                                            onCancel={handleCancelShipment}
                                            onNavigate={onNavigate}
                                        />
                                    ))
                                )}
                            </tbody>
                        </table>
                    </Card>
                </Section>
            </div>

            {/* Label Modal */}
            <ShipmentLabelModal
                isOpen={isLabelModalOpen}
                onClose={() => setIsLabelModalOpen(false)}
                items={getSelectedItems()}
            />
        </div>
    );
}

function ShipmentItemRow({ item, isSelected, onToggleSelection, onUpdateDate, onComplete, onCancel, onNavigate }: any) {
    const isShipped = item.shipment_items && item.shipment_items.length > 0;
    const shipmentItem = isShipped ? item.shipment_items[0] : null;
    const shipment = shipmentItem?.shipments;

    const [shipmentDate, setShipmentDate] = useState(new Date().toISOString().slice(0, 10));

    return (
        <tr className={`hover:bg-slate-50 transition-colors ${isShipped ? 'bg-slate-50/50' : ''}`}>
            <td className="px-3 py-4 text-center">
                <input type="checkbox" checked={isSelected} onChange={onToggleSelection} className="w-4 h-4 text-indigo-600 rounded" />
            </td>

            {/* 1. Client / PO */}
            <td className="px-6 py-4">
                <div className="font-bold text-slate-700 text-sm truncate max-w-[150px]" title={item.orders?.clients?.name}>
                    {item.orders?.clients?.name}
                </div>
                <div
                    className="text-xs text-blue-600 cursor-pointer hover:underline mt-1"
                    onClick={() => onNavigate('order-detail', item.orders.id)}
                >
                    PO: {item.orders?.po_no}
                </div>
            </td>

            {/* 2. Item Info */}
            <td className="px-6 py-4">
                <div className="font-black text-slate-800 text-sm mb-0.5">{item.part_no}</div>
                <div className="text-xs text-slate-500">{item.part_name}</div>
                {item.post_processing_name && (
                    <span className="inline-block mt-1 text-[10px] bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded border border-blue-100 font-bold">
                        후처리: {item.post_processing_name}
                    </span>
                )}
            </td>

            {/* 3. Material / Qty */}
            <td className="px-6 py-4 text-center">
                <div className="text-xs font-bold text-slate-600 mb-1">{item.material_name || '-'}</div>
                <div className="inline-block text-sm font-black text-slate-800 bg-slate-100 px-2 py-0.5 rounded">
                    {item.qty} EA
                </div>
            </td>

            {/* 4. Requested Date */}
            <td className="px-6 py-4">
                <input
                    type="date"
                    className={`border rounded px-2 py-1 text-sm font-bold w-32 ${!isShipped && new Date(item.orders?.delivery_date) < new Date(new Date().setHours(0, 0, 0, 0))
                        ? 'text-red-600 border-red-200 bg-red-50'
                        : 'text-slate-700 border-slate-300'
                        }`}
                    value={item.orders?.delivery_date ? item.orders.delivery_date.split('T')[0] : ''}
                    onChange={(e) => onUpdateDate(item.orders.id, e.target.value)}
                />
            </td>

            {/* 5. Action */}
            <td className="px-6 py-4">
                {isShipped ? (
                    <div className="flex flex-col items-start gap-1">
                        <div className="text-xs text-teal-700 font-bold bg-teal-50 px-2 py-1 rounded border border-teal-100">
                            Shipped: {shipment ? new Date(shipment.created_at).toLocaleDateString() : '-'}
                        </div>
                        <Button
                            size="sm"
                            variant="danger"
                            className="text-xs px-2 py-0.5 h-6"
                            onClick={() => onCancel(shipmentItem.id)}
                        >
                            취소
                        </Button>
                    </div>
                ) : (
                    <div className="flex gap-2 items-end">
                        <input
                            type="date"
                            className="border rounded px-2 py-1 text-sm w-28 border-slate-300"
                            value={shipmentDate}
                            onChange={(e) => setShipmentDate(e.target.value)}
                        />
                        <Button
                            size="sm"
                            className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold h-[30px] whitespace-nowrap"
                            onClick={() => onComplete(item, shipmentDate)}
                        >
                            출하
                        </Button>
                    </div>
                )}
            </td>
        </tr>
    );
}

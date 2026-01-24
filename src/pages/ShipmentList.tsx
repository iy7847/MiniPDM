import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useProfile } from '../hooks/useProfile';
import { PageHeader } from '../components/common/ui/PageHeader';
import { Section } from '../components/common/ui/Section';
import { Card } from '../components/common/ui/Card';
import { Button } from '../components/common/ui/Button';
import { ShipmentLabelModal } from '../components/features/Shipment/ShipmentLabelModal';
import { useFileHandler } from '../hooks/useFileHandler';
import { Pagination } from '../components/common/ui/Pagination';

export function ShipmentList({ onNavigate }: { onNavigate: (page: string, id?: string | null) => void }) {
    const { profile } = useProfile();
    const [items, setItems] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [clients, setClients] = useState<{ id: string, name: string }[]>([]);
    const [selectedItemIds, setSelectedItemIds] = useState<Set<string>>(new Set());
    const [isLabelModalOpen, setIsLabelModalOpen] = useState(false);
    const [companyRootPath, setCompanyRootPath] = useState('');

    const { openFile } = useFileHandler(companyRootPath);

    useEffect(() => {
        const path = localStorage.getItem('company_root_path');
        if (path) setCompanyRootPath(path);
    }, []);

    const [filters, setFilters] = useState({
        status: 'unshipped', // 'unshipped' | 'shipped' | 'all'
        clientId: '',
        startDate: (() => {
            const d = new Date();
            d.setMonth(d.getMonth() - 3);
            return d.toISOString().split('T')[0];
        })(),
        endDate: new Date().toISOString().split('T')[0],
        keyword: '',
        showCompletedOnly: false,
        page: 1,
        pageSize: 20
    });
    const [totalCount, setTotalCount] = useState(0);

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
        try {
            // Check if we can do more filtering on the server
            const isShippedTab = filters.status === 'shipped';

            let query = supabase
                .from('order_items')
                .select(`
                    *,
                    orders!inner(
                        id, 
                        po_no, 
                        delivery_date, 
                        client_id,
                        clients!inner(name),
                        company_id
                    ),
                    shipment_items${isShippedTab ? '!inner' : ''}(
                        id,
                        quantity,
                        shipment_id,
                        created_at,
                        shipments(
                            shipment_no,
                            created_at
                        )
                    ),
                    files (*)
                `, { count: 'exact' })
                .eq('orders.company_id', profile.company_id);

            // Apply Server-side sorting
            if (isShippedTab) {
                query = query.order('orders(delivery_date)', { ascending: false });
            } else {
                query = query.order('orders(delivery_date)', { ascending: true });
            }

            // Client Filter
            if (filters.clientId) {
                query = query.eq('orders.client_id', filters.clientId);
            }

            // Date Filter
            if (filters.startDate) query = query.gte('orders.delivery_date', filters.startDate);
            if (filters.endDate) query = query.lte('orders.delivery_date', filters.endDate);

            // Keyword Filter (Server-side if possible, but let's stick to client-side for complex nested OR if needed)
            // For PO No search, we can filter orders!inner(po_no)
            if (filters.keyword) {
                query = query.or(`part_no.ilike.%${filters.keyword}%,part_name.ilike.%${filters.keyword}%`);
                // Note: Cross-table OR with po_no is tricky here, keeping it simple.
            }

            if (filters.showCompletedOnly) {
                query = query.eq('process_status', 'DONE');
            }

            // Apply Pagination for Shipped tab (History)
            if (isShippedTab) {
                const from = (filters.page - 1) * filters.pageSize;
                const to = from + filters.pageSize - 1;
                query = query.range(from, to);
            }

            const { data, error, count } = await query;
            if (error) {
                console.error("Error fetching items:", error);
                setItems([]);
                setTotalCount(0);
            } else {
                let processedData = data || [];

                // Extra client-side filtering for 'unshipped' status to handle partial shipments precisely
                if (filters.status === 'unshipped') {
                    processedData = processedData.filter((i: any) => {
                        const shipped = i.shipment_items?.reduce((s: number, x: any) => s + x.quantity, 0) || 0;
                        return shipped < i.qty;
                    });
                }

                setItems(processedData);
                setTotalCount(count || 0);
                setSelectedItemIds(new Set());
            }
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
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
            // [Modified] Partial Shipment Logic
            // Calculate already shipped qty
            const { data: existingShipments } = await supabase
                .from('shipment_items')
                .select('quantity')
                .eq('order_item_id', item.id);

            const shippedQty = existingShipments?.reduce((sum, s) => sum + s.quantity, 0) || 0;
            const remainingQty = item.qty - shippedQty;

            if (remainingQty <= 0) return alert('이미 전체 수량이 출하되었습니다.');

            const inputQtyStr = prompt(`출하할 수량을 입력하세요.\n(남은 수량: ${remainingQty} / 전체: ${item.qty})`, remainingQty.toString());
            if (!inputQtyStr) return;

            const inputQty = parseInt(inputQtyStr, 10);
            if (isNaN(inputQty) || inputQty <= 0) return alert('유효한 수량을 입력해주세요.');
            if (inputQty > remainingQty) return alert(`남은 수량(${remainingQty})보다 많이 출하할 수 없습니다.`);

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
                    quantity: inputQty // [Modified] Use input qty
                });

            if (itemError) throw itemError;

            alert("출하가 완료되었습니다.");

            // [New] Check if all items in the order are shipped, then update Order Status to DONE
            await checkAndCompleteOrder(item.orders.id);

            fetchItems(); // Refresh

        } catch (e: any) {
            console.error(e);
            alert("출하 처리 중 오류가 발생했습니다: " + e.message);
        }
    };

    const checkAndCompleteOrder = async (orderId: string) => {
        // 1. Get all items for this order
        const { data: allItems } = await supabase
            .from('order_items')
            .select('id, shipment_items(id)')
            .eq('order_id', orderId);

        if (!allItems) return;

        // 2. Check if every item is fully shipped


        // Refetch with quantity
        const { data: itemsWithQty } = await supabase
            .from('order_items')
            .select('id, qty, shipment_items(quantity)')
            .eq('order_id', orderId);

        if (!itemsWithQty) return;

        const fullyShipped = itemsWithQty.every((i: any) => {
            const shipped = i.shipment_items?.reduce((s: number, x: any) => s + x.quantity, 0) || 0;
            return shipped >= i.qty;
        });

        if (fullyShipped) {
            await supabase.from('orders').update({ status: 'DONE' }).eq('id', orderId);
            console.log(`Order ${orderId} marked as DONE`);
        } else {
            // Consider setting back to PRODUCTION if partially shipped?
            // await supabase.from('orders').update({ status: 'PRODUCTION' }).eq('id', orderId);
        }
    };

    const handleCancelShipment = async (shipmentItemId: string) => {
        if (!confirm("출하를 취소(삭제) 하시겠습니까?")) return;

        const { error } = await supabase.from('shipment_items').delete().eq('id', shipmentItemId);

        if (!error) {
            // Check status again (if we cancelled a shipment, the order might need to go back to PRODUCTION)
            // Since we don't have orderId here, we will rely on fetching items or implement a separate check.
            // Ideally we should update the order status back to 'PRODUCTION' or similar.
            // For now, let's just refresh.
            fetchItems();
        } else {
            alert("취소 실패: " + error.message);
        }
    };

    // [New] Bulk Shipment
    const handleBulkShipment = async () => {
        const selectedIds = Array.from(selectedItemIds);
        if (selectedIds.length === 0) return alert('선택된 품목이 없습니다.');

        // Filter unshipped items
        const targetItems = items.filter(i => selectedIds.includes(i.id) && (!i.shipment_items || i.shipment_items.length === 0));

        if (targetItems.length === 0) return alert('선택된 품목 중 출하 가능한(미출하) 품목이 없습니다.');

        const shipDateVal = prompt("일괄 출하 일자를 입력하세요 (YYYY-MM-DD):", new Date().toISOString().slice(0, 10));
        if (!shipDateVal) return;

        if (!confirm(`선택한 ${targetItems.length}개 품목을 일괄 출하 처리하시겠습니까?\n(동일 수주 건별로 전표가 생성됩니다)`)) return;

        setLoading(true);
        try {
            // Group by Order ID (Since shipments table usually links to order)
            // If we want to support multi-order shipment, we need to check if order_id is nullable or handle logic differently.
            // For safety, we group by Order ID.
            const groups: { [orderId: string]: typeof targetItems } = {};
            targetItems.forEach(item => {
                const oid = item.orders.id;
                if (!groups[oid]) groups[oid] = [];
                groups[oid].push(item);
            });


            let processedGroups = 0;

            // Process each group
            for (const orderId of Object.keys(groups)) {
                const groupItems = groups[orderId];
                const clientName = groupItems[0]?.orders?.clients?.name;

                // Create Shipment Header
                const today = new Date().toLocaleDateString('ko-KR', { year: '2-digit', month: '2-digit', day: '2-digit' }).replace(/\. /g, '').replace('.', '');
                // Add index and random to avoid collision in loop
                const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
                const shipmentNo = `SH${today}-${random}-${processedGroups + 1}`;

                const { data: shipment, error: shipError } = await supabase
                    .from('shipments')
                    .insert({
                        company_id: profile?.company_id,
                        order_id: orderId,
                        shipment_no: shipmentNo,
                        status: 'shipped',
                        recipient_name: clientName,
                        shipped_at: new Date(shipDateVal).toISOString()
                    })
                    .select()
                    .single();

                if (shipError) throw shipError;

                // Create Shipment Items
                const shipmentItemsPayload = groupItems.map(item => ({
                    company_id: profile?.company_id,
                    shipment_id: shipment.id,
                    order_item_id: item.id,
                    quantity: item.qty // Full qty
                }));

                const { error: itemsError } = await supabase.from('shipment_items').insert(shipmentItemsPayload);
                if (itemsError) throw itemsError;

                processedGroups++;
            }

            // Check completion for all affected orders
            await Promise.all(Object.keys(groups).map(oid => checkAndCompleteOrder(oid)));

            alert(`일괄 출하 처리가 완료되었습니다. (전표 ${processedGroups}건 생성)`);
            setSelectedItemIds(new Set());
            fetchItems();
        } catch (e: any) {
            console.error(e);
            alert('출하 처리 중 오류가 발생했습니다: ' + e.message);
        } finally {
            setLoading(false);
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
                />

                {/* Filters */}
                <Section>
                    <Card className="p-4 space-y-4">
                        {/* Status Tabs */}
                        <div className="flex space-x-2 border-b border-transparent pb-2">
                            {[
                                { key: 'unshipped', label: '미출하 (Unshipped)' },
                                { key: 'shipped', label: '출하 완료 (Shipped)' },
                                { key: 'all', label: '전체 (All)' },
                            ].map(tab => (
                                <button
                                    key={tab.key}
                                    onClick={() => setFilters({ ...filters, status: tab.key, page: 1 })}
                                    className={`px-5 py-2.5 text-sm font-bold rounded-xl transition-all duration-300 ${filters.status === tab.key
                                        ? 'bg-brand-600 text-white shadow-glow'
                                        : 'text-slate-500 hover:text-brand-600 hover:bg-slate-50'
                                        }`}
                                >
                                    {tab.label}
                                </button>
                            ))}
                        </div>

                        <div className="flex flex-col md:flex-row gap-6 items-end">
                            {/* Client Filter */}
                            <div className="flex flex-col gap-2 w-full md:w-auto">
                                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">거래처 (Client)</span>
                                <select
                                    className="border border-slate-200 p-2.5 rounded-xl text-sm w-full md:w-56 outline-none focus:ring-2 focus:ring-brand-200 bg-slate-50 hover:bg-white transition-colors"
                                    value={filters.clientId}
                                    onChange={e => setFilters({ ...filters, clientId: e.target.value, page: 1 })}
                                >
                                    <option value="">전체 (All Clients)</option>
                                    {clients.map(c => (
                                        <option key={c.id} value={c.id}>{c.name}</option>
                                    ))}
                                </select>
                            </div>

                            {/* Date Filter */}
                            <div className="flex flex-col gap-2 w-full md:w-auto">
                                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">출하요청일 (Requested Date)</span>
                                <div className="flex items-center gap-2">
                                    <input
                                        type="date"
                                        className="border border-slate-200 p-2.5 rounded-xl text-sm outline-none focus:ring-2 focus:ring-brand-200 text-slate-600 bg-slate-50"
                                        value={filters.startDate}
                                        onChange={e => setFilters({ ...filters, startDate: e.target.value, page: 1 })}
                                    />
                                    <span className="text-slate-400 font-bold">~</span>
                                    <input
                                        type="date"
                                        className="border border-slate-200 p-2.5 rounded-xl text-sm outline-none focus:ring-2 focus:ring-brand-200 text-slate-600 bg-slate-50"
                                        value={filters.endDate}
                                        onChange={e => setFilters({ ...filters, endDate: e.target.value, page: 1 })}
                                    />
                                </div>
                            </div>

                            {/* Keyword */}
                            <div className="flex flex-col gap-2 w-full md:flex-1">
                                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">검색 (Search)</span>
                                <input
                                    className="border border-slate-200 p-2.5 rounded-xl text-sm w-full outline-none focus:ring-2 focus:ring-brand-200 placeholder:text-slate-400 bg-slate-50 focus:bg-white transition-colors"
                                    placeholder="도번 / 품명 / PO 검색"
                                    value={filters.keyword}
                                    onChange={e => setFilters({ ...filters, keyword: e.target.value, page: 1 })}
                                />
                            </div>

                            {/* Completed Only Checkbox [New] */}
                            <div className="flex items-center pb-1">
                                <label className="flex items-center gap-3 cursor-pointer bg-emerald-50/50 hover:bg-emerald-50 px-4 py-3 rounded-xl border border-emerald-100/50 transition-all duration-200 hover:shadow-sm group">
                                    <input
                                        type="checkbox"
                                        className="w-5 h-5 text-emerald-600 rounded focus:ring-emerald-500 border-emerald-300"
                                        checked={filters.showCompletedOnly}
                                        onChange={e => setFilters({ ...filters, showCompletedOnly: e.target.checked, page: 1 })}
                                    />
                                    <span className="text-sm font-bold text-emerald-700 group-hover:text-emerald-800">생산 완료 건만 보기 (Ready)</span>
                                </label>
                            </div>
                        </div>
                    </Card>
                </Section>

                <Section
                    title={`품목 목록 (${items.length}건)`}
                    rightElement={
                        <div className="flex gap-2">
                            <Button
                                onClick={handleBulkShipment}
                                variant="primary"
                                className={`shadow-glow ${selectedItemIds.size > 0 ? 'opacity-100' : 'opacity-50'}`}
                            >
                                📦 일괄 출하 ({selectedItemIds.size})
                            </Button>
                            <Button
                                onClick={() => {
                                    if (selectedItemIds.size === 0) {
                                        alert('출력할 품목을 선택해주세요.');
                                        return;
                                    }
                                    setIsLabelModalOpen(true);
                                }}
                                variant="glass"
                                className={`text-indigo-700 bg-indigo-50 border-indigo-200 hover:bg-indigo-100 ${selectedItemIds.size > 0 ? '' : 'opacity-50'}`}
                            >
                                🖨️ 라벨 인쇄 ({selectedItemIds.size})
                            </Button>
                        </div>
                    }
                >
                    <Card noPadding className="border-0 shadow-soft overflow-hidden rounded-2xl min-h-[400px]">
                        <table className="min-w-full divide-y divide-slate-100">
                            <thead className="bg-slate-50/80 backend-blur">
                                <tr>
                                    <th className="px-4 py-4 w-[40px] text-center">
                                        <input type="checkbox" onChange={toggleAll} checked={items.length > 0 && selectedItemIds.size === items.length} className="w-5 h-5 rounded text-brand-600 focus:ring-brand-500 border-slate-300 transition-all" />
                                    </th>
                                    <th className="px-5 py-4 text-left text-xs font-black text-slate-500 uppercase tracking-wider w-[15%]">업체 / PO</th>
                                    <th className="px-5 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider w-[35%]">품목 정보 (Item Info)</th>
                                    <th className="px-5 py-4 text-center text-xs font-bold text-slate-500 uppercase tracking-wider w-[10%]">재질/수량</th>
                                    <th className="px-5 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider w-[15%]">출하 요청일</th>
                                    <th className="px-5 py-4 text-center text-xs font-bold text-slate-500 uppercase tracking-wider w-[10%]">도면</th>
                                    <th className="px-5 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider w-[20%]">출하 처리</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-slate-50">
                                {loading ? (
                                    <tr><td colSpan={7} className="text-center py-32 text-slate-400 animate-pulse">데이터를 불러오는 중입니다...</td></tr>
                                ) : items.length === 0 ? (
                                    <tr><td colSpan={7} className="text-center py-32 text-slate-400">데이터가 없습니다.</td></tr>
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
                                            onPreviewFile={openFile}
                                        />
                                    ))
                                )}
                            </tbody>
                        </table>

                        {filters.status === 'shipped' && totalCount > filters.pageSize && (
                            <div className="px-6 border-t border-slate-50">
                                <Pagination
                                    currentPage={filters.page}
                                    totalPages={Math.ceil(totalCount / filters.pageSize)}
                                    onPageChange={(page) => setFilters({ ...filters, page })}
                                    totalCount={totalCount}
                                />
                            </div>
                        )}
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

function ShipmentItemRow({ item, isSelected, onToggleSelection, onUpdateDate, onComplete, onCancel, onNavigate, onPreviewFile }: any) {
    const isShipped = item.shipment_items && item.shipment_items.length > 0;



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
                {item.process_status === 'DONE' && (
                    <span className="inline-block mt-1 ml-1 text-[10px] bg-green-50 text-green-700 px-1.5 py-0.5 rounded border border-green-100 font-bold">
                        ✅ 생산 완료
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



            {/* 4.5 Drawing */}
            <td className="px-6 py-4 text-center">
                <div className="flex flex-col gap-1 items-center">
                    {item.files && item.files.length > 0 ? (
                        item.files.map((f: any) => {
                            const ext = f.file_name.split('.').pop()?.toLowerCase();
                            const is2D = ['pdf', 'dwg', 'dxf'].includes(ext);
                            const is3D = ['stp', 'step', 'igs', 'iges', 'x_t'].includes(ext);
                            return (
                                <button
                                    key={f.id}
                                    onClick={() => onPreviewFile(f.file_path)}
                                    className="text-[10px] px-2 py-0.5 bg-white border border-slate-200 rounded hover:bg-blue-50 hover:text-blue-600 truncate max-w-[100px] flex items-center gap-1"
                                    title={f.file_name}
                                >
                                    {is2D && <span className="px-1 rounded bg-red-100 text-red-600 font-bold text-[9px]">2D</span>}
                                    {is3D && <span className="px-1 rounded bg-blue-100 text-blue-600 font-bold text-[9px]">3D</span>}
                                    <span className="truncate">{f.file_name}</span>
                                </button>
                            );
                        })
                    ) : (
                        <span className="text-slate-300">-</span>
                    )}
                </div>
            </td>

            {/* 5. Action */}
            <td className="px-6 py-4">
                {/* Shipped History */}
                {isShipped && (
                    <div className="flex flex-col gap-1 items-end mb-2">
                        {item.shipment_items.map((si: any) => (
                            <div key={si.id} className="text-xs text-teal-700 font-bold bg-teal-50 px-2 py-1 rounded border border-teal-100 flex items-center gap-2">
                                <span>{new Date(si.shipments?.created_at).toLocaleDateString()} : {si.quantity} EA</span>
                                <button onClick={() => onCancel(si.id)} className="text-red-500 hover:text-red-700">✕</button>
                            </div>
                        ))}
                        <div className="text-xs font-black text-slate-600">
                            (출하 합계: {item.shipment_items.reduce((s: number, x: any) => s + x.quantity, 0)} / {item.qty})
                        </div>
                    </div>
                )}

                {/* Shipping Action */}
                {(item.shipment_items?.reduce((s: number, x: any) => s + x.quantity, 0) || 0) < item.qty ? (
                    <div className="flex gap-2 items-end justify-end">
                        <div className="flex flex-col gap-1 items-end">
                            {item.process_status !== 'DONE' && (
                                <span className="text-[10px] text-red-500 font-bold bg-red-50 px-1 rounded border border-red-100 mb-1">
                                    ⚠️ 가공 미완료
                                </span>
                            )}
                            <input
                                type="date"
                                className="border rounded px-2 py-1 text-sm w-28 border-slate-300"
                                value={shipmentDate}
                                onChange={(e) => setShipmentDate(e.target.value)}
                                disabled={item.process_status !== 'DONE'}
                            />
                        </div>
                        <Button
                            size="sm"
                            className={`font-bold h-[30px] whitespace-nowrap ${item.process_status === 'DONE'
                                ? 'bg-indigo-600 hover:bg-indigo-700 text-white'
                                : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                                }`}
                            onClick={() => {
                                if (item.process_status === 'DONE') onComplete(item, shipmentDate);
                                else alert('가공 완료(DONE) 상태인 품목만 출하할 수 있습니다.');
                            }}
                            disabled={item.process_status !== 'DONE'}
                        >
                            출하
                        </Button>
                    </div>
                ) : (
                    <div className="text-center">
                        <span className="text-xs font-bold text-slate-400">출하 완료</span>
                    </div>
                )}
            </td>
        </tr >
    );
}

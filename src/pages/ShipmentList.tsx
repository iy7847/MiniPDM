import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useProfile } from '../hooks/useProfile';
import { PageHeader } from '../components/common/ui/PageHeader';
import { Section } from '../components/common/ui/Section';
import { Card } from '../components/common/ui/Card';
import { Button } from '../components/common/ui/Button';
import { ShipmentLabelModal } from '../components/features/Shipment/ShipmentLabelModal';
import { PromptModal } from '../components/common/PromptModal';
import { ConfirmModal } from '../components/common/ConfirmModal';
import { useFileHandler } from '../hooks/useFileHandler';
import { OrderItem } from '../types/order';
import { ShipmentWithItems } from '../types/shipment';

// 확장된 OrderItem 타입 (조인된 데이터 포함)
interface ExtendedOrderItem extends OrderItem {
    orders: {
        id: string;
        po_no: string;
        delivery_date: string;
        client_id: string;
        clients: { name: string };
        company_id: string;
    };
    shipment_items: (ShipmentWithItems['shipment_items'][0] & {
        shipments: {
            shipment_no: string;
            created_at: string;
        };
    })[];
    files: {
        id: string;
        file_name: string;
        file_path: string;
    }[];
}

export function ShipmentList({ onNavigate }: { onNavigate: (page: string, id?: string | null) => void }) {
    const { profile } = useProfile();
    const [items, setItems] = useState<ExtendedOrderItem[]>([]);
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
        status: 'unshipped', // '미출하' | '출하 완료' | '전체'
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

    const [confirmConfig, setConfirmConfig] = useState<{
        isOpen: boolean;
        title: string;
        message: string;
        onConfirm: () => void;
    }>({
        isOpen: false,
        title: '',
        message: '',
        onConfirm: () => { }
    });

    const [promptConfig, setPromptConfig] = useState<{
        isOpen: boolean;
        title: string;
        message: string;
        defaultValue: string;
        type: string;
        onSubmit: (value: string) => void;
    }>({
        isOpen: false,
        title: '',
        message: '',
        defaultValue: '',
        type: 'text',
        onSubmit: () => { }
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
        try {
            // 서버 측에서 더 많은 필터링을 수행할 수 있는지 확인
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

            // 서버 측 정렬 적용
            if (isShippedTab) {
                query = query.order('orders(delivery_date)', { ascending: false });
            } else {
                query = query.order('orders(delivery_date)', { ascending: true });
            }

            // 거래처 필터
            if (filters.clientId) {
                query = query.eq('orders.client_id', filters.clientId);
            }

            // 날짜 필터
            if (filters.startDate) query = query.gte('orders.delivery_date', filters.startDate);

            // '미출하' 탭의 경우, 확정된 주문이 표시되도록 기본적으로 미래 날짜를 제한하지 않음.
            // '미출하' 탭이 아니거나 사용자가 오늘 이후의 종료일을 수동으로 변경한 경우에만 'lte' 적용.
            const today = new Date().toISOString().split('T')[0];
            if (filters.endDate && (filters.status !== 'unshipped' || filters.endDate !== today)) {
                query = query.lte('orders.delivery_date', filters.endDate);
            }

            // 키워드 필터 (서버 측에서 가능한 경우 수행하지만, 복잡한 중첩 OR의 경우 클라이언트 측에서 처리)
            // PO No 검색을 위해 orders!inner(po_no) 필터링 가능
            if (filters.keyword) {
                query = query.or(`part_no.ilike.%${filters.keyword}%,part_name.ilike.%${filters.keyword}%`);
                // 참고: po_no와의 교차 테이블 OR은 여기서 까다로우므로 단순하게 유지함.
            }

            if (filters.showCompletedOnly) {
                query = query.eq('process_status', 'DONE');
            }

            // 출하 탭(이력)에 대한 페이지네이션 적용
            if (isShippedTab) {
                const from = (filters.page - 1) * filters.pageSize;
                const to = from + filters.pageSize - 1;
                query = query.range(from, to);
            }

            const { data, error, count } = await query;
            if (error) {
                console.error("아이템 조회 오류:", error);
                setItems([]);
                setTotalCount(0);
            } else {
                let processedData = (data as unknown as ExtendedOrderItem[]) || [];

                // 부분 출하를 정확하게 처리하기 위해 '미출하' 상태에 대한 추가 클라이언트 측 필터링
                if (filters.status === 'unshipped') {
                    processedData = processedData.filter((i) => {
                        const shipped = i.shipment_items?.reduce((s, x) => s + x.quantity, 0) || 0;
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
        setConfirmConfig({
            isOpen: true,
            title: "납기일 수정",
            message: "납기일을 수정하시겠습니까? (동일 수주 건의 모든 품목에 적용됩니다)",
            onConfirm: async () => {
                const { error } = await supabase
                    .from('orders')
                    .update({ delivery_date: newDate })
                    .eq('id', orderId);

                if (!error) {
                    setItems(prev => prev.map(i => i.orders.id === orderId ? { ...i, orders: { ...i.orders, delivery_date: newDate } } : i));
                } else {
                    alert("납기일 수정 중 오류가 발생했습니다.");
                }
            }
        });
    };

    const handleCompleteShipment = async (item: ExtendedOrderItem, shipmentDate: string) => {
        setConfirmConfig({
            isOpen: true,
            title: "출하 처리 확인",
            message: `[${item.part_no}] 품목을 출하 처리하시겠습니까?`,
            onConfirm: async () => {
                try {
                    const { data: existingShipments } = await supabase
                        .from('shipment_items')
                        .select('quantity')
                        .eq('order_item_id', item.id);

                    const shippedQty = existingShipments?.reduce((sum, s) => sum + s.quantity, 0) || 0;
                    const remainingQty = item.qty - shippedQty;

                    if (remainingQty <= 0) return alert('이미 전체 수량이 출하되었습니다.');

                    setPromptConfig({
                        isOpen: true,
                        title: "출하 수량 입력",
                        message: `출하할 수량을 입력하세요.\n(남은 수량: ${remainingQty} / 전체: ${item.qty})`,
                        defaultValue: remainingQty.toString(),
                        type: 'number',
                        onSubmit: async (inputQtyStr) => {
                            if (!inputQtyStr) return;

                            const inputQty = parseInt(inputQtyStr, 10);
                            if (isNaN(inputQty) || inputQty <= 0) return alert('유효한 수량을 입력해주세요.');
                            if (inputQty > remainingQty) return alert(`남은 수량(${remainingQty})보다 많이 출하할 수 없습니다.`);

                            const today = new Date().toLocaleDateString('ko-KR', { year: '2-digit', month: '2-digit', day: '2-digit' }).replace(/\. /g, '').replace('.', '');
                            const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
                            const shipmentNo = `SH${today}-${random}`;

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

                            const { error: itemError } = await supabase
                                .from('shipment_items')
                                .insert({
                                    company_id: profile?.company_id,
                                    shipment_id: shipment.id,
                                    order_item_id: item.id,
                                    quantity: inputQty
                                });

                            if (itemError) throw itemError;

                            alert("출하가 완료되었습니다.");
                            await checkAndCompleteOrder(item.orders.id);
                            fetchItems();
                        }
                    });
                } catch (e) {
                    console.error(e);
                    const message = e instanceof Error ? e.message : '알 수 없는 오류가 발생했습니다.';
                    alert("출하 처리 중 오류가 발생했습니다: " + message);
                }
            }
        });
    };

    const checkAndCompleteOrder = async (orderId: string) => {
        // 1. 이 주문의 모든 품목 가져오기
        const { data: allItems } = await supabase
            .from('order_items')
            .select('id, shipment_items(id)')
            .eq('order_id', orderId);

        if (!allItems) return;

        // 2. 각 품목이 완전히 출하되었는지 확인

        // 수량과 함께 다시 가져오기
        const { data: itemsWithQty } = await supabase
            .from('order_items')
            .select('id, qty, shipment_items(quantity)')
            .eq('order_id', orderId);

        if (!itemsWithQty) return;

        const fullyShipped = itemsWithQty.every((i: { qty: number; shipment_items: { quantity: number }[] }) => {
            const shipped = i.shipment_items?.reduce((s, x) => s + x.quantity, 0) || 0;
            return shipped >= i.qty;
        });

        if (fullyShipped) {
            await supabase.from('orders').update({ status: 'DONE' }).eq('id', orderId);
            console.log(`주문 ${orderId}가 완료(DONE)로 표시되었습니다.`);
        } else {
            // 부분 출하된 경우 PRODUCTION으로 되돌릴지 검토?
            // await supabase.from('orders').update({ status: 'PRODUCTION' }).eq('id', orderId);
        }
    };

    const handleCancelShipment = async (shipmentItemId: string) => {
        setConfirmConfig({
            isOpen: true,
            title: "출하 취소 확인",
            message: "출하를 취소(삭제) 하시겠습니까?",
            onConfirm: async () => {
                const { error } = await supabase.from('shipment_items').delete().eq('id', shipmentItemId);

                if (!error) {
                    fetchItems();
                } else {
                    alert("취소 실패: " + error.message);
                }
            }
        });
    };

    // [신규] 일괄 출하
    const handleBulkShipment = async () => {
        const selectedIds = Array.from(selectedItemIds);
        if (selectedIds.length === 0) return alert('선택된 품목이 없습니다.');

        const targetItems = items.filter(i => selectedIds.includes(i.id) && (!i.shipment_items || i.shipment_items.length === 0));

        if (targetItems.length === 0) return alert('선택된 품목 중 출하 가능한(미출하) 품목이 없습니다.');

        setPromptConfig({
            isOpen: true,
            title: "일괄 출하 일자 입력",
            message: "일괄 출하 일자를 입력하세요 (YYYY-MM-DD):",
            defaultValue: new Date().toISOString().slice(0, 10),
            type: 'date',
            onSubmit: (shipDateVal) => {
                if (!shipDateVal) return;

                setConfirmConfig({
                    isOpen: true,
                    title: "일괄 출하 확인",
                    message: `선택한 ${targetItems.length}개 품목을 일괄 출하 처리하시겠습니까?\n(동일 수주 건별로 전표가 생성됩니다)`,
                    onConfirm: async () => {
                        setLoading(true);
                        try {
                            const groups: { [orderId: string]: ExtendedOrderItem[] } = {};
                            targetItems.forEach(item => {
                                const oid = item.orders.id;
                                if (!groups[oid]) groups[oid] = [];
                                groups[oid].push(item);
                            });

                            let processedGroups = 0;

                            for (const orderId of Object.keys(groups)) {
                                const groupItems = groups[orderId];
                                const clientName = groupItems[0]?.orders?.clients?.name;

                                const today = new Date().toLocaleDateString('ko-KR', { year: '2-digit', month: '2-digit', day: '2-digit' }).replace(/\. /g, '').replace('.', '');
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

                                const shipmentItemsPayload = groupItems.map(item => ({
                                    company_id: profile?.company_id,
                                    shipment_id: shipment.id,
                                    order_item_id: item.id,
                                    quantity: item.qty
                                }));

                                const { error: itemsError } = await supabase.from('shipment_items').insert(shipmentItemsPayload);
                                if (itemsError) throw itemsError;

                                processedGroups++;
                            }

                            await Promise.all(Object.keys(groups).map(oid => checkAndCompleteOrder(oid)));

                            alert(`일괄 출하 처리가 완료되었습니다. (전표 ${processedGroups}건 생성)`);
                            setSelectedItemIds(new Set());
                            fetchItems();
                        } catch (e) {
                            console.error(e);
                            const message = e instanceof Error ? e.message : '알 수 없는 오류가 발생했습니다.';
                            alert('출하 처리 중 오류가 발생했습니다: ' + message);
                        } finally {
                            setLoading(false);
                        }
                    }
                });
            }
        });
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
                    title="🚛 출하 관리"
                />

                {/* 필터 */}
                <Section>
                    <Card className="p-4 space-y-4">
                        {/* 상태 탭 */}
                        <div className="flex space-x-2 border-b border-transparent pb-2">
                            {[
                                { key: 'unshipped', label: '미출하' },
                                { key: 'shipped', label: '출하 완료' },
                                { key: 'all', label: '전체' },
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
                            {/* 거래처 필터 */}
                            <div className="flex flex-col gap-2 w-full md:w-auto">
                                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">거래처</span>
                                <select
                                    className="border border-slate-200 p-2.5 rounded-xl text-sm w-full md:w-56 outline-none focus:ring-2 focus:ring-brand-200 bg-slate-50 hover:bg-white transition-colors"
                                    value={filters.clientId}
                                    onChange={e => setFilters({ ...filters, clientId: e.target.value, page: 1 })}
                                >
                                    <option value="">전체 거래처</option>
                                    {clients.map(c => (
                                        <option key={c.id} value={c.id}>{c.name}</option>
                                    ))}
                                </select>
                            </div>

                            {/* 날짜 필터 */}
                            <div className="flex flex-col gap-2 w-full md:w-auto">
                                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">출하요청일</span>
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

                            {/* 키워드 */}
                            <div className="flex flex-col gap-2 w-full md:flex-1">
                                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">검색</span>
                                <input
                                    className="border border-slate-200 p-2.5 rounded-xl text-sm w-full outline-none focus:ring-2 focus:ring-brand-200 placeholder:text-slate-400 bg-slate-50 focus:bg-white transition-colors"
                                    placeholder="도번 / 품명 / PO 검색"
                                    value={filters.keyword}
                                    onChange={e => setFilters({ ...filters, keyword: e.target.value, page: 1 })}
                                />
                            </div>

                            {/* 완료 건만 보기 체크박스 [신규] */}
                            <div className="flex items-center pb-1">
                                <label className="flex items-center gap-3 cursor-pointer bg-emerald-50/50 hover:bg-emerald-50 px-4 py-3 rounded-xl border border-emerald-100/50 transition-all duration-200 hover:shadow-sm group">
                                    <input
                                        type="checkbox"
                                        className="w-5 h-5 text-emerald-600 rounded focus:ring-emerald-500 border-emerald-300"
                                        checked={filters.showCompletedOnly}
                                        onChange={e => setFilters({ ...filters, showCompletedOnly: e.target.checked, page: 1 })}
                                    />
                                    <span className="text-sm font-bold text-emerald-700 group-hover:text-emerald-800">생산 완료 건만 보기</span>
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
                                    <th className="px-5 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider w-[35%]">품목 정보</th>
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

            {/* Prompt & Confirm Modals */}
            <ConfirmModal
                isOpen={confirmConfig.isOpen}
                onClose={() => setConfirmConfig({ ...confirmConfig, isOpen: false })}
                title={confirmConfig.title}
                message={confirmConfig.message}
                onConfirm={confirmConfig.onConfirm}
            />
            <PromptModal
                isOpen={promptConfig.isOpen}
                onClose={() => setPromptConfig({ ...promptConfig, isOpen: false })}
                title={promptConfig.title}
                message={promptConfig.message}
                defaultValue={promptConfig.defaultValue}
                type={promptConfig.type}
                onSubmit={promptConfig.onSubmit}
            />
        </div>
    );
}

interface ShipmentItemRowProps {
    item: ExtendedOrderItem;
    isSelected: boolean;
    onToggleSelection: () => void;
    onUpdateDate: (orderId: string, newDate: string) => void;
    onComplete: (item: ExtendedOrderItem, shipmentDate: string) => void;
    onCancel: (shipmentItemId: string) => void;
    onNavigate: (page: string, id?: string | null) => void;
    onPreviewFile: (filePath: string) => void;
}

function ShipmentItemRow({ item, isSelected, onToggleSelection, onUpdateDate, onComplete, onCancel, onNavigate, onPreviewFile }: ShipmentItemRowProps) {
    const isShipped = item.shipment_items && item.shipment_items.length > 0;

    const [shipmentDate, setShipmentDate] = useState(new Date().toISOString().slice(0, 10));

    return (
        <tr className={`hover:bg-slate-50 transition-colors ${isShipped ? 'bg-slate-50/50' : ''}`}>
            <td className="px-3 py-4 text-center">
                <input type="checkbox" checked={isSelected} onChange={onToggleSelection} className="w-4 h-4 text-indigo-600 rounded" />
            </td>

            {/* 1. 업체 / PO */}
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
                        item.files.map((f) => {
                            const ext = f.file_name.split('.').pop()?.toLowerCase() || '';
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

            {/* 5. 액션 */}
            <td className="px-6 py-4">
                {/* 출하 이력 */}
                {isShipped && (
                    <div className="flex flex-col gap-1 items-end mb-2">
                        {item.shipment_items.map((si) => (
                            <div key={si.id} className="text-xs text-teal-700 font-bold bg-teal-50 px-2 py-1 rounded border border-teal-100 flex items-center gap-2">
                                <span>{new Date(si.shipments?.created_at).toLocaleDateString()} : {si.quantity} EA</span>
                                <button onClick={() => onCancel(si.id)} className="text-red-500 hover:text-red-700">✕</button>
                            </div>
                        ))}
                        <div className="text-xs font-black text-slate-600">
                            (출하 합계: {item.shipment_items.reduce((s, x) => s + x.quantity, 0)} / {item.qty})
                        </div>
                    </div>
                )}

                {/* 출하 실행 액션 */}
                {(item.shipment_items?.reduce((s: number, x: { quantity: number }) => s + x.quantity, 0) || 0) < item.qty ? (
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
        </tr>
    );
}
// 페이지네이션 컴포넌트
function Pagination({ currentPage, totalPages, onPageChange, totalCount }: { currentPage: number, totalPages: number, onPageChange: (page: number) => void, totalCount: number }) {
    if (totalPages <= 1) return null;

    return (
        <div className="flex items-center justify-between py-4">
            <div className="text-xs font-bold text-slate-500 uppercase tracking-widest">
                총 <span className="text-slate-900">{totalCount}</span>개 품목
            </div>
            <div className="flex items-center gap-1">
                <button
                    onClick={() => onPageChange(Math.max(1, currentPage - 1))}
                    disabled={currentPage === 1}
                    className="p-2 border border-slate-200 rounded-lg bg-white hover:bg-slate-50 disabled:opacity-30 transition-colors"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                </button>

                <div className="flex items-center gap-1 mx-2">
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                        let pageNum = currentPage;
                        if (totalPages <= 5) pageNum = i + 1;
                        else if (currentPage <= 3) pageNum = i + 1;
                        else if (currentPage >= totalPages - 2) pageNum = totalPages - 4 + i;
                        else pageNum = currentPage - 2 + i;

                        return (
                            <button
                                key={pageNum}
                                onClick={() => onPageChange(pageNum)}
                                className={`w-8 h-8 rounded-lg text-xs font-black transition-all ${currentPage === pageNum
                                    ? 'bg-slate-900 text-white shadow-md'
                                    : 'bg-white text-slate-500 border border-slate-200 hover:border-slate-300'
                                    }`}
                            >
                                {pageNum}
                            </button>
                        );
                    })}
                </div>

                <button
                    onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
                    disabled={currentPage === totalPages}
                    className="p-2 border border-slate-200 rounded-lg bg-white hover:bg-slate-50 disabled:opacity-30 transition-colors"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                </button>
            </div>
        </div>
    );
}

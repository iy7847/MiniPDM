import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useProfile } from '../hooks/useProfile';
import { PageHeader } from '../components/common/ui/PageHeader';
import { Section } from '../components/common/ui/Section';
import { Card } from '../components/common/ui/Card';
import { Button } from '../components/common/ui/Button';
import { TabFilter } from '../components/common/ui/TabFilter';
import { Pagination } from '../components/common/ui/Pagination';
import { Order } from '../types/order';
import { useAppToast } from '../contexts/ToastContext';
import { usePreservedState } from '../hooks/usePreservedState';

interface OrderWithClient extends Order {
    clients?: { name: string };
}

export function Orders({ onNavigate }: { onNavigate: (page: string, id?: string | null) => void }) {
    const [orders, setOrders] = useState<OrderWithClient[]>([]);
    const [loading, setLoading] = useState(true);
    const { profile } = useProfile();
    const toast = useAppToast();

    const [filters, setFilters] = usePreservedState('orders_filters', {
        startDate: (() => {
            const d = new Date();
            d.setMonth(d.getMonth() - 3);
            return d.toISOString().split('T')[0];
        })(),
        endDate: new Date().toISOString().split('T')[0],
        status: 'ORDERED',
        keyword: '',
        page: 1,
        pageSize: 20
    });
    const [totalCount, setTotalCount] = useState(0);

    useEffect(() => {
        if (profile?.company_id) fetchOrders();
    }, [filters, profile]);

    const fetchOrders = async () => {
        if (!profile?.company_id) return;

        setLoading(true);

        try {
            let query = supabase
                .from('orders')
                .select('*, clients!inner(name)', { count: 'exact' })
                .eq('company_id', profile.company_id)
                .order('order_date', { ascending: false });

            // Apply Pagination
            const from = (filters.page - 1) * filters.pageSize;
            const to = from + filters.pageSize - 1;
            query = query.range(from, to);

            if (filters.status && filters.status !== 'ALL') query = query.eq('status', filters.status);
            if (filters.startDate) query = query.gte('order_date', filters.startDate);
            if (filters.endDate) query = query.lte('order_date', `${filters.endDate}T23:59:59`);

            if (filters.keyword) {
                // Find matching clients
                const { data: matchedClients } = await supabase
                    .from('clients')
                    .select('id')
                    .eq('company_id', profile.company_id)
                    .ilike('name', `%${filters.keyword}%`);

                const clientIds = matchedClients?.map(c => c.id) || [];

                // Build OR condition
                let orConditions = `po_no.ilike.%${filters.keyword}%`;
                if (clientIds.length > 0) {
                    orConditions += `,client_id.in.(${clientIds.join(',')})`;
                }

                query = query.or(orConditions);
            }

            const { data, error, count } = await query;
            if (error) {
                console.error("Error fetching orders:", error);
                setOrders([]);
            } else {
                setOrders(data || []);
                setTotalCount(count || 0);
            }
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteOrder = async (e: React.MouseEvent, orderId: string, estimateId: string | null) => {
        e.stopPropagation();

        const confirmDelete = confirm('정말 삭제하시겠습니까?\n이 작업은 되돌릴 수 없으며, 모든 품목 데이터도 함께 삭제됩니다.');
        if (!confirmDelete) return;

        try {
            const { error: shipError } = await supabase.from('shipments').delete().eq('order_id', orderId);
            if (shipError) throw shipError;

            const { error: itemsError } = await supabase.from('order_items').delete().eq('order_id', orderId);
            if (itemsError) throw itemsError;

            const { error: orderError } = await supabase.from('orders').delete().eq('id', orderId);
            if (orderError) throw orderError;

            if (estimateId) {
                await supabase
                    .from('estimates')
                    .update({ status: 'SENT', updated_at: new Date().toISOString() })
                    .eq('id', estimateId);
            }

            toast.success('삭제되었습니다.');
            fetchOrders();
        } catch (error) {
            console.error('삭제 중 오류:', error);
            const message = error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.';
            toast.error('삭제 실패: ' + message);
        }
    };

    const handleOpenDetail = (id: string | null) => {
        onNavigate('order-detail', id);
    };

    return (
        <div className="h-full flex flex-col bg-slate-50 relative">
            <div className="flex-1 overflow-y-auto p-4 md:p-8 space-y-6">
                <PageHeader
                    title="📦 수주 관리"
                    actions={
                        <Button
                            variant="primary"
                            onClick={() => handleOpenDetail(null)}
                            className="shadow-md"
                        >
                            + 수주 수기 등록
                        </Button>
                    }
                />

                <Section>
                    <Card className="p-4">
                        <div className="flex flex-col gap-4">
                            <div className="w-full">
                                <TabFilter
                                    options={[
                                        { label: '🚀 수주접수', value: 'ORDERED' },
                                        { label: '⚙️ 생산중', value: 'PRODUCTION' },
                                        { label: '📦 출고완료', value: 'DONE' },
                                        { label: '전체 상태', value: 'ALL' },
                                    ]}
                                    value={filters.status}
                                    onChange={(val) => setFilters({ ...filters, status: val, page: 1 })}
                                />
                            </div>
                            <div className="flex flex-col md:flex-row gap-4 justify-between items-center">
                                <div className="w-full md:w-auto flex-1">
                                    <input
                                        className="w-full border border-slate-200 p-2.5 rounded-xl text-sm outline-none focus:ring-2 focus:ring-brand-200 bg-slate-50 hover:bg-white transition-all placeholder:text-slate-400"
                                        placeholder="PO번호 / 거래처명 검색"
                                        value={filters.keyword}
                                        onChange={e => setFilters({ ...filters, keyword: e.target.value, page: 1 })}
                                    />
                                </div>
                                <div className="flex items-center gap-2 w-full md:w-auto justify-end">
                                    <input type="date" className="border border-slate-200 p-2 rounded-xl text-sm outline-none focus:ring-2 focus:ring-brand-200 text-slate-600 bg-slate-50" value={filters.startDate} onChange={e => setFilters({ ...filters, startDate: e.target.value, page: 1 })} />
                                    <span className="text-slate-400 font-bold">~</span>
                                    <input type="date" className="border border-slate-200 p-2 rounded-xl text-sm outline-none focus:ring-2 focus:ring-brand-200 text-slate-600 bg-slate-50" value={filters.endDate} onChange={e => setFilters({ ...filters, endDate: e.target.value, page: 1 })} />
                                </div>
                            </div>
                        </div>
                    </Card>
                </Section>

                <Section title={`수주 목록 (${totalCount}건)`}>
                    <Card noPadding className="overflow-hidden shadow-soft rounded-2xl border-0">
                        <div className="hidden md:block overflow-x-auto">
                            <table className="min-w-full divide-y divide-slate-100 relative border-collapse">
                                <thead className="bg-slate-50/80 sticky top-0 z-10 font-black text-slate-400 uppercase tracking-widest text-[10px]">
                                    <tr>
                                        <th className="px-6 py-4 text-left">수주일자</th>
                                        <th className="px-6 py-4 text-left">상태</th>
                                        <th className="px-6 py-4 text-left">PO No.</th>
                                        <th className="px-6 py-4 text-left">거래처</th>
                                        <th className="px-6 py-4 text-left">납기일</th>
                                        <th className="px-6 py-4 text-right">금액</th>
                                        <th className="px-6 py-4 text-center">관리</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-slate-50">
                                    {loading ? (
                                        <tr><td colSpan={7} className="text-center py-20 text-slate-400 animate-pulse font-medium">로딩 중...</td></tr>
                                    ) : orders.length === 0 ? (
                                        <tr><td colSpan={7} className="text-center py-20 text-slate-400 font-medium">수주 내역이 없습니다. 리스트를 확인해 보세요.</td></tr>
                                    ) : (
                                        orders.map((ord) => (
                                            <tr key={ord.id} className="hover:bg-slate-50/80 cursor-pointer transition-all group" onClick={() => handleOpenDetail(ord.id)}>
                                                <td className="px-6 py-4 text-sm text-slate-500 font-medium">{new Date(ord.order_date).toLocaleDateString()}</td>
                                                <td className="px-6 py-4">
                                                    <StatusBadge status={ord.status} />
                                                </td>
                                                <td className="px-6 py-4 text-sm font-black text-brand-600 tracking-tight">{ord.po_no}</td>
                                                <td className="px-6 py-4 text-sm font-bold text-slate-800">{ord.clients?.name}</td>
                                                <td className="px-6 py-4 text-sm text-slate-600 font-mono">
                                                    <span className={new Date(ord.delivery_date) < new Date() && ord.status !== 'DONE' ? 'text-red-500 font-bold' : ''}>
                                                        {new Date(ord.delivery_date).toLocaleDateString()}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 text-right">
                                                    <span className="text-sm font-black text-slate-800">{ord.currency} {ord.total_amount?.toLocaleString()}</span>
                                                </td>
                                                <td className="px-6 py-4 text-center opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <div className="flex justify-center gap-1.5">
                                                        <button
                                                            onClick={(e) => { e.stopPropagation(); handleOpenDetail(ord.id); }}
                                                            className="p-1.5 text-slate-400 hover:text-brand-600 hover:bg-white rounded-lg transition-all shadow-sm border border-transparent hover:border-slate-100"
                                                            title="상세 수정"
                                                        >
                                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                                                            </svg>
                                                        </button>
                                                        <button
                                                            onClick={(e) => handleDeleteOrder(e, ord.id, ord.estimate_id || null)}
                                                            className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-white rounded-lg transition-all shadow-sm border border-transparent hover:border-slate-100"
                                                            title="수주 삭제"
                                                        >
                                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                            </svg>
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>

                        {/* Pagination Component */}
                        <div className="px-6">
                            <Pagination
                                currentPage={filters.page}
                                totalPages={Math.ceil(totalCount / filters.pageSize)}
                                onPageChange={(page) => setFilters({ ...filters, page })}
                                totalCount={totalCount}
                            />
                        </div>
                    </Card>

                    {/* Mobile Card List */}
                    <div className="md:hidden space-y-3 mt-4">
                        {loading ? (
                            <div className="text-center py-20 text-slate-400 animate-pulse">로딩 중...</div>
                        ) : orders.length === 0 ? (
                            <div className="text-center py-20 text-slate-400">수주 내역이 없습니다.</div>
                        ) : (
                            orders.map((ord) => (
                                <Card key={ord.id} onClick={() => handleOpenDetail(ord.id)} className="cursor-pointer active:bg-slate-50 border-slate-200">
                                    <div className="flex justify-between items-start mb-2">
                                        <div className="flex flex-col gap-1">
                                            <StatusBadge status={ord.status} />
                                            <span className="text-[11px] text-slate-400 font-medium">{new Date(ord.order_date).toLocaleDateString()}</span>
                                        </div>
                                        <div className="text-right">
                                            <div className="text-lg font-black text-brand-700 leading-none mb-1">{ord.currency} {ord.total_amount?.toLocaleString()}</div>
                                            <div className="text-[10px] text-slate-400 font-bold uppercase tracking-tight">납기: {new Date(ord.delivery_date).toLocaleDateString()}</div>
                                        </div>
                                    </div>
                                    <div className="mb-3">
                                        <h4 className="text-base font-black text-slate-800 truncate tracking-tight">{ord.po_no}</h4>
                                        <p className="text-xs text-slate-500 font-bold uppercase tracking-wide">{ord.clients?.name}</p>
                                    </div>
                                    <div className="flex justify-end pt-2 border-t border-slate-50 gap-2">
                                        <Button
                                            size="sm"
                                            variant="secondary"
                                            onClick={(e) => { e.stopPropagation(); handleOpenDetail(ord.id); }}
                                            className="h-[32px] px-3 font-bold"
                                        >
                                            상세
                                        </Button>
                                    </div>
                                </Card>
                            ))
                        )}
                    </div>
                </Section>
            </div>
        </div>
    );
}

function StatusBadge({ status }: { status: string }) {
    const config: Record<string, { label: string, classes: string }> = {
        'ORDERED': { label: '🚀 수주접수', classes: 'bg-indigo-50 text-indigo-700 border-indigo-100' },
        'PRODUCTION': { label: '⚙️ 생산중', classes: 'bg-orange-50 text-orange-700 border-orange-100' },
        'DONE': { label: '📦 출고완료', classes: 'bg-emerald-50 text-emerald-700 border-emerald-100' },
    };

    const { label, classes } = config[status] || { label: status, classes: 'bg-slate-100 text-slate-600 border-slate-200' };

    return (
        <span className={`px-2.5 py-1 text-[10px] md:text-xs font-black rounded-lg border shadow-sm ${classes} whitespace-nowrap`}>
            {label}
        </span>
    );
}

import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useProfile } from '../hooks/useProfile';
import { PageHeader } from '../components/common/ui/PageHeader';
import { Section } from '../components/common/ui/Section';
import { Card } from '../components/common/ui/Card';
import { Button } from '../components/common/ui/Button';

export function Orders({ onNavigate }: { onNavigate: (page: string, id?: string | null) => void }) {
    // const [viewMode, setViewMode] = useState<'list' | 'detail'>('list'); // Handled by Dashboard
    // const [selectedId, setSelectedId] = useState<string | null>(null); // Handled by Dashboard
    const [orders, setOrders] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const { profile } = useProfile();

    const [filters, setFilters] = useState({
        startDate: '',
        endDate: '',
        status: 'ALL',
        keyword: ''
    });

    useEffect(() => {
        if (profile?.company_id) fetchOrders();
    }, [filters, profile]);

    const fetchOrders = async () => {
        if (!profile?.company_id) return;

        setLoading(true);
        let query = supabase
            .from('orders')
            .select('*, clients!inner(name)')
            .eq('company_id', profile.company_id)
            .order('order_date', { ascending: false });

        if (filters.status && filters.status !== 'ALL') query = query.eq('status', filters.status);
        if (filters.startDate) query = query.gte('order_date', filters.startDate);
        if (filters.endDate) query = query.lte('order_date', `${filters.endDate}T23:59:59`);
        if (filters.keyword) query = query.or(`po_no.ilike.%${filters.keyword}%,clients.name.ilike.%${filters.keyword}%`);

        const { data, error } = await query;
        if (error) {
            console.error("Error fetching orders:", error);
            // Fallback for demo if table doesn't exist yet
            setOrders([]);
        } else {
            setOrders(data || []);
        }
        setLoading(false);
    };

    const handleDeleteOrder = async (e: React.MouseEvent, orderId: string, estimateId: string | null) => {
        e.stopPropagation();

        const confirmDelete = confirm('정말 삭제하시겠습니까?\n이 작업은 되돌릴 수 없으며, 모든 품목 데이터도 함께 삭제됩니다.');
        if (!confirmDelete) return;

        try {
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

            alert('삭제되었습니다.');
            fetchOrders();
        } catch (error: any) {
            console.error('삭제 중 오류:', error);
            alert('삭제 실패: ' + (error.message || '알 수 없는 오류'));
        }
    };

    const handleOpenDetail = (id: string | null) => {
        onNavigate('order-detail', id);
    };



    return (
        <div className="h-full flex flex-col bg-slate-50 relative">
            <div className="flex-1 overflow-y-auto p-4 md:p-8 space-y-6">
                <PageHeader
                    title="📦 수주 관리 (Orders)"
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

                {/* 필터 및 검색 */}
                <Section>
                    <Card className="p-4">
                        <div className="flex flex-col md:flex-row gap-4 justify-between items-center">
                            <div className="flex gap-2 w-full md:w-auto flex-1">
                                <select
                                    className="border p-2 rounded-lg text-sm font-bold text-slate-700 bg-slate-50 outline-none focus:ring-2 focus:ring-blue-100"
                                    value={filters.status}
                                    onChange={e => setFilters({ ...filters, status: e.target.value })}
                                >
                                    <option value="ALL">전체 상태</option>
                                    <option value="ORDERED">🚀 수주접수</option>
                                    <option value="PRODUCTION">⚙️ 생산중</option>
                                    <option value="DONE">📦 출고완료</option>
                                </select>
                                <input
                                    className="border p-2 rounded-lg text-sm flex-1 md:w-64 min-w-0 outline-none focus:ring-2 focus:ring-blue-100 placeholder:text-slate-400"
                                    placeholder="PO번호 / 거래처명 검색"
                                    value={filters.keyword}
                                    onChange={e => setFilters({ ...filters, keyword: e.target.value })}
                                />
                            </div>
                            <div className="flex items-center gap-2 w-full md:w-auto justify-end">
                                <input type="date" className="border p-2 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-100 text-slate-600" value={filters.startDate} onChange={e => setFilters({ ...filters, startDate: e.target.value })} />
                                <span className="text-slate-400">~</span>
                                <input type="date" className="border p-2 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-100 text-slate-600" value={filters.endDate} onChange={e => setFilters({ ...filters, endDate: e.target.value })} />
                            </div>
                        </div>
                    </Card>
                </Section>

                <Section title={`수주 목록 (${orders.length}건)`}>
                    <Card noPadding className="overflow-hidden">
                        {/* Desktop Table */}
                        <div className="hidden md:block overflow-x-auto">
                            <table className="min-w-full divide-y divide-slate-200">
                                <thead className="bg-slate-50">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">수주일자</th>
                                        <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">상태</th>
                                        <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">PO No.</th>
                                        <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">거래처</th>
                                        <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">납기일</th>
                                        <th className="px-6 py-3 text-right text-xs font-bold text-slate-500 uppercase tracking-wider">금액</th>
                                        <th className="px-6 py-3 text-center text-xs font-bold text-slate-500 uppercase tracking-wider">관리</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-slate-200">
                                    {loading ? (
                                        <tr><td colSpan={7} className="text-center py-20 text-slate-400">로딩 중...</td></tr>
                                    ) : orders.length === 0 ? (
                                        <tr><td colSpan={7} className="text-center py-20 text-slate-400">수주 내역이 없습니다.</td></tr>
                                    ) : (
                                        orders.map((ord) => (
                                            <tr key={ord.id} className="hover:bg-blue-50/50 cursor-pointer transition-colors" onClick={() => handleOpenDetail(ord.id)}>
                                                <td className="px-6 py-4 text-sm text-slate-500">{new Date(ord.order_date).toLocaleDateString()}</td>
                                                <td className="px-6 py-4">
                                                    <StatusBadge status={ord.status} />
                                                </td>
                                                <td className="px-6 py-4 text-sm font-bold text-blue-600">{ord.po_no}</td>
                                                <td className="px-6 py-4 text-sm font-bold text-slate-700">{ord.clients?.name}</td>
                                                <td className="px-6 py-4 text-sm text-slate-700">{new Date(ord.delivery_date).toLocaleDateString()}</td>
                                                <td className="px-6 py-4 text-right">
                                                    <span className="text-sm font-bold text-slate-700">{ord.currency} {ord.total_amount?.toLocaleString()}</span>
                                                </td>
                                                <td className="px-6 py-4 text-center">
                                                    <div className="flex justify-center gap-2">
                                                        <Button
                                                            size="sm"
                                                            variant="secondary"
                                                            onClick={(e) => { e.stopPropagation(); handleOpenDetail(ord.id); }}
                                                            className="h-[28px] opacity-70 hover:opacity-100"
                                                        >
                                                            ✏️
                                                        </Button>
                                                        <Button
                                                            size="sm"
                                                            variant="danger"
                                                            onClick={(e) => handleDeleteOrder(e, ord.id, ord.estimate_id)}
                                                            className="h-[28px] opacity-70 hover:opacity-100"
                                                        >
                                                            🗑️
                                                        </Button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>

                        {/* Mobile List Info */}
                        <div className="md:hidden p-4 text-center text-sm text-slate-400 border-b border-slate-100">
                            좌우로 스크롤하여 내용을 확인하세요.
                        </div>
                    </Card>

                    {/* Mobile Card List (Alternative to table) */}
                    <div className="md:hidden space-y-3 mt-4">
                        {loading ? (
                            <div className="text-center py-20 text-slate-400">로딩 중...</div>
                        ) : orders.length === 0 ? (
                            <div className="text-center py-20 text-slate-400">수주 내역이 없습니다.</div>
                        ) : (
                            orders.map((ord) => (
                                <Card key={ord.id} onClick={() => handleOpenDetail(ord.id)} className="cursor-pointer active:bg-slate-50">
                                    <div className="flex justify-between items-start mb-2">
                                        <div className="flex flex-col gap-1">
                                            <StatusBadge status={ord.status} />
                                            <span className="text-xs text-slate-400">{new Date(ord.order_date).toLocaleDateString()}</span>
                                        </div>
                                        <div className="text-right">
                                            <div className="text-lg font-bold text-slate-800">{ord.currency} {ord.total_amount?.toLocaleString()}</div>
                                            <div className="text-[10px] text-slate-400">납기: {new Date(ord.delivery_date).toLocaleDateString()}</div>
                                        </div>
                                    </div>
                                    <div className="mb-3">
                                        <h4 className="text-base font-bold text-blue-600 truncate">{ord.po_no}</h4>
                                        <p className="text-sm text-slate-500 font-bold">{ord.clients?.name}</p>
                                    </div>
                                    <div className="flex justify-end pt-2 border-t border-slate-50">
                                        <Button
                                            size="sm"
                                            variant="danger"
                                            onClick={(e) => handleDeleteOrder(e, ord.id, ord.estimate_id)}
                                            className="h-[32px] w-[32px] opacity-70 hover:opacity-100 flex items-center justify-center p-0"
                                        >
                                            🗑️
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

// 수주 상태 배지 컴포넌트
function StatusBadge({ status }: { status: string }) {
    const config: Record<string, { label: string, classes: string }> = {
        'ORDERED': { label: '🚀 수주접수', classes: 'bg-blue-100 text-blue-700' },
        'PRODUCTION': { label: '⚙️ 생산중', classes: 'bg-orange-100 text-orange-700' },
        'DONE': { label: '📦 출고완료', classes: 'bg-green-100 text-green-700' },
    };

    const { label, classes } = config[status] || { label: status, classes: 'bg-slate-100 text-slate-600' };

    return (
        <span className={`px-2 py-0.5 text-[10px] md:text-xs font-bold rounded-full ${classes} whitespace-nowrap`}>
            {label}
        </span>
    );
}

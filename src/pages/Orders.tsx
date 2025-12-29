import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { PageLayout } from '../components/common/PageLayout';
import { OrderDetail } from './OrderDetail';

export function Orders() {
    const [viewMode, setViewMode] = useState<'list' | 'detail'>('list');
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [orders, setOrders] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    const [filters, setFilters] = useState({
        startDate: '',
        endDate: '',
        status: 'ALL',
        keyword: ''
    });

    useEffect(() => {
        if (viewMode === 'list') fetchOrders();
    }, [viewMode, filters]);

    const fetchOrders = async () => {
        setLoading(true);
        let query = supabase
            .from('orders')
            .select('*, clients!inner(name)')
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

    const handleOpenDetail = (id: string | null) => {
        setSelectedId(id);
        setViewMode('detail');
    };

    const handleBackToList = () => {
        setViewMode('list');
        fetchOrders();
    };

    if (viewMode === 'detail') {
        return <OrderDetail orderId={selectedId} onBack={handleBackToList} />;
    }

    return (
        <PageLayout
            title="📦 수주 관리 (Orders)"
            actions={
                <div className="flex flex-col gap-2 w-full">
                    <div className="flex flex-wrap gap-2 items-center bg-white p-2 rounded border">
                        <select className="border p-1 rounded text-sm font-bold text-slate-700" value={filters.status} onChange={e => setFilters({ ...filters, status: e.target.value })}>
                            <option value="ALL">전체 보기</option>
                            <option value="ORDERED">접수 (Ordered)</option>
                            <option value="PRODUCTION">생산중 (Production)</option>
                            <option value="DONE">출고완료 (Done)</option>
                        </select>
                        <span className="text-xs text-slate-400">|</span>
                        <input type="date" className="border p-1 rounded text-sm" value={filters.startDate} onChange={e => setFilters({ ...filters, startDate: e.target.value })} />
                        <span className="text-xs">~</span>
                        <input type="date" className="border p-1 rounded text-sm" value={filters.endDate} onChange={e => setFilters({ ...filters, endDate: e.target.value })} />
                        <input className="border p-1 rounded text-sm flex-1 min-w-[150px]" placeholder="PO번호 / 거래처명 검색" value={filters.keyword} onChange={e => setFilters({ ...filters, keyword: e.target.value })} />
                    </div>
                    <div className="flex justify-between items-center">
                        <span className="text-sm font-bold text-slate-600 ml-2">
                            총 {orders.length}건
                        </span>
                        <button onClick={() => handleOpenDetail(null)} className="bg-blue-600 text-white px-4 py-2 rounded text-sm font-bold hover:bg-blue-700 shadow-sm">+ 수주 수기 등록</button>
                    </div>
                </div>
            }
        >
            <div className="bg-white rounded-lg shadow border border-slate-200 overflow-hidden">
                <table className="min-w-full divide-y divide-slate-200">
                    <thead className="bg-slate-50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase">수주일자</th>
                            <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase">상태</th>
                            <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase">PO No.</th>
                            <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase">거래처</th>
                            <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase">납기일</th>
                            <th className="px-6 py-3 text-right text-xs font-bold text-slate-500 uppercase">금액</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                        {loading ? (
                            <tr><td colSpan={6} className="text-center py-10">로딩 중...</td></tr>
                        ) : orders.length === 0 ? (
                            <tr><td colSpan={6} className="text-center py-10 text-slate-400">수주 내역이 없습니다.</td></tr>
                        ) : (
                            orders.map((ord) => (
                                <tr key={ord.id} className="hover:bg-slate-50 cursor-pointer" onClick={() => handleOpenDetail(ord.id)}>
                                    <td className="px-6 py-4 text-sm text-slate-500">{new Date(ord.order_date).toLocaleDateString()}</td>
                                    <td className="px-6 py-4">
                                        <span className={`px-2 py-1 text-xs font-bold rounded ${ord.status === 'DONE' ? 'bg-slate-200 text-slate-600' :
                                                ord.status === 'PRODUCTION' ? 'bg-orange-100 text-orange-700' :
                                                    'bg-blue-100 text-blue-700'
                                            }`}>
                                            {ord.status}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-sm font-bold text-blue-600">{ord.po_no}</td>
                                    <td className="px-6 py-4 text-sm font-bold text-slate-700">{ord.clients?.name}</td>
                                    <td className="px-6 py-4 text-sm text-slate-700">{new Date(ord.delivery_date).toLocaleDateString()}</td>
                                    <td className="px-6 py-4 text-right text-sm font-bold text-slate-700">
                                        {ord.currency} {ord.total_amount?.toLocaleString()}
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </PageLayout>
    );
}

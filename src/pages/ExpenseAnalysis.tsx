import { useEffect, useState, useMemo } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useProfile } from '../hooks/useProfile';
import { PageHeader } from '../components/common/ui/PageHeader';
import { Section } from '../components/common/ui/Section';
import { Card } from '../components/common/ui/Card';
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    BarElement,
    Title,
    Tooltip,
    Legend,
    Filler
} from 'chart.js';
import { Bar, Line } from 'react-chartjs-2';

ChartJS.register(
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    BarElement,
    Title,
    Tooltip,
    Legend,
    Filler
);

export function ExpenseAnalysis() {
    const { profile } = useProfile();
    const [loading, setLoading] = useState(true);
    const [items, setItems] = useState<any[]>([]);
    const [clients, setClients] = useState<{ id: string, name: string }[]>([]);

    // Filters
    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];

    const [filters, setFilters] = useState({
        startDate: firstDay,
        endDate: lastDay,
        clientId: '',
        groupBy: 'list' as 'list' | 'week' | 'month' | 'quarter' | 'year'
    });

    const [selectedItemIds, setSelectedItemIds] = useState<Set<string>>(new Set());

    useEffect(() => {
        if (profile?.company_id) {
            fetchClients();
            fetchData();
        }
    }, [profile, filters.startDate, filters.endDate, filters.clientId]);

    const fetchClients = async () => {
        if (!profile?.company_id) return;
        const { data } = await supabase
            .from('clients')
            .select('id, name')
            .eq('company_id', profile.company_id)
            .order('name');
        setClients(data || []);
    };

    const fetchData = async () => {
        if (!profile?.company_id) return;
        setLoading(true);

        // Fetch Shipped Items joined with Orders and Estimates
        // Logic: shipment_items -> order_items -> estimate_items
        let query = supabase
            .from('shipment_items')
            .select(`
                id,
                quantity,
                created_at,
                shipments!inner(
                    shipment_no,
                    shipped_at
                ),
                order_items!inner(
                    id,
                    part_no,
                    part_name,
                    qty,
                    orders!inner(
                        id,
                        po_no,
                        client_id,
                        clients!inner(name)
                    ),
                    estimate_items(
                        material_cost,
                        post_process_cost
                    )
                )
            `)
            .eq('shipments.company_id', profile.company_id)
            .gte('shipments.shipped_at', `${filters.startDate}T00:00:00`)
            .lte('shipments.shipped_at', `${filters.endDate}T23:59:59`)
            .order('created_at', { ascending: false });

        if (filters.clientId) {
            query = query.eq('order_items.orders.client_id', filters.clientId);
        }

        const { data, error } = await query;
        if (error) {
            console.error(error);
            setItems([]);
        } else {
            // Flatten Data and Calculate Costs
            const flattened = (data || []).map((item: any) => {
                const estItem = Array.isArray(item.order_items.estimate_items)
                    ? item.order_items.estimate_items[0]
                    : item.order_items.estimate_items;

                const matUnitCost = estItem?.material_cost || 0;
                const ppUnitCost = estItem?.post_process_cost || 0;
                const qty = item.quantity || 0;

                return {
                    id: item.id,
                    shipmentDate: item.shipments?.shipped_at,
                    shipmentNo: item.shipments?.shipment_no,
                    clientName: item.order_items?.orders?.clients?.name,
                    poNo: item.order_items?.orders?.po_no,
                    partName: item.order_items?.part_name,
                    partNo: item.order_items?.part_no,
                    qty: qty,
                    matUnitCost,
                    ppUnitCost,
                    totalMatCost: matUnitCost * qty,
                    totalPpCost: ppUnitCost * qty,
                    totalEstCost: (matUnitCost + ppUnitCost) * qty
                };
            });
            setItems(flattened);
        }
        setLoading(false);
    };

    // Calculate Summaries based on Selection or All
    const summaryData = useMemo(() => {
        const targetItems = selectedItemIds.size > 0
            ? items.filter(i => selectedItemIds.has(i.id))
            : items;

        const totalMat = targetItems.reduce((sum, i) => sum + i.totalMatCost, 0);
        const totalPp = targetItems.reduce((sum, i) => sum + i.totalPpCost, 0);

        return {
            totalMat,
            totalPp,
            totalExp: totalMat + totalPp,
            count: targetItems.length
        };
    }, [items, selectedItemIds]);

    // Grouping Logic for Chart
    const chartData = useMemo(() => {
        const labels: string[] = [];
        const matData: number[] = [];
        const ppData: number[] = [];

        // Group items by date/week/month
        const groups: Record<string, { mat: number, pp: number }> = {};

        items.forEach(item => {
            const date = new Date(item.shipmentDate);
            let key = date.toLocaleDateString(); // Default List/Daily

            if (filters.groupBy === 'month') {
                key = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}`;
            } else if (filters.groupBy === 'year') {
                key = `${date.getFullYear()}`;
            } else if (filters.groupBy === 'week') {
                // Simple week number
                const first = new Date(date.getFullYear(), 0, 1);
                const dayOfYear = ((date.getTime() - first.getTime()) + 86400000) / 86400000;
                const week = Math.ceil(dayOfYear / 7);
                key = `${date.getFullYear()}-W${week}`;
            }

            if (!groups[key]) groups[key] = { mat: 0, pp: 0 };
            groups[key].mat += item.totalMatCost;
            groups[key].pp += item.totalPpCost;
        });

        // Sort keys
        const sortedKeys = Object.keys(groups).sort();
        sortedKeys.forEach(key => {
            labels.push(key);
            matData.push(groups[key].mat);
            ppData.push(groups[key].pp);
        });

        return {
            labels,
            datasets: [
                {
                    label: '소재비 (Estimated)',
                    data: matData,
                    backgroundColor: 'rgba(59, 130, 246, 0.5)',
                    borderColor: 'rgb(59, 130, 246)',
                    borderWidth: 1,
                    stack: 'Stack 0',
                },
                {
                    label: '후처리비 (Estimated)',
                    data: ppData,
                    backgroundColor: 'rgba(249, 115, 22, 0.5)',
                    borderColor: 'rgb(249, 115, 22)',
                    borderWidth: 1,
                    stack: 'Stack 0',
                }
            ]
        };
    }, [items, filters.groupBy]);

    const toggleAll = () => {
        if (selectedItemIds.size === items.length) setSelectedItemIds(new Set());
        else setSelectedItemIds(new Set(items.map(i => i.id)));
    };

    const toggleSelection = (id: string) => {
        const next = new Set(selectedItemIds);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        setSelectedItemIds(next);
    };

    return (
        <div className="h-full flex flex-col bg-slate-50 relative">
            <div className="flex-1 overflow-y-auto p-4 md:p-8 space-y-6">
                <PageHeader title="💰 지출/원가 예상 (Expense Analysis)" description="견적 원가를 기반으로 한 예상 지출 내역입니다." />

                {/* Filters */}
                <Section>
                    <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-6">
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 items-end">
                            {/* Period */}
                            <div className="md:col-span-2 space-y-2">
                                <label className="block text-sm font-bold text-slate-700">📅 조회 기간 (Period)</label>
                                <div className="flex items-center gap-3 bg-slate-50 p-1.5 rounded-lg border border-slate-200">
                                    <input
                                        type="date"
                                        className="bg-transparent border-none text-sm font-medium text-slate-700 focus:ring-0 w-full outline-none"
                                        value={filters.startDate}
                                        onChange={e => setFilters({ ...filters, startDate: e.target.value })}
                                    />
                                    <span className="text-slate-400 font-bold">~</span>
                                    <input
                                        type="date"
                                        className="bg-transparent border-none text-sm font-medium text-slate-700 focus:ring-0 w-full outline-none"
                                        value={filters.endDate}
                                        onChange={e => setFilters({ ...filters, endDate: e.target.value })}
                                    />
                                </div>
                            </div>

                            {/* Client */}
                            <div className="space-y-2">
                                <label className="block text-sm font-bold text-slate-700">🏢 거래처 (Client)</label>
                                <select
                                    className="w-full border-slate-200 rounded-lg text-sm focus:ring-blue-500 focus:border-blue-500 bg-slate-50 p-2.5 font-medium outline-none border"
                                    value={filters.clientId}
                                    onChange={e => setFilters({ ...filters, clientId: e.target.value })}
                                >
                                    <option value="">전체 거래처</option>
                                    {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                </select>
                            </div>

                            {/* Group By */}
                            <div className="space-y-2">
                                <label className="block text-sm font-bold text-slate-700">📊 보기 방식 (View Mode)</label>
                                <div className="flex bg-slate-100 rounded-lg p-1">
                                    {[
                                        { id: 'list', label: '목록' },
                                        { id: 'week', label: '주간' },
                                        { id: 'month', label: '월간' },
                                        { id: 'year', label: '연간' }
                                    ].map(mode => (
                                        <button
                                            key={mode.id}
                                            onClick={() => setFilters({ ...filters, groupBy: mode.id as any })}
                                            className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-all ${filters.groupBy === mode.id
                                                    ? 'bg-white text-blue-600 shadow-sm'
                                                    : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'
                                                }`}
                                        >
                                            {mode.label}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                </Section>

                {/* Summary Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Card className="p-4 border-l-4 border-blue-500">
                        <h4 className="text-xs font-bold text-slate-500 mb-1">총 예상 소재비 (Material)</h4>
                        <p className="text-2xl font-black text-slate-800">₩ {summaryData.totalMat.toLocaleString()}</p>
                    </Card>
                    <Card className="p-4 border-l-4 border-orange-500">
                        <h4 className="text-xs font-bold text-slate-500 mb-1">총 예상 후처리비 (Processing)</h4>
                        <p className="text-2xl font-black text-slate-800">₩ {summaryData.totalPp.toLocaleString()}</p>
                    </Card>
                    <Card className="p-4 border-l-4 border-indigo-500">
                        <h4 className="text-xs font-bold text-slate-500 mb-1">
                            {selectedItemIds.size > 0 ? `선택 합계 (${selectedItemIds.size}건)` : '총 예상 지출 합계'}
                        </h4>
                        <p className="text-2xl font-black text-indigo-600">₩ {summaryData.totalExp.toLocaleString()}</p>
                    </Card>
                </div>

                {/* Chart Section */}
                {items.length > 0 && filters.groupBy !== 'list' && (
                    <Section title="지출 추이">
                        <Card className="h-[300px]">
                            <Bar
                                data={chartData}
                                options={{
                                    responsive: true,
                                    maintainAspectRatio: false,
                                    interaction: { mode: 'index', intersect: false },
                                }}
                            />
                        </Card>
                    </Section>
                )}

                {/* Data Table */}
                <Section title={`상세 내역 (${items.length}건)`}>
                    <Card noPadding className="overflow-hidden min-h-[300px]">
                        <table className="min-w-full divide-y divide-slate-200">
                            <thead className="bg-slate-50">
                                <tr>
                                    <th className="px-4 py-3 text-center w-[40px]"><input type="checkbox" checked={selectedItemIds.size === items.length && items.length > 0} onChange={toggleAll} /></th>
                                    <th className="px-4 py-3 text-left text-xs font-bold text-slate-500">출하일자</th>
                                    <th className="px-4 py-3 text-left text-xs font-bold text-slate-500">거래처 / PO</th>
                                    <th className="px-4 py-3 text-left text-xs font-bold text-slate-500">품명 / 도번</th>
                                    <th className="px-4 py-3 text-center text-xs font-bold text-slate-500">수량</th>
                                    <th className="px-4 py-3 text-right text-xs font-bold text-slate-500">소재비 (단가)</th>
                                    <th className="px-4 py-3 text-right text-xs font-bold text-slate-500">후처리비 (단가)</th>
                                    <th className="px-4 py-3 text-right text-xs font-bold text-slate-500">합계 (Total)</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-200 bg-white">
                                {loading ? (
                                    <tr><td colSpan={8} className="text-center py-10 text-slate-400">계산 중...</td></tr>
                                ) : items.length === 0 ? (
                                    <tr><td colSpan={8} className="text-center py-10 text-slate-400">데이터가 없습니다.</td></tr>
                                ) : (
                                    items.map(item => (
                                        <tr key={item.id} className="hover:bg-slate-50">
                                            <td className="px-4 py-3 text-center"><input type="checkbox" checked={selectedItemIds.has(item.id)} onChange={() => toggleSelection(item.id)} /></td>
                                            <td className="px-4 py-3 text-xs text-slate-600">
                                                {new Date(item.shipmentDate).toLocaleDateString()}
                                                <div className="text-[10px] text-slate-400">{item.shipmentNo}</div>
                                            </td>
                                            <td className="px-4 py-3 text-xs font-bold text-slate-700">
                                                {item.clientName}
                                                <div className="text-[10px] font-normal text-slate-500">{item.poNo}</div>
                                            </td>
                                            <td className="px-4 py-3 text-xs text-slate-700">
                                                <div className="font-bold">{item.partNo}</div>
                                                <div className="text-slate-500 truncate max-w-[150px]">{item.partName}</div>
                                            </td>
                                            <td className="px-4 py-3 text-center text-xs font-bold badge bg-slate-100 rounded">{item.qty}</td>
                                            <td className="px-4 py-3 text-right text-xs text-blue-600">
                                                ₩ {item.totalMatCost.toLocaleString()}
                                                <div className="text-[10px] text-slate-400">(@{item.matUnitCost.toLocaleString()})</div>
                                            </td>
                                            <td className="px-4 py-3 text-right text-xs text-orange-600">
                                                ₩ {item.totalPpCost.toLocaleString()}
                                                <div className="text-[10px] text-slate-400">(@{item.ppUnitCost.toLocaleString()})</div>
                                            </td>
                                            <td className="px-4 py-3 text-right text-xs font-black text-slate-800">
                                                ₩ {item.totalEstCost.toLocaleString()}
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </Card>
                </Section>
            </div>
        </div>
    );
}

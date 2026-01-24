import { useEffect, useState, useMemo } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useProfile } from '../hooks/useProfile';
import { PageHeader } from '../components/common/ui/PageHeader';
import { Section } from '../components/common/ui/Section';
import { Card } from '../components/common/ui/Card';
import { MultiSelect } from '../components/common/ui/MultiSelect';
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
import { Bar } from 'react-chartjs-2';

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
    const [allItems, setAllItems] = useState<any[]>([]); // Raw fetched data
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

    // Multi-Select Filter State
    const [selectedMaterials, setSelectedMaterials] = useState<string[]>([]);
    const [selectedPostProcessings, setSelectedPostProcessings] = useState<string[]>([]);
    const [selectedHeatTreatments, setSelectedHeatTreatments] = useState<string[]>([]);

    // Selection for Checkboxes (Row Selection)
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
        // Logic: shipment_items -> order_items -> estimate_items -> (materials, post_processings, heat_treatments)
        let query = supabase
            .from('shipment_items')
            .select(`
                id,
                quantity,
                created_at,
                shipments!inner(
                    shipment_no,
                    shipped_at,
                    company_id
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
                        post_process_cost,
                        heat_treatment_cost,
                        materials(name, code),
                        post_processings(name),
                        heat_treatments(name)
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
            setAllItems([]);
        } else {
            // Flatten Data and Calculate Costs
            const flattened = (data || []).map((item: any) => {
                const estItem = Array.isArray(item.order_items.estimate_items)
                    ? item.order_items.estimate_items[0]
                    : item.order_items.estimate_items;

                const matUnitCost = estItem?.material_cost || 0;
                const ppUnitCost = estItem?.post_process_cost || 0;
                const htUnitCost = estItem?.heat_treatment_cost || 0; // Heat Treatment Cost

                const qty = item.quantity || 0;

                // Extract Names
                const materialName = estItem?.materials?.name || '미지정';
                const materialCode = estItem?.materials?.code || 'No Code';
                const postProcessingName = estItem?.post_processings?.name || '없음';
                const heatTreatmentName = estItem?.heat_treatments?.name || '없음';

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
                    htUnitCost,

                    materialName,
                    materialCode,
                    postProcessingName,
                    heatTreatmentName,

                    totalMatCost: matUnitCost * qty,
                    totalPpCost: ppUnitCost * qty,
                    totalHtCost: htUnitCost * qty,
                    totalEstCost: (matUnitCost + ppUnitCost + htUnitCost) * qty
                };
            });
            setAllItems(flattened);
        }
        setLoading(false);
    };

    // Extract Filter Options from Data
    const filterOptions = useMemo(() => {
        const mats = new Set<string>();
        const pps = new Set<string>();
        const hts = new Set<string>();

        allItems.forEach(item => {
            if (item.materialCode) mats.add(item.materialCode);
            if (item.postProcessingName) pps.add(item.postProcessingName);
            if (item.heatTreatmentName) hts.add(item.heatTreatmentName);
        });

        return {
            materials: Array.from(mats).sort().map(v => ({ label: v, value: v })),
            postProcessings: Array.from(pps).sort().map(v => ({ label: v, value: v })),
            heatTreatments: Array.from(hts).sort().map(v => ({ label: v, value: v })),
        };
    }, [allItems]);

    // Apply Client-Side Filters
    const filteredItems = useMemo(() => {
        return allItems.filter(item => {
            if (selectedMaterials.length > 0 && !selectedMaterials.includes(item.materialCode)) return false;
            if (selectedPostProcessings.length > 0 && !selectedPostProcessings.includes(item.postProcessingName)) return false;
            if (selectedHeatTreatments.length > 0 && !selectedHeatTreatments.includes(item.heatTreatmentName)) return false;
            return true;
        });
    }, [allItems, selectedMaterials, selectedPostProcessings, selectedHeatTreatments]);

    // Calculate Summaries based on Selection or Filtered List
    const summaryData = useMemo(() => {
        const targetItems = selectedItemIds.size > 0
            ? filteredItems.filter(i => selectedItemIds.has(i.id))
            : filteredItems;

        const totalMat = targetItems.reduce((sum, i) => sum + i.totalMatCost, 0);
        const totalPp = targetItems.reduce((sum, i) => sum + i.totalPpCost, 0);
        const totalHt = targetItems.reduce((sum, i) => sum + i.totalHtCost, 0);

        return {
            totalMat,
            totalPp,
            totalHt,
            totalExp: totalMat + totalPp + totalHt,
            count: targetItems.length
        };
    }, [filteredItems, selectedItemIds]);

    // Grouping Logic for Chart
    const chartData = useMemo(() => {
        const labels: string[] = [];
        const matData: number[] = [];
        const ppData: number[] = [];
        const htData: number[] = [];

        // Group items by date/week/month
        const groups: Record<string, { mat: number, pp: number, ht: number }> = {};

        filteredItems.forEach(item => {
            const date = new Date(item.shipmentDate);
            let key = date.toLocaleDateString(); // Default List/Daily

            if (filters.groupBy === 'month') {
                key = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}`;
            } else if (filters.groupBy === 'year') {
                key = `${date.getFullYear()}`;
            } else if (filters.groupBy === 'week') {
                const first = new Date(date.getFullYear(), 0, 1);
                const dayOfYear = ((date.getTime() - first.getTime()) + 86400000) / 86400000;
                const week = Math.ceil(dayOfYear / 7);
                key = `${date.getFullYear()}-W${week}`;
            }

            if (!groups[key]) groups[key] = { mat: 0, pp: 0, ht: 0 };
            groups[key].mat += item.totalMatCost;
            groups[key].pp += item.totalPpCost;
            groups[key].ht += item.totalHtCost;
        });

        const sortedKeys = Object.keys(groups).sort();
        sortedKeys.forEach(key => {
            labels.push(key);
            matData.push(groups[key].mat);
            ppData.push(groups[key].pp);
            htData.push(groups[key].ht);
        });

        return {
            labels,
            datasets: [
                {
                    label: '소재비 (Material)',
                    data: matData,
                    backgroundColor: 'rgba(59, 130, 246, 0.5)', // Blue
                    borderColor: 'rgb(59, 130, 246)',
                    borderWidth: 1,
                    stack: 'Stack 0',
                },
                {
                    label: '후처리비 (Processing)',
                    data: ppData,
                    backgroundColor: 'rgba(249, 115, 22, 0.5)', // Orange
                    borderColor: 'rgb(249, 115, 22)',
                    borderWidth: 1,
                    stack: 'Stack 0',
                },
                {
                    label: '열처리비 (Heat Treat)',
                    data: htData,
                    backgroundColor: 'rgba(239, 68, 68, 0.5)', // Red
                    borderColor: 'rgb(239, 68, 68)',
                    borderWidth: 1,
                    stack: 'Stack 0',
                }
            ]
        };
    }, [filteredItems, filters.groupBy]);

    const toggleAll = () => {
        if (selectedItemIds.size === filteredItems.length) setSelectedItemIds(new Set());
        else setSelectedItemIds(new Set(filteredItems.map(i => i.id)));
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
                <PageHeader title="💰 지출/원가 분석 (Expense Analysis)" description="자재, 후처리, 열처리 등 항목별 원가 지출을 분석합니다." />

                {/* Filters */}
                <Section>
                    <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-6 space-y-4">
                        {/* Top Line: Period / Client / GroupBy */}
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 items-end">
                            {/* Period */}
                            <div className="md:col-span-2 space-y-2">
                                <label className="block text-sm font-bold text-slate-700">📅 조회 기간</label>
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
                                <label className="block text-sm font-bold text-slate-700">🏢 거래처</label>
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
                                <label className="block text-sm font-bold text-slate-700">📊 보기 방식</label>
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

                        {/* Bottom Line: Multi-Select Filters */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4 border-t border-slate-100">
                            <MultiSelect
                                label="🧱 소재 (Material Code)"
                                options={filterOptions.materials}
                                selectedValues={selectedMaterials}
                                onChange={setSelectedMaterials}
                                placeholder="전체 소재"
                            />
                            <MultiSelect
                                label="✨ 후처리 (Post-Processing)"
                                options={filterOptions.postProcessings}
                                selectedValues={selectedPostProcessings}
                                onChange={setSelectedPostProcessings}
                                placeholder="전체 후처리"
                            />
                            <MultiSelect
                                label="🔥 열처리 (Heat-Treatment)"
                                options={filterOptions.heatTreatments}
                                selectedValues={selectedHeatTreatments}
                                onChange={setSelectedHeatTreatments}
                                placeholder="전체 열처리"
                            />
                        </div>
                    </div>
                </Section>

                {/* Summary Cards */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <Card className="p-4 border-l-4 border-blue-500">
                        <h4 className="text-xs font-bold text-slate-500 mb-1">소재비 합계</h4>
                        <p className="text-xl font-black text-slate-800">₩ {summaryData.totalMat.toLocaleString()}</p>
                    </Card>
                    <Card className="p-4 border-l-4 border-orange-500">
                        <h4 className="text-xs font-bold text-slate-500 mb-1">후처리비 합계</h4>
                        <p className="text-xl font-black text-slate-800">₩ {summaryData.totalPp.toLocaleString()}</p>
                    </Card>
                    <Card className="p-4 border-l-4 border-red-500">
                        <h4 className="text-xs font-bold text-slate-500 mb-1">열처리비 합계</h4>
                        <p className="text-xl font-black text-slate-800">₩ {summaryData.totalHt.toLocaleString()}</p>
                    </Card>
                    <Card className="p-4 border-l-4 border-indigo-500">
                        <h4 className="text-xs font-bold text-slate-500 mb-1">
                            {selectedItemIds.size > 0 ? `선택 합계 (${selectedItemIds.size}건)` : '총 지출 합계'}
                        </h4>
                        <p className="text-2xl font-black text-indigo-600">₩ {summaryData.totalExp.toLocaleString()}</p>
                    </Card>
                </div>

                {/* Chart Section */}
                {filteredItems.length > 0 && filters.groupBy !== 'list' && (
                    <Section title="지출 추이 (기간별)">
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
                <Section title={`상세 내역 (${filteredItems.length}건)`}>
                    <Card noPadding className="overflow-hidden min-h-[300px]">
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-slate-200">
                                <thead className="bg-slate-50">
                                    <tr>
                                        <th className="px-4 py-3 text-center w-[40px]"><input type="checkbox" checked={selectedItemIds.size === filteredItems.length && filteredItems.length > 0} onChange={toggleAll} /></th>
                                        <th className="px-4 py-3 text-left text-xs font-bold text-slate-500">출하일자</th>
                                        <th className="px-4 py-3 text-left text-xs font-bold text-slate-500">거래처 / PO</th>
                                        <th className="px-4 py-3 text-left text-xs font-bold text-slate-500">품명 / 도번</th>
                                        <th className="px-4 py-3 text-left text-xs font-bold text-slate-500">상세사양</th>
                                        <th className="px-4 py-3 text-center text-xs font-bold text-slate-500">수량</th>
                                        <th className="px-4 py-3 text-right text-xs font-bold text-slate-500">소재비</th>
                                        <th className="px-4 py-3 text-right text-xs font-bold text-slate-500">후처리비</th>
                                        <th className="px-4 py-3 text-right text-xs font-bold text-slate-500">열처리비</th>
                                        <th className="px-4 py-3 text-right text-xs font-bold text-slate-500">합계</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-200 bg-white">
                                    {loading ? (
                                        <tr><td colSpan={10} className="text-center py-10 text-slate-400">계산 중...</td></tr>
                                    ) : filteredItems.length === 0 ? (
                                        <tr><td colSpan={10} className="text-center py-10 text-slate-400">데이터가 없습니다.</td></tr>
                                    ) : (
                                        filteredItems.map(item => (
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
                                                <td className="px-4 py-3 text-[10px] text-slate-500">
                                                    <div>{item.materialCode}</div>
                                                    <div>{item.postProcessingName !== '없음' && `+ ${item.postProcessingName}`}</div>
                                                    <div>{item.heatTreatmentName !== '없음' && `+ ${item.heatTreatmentName}`}</div>
                                                </td>
                                                <td className="px-4 py-3 text-center text-xs font-bold badge bg-slate-100 rounded">{item.qty}</td>
                                                <td className="px-4 py-3 text-right text-xs text-blue-600">
                                                    ₩ {item.totalMatCost.toLocaleString()}
                                                </td>
                                                <td className="px-4 py-3 text-right text-xs text-orange-600">
                                                    ₩ {item.totalPpCost.toLocaleString()}
                                                </td>
                                                <td className="px-4 py-3 text-right text-xs text-red-600">
                                                    ₩ {item.totalHtCost.toLocaleString()}
                                                </td>
                                                <td className="px-4 py-3 text-right text-xs font-black text-slate-800">
                                                    ₩ {item.totalEstCost.toLocaleString()}
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </Card>
                </Section>
            </div>
        </div>
    );
}

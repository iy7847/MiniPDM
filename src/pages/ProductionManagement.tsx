import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useProfile } from '../hooks/useProfile';
import { PageHeader } from '../components/common/ui/PageHeader';
import { Section } from '../components/common/ui/Section';
import { Card } from '../components/common/ui/Card';
import { Button } from '../components/common/ui/Button';
import { ProductionCompleteModal } from '../components/production/ProductionCompleteModal';
import { useFileHandler } from '../hooks/useFileHandler';
import { ProductionItemRow } from '../components/production/ProductionItemRow';
import { Pagination } from '../components/common/ui/Pagination';

// Add this interface or import if it exists centrally
interface ProductionManagementProps {
    onNavigate: (page: string, id?: string | null) => void;
}

export function ProductionManagement({ onNavigate }: ProductionManagementProps) {
    const { profile } = useProfile();
    const [items, setItems] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedItemIds, setSelectedItemIds] = useState<Set<string>>(new Set());
    const [companyRootPath, setCompanyRootPath] = useState('');

    // File Handler
    const { openFile } = useFileHandler(companyRootPath);

    useEffect(() => {
        const path = localStorage.getItem('company_root_path');
        if (path) setCompanyRootPath(path);
    }, []);

    // Filter State
    const [activeTab, setActiveTab] = useState<'ALL' | 'INHOUSE' | 'OUTSOURCE'>('INHOUSE');
    const [viewStatus, setViewStatus] = useState<'ACTIVE' | 'PROCESSING' | 'DONE'>('ACTIVE');
    const [filters, setFilters] = useState({
        startDate: (() => {
            const d = new Date();
            d.setMonth(d.getMonth() - 3);
            return d.toISOString().split('T')[0];
        })(),
        endDate: new Date().toISOString().split('T')[0],
        page: 1,
        pageSize: 20
    });
    const [totalCount, setTotalCount] = useState(0);
    const [keyword, setKeyword] = useState('');

    // Modal State
    const [isCompleteModalOpen, setIsCompleteModalOpen] = useState(false);
    const [completionTargets, setCompletionTargets] = useState<any[]>([]);

    useEffect(() => {
        if (profile?.company_id) {
            fetchItems();
        }
    }, [profile, activeTab, viewStatus, filters.page, filters.startDate, filters.endDate]);

    const fetchItems = async () => {
        if (!profile?.company_id) return;
        setLoading(true);

        try {
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
                    estimate_items (
                         id,
                         materials (name),
                         post_processings (name),
                         heat_treatments (name)
                    ),
                    shipment_items (id),
                    files (*)
                `, { count: 'exact' })
                .eq('orders.company_id', profile.company_id);

            if (viewStatus === 'ACTIVE') {
                query = query.eq('process_status', 'WAITING').order('orders(delivery_date)', { ascending: true });
            } else if (viewStatus === 'PROCESSING') {
                query = query.eq('process_status', 'PROCESSING').order('orders(delivery_date)', { ascending: true });
            } else {
                // DONE Tab: Apply Pagination and Date Filtering
                query = query.eq('process_status', 'DONE').order('completed_at', { ascending: false });

                if (filters.startDate) query = query.gte('completed_at', filters.startDate);
                if (filters.endDate) query = query.lte('completed_at', `${filters.endDate}T23:59:59`);

                const from = (filters.page - 1) * filters.pageSize;
                const to = from + filters.pageSize - 1;
                query = query.range(from, to);
            }

            if (activeTab !== 'ALL') {
                query = query.eq('production_type', activeTab);
            }

            const { data, error, count } = await query;
            if (error) {
                console.error(error);
                setItems([]);
                setTotalCount(0);
            } else {
                // Filter out shipped items (if shipment_items exists and length > 0)
                const filteredData = (data || []).filter((i: any) => !i.shipment_items || i.shipment_items.length === 0);
                setItems(filteredData);
                setTotalCount(count || 0);
                setSelectedItemIds(new Set());
            }
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const openCompleteModal = (itemsToComplete?: any[]) => {
        const targets = itemsToComplete || items.filter(i => selectedItemIds.has(i.id));
        if (targets.length === 0) return alert('완료 처리할 품목을 선택해주세요.');

        setCompletionTargets(targets);
        setIsCompleteModalOpen(true);
    };

    const handleConfirmComplete = async (note: string) => {
        const ids = completionTargets.map(i => i.id);
        const { error } = await supabase
            .from('order_items')
            .update({
                process_status: 'DONE',
                production_note: note,
                completed_at: new Date().toISOString()
            })
            .in('id', ids);

        if (error) {
            alert('오류 발생: ' + error.message);
        } else {
            alert('완료 처리되었습니다.');
            setIsCompleteModalOpen(false);
            setCompletionTargets([]);
            fetchItems();
        }
    };

    const handleUndoComplete = async (itemId?: string) => {
        // If itemId provided, undo single. Else undo selected.
        let targets = [];
        if (itemId) {
            const item = items.find(i => i.id === itemId);
            if (item) targets = [item];
        } else {
            targets = items.filter(i => selectedItemIds.has(i.id));
        }

        if (targets.length === 0) return alert('취소할 품목을 선택해주세요.');

        if (!confirm(`선택한 ${targets.length}개 항목의 완료 처리를 취소하시겠습니까?\n상태가 [진행 중]으로 변경됩니다.`)) return;

        const ids = targets.map(i => i.id);
        const { error } = await supabase
            .from('order_items')
            .update({
                process_status: 'PROCESSING',
                completed_at: null,
                production_note: null
            })
            .in('id', ids);

        if (error) {
            alert('오류: ' + error.message);
        } else {
            alert('완료 처리가 취소되었습니다.');
            setSelectedItemIds(new Set());
            fetchItems();
        }
    };

    const handleStartWork = async (itemId?: string) => {
        let ids: string[] = [];
        if (itemId) {
            ids = [itemId];
        } else {
            ids = Array.from(selectedItemIds);
        }

        if (ids.length === 0) return alert('작업을 시작할 품목을 선택해주세요.');
        if (!confirm(`${ids.length}개 품목의 작업을 시작하시겠습니까?`)) return;

        const { error } = await supabase
            .from('order_items')
            .update({ process_status: 'PROCESSING' })
            .in('id', ids);

        if (error) {
            alert('오류: ' + error.message);
            return;
        }

        // Parent Order Update Logic (Check if needed)
        // Find distinct orders for these items
        const targetItems = items.filter(i => ids.includes(i.id));
        const orderIds = Array.from(new Set(targetItems.map(i => i.orders.id)));

        for (const orderId of orderIds) {
            await supabase
                .from('orders')
                .update({ status: 'PRODUCTION' })
                .eq('id', orderId)
                .eq('status', 'ORDERED');
        }

        alert('작업이 시작되었습니다.');
        fetchItems();
    };

    // Wrapper for batch complete
    const handleBatchComplete = () => {
        openCompleteModal();
    };

    // Wrapper for single complete
    const handleComplete = (itemId: string, _date: string, _note: string) => {
        // Note: The ProductionItemRow might call this with empty date/note to trigger the modal, 
        // or if we wanted inline completion we would use date/note.
        // For consistency with existing logic, let's just open the modal for this single item.
        const item = items.find(i => i.id === itemId);
        if (item) openCompleteModal([item]);
    };

    const toggleSelection = (id: string) => {
        const next = new Set(selectedItemIds);
        if (next.has(id)) next.delete(id); else next.add(id);
        setSelectedItemIds(next);
    };

    const toggleAll = () => {
        if (selectedItemIds.size === items.length) setSelectedItemIds(new Set());
        else setSelectedItemIds(new Set(items.map(i => i.id)));
    };

    const filteredItems = items.filter(i => {
        if (!keyword) return true;
        const searchTarget = `${i.part_no} ${i.part_name} ${i.orders?.po_no} ${i.orders?.clients?.name}`.toLowerCase();
        return searchTarget.includes(keyword.toLowerCase());
    });

    return (
        <div className="h-full flex flex-col bg-slate-50 relative">
            <div className="flex-1 overflow-y-auto p-4 md:p-8 space-y-6">
                <PageHeader
                    title="🏭 생산 관리 (Production Management)"
                    description="사내 가공 및 외주 가공 현황을 관리하고 완료 처리합니다."
                />

                <Section>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Status Tabs */}
                        <Card className="glass flex items-center p-1" noPadding>
                            <div className="flex flex-1 gap-1">
                                {[
                                    { key: 'ACTIVE', label: '🔥 대기 (Waiting)' },
                                    { key: 'PROCESSING', label: '🚧 진행 (Processing)' },
                                    { key: 'DONE', label: '✅ 완료 (Done)' },
                                ].map(tab => (
                                    <button
                                        key={tab.key}
                                        onClick={() => {
                                            setViewStatus(tab.key as any);
                                            setFilters({ ...filters, page: 1 });
                                        }}
                                        className={`flex-1 py-2.5 text-sm font-bold rounded-xl transition-all duration-200 ${viewStatus === tab.key
                                            ? 'bg-white text-slate-800 shadow-sm ring-1 ring-black/5'
                                            : 'text-slate-500 hover:bg-white/50 hover:text-slate-700'
                                            }`}
                                    >
                                        {tab.label}
                                    </button>
                                ))}
                            </div>
                        </Card>

                        {/* Location Tabs */}
                        <Card className="glass flex items-center p-1" noPadding>
                            <div className="flex flex-1 gap-1">
                                {[
                                    { key: 'INHOUSE', label: '🏭 사내 (In-house)' },
                                    { key: 'OUTSOURCE', label: '🚚 외주 (Outsource)' },
                                    { key: 'ALL', label: '전체 (All)' },
                                ].map(tab => (
                                    <button
                                        key={tab.key}
                                        onClick={() => setActiveTab(tab.key as any)}
                                        className={`flex-1 py-2.5 text-sm font-bold rounded-xl transition-all duration-200 ${activeTab === tab.key
                                            ? 'bg-indigo-600 text-white shadow-glow'
                                            : 'text-slate-500 hover:bg-white/50 hover:text-indigo-600'
                                            }`}
                                    >
                                        {tab.label}
                                    </button>
                                ))}
                            </div>
                        </Card>
                    </div>
                </Section>

                {/* Search Bar */}
                <Section>
                    <div className="flex flex-col md:flex-row gap-4">
                        <input
                            type="text"
                            placeholder="검색 (PO, 품번, 업체명)..."
                            value={keyword}
                            onChange={(e) => setKeyword(e.target.value)}
                            className="flex-1 border border-slate-200 p-3 rounded-xl shadow-sm outline-none focus:ring-2 focus:ring-brand-200"
                        />
                        {viewStatus === 'DONE' && (
                            <div className="flex items-center gap-2 bg-white p-2 border border-slate-200 rounded-xl shadow-sm">
                                <span className="text-xs font-bold text-slate-500 ml-2">완료일:</span>
                                <input type="date" className="border-0 p-1 text-sm outline-none text-slate-600" value={filters.startDate} onChange={e => setFilters({ ...filters, startDate: e.target.value, page: 1 })} />
                                <span className="text-slate-400">~</span>
                                <input type="date" className="border-0 p-1 text-sm outline-none text-slate-600" value={filters.endDate} onChange={e => setFilters({ ...filters, endDate: e.target.value, page: 1 })} />
                            </div>
                        )}
                    </div>
                </Section>

                <Section
                    title={`생산 목록 (${filteredItems.length}건)`}
                    rightElement={
                        <div className="flex gap-2">
                            {viewStatus === 'DONE' && (
                                <Button
                                    onClick={() => handleUndoComplete()}
                                    variant="warning"
                                    disabled={selectedItemIds.size === 0}
                                    className="shadow-sm"
                                >
                                    ↩️ 완료 취소 ({selectedItemIds.size})
                                </Button>
                            )}
                            {(viewStatus === 'ACTIVE' || viewStatus === 'PROCESSING') && (
                                <>
                                    {viewStatus === 'ACTIVE' && (
                                        <Button
                                            onClick={() => handleStartWork()}
                                            variant="glass"
                                            className="text-indigo-700 bg-indigo-50 border-indigo-200 hover:bg-indigo-100"
                                            disabled={selectedItemIds.size === 0}
                                        >
                                            ▶️ 작업 시작 ({selectedItemIds.size})
                                        </Button>
                                    )}
                                    <Button
                                        onClick={handleBatchComplete}
                                        variant="primary"
                                        disabled={selectedItemIds.size === 0}
                                        className="shadow-glow"
                                    >
                                        ✅ 완료 처리 ({selectedItemIds.size})
                                    </Button>
                                </>
                            )}
                        </div>
                    }
                >
                    <Card noPadding className="border-0 shadow-soft overflow-hidden rounded-2xl min-h-[500px]">
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-slate-100">
                                <thead className="bg-slate-50/80 backend-blur">
                                    <tr>
                                        <th className="px-4 py-4 w-[40px] text-center">
                                            <input type="checkbox" onChange={toggleAll} checked={items.length > 0 && selectedItemIds.size === items.length} className="w-5 h-5 rounded text-brand-600 focus:ring-brand-500 border-slate-300 transition-all" />
                                        </th>
                                        <th className="px-5 py-4 text-left text-xs font-black text-slate-500 uppercase tracking-wider w-[120px]">상태</th>
                                        <th className="px-5 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider w-[180px]">업체 / PO</th>
                                        <th className="px-5 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">품목 정보 (Item Info)</th>
                                        <th className="px-5 py-4 text-center text-xs font-bold text-slate-500 uppercase tracking-wider w-[120px]">공정</th>
                                        <th className="px-5 py-4 text-center text-xs font-bold text-slate-500 uppercase tracking-wider w-[100px]">수량</th>
                                        <th className="px-5 py-4 text-center text-xs font-bold text-slate-500 uppercase tracking-wider w-[120px]">
                                            {viewStatus === 'DONE' ? '완료일' : '납기일'}
                                        </th>
                                        <th className="px-5 py-4 text-center text-xs font-bold text-slate-500 uppercase tracking-wider w-[100px]">도면/첨부</th>
                                        <th className="px-5 py-4 text-center text-xs font-bold text-slate-500 uppercase tracking-wider w-[100px]">관리</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-slate-50">
                                    {loading ? (
                                        <tr><td colSpan={9} className="text-center py-32 text-slate-400 animate-pulse">데이터를 불러오는 중입니다...</td></tr>
                                    ) : filteredItems.length === 0 ? (
                                        <tr><td colSpan={9} className="text-center py-32 text-slate-400">데이터가 없습니다.</td></tr>
                                    ) : (
                                        filteredItems.map((item) => (
                                            <ProductionItemRow
                                                key={item.id}
                                                item={item}
                                                viewStatus={viewStatus}
                                                isSelected={selectedItemIds.has(item.id)}
                                                onToggleSelection={() => toggleSelection(item.id)}
                                                onStart={() => handleStartWork(item.id)}
                                                onComplete={(date, note) => handleComplete(item.id, date, note)}
                                                onNavigate={onNavigate}
                                                onUndo={() => handleUndoComplete(item.id)}
                                                onPreviewFile={openFile}
                                            />
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>

                        {viewStatus === 'DONE' && totalCount > filters.pageSize && (
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

            {/* Production Complete Modal */}
            <ProductionCompleteModal
                isOpen={isCompleteModalOpen}
                onClose={() => setIsCompleteModalOpen(false)}
                onConfirm={handleConfirmComplete}
                itemCount={completionTargets.length}
            />
        </div>
    );
}

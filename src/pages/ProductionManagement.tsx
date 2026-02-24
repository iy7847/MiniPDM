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
import { useAppToast } from '../contexts/ToastContext';
import { OrderItem } from '../types/order';
import { usePreservedState } from '../hooks/usePreservedState';
import { TabFilter } from '../components/common/ui/TabFilter';
import { exportMaterialOrder } from '../utils/exportMaterialOrder';

export interface ExtendedProductionItem extends Omit<OrderItem, 'estimate_items'> {
    orders: {
        id: string;
        po_no: string;
        delivery_date: string;
        client_id: string;
        clients: { name: string };
        company_id: string;
    };
    estimate_items: {
        id: string;
        shape?: 'rect' | 'round';
        raw_w?: number;
        raw_d?: number;
        raw_h?: number;
        materials: { name: string; code: string } | null;
        post_processings: { name: string } | null;
        heat_treatments: { name: string } | null;
    } | null;
    shipment_items: { id: string }[];
    files: {
        id: string;
        file_name: string;
        file_path: string;
        file_type?: string;
    }[];
}

interface ProductionManagementProps {
    onNavigate: (page: string, id?: string | null) => void;
}

export function ProductionManagement({ onNavigate }: ProductionManagementProps) {
    const { profile } = useProfile();
    const toast = useAppToast();
    const [items, setItems] = useState<ExtendedProductionItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedItemIds, setSelectedItemIds] = useState<Set<string>>(new Set());
    const [companyRootPath, setCompanyRootPath] = useState('');

    // 파일 핸들러
    const { openFile } = useFileHandler(companyRootPath);

    useEffect(() => {
        const path = localStorage.getItem('company_root_path');
        if (path) setCompanyRootPath(path);
    }, []);

    // 필터 상태
    const [activeTab, setActiveTab] = usePreservedState<'ALL' | 'INHOUSE' | 'OUTSOURCE'>('production_activeTab', 'ALL');
    const [viewStatus, setViewStatus] = usePreservedState<'ALL' | 'ACTIVE' | 'PROCESSING' | 'DONE'>('production_viewStatus', 'ACTIVE');
    const [filters, setFilters] = usePreservedState('production_filters', {
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
    const [keyword, setKeyword] = usePreservedState('production_keyword', '');

    // 모달 상태
    const [isCompleteModalOpen, setIsCompleteModalOpen] = useState(false);
    const [completionTargets, setCompletionTargets] = useState<ExtendedProductionItem[]>([]);

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
                         shape,
                         raw_w,
                         raw_d,
                         raw_h,
                         materials (name, code),
                         post_processings (name),
                         heat_treatments (name)
                    ),
                    shipment_items (id),
                    files (*)
                `, { count: 'exact' })
                .eq('orders.company_id', profile.company_id);

            if (viewStatus === 'ACTIVE') {
                query = query.eq('process_status', 'WAITING').order('orders(delivery_date)', { ascending: true });
                if (filters.startDate) query = query.gte('orders.delivery_date', filters.startDate);
                // 진행 중이거나 예정된 작업의 경우, 미래 주문이 표시되도록 기본적으로 종료 날짜를 제한하지 않음.
                // 사용자가 기본값 "오늘"이 아닌 다른 값으로 수동 변경한 경우에만 적용.
                const today = new Date().toISOString().split('T')[0];
                if (filters.endDate && filters.endDate !== today) {
                    query = query.lte('orders.delivery_date', filters.endDate);
                }
            } else if (viewStatus === 'PROCESSING') {
                query = query.eq('process_status', 'PROCESSING').order('orders(delivery_date)', { ascending: true });
                if (filters.startDate) query = query.gte('orders.delivery_date', filters.startDate);

                const today = new Date().toISOString().split('T')[0];
                if (filters.endDate && filters.endDate !== today) {
                    query = query.lte('orders.delivery_date', filters.endDate);
                }
            } else if (viewStatus === 'DONE') {
                // 완료(DONE) 탭: 페이지네이션 및 날짜 필터링 적용
                query = query.eq('process_status', 'DONE').order('completed_at', { ascending: false });

                if (filters.startDate) query = query.gte('completed_at', filters.startDate);
                if (filters.endDate) query = query.lte('completed_at', `${filters.endDate}T23:59:59`);

                const from = (filters.page - 1) * filters.pageSize;
                const to = from + filters.pageSize - 1;
                query = query.range(from, to);
            } else {
                // 전체(ALL) 탭: 페이지네이션과 함께 모든 항목 표시
                query = query.order('orders(delivery_date)', { ascending: true });
                if (filters.startDate) query = query.gte('orders.delivery_date', filters.startDate);

                const today = new Date().toISOString().split('T')[0];
                if (filters.endDate && filters.endDate !== today) {
                    query = query.lte('orders.delivery_date', filters.endDate);
                }

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
                // 출하된 항목 제외 (shipment_items가 존재하고 길이가 0보다 큰 경우)
                const filteredData = ((data as unknown as ExtendedProductionItem[]) || []).filter((i) => !i.shipment_items || i.shipment_items.length === 0);
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

    const openCompleteModal = (itemsToComplete?: ExtendedProductionItem[]) => {
        const targets = itemsToComplete || items.filter(i => selectedItemIds.has(i.id));
        if (targets.length === 0) { toast.warning('완료 처리할 품목을 선택해주세요.'); return; }

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
            toast.error('오류 발생: ' + error.message);
        } else {
            toast.success('완료 처리되었습니다.');
            setIsCompleteModalOpen(false);
            setCompletionTargets([]);
            fetchItems();
        }
    };

    const handleUndoComplete = async (itemId?: string) => {
        // itemId가 제공되면 단일 항목 취소, 아니면 선택된 모든 항목 취소.
        let targets: ExtendedProductionItem[] = [];
        if (itemId) {
            const item = items.find(i => i.id === itemId);
            if (item) targets = [item];
        } else {
            targets = items.filter(i => selectedItemIds.has(i.id));
        }

        if (targets.length === 0) { toast.warning('취소할 품목을 선택해주세요.'); return; }

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
            toast.error('오류: ' + error.message);
        } else {
            toast.success('완료 처리가 취소되었습니다.');
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

        if (ids.length === 0) { toast.warning('작업을 시작할 품목을 선택해주세요.'); return; }
        if (!confirm(`${ids.length}개 품목의 작업을 시작하시겠습니까?`)) return;

        const { error } = await supabase
            .from('order_items')
            .update({ process_status: 'PROCESSING' })
            .in('id', ids);

        if (error) {
            toast.error('오류: ' + error.message);
            return;
        }

        // 상위 주문 상태 업데이트 로직 (필용 여부 확인)
        // 이 품목들이 속한 고유 주문 ID 추출
        const targetItems = items.filter(i => ids.includes(i.id));
        const orderIds = Array.from(new Set(targetItems.map(i => i.orders.id)));

        for (const orderId of orderIds) {
            await supabase
                .from('orders')
                .update({ status: 'PRODUCTION' })
                .eq('id', orderId)
                .eq('status', 'ORDERED');
        }

        toast.success('작업이 시작되었습니다.');
        fetchItems();
    };

    // 일괄 완료 처리를 위한 래퍼 함수
    const handleBatchComplete = () => {
        openCompleteModal();
    };

    // 단일 완료 처리를 위한 래퍼 함수
    const handleComplete = (itemId: string, _date: string, _note: string) => {
        // 참고: ProductionItemRow에서 모달을 띄우기 위해 빈 날짜/메모로 호출할 수 있음
        // 기존 로직과의 일관성을 위해 단일 품목에 대해서도 모달을 엶
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
        const searchTarget = `${i.part_no} ${i.part_name} ${i.orders?.clients?.name}`.toLowerCase();
        return searchTarget.includes(keyword.toLowerCase());
    });

    const handleExportMaterialOrder = () => {
        const targetItems = items.filter(i => selectedItemIds.has(i.id));
        if (targetItems.length === 0) {
            toast.warning('소재 발주서를 작성할 품목을 선택해주세요.');
            return;
        }
        exportMaterialOrder(targetItems).then(() => {
            toast.success('소재 발주서가 다운로드 되었습니다.');
        }).catch(err => {
            console.error(err);
            toast.error('소재 발주서 생성 중 오류가 발생했습니다.');
        });
    };

    return (
        <div className="h-full flex flex-col bg-slate-50 relative">
            <div className="flex-1 overflow-y-auto p-4 md:p-8 space-y-6">
                <PageHeader
                    title="🏭 생산 관리"
                    description="사내 가공 및 외주 가공 현황을 관리하고 완료 처리합니다."
                />

                <Section>
                    <Card className="p-4">
                        <div className="flex flex-col gap-4">
                            <div className="w-full">
                                <TabFilter
                                    options={[
                                        { label: '🔥 대기', value: 'ACTIVE' },
                                        { label: '🚧 진행', value: 'PROCESSING' },
                                        { label: '✅ 완료', value: 'DONE' },
                                        { label: '📊 전체', value: 'ALL' },
                                    ]}
                                    value={viewStatus}
                                    onChange={(val) => {
                                        setViewStatus(val as 'ALL' | 'ACTIVE' | 'PROCESSING' | 'DONE');
                                        setFilters({ ...filters, page: 1 });
                                    }}
                                />
                            </div>
                            <div className="flex flex-col md:flex-row gap-4 justify-between items-center">
                                <div className="flex flex-col md:flex-row gap-4 w-full md:w-auto flex-1">
                                    <select
                                        className="border border-slate-200 p-2.5 rounded-xl text-sm outline-none focus:ring-2 focus:ring-brand-200 bg-slate-50 hover:bg-white transition-colors"
                                        value={activeTab}
                                        onChange={(e) => setActiveTab(e.target.value as 'ALL' | 'INHOUSE' | 'OUTSOURCE')}
                                    >
                                        <option value="ALL">전체 (사내/외주)</option>
                                        <option value="INHOUSE">🏭 사내</option>
                                        <option value="OUTSOURCE">🚚 외주</option>
                                    </select>
                                    <input
                                        type="text"
                                        placeholder="검색 (품번, 업체명)..."
                                        value={keyword}
                                        onChange={(e) => setKeyword(e.target.value)}
                                        className="w-full border border-slate-200 p-2.5 rounded-xl text-sm outline-none focus:ring-2 focus:ring-brand-200 bg-slate-50 hover:bg-white transition-all placeholder:text-slate-400"
                                    />
                                </div>
                                <div className="flex items-center gap-2 w-full md:w-auto justify-end">
                                    <input type="date" className="border border-slate-200 p-2.5 rounded-xl text-sm outline-none focus:ring-2 focus:ring-brand-200 text-slate-600 bg-slate-50" value={filters.startDate} onChange={e => setFilters({ ...filters, startDate: e.target.value, page: 1 })} />
                                    <span className="text-slate-400 font-bold">~</span>
                                    <input type="date" className="border border-slate-200 p-2.5 rounded-xl text-sm outline-none focus:ring-2 focus:ring-brand-200 text-slate-600 bg-slate-50" value={filters.endDate} onChange={e => setFilters({ ...filters, endDate: e.target.value, page: 1 })} />
                                </div>
                            </div>
                        </div>
                    </Card>
                </Section>

                <Section
                    title={`생산 목록 (${filteredItems.length}건)`}
                    rightElement={
                        <div className="flex gap-2">
                            <Button
                                onClick={handleExportMaterialOrder}
                                variant="glass"
                                className={`text-emerald-700 bg-emerald-50 border-emerald-200 hover:bg-emerald-100 ${selectedItemIds.size > 0 ? '' : 'opacity-50'}`}
                            >
                                📋 소재 발주서 작성 ({selectedItemIds.size})
                            </Button>
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
                                        <th className="px-5 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">품목 정보</th>
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

                        {(viewStatus === 'DONE' || viewStatus === 'ALL') && totalCount > filters.pageSize && (
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

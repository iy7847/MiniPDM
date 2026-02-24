import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { PageHeader } from '../components/common/ui/PageHeader';
import { Card } from '../components/common/ui/Card';
import { EstimateItem, AttachedFile, Material, PostProcessing, HeatTreatment } from '../types/estimate';
import { useProfile } from '../hooks/useProfile';
import { useFileHandler } from '../hooks/useFileHandler';
import { EstimateItemModal } from '../components/estimate/EstimateItemModal';
import { TabFilter } from '../components/common/ui/TabFilter';
import { useAppToast } from '../contexts/ToastContext';
import { usePreservedState } from '../hooks/usePreservedState';
type SearchResultItem = EstimateItem & {
    estimate?: {
        id: string;
        project_name: string;
        created_at: string;
        status: string;
        company_id: string;
        currency: string;
        exchange_rate: number;
    };
    files?: AttachedFile[];
    material?: {
        code: string;
        name: string;
    };
};

function StatusBadge({ status }: { status: string }) {
    const config: Record<string, { label: string, classes: string }> = {
        'DRAFT': { label: '📝 작성중', classes: 'bg-slate-100 text-slate-600' },
        'SENT': { label: '✅ 제출완료', classes: 'bg-green-100 text-green-700' },
        'ORDERED': { label: '🚀 수주확정', classes: 'bg-indigo-100 text-indigo-700' },
    };

    const { label, classes } = config[status] || { label: status, classes: 'bg-slate-100 text-slate-600' };

    return (
        <span className={`px-2 py-0.5 text-[10px] md:text-xs font-bold rounded-full ${classes} whitespace-nowrap`}>
            {label}
        </span>
    );
}

export function EstimateSearch({ onNavigate }: { onNavigate: (page: string, id?: string | null) => void }) {
    const { profile } = useProfile();
    const toast = useAppToast();
    const [_loading, setLoading] = useState(false);
    const [results, setResults] = useState<SearchResultItem[]>([]);

    // File System
    const [companyRootPath, setCompanyRootPath] = useState('');
    const { openFile } = useFileHandler(companyRootPath);

    // Common Data for Modal
    const [materials, setMaterials] = useState<Material[]>([]);
    const [postProcessings, setPostProcessings] = useState<PostProcessing[]>([]);
    const [heatTreatments, setHeatTreatments] = useState<HeatTreatment[]>([]);

    // Modal State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedItem, setSelectedItem] = useState<SearchResultItem | null>(null);

    // Search Criteria
    const [keyword, setKeyword] = usePreservedState('estimate_search_keyword', ''); // Part Name / No
    const [noteKeyword, setNoteKeyword] = usePreservedState('estimate_search_noteKeyword', ''); // Note
    const [statusFilter, setStatusFilter] = usePreservedState('estimate_search_statusFilter', 'ALL'); // Status

    const [sizeW, setSizeW] = usePreservedState<string>('estimate_search_sizeW', '');
    const [sizeD, setSizeD] = usePreservedState<string>('estimate_search_sizeD', '');
    const [sizeH, setSizeH] = usePreservedState<string>('estimate_search_sizeH', '');
    const [tolerance, setTolerance] = usePreservedState<number>('estimate_search_tolerance', 0);

    useEffect(() => {
        if (profile?.company_id) {
            // 1. Fetch Company Root Path
            supabase.from('companies').select('root_path').eq('id', profile.company_id).single()
                .then(({ data }) => {
                    if (data?.root_path) setCompanyRootPath(data.root_path);
                });

            // 2. Fetch Common Data (Materials, etc.)
            Promise.all([
                supabase.from('materials').select('*').eq('company_id', profile.company_id),
                supabase.from('post_processings').select('*').eq('company_id', profile.company_id),
                supabase.from('heat_treatments').select('*').eq('company_id', profile.company_id)
            ]).then(([resMat, resPost, resHeat]) => {
                if (resMat.data) setMaterials(resMat.data);
                if (resPost.data) setPostProcessings(resPost.data);
                if (resHeat.data) setHeatTreatments(resHeat.data);
            });
        }
    }, [profile]);

    const handleSearch = async () => {
        if (!profile?.company_id) return;

        setLoading(true);
        try {
            // [Security Fix] Filter by company_id via inner join
            let query = supabase
                .from('estimate_items')
                .select(`
          *,
          estimate:estimates!inner (
            id,
            project_name,
            created_at,
            status,
            company_id,
            currency,
            exchange_rate
          ),
          material:materials (
            name,
            code
          ),
          files (*)
        `)
                .eq('estimate.company_id', profile.company_id) // My Company Only
                .order('created_at', { ascending: false })
                .limit(100);

            // Status Filter
            if (statusFilter !== 'ALL') {
                query = query.eq('estimate.status', statusFilter);
            }

            // 1. Keyword (Name/No)
            if (keyword.trim()) {
                query = query.or(`part_name.ilike.%${keyword.trim()}%,part_no.ilike.%${keyword.trim()}%`);
            }

            // 3. Note
            if (noteKeyword.trim()) {
                query = query.ilike('note', `%${noteKeyword.trim()}%`);
            }

            // 2. Size (Approximate)
            const ratio = tolerance / 100;

            if (sizeW) {
                const w = parseFloat(sizeW);
                if (!isNaN(w)) {
                    const min = w * (1 - ratio);
                    const max = w * (1 + ratio);
                    query = query.gte('spec_w', min).lte('spec_w', max);
                }
            }
            if (sizeD) {
                const d = parseFloat(sizeD);
                if (!isNaN(d)) {
                    const min = d * (1 - ratio);
                    const max = d * (1 + ratio);
                    query = query.gte('spec_d', min).lte('spec_d', max);
                }
            }
            if (sizeH) {
                const h = parseFloat(sizeH);
                if (!isNaN(h)) {
                    const min = h * (1 - ratio);
                    const max = h * (1 + ratio);
                    query = query.gte('spec_h', min).lte('spec_h', max);
                }
            }

            const { data, error } = await query;

            if (error) throw error;
            setResults(data || []);

        } catch (error) {
            console.error('Search error:', error);
            toast.error('검색 중 오류가 발생했습니다.');
        } finally {
            setLoading(false);
        }
    };

    const handleClear = () => {
        setKeyword('');
        setNoteKeyword('');
        setStatusFilter('ALL');
        setSizeW('');
        setSizeD('');
        setSizeH('');
        setTolerance(0);
        setResults([]);
    };

    const handleFileClick = async (e: React.MouseEvent, filePath: string) => {
        e.stopPropagation();
        if (!companyRootPath) {
            toast.warning('회사 경로 설정이 로드되지 않았습니다.');
            return;
        }
        const result = await openFile(filePath);
        if (!result?.success) {
            toast.error('파일을 열 수 없습니다: ' + (result?.error || '알 수 없는 오류'));
        }
    };

    const handleRowClick = (item: SearchResultItem) => {
        setSelectedItem(item);
        setIsModalOpen(true);
    };

    return (
        <div className="h-full flex flex-col bg-slate-50">
            <div className="flex-1 overflow-y-auto p-4 md:p-8 space-y-6">
                <PageHeader title="🔍 견적 이력 검색 (Items Search)" />

                {/* Compact Search Filter Card */}
                <Card className="p-3 bg-white shadow-sm border border-slate-200">
                    <div className="flex flex-col gap-3">
                        {/* Row 1: Status Tabs */}
                        <div>
                            <TabFilter
                                options={[
                                    { label: '📝 작성중', value: 'DRAFT' },
                                    { label: '✅ 제출완료', value: 'SENT' },
                                    { label: '🚀 수주확정', value: 'ORDERED' },
                                    { label: '전체상태', value: 'ALL' },
                                ]}
                                value={statusFilter}
                                onChange={(val) => setStatusFilter(val)}
                            />
                        </div>

                        {/* Row 2: Keywords & Actions */}
                        <div className="flex flex-wrap items-center gap-2">
                            {/* Keywords */}
                            <div className="flex-1 min-w-[200px]">
                                <input
                                    type="text"
                                    value={keyword}
                                    onChange={(e) => setKeyword(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                                    className="w-full border p-1.5 rounded text-xs focus:ring-2 focus:ring-blue-500 outline-none"
                                    placeholder="품명 / 도번 검색..."
                                />
                            </div>
                            <div className="flex-1 min-w-[150px]">
                                <input
                                    type="text"
                                    value={noteKeyword}
                                    onChange={(e) => setNoteKeyword(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                                    className="w-full border p-1.5 rounded text-xs focus:ring-2 focus:ring-blue-500 outline-none"
                                    placeholder="비고 내용 검색..."
                                />
                            </div>

                            {/* Buttons */}
                            <div className="flex items-center gap-1 shrink-0 ml-auto">
                                <button
                                    onClick={handleSearch}
                                    className="px-3 py-1.5 bg-blue-600 text-white rounded hover:bg-blue-700 text-xs font-bold flex items-center gap-1"
                                >
                                    🔍 검색
                                </button>
                                <button
                                    onClick={handleClear}
                                    className="px-3 py-1.5 text-slate-500 bg-white border border-slate-300 rounded hover:bg-slate-50 text-xs font-bold"
                                >
                                    초기화
                                </button>
                            </div>
                        </div>

                        {/* Row 2: Compact Size Search */}
                        <div className="flex flex-wrap items-center gap-2 text-xs bg-slate-50 p-2 rounded border border-slate-100">
                            <span className="font-bold text-slate-600 mr-2">📏 규격 검색:</span>

                            <div className="flex items-center gap-1 bg-white border rounded px-2 py-0.5">
                                <span className="text-blue-600 font-bold">오차범위 ±</span>
                                <input
                                    type="number"
                                    value={tolerance}
                                    onChange={(e) => setTolerance(parseFloat(e.target.value))}
                                    className="w-8 text-right font-bold outline-none"
                                    min="0" max="100"
                                />
                                <span className="text-slate-400">%</span>
                            </div>

                            <div className="h-4 w-px bg-slate-300 mx-1"></div>

                            <div className="flex items-center gap-1">
                                <span className="text-slate-500">W</span>
                                <input
                                    type="number"
                                    value={sizeW}
                                    onChange={(e) => setSizeW(e.target.value)}
                                    className="w-16 border rounded p-1 text-right bg-white"
                                    placeholder="mm"
                                />
                            </div>
                            <div className="flex items-center gap-1">
                                <span className="text-slate-500">D</span>
                                <input
                                    type="number"
                                    value={sizeD}
                                    onChange={(e) => setSizeD(e.target.value)}
                                    className="w-16 border rounded p-1 text-right bg-white"
                                    placeholder="mm"
                                />
                            </div>
                            <div className="flex items-center gap-1">
                                <span className="text-slate-500">H</span>
                                <input
                                    type="number"
                                    value={sizeH}
                                    onChange={(e) => setSizeH(e.target.value)}
                                    className="w-16 border rounded p-1 text-right bg-white"
                                    placeholder="mm"
                                />
                            </div>
                        </div>
                    </div>
                </Card>

                {/* Results */}
                <div className="bg-white rounded border border-slate-200 shadow-sm overflow-hidden">
                    <div className="p-3 bg-slate-50 border-b flex justify-between items-center">
                        <h3 className="font-bold text-slate-700">검색 결과 ({results.length}건)</h3>
                        <span className="text-xs text-slate-400">최근 100건 표시</span>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-slate-200">
                            <thead className="bg-slate-50 text-xs font-bold text-slate-500 uppercase">
                                <tr>
                                    <th className="px-3 py-3 text-left w-24">상태</th>
                                    <th className="px-3 py-3 text-left">일자/프로젝트</th>
                                    <th className="px-3 py-3 text-left">도번/품명</th>
                                    <th className="px-3 py-3 text-left">규격 (mm)</th>
                                    <th className="px-3 py-3 text-center">재질</th>
                                    <th className="px-3 py-3 text-right">수량</th>
                                    <th className="px-3 py-3 text-right">단가 (₩)</th>
                                    <th className="px-3 py-3 text-left">첨부파일</th>
                                    <th className="px-3 py-3 text-left">비고</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-200">
                                {results.length === 0 ? (
                                    <tr><td colSpan={9} className="p-8 text-center text-slate-400 text-sm">검색 결과가 없습니다.</td></tr>
                                ) : (
                                    results.map((item) => (
                                        <tr
                                            key={item.id}
                                            onClick={() => handleRowClick(item)}
                                            className="hover:bg-blue-50 transition-colors cursor-pointer"
                                        >
                                            <td className="px-3 py-3">
                                                <StatusBadge status={item.estimate?.status || 'DRAFT'} />
                                            </td>
                                            <td className="px-3 py-3 text-xs text-slate-600">
                                                <div className="font-bold">{item.estimate?.created_at?.substring(0, 10)}</div>
                                                <div
                                                    className="truncate max-w-[120px] hover:text-blue-600 hover:underline cursor-pointer"
                                                    title="견적서 이동"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        onNavigate('estimate-detail', item.estimate?.id);
                                                    }}
                                                >
                                                    {item.estimate?.project_name}
                                                </div>
                                            </td>
                                            <td className="px-3 py-3 text-sm">
                                                <div className="font-bold text-slate-800">{item.part_no || '-'}</div>
                                                <div className="text-xs text-slate-500">{item.part_name}</div>
                                            </td>
                                            <td className="px-3 py-3 text-xs text-slate-600">
                                                {item.shape === 'round'
                                                    ? `⌀${item.spec_w} x ${item.spec_d}L`
                                                    : `${item.spec_w} x ${item.spec_d} x ${item.spec_h}t`
                                                }
                                            </td>
                                            <td className="px-3 py-3 text-center text-xs">
                                                {/* @ts-ignore */}
                                                {item.material?.code || '-'}
                                            </td>
                                            <td className="px-3 py-3 text-right text-xs font-bold">{item.qty}</td>
                                            <td className="px-3 py-3 text-right text-xs">₩ {item.unit_price.toLocaleString()}</td>
                                            <td className="px-3 py-3 text-xs">
                                                {item.files && item.files.length > 0 ? (
                                                    <div className="flex flex-wrap gap-1">
                                                        {item.files.map(file => (
                                                            <button
                                                                key={file.id}
                                                                onClick={(e) => handleFileClick(e, file.file_path)}
                                                                className="px-2 py-0.5 bg-slate-100 border rounded text-[10px] hover:bg-blue-100 hover:text-blue-700 flex items-center gap-1"
                                                                title={file.file_name}
                                                            >
                                                                📎 {file.file_name}
                                                            </button>
                                                        ))}
                                                    </div>
                                                ) : <span className="text-slate-300">-</span>}
                                            </td>
                                            <td className="px-3 py-3 text-xs text-slate-500 max-w-[150px] truncate" title={item.note}>
                                                {item.note || '-'}
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Detail Modal */}
                {selectedItem && (
                    <EstimateItemModal
                        isOpen={isModalOpen}
                        onClose={() => setIsModalOpen(false)}
                        estimateId={selectedItem.estimate?.id || null}
                        editingItem={selectedItem}
                        materials={materials}
                        postProcessings={postProcessings}
                        heatTreatments={heatTreatments}
                        currency={selectedItem.estimate?.currency || 'KRW'}
                        exchangeRate={selectedItem.estimate?.exchange_rate || 1.0}
                        discountPolicy={{}} // Not really needed for view
                        defaultHourlyRate={50000}
                        onSaveSuccess={() => { }} // Read only
                        onSaveFiles={async () => { }} // Read only
                        onDeleteExistingFile={async () => { }} // Read only
                        onOpenFile={async (path) => {
                            if (!companyRootPath) return;
                            openFile(path);
                        }}
                    />
                )}
            </div>
        </div>
    );
}

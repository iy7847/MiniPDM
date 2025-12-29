import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { PageLayout } from '../components/common/PageLayout';
import { EstimateDetail } from './EstimateDetail';

export function Estimates({ onNavigate }: { onNavigate?: (page: string) => void }) {
  const [viewMode, setViewMode] = useState<'list' | 'detail'>('list');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [estimates, setEstimates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [filters, setFilters] = useState({
    startDate: '',
    endDate: '',
    status: 'DRAFT',
    keyword: ''
  });

  useEffect(() => {
    if (viewMode === 'list') fetchEstimates();
  }, [viewMode, filters]);

  const fetchEstimates = async () => {
    setLoading(true);
    let query = supabase
      .from('estimates')
      .select('*, clients!inner(name)')
      .order('created_at', { ascending: false });

    if (filters.status && filters.status !== 'ALL') query = query.eq('status', filters.status);
    if (filters.startDate) query = query.gte('created_at', filters.startDate);
    if (filters.endDate) query = query.lte('created_at', `${filters.endDate}T23:59:59`);
    if (filters.keyword) query = query.or(`project_name.ilike.%${filters.keyword}%,clients.name.ilike.%${filters.keyword}%`);

    const { data, error } = await query;
    if (error) console.error(error);
    else setEstimates(data || []);
    setLoading(false);
  };

  const handleOpenDetail = (id: string | null) => {
    setSelectedId(id);
    setViewMode('detail');
  };

  const handleBackToList = () => {
    setViewMode('list');
    fetchEstimates();
  };

  if (viewMode === 'detail') {
    return <EstimateDetail estimateId={selectedId} onBack={handleBackToList} onNavigate={onNavigate} />;
  }

  return (
    <PageLayout
      title="💰 견적 관리"
      actions={
        <div className="flex flex-col gap-2 w-full">
          <div className="flex flex-wrap gap-2 items-center bg-white p-2 rounded border">
            <select className="border p-1 rounded text-sm font-bold text-slate-700" value={filters.status} onChange={e => setFilters({ ...filters, status: e.target.value })}>
              <option value="DRAFT">📝 작성중 (미제출)</option>
              <option value="SENT">✅ 제출완료</option>
              <option value="ALL">전체 보기</option>
            </select>
            <span className="text-xs text-slate-400">|</span>
            <input type="date" className="border p-1 rounded text-sm" value={filters.startDate} onChange={e => setFilters({ ...filters, startDate: e.target.value })} />
            <span className="text-xs">~</span>
            <input type="date" className="border p-1 rounded text-sm" value={filters.endDate} onChange={e => setFilters({ ...filters, endDate: e.target.value })} />
            <input className="border p-1 rounded text-sm flex-1 min-w-[150px]" placeholder="프로젝트명 / 업체명 검색" value={filters.keyword} onChange={e => setFilters({ ...filters, keyword: e.target.value })} />
          </div>
          <div className="flex justify-between items-center">
            {/* 총 견적 개수 표시 */}
            <span className="text-sm font-bold text-slate-600 ml-2">
              총 {estimates.length}건 조회됨
            </span>
            <button onClick={() => handleOpenDetail(null)} className="bg-blue-600 text-white px-4 py-2 rounded text-sm font-bold hover:bg-blue-700 shadow-sm">+ 새 견적 작성</button>
          </div>
        </div>
      }
    >
      <div className="bg-white rounded-lg shadow border border-slate-200 overflow-hidden">
        <table className="min-w-full divide-y divide-slate-200">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase">날짜</th>
              <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase">상태</th>
              <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase">거래처</th>
              <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase">프로젝트명</th>
              <th className="px-6 py-3 text-right text-xs font-bold text-slate-500 uppercase">총 견적가 (원화 기준)</th>
              <th className="px-6 py-3 text-center text-xs font-bold text-slate-500 uppercase">관리</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {loading ? (
              <tr><td colSpan={6} className="text-center py-10">로딩 중...</td></tr>
            ) : estimates.length === 0 ? (
              <tr><td colSpan={6} className="text-center py-10 text-slate-400">조건에 맞는 견적서가 없습니다.</td></tr>
            ) : (
              estimates.map((est) => {
                // [수정] DB에 저장된 total_amount는 이제 '원화(KRW)'입니다.
                const totalKRW = est.total_amount || 0;

                // 외화 환산: 원화 / 환율
                const exchangeRate = est.base_exchange_rate || 1;
                const totalForeign = (est.currency !== 'KRW' && exchangeRate > 0)
                  ? totalKRW / exchangeRate
                  : 0;

                return (
                  <tr key={est.id} className="hover:bg-slate-50 cursor-pointer" onClick={() => handleOpenDetail(est.id)}>
                    <td className="px-6 py-4 text-sm text-slate-500">{new Date(est.created_at).toLocaleDateString()}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 text-xs font-bold rounded ${est.status === 'SENT' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-600'}`}>
                        {est.status === 'SENT' ? '제출됨' : '작성중'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm font-bold text-slate-700">{est.clients?.name}</td>
                    <td className="px-6 py-4 text-sm text-slate-900">{est.project_name}</td>
                    <td className="px-6 py-4 text-right text-sm font-bold text-blue-600">
                      {/* 메인: 원화 표시 */}
                      <div>₩ {totalKRW.toLocaleString()}</div>
                      {/* 서브: 외화 환산 표시 (70% 크기) */}
                      {est.currency !== 'KRW' && (
                        <div className="text-xs text-slate-400 font-normal" style={{ fontSize: '70%' }}>
                          ≈ {totalForeign.toLocaleString(undefined, { maximumFractionDigits: 2 })} {est.currency}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <button className="text-blue-500 hover:underline text-sm">열기</button>
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>
    </PageLayout>
  );
}
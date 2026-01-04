import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useProfile } from '../hooks/useProfile';
import { PageHeader } from '../components/common/ui/PageHeader';
import { Section } from '../components/common/ui/Section';
import { Card } from '../components/common/ui/Card';
import { Button } from '../components/common/ui/Button';

export function Estimates({ onNavigate }: { onNavigate: (page: string, id?: string | null) => void }) {
  // const [viewMode, setViewMode] = useState<'list' | 'detail'>('list'); // Removed: Handled by Dashboard
  // const [selectedId, setSelectedId] = useState<string | null>(null); // Removed: Handled by Dashboard
  const [estimates, setEstimates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { profile } = useProfile();

  const [filters, setFilters] = useState({
    startDate: '',
    endDate: '',
    status: 'DRAFT',
    keyword: ''
  });

  useEffect(() => {
    if (profile?.company_id) fetchEstimates();
  }, [filters, profile]);

  const fetchEstimates = async () => {
    if (!profile?.company_id) return;

    setLoading(true);
    let query = supabase
      .from('estimates')
      .select('*, clients!inner(name)')
      .eq('company_id', profile.company_id)
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


  const handleDeleteEstimate = async (e: React.MouseEvent, id: string, status: string) => {
    e.stopPropagation();

    if (status === 'ORDERED') {
      alert('이미 수주된 견적서는 삭제할 수 없습니다.\n먼저 수주 관리에서 해당 건을 삭제해주세요.');
      return;
    }

    if (!confirm('정말 견적서를 삭제하시겠습니까?\n이 작업은 되돌릴 수 없습니다.')) return;

    try {
      // 1. Check for linked orders (Double check)
      const { data: orders } = await supabase.from('orders').select('id').eq('estimate_id', id);
      if (orders && orders.length > 0) {
        alert('연결된 수주 내역이 존재하여 삭제할 수 없습니다.');
        return;
      }

      // 2. Delete items (Safety)
      await supabase.from('estimate_items').delete().eq('estimate_id', id);

      // 3. Delete estimate
      const { error } = await supabase.from('estimates').delete().eq('id', id);

      if (error) throw error;

      alert('삭제되었습니다.');
      fetchEstimates();
    } catch (err: any) {
      console.error(err);
      alert('삭제 실패: ' + err.message);
    }
  };

  const handleOpenDetail = (id: string | null) => {
    onNavigate('estimate-detail', id);
  };



  return (
    <div className="h-full flex flex-col bg-slate-50 relative">
      <div className="flex-1 overflow-y-auto p-4 md:p-8 space-y-6">
        <PageHeader
          title="💰 견적 관리"
          actions={
            <Button
              variant="primary"
              onClick={() => handleOpenDetail(null)}
              className="shadow-md"
            >
              + 새 견적 작성
            </Button>
          }
        />

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
                  <option value="DRAFT">📝 작성중</option>
                  <option value="SENT">✅ 제출완료</option>
                  <option value="ORDERED">🚀 수주확정</option>
                </select>
                <input
                  className="border p-2 rounded-lg text-sm flex-1 md:w-64 min-w-0 outline-none focus:ring-2 focus:ring-blue-100 placeholder:text-slate-400"
                  placeholder="프로젝트명 / 업체명 검색"
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

        <Section title={`견적 목록 (${estimates.length}건)`}>
          <Card noPadding className="overflow-hidden">
            <div className="hidden md:block overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">날짜</th>
                    <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">상태</th>
                    <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">거래처</th>
                    <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">프로젝트명</th>
                    <th className="px-6 py-3 text-right text-xs font-bold text-slate-500 uppercase tracking-wider">총 견적가 (KRW)</th>
                    <th className="px-6 py-3 text-center text-xs font-bold text-slate-500 uppercase tracking-wider">관리</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-slate-200">
                  {loading ? (
                    <tr><td colSpan={6} className="text-center py-20 text-slate-400">데이터 로딩 중...</td></tr>
                  ) : estimates.length === 0 ? (
                    <tr><td colSpan={6} className="text-center py-20 text-slate-400">조건에 맞는 견적서가 없습니다.</td></tr>
                  ) : (
                    estimates.map((est) => {
                      const totalKRW = est.total_amount || 0;
                      const exchangeRate = est.base_exchange_rate || 1;
                      const totalForeign = (est.currency !== 'KRW' && exchangeRate > 0)
                        ? totalKRW / exchangeRate
                        : 0;

                      return (
                        <tr key={est.id} className="hover:bg-blue-50/50 cursor-pointer transition-colors" onClick={() => handleOpenDetail(est.id)}>
                          <td className="px-6 py-4 text-sm text-slate-500">{new Date(est.created_at).toLocaleDateString()}</td>
                          <td className="px-6 py-4">
                            <StatusBadge status={est.status} />
                          </td>
                          <td className="px-6 py-4 text-sm font-bold text-slate-700">{est.clients?.name}</td>
                          <td className="px-6 py-4 text-sm text-slate-900 truncate max-w-[200px]">{est.project_name}</td>
                          <td className="px-6 py-4 text-right">
                            <div className="text-sm font-bold text-blue-600">₩ {totalKRW.toLocaleString()}</div>
                            {est.currency !== 'KRW' && (
                              <div className="text-[10px] text-slate-400">
                                ≈ {totalForeign.toLocaleString(undefined, { maximumFractionDigits: 2 })} {est.currency}
                              </div>
                            )}
                          </td>
                          <td className="px-6 py-4 text-center">
                            <div className="flex justify-center gap-2">
                              <Button
                                size="sm"
                                variant="secondary"
                                onClick={(e) => { e.stopPropagation(); handleOpenDetail(est.id); }}
                                className="h-[28px] opacity-70 hover:opacity-100"
                              >
                                ✏️
                              </Button>
                              <Button
                                variant="danger"
                                size="sm"
                                onClick={(e) => handleDeleteEstimate(e, est.id, est.status)}
                                className="h-[28px] opacity-70 hover:opacity-100"
                              >
                                🗑️
                              </Button>
                            </div>
                          </td>
                        </tr>
                      )
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Mobile List Info */}
            <div className="md:hidden p-4 text-center text-sm text-slate-400 border-b border-slate-100">
              좌우로 스크롤하여 내용을 확인하세요.
            </div>
          </Card>

          {/* Mobile Card List */}
          <div className="md:hidden space-y-3 mt-4">
            {loading ? (
              <div className="text-center py-20 text-slate-400">로딩 중...</div>
            ) : estimates.length === 0 ? (
              <div className="text-center py-20 text-slate-400">검색 결과가 없습니다.</div>
            ) : (
              estimates.map((est) => {
                const totalKRW = est.total_amount || 0;
                return (
                  <Card key={est.id} onClick={() => handleOpenDetail(est.id)} className="cursor-pointer active:bg-slate-50">
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex flex-col gap-1">
                        <StatusBadge status={est.status} />
                        <span className="text-xs text-slate-400">{new Date(est.created_at).toLocaleDateString()}</span>
                      </div>
                      <div className="text-right">
                        <div className="text-lg font-bold text-blue-600">₩ {totalKRW.toLocaleString()}</div>
                        {est.currency !== 'KRW' && (
                          <div className="text-[10px] text-slate-400">({est.currency} 견적 포함)</div>
                        )}
                      </div>
                    </div>
                    <div className="mb-3">
                      <h4 className="text-base font-bold text-slate-800 truncate">{est.project_name}</h4>
                      <p className="text-sm text-slate-500">{est.clients?.name}</p>
                    </div>
                    <div className="flex justify-end pt-2 border-t border-slate-50">
                      <Button
                        size="sm"
                        variant="danger"
                        onClick={(e) => handleDeleteEstimate(e, est.id, est.status)}
                        className="h-[32px] w-[32px] opacity-70 hover:opacity-100 flex items-center justify-center p-0"
                      >
                        🗑️
                      </Button>
                    </div>
                  </Card>
                );
              })
            )}
          </div>
        </Section>
      </div>
    </div>
  );
}

// 공통 상태 배지 컴포넌트
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
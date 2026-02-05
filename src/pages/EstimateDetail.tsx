// import { PageLayout } from '../components/common/PageLayout'; // 권장되지 않음
import { PageHeader } from '../components/common/ui/PageHeader';
import { Card } from '../components/common/ui/Card';
import { Section } from '../components/common/ui/Section';
import { Button } from '../components/common/ui/Button';
import { useEstimateLogic } from '../hooks/useEstimateLogic';
import { useProfile } from '../hooks/useProfile';
import { supabase } from '../lib/supabaseClient';
import { EstimateHeader } from '../components/estimate/EstimateHeader';
import { EstimateTable } from '../components/estimate/EstimateTable';
import { EstimateItemModal } from '../components/estimate/EstimateItemModal';
import { ImportItemsModal } from '../components/estimate/ImportItemsModal'; // [신규]
import { QuotationTemplate } from '../components/estimate/QuotationTemplate';
import { FileDropZone } from '../components/common/FileDropZone';
import { FilenameParserModal } from '../components/features/FilenameParserModal';
import { SmartPdfImporter } from '../components/features/SmartPdfImporter';
import { MobileModal } from '../components/common/MobileModal';
import { useReactToPrint } from 'react-to-print';
import { useRef, useState, useEffect, useMemo } from 'react';

interface EstimateDetailProps {
  estimateId: string | null;
  onBack: () => void;
  onNavigate?: (page: string) => void;
}

export function EstimateDetail({ estimateId, onBack, onNavigate }: EstimateDetailProps) {
  const { profile } = useProfile();
  const userRole = profile?.role;

  const {
    loading, clients, materials, companyRootPath, postProcessings, heatTreatments,
    formData, setFormData,
    items, currentEstimateId,
    isItemModalOpen, setIsItemModalOpen,
    isOcrModalOpen, setIsOcrModalOpen,
    isPreviewModalOpen, setIsPreviewModalOpen,
    editingItem,
    droppedFiles, isParserOpen, setIsParserOpen,
    selectedItemIds,
    bulkWorkDays, setBulkWorkDays,
    fileInputRef,
    quotationTerms,
    companyInfo,
    excelPresets, handleExportExcel,
    // Actions
    handleClientChange, handleSaveHeader, handleStatusChange,
    openItemModal, handleDeleteItem, handleDeleteSelected, handleBulkUpdateWorkDays,
    handleFilesDropped, openFileDialog, handleFileInputChange,
    handleParsedItemsConfirm, handleOcrConfirm,
    updateEstimateTotalAmount, fetchEstimateItems,
    saveFilesToStorage, handleDeleteExistingFile, handleOpenFile,
    // handleSaveTerms, // Removed
    toggleSelectAll, toggleSelectItem, handleUpdateItem,
    totalAmount, convertedTotal,
    discountPolicy, defaultHourlyRate,
    createOrderFromEstimate, generateProjectName
  } = useEstimateLogic(estimateId);

  // const [isTermModalOpen, setIsTermModalOpen] = useState(false); // Removed per user request
  const [isExcelModalOpen, setIsExcelModalOpen] = useState(false);
  // [신규] 가져오기 모달
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);

  const [previewTemplateType, setPreviewTemplateType] = useState('A');
  const [exportAsForeign, setExportAsForeign] = useState(false);

  const printRef = useRef<HTMLDivElement>(null);

  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: `Quotation_${formData.project_name}`,
  });

  useEffect(() => {
    if (isPreviewModalOpen) {
      // @ts-ignore
      setPreviewTemplateType(quotationTerms.template_type || 'A');
    }
  }, [isPreviewModalOpen, quotationTerms]);



  const handleDelete = async () => {
    if (!currentEstimateId) return;
    if (formData.status === 'ORDERED') {
      alert('이미 수주된 견적서는 삭제할 수 없습니다.\n먼저 수주 관리에서 해당 건을 삭제해주세요.');
      return;
    }
    if (!confirm('정말 삭제하시겠습니까?\n이 작업은 되돌릴 수 없습니다.')) return;

    try {
      // 1. Check orders
      const { data: orders } = await supabase.from('orders').select('id').eq('estimate_id', currentEstimateId);
      if (orders && orders.length > 0) {
        alert('연결된 수주 내역이 있어 삭제할 수 없습니다.');
        return;
      }

      // 2. Delete
      await supabase.from('estimate_items').delete().eq('estimate_id', currentEstimateId);
      const { error } = await supabase.from('estimates').delete().eq('id', currentEstimateId);
      if (error) throw error;

      alert('삭제되었습니다.');
      onBack();
    } catch (err) {
      alert('삭제 실패: ' + (err instanceof Error ? err.message : '알 수 없는 오류'));
    }
  };

  const handleExcelClick = () => {
    if (excelPresets.length === 0) {
      alert('설정 메뉴에서 엑셀 내보내기 양식(Preset)을 먼저 등록해주세요.');
    } else if (excelPresets.length === 1) {
      handleExportExcel(excelPresets[0].id, exportAsForeign);
    } else {
      setIsExcelModalOpen(true);
    }
  };

  const printItems = useMemo(() => {
    if (exportAsForeign && formData.exchange_rate > 0 && formData.currency !== 'KRW') {
      return items.map(item => ({
        ...item,
        unit_price: item.unit_price / formData.exchange_rate,
        supply_price: (item.supply_price || 0) / formData.exchange_rate,
      }));
    }
    return items;
  }, [items, exportAsForeign, formData.exchange_rate, formData.currency]);

  const printEstimateInfo = {
    ...formData,
    ...quotationTerms,
    currency: exportAsForeign ? formData.currency : 'KRW'
  };

  const isLocked = formData.status === 'SENT' || formData.status === 'ORDERED';

  if (loading) return <div className="h-full flex items-center justify-center text-slate-500">데이터 로딩 중...</div>;

  return (
    <>
      <div className="h-[calc(100vh-64px)] md:h-full flex flex-col bg-slate-50 relative overflow-hidden">
        <div className="flex-1 overflow-y-auto p-4 md:p-8 space-y-6">
          <PageHeader
            hideGuide={selectedItemIds.size > 0 || isLocked} // 툴바가 활성화되었거나 잠금 상태일 때 도움말 아이콘 숨김
            title={
              <div className="flex items-center gap-3">
                <span className="text-2xl">{estimateId ? '📄' : '📝'}</span>
                <div>
                  <h1 className="text-xl md:text-2xl font-black text-slate-800 tracking-tight">
                    {estimateId ? (formData.project_name || '견적서 수정') : '새 견적서 작성'}
                    {isLocked && <span className="ml-3 text-sm font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full border border-slate-200 uppercase tracking-widest align-middle">읽기 전용</span>}
                  </h1>
                </div>
              </div>
            }
            onBack={onBack}
            actions={
              <div className="flex items-center gap-4">
                {/* 보조 작업 그룹 */}
                {currentEstimateId && (
                  <div className="hidden lg:flex items-center bg-white border border-slate-200 rounded-xl p-1 shadow-sm h-[42px]">
                    <Button variant="ghost" size="sm" onClick={handleExcelClick} className="h-full px-3 text-slate-600 hover:text-emerald-600">
                      <span className="mr-1.5">💾</span> 엑셀
                    </Button>
                    <div className="w-px h-4 bg-slate-100 mx-1"></div>
                    <Button variant="ghost" size="sm" onClick={() => setIsPreviewModalOpen(true)} className="h-full px-3 text-slate-600 hover:text-indigo-600">
                      <span className="mr-1.5">🖨️</span> 출력
                    </Button>
                  </div>
                )}

                {/* 기본 작업 버튼 (잠금 상태가 아닐 때만 표시) */}
                {!isLocked && (
                  <Button
                    onClick={handleSaveHeader}
                    variant={currentEstimateId ? 'secondary' : 'primary'}
                    className={`h-[42px] px-6 shadow-md ${currentEstimateId ? 'bg-white border-slate-200 text-slate-600' : ''}`}
                  >
                    {currentEstimateId ? (
                      <div className="flex items-center gap-2">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-emerald-500" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                        저장됨
                      </div>
                    ) : '견적서 저장'}
                  </Button>
                )}

                {/* 상태별 워크플로우 작업 */}
                {formData.status === 'SENT' && (
                  <Button
                    variant="gradient"
                    className="h-[42px] px-6 shadow-glow animate-pulse"
                    style={{ animationDuration: '3s' }}
                    onClick={async () => {
                      const orderId = await createOrderFromEstimate();
                      if (orderId && onNavigate) {
                        if (confirm('수주가 생성되었습니다. 수주 관리 페이지로 이동하시겠습니까?')) {
                          onNavigate('orders');
                        }
                      }
                    }}
                  >
                    🚀 수주 등록
                  </Button>
                )}

                {/* 삭제 (관리자 전용) */}
                {userRole === 'admin' && (
                  <button onClick={handleDelete} className="p-2 text-slate-300 hover:text-red-500 transition-colors rounded-lg hover:bg-red-50">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                  </button>
                )}
              </div>
            }
          />

          {/* 프로젝트 정보 및 상태 섹션 */}
          <Section>
            <div className={`grid grid-cols-1 ${currentEstimateId && !isLocked ? 'lg:grid-cols-12' : ''} gap-6 items-stretch`}>
              {/* Main Info Card */}
              <Card className={`${currentEstimateId && !isLocked ? 'lg:col-span-8' : 'w-full'} overflow-hidden`}>
                <div className="flex items-center justify-between mb-6 pb-2 border-b border-slate-50">
                  <div className="flex items-center gap-3">
                    <span className="p-2 bg-slate-100 rounded-lg">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </span>
                    <h3 className="font-black text-slate-700 uppercase tracking-tight">프로젝트 정보</h3>
                  </div>

                  {currentEstimateId && (
                    <div className="flex items-center gap-2">
                      <label className="flex items-center gap-2 mr-4 cursor-pointer group">
                        <input
                          type="checkbox"
                          checked={exportAsForeign}
                          onChange={e => setExportAsForeign(e.target.checked)}
                          disabled={isLocked}
                          className="w-4 h-4 rounded text-brand-600 focus:ring-brand-500 border-slate-300 disabled:opacity-50"
                        />
                        <span className="text-xs font-bold text-slate-500 group-hover:text-brand-600 transition-colors">외화 적용</span>
                      </label>

                      <div className="h-8 w-px bg-slate-100 mx-2"></div>

                      <div className={`flex items-center gap-2 px-3 py-1 rounded-full border shadow-sm ${formData.status === 'SENT' ? 'bg-emerald-50 border-emerald-100 text-emerald-700' :
                        formData.status === 'ORDERED' ? 'bg-purple-50 border-purple-100 text-purple-700' :
                          'bg-slate-50 border-slate-200 text-slate-600'
                        }`}>
                        <span className="text-xs font-black">
                          {formData.status === 'SENT' ? '제출됨' : formData.status === 'ORDERED' ? '수주완료' : '작성중'}
                        </span>
                        {formData.status !== 'ORDERED' && (
                          <button
                            onClick={(e) => { e.stopPropagation(); handleStatusChange(formData.status === 'SENT' ? 'DRAFT' : 'SENT'); }}
                            className="bg-white/50 hover:bg-white px-2 py-0.5 rounded text-[10px] font-bold transition-colors ml-1"
                          >
                            {formData.status === 'SENT' ? '취소' : '변경'}
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </div>
                <EstimateHeader
                  clients={clients}
                  formData={formData}
                  setFormData={setFormData}
                  onClientChange={handleClientChange}
                  onGenerateProjectName={generateProjectName}
                  disabled={isLocked}
                />
              </Card>

              {/* 파일 드롭 영역 카드 (잠금 상태가 아닐 때만 표시) */}
              {currentEstimateId && !isLocked && (
                <Card className="lg:col-span-4 bg-slate-50/50 border-dashed border-2 border-slate-200 hover:border-brand-300 transition-colors group relative cursor-pointer p-0 overflow-hidden" noPadding onClick={openFileDialog}>
                  <input type="file" multiple ref={fileInputRef} className="hidden" onChange={handleFileInputChange} />
                  <FileDropZone
                    onFilesDropped={handleFilesDropped}
                    className="bg-transparent border-none h-full min-h-[140px]"
                    hideIcon={true}
                  >
                    <div className="flex flex-col items-center justify-center p-6 text-center h-full">
                      <div className="w-12 h-12 bg-white rounded-2xl shadow-sm flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-brand-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 13h6m-3-3v6m-9 1V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
                        </svg>
                      </div>
                      <p className="text-sm font-bold text-slate-700 mb-1">여기로 파일을 끌어놓으세요</p>
                      <p className="text-[10px] text-slate-400">PDF, DXF, STP 등 도면 파일 자동 분석</p>
                    </div>
                  </FileDropZone>
                  <div className="absolute bottom-0 left-0 right-0 bg-white/80 p-1.5 text-center pointer-events-none">
                    <p className="text-[9px] text-slate-400 font-mono italic truncate">
                      {companyRootPath ? `...\\${new Date().getFullYear()}\\${formData.project_name || '...'}` : '저장 경로를 먼저 설정해주세요.'}
                    </p>
                  </div>
                </Card>
              )}
            </div>
          </Section>

          {/* 품목 섹션 */}
          <Section>
            <div className="relative">
              {/* 동적 선택 툴바 (Gmail 스타일) - 잠금 상태가 아닐 때만 표시 */}
              {!isLocked && (
                <div className={`absolute -top-14 left-0 right-0 z-30 transition-all duration-300 transform ${selectedItemIds.size > 0 ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0 pointer-events-none'
                  }`}>
                  <div className="bg-slate-900 text-white rounded-2xl shadow-glow px-6 py-3 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <span className="bg-brand-500 text-white w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black">
                        {selectedItemIds.size}
                      </span>
                      <span className="text-sm font-bold">건 선택됨</span>

                      <div className="w-px h-6 bg-slate-700 mx-2"></div>

                      <div className="flex items-center gap-3">
                        <span className="text-[10px] font-black text-slate-400 uppercase">예상 제작 소요일:</span>
                        <div className="flex items-center bg-white/10 rounded-lg p-1 border border-white/10">
                          <input
                            type="number"
                            className="w-12 bg-transparent border-none text-white text-xs p-1 text-center outline-none"
                            value={bulkWorkDays}
                            onChange={(e) => setBulkWorkDays(Number(e.target.value))}
                          />
                          <button
                            onClick={handleBulkUpdateWorkDays}
                            className="px-3 py-1 bg-white text-slate-900 text-[10px] font-black rounded-md hover:bg-brand-50 transition-colors"
                          >
                            일괄 적용
                          </button>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={handleDeleteSelected}
                        className="px-4 py-2 bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white text-xs font-bold rounded-xl transition-all flex items-center gap-2"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                        일괄 삭제
                      </button>
                      <button onClick={() => toggleSelectAll(false)} className="p-2 hover:bg-white/10 rounded-xl transition-colors">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* 테이블 헤더 래퍼 */}
              <div className="flex items-end justify-between mb-4">
                <div>
                  <h2 className="text-lg font-black text-slate-800 tracking-tight">견적 품목</h2>
                  <p className="text-xs text-slate-400 mt-0.5 font-medium">부품 리스트를 작성하고 도면 분석을 시작하세요.</p>
                </div>

                {!isLocked && (
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="glass"
                      onClick={() => { if (!currentEstimateId) return alert('저장 후 가능'); setIsOcrModalOpen(true); }}
                      className="text-brand-700 bg-brand-50 border-brand-100 hover:bg-brand-100"
                    >
                      <span className="mr-1.5 text-xs">⚡</span> 도면 분석
                    </Button>
                    <Button
                      size="sm"
                      variant="glass"
                      onClick={() => { if (!currentEstimateId) return alert('저장 후 가능'); setIsImportModalOpen(true); }}
                      className="text-cyan-700 bg-cyan-50 border-cyan-100 hover:bg-cyan-100"
                    >
                      <span className="mr-1.5 text-xs">📂</span> 가져오기
                    </Button>
                    <Button
                      size="sm"
                      variant="primary"
                      onClick={() => { if (!currentEstimateId) return alert('저장 후 가능'); openItemModal(null); }}
                      className="px-6 shadow-glow"
                    >
                      + 품목 추가
                    </Button>
                  </div>
                )}
              </div>

              <Card noPadding className="border-0 shadow-soft overflow-hidden rounded-2xl min-h-[400px]">
                <EstimateTable
                  items={items}
                  materials={materials}
                  postProcessings={postProcessings}
                  heatTreatments={heatTreatments}
                  currency={formData.currency}
                  exchangeRate={formData.exchange_rate}
                  selectedItemIds={selectedItemIds}
                  onToggleSelectAll={toggleSelectAll}
                  onToggleSelectItem={toggleSelectItem}
                  onEditItem={openItemModal}
                  onDeleteItem={handleDeleteItem}
                  onUpdateItem={handleUpdateItem}
                  canViewMargins={userRole === 'admin' || userRole === 'super_admin' || profile?.permissions?.can_view_margins}
                  timeStep={companyInfo?.default_time_step || 0.1}
                  isLocked={isLocked}
                />
              </Card>
            </div>
          </Section>
        </div>

        {/* 고정 푸터 */}
        <div className="shrink-0 p-4 bg-white/80 backdrop-blur-xl border-t border-slate-100 z-20 shadow-[0_-10px_30px_rgba(0,0,0,0.03)]">
          <div className="flex justify-between items-center max-w-7xl mx-auto px-4 md:px-8">
            <div className="hidden sm:block">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">상태</span>
              <div className="flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full ${formData.status === 'SENT' ? 'bg-emerald-500 animate-pulse' : 'bg-slate-300'}`}></span>
                <span className="text-sm font-bold text-slate-700">{formData.status === 'SENT' ? '견적서 제출됨' : '작성 중'}</span>
              </div>
            </div>

            <div className="flex items-center gap-8 md:gap-12">
              {formData.currency !== 'KRW' && (
                <div className="text-right">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">외화 환산</span>
                  <div className="flex items-baseline gap-1.5 justify-end">
                    <span className="text-xs font-bold text-slate-500">{formData.currency}</span>
                    <span className="text-lg md:text-2xl font-black text-slate-600 tracking-tight">
                      {convertedTotal.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>
              )}
              <div className="text-right">
                <span className="text-[10px] font-black text-brand-400 uppercase tracking-widest block mb-1">총 합계</span>
                <div className="flex items-baseline gap-1.5 justify-end">
                  <span className="text-xs md:text-sm font-bold text-brand-600">KRW</span>
                  <span className="text-2xl md:text-4xl font-black text-brand-600 tracking-tighter">
                    ₩{totalAmount.toLocaleString()}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <MobileModal
        isOpen={isPreviewModalOpen}
        onClose={() => setIsPreviewModalOpen(false)}
        title="견적서 미리보기"
        maxWidth="max-w-5xl"
        footer={
          <button onClick={() => handlePrint()} className="w-full py-3 bg-indigo-600 text-white font-bold rounded hover:bg-indigo-700 shadow-lg">
            🖨️ 인쇄 / PDF 저장
          </button>
        }
      >
        <div className="flex flex-col h-[75vh]">
          <div className="flex justify-center gap-4 mb-4 shrink-0 bg-slate-100 p-2 rounded items-center">
            {['A', 'B', 'C'].map(type => (
              <button
                key={type}
                onClick={() => setPreviewTemplateType(type)}
                className={`px-4 py-2 rounded text-sm font-bold border-2 transition-all ${previewTemplateType === type
                  ? 'border-indigo-600 bg-indigo-50 text-indigo-700'
                  : 'border-transparent hover:bg-white text-slate-600'
                  }`}
              >
                Type {type}
              </button>
            ))}
            {exportAsForeign && (
              <span className="text-xs font-bold text-yellow-700 ml-4 px-2 py-1 bg-yellow-100 rounded border border-yellow-200">
                ※ 외화({formData.currency}) 적용됨
              </span>
            )}
          </div>
          <div className="bg-gray-200 p-4 flex justify-center overflow-auto flex-1 rounded border border-gray-300">
            <QuotationTemplate
              ref={printRef}
              companyInfo={companyInfo}
              clientInfo={clients.find(c => c.id === formData.client_id)}
              estimateInfo={printEstimateInfo}
              items={printItems}
              // @ts-ignore
              templateType={previewTemplateType}
            />
          </div>
        </div>
      </MobileModal>

      <MobileModal
        isOpen={isExcelModalOpen}
        onClose={() => setIsExcelModalOpen(false)}
        title="엑셀 내보내기 양식 선택"
        maxWidth="max-w-sm"
      >
        <div className="space-y-4">
          {exportAsForeign && (
            <div className="p-3 bg-yellow-50 rounded border border-yellow-200 text-center">
              <span className="block font-bold text-sm text-yellow-800">외화({formData.currency})로 내보냅니다.</span>
            </div>
          )}
          <div className="space-y-2">
            {excelPresets.map(preset => (
              <button
                key={preset.id}
                onClick={() => { handleExportExcel(preset.id, exportAsForeign); setIsExcelModalOpen(false); }}
                className="w-full py-3 px-4 bg-green-50 border border-green-200 text-green-800 font-bold rounded hover:bg-green-100 text-left flex justify-between items-center"
              >
                <span>{preset.name}</span>
                <span className="text-xs font-normal text-slate-500">({preset.columns.length}개 항목)</span>
              </button>
            ))}
          </div>
        </div>
      </MobileModal>

      <EstimateItemModal
        isOpen={isItemModalOpen}
        onClose={() => setIsItemModalOpen(false)}
        estimateId={currentEstimateId}
        materials={materials}
        postProcessings={postProcessings}
        heatTreatments={heatTreatments} // [신규]
        currency={formData.currency}
        exchangeRate={formData.exchange_rate}
        editingItem={editingItem}
        discountPolicy={discountPolicy}
        defaultHourlyRate={defaultHourlyRate}
        existingItems={items} // [추가] 중복 확인
        onSaveSuccess={async () => { await updateEstimateTotalAmount(currentEstimateId!); await fetchEstimateItems(currentEstimateId!); }}
        onSaveFiles={saveFilesToStorage}
        onDeleteExistingFile={handleDeleteExistingFile}
        onOpenFile={handleOpenFile}
        companyInfo={companyInfo}
      />

      <FilenameParserModal
        isOpen={isParserOpen}
        onClose={() => setIsParserOpen(false)}
        files={droppedFiles}
        onConfirm={handleParsedItemsConfirm}
      />

      <SmartPdfImporter
        isOpen={isOcrModalOpen}
        onClose={() => setIsOcrModalOpen(false)}
        onConfirm={handleOcrConfirm}
      />

      <ImportItemsModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        onConfirm={async (newItems) => {
          // 품목 변환 및 추가
          const parsedItems = newItems.map(item => {
            // [규격 문자열 파싱] 예: "10x20x5" 또는 "10-20-5"
            let w = 0, d = 0, h = 0;
            if (item.spec) {
              const nums = item.spec.match(/[\d.]+/g)?.map(Number) || [];
              if (nums.length >= 1) w = nums[0];
              if (nums.length >= 2) d = nums[1];
              if (nums.length >= 3) h = nums[2];
            }

            // [텍스트로부터 ID 확인]
            const matName = item.material_text?.trim();
            const processName = item.post_process_text?.trim();
            const heatName = item.heat_treatment_text?.trim();

            let foundMatId: string | null = null;
            if (matName) {
              const foundMat = materials.find(m => m.name === matName || m.code === matName);
              if (foundMat) foundMatId = foundMat.id;
            }

            let foundProcessId: string | null = null;
            if (processName) {
              const foundProc = postProcessings.find(p => p.name === processName);
              if (foundProc) foundProcessId = foundProc.id;
            }

            let foundHeatId: string | null = null;
            if (heatName) {
              const foundHeat = heatTreatments.find(h => h.name === heatName);
              if (foundHeat) foundHeatId = foundHeat.id;
            }

            return {
              part_name: item.part_name || '',
              part_no: item.drawing_number || '',
              original_material_name: item.original_material_name || '', // [매핑됨]
              spec_w: w,
              spec_d: d,
              spec_h: h,
              unit_price: item.unit_price,
              qty: item.qty,
              material_id: foundMatId, // [확인됨]
              post_processing_id: foundProcessId, // [확인됨]
              heat_treatment_id: foundHeatId, // [확인됨]
              files: []
              // 참고: DB 오류를 방지하기 위해 'spec' 속성은 의도적으로 제외되었습니다.
            };
          });
          await handleParsedItemsConfirm(parsedItems);
        }}
      />

      {/* Terms Modal Removed */}

      <div className="hidden">
        <QuotationTemplate
          ref={printRef}
          companyInfo={companyInfo}
          clientInfo={clients.find(c => c.id === formData.client_id)}
          estimateInfo={printEstimateInfo}
          items={printItems}
          // @ts-ignore
          templateType={previewTemplateType}
        />
      </div>
    </>
  );
}

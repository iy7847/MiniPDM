import { useEstimateLogic } from '../hooks/useEstimateLogic';
import { EstimateHeader } from '../components/estimate/EstimateHeader';
import { EstimateTable } from '../components/estimate/EstimateTable';
import { EstimateItemModal } from '../components/estimate/EstimateItemModal';
import { QuotationTemplate } from '../components/estimate/QuotationTemplate';
import { FileDropZone } from '../components/common/FileDropZone';
import { FilenameParserModal } from '../components/features/FilenameParserModal';
import { SmartPdfImporter } from '../components/features/SmartPdfImporter';
import { MobileModal } from '../components/common/MobileModal';
import { FormattedInput } from '../components/common/FormattedInput'; // [추가]
import { useReactToPrint } from 'react-to-print';
import { useRef, useState, useEffect, useMemo } from 'react';

interface EstimateDetailProps {
  estimateId: string | null;
  onBack: () => void;
  onNavigate?: (page: string) => void;
}

export function EstimateDetail({ estimateId, onBack, onNavigate }: EstimateDetailProps) {
  const {
    loading, clients, materials, companyRootPath,
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
    quotationTerms, setQuotationTerms,
    companyInfo,
    excelPresets, handleExportExcel,
    // Actions
    handleClientChange, handleSaveHeader, handleStatusChange,
    openItemModal, handleDeleteItem, handleDeleteSelected, handleBulkUpdateWorkDays,
    handleFilesDropped, openFileDialog, handleFileInputChange,
    handleParsedItemsConfirm, handleOcrConfirm,
    updateEstimateTotalAmount, fetchEstimateItems,
    saveFilesToStorage, handleDeleteExistingFile, handleOpenFile,
    handleSaveTerms,
    toggleSelectAll, toggleSelectItem,
    totalAmount, convertedTotal, currencySymbol,
    discountPolicy, defaultHourlyRate,
    createOrderFromEstimate
  } = useEstimateLogic(estimateId);

  const [isTermModalOpen, setIsTermModalOpen] = useState(false);
  const [isExcelModalOpen, setIsExcelModalOpen] = useState(false);
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

  if (loading) return <div className="h-full flex items-center justify-center text-slate-500">데이터 로딩 중...</div>;

  return (
    <div className="h-full flex flex-col bg-white rounded-lg shadow border border-slate-200 overflow-hidden">
      {/* 1. 상단 툴바 */}
      <div className="flex justify-between items-center p-4 border-b bg-slate-50 shrink-0">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="text-slate-500 hover:text-slate-700 font-bold">← 뒤로</button>
          <h2 className="text-lg font-bold text-slate-800">
            {estimateId ? '견적서 수정' : '새 견적서 작성'}
          </h2>
        </div>
        <div className="flex items-center gap-3">
          {currentEstimateId && (
            <>
              {formData.currency !== 'KRW' && (
                <label className="flex items-center gap-2 mr-3 px-3 py-2 bg-yellow-50 border border-yellow-200 rounded cursor-pointer hover:bg-yellow-100 transition-colors">
                  <input
                    type="checkbox"
                    checked={exportAsForeign}
                    onChange={e => setExportAsForeign(e.target.checked)}
                    className="w-4 h-4 text-yellow-600 accent-yellow-600 cursor-pointer"
                  />
                  <div className="flex flex-col leading-none">
                    <span className="text-xs font-bold text-yellow-800">외화({formData.currency}) 적용</span>
                    <span className="text-[9px] text-yellow-600">환율: {formData.exchange_rate}</span>
                  </div>
                </label>
              )}

              <button
                onClick={() => setIsTermModalOpen(true)}
                className="px-3 py-2 bg-gray-100 border text-slate-700 text-sm font-bold rounded hover:bg-gray-200 whitespace-nowrap"
              >
                ⚙️ 조건
              </button>
              <button
                onClick={handleExcelClick}
                className="px-3 py-2 bg-green-600 text-white text-sm font-bold rounded hover:bg-green-700 shadow-sm whitespace-nowrap"
              >
                💾 엑셀
              </button>
              <button
                onClick={() => setIsPreviewModalOpen(true)}
                className="px-3 py-2 bg-indigo-600 text-white text-sm font-bold rounded hover:bg-indigo-700 shadow-sm whitespace-nowrap"
              >
                🖨️ 출력
              </button>
              <div className="flex items-center gap-2 ml-2 mr-4 bg-white px-3 py-1 rounded border">
                <span className={`text-xs font-bold ${formData.status === 'SENT' ? 'text-green-600' : formData.status === 'ORDERED' ? 'text-purple-600' : 'text-slate-500'}`}>
                  {formData.status === 'SENT' ? '✅ 제출 완료' : formData.status === 'ORDERED' ? '🚀 수주 확정' : '📝 작성 중'}
                </span>
                {formData.status !== 'ORDERED' && (
                  <button
                    onClick={() => handleStatusChange(formData.status === 'SENT' ? 'DRAFT' : 'SENT')}
                    className={`text-xs px-2 py-0.5 rounded border ${formData.status === 'SENT' ? 'bg-slate-100' : 'bg-green-100 text-green-700 border-green-300'}`}
                  >
                    {formData.status === 'SENT' ? '취소' : '제출처리'}
                  </button>
                )}
              </div>
              {formData.status === 'SENT' && (
                <button
                  onClick={async () => {
                    // @ts-ignore
                    const orderId = await createOrderFromEstimate();
                    if (orderId && onNavigate) {
                      if (confirm('수주가 생성되었습니다. 수주 관리 페이지로 이동하시겠습니까?')) {
                        onNavigate('orders');
                      }
                    }
                  }}
                  className="ml-2 px-3 py-2 bg-indigo-500 text-white text-sm font-bold rounded hover:bg-indigo-600 shadow-sm whitespace-nowrap"
                >
                  🚀 수주 등록
                </button>
              )}
            </>
          )}
          <button onClick={handleSaveHeader} className="px-4 py-2 bg-blue-600 text-white rounded font-bold hover:bg-blue-700 whitespace-nowrap">
            {currentEstimateId ? '저장됨' : '저장'}
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-6 space-y-6 pb-24">
        <EstimateHeader
          clients={clients}
          formData={formData}
          setFormData={setFormData}
          onClientChange={handleClientChange}
        />

        {currentEstimateId && (
          <div className="animate-fade-in-down" onClick={openFileDialog}>
            <input type="file" multiple ref={fileInputRef} className="hidden" onChange={handleFileInputChange} />
            <FileDropZone onFilesDropped={handleFilesDropped} className="bg-blue-50 border-blue-200 hover:border-blue-400 hover:bg-blue-100 transition-colors" />
            <p className="text-[11px] text-slate-400 text-center mt-1">* 파일 저장 위치: {companyRootPath || '(경로 미설정)'} \{new Date().getFullYear()}\{formData.project_name || '...'}</p>
          </div>
        )}

        <div>
          <div className="mb-4 flex flex-wrap justify-between items-end gap-2">
            <h3 className="text-lg font-bold text-slate-700">📋 견적 품목 (Items)</h3>
            <div className="flex gap-2 items-center">
              {selectedItemIds.size > 0 && (
                <div className="flex items-center gap-1 bg-indigo-50 p-1 rounded border border-indigo-100">
                  <span className="text-xs font-bold text-indigo-700 ml-1">소요일:</span>
                  <input type="number" className="w-10 border rounded text-xs p-1 text-center" value={bulkWorkDays} onChange={(e) => setBulkWorkDays(Number(e.target.value))} />
                  <button onClick={handleBulkUpdateWorkDays} className="px-2 py-1 bg-indigo-600 text-white text-xs font-bold rounded hover:bg-indigo-700">일괄 적용</button>
                  <div className="w-[1px] h-4 bg-indigo-200 mx-1"></div>
                  <button onClick={handleDeleteSelected} className="px-2 py-1 text-red-500 hover:text-red-700 text-xs font-bold">삭제 ({selectedItemIds.size})</button>
                </div>
              )}
              {/* 스마트 OCR 버튼 */}
              <button
                onClick={() => {
                  if (!currentEstimateId) return alert('먼저 견적서를 저장해주세요.');
                  setIsOcrModalOpen(true);
                }}
                className="px-3 py-1.5 bg-orange-500 text-white text-sm font-bold rounded hover:bg-orange-600 shadow-sm flex items-center gap-1"
              >
                <span>⚡</span> 도면 일괄 분석
              </button>

              <button onClick={() => { if (!currentEstimateId) return alert('먼저 견적서를 저장해주세요.'); openItemModal(null); }} className="px-3 py-1.5 bg-green-600 text-white text-sm font-bold rounded hover:bg-green-700 shadow-sm">+ 품목 직접 추가</button>
            </div>
          </div>

          <EstimateTable
            items={items}
            materials={materials}
            currency={formData.currency}
            exchangeRate={formData.exchange_rate}
            selectedItemIds={selectedItemIds}
            onToggleSelectAll={toggleSelectAll}
            onToggleSelectItem={toggleSelectItem}
            onEditItem={openItemModal}
            onDeleteItem={handleDeleteItem}
          />
        </div>
      </div>

      <div className="p-4 bg-slate-50 border-t border-slate-200 shrink-0 sticky bottom-0 z-20 shadow-[0_-5px_15px_rgba(0,0,0,0.05)]">
        <div className="flex justify-end items-center gap-8">
          {formData.currency !== 'KRW' && (
            <div className="text-right">
              <span className="text-xs font-bold text-slate-500 block mb-1">외화 환산 금액 (예상)</span>
              <span className="text-xl font-bold text-slate-600" style={{ fontSize: '70%' }}>
                {currencySymbol} {convertedTotal.toLocaleString(undefined, { maximumFractionDigits: 2 })}
              </span>
            </div>
          )}
          <div className="text-right">
            <span className="text-xs font-bold text-slate-500 block mb-1">총 견적 금액 (KRW)</span>
            <span className="text-3xl font-extrabold text-blue-700">₩ {totalAmount.toLocaleString()}</span>
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
        currency={formData.currency}
        exchangeRate={formData.exchange_rate}
        editingItem={editingItem}
        discountPolicy={discountPolicy}
        defaultHourlyRate={defaultHourlyRate}
        onSaveSuccess={async () => { await updateEstimateTotalAmount(currentEstimateId!); await fetchEstimateItems(currentEstimateId!); }}
        onSaveFiles={saveFilesToStorage}
        onDeleteExistingFile={handleDeleteExistingFile}
        onOpenFile={handleOpenFile}
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

      <MobileModal
        isOpen={isTermModalOpen}
        onClose={() => setIsTermModalOpen(false)}
        title="견적서 발행 조건 설정"
        footer={
          <button onClick={() => { handleSaveTerms(quotationTerms); setIsTermModalOpen(false); }} className="w-full py-3 bg-blue-600 text-white font-bold rounded">
            조건 저장
          </button>
        }
      >
        <div className="space-y-4">
          <div className="bg-slate-50 p-3 rounded border">
            <label className="block text-xs font-bold text-slate-500 mb-2">기본 견적서 양식</label>
            <div className="flex gap-4">
              {['A', 'B', 'C'].map(type => (
                <label key={type} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="template_type"
                    value={type}
                    // @ts-ignore
                    checked={quotationTerms.template_type === type}
                    onChange={(e) => setQuotationTerms({ ...quotationTerms, template_type: e.target.value })}
                  />
                  <span className="text-sm font-bold">Type {type}</span>
                </label>
              ))}
            </div>
          </div>

          {/* [수정] FormattedInput 적용하여 입력 시 포커스 잃는 문제 해결 */}
          <div>
            <FormattedInput
              label="견적 번호 (Ref. No)"
              value={quotationTerms.quotation_no || ''}
              onChange={val => setQuotationTerms({ ...quotationTerms, quotation_no: val })}
              placeholder="자동 생성 또는 직접 입력"
            />
          </div>
          <div>
            <FormattedInput
              label="결제 조건 (Payment)"
              value={quotationTerms.payment_terms}
              onChange={val => setQuotationTerms({ ...quotationTerms, payment_terms: val })}
            />
          </div>
          <div>
            <FormattedInput
              label="인도 조건 (Incoterms)"
              value={quotationTerms.incoterms}
              onChange={val => setQuotationTerms({ ...quotationTerms, incoterms: val })}
            />
          </div>
          <div>
            <FormattedInput
              label="납기 (Delivery)"
              value={quotationTerms.delivery_period}
              onChange={val => setQuotationTerms({ ...quotationTerms, delivery_period: val })}
            />
          </div>
          <div>
            <FormattedInput
              label="도착지 (Destination)"
              value={quotationTerms.destination}
              onChange={val => setQuotationTerms({ ...quotationTerms, destination: val })}
            />
          </div>
          <div><label className="block text-xs font-bold text-slate-500 mb-1">비고 (Note)</label><textarea className="w-full border p-2 rounded h-20" value={quotationTerms.note} onChange={e => setQuotationTerms({ ...quotationTerms, note: e.target.value })} /></div>
        </div>
      </MobileModal>

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

    </div>
  );
}
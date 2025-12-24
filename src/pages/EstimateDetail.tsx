import { useEstimateLogic } from '../hooks/useEstimateLogic';
import { EstimateHeader } from '../components/estimate/EstimateHeader';
import { EstimateTable } from '../components/estimate/EstimateTable';
import { EstimateItemModal } from '../components/estimate/EstimateItemModal';
import { FileDropZone } from '../components/common/FileDropZone';
import { FilenameParserModal } from '../components/features/FilenameParserModal';
import { SmartPdfImporter } from '../components/features/SmartPdfImporter';

interface EstimateDetailProps {
  estimateId: string | null; 
  onBack: () => void; 
}

export function EstimateDetail({ estimateId, onBack }: EstimateDetailProps) {
  const {
    loading, clients, materials, companyRootPath,
    formData, setFormData,
    items, currentEstimateId,
    isItemModalOpen, setIsItemModalOpen,
    isOcrModalOpen, setIsOcrModalOpen,
    editingItem, // 모달에 전달
    droppedFiles, isParserOpen, setIsParserOpen,
    selectedItemIds,
    bulkWorkDays, setBulkWorkDays,
    fileInputRef,
    // Actions
    handleClientChange, handleSaveHeader, handleStatusChange,
    openItemModal, handleDeleteItem, handleDeleteSelected, handleBulkUpdateWorkDays,
    handleFilesDropped, openFileDialog, handleFileInputChange,
    handleParsedItemsConfirm, handleOcrConfirm,
    updateEstimateTotalAmount, fetchEstimateItems,
    saveFilesToStorage, handleDeleteExistingFile, handleOpenFile,
    toggleSelectAll, toggleSelectItem,
    totalAmount, convertedTotal, currencySymbol,
    discountPolicy, defaultHourlyRate
  } = useEstimateLogic(estimateId);

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
            <div className="flex items-center gap-2 mr-4 bg-white px-3 py-1 rounded border">
              <span className={`text-xs font-bold ${formData.status === 'SENT' ? 'text-green-600' : 'text-slate-500'}`}>
                {formData.status === 'SENT' ? '✅ 제출 완료' : '📝 작성 중'}
              </span>
              <button 
                onClick={() => handleStatusChange(formData.status === 'SENT' ? 'DRAFT' : 'SENT')}
                className={`text-xs px-2 py-0.5 rounded border ${formData.status === 'SENT' ? 'bg-slate-100' : 'bg-green-100 text-green-700 border-green-300'}`}
              >
                {formData.status === 'SENT' ? '취소' : '제출처리'}
              </button>
            </div>
          )}
          <button onClick={handleSaveHeader} className="px-4 py-2 bg-blue-600 text-white rounded font-bold hover:bg-blue-700">
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
               <span className="text-xl font-bold text-slate-600" style={{fontSize: '70%'}}>
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
    </div>
  );
}
// import { PageLayout } from '../components/common/PageLayout'; // Deprecated
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
import { ImportItemsModal } from '../components/estimate/ImportItemsModal'; // [New]
import { QuotationTemplate } from '../components/estimate/QuotationTemplate';
import { FileDropZone } from '../components/common/FileDropZone';
import { FilenameParserModal } from '../components/features/FilenameParserModal';
import { SmartPdfImporter } from '../components/features/SmartPdfImporter';
import { MobileModal } from '../components/common/MobileModal';
import { useReactToPrint } from 'react-to-print';
import { useRef, useState, useEffect, useMemo } from 'react';

export interface AttachedFile {
  id: string;
  file_name: string;
  file_path: string;
  file_type: string;
  file_size?: number;
  original_name?: string;
}

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
    totalAmount, convertedTotal, currencySymbol,
    discountPolicy, defaultHourlyRate,
    createOrderFromEstimate, generateProjectName
  } = useEstimateLogic(estimateId);

  // const [isTermModalOpen, setIsTermModalOpen] = useState(false); // Removed per user request
  const [isExcelModalOpen, setIsExcelModalOpen] = useState(false);
  // [New] Import Modal
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
    } catch (err: any) {
      alert('삭제 실패: ' + err.message);
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

  if (loading) return <div className="h-full flex items-center justify-center text-slate-500">데이터 로딩 중...</div>;

  return (
    <>
      <div className="h-[calc(100vh-64px)] md:h-full flex flex-col bg-slate-50 relative">
        <div className="flex-1 overflow-y-auto p-4 md:p-8 space-y-6">
          <PageHeader
            title={estimateId ? (formData.project_name || '견적서 수정') : '새 견적서 작성'}
            onBack={onBack}
            actions={
              <div className="flex flex-wrap items-center gap-4 justify-end">
                {/* Group 1: Primary Actions */}
                <div className="flex items-center gap-2">
                  <Button
                    onClick={handleSaveHeader}
                    variant="primary"
                    className={currentEstimateId ? 'bg-blue-600' : 'bg-blue-600'}
                  >
                    {currentEstimateId ? '저장됨' : '저장'}
                  </Button>
                </div>

                {/* Group 2: Options (Only if created) */}
                {currentEstimateId && (
                  <>
                    <div className="h-6 w-px bg-slate-300 mx-1 hidden md:block"></div>

                    <div className="flex items-center gap-2">
                      <label className="flex items-center gap-2 px-3 py-2 bg-yellow-50 border border-yellow-200 rounded-lg cursor-pointer hover:bg-yellow-100 transition-colors shrink-0 h-[38px]">
                        <input
                          type="checkbox"
                          checked={exportAsForeign}
                          onChange={e => setExportAsForeign(e.target.checked)}
                          className="w-4 h-4 text-yellow-600 accent-yellow-600 cursor-pointer"
                        />
                        <span className="text-xs font-bold text-yellow-800">외화({formData.currency})</span>
                      </label>
                    </div>

                    <div className="h-6 w-px bg-slate-300 mx-1 hidden md:block"></div>

                    {/* Group 3: Outputs */}
                    <div className="flex items-center gap-2">
                      <Button variant="success" size="sm" onClick={handleExcelClick} className="bg-emerald-600 hover:bg-emerald-700 text-white h-[38px] shadow-sm border-transparent">
                        💾 엑셀 저장
                      </Button>

                      <Button variant="primary" size="sm" onClick={() => setIsPreviewModalOpen(true)} className="bg-indigo-600 hover:bg-indigo-700 h-[38px]">
                        🖨️ 출력
                      </Button>
                    </div>

                    {/* Group 4: Workflow (Rightmost) */}
                    {(formData.status === 'SENT' || userRole === 'admin') && (
                      <>
                        <div className="h-6 w-px bg-slate-300 mx-1 hidden md:block"></div>
                        <div className="flex items-center gap-2">
                          {formData.status === 'SENT' && (
                            <Button variant="primary" size="sm" className="bg-purple-600 hover:bg-purple-700 h-[38px] shadow-sm animate-pulse"
                              style={{ animationDuration: '2s' }}
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

                          {(userRole === 'admin' || userRole === 'super_admin' || profile?.permissions?.can_delete_estimate) && (
                            <Button variant="danger" size="sm" onClick={handleDelete} className="h-[38px] opacity-70 hover:opacity-100">
                              🗑️
                            </Button>
                          )}
                        </div>
                      </>
                    )}
                  </>
                )}
              </div>
            }
          />

          <Section>
            <div className="flex flex-col xl:flex-row gap-4">
              <div className="flex-1">
                <Card className="h-full">
                  <div className="flex items-center gap-4 mb-4">
                    <h3 className="font-bold text-slate-700">프로젝트 정보</h3>
                    {currentEstimateId && (
                      <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-lg border border-slate-200 shadow-sm shrink-0">
                        <span className={`text-sm font-bold ${formData.status === 'SENT' ? 'text-green-600' : formData.status === 'ORDERED' ? 'text-purple-600' : 'text-slate-500'}`}>
                          {formData.status === 'SENT' ? '✓ 제출' : formData.status === 'ORDERED' ? '✓ 수주' : '✎ 작성'}
                        </span>
                        {formData.status !== 'ORDERED' && (
                          <button
                            onClick={(e) => { e.stopPropagation(); handleStatusChange(formData.status === 'SENT' ? 'DRAFT' : 'SENT'); }}
                            className={`text-sm px-3 py-1 rounded border font-bold transition-colors ${formData.status === 'SENT'
                              ? 'bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200'
                              : 'bg-green-50 text-green-600 border-green-200 hover:bg-green-100'
                              }`}
                          >
                            {formData.status === 'SENT' ? '취소' : '제출'}
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                  <EstimateHeader
                    clients={clients}
                    formData={formData}
                    setFormData={setFormData}
                    onClientChange={handleClientChange}
                    onGenerateProjectName={generateProjectName}
                  />
                </Card>
              </div>

              {currentEstimateId && (
                <div className="xl:w-[380px] shrink-0">
                  <div className="h-full flex flex-col" onClick={openFileDialog}>
                    <input type="file" multiple ref={fileInputRef} className="hidden" onChange={handleFileInputChange} />
                    <FileDropZone onFilesDropped={handleFilesDropped} className="flex-1 bg-blue-50 border-blue-200 hover:border-blue-400 hover:bg-blue-100 transition-colors" />
                    <p className="text-[10px] text-slate-400 text-center mt-1 truncate">
                      * 저장: {companyRootPath ? `...\\${new Date().getFullYear()}\\${formData.project_name || '...'}` : '(경로 미설정)'}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </Section>

          {/* Items Section */}
          <Section
            title={
              <div className="flex items-end gap-3">
                <div>
                  <h2 className="text-lg font-bold text-slate-700">견적 품목</h2>
                  <p className="text-xs text-slate-500 mt-1">품목을 추가하고 관리하세요.</p>
                </div>

                {/* Batch Actions (Always Visible) */}
                <div className="flex items-center gap-1 bg-indigo-50 p-1.5 rounded-lg border border-indigo-100 transition-opacity duration-200">
                  <span className="text-[10px] font-bold text-indigo-700 ml-1 whitespace-nowrap">소요일:</span>
                  <input
                    type="number"
                    className="w-10 border rounded text-xs p-1 text-center bg-white"
                    value={bulkWorkDays}
                    onChange={(e) => setBulkWorkDays(Number(e.target.value))}
                  />
                  <button
                    onClick={handleBulkUpdateWorkDays}
                    disabled={selectedItemIds.size === 0}
                    className={`px-2 py-1 text-[10px] font-bold rounded-md whitespace-nowrap transition-colors ${selectedItemIds.size > 0 ? 'bg-indigo-600 text-white hover:bg-indigo-700' : 'bg-indigo-200 text-indigo-50 cursor-not-allowed'
                      }`}
                  >
                    일괄 적용
                  </button>
                  <div className="w-[1px] h-4 bg-indigo-200 mx-1 shrink-0"></div>
                  <button
                    onClick={handleDeleteSelected}
                    disabled={selectedItemIds.size === 0}
                    className={`px-2 py-1 text-[10px] font-bold whitespace-nowrap transition-colors ${selectedItemIds.size > 0 ? 'text-red-500 hover:text-red-700' : 'text-slate-300 cursor-not-allowed'
                      }`}
                  >
                    삭제 ({selectedItemIds.size})
                  </button>
                </div>
              </div>
            }
            rightElement={
              <div className="flex flex-wrap gap-2 items-center">
                {/* Batch Actions Moved to Title */}

                <div className="flex gap-2">
                  <Button size="sm" variant="primary" className="bg-orange-500 hover:bg-orange-600" onClick={() => { if (!currentEstimateId) return alert('저장 후 가능'); setIsOcrModalOpen(true); }}>
                    ⚡ 도면 분석
                  </Button>
                  <Button size="sm" variant="primary" className="bg-cyan-600 hover:bg-cyan-700" onClick={() => { if (!currentEstimateId) return alert('저장 후 가능'); setIsImportModalOpen(true); }}>
                    📂 가져오기
                  </Button>
                  <Button size="sm" variant="success" onClick={() => { if (!currentEstimateId) return alert('저장 후 가능'); openItemModal(null); }}>
                    + 직접 추가
                  </Button>
                </div>
              </div>
            }
          >
            <Card noPadding>
              <EstimateTable
                items={items}
                materials={materials}
                postProcessings={postProcessings} // [New]
                heatTreatments={heatTreatments}   // [New]
                currency={formData.currency}
                exchangeRate={formData.exchange_rate}
                selectedItemIds={selectedItemIds}
                onToggleSelectAll={toggleSelectAll}
                onToggleSelectItem={toggleSelectItem}
                onEditItem={openItemModal}
                onDeleteItem={handleDeleteItem}
                onUpdateItem={handleUpdateItem}
                canViewMargins={userRole === 'admin' || userRole === 'super_admin' || profile?.permissions?.can_view_margins}
                timeStep={companyInfo?.default_time_step || 0.1} // [New]
              />
            </Card>
          </Section>
        </div>

        {/* Sticky Footer (Flex Item, relative) */}
        <div className="shrink-0 p-4 bg-white/80 backdrop-blur-md border-t border-slate-200 z-20 shadow-[0_-5px_20px_rgba(0,0,0,0.05)]">
          <div className="flex justify-end items-center gap-4 md:gap-8 max-w-7xl mx-auto">
            {formData.currency !== 'KRW' && (
              <div className="text-right">
                <span className="text-[10px] md:text-xs font-bold text-slate-500 block mb-0.5">외화 환산 금액 ({formData.currency})</span>
                <span className="text-sm md:text-lg font-bold text-slate-600">
                  {currencySymbol} {convertedTotal.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                </span>
              </div>
            )}
            <div className="text-right">
              <span className="text-[10px] md:text-xs font-bold text-slate-500 block mb-0.5">총 견적 금액 (KRW)</span>
              <span className="text-xl md:text-3xl font-black text-blue-700 tracking-tight">₩{totalAmount.toLocaleString()}</span>
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
        heatTreatments={heatTreatments} // [NEW]
        currency={formData.currency}
        exchangeRate={formData.exchange_rate}
        editingItem={editingItem}
        discountPolicy={discountPolicy}
        defaultHourlyRate={defaultHourlyRate}
        existingItems={items} // [Added] Duplicate Check
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
          // Transform and add items
          // Transform and add items
          const parsedItems = newItems.map(item => {
            // [Parse Spec String] e.g. "10x20x5" or "10-20-5"
            let w = 0, d = 0, h = 0;
            if (item.spec) {
              const nums = item.spec.match(/[\d.]+/g)?.map(Number) || [];
              if (nums.length >= 1) w = nums[0];
              if (nums.length >= 2) d = nums[1];
              if (nums.length >= 3) h = nums[2];
            }

            // [Resolve IDs from Text]
            const matName = item.material_text?.trim();
            const processName = item.post_process_text?.trim();
            const heatName = item.heat_treatment_text?.trim();

            let foundMatId = null;
            if (matName) {
              const foundMat = materials.find(m => m.name === matName || m.code === matName);
              if (foundMat) foundMatId = foundMat.id;
            }

            let foundProcessId = null;
            if (processName) {
              const foundProc = postProcessings.find(p => p.name === processName);
              if (foundProc) foundProcessId = foundProc.id;
            }

            let foundHeatId = null;
            if (heatName) {
              const foundHeat = heatTreatments.find(h => h.name === heatName);
              if (foundHeat) foundHeatId = foundHeat.id;
            }

            return {
              part_name: item.part_name || '',
              part_no: item.drawing_number || '',
              original_material_name: item.original_material_name || '', // [Mapped]
              spec_w: w,
              spec_d: d,
              spec_h: h,
              unit_price: item.unit_price,
              qty: item.qty,
              material_id: foundMatId, // [Resolved]
              post_processing_id: foundProcessId, // [Resolved]
              heat_treatment_id: foundHeatId, // [Resolved]
              files: []
              // Note: 'spec' property is intentionally OMITTED to avoid DB error
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

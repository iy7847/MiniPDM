import { useEffect, useState, useRef } from 'react';
import { supabase } from '../lib/supabaseClient';
import { EstimateHeader } from '../components/estimate/EstimateHeader';
import { EstimateTable } from '../components/estimate/EstimateTable';
import { EstimateItemModal } from '../components/estimate/EstimateItemModal';
import { FileDropZone } from '../components/common/FileDropZone';
import { FilenameParserModal } from '../components/features/FilenameParserModal';
import { Client, Material, EstimateItem, CURRENCY_SYMBOL, INITIAL_ITEM_FORM } from '../types/estimate';

// [수정] declare global 블록 삭제 (src/vite-env.d.ts에서 통합 관리되므로 충돌 방지)

interface EstimateDetailProps {
  estimateId: string | null; 
  onBack: () => void; 
}

export function EstimateDetail({ estimateId, onBack }: EstimateDetailProps) {
  const [loading, setLoading] = useState(false);
  const [clients, setClients] = useState<Client[]>([]);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [companyRootPath, setCompanyRootPath] = useState<string>(''); 
  const [defaultExchangeRate, setDefaultExchangeRate] = useState(1400.0);
  const [discountPolicy, setDiscountPolicy] = useState<any>(null);
  const [defaultHourlyRate, setDefaultHourlyRate] = useState(50000);
  
  const [formData, setFormData] = useState({
    client_id: '',
    project_name: '',
    currency: 'KRW',
    exchange_rate: 1.0,
    status: 'DRAFT',
  });

  const [items, setItems] = useState<EstimateItem[]>([]);
  const [currentEstimateId, setCurrentEstimateId] = useState<string | null>(estimateId);

  // 모달 및 선택 상태
  const [isItemModalOpen, setIsItemModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<EstimateItem | null>(null);
  
  const [droppedFiles, setDroppedFiles] = useState<File[]>([]);
  const [isParserOpen, setIsParserOpen] = useState(false);
  
  const [selectedItemIds, setSelectedItemIds] = useState<Set<string>>(new Set());
  const [bulkWorkDays, setBulkWorkDays] = useState(3);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchEstimateItems = async (estId: string) => {
    const { data: estItems, error } = await supabase
      .from('estimate_items')
      .select('*, files(id, file_name, file_type, file_path)')
      .eq('estimate_id', estId)
      .order('created_at', { ascending: true });
    
    if (error) console.error(error);

    if (estItems && companyRootPath && window.fileSystem) {
      const checkedItems = await Promise.all(estItems.map(async (item) => {
        const safeItem = { ...item, shape: item.shape || 'rect' };
        if (!safeItem.files || safeItem.files.length === 0) return safeItem;
        
        const checkedFiles = await Promise.all(safeItem.files.map(async (f: any) => {
          const exists = await window.fileSystem.checkFileExists(companyRootPath, f.file_path);
          return { ...f, exists_on_disk: exists };
        }));
        return { ...safeItem, files: checkedFiles };
      }));
      setItems(checkedItems);
    } else {
      setItems(estItems?.map(i => ({...i, shape: i.shape || 'rect'})) || []);
    }
  };

  const updateEstimateTotalAmount = async (estId: string) => {
    const { data: currentItems } = await supabase.from('estimate_items').select('supply_price').eq('estimate_id', estId);
    if (!currentItems) return;
    const total = currentItems.reduce((sum, item) => sum + (item.supply_price || 0), 0);
    await supabase.from('estimates').update({ total_amount: total, updated_at: new Date().toISOString() }).eq('id', estId);
  };

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      let rootPath = '';
      
      if (user) {
        const { data: profile } = await supabase.from('profiles').select('company_id').eq('id', user.id).single();
        if (profile) {
          const { data: company } = await supabase.from('companies').select('root_path, default_exchange_rate, discount_policy_json, default_hourly_rate').eq('id', profile.company_id).single();
          rootPath = company?.root_path || '';
          setCompanyRootPath(rootPath);
          if (company?.default_exchange_rate) setDefaultExchangeRate(company.default_exchange_rate);
          if (company?.discount_policy_json) setDiscountPolicy(company.discount_policy_json);
          if (company?.default_hourly_rate) setDefaultHourlyRate(company.default_hourly_rate);
        }
      }

      const [clientRes, matRes] = await Promise.all([
        supabase.from('clients').select('id, name, currency').order('name'),
        supabase.from('materials').select('id, name, code, density, unit_price').order('code')
      ]);
      setClients(clientRes.data || []);
      setMaterials(matRes.data || []);

      if (estimateId) {
        const { data: est } = await supabase.from('estimates').select('*').eq('id', estimateId).single();
        if (est) {
          setFormData({
            client_id: est.client_id,
            project_name: est.project_name,
            currency: est.currency,
            exchange_rate: est.base_exchange_rate || 1.0,
            status: est.status,
          });
          if (rootPath) {
             // rootPath loaded
          }
        }
      }
      setLoading(false);
    };
    fetchData();
  }, [estimateId]);
  
  useEffect(() => {
    if (currentEstimateId && companyRootPath) {
      fetchEstimateItems(currentEstimateId);
    }
  }, [currentEstimateId, companyRootPath]);

  // 공통 핸들러
  const handleClientChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const clientId = e.target.value;
    const client = clients.find(c => c.id === clientId);
    setFormData({
      ...formData,
      client_id: clientId,
      currency: client?.currency || 'KRW',
      exchange_rate: (client?.currency === 'KRW' ? 1.0 : defaultExchangeRate), 
    });
  };

  const handleSaveHeader = async () => {
    if (!formData.client_id || !formData.project_name) return alert('필수 항목을 입력해주세요.');
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const payload = {
      client_id: formData.client_id,
      project_name: formData.project_name,
      currency: formData.currency,
      base_exchange_rate: formData.exchange_rate,
      status: formData.status,
      updated_by: user.id,
      updated_at: new Date().toISOString(),
    };

    if (currentEstimateId) {
      await supabase.from('estimates').update(payload).eq('id', currentEstimateId);
    } else {
      const { data: profile } = await supabase.from('profiles').select('company_id').eq('id', user.id).single();
      const res = await supabase.from('estimates').insert([{ ...payload, company_id: profile?.company_id }]).select().single();
      if (res.data) setCurrentEstimateId(res.data.id);
    }
    alert('저장되었습니다.');
  };

  const handleStatusChange = async (newStatus: string) => {
    if (!currentEstimateId) return;
    const { error } = await supabase.from('estimates').update({ status: newStatus }).eq('id', currentEstimateId);
    if (!error) setFormData(prev => ({ ...prev, status: newStatus }));
  };

  // 아이템 액션 핸들러
  const openItemModal = (item: EstimateItem | null) => {
    setEditingItem(item);
    setIsItemModalOpen(true);
  };

  const handleDeleteItem = async (itemId: string) => {
    if(!window.confirm("삭제하시겠습니까?")) return;
    
    if (companyRootPath && window.fileSystem) {
       const { data: files } = await supabase.from('files').select('file_path').eq('estimate_item_id', itemId);
       if (files) {
         for (const f of files) await window.fileSystem.deleteFile(companyRootPath, f.file_path);
       }
    }
    
    await supabase.from('estimate_items').delete().eq('id', itemId);
    if (currentEstimateId) {
      await updateEstimateTotalAmount(currentEstimateId);
      await fetchEstimateItems(currentEstimateId);
    }
  };

  const handleDeleteSelected = async () => {
    if (selectedItemIds.size === 0) return;
    if (!window.confirm(`선택한 ${selectedItemIds.size}개 품목을 삭제하시겠습니까?`)) return;

    const ids = Array.from(selectedItemIds);
    
    if (companyRootPath && window.fileSystem) {
        const { data: files } = await supabase.from('files').select('file_path').in('estimate_item_id', ids);
        if (files) {
            for (const f of files) await window.fileSystem.deleteFile(companyRootPath, f.file_path);
        }
    }

    await supabase.from('estimate_items').delete().in('id', ids);

    if (currentEstimateId) {
      await updateEstimateTotalAmount(currentEstimateId);
      await fetchEstimateItems(currentEstimateId);
    }
    setSelectedItemIds(new Set()); 
  };
  
  const handleBulkUpdateWorkDays = async () => {
    if (selectedItemIds.size === 0) return;
    const ids = Array.from(selectedItemIds);
    await supabase.from('estimate_items').update({ work_days: bulkWorkDays }).in('id', ids);
    if (currentEstimateId) await fetchEstimateItems(currentEstimateId);
    setSelectedItemIds(new Set());
  };

  // 파일 처리 핸들러 (부모에서 정의하여 자식에게 전달)
  const saveFilesToStorage = async (itemId: string, files: File[]) => {
    if (!companyRootPath || !window.fileSystem) return;
    const { data: { user } } = await supabase.auth.getUser();

    for (const file of files) {
      const sourcePath = (file as any).path; 
      if (!sourcePath) continue;

      const now = new Date();
      const year = now.getFullYear().toString();
      const safeProjectName = formData.project_name.replace(/[^a-zA-Z0-9가-힣\s-_]/g, '').trim() || 'Untitled';
      const relativeFolder = `${year}\\${safeProjectName}`;

      const result = await window.fileSystem.saveFile(sourcePath, companyRootPath, relativeFolder);

      if (result.success) {
        const relativePath = `${relativeFolder}\\${file.name}`;
        const ext = file.name.split('.').pop()?.toUpperCase();
        let fileType = 'ETC';
        if (['PDF', 'DWG', 'DXF'].includes(ext || '')) fileType = '2D';
        else if (['STP', 'STEP', 'IGS', 'IGES', 'X_T'].includes(ext || '')) fileType = '3D';

        await supabase.from('files').insert({
          estimate_item_id: itemId,
          file_name: file.name,
          file_path: relativePath, 
          file_type: fileType,
          file_size: file.size,
          version: 1,
          is_current: true,
          updated_by: user?.id
        });
      }
    }
  };

  const handleDeleteExistingFile = async (fileId: string) => {
    const { data: file } = await supabase.from('files').select('file_path').eq('id', fileId).single();
    if (file && companyRootPath && window.fileSystem) {
        await window.fileSystem.deleteFile(companyRootPath, file.file_path);
    }
    await supabase.from('files').delete().eq('id', fileId);
  };

  const handleOpenFile = async (relativePath: string) => {
    if (!companyRootPath || !window.fileSystem) {
      alert('파일을 열 수 없습니다. (경로 미설정 또는 권한 없음)');
      return;
    }
    const result = await window.fileSystem.openFile(companyRootPath, relativePath);
    if (!result.success) {
      alert(`파일 열기 실패: ${result.error}`);
    }
  };

  // 파일 드롭 및 파싱
  const handleFilesDropped = (files: File[]) => {
    if (!currentEstimateId) return alert('먼저 견적서를 저장해주세요.');
    setDroppedFiles(files);
    setIsParserOpen(true);
  };

  const handleParsedItemsConfirm = async (parsedItems: any[]) => {
      const { data: { user } } = await supabase.auth.getUser();
      setLoading(true);
      try {
        let successCount = 0;
        for (const pItem of parsedItems) {
          const { files, ...rest } = pItem;
          // tempFiles, files 제외
          const { tempFiles: _tf, files: _f, ...cleanInitial } = INITIAL_ITEM_FORM;
          
          const itemPayload = { 
            ...cleanInitial, ...rest, 
            estimate_id: currentEstimateId, updated_by: user?.id, qty: rest.qty || 1, material_id: rest.material_id || null 
          };
          
          const { data: savedItem, error: itemError } = await supabase.from('estimate_items').insert([itemPayload]).select().single();
          if (itemError) { console.error('Item save error:', itemError); continue; }
          
          successCount++;
          if (savedItem && files && files.length > 0) { await saveFilesToStorage(savedItem.id, files); }
        }
        alert('등록 완료');
        if (currentEstimateId) {
            await updateEstimateTotalAmount(currentEstimateId);
            await fetchEstimateItems(currentEstimateId);
        }
        setIsParserOpen(false);
      } catch (error: any) { alert(`오류: ${error.message}`); } finally { setLoading(false); }
    };
    
  // Footer용 총액 및 환산 금액 계산
  const totalAmount = items.reduce((sum, item) => sum + (item.supply_price || 0), 0);
  
  // 원화(KRW)를 외화로 환산 (나누기 연산)
  const convertedTotal = formData.currency !== 'KRW' && formData.exchange_rate > 0 
    ? totalAmount / formData.exchange_rate 
    : 0;
    
  const currencySymbol = CURRENCY_SYMBOL[formData.currency] || formData.currency;

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
          <div className="animate-fade-in-down" onClick={() => fileInputRef.current?.click()}>
            <input type="file" multiple ref={fileInputRef} className="hidden" onChange={(e) => { if(e.target.files?.length) handleFilesDropped(Array.from(e.target.files)); e.target.value=''; }} />
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
              <button onClick={() => { if (!currentEstimateId) return alert('먼저 견적서를 저장해주세요.'); openItemModal(null); }} className="px-3 py-1.5 bg-green-600 text-white text-sm font-bold rounded hover:bg-green-700 shadow-sm">+ 품목 직접 추가</button>
            </div>
          </div>
          
          <EstimateTable 
            items={items}
            materials={materials}
            currency={formData.currency}
            exchangeRate={formData.exchange_rate}
            selectedItemIds={selectedItemIds}
            onToggleSelectAll={(checked) => setSelectedItemIds(checked ? new Set(items.map(i => i.id!)) : new Set())}
            onToggleSelectItem={(id) => { const n = new Set(selectedItemIds); n.has(id) ? n.delete(id) : n.add(id); setSelectedItemIds(n); }}
            onEditItem={openItemModal}
            onDeleteItem={handleDeleteItem}
          />
        </div>
      </div>

      {/* 5. 하단 Footer (총액 표시) */}
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
    </div>
  );
}
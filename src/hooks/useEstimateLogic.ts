import { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabaseClient';
import { Client, Material, EstimateItem, INITIAL_ITEM_FORM, CURRENCY_SYMBOL, DEFAULT_QUOTATION_TERMS, ExcelExportPreset } from '../types/estimate';
import { exportEstimateToExcel } from '../utils/excelExport';

export function useEstimateLogic(estimateId: string | null) {
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

  const [quotationTerms, setQuotationTerms] = useState(DEFAULT_QUOTATION_TERMS);
  const [companyInfo, setCompanyInfo] = useState<any>(null);

  const [excelPresets, setExcelPresets] = useState<ExcelExportPreset[]>([]);

  const [items, setItems] = useState<EstimateItem[]>([]);
  const [currentEstimateId, setCurrentEstimateId] = useState<string | null>(estimateId);

  // 모달 및 선택 상태
  const [isItemModalOpen, setIsItemModalOpen] = useState(false);
  const [isOcrModalOpen, setIsOcrModalOpen] = useState(false);
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);

  const [itemForm, setItemForm] = useState<EstimateItem>(INITIAL_ITEM_FORM);
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
      setItems(estItems?.map(i => ({ ...i, shape: i.shape || 'rect' })) || []);
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
      let currentCompanyInfo: any = null;

      if (user) {
        const { data: profile } = await supabase.from('profiles').select('company_id').eq('id', user.id).single();
        if (profile) {
          const { data: company } = await supabase.from('companies').select('*').eq('id', profile.company_id).single();
          setCompanyInfo(company);
          currentCompanyInfo = company;
          rootPath = company?.root_path || '';
          setCompanyRootPath(rootPath);

          if (company?.default_exchange_rate) setDefaultExchangeRate(company.default_exchange_rate);
          if (company?.discount_policy_json) setDiscountPolicy(company.discount_policy_json);
          if (company?.default_hourly_rate) setDefaultHourlyRate(company.default_hourly_rate);

          const { data: presets } = await supabase.from('excel_export_presets').select('*').eq('company_id', profile.company_id).order('created_at');
          setExcelPresets(presets || []);
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

          setQuotationTerms({
            quotation_no: est.quotation_no || '',
            payment_terms: est.payment_terms || DEFAULT_QUOTATION_TERMS.payment_terms,
            incoterms: est.incoterms || DEFAULT_QUOTATION_TERMS.incoterms,
            delivery_period: est.delivery_period || DEFAULT_QUOTATION_TERMS.delivery_period,
            destination: est.destination || '',
            validity: est.validity || DEFAULT_QUOTATION_TERMS.validity,
            note: est.note || DEFAULT_QUOTATION_TERMS.note,
            template_type: est.template_type || currentCompanyInfo?.quotation_template_type || 'A'
          });
        }
      } else {
        setQuotationTerms(prev => ({
          ...prev,
          template_type: currentCompanyInfo?.quotation_template_type || 'A'
        }));
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

  // Actions
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

  const handleSaveTerms = async (terms: any) => {
    if (!currentEstimateId) return;
    const { error } = await supabase.from('estimates').update(terms).eq('id', currentEstimateId);
    if (error) alert('조건 저장 실패: ' + error.message);
    else {
      setQuotationTerms(prev => ({ ...prev, ...terms }));
      alert('견적 조건이 저장되었습니다.');
    }
  };

  // [수정] 엑셀 내보내기 핸들러 (외화 옵션 추가)
  const handleExportExcel = async (presetId: string, asForeignCurrency: boolean = false) => {
    const preset = excelPresets.find(p => p.id === presetId);
    if (!preset) return alert('프리셋을 찾을 수 없습니다.');

    // 데이터 매핑 및 환율 적용
    const rate = formData.exchange_rate > 0 ? formData.exchange_rate : 1;

    const itemsWithDetails = items.map(item => {
      const mat = materials.find(m => m.id === item.material_id);

      // 외화로 저장 시 금액 변환
      const finalUnitPrice = asForeignCurrency ? (item.unit_price / rate) : item.unit_price;
      const finalSupplyPrice = asForeignCurrency ? (item.supply_price / rate) : item.supply_price;

      return {
        ...item,
        // 엑셀 출력용 값 덮어쓰기
        unit_price: Number(finalUnitPrice.toFixed(2)),
        supply_price: Number(finalSupplyPrice.toFixed(2)),
        material_name: mat ? `${mat.code}(${mat.name})` : (item.original_material_name || ''),
      };
    });

    const suffix = asForeignCurrency ? `(${formData.currency})` : '(KRW)';
    await exportEstimateToExcel(itemsWithDetails, preset.columns, `${formData.project_name}_${suffix}`);
  };

  const openItemModal = (item: EstimateItem | null) => {
    setEditingItem(item);
    setIsItemModalOpen(true);
  };

  const saveFilesToStorage = async (itemId: string, files: File[]) => {
    if (!companyRootPath || !window.fileSystem) return;
    const { data: { user } } = await supabase.auth.getUser();

    for (const file of files) {
      const sourcePath = (file as any).path;
      let result;
      const now = new Date();
      const year = now.getFullYear().toString();
      const safeProjectName = formData.project_name.replace(/[^a-zA-Z0-9가-힣\s-_]/g, '').trim() || 'Untitled';
      const relativeFolder = `${year}\\${safeProjectName}`;

      if (sourcePath) {
        result = await window.fileSystem.saveFile(sourcePath, companyRootPath, relativeFolder);
      } else {
        const arrayBuffer = await file.arrayBuffer();
        const fileData = new Uint8Array(arrayBuffer);
        result = await (window as any).fileSystem.writeFile(fileData, file.name, companyRootPath, relativeFolder);
      }

      if (result && result.success) {
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
      alert('파일을 열 수 없습니다.');
      return;
    }
    const result = await window.fileSystem.openFile(companyRootPath, relativePath);
    if (!result.success) alert(`파일 열기 실패: ${result.error}`);
  };

  const deleteItemWithFiles = async (itemIds: string[]) => {
    if (!companyRootPath || !window.fileSystem) {
      await supabase.from('estimate_items').delete().in('id', itemIds);
      return;
    }
    const { data: filesToDelete } = await supabase.from('files').select('file_path').in('estimate_item_id', itemIds);

    if (filesToDelete) {
      for (const f of filesToDelete) {
        await window.fileSystem.deleteFile(companyRootPath, f.file_path);
      }
    }
    await supabase.from('estimate_items').delete().in('id', itemIds);
  };

  const handleDeleteItem = async (itemId: string) => {
    if (!window.confirm("삭제하시겠습니까?")) return;
    await deleteItemWithFiles([itemId]);
    if (currentEstimateId) {
      await updateEstimateTotalAmount(currentEstimateId);
      await fetchEstimateItems(currentEstimateId);
    }
  };

  const handleDeleteSelected = async () => {
    if (selectedItemIds.size === 0) return;
    if (!window.confirm(`선택한 ${selectedItemIds.size}개 품목을 삭제하시겠습니까?`)) return;

    const ids = Array.from(selectedItemIds);
    await deleteItemWithFiles(ids);

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

  const handleFilesDropped = (files: File[]) => {
    if (!currentEstimateId) return alert('먼저 견적서를 저장해주세요.');
    setDroppedFiles(files);
    setIsParserOpen(true);
  };

  const openFileDialog = () => { if (fileInputRef.current) fileInputRef.current.click(); };
  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) handleFilesDropped(Array.from(e.target.files));
    e.target.value = '';
  };

  const handleParsedItemsConfirm = async (parsedItems: any[]) => {
    const { data: { user } } = await supabase.auth.getUser();
    setLoading(true);
    try {
      let successCount = 0;
      for (const pItem of parsedItems) {
        const { files, ...rest } = pItem;
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

  const handleOcrConfirm = async (results: any[]) => {
    if (!currentEstimateId) return alert('먼저 견적서를 저장해주세요.');
    const { data: { user } } = await supabase.auth.getUser();
    setLoading(true);
    try {
      let successCount = 0;
      for (const res of results) {
        const { files, ...rest } = res;
        const { tempFiles: _tf, files: _f, ...cleanInitial } = INITIAL_ITEM_FORM;
        const itemPayload = {
          ...cleanInitial, estimate_id: currentEstimateId,
          part_no: rest.part_no || '', part_name: rest.part_name || '도면 참조',
          qty: 1, updated_by: user?.id, material_id: null
        };
        const { data: savedItem, error: itemError } = await supabase.from('estimate_items').insert([itemPayload]).select().single();
        if (itemError) { console.error('OCR Item Save Error:', itemError); continue; }
        successCount++;
        if (savedItem && files && files.length > 0) { await saveFilesToStorage(savedItem.id, files); }
      }
      alert(`${successCount}개 품목이 등록되었습니다.`);
      await fetchEstimateItems(currentEstimateId);
      await updateEstimateTotalAmount(currentEstimateId);
    } catch (err: any) {
      alert(`저장 실패: ${err.message}`);
    } finally {
      setLoading(false);
      setIsOcrModalOpen(false);
    }
  };

  const toggleSelectAll = (checked: boolean) => checked ? setSelectedItemIds(new Set(items.map(i => i.id!))) : setSelectedItemIds(new Set());
  const toggleSelectItem = (id: string) => {
    const newSet = new Set(selectedItemIds);
    if (newSet.has(id)) newSet.delete(id); else newSet.add(id);
    setSelectedItemIds(newSet);
  };

  const totalAmount = items.reduce((sum, item) => sum + (item.supply_price || 0), 0);
  const convertedTotal = formData.currency !== 'KRW' && formData.exchange_rate > 0 ? totalAmount / formData.exchange_rate : 0;
  const currencySymbol = CURRENCY_SYMBOL[formData.currency] || formData.currency;

  const createOrderFromEstimate = async () => {
    if (!currentEstimateId) return;
    if (items.length === 0) return alert('품목이 없습니다.');

    // 1. Create Order Head
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return alert('로그인이 필요합니다.');
    const { data: profile } = await supabase.from('profiles').select('company_id').eq('id', user.id).single();

    const orderPayload = {
      company_id: profile?.company_id,
      client_id: formData.client_id,
      estimate_id: currentEstimateId,
      po_no: `PO-${new Date().getTime().toString().substr(-6)}`, // Short Temp PO No
      order_date: new Date().toISOString(),
      delivery_date: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
      status: 'ORDERED',
      currency: formData.currency,
      exchange_rate: formData.exchange_rate || 1,
      total_amount: totalAmount,
      updated_by: user?.id,
      updated_at: new Date().toISOString(),
    };

    const { data: newOrder, error: orderError } = await supabase.from('orders').insert([orderPayload]).select().single();

    if (orderError) {
      alert('수주 생성 실패: ' + orderError.message);
      return null;
    }

    // 2. Copy Items
    const orderItems = items.map(item => ({
      order_id: newOrder.id,
      estimate_item_id: item.id,
      part_name: item.part_name,
      part_no: item.part_no,
      spec: `${item.spec_w}x${item.spec_d}x${item.spec_h}`,
      material_name: item.material_id ? materials.find(m => m.id === item.material_id)?.code : item.original_material_name,
      qty: item.qty,
      unit_price: item.unit_price,
      supply_price: item.supply_price,
      process_status: 'WAITING',
      work_days: item.work_days
    }));

    const { error: itemsError } = await supabase.from('order_items').insert(orderItems);

    if (itemsError) {
      alert('품목 복사 실패: ' + itemsError.message);
    }
    return newOrder.id;
  };

  return {
    loading, clients, materials, companyRootPath, defaultExchangeRate, discountPolicy, defaultHourlyRate,
    formData, setFormData,
    items, currentEstimateId,
    isItemModalOpen, setIsItemModalOpen,
    isOcrModalOpen, setIsOcrModalOpen,
    isPreviewModalOpen, setIsPreviewModalOpen,
    editingItem, setEditingItem,
    itemForm, setItemForm,
    droppedFiles, isParserOpen, setIsParserOpen,
    selectedItemIds, setSelectedItemIds,
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
    handleSaveTerms, createOrderFromEstimate,
    toggleSelectAll, toggleSelectItem,
    totalAmount, convertedTotal, currencySymbol
  };
}
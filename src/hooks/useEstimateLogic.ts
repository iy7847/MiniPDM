import { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabaseClient';
import { Client, Material, EstimateItem, INITIAL_ITEM_FORM, CURRENCY_SYMBOL, DEFAULT_QUOTATION_TERMS, ExcelExportPreset, PostProcessing, DIFFICULTY_FACTOR, HeatTreatment } from '../types/estimate';
import { exportEstimateToExcel } from '../utils/excelExport';
import { calculateDiscountRate } from '../utils/estimateUtils';

export function useEstimateLogic(estimateId: string | null) {
  const [loading, setLoading] = useState(false);
  const [clients, setClients] = useState<Client[]>([]);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [postProcessings, setPostProcessings] = useState<PostProcessing[]>([]);
  const [heatTreatments, setHeatTreatments] = useState<HeatTreatment[]>([]); // [NEW]
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
          if (company) {
            setCompanyInfo(company); // Ensure companyInfo is set with all fields
            currentCompanyInfo = company;
            rootPath = company?.root_path || '';
            setCompanyRootPath(rootPath);

            if (company?.default_exchange_rate) setDefaultExchangeRate(company.default_exchange_rate);
            if (company?.discount_policy_json) setDiscountPolicy(company.discount_policy_json);
            setDefaultHourlyRate(company.default_hourly_rate || 50000);

            const { data: presets } = await supabase.from('excel_export_presets').select('*').eq('company_id', profile.company_id).order('created_at');
            setExcelPresets(presets || []);

            // [변경] 회사 ID로 필터링하여 기초 데이터 조회
            const [clientRes, matRes, ppRes, htRes] = await Promise.all([
              supabase.from('clients').select('id, name, currency').eq('company_id', profile.company_id).order('name'),
              supabase.from('materials').select('id, name, code, density, unit_price').eq('company_id', profile.company_id).order('code'),
              supabase.from('post_processings').select('*').eq('company_id', profile.company_id).order('name'),
              supabase.from('heat_treatments').select('*').eq('company_id', profile.company_id).order('name') // [NEW]
            ]);
            setClients(clientRes.data || []);
            setMaterials(matRes.data || []);
            setPostProcessings(ppRes.data || []);
            setHeatTreatments(htRes.data || []); // [NEW]

            const { data: est } = estimateId ? await supabase.from('estimates').select('*').eq('id', estimateId).single() : { data: null };
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
                payment_terms: est.payment_terms || currentCompanyInfo?.default_payment_terms || DEFAULT_QUOTATION_TERMS.payment_terms,
                incoterms: est.incoterms || currentCompanyInfo?.default_incoterms || DEFAULT_QUOTATION_TERMS.incoterms,
                delivery_period: est.delivery_period || currentCompanyInfo?.default_delivery_period || DEFAULT_QUOTATION_TERMS.delivery_period,
                destination: est.destination || currentCompanyInfo?.default_destination || '',
                validity: est.validity || DEFAULT_QUOTATION_TERMS.validity,
                note: est.note || currentCompanyInfo?.default_note || DEFAULT_QUOTATION_TERMS.note,
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
        }
      }
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

  // [Auto Generate Project Name]
  const generateProjectName = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data: profile } = await supabase.from('profiles').select('company_id').eq('id', user.id).single();
    if (!profile) return;

    const now = new Date();
    const year = now.getFullYear().toString().slice(2);
    const month = (now.getMonth() + 1).toString().padStart(2, '0');
    const day = now.getDate().toString().padStart(2, '0');
    const prefix = `ES${year}${month}${day}`;

    // Find latest sequence for today
    const { data: latest } = await supabase
      .from('estimates')
      .select('project_name')
      .eq('company_id', profile.company_id)
      .ilike('project_name', `${prefix}%`)
      .order('project_name', { ascending: false })
      .limit(1)
      .maybeSingle();

    let seq = 1;
    if (latest && latest.project_name) {
      // ES240102-001
      const parts = latest.project_name.split('-');
      if (parts.length === 2 && !isNaN(Number(parts[1]))) {
        seq = Number(parts[1]) + 1;
      }
    }

    const newName = `${prefix}-${seq.toString().padStart(3, '0')}`;
    setFormData(prev => ({ ...prev, project_name: newName }));
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

    // [Validation] If submitting (SENT), check for zero-price items
    if (newStatus === 'SENT') {
      const zeroPriceItems = items.filter(i => (i.unit_price || 0) === 0);
      if (zeroPriceItems.length > 0) {
        alert(`단가가 0원인 품목이 ${zeroPriceItems.length}개 있습니다.\n모든 품목의 단가를 입력해야 제출(완료)할 수 있습니다.`);
        return;
      }
    }

    const { error } = await supabase.from('estimates').update({ status: newStatus, updated_at: new Date().toISOString() }).eq('id', currentEstimateId);
    if (error) {
      console.error('Status check error:', error);
      alert('상태 변경 실패: ' + error.message);
    } else {
      setFormData(prev => ({ ...prev, status: newStatus as any }));
    }
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

  // [New] Inline Edit Handler
  const handleUpdateItem = async (itemId: string, updates: Partial<EstimateItem>) => {
    const item = items.find(i => i.id === itemId);
    if (!item) return;

    // Merge updates
    const newItem = { ...item, ...updates };

    // Helper: Calculate Weight
    let weight = 0;
    const mat = materials.find(m => m.id === newItem.material_id);
    if (mat) {
      if (newItem.shape === 'rect' && newItem.raw_w && newItem.raw_d && newItem.raw_h) {
        weight = (newItem.raw_w * newItem.raw_d * newItem.raw_h * mat.density) / 1000000;
      } else if (newItem.shape === 'round' && newItem.raw_w && newItem.raw_d) {
        const r = newItem.raw_w / 2;
        weight = (Math.PI * r * r * newItem.raw_d * mat.density) / 1000000;
      }
    }

    // Recalculate logic
    // 1. Processing Cost
    const factor = DIFFICULTY_FACTOR[newItem.difficulty] || 1.2;
    // @ts-ignore
    const procCost = (newItem.process_time || 0) * (newItem.hourly_rate || defaultHourlyRate) * factor;

    // 2. Costs (Recalc if IDs changed)
    const matCost = newItem.material_cost || 0; // Usually fixed unless material/spec changes (which is hard to do inline without complex logic)

    let postProcCost = newItem.post_process_cost || 0;
    if ('post_processing_id' in updates) {
      // Find price per kg
      const pp = postProcessings.find(p => p.id === newItem.post_processing_id);
      postProcCost = pp ? (pp.price_per_kg * weight) : 0;
    }

    let heatTreatCost = newItem.heat_treatment_cost || 0;
    if ('heat_treatment_id' in updates) {
      const ht = heatTreatments.find(h => h.id === newItem.heat_treatment_id);
      heatTreatCost = ht ? (ht.price_per_kg * weight) : 0;
    }

    // Recalculate if process_time was updated or difficulty changed
    const finalProcCost = ('process_time' in updates || 'difficulty' in updates) ? procCost : (newItem.processing_cost || 0);

    const baseTotal = matCost + finalProcCost + postProcCost + heatTreatCost;

    // 3. Profit
    const profitRate = newItem.profit_rate || 0;
    const profitAmount = baseTotal * (profitRate / 100);
    const subTotal = baseTotal + profitAmount;

    // [Rounding Logic] Ceil to Configured Unit (Default 1000)
    const activePolicy = discountPolicy || {};
    const appRate = calculateDiscountRate(activePolicy, newItem.difficulty, newItem.qty);
    const rawUnitPrice = subTotal * (appRate / 100);

    const roundingUnit = companyInfo?.default_rounding_unit || 1000;
    const finalUnitPrice = Math.ceil(rawUnitPrice / roundingUnit) * roundingUnit;

    const finalSupplyPrice = finalUnitPrice * newItem.qty;

    // Prepare Payload
    const payload: any = {
      ...updates,
      updated_by: (await supabase.auth.getUser()).data.user?.id,
      updated_at: new Date().toISOString()
    };

    if ('process_time' in updates || 'difficulty' in updates) {
      payload.processing_cost = Math.round(finalProcCost);
    }
    if ('post_processing_id' in updates) {
      payload.post_process_cost = Math.round(postProcCost);
    }
    if ('heat_treatment_id' in updates) {
      payload.heat_treatment_cost = Math.round(heatTreatCost);
    }

    // Always recalc totals if any relevant field changed
    if ('process_time' in updates || 'profit_rate' in updates || 'difficulty' in updates || 'post_processing_id' in updates || 'heat_treatment_id' in updates) {
      payload.unit_price = finalUnitPrice;
      payload.supply_price = finalSupplyPrice;
    }

    // Optimistic Update
    setItems(items.map(i => i.id === itemId ? { ...i, ...payload } : i));

    // DB Update
    const { error } = await supabase.from('estimate_items').update(payload).eq('id', itemId);

    if (error) {
      console.error('Failed to update item:', error);
      // Revert on error? For now just fetch
      if (currentEstimateId) await fetchEstimateItems(currentEstimateId);
    } else {
      // Update Total Amount
      if (currentEstimateId) await updateEstimateTotalAmount(currentEstimateId);
    }
  };

  const handleFilesDropped = async (files: File[]) => {
    if (!currentEstimateId) return alert('먼저 견적서를 저장해주세요.');

    const newDroppedFiles: File[] = [];
    let autoLinkedCount = 0;

    for (const file of files) {
      // 1. Check for filename match (Part No)
      const fileNameNoExt = file.name.substring(0, file.name.lastIndexOf('.'));

      // Find item with exact Part No match (Case insensitive? Let's go exact first, maybe upper)
      // User request: "filename (excluding extension) same as estimate list part number"
      const matchedItem = items.find(i => i.part_no === fileNameNoExt);

      if (matchedItem) {
        // 2. Auto Link
        try {
          await saveFilesToStorage(matchedItem.id!, [file]);
          autoLinkedCount++;
        } catch (e) {
          console.error(`Failed to auto-link file ${file.name}:`, e);
          newDroppedFiles.push(file); // Fallback to manual
        }
      } else {
        newDroppedFiles.push(file);
      }
    }

    if (autoLinkedCount > 0) {
      alert(`${autoLinkedCount}개 파일이 도번과 일치하여 자동으로 연결되었습니다.`);
      await fetchEstimateItems(currentEstimateId);
    }

    if (newDroppedFiles.length > 0) {
      setDroppedFiles(newDroppedFiles);
      setIsParserOpen(true);
    }
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

        // [Modified] Duplicate Check
        const existingItem = items.find(i => i.part_no && i.part_no === itemPayload.part_no);

        if (existingItem) {
          // Strict duplicate block as requested
          alert(`중복된 도번이 존재합니다: ${itemPayload.part_no}\n해당 품목은 건너뜁니다.`);
          continue;
        }

        const { data: savedItem, error: itemError } = await supabase.from('estimate_items').insert([itemPayload]).select().single();
        if (itemError) { console.error('Item save error:', itemError); continue; }

        successCount++;
        if (savedItem && files && files.length > 0) { await saveFilesToStorage(savedItem.id, files); }
      }
      alert('완료되었습니다.');
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

        // [Duplicate Check]
        if (items.some(i => i.part_no === itemPayload.part_no)) {
          alert(`중복된 도번이 존재합니다: ${itemPayload.part_no}\n해당 품목은 건너뜁니다.`);
          continue;
        }

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

    // 0. Determine Items to Order (Partial vs All)
    let targetItems: EstimateItem[] = [];
    if (selectedItemIds.size > 0) {
      if (!confirm(`선택한 ${selectedItemIds.size}개 품목만 수주 등록하시겠습니까?`)) return;
      targetItems = items.filter(i => selectedItemIds.has(i.id!));
    } else {
      if (!confirm('전체 품목을 수주 등록하시겠습니까?')) return;
      targetItems = [...items];
    }

    if (targetItems.length === 0) return;

    // 1. Create Order Head
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return alert('로그인이 필요합니다.');
    const { data: profile } = await supabase.from('profiles').select('company_id').eq('id', user.id).single();

    // Generate PO No (POYYMMDD-XXX)
    const today = new Date();
    const yymmdd = today.toISOString().slice(2, 10).replace(/-/g, ''); // YYMMDD

    // Get count of orders for today to determine sequence
    const { count } = await supabase
      .from('orders')
      .select('*', { count: 'exact', head: true })
      .like('po_no', `PO${yymmdd}%`);

    const sequence = (count || 0) + 1;
    const poNo = `PO${yymmdd}-${sequence.toString().padStart(3, '0')}`;

    const orderDeliveryDate = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString();

    const orderPayload = {
      company_id: profile?.company_id,
      client_id: formData.client_id,
      estimate_id: currentEstimateId,
      po_no: poNo, // Updated Format
      order_date: new Date().toISOString(),
      delivery_date: orderDeliveryDate,
      status: 'ORDERED',
      currency: formData.currency,
      exchange_rate: formData.exchange_rate || 1,
      total_amount: targetItems.reduce((sum, i) => sum + (i.supply_price || 0), 0),
      updated_by: user?.id,
      updated_at: new Date().toISOString(),
    };

    const { data: newOrder, error: orderError } = await supabase.from('orders').insert([orderPayload]).select().single();

    if (orderError) {
      alert('수주 생성 실패: ' + orderError.message);
      return null;
    }

    // 2. Process Items & Copy Files
    let successCount = 0;

    // Preparation for file copy
    if (!companyRootPath || !window.fileSystem) {
      console.warn("File system not available, skipping file copy.");
    }

    for (const item of targetItems) {
      try {
        // 2.1 Insert Order Item
        const orderItemPayload = {
          order_id: newOrder.id,
          estimate_item_id: item.id,
          part_name: item.part_name,
          part_no: item.part_no,
          spec: `${item.spec_w}x${item.spec_d}x${item.spec_h}`,
          material_name: item.material_id ? materials.find(m => m.id === item.material_id)?.code : item.original_material_name,
          post_processing_name: item.post_processing_id ? postProcessings.find(p => p.id === item.post_processing_id)?.name : null, // [Added]
          qty: item.qty,
          unit_price: item.unit_price,
          supply_price: item.supply_price,
          process_status: 'WAITING',
          work_days: item.work_days,
          due_date: orderDeliveryDate.split('T')[0] // [Added] Default Item Delivery Date
        };

        const { data: newOrderItem, error: itemErr } = await supabase.from('order_items').insert([orderItemPayload]).select().single();
        if (itemErr) throw itemErr;

        // 2.2 Copy Files (Physical Copy)
        if (item.files && item.files.length > 0 && companyRootPath && window.fileSystem) {
          const now = new Date();
          const year = now.getFullYear().toString();
          // Order Folder Structure: Year / Order_PO / PartNo_OR_Name
          const safePoStr = poNo.replace(/[^a-zA-Z0-9_-]/g, '');
          const safePartStr = (item.part_no || item.part_name || 'Item').replace(/[^a-zA-Z0-9가-힣\s-_]/g, '').trim();
          const relativeFolder = `${year}\\Orders\\${safePoStr}\\${safePartStr}`;

          for (const file of item.files) {
            // Construct absolute source path
            // Note: 'file.file_path' in DB relative path. Ensure cleaner path joining.
            // Replace forward slashes with backslashes for Windows consistency
            const normalizedFilePath = file.file_path.replace(/\//g, '\\');
            const sourceFullPath = `${companyRootPath.replace(/\/$/, '').replace(/\\$/, '')}\\${normalizedFilePath.replace(/^\//, '').replace(/^\\/, '')}`;

            console.log(`[FileCopy] Unnormalized: ${file.file_path}`);
            console.log(`[FileCopy] Source: ${sourceFullPath}, DestFolder: ${relativeFolder}`);

            // Check if source exists
            const exists = await window.fileSystem.checkFileExists(companyRootPath, normalizedFilePath);
            if (exists) {
              // Copy
              const copyResult = await window.fileSystem.saveFile(sourceFullPath, companyRootPath, relativeFolder);

              if (copyResult.success) {
                console.log(`[FileCopy] Success: ${copyResult.savedPath}`);
                // Insert into files table linked to order_item_id
                const newRelativePath = `${relativeFolder}\\${file.file_name}`;
                const filePayload = {
                  order_item_id: newOrderItem.id, // Linked to Order Item
                  estimate_item_id: null, // Distinct from estimate
                  file_name: file.file_name,
                  file_path: newRelativePath.replace(/\\/g, '/'), // Store as forward slash for DB consistency if preferred
                  file_type: file.file_type,
                  file_size: file.file_size,
                  original_name: file.original_name || file.file_name,
                  version: 1,
                  is_current: true,
                  updated_by: user.id
                };
                console.log('[FileInsert] Payload:', filePayload);
                const { error: fileInsertError } = await supabase.from('files').insert(filePayload);
                if (fileInsertError) {
                  console.error('[FileInsert] Error:', fileInsertError);
                  // Retry without optional fields if failed? No, 400 usually means schema mismatch.
                }
              } else {
                console.error(`[FileCopy] Failed to save file: ${copyResult.error}`);
              }
            } else {
              console.warn(`[FileCopy] Source file not found: ${sourceFullPath}`);
            }
          }
        }
        successCount++;
      } catch (err: any) {
        console.error(`Item processing failed for ${item.part_name}:`, err);
      }
    }

    // 3. Update Estimate Status (Logic: if ALL items are ordered? For now just set to ORDERED if at least one)
    // Maybe we should fetch all estimate items and check if all have linked order items?
    // For simplicity, just set status to ORDERED.
    const { error: statusError } = await supabase
      .from('estimates')
      .update({ status: 'ORDERED', updated_at: new Date().toISOString() })
      .eq('id', currentEstimateId);

    if (statusError) {
      console.error('상태 업데이트 실패:', statusError);
    } else {
      setFormData(prev => ({ ...prev, status: 'ORDERED' }));
    }

    alert(`수주가 생성되었습니다. (${successCount}/${targetItems.length} 품목)`);
    return newOrder.id;
  };

  return {
    loading, clients, materials, postProcessings, companyRootPath, defaultExchangeRate, discountPolicy, defaultHourlyRate,
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
    // Data
    // materials, postProcessings, clients, excelPresets are already included above?
    // references line 36 destructuring? No this is return.

    // Check duplication. 
    // It seems I have them added in Step 368 and they were already there?
    // Let's just keep one set.
    heatTreatments, // [NEW]
    excelPresets,
    quotationTerms, setQuotationTerms,
    companyInfo,
    handleExportExcel,
    // Actions
    handleClientChange, handleSaveHeader, handleStatusChange,
    openItemModal, handleDeleteItem, handleDeleteSelected, handleBulkUpdateWorkDays,
    handleFilesDropped, openFileDialog, handleFileInputChange,
    handleParsedItemsConfirm, handleOcrConfirm,
    updateEstimateTotalAmount, fetchEstimateItems,
    saveFilesToStorage, handleDeleteExistingFile, handleOpenFile,
    handleSaveTerms, createOrderFromEstimate,
    toggleSelectAll, toggleSelectItem, handleUpdateItem,
    totalAmount, convertedTotal, currencySymbol, generateProjectName
  };
}
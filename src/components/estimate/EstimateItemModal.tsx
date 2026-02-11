import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { EstimateItem, Material, DIFFICULTY_FACTOR, CURRENCY_SYMBOL, INITIAL_ITEM_FORM, DEFAULT_DISCOUNT_POLICY, PostProcessing, HeatTreatment } from '../../types/estimate';
import { MobileModal } from '../common/MobileModal';
import { NumberInput } from '../common/NumberInput';
import { calculateDiscountRate } from '../../utils/estimateUtils';
import { useProfile } from '../../hooks/useProfile';

interface EstimateItemModalProps {
  isOpen: boolean;
  onClose: () => void;
  estimateId: string | null;
  materials: Material[];
  postProcessings: PostProcessing[];
  heatTreatments: HeatTreatment[]; // [NEW]
  currency: string;
  exchangeRate: number;
  editingItem: EstimateItem | null;
  discountPolicy: any;
  defaultHourlyRate: number;
  companyInfo?: any; // [New] For margins

  onSaveSuccess: () => void;
  onSaveFiles: (itemId: string, files: File[]) => Promise<void>;
  onDeleteExistingFile: (fileId: string) => Promise<void>;
  onOpenFile: (relativePath: string) => Promise<void>;
  existingItems?: EstimateItem[];
}

// 텍스트 유사도 계산 (Levenshtein Distance)
const getSimilarity = (s1: string, s2: string): number => {
  const longer = s1.length > s2.length ? s1 : s2;
  const shorter = s1.length > s2.length ? s2 : s1;
  const longerLength = longer.length;
  if (longerLength === 0) return 1.0;
  const editDistance = levenshteinDistance(longer, shorter);
  return (longerLength - editDistance) / parseFloat(longerLength.toString());
};

const levenshteinDistance = (s1: string, s2: string) => {
  s1 = s1.toLowerCase();
  s2 = s2.toLowerCase();
  const costs = new Array();
  for (let i = 0; i <= s1.length; i++) {
    let lastValue = i;
    for (let j = 0; j <= s2.length; j++) {
      if (i === 0) costs[j] = j;
      else {
        if (j > 0) {
          let newValue = costs[j - 1];
          if (s1.charAt(i - 1) !== s2.charAt(j - 1))
            newValue = Math.min(Math.min(newValue, lastValue), costs[j]) + 1;
          costs[j - 1] = lastValue;
          lastValue = newValue;
        }
      }
    }
    if (i > 0) costs[s2.length] = lastValue;
  }
  return costs[s2.length];
};

// -------------------- 컴포넌트 시작 --------------------

export function EstimateItemModal({
  isOpen, onClose, estimateId, materials, postProcessings,
  heatTreatments, // [NEW]
  currency, exchangeRate,
  editingItem, discountPolicy, defaultHourlyRate,
  companyInfo,
  onSaveSuccess, onSaveFiles, onDeleteExistingFile, onOpenFile,
  existingItems = []
}: EstimateItemModalProps) {

  const { profile } = useProfile();
  const [itemForm, setItemForm] = useState<EstimateItem>(INITIAL_ITEM_FORM);
  const [applicationRate, setApplicationRate] = useState(100);
  const currencySymbol = CURRENCY_SYMBOL[currency] || currency;

  // [상태] 유사 견적
  const [similarItems, setSimilarItems] = useState<EstimateItem[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  // [상태] 소재 추천
  const [recommendedMaterials, setRecommendedMaterials] = useState<Material[]>([]);
  const [isRecommending, setIsRecommending] = useState(false);

  // [상태] 수동 단가 입력 여부 (자동 계산 덮어쓰기 방지)
  const [isManualPrice, setIsManualPrice] = useState(false);

  // [상태] 도면 소재 자동 완성
  const [materialSuggestions, setMaterialSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  // [함수] 도면 소재 자동 완성 제안 가져오기
  const fetchMaterialSuggestions = async (term: string) => {
    if (!term || term.length < 1) {
      setMaterialSuggestions([]);
      return;
    }
    const { data } = await supabase.rpc('get_material_suggestions', { search_term: term });
    if (data) {
      setMaterialSuggestions(data.map((d: any) => d.material_name));
      setShowSuggestions(true);
    }
  };

  // Debounced Search for Material Suggestions
  useEffect(() => {
    const timer = setTimeout(() => {
      if (itemForm.original_material_name && itemForm.original_material_name.length > 0) {
        fetchMaterialSuggestions(itemForm.original_material_name);
      } else {
        setMaterialSuggestions([]);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [itemForm.original_material_name]);

  const activePolicy = discountPolicy || DEFAULT_DISCOUNT_POLICY;

  // [NEW] Quantity Input supporting slash separator (e.g. "10/100/200")
  const [qtyInput, setQtyInput] = useState<string>('1');

  useEffect(() => {
    if (isOpen) {
      if (editingItem) {
        setItemForm({ ...editingItem, material_id: editingItem.material_id || '', post_processing_id: editingItem.post_processing_id || null, tempFiles: [] });
        if (discountPolicy) {
          setApplicationRate(calculateDiscountRate(discountPolicy, editingItem.difficulty, editingItem.qty));
        }
        setQtyInput(editingItem.qty.toString()); // Init qty
      } else {
        setItemForm({
          ...INITIAL_ITEM_FORM,
          hourly_rate: defaultHourlyRate || 50000
        });
        const rate = calculateDiscountRate(activePolicy, INITIAL_ITEM_FORM.difficulty, INITIAL_ITEM_FORM.qty);
        setApplicationRate(rate);
        setQtyInput('1'); // Init qty
      }
      setIsManualPrice(false);
      // Removed setCalcResult resets because calcResult is a useMemo derived value.
      setSimilarItems([]);
      setRecommendedMaterials([]); // 초기화
    }
  }, [isOpen, editingItem, discountPolicy, defaultHourlyRate]);

  // [NEW] Parse qtyInput and update itemForm.qty
  useEffect(() => {
    // Parse first valid number for calculation preview
    // eslint-disable-next-line
    const firstQty = parseInt(qtyInput.split('/')[0].trim().replace(/,/g, ''), 10);
    const validQty = isNaN(firstQty) || firstQty <= 0 ? 0 : firstQty;

    if (validQty !== itemForm.qty) {
      setItemForm(prev => ({ ...prev, qty: validQty }));
    }
  }, [qtyInput]);

  useEffect(() => {
    if (itemForm.qty > 0) {
      const rate = calculateDiscountRate(activePolicy, itemForm.difficulty, itemForm.qty);
      setApplicationRate(rate);
    }
  }, [activePolicy, itemForm.qty, itemForm.difficulty]);

  // [기능] 소재 추천 로직 (RPC 호출)
  const fetchMaterialRecommendations = async (searchTerm: string) => {
    if (!searchTerm || searchTerm.length < 2) return;

    setIsRecommending(true);
    try {
      // Supabase RPC 호출
      const { data, error } = await supabase.rpc('get_material_recommendations', {
        search_term: searchTerm
      });

      if (error) throw error;

      if (data && data.length > 0) {
        // ID 목록으로 실제 소재 정보 매핑
        const recIds = data.map((r: any) => r.material_id);
        const recMats = materials.filter(m => recIds.includes(m.id));
        setRecommendedMaterials(recMats);
      } else {
        setRecommendedMaterials([]);
      }
    } catch (err) {
      console.error('Material recommendation failed:', err);
    } finally {
      setIsRecommending(false);
    }
  };

  // [기능] 유사 견적 자동 검색
  useEffect(() => {
    const searchTimer = setTimeout(async () => {
      let hasDimensions = false;
      if (itemForm.shape === 'rect') {
        hasDimensions = itemForm.spec_w > 0 && itemForm.spec_d > 0 && itemForm.spec_h > 0;
      } else {
        hasDimensions = itemForm.spec_w > 0 && itemForm.spec_d > 0;
      }

      const hasPartNo = itemForm.part_no && itemForm.part_no.length >= 3;

      if (!hasDimensions && !hasPartNo) {
        setSimilarItems([]);
        return;
      }

      setIsSearching(true);
      try {
        let matchedItems: any[] = [];

        // 1. 치수 기반
        if (hasDimensions) {
          const wMin = itemForm.spec_w * 0.95;
          const wMax = itemForm.spec_w * 1.05;
          const dMin = itemForm.spec_d * 0.95;
          const dMax = itemForm.spec_d * 1.05;

          // [Fix] Simplified query: exact shape match + range + company isolation
          let query = supabase
            .from('estimate_items')
            .select('*, estimates!inner(company_id), files(id, file_name, file_type, file_path)')
            .eq('estimates.company_id', profile?.company_id)
            .eq('shape', itemForm.shape)
            .gte('spec_w', wMin).lte('spec_w', wMax)
            .gte('spec_d', dMin).lte('spec_d', dMax);

          if (itemForm.shape === 'rect') {
            const hMin = itemForm.spec_h * 0.95;
            const hMax = itemForm.spec_h * 1.05;
            query = query.gte('spec_h', hMin).lte('spec_h', hMax);
          }

          const { data, error } = await query.limit(10);
          if (error) throw error;
          if (data) matchedItems = [...matchedItems, ...data];
        }

        // 2. 도번 기반
        if (hasPartNo && itemForm.part_no) {
          const prefix = itemForm.part_no.substring(0, 3);
          const { data, error } = await supabase
            .from('estimate_items')
            .select('*, estimates!inner(company_id), files(id, file_name, file_type, file_path)')
            .eq('estimates.company_id', profile?.company_id)
            .ilike('part_no', `${prefix}%`)
            .limit(20);

          if (error) throw error;

          if (data) {
            const similarPartItems = data.filter(item => {
              if (!item.part_no) return false;
              const sim = getSimilarity(item.part_no, itemForm.part_no!);
              return sim >= 0.8;
            });
            matchedItems = [...matchedItems, ...similarPartItems];
          }
        }

        const uniqueItems = Array.from(new Map(matchedItems.map(item => [item.id, item])).values()) as EstimateItem[];
        const filteredItems = uniqueItems.filter(item => item.id !== editingItem?.id);

        setSimilarItems(filteredItems);
      } catch (error) {
        console.error("Similarity search failed:", error);
      } finally {
        setIsSearching(false);
      }
    }, 800);

    return () => clearTimeout(searchTimer);
  }, [itemForm.spec_w, itemForm.spec_d, itemForm.spec_h, itemForm.part_no, itemForm.shape]);

  const calcResult = useMemo(() => {
    const material = materials.find(m => m.id === itemForm.material_id);
    let weight = 0;
    let matCost = 0;

    if (material) {
      if (itemForm.shape === 'rect') {
        if (itemForm.raw_w && itemForm.raw_d && itemForm.raw_h) {
          weight = (itemForm.raw_w * itemForm.raw_d * itemForm.raw_h * material.density) / 1000000;
        }
      } else {
        if (itemForm.raw_w && itemForm.raw_d) {
          const radius = itemForm.raw_w / 2;
          const vol = Math.PI * (radius * radius) * itemForm.raw_d;
          weight = (vol * material.density) / 1000000;
        }
      }
      // [Fix] Calculate Material Cost: Weight * UnitPrice
      matCost = Math.round(weight * material.unit_price);
    }

    let processingCost = 0;
    let postProcCost = itemForm.post_process_cost || 0;
    let heatTreatCost = itemForm.heat_treatment_cost || 0;

    // [Fix] Calculate Processing Cost (moved out of conditional)
    const hourlyRate = itemForm.hourly_rate || defaultHourlyRate;
    const processingTime = itemForm.process_time || 0;
    const factor = DIFFICULTY_FACTOR[itemForm.difficulty] || 1.0;
    processingCost = Math.round(processingTime * hourlyRate * factor);

    // 3. Post Processing Cost
    if (itemForm.post_processing_id) {
      const selectedPP = postProcessings.find(p => p.id === itemForm.post_processing_id);
      if (selectedPP && weight > 0) {
        postProcCost = Math.round(weight * selectedPP.price_per_kg);
      }
    }

    // 4. Heat Treatment Cost
    if (itemForm.heat_treatment_id) {
      const selectedHT = heatTreatments.find(h => h.id === itemForm.heat_treatment_id);
      if (selectedHT && weight > 0) {
        heatTreatCost = Math.round(weight * selectedHT.price_per_kg);
      }
    }

    const totalCostRaw = matCost + processingCost + postProcCost + heatTreatCost;

    // Profit & Supply Price
    const profitRate = itemForm.profit_rate || 0;
    const profitAmount = totalCostRaw * (profitRate / 100);
    const calculatedSupplyPrice = Math.ceil((totalCostRaw + profitAmount) / 1000) * 1000;

    const finalUnitCost = calculatedSupplyPrice;

    return {
      weight: parseFloat(weight.toFixed(2)),
      matCost,
      procCost: processingCost,
      processingCost,
      postProcCost,
      heatTreatCost,
      totalCostRaw,
      calculatedSupplyPrice,
      finalUnitCost,
      profitAmount,
      baseTotal: totalCostRaw,
      subTotal: calculatedSupplyPrice
    };
  }, [itemForm, materials, postProcessings, heatTreatments, defaultHourlyRate]);

  // Auto Update Effect
  useEffect(() => {
    if (!isManualPrice) {
      const newItemForm = { ...itemForm };
      let changed = false;

      // Update Material Cost
      if (!itemForm.material_id && calcResult.matCost !== itemForm.material_cost) {
        // Only if manual mode? No, if calculated, we set it.
        // Actually, logic is: if material_id selected, we calc and set material_cost
      }

      // We generally just rely on calcResult for display, but for saving we need it in form?
      // No, supply_price is what matters.

      // Update Post Process Cost
      if (itemForm.post_processing_id && calcResult.postProcCost !== itemForm.post_process_cost) {
        newItemForm.post_process_cost = calcResult.postProcCost;
        changed = true;
      }

      // Update Heat Treatment Cost [NEW]
      if (itemForm.heat_treatment_id && calcResult.heatTreatCost !== itemForm.heat_treatment_cost) {
        newItemForm.heat_treatment_cost = calcResult.heatTreatCost;
        changed = true;
      }

      // Update Processing Cost (if auto calc)
      if ((!itemForm.processing_cost || itemForm.processing_cost === 0) && calcResult.processingCost > 0) {
        // Actually we don't auto-set processing_cost field usually unless specific logic.
        // Let's keep it simple.
      }

      // Update Supply Price
      if (calcResult.calculatedSupplyPrice !== itemForm.supply_price) {
        newItemForm.supply_price = calcResult.calculatedSupplyPrice;
        changed = true;
      }

      // Update Unit Price
      const newUnitPrice = Math.round(newItemForm.supply_price / itemForm.qty);
      if (newUnitPrice !== itemForm.unit_price) {
        newItemForm.unit_price = newUnitPrice;
        changed = true;
      }

      if (changed) {
        setItemForm(prev => ({ ...prev, ...newItemForm }));
      }
    }
  }, [calcResult, isManualPrice]);

  const handleSpecChange = (field: 'spec_w' | 'spec_d' | 'spec_h', value: number) => {
    const newItemForm = { ...itemForm, [field]: value };
    // 자동 채우기 - Configurable Margins
    // [Fix] Distinguish between Plate (Rect) and Round Bar (Round)
    let marginW = 5;
    let marginD = 5;
    let marginH = 0;

    if (itemForm.shape === 'round') {
      marginW = companyInfo?.default_margin_round_w ?? 5; // Diameter
      marginD = companyInfo?.default_margin_round_d ?? 5; // Length
      marginH = 0;
    } else {
      marginW = companyInfo?.default_margin_w ?? 5; // Width
      marginD = companyInfo?.default_margin_d ?? 5; // Depth
      marginH = companyInfo?.default_margin_h ?? 0; // Thickness
    }

    if (field === 'spec_w') newItemForm.raw_w = value + (value > 0 ? marginW : 0);
    if (field === 'spec_d') newItemForm.raw_d = value + (value > 0 ? marginD : 0);
    if (field === 'spec_h') newItemForm.raw_h = value + (value > 0 ? marginH : 0);
    setItemForm(newItemForm);
    setIsManualPrice(false); // 규격 변경 시 자동 계산 재개
  };

  const handleSave = async () => {
    if (!estimateId) return alert('견적서 ID가 없습니다.');
    if (!itemForm.part_name) return alert('품명은 필수입니다.');

    // [Multi-Qty Logic]
    // Parse quantity input string "10/20/30"
    const quantities = qtyInput.split('/')
      .map(q => parseInt(q.trim().replace(/,/g, ''), 10))
      .filter(n => !isNaN(n) && n > 0);

    if (quantities.length === 0) {
      return alert('유효한 수량을 입력해주세요.');
    }

    const { data: { user } } = await supabase.auth.getUser();
    const finalUnitPrice = itemForm.unit_price; // Note: This unit price is calculated based on 'itemForm.qty' (the first one).
    // For subsequent quantities, the Unit Price *should* technically be recalculated if we had a formula,
    // but here we are just cloning the current form state. Users might want to update prices later.
    // OR we could try to auto-calc if logic supports it?
    // For now, we save what is on the screen for the first one, and for others we might need to assume same unit price OR recalculate?
    // User request implies "Input 10, 100, 200". Usually this means they want to set different prices for them. 
    // But this modal only calculates ONE price at a time.
    // Solution: Save all with the CURRENT unit price (or auto-recalculated if we can triggers logic, but that's hard async).
    // Users will likely go into the list and edit the prices for 100/200 qty items.
    // So we just clone the current 'itemForm' but override 'qty' and 'supply_price'.

    const { tempFiles, files, id, ...cleanItemForm } = itemForm;

    // Duplicate Check (only for the first one if it's new)
    // If editing, we skip check for the self.
    if (!editingItem && existingItems.some(i => i.part_no === cleanItemForm.part_no)) {
      if (!confirm(`이미 존재하는 도번입니다: ${cleanItemForm.part_no}\n그래도 등록하시겠습니까?`)) {
        return;
      }
    }

    try {
      // Loop through quantities
      for (let i = 0; i < quantities.length; i++) {
        const qty = quantities[i];

        // Recalculate prices for this Qty? 
        // Simple linear: Supply Price = Unit Price * Qty
        // But 'Unit Price' might change with Qty in reality. 
        // We will keep the 'Unit Price' from the form (user input) for ALL items initially.
        // User can adjust later.
        // Actually, supply_price should be correct math at least.
        const thisSupplyPrice = finalUnitPrice * qty;

        const payload = {
          estimate_id: estimateId,
          ...cleanItemForm,
          qty: qty, // Override Qty
          material_id: cleanItemForm.material_id || null,
          original_material_name: cleanItemForm.original_material_name,
          material_cost: calcResult.matCost, // Assumed constant per unit? Wait, material cost is usually per unit. Logic in modal seems to update 'matCost' based on unit spec?
          // Let's check calcResult logic. 'matCost' in 'calcResult' is likely TOTAL or UNIT?
          // In 'handleSpecChange' -> calculateMaterialCost. 
          // UseEstimateLogic: usually calculates Unit Material Cost using density and diff.
          // So matCost is Unit Cost. Safe to reuse. (Unless it depends on Qty? No)

          processing_cost: calcResult.procCost, // Unit Proc Cost? Or Total? 'procCost' is usually Unit.
          post_process_cost: calcResult.postProcCost,
          profit_rate: cleanItemForm.profit_rate || 0,
          unit_price: finalUnitPrice,
          supply_price: thisSupplyPrice,
          updated_by: user?.id
        };

        // Determine if Update or Insert
        let savedItemId: string | null = null;
        if (editingItem && editingItem.id) savedItemId = editingItem.id;

        // If it's the FIRST quantity AND we are in Editing mode, we UPDATE the original item.
        if (editingItem && i === 0) {
          const { error } = await supabase.from('estimate_items').update(payload).eq('id', editingItem.id);
          if (error) throw error;
          savedItemId = editingItem.id || null;
        } else {
          // Insert new (for subsequent quantities OR if adding new)
          const { data, error } = await supabase.from('estimate_items').insert([payload]).select().single();
          if (error) throw error;
          savedItemId = data.id;
        }

        // Handle Files
        // 1. Upload NEW tempFiles for EACH item.
        if (savedItemId && itemForm.tempFiles && itemForm.tempFiles.length > 0) {
          await onSaveFiles(savedItemId, itemForm.tempFiles);
        }

        // 2. [FIX] Copy EXISTING files to NEW items (only for subsequent items)
        // If i=0 (Update), existing files are already linked to this ID.
        // If i>0 (New Insert), we need to link existing files to this NEW ID.
        if (i > 0 && savedItemId && itemForm.files && itemForm.files.length > 0) {
          const filesToCopy = itemForm.files.map(f => ({
            estimate_item_id: savedItemId,
            file_path: f.file_path,
            file_name: f.file_name,
            file_type: f.file_type || 'ETC',
            version: 1,
            is_current: true
          }));

          const { error: fileError } = await supabase.from('files').insert(filesToCopy);
          if (fileError) {
            console.error('File copy failed:', fileError);
            // Non-blocking error, just log it.
          }
        }
      }

      onSaveSuccess();
      onClose();
    } catch (e: any) {
      alert(`저장 중 오류가 발생했습니다: ${e.message}`);
    }
  };

  const handleManualFileAdd = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const newFiles = Array.from(e.target.files);
      setItemForm(prev => ({
        ...prev,
        tempFiles: [...(prev.tempFiles || []), ...newFiles]
      }));
    }
  };

  const handleRemoveTempFile = (index: number) => {
    setItemForm(prev => ({ ...prev, tempFiles: prev.tempFiles?.filter((_, i) => i !== index) }));
  };

  const handleDeleteFile = async (fileId: string) => {
    await onDeleteExistingFile(fileId);
    setItemForm(prev => ({
      ...prev,
      files: prev.files?.filter(f => f.id !== fileId)
    }));
  };

  return (
    <MobileModal
      isOpen={isOpen}
      onClose={onClose}
      title={editingItem ? "품목 수정" : "품목 상세 견적"}
      maxWidth="md:max-w-4xl"
      footer={
        <>
          <button onClick={onClose} className="flex-1 py-3 text-slate-600 border rounded">취소</button>
          <button onClick={handleSave} className="flex-1 py-3 text-white bg-blue-600 rounded font-bold hover:bg-blue-700">
            {editingItem ? "수정 저장" : "추가하기"}
          </button>
        </>
      }
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-4">
          <div className="space-y-3 p-3 bg-slate-50 rounded border border-slate-200">
            <h4 className="text-xs font-bold text-slate-500 uppercase mb-2 border-b pb-1">1. 제품 정보</h4>

            <div className="flex bg-white rounded border overflow-hidden mb-3">
              <button
                onClick={() => setItemForm({ ...itemForm, shape: 'rect' })}
                className={`flex - 1 py - 1.5 text - xs font - bold ${itemForm.shape === 'rect' ? 'bg-slate-700 text-white' : 'text-slate-500 hover:bg-slate-50'} `}
              >
                ⬛ 사각 (Plate)
              </button>
              <button
                onClick={() => setItemForm({ ...itemForm, shape: 'round' })}
                className={`flex - 1 py - 1.5 text - xs font - bold ${itemForm.shape === 'round' ? 'bg-slate-700 text-white' : 'text-slate-500 hover:bg-slate-50'} `}
              >
                ⚫ 원형 (Round)
              </button>
            </div>

            <div className="flex gap-2">
              <div className="flex-1"><label className="block text-xs font-bold text-slate-500 mb-1">품명</label><input className="w-full border p-2 rounded text-sm" value={itemForm.part_name} onChange={e => setItemForm({ ...itemForm, part_name: e.target.value })} placeholder="품명" /></div>
              <div className="flex-1"><label className="block text-xs font-bold text-slate-500 mb-1">도번</label><input className="w-full border p-2 rounded text-sm" value={itemForm.part_no} onChange={e => setItemForm({ ...itemForm, part_no: e.target.value })} placeholder="도번" /></div>
            </div>



            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1">도면 소재명 (해외/구형)</label>
              <div className="flex gap-2 relative">
                <input
                  className="w-full border p-2 rounded text-sm bg-yellow-50 focus:bg-white transition-colors"
                  value={itemForm.original_material_name || ''}
                  onChange={e => {
                    setItemForm({ ...itemForm, original_material_name: e.target.value });
                    setShowSuggestions(true);
                  }}
                  onFocus={() => { if (materialSuggestions.length > 0) setShowSuggestions(true); }}
                  onBlur={() => setTimeout(() => setShowSuggestions(false), 200)} // Delay to allow click
                  placeholder="예: A6061-T6, SS41"
                  autoComplete="off"
                />

                {/* Autocomplete Dropdown */}
                {showSuggestions && materialSuggestions.length > 0 && (
                  <ul className="absolute z-50 left-0 top-full mt-1 w-full bg-white border border-slate-300 rounded shadow-lg max-h-40 overflow-y-auto">
                    {materialSuggestions.map((suggestion, idx) => (
                      <li
                        key={idx}
                        className="px-3 py-2 text-xs hover:bg-blue-50 cursor-pointer text-slate-700"
                        onClick={() => {
                          setItemForm(prev => ({ ...prev, original_material_name: suggestion }));
                          setShowSuggestions(false);
                        }}
                      >
                        {suggestion}
                      </li>
                    ))}
                  </ul>
                )}

                <button
                  onClick={() => fetchMaterialRecommendations(itemForm.original_material_name || '')}
                  disabled={isRecommending}
                  className="px-3 py-2 bg-slate-100 border rounded text-xs font-bold text-slate-600 hover:bg-slate-200 whitespace-nowrap"
                >
                  {isRecommending ? '...' : '추천'}
                </button>
              </div>
              {/* 추천 리스트 (Mapping) */}
              {recommendedMaterials.length > 0 && (
                <div className="mt-2 p-2 bg-blue-50 border border-blue-100 rounded text-xs">
                  <span className="font-bold text-blue-700 mr-2">💡 매핑 추천:</span>
                  {recommendedMaterials.map(mat => (
                    <button
                      key={mat.id}
                      onClick={() => setItemForm(prev => ({ ...prev, material_id: mat.id }))}
                      className="inline-block mr-2 px-2 py-1 bg-white border border-blue-200 rounded hover:bg-blue-100 text-slate-700"
                    >
                      {mat.code} ({mat.name})
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="flex gap-2">
              {itemForm.shape === 'rect' ? (
                <>
                  <div className="flex-1"><NumberInput label="두께 (mm)" value={itemForm.spec_h} onChange={v => handleSpecChange('spec_h', v)} /></div>
                  <div className="flex-1"><NumberInput label="가로 (mm)" value={itemForm.spec_w} onChange={v => handleSpecChange('spec_w', v)} /></div>
                  <div className="flex-1"><NumberInput label="세로 (mm)" value={itemForm.spec_d} onChange={v => handleSpecChange('spec_d', v)} /></div>
                </>
              ) : (
                <>
                  <div className="flex-1"><NumberInput label="지름 (OD)" value={itemForm.spec_w} onChange={v => handleSpecChange('spec_w', v)} /></div>
                  <div className="flex-1"><NumberInput label="길이 (L)" value={itemForm.spec_d} onChange={v => handleSpecChange('spec_d', v)} /></div>
                  <div className="flex-1 bg-gray-100 rounded opacity-50"><NumberInput label="-" value={0} onChange={() => { }} disabled /></div>
                </>
              )}
            </div>
          </div>

          <div className="space-y-3 p-3 bg-blue-50 rounded border border-blue-200">
            <h4 className="text-xs font-bold text-blue-600 uppercase mb-2 border-b border-blue-200 pb-1">2. 소재비 계산</h4>
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1">실제 소재 (원자재)</label>
              <select
                className="w-full border p-2 rounded text-sm font-bold text-slate-700"
                value={itemForm.material_id || ''}
                onChange={e => setItemForm({ ...itemForm, material_id: e.target.value })}
              >
                <option value="">선택하세요</option>
                {materials.map(m => <option key={m.id} value={m.id}>{m.code} ({m.name})</option>)}
              </select>
            </div>

            <div className="flex gap-2">
              {itemForm.shape === 'rect' ? (
                <>
                  <div className="flex-1"><NumberInput label="소재 두께 (mm)" value={itemForm.raw_h} onChange={v => setItemForm({ ...itemForm, raw_h: v })} /></div>
                  <div className="flex-1"><NumberInput label="소재 가로 (mm)" value={itemForm.raw_w} onChange={v => setItemForm({ ...itemForm, raw_w: v })} /></div>
                  <div className="flex-1"><NumberInput label="소재 세로 (mm)" value={itemForm.raw_d} onChange={v => setItemForm({ ...itemForm, raw_d: v })} /></div>
                </>
              ) : (
                <>
                  <div className="flex-1"><NumberInput label="소재 지름 (OD)" value={itemForm.raw_w} onChange={v => setItemForm({ ...itemForm, raw_w: v })} /></div>
                  <div className="flex-1"><NumberInput label="소재 길이 (L)" value={itemForm.raw_d} onChange={v => setItemForm({ ...itemForm, raw_d: v })} /></div>
                  <div className="flex-1 bg-gray-100 rounded opacity-50"><NumberInput label="-" value={0} onChange={() => { }} disabled /></div>
                </>
              )}
            </div>

            <div className="text-right font-bold text-blue-600 text-sm">
              예상 소재비: ₩ {calcResult.matCost.toLocaleString()}
              {currency !== 'KRW' && <span className="text-slate-500 ml-1 font-normal text-xs">({currencySymbol} {exchangeRate > 0 ? (calcResult.matCost / exchangeRate).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : 0})</span>}
              <span className="ml-2 text-slate-500 font-normal text-xs">(중량: {calcResult.weight} kg)</span>
            </div>
          </div>

          {/* 유사 견적 이력 섹션 */}
          {similarItems.length > 0 && (
            <div className="bg-yellow-50 p-3 rounded border border-yellow-200 animate-fade-in-down">
              <div className="flex justify-between items-center mb-2">
                <h4 className="text-xs font-bold text-yellow-800">🔍 유사 견적 이력 발견! ({similarItems.length}건)</h4>
                {isSearching && <span className="text-xs text-slate-500">검색 중...</span>}
              </div>
              <div className="max-h-32 overflow-y-auto space-y-2">
                {similarItems.map((item) => (
                  <div key={item.id} className="bg-white p-2 rounded border border-yellow-100 text-xs shadow-sm hover:bg-yellow-50 transition-colors">
                    <div className="flex justify-between font-bold text-slate-700">
                      <span>{item.part_name} ({item.part_no})</span>
                      <span className="text-blue-600">₩ {item.unit_price.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-slate-500 mt-1">
                      <span>{item.spec_w}x{item.spec_d}x{item.spec_h} (mm)</span>
                      <span>Qty: {item.qty}</span>
                    </div>
                    {item.files && item.files.length > 0 && (
                      <div className="mt-1 pt-1 border-t border-yellow-100 flex flex-wrap gap-1">
                        {item.files.map(f => (
                          <span
                            key={f.id}
                            className="text-[9px] bg-white border border-yellow-200 px-1 rounded flex items-center gap-1 cursor-pointer hover:bg-yellow-100 text-slate-600"
                            onClick={() => onOpenFile(f.file_path)}
                            title={`${f.file_type}: ${f.file_name} `}
                          >
                            {f.file_type === '3D' ? '🧊' : '📄'} {f.file_name.length > 10 ? f.file_name.substring(0, 10) + '...' : f.file_name}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="space-y-4">
          <div className="space-y-3 p-3 bg-orange-50 rounded border border-orange-200">
            <h4 className="text-xs font-bold text-orange-600 uppercase mb-2 border-b border-orange-200 pb-1">3. 가공비 계산</h4>
            <div className="flex gap-2">
              <div className="flex-1"><NumberInput label="가공 시간 (Hr)" value={itemForm.process_time} onChange={v => setItemForm({ ...itemForm, process_time: v })} /></div>
              <div className="flex-1"><NumberInput label="임율 (₩/Hr)" value={itemForm.hourly_rate} onChange={v => setItemForm({ ...itemForm, hourly_rate: v })} /></div>
            </div>
            <div className="flex gap-2">
              <div className="flex-1"><label className="block text-xs font-bold text-slate-500 mb-1">난이도</label><select className="w-full border p-2 rounded text-sm" value={itemForm.difficulty} onChange={e => setItemForm({ ...itemForm, difficulty: e.target.value })}><option value="A">A (하)</option><option value="B">B (중)</option><option value="C">C (상)</option><option value="D">D (최상)</option><option value="E">E (매우 어려움)</option><option value="F">F (불가/연구)</option></select></div>
              <div className="flex-1">
                <label className="block text-xs font-bold text-slate-500 mb-1">후처리 선택</label>
                <select
                  className="w-full border p-2 rounded text-sm"
                  value={itemForm.post_processing_id || ''}
                  onChange={e => setItemForm({ ...itemForm, post_processing_id: e.target.value || null })}
                >
                  <option value="">직접 입력</option>
                  {postProcessings.map(p => <option key={p.id} value={p.id}>{p.name} (₩{p.price_per_kg}/kg)</option>)}
                </select>
              </div>
              <div className="flex-1">
                <NumberInput
                  label="후처리비 (₩)"
                  value={itemForm.post_process_cost || 0}
                  onChange={v => setItemForm({ ...itemForm, post_process_cost: v, post_processing_id: null })}
                />
              </div>
            </div>

            {/* Heat Treatment */}
            <div className="flex gap-4 mb-2">
              <div className="flex-1">
                <label className="block text-xs font-bold text-slate-500 mb-1">열처리 선택</label>
                <select
                  className="w-full border p-2 rounded text-sm"
                  value={itemForm.heat_treatment_id || ''}
                  onChange={e => setItemForm({ ...itemForm, heat_treatment_id: e.target.value || null })}
                >
                  <option value="">직접 입력</option>
                  {heatTreatments.map(h => <option key={h.id} value={h.id}>{h.name} (₩{h.price_per_kg}/kg)</option>)}
                </select>
              </div>
              <div className="flex-1">
                <NumberInput
                  label="열처리비 (₩)"
                  value={itemForm.heat_treatment_cost || 0}
                  onChange={v => setItemForm({ ...itemForm, heat_treatment_cost: v, heat_treatment_id: null })}
                  disabled={!!itemForm.heat_treatment_id}
                  className={itemForm.heat_treatment_id ? "bg-gray-100 text-slate-500 cursor-not-allowed" : ""}
                />
              </div>
            </div>

            <div className="border-t my-4"></div>
            <div className="text-right text-orange-600 font-bold text-sm">
              예상 가공비: ₩ {calcResult.procCost.toLocaleString()}
              {currency !== 'KRW' && <span className="text-slate-500 ml-1 font-normal text-xs">({currencySymbol} {exchangeRate > 0 ? (calcResult.procCost / exchangeRate).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : 0})</span>}
            </div>

            <div className="pt-2 mt-2 border-t border-orange-200 space-y-2">
              {/* 소요일 추가 */}
              <div className="flex gap-2 items-center">
                <div className="w-24 shrink-0">
                  <label className="block text-xs font-bold text-slate-500 mb-1">소요일 (일)</label>
                  <NumberInput value={itemForm.work_days || 0} onChange={v => setItemForm({ ...itemForm, work_days: v })} />
                </div>
                <div className="flex-1"></div>
              </div>

              <div className="flex gap-2 items-center">
                <div className="w-24 shrink-0">
                  <label className="block text-xs font-bold text-red-500 mb-1">기업이윤 (%)</label>
                  <NumberInput value={itemForm.profit_rate} onChange={v => setItemForm({ ...itemForm, profit_rate: v })} />
                </div>
                <div className="flex-1 text-right">
                  <span className="text-xs text-slate-500 block">이윤 금액</span>
                  <span className="text-sm font-bold text-red-500">₩ {calcResult.profitAmount.toLocaleString()}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="p-3 bg-gray-50 rounded border border-gray-300">
            <h4 className="text-xs font-bold text-gray-600 uppercase mb-2 border-b pb-1">4. 도면/파일 첨부</h4>
            <input type="file" multiple onChange={handleManualFileAdd} className="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100" />
            {itemForm.files && itemForm.files.length > 0 && (
              <div className="mt-2">
                <p className="text-xs font-bold text-slate-500 mb-1">기존 파일:</p>
                <ul className="space-y-1">
                  {itemForm.files.map((f, i) => (
                    <li key={i} className="flex justify-between items-center text-xs bg-slate-100 p-1.5 rounded hover:bg-slate-200">
                      <div className="flex items-center gap-2 overflow-hidden flex-1 cursor-pointer" onClick={() => onOpenFile(f.file_path)}>
                        <span className={`text - [10px] px - 1 rounded border ${f.file_type === '2D' ? 'bg-red-50 text-red-600' : 'bg-blue-50 text-blue-600'} `}>{f.file_type}</span>
                        <span className="text-blue-600 truncate hover:underline" title="클릭하여 파일 열기">{f.file_name}</span>
                      </div>
                      <button onClick={(e) => { e.stopPropagation(); handleDeleteFile(f.id); }} className="text-red-400 hover:text-red-600 font-bold px-1">✕</button>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {itemForm.tempFiles && itemForm.tempFiles.length > 0 && (
              <div className="mt-2">
                <p className="text-xs font-bold text-green-600 mb-1">추가할 파일:</p>
                <ul className="space-y-1">
                  {itemForm.tempFiles.map((f, i) => (
                    <li key={i} className="flex justify-between items-center text-xs bg-green-50 p-1.5 rounded border border-green-100">
                      <span className="text-green-700 truncate max-w-[200px]">{f.name}</span>
                      <button onClick={() => handleRemoveTempFile(i)} className="text-red-500 hover:text-red-700 font-bold px-1">✕</button>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          <div className="p-4 bg-slate-100 rounded border border-slate-300 shadow-sm">
            <div className="flex gap-2 items-start mb-4">
              <div className="flex-1">
                <label className="block text-xs font-bold text-slate-700 mb-1">수량 (Quantity)</label>
                <input
                  type="text"
                  value={qtyInput}
                  onChange={(e) => setQtyInput(e.target.value)}
                  className="w-full border p-2 rounded font-bold text-right focus:ring-2 focus:ring-blue-500 outline-none"
                  placeholder="예: 10/100/200"
                />
                <p className="text-[10px] text-blue-600 mt-1">
                  💡 '/'로 구분하여 입력하면 여러 건이 일괄 등록됩니다. <br /> (천단위 ',' 사용 금지)
                </p>
              </div>
              <div className="flex-1">
                <label className="block text-xs font-bold text-purple-600 mb-1">단가 적용률 (%)</label>
                <div className="relative">
                  <input
                    type="number"
                    className="w-full border p-2 rounded text-right font-bold text-purple-700 bg-white focus:ring-2 focus:ring-purple-500 outline-none"
                    value={applicationRate}
                    onChange={(e) => setApplicationRate(Number(e.target.value))}
                  />
                  <div className="absolute top-full right-0 text-[10px] text-slate-400 mt-0.5">
                    기본합계(이윤포함): ₩ {calcResult.subTotal.toLocaleString()}
                  </div>
                </div>
              </div>
            </div>
            <div className="flex gap-2 items-end mb-4">
              <div className="flex-[1.5]">
                <label className="block text-xs font-bold text-blue-600 mb-1">계산 단가 (₩)</label>
                <input disabled value={calcResult.finalUnitCost.toLocaleString()} className="w-full border p-2 rounded bg-blue-50 text-right font-bold text-blue-700" />
                {currency !== 'KRW' && <div className="text-[10px] text-right text-slate-500 mt-1">≈ {currencySymbol} {exchangeRate > 0 ? (calcResult.finalUnitCost / exchangeRate).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : 0}</div>}
              </div>
            </div>

            <div className="mb-4">
              <label className="block text-xs font-bold text-slate-700 mb-1">비고 (Note)</label>
              <input
                type="text"
                value={itemForm.note || ''}
                onChange={(e) => setItemForm({ ...itemForm, note: e.target.value })}
                className="w-full border p-2 rounded text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                placeholder="특이사항 입력"
              />
            </div>

            <div>
              <NumberInput
                label="최종 적용 단가 (₩)"
                value={itemForm.unit_price}
                onChange={v => {
                  setItemForm({ ...itemForm, unit_price: v });
                  setIsManualPrice(true); // 수동 입력 시 플래그 설정
                }}
                className="text-blue-700 font-extrabold text-xl"
              />
              {/* 외화 소수점 둘째자리까지 표시 */}
              {currency !== 'KRW' && itemForm.unit_price > 0 && (
                <div className="text-xs text-right text-slate-500 mt-1 font-bold" style={{ fontSize: '70%' }}>
                  ≈ {currencySymbol} {exchangeRate > 0 ? (itemForm.unit_price / exchangeRate).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : 0}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </MobileModal>
  );
}
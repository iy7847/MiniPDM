import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { EstimateItem, Material, DIFFICULTY_FACTOR, CURRENCY_SYMBOL, INITIAL_ITEM_FORM, DEFAULT_DISCOUNT_POLICY } from '../../types/estimate';
import { MobileModal } from '../common/MobileModal';
import { NumberInput } from '../common/NumberInput';

// [상수] 선형 보간용 수량 구간
const QUANTITIES = [1, 10, 50, 100, 500, 1000];

interface EstimateItemModalProps {
  isOpen: boolean;
  onClose: () => void;
  estimateId: string | null;
  materials: Material[];
  currency: string;
  exchangeRate: number;
  editingItem: EstimateItem | null;
  discountPolicy: any;
  defaultHourlyRate: number;
  
  onSaveSuccess: () => void;
  onSaveFiles: (itemId: string, files: File[]) => Promise<void>;
  onDeleteExistingFile: (fileId: string) => Promise<void>;
  onOpenFile: (relativePath: string) => Promise<void>;
}

// -------------------- 유틸리티 함수 시작 --------------------

// 1. 텍스트 유사도 계산 (Levenshtein Distance)
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

// 2. 할인율 계산 (선형 보간)
const calculateDiscountRate = (policy: any, difficulty: string, qty: number) => {
  if (!policy || !policy[difficulty]) return 100;
  const rates = policy[difficulty]; 
  if (!rates || rates.length === 0) return 100;

  if (qty <= QUANTITIES[0]) return rates[0];
  if (qty >= QUANTITIES[QUANTITIES.length - 1]) return rates[rates.length - 1];

  let i = 0;
  while (i < QUANTITIES.length - 1 && QUANTITIES[i + 1] < qty) {
    i++;
  }

  const x1 = QUANTITIES[i];
  const x2 = QUANTITIES[i + 1];
  const y1 = rates[i];
  const y2 = rates[i + 1];

  const rate = y1 + (qty - x1) * (y2 - y1) / (x2 - x1);
  return Math.round(rate * 10) / 10; 
};

// -------------------- 컴포넌트 시작 --------------------

export function EstimateItemModal({ 
  isOpen, onClose, estimateId, materials, currency, exchangeRate, 
  editingItem, discountPolicy, defaultHourlyRate,
  onSaveSuccess, onSaveFiles, onDeleteExistingFile, onOpenFile
}: EstimateItemModalProps) {
  
  const [itemForm, setItemForm] = useState<EstimateItem>(INITIAL_ITEM_FORM);
  const [applicationRate, setApplicationRate] = useState(100);
  const currencySymbol = CURRENCY_SYMBOL[currency] || currency;

  // [복구] 유사 견적 상태
  const [similarItems, setSimilarItems] = useState<EstimateItem[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  const activePolicy = discountPolicy || DEFAULT_DISCOUNT_POLICY;

  useEffect(() => {
    if (isOpen) {
      if (editingItem) {
        setItemForm({ ...editingItem, material_id: editingItem.material_id || '', tempFiles: [] });
        if (discountPolicy) {
          setApplicationRate(calculateDiscountRate(discountPolicy, editingItem.difficulty, editingItem.qty));
        }
      } else {
        setItemForm({
          ...INITIAL_ITEM_FORM,
          hourly_rate: defaultHourlyRate || 50000 
        });
        const rate = calculateDiscountRate(activePolicy, INITIAL_ITEM_FORM.difficulty, INITIAL_ITEM_FORM.qty);
        setApplicationRate(rate);
      }
      setSimilarItems([]); // 초기화
    }
  }, [isOpen, editingItem, discountPolicy, defaultHourlyRate]);

  useEffect(() => {
    if (itemForm.qty > 0) {
      const rate = calculateDiscountRate(activePolicy, itemForm.difficulty, itemForm.qty);
      setApplicationRate(rate);
    }
  }, [activePolicy, itemForm.qty, itemForm.difficulty]);

  // [복구] 유사 견적 자동 검색 로직
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

        // 1. 치수 기반 검색 (형상 일치 & ±5% 오차 범위)
        if (hasDimensions) {
          const wMin = itemForm.spec_w * 0.95;
          const wMax = itemForm.spec_w * 1.05;
          const dMin = itemForm.spec_d * 0.95;
          const dMax = itemForm.spec_d * 1.05;
          
          let query = supabase
            .from('estimate_items')
            .select('*, files(id, file_name, file_type, file_path)')
            .or(`shape.eq.${itemForm.shape},shape.is.null`) // 기존 데이터 호환
            .gte('spec_w', wMin).lte('spec_w', wMax)
            .gte('spec_d', dMin).lte('spec_d', dMax);

          if (itemForm.shape === 'rect') {
            const hMin = itemForm.spec_h * 0.95;
            const hMax = itemForm.spec_h * 1.05;
            query = query.gte('spec_h', hMin).lte('spec_h', hMax);
          }

          const { data, error } = await query.limit(10);
          if (!error && data) matchedItems = [...matchedItems, ...data];
        }

        // 2. 도번 기반 검색 (유사도 80% 이상)
        if (hasPartNo && itemForm.part_no) {
          const prefix = itemForm.part_no.substring(0, 3);
          const { data, error } = await supabase
            .from('estimate_items')
            .select('*, files(id, file_name, file_type, file_path)')
            .ilike('part_no', `${prefix}%`)
            .limit(20);

          if (!error && data) {
            const similarPartItems = data.filter(item => {
              if (!item.part_no) return false;
              const sim = getSimilarity(item.part_no, itemForm.part_no!);
              return sim >= 0.8; 
            });
            matchedItems = [...matchedItems, ...similarPartItems];
          }
        }

        // 중복 제거 및 자기 자신 제외
        const uniqueItemsMap = new Map();
        matchedItems.forEach(item => {
            if (item.id !== editingItem?.id) {
                uniqueItemsMap.set(item.id, item);
            }
        });
        
        setSimilarItems(Array.from(uniqueItemsMap.values()));
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
    let weight = 0, matCost = 0;
    
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
      matCost = weight * material.unit_price;
    }

    const factor = DIFFICULTY_FACTOR[itemForm.difficulty] || 1.2;
    const procCost = itemForm.process_time * itemForm.hourly_rate * factor;
    const baseTotal = matCost + procCost + (itemForm.post_process_cost || 0);
    
    const finalUnitCost = baseTotal * (applicationRate / 100);
    
    return {
      weight: parseFloat(weight.toFixed(2)),
      matCost: Math.round(matCost),
      procCost: Math.round(procCost),
      baseTotal: Math.round(baseTotal),
      finalUnitCost: Math.round(finalUnitCost / 10) * 10 
    };
  }, [itemForm, materials, applicationRate]);

  useEffect(() => {
    setItemForm(prev => ({ ...prev, unit_price: calcResult.finalUnitCost }));
  }, [calcResult.finalUnitCost]);

  const handleSpecChange = (field: 'spec_w' | 'spec_d' | 'spec_h', value: number) => {
    const newItemForm = { ...itemForm, [field]: value };
    // 자동 채우기
    if (field === 'spec_w') newItemForm.raw_w = value + (value > 0 ? 5 : 0);
    if (field === 'spec_d') newItemForm.raw_d = value + (value > 0 ? 5 : 0);
    if (field === 'spec_h') newItemForm.raw_h = value; 
    setItemForm(newItemForm);
  };

  const handleSave = async () => {
    if (!estimateId) return alert('견적서 ID가 없습니다.');
    if (!itemForm.part_name) return alert('품명은 필수입니다.');

    const { data: { user } } = await supabase.auth.getUser();
    
    const finalUnitPrice = itemForm.unit_price;
    const { tempFiles, files, ...cleanItemForm } = itemForm;

    const payload = {
      estimate_id: estimateId,
      ...cleanItemForm,
      material_id: cleanItemForm.material_id || null,
      material_cost: calcResult.matCost,
      processing_cost: calcResult.procCost,
      unit_price: finalUnitPrice,
      supply_price: finalUnitPrice * cleanItemForm.qty,
      updated_by: user?.id
    };

    let savedItemId = editingItem?.id;

    if (editingItem) {
      const { error } = await supabase.from('estimate_items').update(payload).eq('id', editingItem.id);
      if (error) { alert(`수정 실패: ${error.message}`); return; }
    } else {
      const { data, error } = await supabase.from('estimate_items').insert([payload]).select().single();
      if (error) { alert(`저장 실패: ${error.message}`); return; }
      savedItemId = data.id;
    }

    if (savedItemId && itemForm.tempFiles && itemForm.tempFiles.length > 0) {
      await onSaveFiles(savedItemId, itemForm.tempFiles);
    }
    
    onSaveSuccess();
    onClose();
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
                onClick={() => setItemForm({...itemForm, shape: 'rect'})}
                className={`flex-1 py-1.5 text-xs font-bold ${itemForm.shape === 'rect' ? 'bg-slate-700 text-white' : 'text-slate-500 hover:bg-slate-50'}`}
              >
                ⬛ 사각 (Plate)
              </button>
              <button 
                onClick={() => setItemForm({...itemForm, shape: 'round'})}
                className={`flex-1 py-1.5 text-xs font-bold ${itemForm.shape === 'round' ? 'bg-slate-700 text-white' : 'text-slate-500 hover:bg-slate-50'}`}
              >
                ⚫ 원형 (Round)
              </button>
            </div>

            <div className="flex gap-2">
              <div className="flex-1"><label className="block text-xs font-bold text-slate-500 mb-1">품명</label><input className="w-full border p-2 rounded text-sm" value={itemForm.part_name} onChange={e => setItemForm({...itemForm, part_name: e.target.value})} placeholder="품명" /></div>
              <div className="flex-1"><label className="block text-xs font-bold text-slate-500 mb-1">도번</label><input className="w-full border p-2 rounded text-sm" value={itemForm.part_no} onChange={e => setItemForm({...itemForm, part_no: e.target.value})} placeholder="도번" /></div>
            </div>
            
            <div className="flex gap-2">
              {itemForm.shape === 'rect' ? (
                <>
                  <div className="flex-1"><NumberInput label="가로 (mm)" value={itemForm.spec_w} onChange={v => handleSpecChange('spec_w', v)} /></div>
                  <div className="flex-1"><NumberInput label="세로 (mm)" value={itemForm.spec_d} onChange={v => handleSpecChange('spec_d', v)} /></div>
                  <div className="flex-1"><NumberInput label="두께 (mm)" value={itemForm.spec_h} onChange={v => handleSpecChange('spec_h', v)} /></div>
                </>
              ) : (
                <>
                  <div className="flex-1"><NumberInput label="지름 (OD)" value={itemForm.spec_w} onChange={v => handleSpecChange('spec_w', v)} /></div>
                  <div className="flex-1"><NumberInput label="길이 (L)" value={itemForm.spec_d} onChange={v => handleSpecChange('spec_d', v)} /></div>
                  <div className="flex-1 bg-gray-100 rounded opacity-50"><NumberInput label="-" value={0} onChange={() => {}} disabled /></div>
                </>
              )}
            </div>
          </div>
          
          <div className="space-y-3 p-3 bg-blue-50 rounded border border-blue-200">
            <h4 className="text-xs font-bold text-blue-600 uppercase mb-2 border-b border-blue-200 pb-1">2. 소재비 계산</h4>
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1">원자재 선택</label>
              <select 
                className="w-full border p-2 rounded text-sm" 
                value={itemForm.material_id || ''} 
                onChange={e => setItemForm({...itemForm, material_id: e.target.value})}
              >
                <option value="">선택하세요</option>
                {materials.map(m => <option key={m.id} value={m.id}>{m.code} ({m.name})</option>)}
              </select>
            </div>
            
            <div className="flex gap-2">
              {itemForm.shape === 'rect' ? (
                <>
                  <div className="flex-1"><NumberInput label="소재 가로 (mm)" value={itemForm.raw_w} onChange={v => setItemForm({...itemForm, raw_w: v})} /></div>
                  <div className="flex-1"><NumberInput label="소재 세로 (mm)" value={itemForm.raw_d} onChange={v => setItemForm({...itemForm, raw_d: v})} /></div>
                  <div className="flex-1"><NumberInput label="소재 두께 (mm)" value={itemForm.raw_h} onChange={v => setItemForm({...itemForm, raw_h: v})} /></div>
                </>
              ) : (
                <>
                  <div className="flex-1"><NumberInput label="소재 지름 (OD)" value={itemForm.raw_w} onChange={v => setItemForm({...itemForm, raw_w: v})} /></div>
                  <div className="flex-1"><NumberInput label="소재 길이 (L)" value={itemForm.raw_d} onChange={v => setItemForm({...itemForm, raw_d: v})} /></div>
                  <div className="flex-1 bg-gray-100 rounded opacity-50"><NumberInput label="-" value={0} onChange={() => {}} disabled /></div>
                </>
              )}
            </div>
            
            <div className="text-right font-bold text-blue-600 text-sm">
              예상 소재비: ₩ {calcResult.matCost.toLocaleString()}
              {currency !== 'KRW' && <span className="text-slate-500 ml-1 font-normal text-xs">({currencySymbol} {exchangeRate > 0 ? (calcResult.matCost / exchangeRate).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : 0})</span>}
            </div>
          </div>
          
          {/* [복구] 유사 견적 이력 섹션 (검색 결과가 있을 때만 표시) */}
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
                    {/* [복구] 유사 견적 파일 리스트 */}
                    {item.files && item.files.length > 0 && (
                      <div className="mt-1 pt-1 border-t border-yellow-100 flex flex-wrap gap-1">
                        {item.files.map(f => (
                           <span 
                              key={f.id} 
                              className="text-[9px] bg-white border border-yellow-200 px-1 rounded flex items-center gap-1 cursor-pointer hover:bg-yellow-100 text-slate-600" 
                              onClick={() => onOpenFile(f.file_path)}
                              title={`${f.file_type}: ${f.file_name}`}
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
                <div className="flex-1"><NumberInput label="가공 시간 (Hr)" value={itemForm.process_time} onChange={v => setItemForm({...itemForm, process_time: v})} /></div>
                <div className="flex-1"><NumberInput label="임율 (₩/Hr)" value={itemForm.hourly_rate} onChange={v => setItemForm({...itemForm, hourly_rate: v})} /></div>
              </div>
              <div className="flex gap-2">
                <div className="flex-1"><label className="block text-xs font-bold text-slate-500 mb-1">난이도</label><select className="w-full border p-2 rounded text-sm" value={itemForm.difficulty} onChange={e => setItemForm({...itemForm, difficulty: e.target.value})}><option value="A">A (하)</option><option value="B">B (중)</option><option value="C">C (상)</option><option value="D">D (최상)</option><option value="E">E (매우 어려움)</option><option value="F">F (불가/연구)</option></select></div>
                <div className="flex-1"><NumberInput label="후처리비 (₩)" value={itemForm.post_process_cost} onChange={v => setItemForm({...itemForm, post_process_cost: v})} /></div>
              </div>
              <div className="text-right text-orange-600 font-bold text-sm">
                예상 가공비: ₩ {calcResult.procCost.toLocaleString()}
                {currency !== 'KRW' && <span className="text-slate-500 ml-1 font-normal text-xs">({currencySymbol} {exchangeRate > 0 ? (calcResult.procCost / exchangeRate).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : 0})</span>}
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
                          <span className={`text-[10px] px-1 rounded border ${f.file_type === '2D' ? 'bg-red-50 text-red-600' : 'bg-blue-50 text-blue-600'}`}>{f.file_type}</span>
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
              <div className="flex gap-2 items-end mb-4">
                <div className="flex-1"><NumberInput label="수량" value={itemForm.qty} onChange={v => setItemForm({...itemForm, qty: v})} className="font-bold" /></div>
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
                       기본합계: ₩ {calcResult.baseTotal.toLocaleString()}
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
              
              <div>
                <NumberInput 
                  label="최종 적용 단가 (₩)" 
                  value={itemForm.unit_price} 
                  onChange={v => setItemForm({...itemForm, unit_price: v})} 
                  className="text-blue-700 font-extrabold text-xl" 
                />
                {/* 외화 소수점 둘째자리까지 표시 */}
                {currency !== 'KRW' && itemForm.unit_price > 0 && (
                   <div className="text-xs text-right text-slate-500 mt-1 font-bold" style={{fontSize: '70%'}}>
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
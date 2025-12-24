import { EstimateItem, Material, CURRENCY_SYMBOL } from '../../types/estimate';

interface EstimateTableProps {
  items: EstimateItem[];
  materials: Material[];
  currency: string;
  exchangeRate: number;
  selectedItemIds: Set<string>;
  onToggleSelectAll: (checked: boolean) => void;
  onToggleSelectItem: (id: string) => void;
  onEditItem: (item: EstimateItem) => void;
  onDeleteItem: (id: string) => void;
}

export function EstimateTable({ 
  items, materials, currency, exchangeRate, 
  selectedItemIds, onToggleSelectAll, onToggleSelectItem, onEditItem, onDeleteItem 
}: EstimateTableProps) {
  
  const currencySymbol = CURRENCY_SYMBOL[currency] || currency;

  return (
    <div className="border rounded-lg overflow-hidden mb-4 bg-white">
      <table className="min-w-full divide-y divide-slate-200">
        <thead className="bg-slate-100">
          <tr>
            <th className="w-10 px-4 py-2 text-center">
              <input 
                type="checkbox" 
                onChange={(e) => onToggleSelectAll(e.target.checked)} 
                checked={items.length > 0 && selectedItemIds.size === items.length} 
              />
            </th>
            <th className="px-4 py-2 text-left text-xs font-bold text-slate-500 uppercase">도번(품명)</th>
            <th className="px-4 py-2 text-left text-xs font-bold text-slate-500 uppercase">
              제품 규격 <span className="normal-case">(mm)</span>
            </th>
            <th className="px-4 py-2 text-left text-xs font-bold text-slate-500 uppercase">원자재</th>
            <th className="px-4 py-2 text-right text-xs font-bold text-slate-500 uppercase">수량</th>
            <th className="px-4 py-2 text-right text-xs font-bold text-slate-500 uppercase">소요일</th>
            <th className="px-4 py-2 text-right text-xs font-bold text-slate-500 uppercase">단가 (₩)</th>
            <th className="px-4 py-2 text-right text-xs font-bold text-slate-500 uppercase">합계 (₩)</th>
            <th className="px-4 py-2 text-center text-xs font-bold text-slate-500 uppercase">관리</th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-slate-200">
          {items.length === 0 ? (
            <tr><td colSpan={9} className="text-center py-12 text-slate-400">등록된 품목이 없습니다.</td></tr>
          ) : (
            items.map((item, idx) => {
              const mat = item.material_id ? materials.find(m => m.id === item.material_id) : null;
              
              // 파일 타입별 개수 카운트
              const count2D = item.files?.filter(f => ['2D', 'PDF', 'DWG', 'DXF'].includes(f.file_type) || /\.(pdf|dwg|dxf)$/i.test(f.file_name)).length || 0;
              const count3D = item.files?.filter(f => ['3D', 'STP', 'STEP', 'IGS', 'X_T'].includes(f.file_type) || /\.(stp|step|igs|iges|x_t)$/i.test(f.file_name)).length || 0;
              
              const foreignUnit = currency !== 'KRW' && exchangeRate > 0 ? item.unit_price / exchangeRate : 0;
              const foreignSupply = currency !== 'KRW' && exchangeRate > 0 ? (item.supply_price || 0) / exchangeRate : 0;

              return (
                <tr key={item.id || idx} className="hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-2 text-center">
                    <input 
                      type="checkbox" 
                      checked={selectedItemIds.has(item.id!)} 
                      onChange={() => onToggleSelectItem(item.id!)} 
                    />
                  </td>
                  <td className="px-4 py-2 text-sm">
                    <div className="flex items-center gap-1.5 font-bold text-slate-800">
                      {item.part_no || '(도번없음)'}
                      {count2D > 0 && <span className="text-[10px] px-1.5 py-0.5 rounded border bg-red-50 text-red-600 border-red-200 whitespace-nowrap">2D {count2D}</span>}
                      {count3D > 0 && <span className="text-[10px] px-1.5 py-0.5 rounded border bg-blue-50 text-blue-600 border-blue-200 whitespace-nowrap">3D {count3D}</span>}
                    </div>
                    <div className="text-xs text-slate-500">{item.part_name}</div>
                  </td>
                  <td className="px-4 py-2 text-sm text-slate-600">
                    {item.shape === 'round' ? `⌀${item.spec_w} x ${item.spec_d}L` : `${item.spec_w} x ${item.spec_d} x ${item.spec_h}t`}
                  </td>
                  <td className="px-4 py-2 text-sm text-slate-600">
                    {mat ? <><span className="font-bold text-blue-600">{mat.code}</span><br/><span className="text-xs text-slate-400">{mat.name}</span></> : '-'}
                  </td>
                  <td className="px-4 py-2 text-sm text-right">{item.qty}</td>
                  <td className="px-4 py-2 text-sm text-right">{item.work_days || 0}일</td>
                  <td className="px-4 py-2 text-sm text-right">
                    <div>{item.unit_price.toLocaleString()}</div>
                    {currency !== 'KRW' && (
                      <div className="text-[10px] text-slate-400 font-normal mt-0.5" style={{fontSize: '70%'}}>
                        ≈ {currencySymbol} {foreignUnit.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-2 text-sm text-right font-bold text-blue-600">
                    <div>{(item.supply_price || 0).toLocaleString()}</div>
                    {currency !== 'KRW' && (
                      <div className="text-[10px] text-blue-400 font-normal mt-0.5" style={{fontSize: '70%'}}>
                        ≈ {currencySymbol} {foreignSupply.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-2 text-center space-x-2">
                    <button onClick={() => onEditItem(item)} className="text-blue-500 hover:text-blue-700 text-xs font-bold transition-colors">수정</button>
                    <button onClick={() => onDeleteItem(item.id!)} className="text-red-500 hover:text-red-700 text-xs font-bold transition-colors">삭제</button>
                  </td>
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
}
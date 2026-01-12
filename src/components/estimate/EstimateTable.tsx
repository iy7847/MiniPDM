import { EstimateItem, Material, CURRENCY_SYMBOL, PostProcessing, HeatTreatment } from '../../types/estimate';
import { Button } from '../common/ui/Button';

interface EstimateTableProps {
  items: EstimateItem[];
  materials: Material[];
  postProcessings: PostProcessing[]; // [New]
  heatTreatments: HeatTreatment[];   // [New]
  currency: string;
  exchangeRate: number;
  selectedItemIds: Set<string>;
  onToggleSelectAll: (checked: boolean) => void;
  onToggleSelectItem: (id: string) => void;
  onEditItem: (item: EstimateItem) => void;
  onDeleteItem: (id: string) => void;
  onUpdateItem: (itemId: string, updates: Partial<EstimateItem>) => void;
  canViewMargins?: boolean;

}

export function EstimateTable({
  items, materials, postProcessings, heatTreatments, currency, exchangeRate,
  selectedItemIds, onToggleSelectAll, onToggleSelectItem, onEditItem, onDeleteItem, onUpdateItem,
  canViewMargins = true,

}: EstimateTableProps) {

  const currencySymbol = CURRENCY_SYMBOL[currency] || currency;

  return (
    <div className="flex flex-col gap-4">
      {/* 데스크톱 테이블 뷰 */}
      <div className="hidden md:block bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <table className="min-w-full divide-y divide-slate-200 relative">
          <thead className="bg-slate-50 sticky top-0 z-10 shadow-sm font-bold text-slate-500 uppercase">
            <tr>
              <th className="w-10 px-4 py-3 text-center">
                <input
                  type="checkbox"
                  onChange={(e) => onToggleSelectAll(e.target.checked)}
                  checked={items.length > 0 && selectedItemIds.size === items.length}
                  className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                />
              </th>
              <th className="px-3 py-3 text-left text-xs tracking-wider">도번/품명</th>
              <th className="px-3 py-3 text-left text-xs tracking-wider">규격/소재</th>
              <th className="px-3 py-3 text-right text-xs tracking-wider">무게<br />(kg)</th>

              {/* [New Columns] */}
              <th className="px-3 py-3 text-center text-xs tracking-wider w-24">열처리</th>
              <th className="px-3 py-3 text-center text-xs tracking-wider w-24">후처리</th>
              <th className="px-3 py-3 text-center text-xs tracking-wider w-16">난이도</th>

              <th className="px-3 py-3 text-right text-xs tracking-wider">수량</th>
              {canViewMargins && (
                <>
                  <th className="px-3 py-3 text-right text-xs tracking-wider">가공시간<br />(Hr)</th>
                  <th className="px-3 py-3 text-right text-xs tracking-wider">이윤<br />(%)</th>
                </>
              )}
              <th className="px-3 py-3 text-right text-xs tracking-wider">단가 (₩)</th>
              <th className="px-3 py-3 text-right text-xs tracking-wider">합계 (₩)</th>
              <th className="px-3 py-3 text-center text-xs tracking-wider w-16">관리</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-slate-200">
            {items.length === 0 ? (
              <tr><td colSpan={canViewMargins ? 13 : 11} className="text-center py-12 text-slate-400">등록된 품목이 없습니다.</td></tr>
            ) : (
              items.map((item, idx) => {
                const mat = item.material_id ? materials.find(m => m.id === item.material_id) : null;
                const count2D = item.files?.filter(f => ['2D', 'PDF', 'DWG', 'DXF'].includes(f.file_type) || /\.(pdf|dwg|dxf)$/i.test(f.file_name)).length || 0;
                const count3D = item.files?.filter(f => ['3D', 'STP', 'STEP', 'IGS', 'X_T'].includes(f.file_type) || /\.(stp|step|igs|iges|x_t)$/i.test(f.file_name)).length || 0;
                const foreignUnit = currency !== 'KRW' && exchangeRate > 0 ? item.unit_price / exchangeRate : 0;
                const foreignSupply = currency !== 'KRW' && exchangeRate > 0 ? (item.supply_price || 0) / exchangeRate : 0;

                // Calculate Weight Live
                let weight = 0;
                if (mat) {
                  if (item.shape === 'rect' && item.raw_w && item.raw_d && item.raw_h) {
                    weight = (item.raw_w * item.raw_d * item.raw_h * mat.density) / 1000000;
                  } else if (item.shape === 'round' && item.raw_w && item.raw_d) {
                    const r = item.raw_w / 2;
                    weight = (Math.PI * r * r * item.raw_d * mat.density) / 1000000;
                  }
                }

                return (
                  <tr key={item.id || idx} className="hover:bg-slate-50 transition-colors group">
                    <td className="px-4 py-3 text-center">
                      <input
                        type="checkbox"
                        checked={selectedItemIds.has(item.id!)}
                        onChange={() => onToggleSelectItem(item.id!)}
                        className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                      />
                    </td>
                    <td className="px-3 py-4 whitespace-nowrap text-sm">
                      <div className="font-bold text-slate-800 text-xs truncate max-w-[120px]" title={item.part_no}>{item.part_no || '(도번없음)'}</div>
                      <div className="text-[10px] text-slate-500 truncate max-w-[120px]" title={item.part_name}>{item.part_name}</div>
                      <div className="flex gap-1 mt-1">
                        {count2D > 0 && <span className="text-[9px] px-1 py-0.5 rounded border bg-red-50 text-red-600 border-red-200">2D</span>}
                        {count3D > 0 && <span className="text-[9px] px-1 py-0.5 rounded border bg-blue-50 text-blue-600 border-blue-200">3D</span>}
                      </div>
                    </td>
                    <td className="px-3 py-4 whitespace-nowrap text-xs text-slate-600">
                      <div>{item.shape === 'round' ? `⌀${item.spec_w} x ${item.spec_d}L` : `${item.spec_w} x ${item.spec_d} x ${item.spec_h}t`}</div>
                      <div className="text-blue-600 font-bold mt-0.5">{mat ? mat.code : '-'}</div>
                    </td>
                    <td className="px-3 py-4 whitespace-nowrap text-xs text-right text-slate-900 font-bold">
                      {weight > 0 ? weight.toFixed(2) : '-'}
                    </td>

                    {/* [New Columns Inputs] */}
                    <td className="px-1 py-3">
                      <select
                        className="w-full text-[11px] p-1 border rounded bg-slate-50 focus:bg-white truncate"
                        value={item.heat_treatment_id || ''}
                        onChange={(e) => onUpdateItem(item.id!, { heat_treatment_id: e.target.value || null })}
                      >
                        <option value="">(없음)</option>
                        {heatTreatments.map(ht => <option key={ht.id} value={ht.id}>{ht.name}</option>)}
                      </select>
                    </td>
                    <td className="px-1 py-3">
                      <select
                        className="w-full text-[11px] p-1 border rounded bg-slate-50 focus:bg-white truncate"
                        value={item.post_processing_id || ''}
                        onChange={(e) => onUpdateItem(item.id!, { post_processing_id: e.target.value || null })}
                      >
                        <option value="">(없음)</option>
                        {postProcessings.map(pp => <option key={pp.id} value={pp.id}>{pp.name}</option>)}
                      </select>
                    </td>
                    <td className="px-1 py-3">
                      <select
                        className="w-full text-[11px] p-1 border rounded bg-slate-50 focus:bg-white text-center"
                        value={item.difficulty || 'B'}
                        onChange={(e) => onUpdateItem(item.id!, { difficulty: e.target.value })}
                      >
                        {/* A~F */}
                        {['A', 'B', 'C', 'D', 'E', 'F'].map(d => <option key={d} value={d}>{d}</option>)}
                      </select>
                    </td>

                    <td className="px-3 py-4 whitespace-nowrap text-xs text-right text-slate-900">{item.qty}</td>

                    {/* Editable Process Time */}
                    {canViewMargins && (
                      <td className="px-2 py-3 whitespace-nowrap text-right w-20">
                        <input
                          type="number"
                          step="0.1"
                          value={item.process_time || 0}
                          onChange={(e) => onUpdateItem(item.id!, { process_time: parseFloat(e.target.value) })}
                          className="w-16 p-1 text-right text-xs border rounded focus:ring-2 focus:ring-blue-500 outline-none bg-slate-50 focus:bg-white transition-all"
                        />
                      </td>
                    )}

                    {/* Editable Profit Rate */}
                    {canViewMargins && (
                      <td className="px-2 py-3 whitespace-nowrap text-right w-16">
                        <input
                          type="number"
                          value={item.profit_rate || 0}
                          onChange={(e) => onUpdateItem(item.id!, { profit_rate: parseFloat(e.target.value) })}
                          className="w-12 p-1 text-right text-xs border rounded focus:ring-2 focus:ring-red-500 outline-none bg-red-50 focus:bg-white text-red-600 font-bold transition-all"
                        />
                      </td>
                    )}

                    <td className="px-3 py-4 whitespace-nowrap text-xs text-right">
                      <div className="font-medium text-slate-700">{item.unit_price.toLocaleString()}</div>
                      {currency !== 'KRW' && (
                        <div className="text-[10px] text-slate-400 font-normal">
                          {currencySymbol} {foreignUnit.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                        </div>
                      )}
                    </td>
                    <td className="px-3 py-4 whitespace-nowrap text-xs text-right">
                      <div className="font-bold text-blue-700">{(item.supply_price || 0).toLocaleString()}</div>
                      {currency !== 'KRW' && (
                        <div className="text-[10px] text-blue-400 font-normal">
                          {currencySymbol} {foreignSupply.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                        </div>
                      )}
                    </td>
                    <td className="px-2 py-4 whitespace-nowrap text-center text-sm">
                      <div className="flex flex-col gap-1 items-center">
                        <Button
                          onClick={() => onEditItem(item)}
                          variant="secondary"
                          size="sm"
                          className="w-full justify-center h-[28px] opacity-70 hover:opacity-100 p-0"
                          title="수정"
                        >
                          ✏️
                        </Button>
                        <Button
                          onClick={() => onDeleteItem(item.id!)}
                          variant="danger"
                          size="sm"
                          className="w-full justify-center h-[28px] opacity-70 hover:opacity-100 p-0"
                          title="삭제"
                        >
                          🗑️
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* 모바일 카드 뷰 */}
      <div className="md:hidden space-y-3 pb-20">
        {items.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-xl border border-dashed border-slate-300 text-slate-400 font-bold">
            등록된 품목이 없습니다.
          </div>
        ) : (
          items.map((item, idx) => {
            const mat = item.material_id ? materials.find(m => m.id === item.material_id) : null;
            const count2D = item.files?.filter(f => ['2D', 'PDF', 'DWG', 'DXF'].includes(f.file_type) || /\.(pdf|dwg|dxf)$/i.test(f.file_name)).length || 0;
            const count3D = item.files?.filter(f => ['3D', 'STP', 'STEP', 'IGS', 'X_T'].includes(f.file_type) || /\.(stp|step|igs|iges|x_t)$/i.test(f.file_name)).length || 0;
            const foreignSupply = currency !== 'KRW' && exchangeRate > 0 ? (item.supply_price || 0) / exchangeRate : 0;

            return (
              <div key={item.id || idx} className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 active:bg-slate-50 transition-colors">
                <div className="flex justify-between items-start mb-3">
                  <div className="flex items-start gap-3">
                    <input
                      type="checkbox"
                      checked={selectedItemIds.has(item.id!)}
                      onChange={() => onToggleSelectItem(item.id!)}
                      className="w-5 h-5 text-blue-600 rounded mt-1"
                    />
                    <div>
                      <div className="flex items-center gap-1.5 mb-1 flex-wrap">
                        <h4 className="text-base font-black text-slate-800 tracking-tight">{item.part_no || '(도번없음)'}</h4>
                        <div className="flex gap-1">
                          {count2D > 0 && <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-red-100 text-red-600 font-bold">2D</span>}
                          {count3D > 0 && <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-blue-100 text-blue-600 font-bold">3D</span>}
                        </div>
                      </div>
                      <p className="text-xs text-slate-500 font-medium">{item.part_name || 'No Name'}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-black text-blue-700 leading-none">₩{(item.supply_price || 0).toLocaleString()}</p>
                    {currency !== 'KRW' && (
                      <p className="text-[10px] text-blue-400 font-bold mt-1">
                        {currencySymbol} {foreignSupply.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                      </p>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 text-[11px] bg-slate-50 p-3 rounded-lg border border-slate-100 mb-3">
                  <div className="flex flex-col gap-1">
                    <p className="text-slate-400 font-bold">규격/소재</p>
                    <p className="text-slate-700 font-bold">
                      {item.shape === 'round' ? `⌀${item.spec_w}x${item.spec_d}L` : `${item.spec_w}x${item.spec_d}x${item.spec_h}`}
                    </p>
                    <p className="text-blue-600 font-bold truncate">{mat?.code || '-'}</p>
                  </div>
                  <div className="flex flex-col gap-1 text-right">
                    <p className="text-slate-400 font-bold">수량/소요</p>
                    <p className="text-slate-800 font-black text-sm">{item.qty} EA</p>
                    <p className="text-slate-500 font-bold">납기: {item.work_days || 0}일</p>
                  </div>
                </div>

                <div className="flex justify-end gap-3">
                  <Button
                    onClick={() => onDeleteItem(item.id!)}
                    variant="danger"
                    size="sm"
                    className="h-[32px] w-[32px] p-0 flex items-center justify-center opacity-70 hover:opacity-100"
                  >
                    🗑️
                  </Button>
                  <Button
                    onClick={() => onEditItem(item)}
                    variant="secondary"
                    size="sm"
                    className="h-[32px] w-[32px] p-0 flex items-center justify-center opacity-70 hover:opacity-100"
                  >
                    ✏️
                  </Button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

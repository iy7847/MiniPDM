import { useState, useEffect } from 'react';
import { EstimateItem, Material, CURRENCY_SYMBOL, PostProcessing, HeatTreatment } from '../../types/estimate';
import { Button } from '../common/ui/Button';

interface EstimateTableProps {
  items: EstimateItem[];
  materials: Material[];
  postProcessings: PostProcessing[];
  heatTreatments: HeatTreatment[];
  currency: string;
  exchangeRate: number;
  selectedItemIds: Set<string>;
  onToggleSelectAll: (checked: boolean) => void;
  onToggleSelectItem: (id: string) => void;
  onEditItem: (item: EstimateItem) => void;
  onDeleteItem: (id: string) => void;
  onUpdateItem: (itemId: string, updates: Partial<EstimateItem>) => void;
  canViewMargins?: boolean;
  timeStep?: number;
  isLocked?: boolean;
}

// [최적화된 입력] 모든 키 입력에 대한 리렌더링을 방지합니다.
interface TableCellInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  value: string | number;
  onUpdate: (val: any) => void;
  type?: 'text' | 'number';
}

const TableCellInput = ({ value, onUpdate, type = 'text', className = '', disabled, ...props }: TableCellInputProps) => {
  const [localVal, setLocalVal] = useState<string | number>(value);

  useEffect(() => { setLocalVal(value); }, [value]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => setLocalVal(e.target.value);
  const handleBlur = () => {
    if (localVal !== value) {
      if (type === 'number') onUpdate(parseFloat(localVal as string));
      else onUpdate(localVal);
    }
  };
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') handleBlur();
  };

  return (
    <input
      type={type}
      value={localVal || ''}
      onChange={handleChange}
      onBlur={handleBlur}
      onKeyDown={handleKeyDown}
      className={className}
      disabled={disabled}
      {...props}
    />
  );
};

export function EstimateTable(props: EstimateTableProps) {
  const {
    items,
    materials,
    postProcessings,
    heatTreatments,
    currency,
    exchangeRate,
    selectedItemIds,
    onToggleSelectAll,
    onToggleSelectItem,
    onEditItem,
    onDeleteItem,
    onUpdateItem,
    canViewMargins = true,
    timeStep = 0.1,
    isLocked = false
  } = props;

  const currencySymbol = CURRENCY_SYMBOL[currency] || currency;

  return (
    <div className="flex flex-col gap-4">
      {/* 데스크톱 테이블 뷰 */}
      <div className="hidden md:block bg-white rounded-2xl overflow-hidden">
        <table className="min-w-full divide-y divide-slate-100 relative border-collapse">
          <thead className="bg-slate-50/50 sticky top-0 z-10 font-black text-slate-400 uppercase tracking-widest text-[10px]">
            <tr>
              <th className="w-12 px-4 py-4 text-center">
                <input
                  type="checkbox"
                  onChange={(e) => onToggleSelectAll(e.target.checked)}
                  checked={items.length > 0 && selectedItemIds.size === items.length}
                  className="w-5 h-5 text-brand-600 rounded-lg focus:ring-brand-500 border-slate-300 transition-all"
                />
              </th>
              <th className="px-4 py-4 text-left w-[180px]">품목 정보 (Part Info)</th>
              <th className="px-4 py-4 text-left w-[140px]">규격 / 소재</th>
              <th className="px-4 py-4 text-right w-[80px]">무게(kg)</th>

              <th className="px-2 py-4 text-center w-[100px]">열처리</th>
              <th className="px-2 py-4 text-center w-[120px]">후처리</th>
              <th className="px-2 py-4 text-center w-[60px]">난이도</th>

              <th className="px-4 py-4 text-right w-[60px]">수량</th>
              {canViewMargins && (
                <>
                  <th className="px-2 py-4 text-right w-[80px]">가공(Hr)</th>
                  <th className="px-2 py-4 text-right w-[70px]">이윤%</th>
                </>
              )}
              <th className="px-4 py-4 text-left min-w-[120px]">비고 (Notes)</th>
              <th className="px-4 py-4 text-right w-[120px]">단가 (Unit)</th>
              <th className="px-4 py-4 text-right w-[130px] bg-slate-100/30">합계 (Total)</th>
              {!isLocked && <th className="px-4 py-4 text-center w-[80px]">관리</th>}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-slate-50">
            {items.length === 0 ? (
              <tr><td colSpan={canViewMargins ? 14 : 12} className="text-center py-24 text-slate-300 font-medium">등록된 품목이 없습니다. 도면 파일을 드래그하여 추가해보세요.</td></tr>
            ) : (
              items.map((item, idx) => {
                const mat = item.material_id ? materials.find(m => m.id === item.material_id) : null;
                const count2D = item.files?.filter(f => ['2D', 'PDF', 'DWG', 'DXF'].includes(f.file_type) || /\.(pdf|dwg|dxf)$/i.test(f.file_name)).length || 0;
                const count3D = item.files?.filter(f => ['3D', 'STP', 'STEP', 'IGS', 'X_T'].includes(f.file_type) || /\.(stp|step|igs|iges|x_t)$/i.test(f.file_name)).length || 0;
                const foreignUnit = currency !== 'KRW' && exchangeRate > 0 ? item.unit_price / exchangeRate : 0;
                const foreignSupply = currency !== 'KRW' && exchangeRate > 0 ? (item.supply_price || 0) / exchangeRate : 0;

                // 실시간 중량 계산
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
                  <tr key={item.id || idx} className={`transition-all group ${selectedItemIds.has(item.id!) ? 'bg-brand-50/30' : 'hover:bg-slate-50/80'}`}>
                    <td className="px-4 py-4 text-center">
                      <input
                        type="checkbox"
                        checked={selectedItemIds.has(item.id!)}
                        onChange={() => onToggleSelectItem(item.id!)}
                        className="w-5 h-5 text-brand-600 rounded-lg focus:ring-brand-500 border-slate-300 transition-all cursor-pointer"
                      />
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      <div className="flex flex-col gap-0.5 max-w-[160px]">
                        <div className="font-black text-slate-800 text-sm tracking-tight truncate leading-tight" title={item.part_no}>{item.part_no || '(도번없음)'}</div>
                        <div className="text-[11px] text-slate-400 font-medium truncate" title={item.part_name}>{item.part_name || '-'}</div>
                        <div className="flex gap-1.5 mt-1.5">
                          {count2D > 0 && (
                            <div className="flex items-center gap-1 group/badge cursor-default" title="2D 도면 포함">
                              <span className="w-1.5 h-1.5 rounded-full bg-red-400 shadow-[0_0_5px_rgba(248,113,113,0.4)]"></span>
                              <span className="text-[9px] font-black text-red-500/70 tracking-tighter uppercase">2D</span>
                            </div>
                          )}
                          {count3D > 0 && (
                            <div className="flex items-center gap-1 group/badge cursor-default" title="3D 모델 포함">
                              <span className="w-1.5 h-1.5 rounded-full bg-blue-400 shadow-[0_0_5px_rgba(96,165,250,0.4)]"></span>
                              <span className="text-[9px] font-black text-blue-500/70 tracking-tighter uppercase">3D</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      <div className="flex flex-col gap-1 items-start">
                        <span className="text-xs font-bold text-slate-600 bg-slate-100/50 px-1.5 py-0.5 rounded leading-none">
                          {item.shape === 'round' ? `⌀${item.spec_w} × ${item.spec_d}L` : `${item.spec_w} × ${item.spec_d} × ${item.spec_h}`}
                        </span>
                        <span className="text-[11px] font-black text-brand-600 tracking-tight">{mat ? mat.code : '-'}</span>
                      </div>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-right font-mono text-xs text-slate-500">
                      {weight > 0 ? (
                        <span className="font-bold text-slate-800">{weight.toFixed(2)}</span>
                      ) : '-'}
                    </td>

                    <td className="px-1 py-4">
                      <select
                        className="w-full text-[11px] font-bold p-1.5 border-none bg-slate-50 hover:bg-white focus:ring-1 focus:ring-brand-200 rounded-lg transition-all appearance-none text-center text-slate-600 disabled:opacity-70"
                        value={item.heat_treatment_id || ''}
                        onChange={(e) => onUpdateItem(item.id!, { heat_treatment_id: e.target.value || null })}
                        disabled={isLocked}
                      >
                        <option value="">-</option>
                        {heatTreatments.map(ht => <option key={ht.id} value={ht.id}>{ht.name}</option>)}
                      </select>
                    </td>
                    <td className="px-1 py-4">
                      <select
                        className="w-full text-[11px] font-bold p-1.5 border-none bg-slate-50 hover:bg-white focus:ring-1 focus:ring-brand-200 rounded-lg transition-all appearance-none text-center text-slate-600 disabled:opacity-70"
                        value={item.post_processing_id || ''}
                        onChange={(e) => onUpdateItem(item.id!, { post_processing_id: e.target.value || null })}
                        disabled={isLocked}
                      >
                        <option value="">-</option>
                        {postProcessings.map(pp => <option key={pp.id} value={pp.id}>{pp.name}</option>)}
                      </select>
                    </td>
                    <td className="px-1 py-4">
                      <select
                        className="w-full text-[11px] font-black p-1.5 border-none bg-slate-50 hover:bg-white focus:ring-1 focus:ring-brand-200 rounded-lg transition-all appearance-none text-center text-slate-700 disabled:opacity-70"
                        value={item.difficulty || 'B'}
                        onChange={(e) => onUpdateItem(item.id!, { difficulty: e.target.value })}
                        disabled={isLocked}
                      >
                        {['A', 'B', 'C', 'D', 'E', 'F'].map(d => <option key={d} value={d}>{d}</option>)}
                      </select>
                    </td>

                    <td className="px-4 py-4 whitespace-nowrap text-right">
                      <span className="text-sm font-black text-slate-800">{item.qty}</span>
                    </td>

                    {canViewMargins && (
                      <td className="px-2 py-4 whitespace-nowrap text-right">
                        <input
                          type="number"
                          step={timeStep}
                          value={item.process_time || 0}
                          onChange={(e) => onUpdateItem(item.id!, { process_time: parseFloat(e.target.value) })}
                          className="w-14 p-1.5 text-right text-xs font-bold border-none rounded-lg focus:ring-2 focus:ring-brand-200 outline-none bg-slate-50 transition-all text-slate-700 disabled:opacity-70"
                          disabled={isLocked}
                        />
                      </td>
                    )}

                    {canViewMargins && (
                      <td className="px-2 py-4 whitespace-nowrap text-right">
                        <input
                          type="number"
                          value={item.profit_rate || 0}
                          onChange={(e) => onUpdateItem(item.id!, { profit_rate: parseFloat(e.target.value) })}
                          className="w-12 p-1.5 text-right text-xs font-black border-none rounded-lg focus:ring-2 focus:ring-orange-200 outline-none bg-orange-50/50 text-orange-600 transition-all disabled:opacity-70"
                          disabled={isLocked}
                        />
                      </td>
                    )}

                    <td className="px-4 py-4 whitespace-nowrap">
                      <TableCellInput
                        type="text"
                        value={item.note || ''}
                        onUpdate={(val: string) => onUpdateItem(item.id!, { note: val })}
                        className="w-full text-xs font-medium p-1.5 border-none rounded-lg focus:ring-2 focus:ring-brand-100 outline-none bg-slate-50 hover:bg-white transition-all text-slate-500 focus:text-slate-800 disabled:opacity-70"
                        placeholder="메모를 입력하세요..."
                        disabled={isLocked}
                      />
                    </td>

                    <td className="px-4 py-4 whitespace-nowrap text-right">
                      <div className="flex flex-col items-end">
                        <span className="text-sm font-bold text-slate-700 leading-none mb-1">{item.unit_price.toLocaleString()}</span>
                        {currency !== 'KRW' && (
                          <span className="text-[10px] font-medium text-slate-400">
                            {currencySymbol}{foreignUnit.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-right bg-brand-50/20 group-hover:bg-brand-50/40 border-l border-brand-50 transition-colors">
                      <div className="flex flex-col items-end">
                        <span className="text-base font-black text-brand-700 leading-none mb-1">{(item.supply_price || 0).toLocaleString()}</span>
                        {currency !== 'KRW' && (
                          <span className="text-[10px] font-bold text-brand-400/80">
                            {currencySymbol}{foreignSupply.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                          </span>
                        )}
                      </div>
                    </td>
                    {!isLocked && (
                      <td className="px-4 py-4 whitespace-nowrap text-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => onEditItem(item)}
                            className="p-1.5 text-slate-400 hover:text-brand-600 hover:bg-white rounded-lg transition-all shadow-sm border border-transparent hover:border-slate-100"
                            title="상세 수정"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                            </svg>
                          </button>
                          <button
                            onClick={() => onDeleteItem(item.id!)}
                            className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-white rounded-lg transition-all shadow-sm border border-transparent hover:border-slate-100"
                            title="품목 삭제"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      </td>
                    )}
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

                {!isLocked && (
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
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

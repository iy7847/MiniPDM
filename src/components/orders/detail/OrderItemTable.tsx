
import { AttachedFile } from '../../../hooks/useOrderLogic';
import { OrderItem } from '../../../types/order';

interface OrderItemTableProps {
    items: OrderItem[];
    selectedIds: Set<string>;
    onToggleSelect: (id: string) => void;
    onPreviewFile: (file: AttachedFile) => void;
    files: AttachedFile[];
    onUpdateItem: (itemId: string, updates: Partial<OrderItem>) => void; // [New]
}

export const OrderItemTable = ({ items, selectedIds, onToggleSelect, files, onPreviewFile, onUpdateItem }: OrderItemTableProps) => { // [Updated]
    return (
        <div className="flex flex-col gap-4">
            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto min-h-[400px]">
                <table className="min-w-full divide-y divide-slate-100 relative border-collapse">
                    <thead className="bg-slate-50/50 font-black text-slate-400 uppercase tracking-widest text-[10px] sticky top-0 z-10">
                        <tr>
                            <th className="px-4 py-4 w-10 text-center">✓</th>
                            <th className="px-4 py-4 w-12 text-center text-[9px]">NO</th>
                            <th className="px-4 py-4 w-24 text-center">구분</th>
                            <th className="px-4 py-4 w-28">상태</th>
                            <th className="px-4 py-4 min-w-[220px]">품목 정보 (Item)</th>
                            <th className="px-4 py-4 w-32">규격 (Spec)</th>
                            <th className="px-4 py-4 w-20 text-right">수량</th>
                            <th className="px-4 py-4 w-28 text-right">단가</th>
                            <th className="px-4 py-4 w-32 text-right bg-slate-100/30">공급가액</th>
                            <th className="px-4 py-4 w-32 text-center">납기일</th>
                            <th className="px-4 py-4 w-32 text-center">첨부</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                        {items.map((item, index) => {
                            // Find files for this item
                            const myFiles = files.filter(f => f.order_item_id === item.id);

                            return (
                                <tr
                                    key={item.id}
                                    className={`hover:bg-indigo-50 transition-colors ${selectedIds.has(item.id) ? 'bg-indigo-50' : ''}`}
                                >
                                    <td className="p-3 text-center">
                                        <input
                                            type="checkbox"
                                            checked={selectedIds.has(item.id)}
                                            onChange={() => onToggleSelect(item.id)}
                                            className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                                        />
                                    </td>
                                    <td className="p-3 text-center text-xs font-mono text-slate-500">
                                        {index + 1}
                                    </td>

                                    <td className="p-3 text-center">
                                        <select
                                            value={item.production_type || 'INHOUSE'}
                                            onChange={(e) => onUpdateItem(item.id, { production_type: e.target.value as any })}
                                            className={`text-xs font-bold border rounded p-1 outline-none ${(item.production_type || 'INHOUSE') === 'OUTSOURCE'
                                                ? 'text-orange-600 border-orange-200 bg-orange-50'
                                                : 'text-slate-600 border-slate-200 bg-white'
                                                }`}
                                        >
                                            <option value="INHOUSE">사내</option>
                                            <option value="OUTSOURCE">외주</option>
                                        </select>
                                    </td>

                                    <td className="px-4 py-4">
                                        <span className={`px-2 py-1 rounded-lg text-[10px] font-black uppercase tracking-tight shadow-sm border
                                        ${item.process_status === 'WAITING' ? 'bg-slate-100 text-slate-600 border-slate-200' : ''}
                                        ${item.process_status === 'PROCESSING' ? 'bg-indigo-50 text-indigo-700 border-indigo-100' : ''}
                                        ${item.process_status === 'DONE' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : ''}
                                    `}>
                                            {item.process_status === 'PROCESSING' ? '진행' : item.process_status === 'DONE' ? '완료' : '대기'}
                                        </span>
                                    </td>
                                    <td className="p-3">
                                        <div className="font-bold text-slate-800">{item.part_name}</div>
                                        <div className="text-xs text-slate-500 font-mono mt-0.5">{item.part_no}</div>
                                        {item.material_name && (
                                            <div className="text-xs text-slate-400 mt-0.5">{item.material_name}</div>
                                        )}
                                    </td>
                                    <td className="p-3 text-xs">{item.spec}</td>
                                    <td className="p-3 text-right font-bold">{item.qty?.toLocaleString()}</td>
                                    <td className="p-3 text-right text-slate-600">
                                        {item.unit_price?.toLocaleString()}
                                    </td>
                                    <td className="p-3 text-right font-bold text-slate-800">
                                        {item.supply_price?.toLocaleString()}
                                    </td>
                                    <td className="p-3 text-center">
                                        <input
                                            type="date"
                                            value={item.due_date ? item.due_date.split('T')[0] : ''}
                                            onChange={(e) => onUpdateItem(item.id, { due_date: e.target.value })}
                                            className="w-full text-xs text-center border-none bg-transparent hover:bg-slate-100 rounded focus:ring-2 focus:ring-blue-500 outline-none"
                                        />
                                    </td>
                                    <td className="p-3 text-center">
                                        <div className="flex flex-col gap-1 items-center">
                                            {myFiles.map(f => {
                                                const fileName = f.file_name || '';
                                                const ext = fileName.split('.').pop()?.toLowerCase() || '';
                                                const is2D = ['pdf', 'dwg', 'dxf'].includes(ext);
                                                const is3D = ['stp', 'step', 'igs', 'iges', 'x_t'].includes(ext);

                                                return (
                                                    <button
                                                        key={f.id}
                                                        onClick={() => onPreviewFile(f)}
                                                        className="text-[10px] px-2 py-0.5 bg-white border border-slate-200 rounded hover:bg-blue-50 hover:text-blue-600 truncate max-w-[140px] flex items-center gap-1"
                                                        title={fileName}
                                                    >
                                                        {is2D && <span className="px-1 rounded bg-red-100 text-red-600 font-bold text-[9px]">2D</span>}
                                                        {is3D && <span className="px-1 rounded bg-blue-100 text-blue-600 font-bold text-[9px]">3D</span>}
                                                        <span className="truncate">{fileName}</span>
                                                    </button>
                                                );
                                            })}
                                            {myFiles.length === 0 && <span className="text-slate-300">-</span>}
                                        </div>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            {/* Mobile Card View */}
            <div className="md:hidden space-y-4">
                {items.length === 0 ? (
                    <div className="text-center py-20 bg-white rounded-2xl border border-dashed border-slate-200 text-slate-400 font-bold">
                        품목이 없습니다.
                    </div>
                ) : (
                    items.map((item) => {
                        const myFiles = files.filter(f => f.order_item_id === item.id);
                        return (
                            <div key={item.id} className="bg-white p-4 rounded-2xl shadow-soft border border-slate-100 active:bg-slate-50 transition-all">
                                <div className="flex justify-between items-start mb-3">
                                    <div className="flex items-start gap-3">
                                        <input
                                            type="checkbox"
                                            checked={selectedIds.has(item.id)}
                                            onChange={() => onToggleSelect(item.id)}
                                            className="w-5 h-5 text-indigo-600 rounded-lg border-slate-300 transition-all mt-0.5"
                                        />
                                        <div>
                                            <h4 className="text-base font-black text-slate-800 tracking-tight leading-tight">{item.part_no || '(No No)'}</h4>
                                            <p className="text-xs font-bold text-slate-500 mt-0.5">{item.part_name || 'No Name'}</p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <div className="text-lg font-black text-brand-700 leading-none">₩{(item.supply_price || 0).toLocaleString()}</div>
                                        <div className="text-[10px] text-slate-400 font-bold mt-1 uppercase">QTY: {item.qty}</div>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 rounded-xl border border-slate-100 mb-3">
                                    <div>
                                        <p className="text-[10px] font-black text-slate-400 uppercase mb-1">상태/생산</p>
                                        <div className="flex flex-col gap-1.5 items-start">
                                            <span className={`px-1.5 py-0.5 rounded-md text-[9px] font-black border
                                                ${item.process_status === 'WAITING' ? 'bg-slate-100 text-slate-500 border-slate-200' : ''}
                                                ${item.process_status === 'PROCESSING' ? 'bg-indigo-50 text-indigo-600 border-indigo-100' : ''}
                                                ${item.process_status === 'DONE' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : ''}
                                            `}>
                                                {item.process_status === 'PROCESSING' ? '진행' : item.process_status === 'DONE' ? '완료' : '대기'}
                                            </span>
                                            <span className="text-[11px] font-bold text-brand-600">{item.production_type === 'OUTSOURCE' ? '🚚 외주' : '🏭 사내'}</span>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-[10px] font-black text-slate-400 uppercase mb-1">납기일</p>
                                        <p className="text-sm font-black text-slate-700 font-mono tracking-tighter">
                                            {item.due_date ? item.due_date.split('T')[0] : '-'}
                                        </p>
                                    </div>
                                </div>

                                <div className="flex flex-wrap gap-1.5">
                                    {myFiles.map(f => {
                                        const ext = f.file_name?.split('.').pop()?.toLowerCase() || '';
                                        const isDraw = ['pdf', 'dwg', 'dxf', 'stp', 'step'].includes(ext);
                                        return (
                                            <button
                                                key={f.id}
                                                onClick={() => onPreviewFile(f)}
                                                className="px-2 py-1 bg-white border border-slate-100 rounded-lg text-[10px] font-bold text-slate-500 hover:text-brand-600 flex items-center gap-1 shadow-xs"
                                            >
                                                {isDraw ? '📄' : '📁'} {f.file_name}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        );
                    })
                )}
            </div>
        </div>
    );
};

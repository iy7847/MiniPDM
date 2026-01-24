
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
        <div className="overflow-x-auto min-h-[400px]">
            <table className="w-full text-sm text-left text-slate-600">
                <thead className="bg-slate-100 text-xs uppercase font-bold text-slate-700 sticky top-0 z-10">
                    <tr>
                        <th className="p-3 w-10 text-center">✓</th>
                        <th className="p-3 w-10 text-center">No.</th>
                        <th className="p-3 w-20 text-center">생산방식</th>
                        <th className="p-3 w-24">상태</th>
                        <th className="p-3 min-w-[200px]">품목 정보 (Item)</th>
                        <th className="p-3 w-32">규격 (Spec)</th>
                        <th className="p-3 w-24 text-right">수량</th>
                        <th className="p-3 w-32 text-right">단가</th>
                        <th className="p-3 w-32 text-right">공급가액</th>
                        <th className="p-3 w-32 text-center">납기일</th>
                        <th className="p-3 w-32 text-center">첨부</th>
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

                                <td className="p-3">
                                    <span className={`px-2 py-1 rounded text-xs font-bold
                                        ${item.process_status === 'WAITING' ? 'bg-slate-200 text-slate-700' : ''}
                                        ${item.process_status === 'PROCESSING' ? 'bg-blue-100 text-blue-700' : ''}
                                        ${item.process_status === 'DONE' ? 'bg-green-100 text-green-700' : ''}
                                    `}>
                                        {item.process_status || 'WAITING'}
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
                    {items.length === 0 && (
                        <tr>
                            <td colSpan={10} className="p-8 text-center text-slate-400">
                                품목이 없습니다.
                            </td>
                        </tr>
                    )}
                </tbody>
            </table>
        </div>
    );
};

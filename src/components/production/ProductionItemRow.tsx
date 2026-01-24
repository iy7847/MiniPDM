import { Button } from '../common/ui/Button';

interface ProductionItemRowProps {
    item: any;
    viewStatus: 'ACTIVE' | 'PROCESSING' | 'DONE';
    isSelected: boolean;
    onToggleSelection: () => void;
    onStart: () => void;
    onComplete: (date: string, note: string) => void; // date, note will be passed when implemented
    onNavigate: (page: string, id?: string) => void;
    onUndo: () => void;
    onPreviewFile: (path: string) => void;
}

export function ProductionItemRow({
    item,
    viewStatus,
    isSelected,
    onToggleSelection,
    onStart,
    onComplete,
    onNavigate,
    onUndo,
    onPreviewFile
}: ProductionItemRowProps) {
    return (
        <tr className="hover:bg-slate-50 transition-colors">
            <td className="px-4 py-3 text-center">
                <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={onToggleSelection}
                    className="w-4 h-4 rounded text-brand-600 focus:ring-brand-500 border-slate-300 transition-all"
                />
            </td>
            <td className="px-5 py-4 whitespace-nowrap">
                <span className={`px-2.5 py-1 rounded-lg text-xs font-bold border ${item.production_type === 'OUTSOURCE'
                    ? 'bg-orange-50 text-orange-700 border-orange-200'
                    : 'bg-indigo-50 text-indigo-700 border-indigo-200'
                    }`}>
                    {item.production_type === 'OUTSOURCE' ? '🚚 외주 (Outsource)' : '🏭 사내 (In-house)'}
                </span>
            </td>
            <td className="px-5 py-4">
                <div className="flex flex-col">
                    <span className="font-bold text-slate-700 text-sm">{item.orders?.clients?.name}</span>
                    <button
                        className="text-left text-xs text-brand-600 hover:text-brand-800 hover:underline mt-0.5 font-medium transition-colors"
                        onClick={() => onNavigate('order-detail', item.orders.id)}
                    >
                        PO: {item.orders?.po_no}
                    </button>
                </div>
            </td>
            <td className="px-5 py-4">
                <div className="flex flex-col gap-1">
                    <span className="font-black text-slate-800 text-sm tracking-tight">{item.part_no}</span>
                    <span className="text-xs text-slate-500">{item.part_name}</span>
                    <span className="text-[10px] text-slate-400 font-mono">{item.spec}</span>

                    {/* Material & Post Process Tags */}
                    {(item.estimate_items?.materials?.name || item.estimate_items?.post_processings?.name) && (
                        <div className="flex flex-wrap gap-1 mt-1">
                            {item.estimate_items?.materials?.name && (
                                <span className="px-1.5 py-0.5 bg-slate-100 rounded text-[10px] text-slate-600 border border-slate-200">
                                    {item.estimate_items.materials.name}
                                </span>
                            )}
                            {item.estimate_items?.post_processings?.name && item.estimate_items.post_processings.name !== '없음' && (
                                <span className="px-1.5 py-0.5 bg-slate-100 rounded text-[10px] text-slate-600 border border-slate-200">
                                    + {item.estimate_items.post_processings.name}
                                </span>
                            )}
                        </div>
                    )}
                </div>
            </td>
            <td className="px-5 py-4 text-center">
                {/* Process Steps Visualizer could go here */}
                <span className="text-xs text-slate-400">-</span>
            </td>
            <td className="px-5 py-4 text-center">
                <span className="font-bold text-slate-800 text-sm bg-slate-50 px-2 py-1 rounded-md border border-slate-200">
                    {item.qty?.toLocaleString()}
                </span>
            </td>
            <td className="px-5 py-4 text-center">
                <div className="flex flex-col items-center">
                    <span className={`text-xs font-bold ${viewStatus === 'DONE' ? 'text-emerald-600' : 'text-slate-600'}`}>
                        {viewStatus === 'DONE' && item.completed_at
                            ? new Date(item.completed_at).toLocaleDateString()
                            : item.orders?.delivery_date?.split('T')[0]
                        }
                    </span>
                    {viewStatus === 'DONE' && item.production_note && (
                        <span className="text-[10px] text-slate-400 mt-1 max-w-[120px] truncate" title={item.production_note}>
                            📝 {item.production_note}
                        </span>
                    )}
                </div>
            </td>
            <td className="px-5 py-4 text-center">
                <div className="flex flex-col gap-1 items-center">
                    {item.files && item.files.length > 0 ? (
                        item.files.map((f: any) => {
                            const ext = f.file_name.split('.').pop()?.toLowerCase();
                            const is2D = ['pdf', 'dwg', 'dxf'].includes(ext);
                            const is3D = ['stp', 'step', 'igs', 'iges', 'x_t'].includes(ext);
                            return (
                                <button
                                    key={f.id}
                                    onClick={() => onPreviewFile(f.file_path)}
                                    className="text-[10px] px-2 py-1 bg-white border border-slate-200 rounded-lg hover:bg-brand-50 hover:text-brand-600 hover:border-brand-200 transition-all flex items-center gap-1.5 w-full max-w-[140px]"
                                    title={f.file_name}
                                >
                                    {is2D && <span className="w-1.5 h-1.5 rounded-full bg-red-500"></span>}
                                    {is3D && <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>}
                                    <span className="truncate flex-1 text-left">{f.file_name}</span>
                                </button>
                            );
                        })
                    ) : (
                        <span className="text-slate-300 text-xs">-</span>
                    )}
                </div>
            </td>
            <td className="px-5 py-4 text-center">
                <div className="flex justify-center">
                    {viewStatus === 'ACTIVE' && (
                        <Button
                            size="sm"
                            variant="glass"
                            className="text-xs h-8"
                            onClick={onStart}
                        >
                            ▶ 시작
                        </Button>
                    )}
                    {viewStatus === 'PROCESSING' && (
                        <Button
                            size="sm"
                            variant="primary"
                            className="text-xs h-8 shadow-glow"
                            onClick={() => onComplete('', '')} // Open modal usually handled by parent
                        >
                            ✨ 완료
                        </Button>
                    )}
                    {viewStatus === 'DONE' && (
                        <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full border border-emerald-100">
                                완료됨
                            </span>
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onUndo();
                                }}
                                className="p-1 text-slate-400 hover:text-red-500 transition-colors rounded-full hover:bg-red-50"
                                title="완료 취소"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                                </svg>
                            </button>
                        </div>
                    )}
                </div>
            </td>
        </tr>
    );
}

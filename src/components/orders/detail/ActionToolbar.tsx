
import { Button } from '../../common/ui/Button';


interface ActionToolbarProps {
    selectedCount: number;
    batchDate: string;
    onBatchDateChange: (val: string) => void;
    onApplyBatchDate: () => void;
    onToggleSelectAll: () => void;
}

export const ActionToolbar = ({ selectedCount, batchDate, onBatchDateChange, onApplyBatchDate, onToggleSelectAll }: ActionToolbarProps) => {
    return (
        <div className="bg-white p-3 border-b border-slate-200 flex flex-wrap items-center justify-between gap-4 sticky top-0 z-20 shadow-sm">
            <div className="flex items-center gap-4">
                <Button variant="secondary" size="sm" onClick={onToggleSelectAll}>
                    {selectedCount > 0 ? '선택 해제' : '전체 선택'}
                </Button>
                {selectedCount > 0 && (
                    <span className="text-sm font-bold text-indigo-600">
                        {selectedCount}개 선택됨
                    </span>
                )}
            </div>

            <div className="flex items-center gap-2">
                <span className="text-sm text-slate-600 font-medium">일괄 납기 변경:</span>
                <input
                    type="date"
                    className="rounded text-sm border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                    value={batchDate}
                    onChange={(e) => onBatchDateChange(e.target.value)}
                />
                <Button variant="secondary" size="sm" onClick={onApplyBatchDate} disabled={!batchDate || selectedCount === 0}>
                    적용
                </Button>
            </div>
        </div>
    );
};

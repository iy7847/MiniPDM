
import { Button } from '../../common/ui/Button';
import { PageHeader as CommonPageHeader } from '../../common/ui/PageHeader';

interface OrderHeaderProps {
    orderId: string | null;
    onBack: () => void;
    onDelete: () => void;
    onLabelClick: () => void;
    // onShipmentClick: () => void; // Hidden by user request
}

export const OrderHeader = ({ orderId, onBack, onDelete, onLabelClick }: OrderHeaderProps) => {
    return (
        <CommonPageHeader
            hideGuide={true}
            title={
                <div className="flex items-center gap-3">
                    <span className="text-2xl">📦</span>
                    <div>
                        <h1 className="text-xl md:text-2xl font-black text-slate-800 tracking-tight">
                            {orderId ? '수주 상세 (Order Detail)' : '새 수주 작성'}
                            {orderId && <span className="ml-3 text-[10px] font-black text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full border border-slate-200 uppercase tracking-widest align-middle">확정됨</span>}
                        </h1>
                    </div>
                </div>
            }
            onBack={onBack}
            actions={
                <div className="flex gap-3 items-center">
                    <Button
                        variant="glass"
                        size="sm"
                        onClick={onLabelClick}
                        className="text-indigo-700 bg-indigo-50 border-indigo-100 hover:bg-indigo-100 h-[42px] px-4 font-bold"
                    >
                        🏷️ 생산 라벨
                    </Button>

                    {orderId && (
                        <>
                            <div className="h-6 w-px bg-slate-200 mx-1 hidden md:block"></div>
                            <button
                                onClick={onDelete}
                                className="p-2 text-slate-300 hover:text-red-500 transition-colors rounded-lg hover:bg-red-50"
                                title="수주 삭제"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                                </svg>
                            </button>
                        </>
                    )}
                </div>
            }
        />
    );
};

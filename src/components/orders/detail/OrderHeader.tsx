
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
            title={orderId ? '수주 상세 (Order Detail)' : '새 수주 작성'}
            onBack={onBack}
            actions={
                <div className="flex gap-2 items-center">
                    <Button
                        variant="primary"
                        size="sm"
                        onClick={onLabelClick}
                        className="bg-indigo-600 hover:bg-indigo-700 h-[38px]"
                    >
                        🏷️ 생산 라벨
                    </Button>

                    {orderId && (
                        <>
                            <div className="h-6 w-px bg-slate-300 mx-1 hidden md:block"></div>
                            <Button
                                variant="danger"
                                size="sm"
                                onClick={onDelete}
                                className="h-[38px] opacity-70 hover:opacity-100"
                            >
                                🗑️
                            </Button>
                        </>
                    )}
                </div>
            }
        />
    );
};


import { useState } from 'react';
import { useOrderLogic } from '../hooks/useOrderLogic';
import { useFileHandler } from '../hooks/useFileHandler';
import { Section } from '../components/common/ui/Section';

// UI Components
import { OrderHeader } from '../components/orders/detail/OrderHeader';
import { OrderInfoCard } from '../components/orders/detail/OrderInfoCard';
import { ActionToolbar } from '../components/orders/detail/ActionToolbar';
import { OrderItemTable } from '../components/orders/detail/OrderItemTable';

// Modals
import { LabelPrinterModal } from '../components/production/LabelPrinterModal';
import { ClipboardMatchModal } from '../components/orders/ClipboardMatchModal';


interface OrderDetailProps {
    orderId: string | null;
    onBack: () => void;
}

export function OrderDetail({ orderId, onBack }: OrderDetailProps) {
    // 1. Logic Hook
    const logic = useOrderLogic(orderId, onBack);

    // 2. File Handler Hook
    const fileHandler = useFileHandler(logic.companyRootPath);

    // 3. Local UI State (Modals)
    const [isLabelModalOpen, setIsLabelModalOpen] = useState(false);
    const [isClipboardModalOpen, setIsClipboardModalOpen] = useState(false);

    // Handlers
    const handlePreviewFile = async (file: any) => {
        const res = await fileHandler.openFile(file.file_path);
        if (res && !res.success) alert('파일 열기 실패: ' + res.error);
    };



    // ... Other handlers can be delegated to hooks or kept minimal here ...

    if (logic.loading) return <div className="p-8 text-center text-slate-500">Loading Order Data...</div>;

    return (
        <div className="h-[calc(100vh-64px)] md:h-full flex flex-col bg-slate-50 relative">
            <div className="flex-1 overflow-y-auto p-4 md:p-8 pb-32 space-y-6">

                {/* Header */}
                <OrderHeader
                    orderId={orderId}
                    onBack={onBack}
                    onDelete={logic.handleDeleteOrder}
                    onLabelClick={() => setIsLabelModalOpen(true)}
                />

                {/* Info Card */}
                {logic.order && (
                    <OrderInfoCard
                        form={logic.editForm}
                        linkedEstimate={(logic.order as any).estimates}
                        onUpdateField={logic.updateOrderField}
                        onCurrencyChange={logic.handleBulkCurrencyChange}
                    />
                )}

                {/* Items Section */}
                <Section title={`수주 품목 (${logic.items.length})`}
                    rightElement={
                        <button onClick={() => setIsClipboardModalOpen(true)} className="text-sm text-indigo-600 hover:text-indigo-800">
                            📋 엑셀 붙여넣기
                        </button>
                    }
                >
                    {/* Toolbar */}
                    <ActionToolbar
                        selectedCount={logic.selectedItemIds.size}
                        batchDate={''} // State needs to be moved to hook or local
                        onBatchDateChange={() => { }} // Implement local state if needed
                        onApplyBatchDate={() => { }}
                        onToggleSelectAll={logic.toggleSelectAll}
                    />

                    {/* Table */}
                    <div className="bg-white border-x border-b border-slate-200">
                        {/* File Drop Zone Logic needs to be passed here or wrapped */}
                        <OrderItemTable
                            items={logic.items}
                            selectedIds={logic.selectedItemIds}
                            onToggleSelect={logic.toggleSelectItem}
                            onPreviewFile={handlePreviewFile}
                        />
                    </div>
                </Section>
            </div>

            {/* Modals */}
            {isLabelModalOpen && (
                <LabelPrinterModal
                    isOpen={isLabelModalOpen}
                    onClose={() => setIsLabelModalOpen(false)}
                    items={logic.items.filter(i => logic.selectedItemIds.has(i.id))}
                    order={logic.order}
                />
            )}

            {isClipboardModalOpen && (
                <ClipboardMatchModal
                    isOpen={isClipboardModalOpen}
                    onClose={() => setIsClipboardModalOpen(false)}
                    onMatch={async (matches: any[]) => {
                        console.log('Clipboard matches:', matches);
                        setIsClipboardModalOpen(false);
                    }}
                />
            )}

            {/* ... Other Modals ... */}

        </div>
    );
}

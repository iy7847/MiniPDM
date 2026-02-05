
import { useState } from 'react';
import { useOrderLogic } from '../hooks/useOrderLogic';
import { useFileHandler } from '../hooks/useFileHandler';
import { Section } from '../components/common/ui/Section';

// UI 컴포넌트
import { OrderHeader } from '../components/orders/detail/OrderHeader';
import { OrderInfoCard } from '../components/orders/detail/OrderInfoCard';
import { Card } from '../components/common/ui/Card';
import { OrderItemTable } from '../components/orders/detail/OrderItemTable';

// 모달
import { LabelPrinterModal } from '../components/production/LabelPrinterModal';
import { ClipboardMatchModal } from '../components/orders/ClipboardMatchModal';


interface OrderDetailProps {
    orderId: string | null;
    onBack: () => void;
}

export function OrderDetail({ orderId, onBack }: OrderDetailProps) {
    // 1. 로직 훅
    const logic = useOrderLogic(orderId, onBack);

    // 2. 파일 핸들러 훅
    const fileHandler = useFileHandler(logic.companyRootPath);

    // 3. 로컬 UI 상태 (모달 및 툴바)
    const [isLabelModalOpen, setIsLabelModalOpen] = useState(false);
    const [isClipboardModalOpen, setIsClipboardModalOpen] = useState(false);
    const [batchDate, setBatchDate] = useState('');

    // 핸들러
    const handlePreviewFile = async (file: { file_path: string }) => {
        const res = await fileHandler.openFile(file.file_path);
        if (res && !res.success) alert('파일 열기 실패: ' + res.error);
    };

    if (logic.loading) return <div className="h-full flex items-center justify-center text-slate-500 font-bold animate-pulse">수주 데이터 로딩 중...</div>;

    const totalKRW = logic.items.reduce((sum, i) => sum + (i.supply_price || 0), 0);
    const exchangeRate = logic.editForm.exchange_rate || 1;
    const totalForeign = (logic.editForm.currency !== 'KRW' && exchangeRate > 0) ? totalKRW / exchangeRate : 0;

    return (
        <div className="h-[calc(100vh-64px)] md:h-full flex flex-col bg-slate-50 relative overflow-hidden">
            <div className="flex-1 overflow-y-auto p-4 md:p-8 space-y-6">

                {/* 헤더 */}
                <OrderHeader
                    orderId={orderId}
                    onBack={onBack}
                    onDelete={logic.handleDeleteOrder}
                    onLabelClick={() => setIsLabelModalOpen(true)}
                />

                {/* 정보 카드 */}
                {logic.order && (
                    <Section>
                        <OrderInfoCard
                            form={logic.editForm}
                            linkedEstimate={(logic.order as any).estimates}
                            onUpdateField={logic.updateOrderField}
                            onCurrencyChange={logic.handleBulkCurrencyChange}
                        />
                    </Section>
                )}

                {/* 품목 섹션 */}
                <Section>
                    <div className="relative">
                        {/* 주문 제작 가능 툴바 (Gmail 스타일) */}
                        <div className={`absolute -top-14 left-0 right-0 z-30 transition-all duration-300 transform ${logic.selectedItemIds.size > 0 ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0 pointer-events-none'}`}>
                            <div className="bg-slate-900 text-white rounded-2xl shadow-glow px-6 py-3 flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                    <span className="bg-brand-500 text-white w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black">
                                        {logic.selectedItemIds.size}
                                    </span>
                                    <span className="text-sm font-bold">건 선택됨</span>
                                    <div className="w-px h-6 bg-slate-700 mx-2"></div>
                                    <div className="flex items-center gap-3">
                                        <span className="text-[10px] font-black text-slate-400 uppercase">일괄 납기일 변경:</span>
                                        <div className="flex items-center bg-white/10 rounded-lg p-1 border border-white/10">
                                            <input
                                                type="date"
                                                className="bg-transparent border-none text-white text-xs p-1 outline-none invert pr-2"
                                                value={batchDate}
                                                onChange={(e) => setBatchDate(e.target.value)}
                                            />
                                            <button
                                                onClick={() => logic.handleBatchUpdateDelivery(batchDate)}
                                                className="px-3 py-1 bg-white text-slate-900 text-[10px] font-black rounded-md hover:bg-brand-50 transition-colors"
                                            >
                                                적용
                                            </button>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <button onClick={() => logic.setSelectedItemIds(new Set())} className="p-2 hover:bg-white/10 rounded-xl transition-colors">
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                        </svg>
                                    </button>
                                </div>
                            </div>
                        </div>

                        <div className="flex items-end justify-between mb-4">
                            <div>
                                <h2 className="text-lg font-black text-slate-800 tracking-tight">수주 품목</h2>
                                <p className="text-xs text-slate-400 mt-0.5 font-medium">수주 건의 세부 품목 및 제작 상태를 관리합니다.</p>
                            </div>
                            <button onClick={() => setIsClipboardModalOpen(true)} className="text-xs font-bold text-indigo-600 hover:text-indigo-800 bg-indigo-50 px-3 py-1.5 rounded-lg border border-indigo-100 transition-all shadow-sm">
                                📋 엑셀 데이터 매칭
                            </button>
                        </div>

                        <Card noPadding className="border-0 shadow-soft overflow-hidden rounded-2xl min-h-[400px]">
                            <OrderItemTable
                                items={logic.items}
                                selectedIds={logic.selectedItemIds}
                                onToggleSelect={logic.toggleSelectItem}
                                files={logic.itemFiles}
                                onPreviewFile={handlePreviewFile}
                                onUpdateItem={logic.updateOrderItem}
                            />
                        </Card>
                    </div>
                </Section>
            </div>

            {/* 고정 푸터 */}
            <div className="shrink-0 p-4 bg-white/80 backdrop-blur-xl border-t border-slate-100 z-20 shadow-[0_-10px_30px_rgba(0,0,0,0.03)]">
                <div className="flex justify-between items-center max-w-7xl mx-auto px-4 md:px-8">
                    <div className="hidden sm:block">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">상태</span>
                        <div className="flex items-center gap-2">
                            <span className={`w-2 h-2 rounded-full ${logic.order?.status === 'PRODUCTION' ? 'bg-orange-500 animate-pulse' : 'bg-emerald-500'}`}></span>
                            <span className="text-sm font-bold text-slate-700">{logic.order?.status === 'PRODUCTION' ? '생산 진행 중' : '수주 접수'}</span>
                        </div>
                    </div>

                    <div className="flex items-center gap-8 md:gap-12">
                        {logic.editForm.currency !== 'KRW' && (
                            <div className="text-right">
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">외화 합계 ({logic.editForm.currency})</span>
                                <div className="flex items-baseline gap-1.5 justify-end">
                                    <span className="text-lg md:text-2xl font-black text-slate-600 tracking-tight">
                                        {totalForeign.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                                    </span>
                                </div>
                            </div>
                        )}
                        <div className="text-right">
                            <span className="text-[10px] font-black text-brand-400 uppercase tracking-widest block mb-1">총 수주 합계</span>
                            <div className="flex items-baseline gap-1.5 justify-end">
                                <span className="text-xs md:text-sm font-bold text-brand-600">KRW</span>
                                <span className="text-2xl md:text-4xl font-black text-brand-600 tracking-tighter">
                                    ₩{totalKRW.toLocaleString()}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* 모달 */}
            <LabelPrinterModal
                isOpen={isLabelModalOpen}
                onClose={() => setIsLabelModalOpen(false)}
                items={logic.items.filter(i => logic.selectedItemIds.has(i.id))}
                order={logic.order}
            />

            <ClipboardMatchModal
                isOpen={isClipboardModalOpen}
                onClose={() => setIsClipboardModalOpen(false)}
                onMatch={(matches: { part_no: string; po_no: string; qty: number; unit_price: number; due_date: string; }[]) => {
                    console.log('Clipboard matches:', matches);
                    setIsClipboardModalOpen(false);
                }}
            />
        </div>
    );
}


import { Card } from '../../common/ui/Card';
import { Input } from '../../common/ui/Input';


interface OrderInfoCardProps {
    form: {
        po_no: string;
        delivery_date: string;
        note: string;
        currency: string;
        exchange_rate: number;
        total_amount: number;
    };
    linkedEstimate: any;
    onUpdateField: (field: any, value: any) => void;
    onCurrencyChange: (currency: string) => void;
}

export const OrderInfoCard = ({ form, linkedEstimate, onUpdateField, onCurrencyChange }: OrderInfoCardProps) => {
    return (
        <Card className="shadow-soft rounded-2xl border-0 overflow-hidden">
            <div className="flex items-center gap-3 mb-6 pb-2 border-b border-slate-50">
                <span className="p-2 bg-slate-100 rounded-lg">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                </span>
                <h3 className="font-black text-slate-700 uppercase tracking-tight">수주 정보 (Order Info)</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Input
                    label="발주 번호 (PO No)"
                    value={form.po_no || ''}
                    readOnly
                    className="bg-slate-100 text-slate-500 font-mono"
                />

                <Input
                    type="date"
                    label="납기 일자 (Delivery Date)"
                    value={form.delivery_date}
                    onChange={(e) => onUpdateField('delivery_date', e.target.value)}
                    className={`rounded-xl border-slate-200 focus:ring-brand-200 transition-all ${!form.delivery_date ? 'border-red-300 bg-red-50' : 'bg-slate-50/50 focus:bg-white'}`}
                />

                <div className="space-y-1">
                    <label className="block text-sm font-medium text-slate-700">통화 (Currency)</label>
                    <div className="flex gap-2">
                        <select
                            className="flex-1 rounded-xl border-slate-200 shadow-sm focus:ring-2 focus:ring-brand-200 text-sm h-[42px] bg-slate-50/50 focus:bg-white transition-all outline-none px-3"
                            value={form.currency}
                            onChange={(e) => {
                                const newCurr = e.target.value;
                                if (confirm(`통화를 ${newCurr}로 변경하시겠습니까?\n모든 품목의 단가가 환율(${form.exchange_rate})에 따라 재계산됩니다.`)) {
                                    onCurrencyChange(newCurr);
                                }
                            }}
                        >
                            <option value="KRW">KRW (₩)</option>
                            <option value="USD">USD ($)</option>
                            <option value="EUR">EUR (€)</option>
                            <option value="JPY">JPY (¥)</option>
                            <option value="CNY">CNY (¥)</option>
                        </select>
                        <Input
                            type="number"
                            value={form.exchange_rate}
                            onChange={(e) => onUpdateField('exchange_rate', Number(e.target.value))}
                            className="w-24 text-right rounded-xl bg-slate-100/50 border-slate-200"
                            disabled={form.currency === 'KRW'}
                        />
                    </div>
                    {linkedEstimate?.base_exchange_rate && linkedEstimate.base_exchange_rate !== form.exchange_rate && (
                        <div className="text-xs text-amber-600">
                            * 견적 환율: {linkedEstimate.base_exchange_rate.toLocaleString()}
                        </div>
                    )}
                </div>

                <div className="space-y-1">
                    <label className="block text-sm font-bold text-slate-600 uppercase tracking-tighter mb-1">총 수주액 (Total)</label>
                    <div className="h-[42px] flex items-center px-4 bg-brand-50/30 rounded-xl border border-brand-100 font-black text-brand-700 justify-end shadow-inner">
                        {form.currency !== 'KRW' && (
                            <span className="text-[10px] text-brand-400 mr-2 uppercase">{form.currency}</span>
                        )}
                        {form.total_amount?.toLocaleString()}
                    </div>
                </div>

                <div className="md:col-span-2 lg:col-span-4">
                    <Input
                        label="비고 (Note)"
                        value={form.note}
                        onChange={(e) => onUpdateField('note', e.target.value)}
                        placeholder="특이사항을 입력하세요"
                    />
                </div>
            </div>
        </Card>
    );
};

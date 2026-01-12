
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
    onUpdateField: (field: string, value: any) => void;
    onCurrencyChange: (currency: string) => void;
}

export const OrderInfoCard = ({ form, linkedEstimate, onUpdateField, onCurrencyChange }: OrderInfoCardProps) => {
    return (
        <Card className="p-4 bg-white shadow-sm border border-slate-200">
            <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                📄 수주 정보 (Order Info)
            </h3>
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
                    className={!form.delivery_date ? 'border-red-300 bg-red-50' : ''}
                />

                <div className="space-y-1">
                    <label className="block text-sm font-medium text-slate-700">통화 (Currency)</label>
                    <div className="flex gap-2">
                        <select
                            className="flex-1 rounded-md border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-sm h-[38px]"
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
                            className="w-24 text-right"
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
                    <label className="block text-sm font-medium text-slate-700">총 금액 (Total)</label>
                    <div className="h-[38px] flex items-center px-3 bg-slate-100 rounded-md border border-slate-300 font-bold text-slate-700 justify-end">
                        {form.currency !== 'KRW' && (
                            <span className="text-xs text-slate-500 mr-2">{form.currency}</span>
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

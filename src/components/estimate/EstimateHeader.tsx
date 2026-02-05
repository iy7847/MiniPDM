import React from 'react';
import { Client } from '../../types/estimate';

import { NumberInput } from '../common/NumberInput';

interface EstimateHeaderProps {
  clients: Client[];
  formData: {
    client_id: string;
    project_name: string;
    currency: string;
    exchange_rate: number;
    status: string;
  };
  setFormData: React.Dispatch<React.SetStateAction<any>>; // any is still used for bulk updates, but adding status to type
  onClientChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  onGenerateProjectName?: () => void;
  disabled?: boolean;
}

export function EstimateHeader({ clients, formData, setFormData, onClientChange, onGenerateProjectName }: EstimateHeaderProps) {
  return (
    <div className="flex flex-col md:flex-row gap-6">
      <div className="flex-[5] grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-[10px] font-black text-slate-400 mb-1 uppercase tracking-wider whitespace-nowrap">거래처 (Client)</label>
          <select
            className="w-full border-slate-200 border p-2 rounded-lg text-sm bg-white focus:ring-2 focus:ring-brand-200 outline-none transition-shadow"
            value={formData.client_id}
            onChange={onClientChange}
          >
            <option value="">거래처를 선택하세요</option>
            {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-[10px] font-black text-slate-400 mb-1 uppercase tracking-wider whitespace-nowrap">프로젝트명 (Project Name)</label>
          <div className="flex gap-1">
            <input
              className="w-full border-slate-200 border p-2 rounded-lg text-sm outline-none focus:ring-2 focus:ring-brand-200 transition-shadow"
              value={formData.project_name}
              onChange={(e) => setFormData({ ...formData, project_name: e.target.value })}
              placeholder="예: 12월 가공품 발주"
            />
            {onGenerateProjectName && (
              <button
                onClick={onGenerateProjectName}
                title="자동 생성 (ES년월일-순번)"
                className="bg-white border border-slate-200 text-slate-400 w-10 flex items-center justify-center rounded-lg hover:bg-slate-50 hover:text-brand-600 transition-colors"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="h-px md:h-12 md:w-px bg-slate-100 self-center"></div>

      <div className="flex-[3] grid grid-cols-2 gap-4 items-end">
        <div className="flex flex-col">
          <label className="block text-[10px] font-black text-slate-400 mb-1.5 uppercase tracking-wider whitespace-nowrap">통화 (Currency)</label>
          <div className="h-[38px] flex items-center justify-center border-slate-100 bg-slate-50 border rounded-lg text-sm font-bold text-slate-500">
            {formData.currency}
          </div>
        </div>
        <div className="flex flex-col">
          <NumberInput
            label="환율 (Exchange Rate)"
            value={formData.exchange_rate}
            onChange={(val) => setFormData({ ...formData, exchange_rate: val })}
            className="text-right font-mono h-[38px] border-slate-200"
            labelClassName="block text-[10px] font-black text-slate-400 mb-1.5 uppercase tracking-wider whitespace-nowrap"
          />
        </div>
      </div>
    </div>
  );
}

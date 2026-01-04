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
  };
  setFormData: React.Dispatch<React.SetStateAction<any>>;
  onClientChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  onGenerateProjectName?: () => void; // [Added]
}

export function EstimateHeader({ clients, formData, setFormData, onClientChange, onGenerateProjectName }: EstimateHeaderProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
      <div className="md:col-span-1">
        <label className="block text-xs font-bold text-slate-500 mb-1">거래처</label>
        <select
          className="w-full border p-2 rounded text-sm bg-white"
          value={formData.client_id}
          onChange={onClientChange}
        >
          <option value="">선택하세요</option>
          {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </div>
      <div className="md:col-span-2">
        <label className="block text-xs font-bold text-slate-500 mb-1">프로젝트명</label>
        <div className="flex gap-1">
          <input
            className="w-full border p-2 rounded text-sm outline-none focus:ring-2 focus:ring-blue-100"
            value={formData.project_name}
            onChange={(e) => setFormData({ ...formData, project_name: e.target.value })}
            placeholder="예: 12월 가공품 발주"
          />
          {onGenerateProjectName && (
            <button
              onClick={onGenerateProjectName}
              title="자동 생성 (ES년월일-순번)"
              className="bg-white border border-slate-300 text-slate-500 px-3 rounded hover:bg-slate-100 transition-colors"
            >
              🎲
            </button>
          )}
        </div>
      </div>
      <div className="md:col-span-1 flex gap-2">
        <div className="flex-1">
          <label className="block text-xs font-bold text-slate-500 mb-1">통화</label>
          <input
            value={formData.currency}
            disabled
            className="w-full border p-2 rounded text-sm bg-slate-100 text-center font-bold"
          />
        </div>
        <div className="flex-1">
          <NumberInput
            label="환율 (원/1단위)"
            value={formData.exchange_rate}
            onChange={(val) => setFormData({ ...formData, exchange_rate: val })}
          />
        </div>
      </div>
    </div>
  );
}
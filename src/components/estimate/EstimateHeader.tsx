import React from 'react';
import { Client } from '../../types/estimate';
import { FormattedInput } from '../common/FormattedInput';
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
}

export function EstimateHeader({ clients, formData, setFormData, onClientChange }: EstimateHeaderProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 bg-slate-50 p-4 rounded border border-slate-200">
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
        <FormattedInput 
          label="프로젝트명" 
          value={formData.project_name} 
          onChange={(val) => setFormData({...formData, project_name: val})} 
          placeholder="예: 12월 가공품 발주" 
        />
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
            onChange={(val) => setFormData({...formData, exchange_rate: val})} 
          />
        </div>
      </div>
    </div>
  );
}
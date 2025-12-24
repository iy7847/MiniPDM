// 견적 관련 공통 타입 및 상수 정의

export type Client = { id: string; name: string; currency: string; };
export type Material = { id: string; name: string; code: string; density: number; unit_price: number; };

export type AttachedFile = {
  id: string;
  file_name: string;
  file_path: string;
  file_type: string;
  exists_on_disk?: boolean;
};

export type EstimateItem = {
  id?: string;
  estimate_id?: string;
  part_name: string;
  part_no?: string;
  shape: 'rect' | 'round';
  
  spec_w: number;
  spec_d: number;
  spec_h: number;
  
  raw_w: number;
  raw_d: number;
  raw_h: number;

  material_id: string | null; 
  
  process_time: number;
  hourly_rate: number;
  difficulty: string;
  post_process_cost: number;
  
  material_cost?: number;
  processing_cost?: number;

  qty: number;
  unit_price: number;
  supply_price: number;
  
  work_days: number;
  
  tempFiles?: File[]; 
  files?: AttachedFile[]; 
};

export const DIFFICULTY_FACTOR: Record<string, number> = { 'A': 1.0, 'B': 1.2, 'C': 1.5, 'D': 2.0 };

export const CURRENCY_SYMBOL: Record<string, string> = {
  'KRW': '₩', 'USD': '$', 'EUR': '€', 'CNY': '¥', 'JPY': '¥', 
  'GBP': '£', 'CAD': '$', 'AUD': '$', 'VND': '₫'
};

export const INITIAL_ITEM_FORM: EstimateItem = {
  part_name: '', part_no: '',
  shape: 'rect', 
  spec_w: 0, spec_d: 0, spec_h: 0,
  raw_w: 0, raw_d: 0, raw_h: 0,
  material_id: '', 
  process_time: 0, hourly_rate: 50000, difficulty: 'B', post_process_cost: 0,
  qty: 1, unit_price: 0, supply_price: 0,
  work_days: 3, 
  tempFiles: [],
  files: []
};

// [이동] 기본 할인율 정책을 공통 상수로 정의
export const DEFAULT_DISCOUNT_POLICY: Record<string, number[]> = {
  'A': [100, 90, 80, 70, 60, 50],
  'B': [100, 92, 84, 76, 68, 60],
  'C': [100, 94, 88, 82, 76, 70],
  'D': [100, 96, 92, 88, 84, 80],
  'E': [100, 98, 96, 94, 92, 90],
  'F': [100, 99, 98, 97, 96, 95],
};
// 견적 관련 공통 타입 및 상수 정의

export type Client = { id: string; name: string; currency: string; };
export type Material = { id: string; name: string; code: string; density: number; unit_price: number; };
export type PostProcessing = { id: string; name: string; price_per_kg: number; };

export type HeatTreatment = { id: string; name: string; price_per_kg: number; }; // [NEW]

export type AttachedFile = {
  id: string;
  file_name: string;
  file_path: string;
  file_type: string;
  file_size?: number;
  original_name?: string;
  version?: number;
  exists_on_disk?: boolean;
  is_current?: boolean;
};

export type EstimateItem = {
  id?: string;
  estimate_id?: string;
  part_name: string;
  part_no?: string;
  original_material_name?: string;
  shape: 'rect' | 'round';

  spec_w: number;
  spec_d: number;
  spec_h: number;

  raw_w: number;
  raw_d: number;
  raw_h: number;

  material_id: string | null;
  post_processing_id?: string | null;
  heat_treatment_id?: string | null; // [NEW]

  process_time: number;
  hourly_rate: number;
  difficulty: string;
  profit_rate: number;
  post_process_cost: number;
  heat_treatment_cost?: number; // [NEW]

  material_cost?: number;
  processing_cost?: number;

  qty: number;
  unit_price: number;
  supply_price: number;

  work_days: number;
  note?: string; // [NEW]

  tempFiles?: File[];
  files?: AttachedFile[];
};

export const DIFFICULTY_FACTOR: Record<string, number> = { 'A': 1.0, 'B': 1.2, 'C': 1.5, 'D': 2.0, 'E': 2.5, 'F': 3.0 };

export const CURRENCY_SYMBOL: Record<string, string> = {
  'KRW': '₩', 'USD': '$', 'EUR': '€', 'CNY': '¥', 'JPY': '¥',
  'GBP': '£', 'CAD': '$', 'AUD': '$', 'VND': '₫'
};

export const INITIAL_ITEM_FORM: EstimateItem = {
  part_name: '', part_no: '',
  original_material_name: '',
  shape: 'rect',
  spec_w: 0, spec_d: 0, spec_h: 0,
  raw_w: 0, raw_d: 0, raw_h: 0,
  material_id: '',
  process_time: 0, hourly_rate: 50000, difficulty: 'B', profit_rate: 0, post_process_cost: 0,
  qty: 1, unit_price: 0, supply_price: 0,
  work_days: 3,
  note: '',
  tempFiles: [],
  files: []
};

// [수정] 견적서 조건 기본값 (quotation_no, template_type 포함)
export const DEFAULT_QUOTATION_TERMS = {
  quotation_no: "",
  payment_terms: "60 days net",
  incoterms: "EXW(Ex-Works)",
  delivery_period: "Within 2 weeks after receipt of PO",
  destination: "",
  validity: "2 weeks",
  note: "All banking charges in wiring payment shall be covered by the buyer",
  template_type: "A"
};

export const DEFAULT_DISCOUNT_POLICY: Record<string, number[]> = {
  'A': [100, 90, 80, 70, 60, 50],
  'B': [100, 92, 84, 76, 68, 60],
  'C': [100, 94, 88, 82, 76, 70],
  'D': [100, 96, 92, 88, 84, 80],
  'E': [100, 98, 96, 94, 92, 90],
  'F': [100, 99, 98, 97, 96, 95],
};

// 엑셀 내보내기 프리셋 타입
export type ExcelExportPreset = {
  id: string;
  name: string;
  columns: string[]; // ['part_no', 'qty', 'price']
};

// 엑셀 내보내기 가능한 컬럼 목록
export const EXCEL_AVAILABLE_COLUMNS = [
  { id: 'part_no', label: '도번 (Drawing No)' },
  { id: 'part_name', label: '품명 (Part Name)' },
  { id: 'spec_w', label: '규격-가로/지름' },
  { id: 'spec_d', label: '규격-세로/길이' },
  { id: 'spec_h', label: '규격-두께' },
  { id: 'material_name', label: '원자재명' },
  { id: 'qty', label: '수량' },
  { id: 'unit_price', label: '단가' },
  { id: 'supply_price', label: '공급가액' },
  { id: 'process_time', label: '가공시간' },
  { id: 'work_days', label: '제작소요일' },
  { id: 'note', label: '비고' }
];
export type OrderStatus = 'ORDERED' | 'PRODUCTION' | 'INSPECTION' | 'DONE' | 'HOLD';

export interface Order {
  id: string;
  company_id: string;
  client_id: string;
  estimate_id?: string | null; // 연결된 견적 ID

  po_no: string; // 고객사 발주 번호 (PO No)
  order_date: string; // 수주 일자 (ISO 문자열)
  delivery_date: string; // 납기 일자 (ISO 문자열)

  status: OrderStatus;
  shipping_status?: 'unshipped' | 'partially_shipped' | 'shipped';

  currency: string;
  exchange_rate: number;
  total_amount: number;

  note?: string;

  created_at?: string;
  updated_at?: string;
}

export interface OrderItem {
  id: string;
  order_id: string;
  estimate_item_id?: string | null; // 연결된 견적 품목 ID

  part_name: string;
  part_no: string;
  spec: string; // 상세 규격 (예: "100x200x10t")

  material_name: string;

  qty: number;
  unit_price: number;
  supply_price: number;

  process_status: 'WAITING' | 'PROCESSING' | 'DONE';

  work_days?: number;
  due_date?: string;

  note?: string;
  order_item_no?: string; // Item specific order number
  currency?: string;
  exchange_rate?: number;

  // [Added] Comparison Data
  estimate_items?: {
    unit_price: number;
    supply_price: number;
    estimates?: {
      exchange_rate: number;
    };
  };

  post_processing_name?: string; // [Added] Post-processing name

  // [Added] Production Management
  production_type?: 'INHOUSE' | 'OUTSOURCE'; // 기본값 'INHOUSE' (사내/외주)
  production_note?: string;
  completed_at?: string;
}

export interface OrderForm {
  client_id: string;
  po_no: string;
  order_date: string;
  delivery_date: string;
  note: string;
}

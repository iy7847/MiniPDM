export type OrderStatus = 'ORDERED' | 'PRODUCTION' | 'INSPECTION' | 'DONE' | 'HOLD';

export interface Order {
  id: string;
  company_id: string;
  client_id: string;
  estimate_id?: string | null; // Linked estimate
  
  po_no: string; // Purchase Order Number from Client
  order_date: string; // ISO String
  delivery_date: string; // ISO String
  
  status: OrderStatus;
  
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
  estimate_item_id?: string | null; // Linked estimate item
  
  part_name: string;
  part_no: string;
  spec: string; // Combined spec string (e.g. "100x200x10t")
  
  material_name: string;
  
  qty: number;
  unit_price: number;
  supply_price: number;
  
  process_status: 'WAITING' | 'PROCESSING' | 'DONE';
  
  work_days?: number;
  due_date?: string;
  
  note?: string;
}

export interface OrderForm {
  client_id: string;
  po_no: string;
  order_date: string;
  delivery_date: string;
  note: string;
}

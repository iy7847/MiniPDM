export type ShipmentStatus = 'pending' | 'shipped' | 'delivered' | 'canceled';

export interface Shipment {
  id: string;
  company_id: string;
  order_id: string;
  shipment_no: string;
  status: ShipmentStatus;
  
  courier?: string | null;
  tracking_no?: string | null;
  
  recipient_name?: string | null;
  recipient_contact?: string | null;
  recipient_address?: string | null;
  memo?: string | null;
  
  shipped_at?: string | null; // ISO date string
  created_at: string;
  updated_at?: string | null;
  created_by?: string | null;
}

export interface ShipmentItem {
  id: string;
  company_id: string;
  shipment_id: string;
  order_item_id: string;
  
  quantity: number;
  box_no?: number | null;
  note?: string | null;
  
  created_at: string;
}

export interface ShipmentWithItems extends Shipment {
  shipment_items: ShipmentItem[];
}

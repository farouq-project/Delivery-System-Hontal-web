export type UserRole = 'super_admin' | 'developer' | 'merchant_owner' | 'dispatcher' | 'driver';

export interface User {
  id: number;
  ulid: string;
  merchant_id?: number | null;
  name: string;
  email: string;
  phone?: string | null;
  role: UserRole;
  is_active: boolean;
  last_login_at?: string | null;
  merchant?: Merchant;
}

export interface Merchant {
  id: number;
  ulid: string;
  company_name: string;
  slug: string;
  address: string;
  phone: string;
  email: string;
  timezone: string;
  settings?: MerchantSetting;
}

export interface MerchantSetting {
  depot_address: string;
  depot_latitude: number;
  depot_longitude: number;
  max_stops_per_driver: number;
  klotter_size: number;
  working_hours_start: string;
  working_hours_end: string;
  routing_algorithm: string;
}

export interface Customer {
  id: number;
  ulid: string;
  customer_name: string;
  phone: string;
  default_address: string;
  default_latitude: number | null;
  default_longitude: number | null;
  vip_level: 'standard' | 'silver' | 'gold' | 'platinum';
  is_active: boolean;
  notes: string | null;
  created_at: string;
}

export interface Driver {
  id: number;
  ulid: string;
  driver_name: string;
  phone: string;
  vehicle_type: 'motorcycle' | 'car' | 'van';
  vehicle_plate: string;
  status: 'available' | 'on_delivery' | 'delivering' | 'break' | 'off_duty' | 'offline';
  current_lat: number | null;
  current_lng: number | null;
  last_seen: string | null;
  user?: User;
}

export type OrderStatus = 'pending' | 'assigned' | 'in_transit' | 'delivered' | 'failed' | 'cancelled';

export type CashierName = 'Mian' | 'Sela' | 'Epa' | 'Tira';

export type PaymentMethod = 'cash' | 'transfer' | 'qris';

export interface OrderItem {
  name: string;
  quantity?: number | null;
  notes?: string | null;
}

export interface DeliveryOrder {
  id: number;
  ulid: string;
  order_number: string;
  customer_id: number;
  customer_name: string;
  customer_phone: string;
  product_name: string;
  items?: OrderItem[] | null;
  order_value: number;
  delivery_address: string;
  delivery_latitude: number | null;
  delivery_longitude: number | null;
  requested_delivery_date: string;
  requested_delivery_start: string | null;
  requested_delivery_end: string | null;
  status: OrderStatus;
  notes: string | null;
  cashier_name: CashierName | null;
  payment_method: PaymentMethod | null;
  order_created_at: string;
  assigned_at: string | null;
  picked_up_at: string | null;
  delivered_at: string | null;
  failed_at: string | null;
  driver_id: number | null;
  driver?: Driver | null;
  customer?: Customer;
}

export interface RouteStop {
  id: number;
  stop_sequence: number;
  order: DeliveryOrder;
  distance_score: number;
  waiting_score: number;
  window_score: number;
  vip_score: number;
  total_score: number;
  is_locked: boolean;
  is_manually_placed: boolean;
  estimated_arrival?: string;
}

export interface RouteAssignment {
  id: number;
  driver: Pick<Driver, 'id' | 'driver_name' | 'phone' | 'status' | 'current_lat' | 'current_lng'>;
  stops: RouteStop[];
  total_distance_m: number;
  total_stops: number;
  status: string;
}

export interface Route {
  id: number;
  ulid: string;
  route_date: string;
  status: 'draft' | 'active' | 'completed' | 'cancelled';
  generation_method: string;
  total_stops: number;
  total_drivers: number;
  locked_at: string | null;
  assignments: RouteAssignment[];
  created_at: string;
}

export interface LiveDriver {
  driver_id: number;
  driver_name: string;
  vehicle_plate?: string;
  vehicle_type: string;
  status: Driver['status'];
  lat: number | null;
  lng: number | null;
  last_seen: string | null;
  today_stops?: number;
  delivered_stops?: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: {
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
  };
}

export interface ApiResponse<T> {
  data: T;
}

export type UserRole = 'super_admin' | 'developer' | 'owner' | 'merchant_owner' | 'dispatcher' | 'driver' | 'kasir';

export interface User {
  id: number;
  ulid: string;
  merchant_id?: number | null;
  name: string;
  email: string;
  phone?: string | null;
  role: UserRole;
  is_active: boolean;
  can_logout?: boolean;
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
  total_belanja?: number;
  avg_belanja_per_month?: number;
  cluster?: string | null;
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

export type PaymentMethod = 'cash' | 'transfer' | 'qris' | 'bayar_di_toko';

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
  route_sequence: number | null;
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
  driver: Pick<Driver, 'id' | 'driver_name' | 'phone' | 'status' | 'current_lat' | 'current_lng'> | null;
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

// ─── Customer Domain (Phase 2A) ───────────────────────────────────

export type HealthStatus = 'healthy' | 'active' | 'at_risk' | 'dormant' | 'lost';
export type CustomerSegmentKey = 'vip' | 'high_value' | 'returning' | 'new' | 'dormant';

export interface CustomerTag {
  id: number;
  merchant_id: number;
  name: string;
  color: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CustomerProfile {
  id: number;
  customer_id: number;
  merchant_id: number;
  first_order_at: string | null;
  last_order_at: string | null;
  total_orders: number;
  total_deliveries: number;
  total_failed: number;
  total_spending: number;
  avg_order_value: number;
  avg_delivery_time_hours: number | null;
  preferred_payment: string | null;
  preferred_delivery_time: string | null;
  health_status: HealthStatus;
  segment: CustomerSegmentKey;
  last_health_check_at: string | null;
  last_segment_check_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface CustomerTimeline {
  id: number;
  customer_id: number;
  merchant_id: number;
  event_type: string;
  event_data: Record<string, unknown> | null;
  actor_id: number | null;
  actor_role: string | null;
  occurred_at: string;
  created_at: string;
}

export interface CustomerMetrics {
  total_spending: number;
  avg_order_value: number;
  avg_delivery_time_hours: number | null;
  total_deliveries: number;
  total_orders: number;
  total_failed: number;
  success_rate: number | null;
  first_order_at: string | null;
  last_order_at: string | null;
  preferred_payment: string | null;
  preferred_delivery_time: string | null;
  health_status: HealthStatus;
  segment: CustomerSegmentKey;
}

// ─── Executive Dashboard (Phase 2B) ──────────────────────────────

export interface DashboardOperationsToday {
  revenue: number;
  orders: number;
  deliveries_completed: number;
  active_drivers: number;
  success_rate: number | null;
}

export interface DashboardBusinessMonth {
  revenue: number;
  orders: number;
  avg_order_value: number;
  repeat_customers: number;
  new_customers: number;
  customer_growth_pct: number;
}

export interface DashboardCustomerHealth {
  total: number;
  new_this_month: number;
  repeat: number | null;
  dormant: number | null;
  growth_pct: number;
}

export interface DashboardClusterRow {
  cluster: string;
  total_orders: number;
  revenue: number;
  deliveries: number;
  success_rate: number | null;
}

export interface DashboardActivity {
  id: number;
  order_number: string;
  customer_name: string;
  status: string;
  driver_name: string | null;
  occurred_at: string;
}

export interface DashboardAttentionItem {
  type: string;
  label: string;
  count: number;
  severity: 'error' | 'warning' | 'info';
}

export interface ExecutiveDashboardData {
  operations_today: DashboardOperationsToday;
  business_this_month: DashboardBusinessMonth;
  customer_health: DashboardCustomerHealth;
  cluster_summary: DashboardClusterRow[];
  recent_activity: DashboardActivity[];
  requires_attention: DashboardAttentionItem[];
}

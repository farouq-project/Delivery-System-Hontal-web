// Types for the POS / Kasir and Inventory modules. Decimal columns arrive from Laravel as strings.

export interface ProductUnit {
  id: number;
  product_id: number;
  unit_label: string;
  conversion_to_base: string;
  selling_price: string;
  is_default: boolean;
  is_active: boolean;
  sort_order: number;
}

export interface Product {
  id: number;
  name: string;
  sku: string | null;
  barcode: string | null;
  description: string | null;
  category: string | null;
  base_unit: string;
  stock_qty: string;
  default_cost: string | null;
  low_stock_threshold: string | null;
  is_active: boolean;
  default_price?: string | null;
  updated_at: string;
  units: ProductUnit[];
}

/** Sellable product as returned by GET /pos/products. */
export interface PosProduct {
  id: number;
  name: string;
  sku: string | null;
  barcode: string | null;
  base_unit: string;
  stock_qty: string;
  active_units: Pick<ProductUnit, 'id' | 'unit_label' | 'conversion_to_base' | 'selling_price' | 'is_default'>[];
}

export type StockMovementType = 'in' | 'out' | 'adjustment' | 'sale';

export interface StockMovement {
  id: number;
  product_id: number;
  type: StockMovementType;
  qty: string;
  unit_label: string;
  qty_base: string;
  unit_cost: string | null;
  stock_before: string;
  stock_after: string;
  reference_type: string | null;
  reference_id: number | null;
  notes: string | null;
  created_at: string;
  product?: { id: number; name: string; sku: string | null; base_unit: string };
  creator?: { id: number; name: string } | null;
}

export interface InventorySummary {
  active_products: number;
  out_of_stock: number;
  low_stock: number;
  stock_value: number;
  movements_today: number;
}

export interface PosTransactionItem {
  id: number;
  product_id: number | null;
  product_unit_id: number | null;
  name_snapshot: string;
  sku_snapshot: string | null;
  unit_label_snapshot: string;
  qty: string;
  unit_price: string;
  subtotal: string;
}

export interface PosTransaction {
  id: number;
  transaction_number: string;
  type: 'walk_in' | 'delivery';
  status: string;
  customer_name: string | null;
  customer_phone: string | null;
  subtotal: string;
  discount: string;
  delivery_fee: string;
  total: string;
  payment_method: string | null;
  amount_paid: string | null;
  change_amount: string | null;
  cashier_name: string | null;
  notes: string | null;
  completed_at: string | null;
  created_at: string;
  items: PosTransactionItem[];
  items_count?: number;
  delivery_order?: { id: number; order_number: string; status: string; delivery_type?: string } | null;
  receipt?: {
    merchant_name: string | null;
    merchant_address: string | null;
    merchant_phone: string | null;
    invoice_footer: string | null;
    invoice_prefix: string;
    invoice_date_format: string;
  };
}

export interface StockWarning {
  product_id: number;
  product_name: string;
  stock_after: number;
  base_unit: string;
}

export interface Paginated<T> {
  data: T[];
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
}

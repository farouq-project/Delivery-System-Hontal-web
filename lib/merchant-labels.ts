import { useQuery } from '@tanstack/react-query';
import { merchantPlatformApi } from './api';

/**
 * Resolves abstract metric keys to merchant-configured display strings.
 *
 * Use `useMerchantLabels()` inside React components.
 * Use `buildLabels(unit, currency)` in non-hook contexts (tests, utilities).
 *
 * Example:
 *   const { label, unitLabel } = useMerchantLabels();
 *   label('delivery_cost')   // → "Delivery Cost / Tray"
 *   label('total_delivered') // → "Total Tray Delivered"
 *   unitLabel                // → "Tray"
 */

export interface MerchantLabels {
  /** Raw unit slug, e.g. "tray" */
  unit: string;
  /** Display form, e.g. "Tray" */
  unitLabel: string;
  /** Currency code, e.g. "IDR" */
  currency: string;
  /** Resolve any registered label key */
  label: (key: string) => string;
}

const UNIT_DISPLAY: Record<string, string> = {
  kg:      'kg',
  tray:    'Tray',
  box:     'Box',
  pcs:     'pcs',
  bottle:  'Botol',
  gallon:  'Galon',
  package: 'Paket',
  order:   'Order',
  custom:  'Unit',
};

export function buildLabels(businessUnit = 'order', currency = 'IDR'): MerchantLabels {
  const unitDisplay = UNIT_DISPLAY[businessUnit] ?? businessUnit;

  const map: Record<string, string> = {
    unit:             businessUnit,
    unit_label:       unitDisplay,
    currency,
    delivery_cost:    `Delivery Cost / ${unitDisplay}`,
    total_delivered:  `Total ${unitDisplay} Delivered`,
    orders_per_unit:  `Orders / ${unitDisplay}`,
    revenue:          'Revenue',
    orders:           'Orders',
    avg_order_value:  'Avg Order Value',
    customers:        'Customers',
    drivers:          'Drivers',
  };

  return {
    unit: businessUnit,
    unitLabel: unitDisplay,
    currency,
    label: (key: string) => map[key] ?? key,
  };
}

/**
 * React hook — fetches merchant business profile and returns label resolver.
 * Caches for 10 minutes; re-fetches in the background when stale.
 * Falls back to "order" / "IDR" defaults when settings are not yet configured.
 */
export function useMerchantLabels(): MerchantLabels {
  const { data } = useQuery({
    queryKey: ['platform', 'business'],
    queryFn:  merchantPlatformApi.getBusinessProfile,
    staleTime: 10 * 60 * 1000,
  });

  const s = data?.data?.data;
  return buildLabels(s?.business_unit ?? 'order', s?.currency ?? 'IDR');
}

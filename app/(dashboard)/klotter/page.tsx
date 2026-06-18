'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ordersApi, settingsApi } from '@/lib/api';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { STATUS_COLORS, formatCurrency, formatTime, VIP_COLORS } from '@/lib/utils';
import { useAuthStore } from '@/store/auth';
import { Layers, Settings2 } from 'lucide-react';

type PaymentKey = 'cash' | 'transfer' | 'qris' | 'bayar_di_toko';

interface KlotterOrder {
  id: number;
  order_number: string;
  customer_name: string;
  product_name: string;
  order_value: number;
  payment_method: PaymentKey | null;
  delivery_address: string;
  requested_delivery_start: string | null;
  requested_delivery_end: string | null;
  assigned_at: string | null;
  status: string;
  customer?: { vip_level?: string };
}

function paymentTotals(orders: KlotterOrder[]): Record<PaymentKey, number> {
  return orders.reduce(
    (acc, o) => {
      const m = o.payment_method ?? 'cash';
      acc[m] = (acc[m] ?? 0) + o.order_value;
      return acc;
    },
    { cash: 0, transfer: 0, qris: 0, bayar_di_toko: 0 } as Record<PaymentKey, number>
  );
}

interface KlotterGroup {
  klotter_number: number;
  status: string;
  orders: KlotterOrder[];
}

const STATUS_BADGE: Record<string, string> = {
  pending:    'bg-gray-100 text-gray-700',
  assigned:   'bg-blue-100 text-blue-700',
  in_transit: 'bg-yellow-100 text-yellow-700',
  delivered:  'bg-green-100 text-green-700',
  failed:     'bg-red-100 text-red-700',
  cancelled:  'bg-gray-100 text-gray-500',
};

interface DriverKlotters {
  driver_id: number;
  driver_name: string;
  total_orders: number;
  klotters: KlotterGroup[];
}

export default function KlotterPage() {
  const qc = useQueryClient();
  const { user } = useAuthStore();
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [showSettings, setShowSettings] = useState(false);

  const canManageSettings = ['super_admin', 'developer', 'merchant_owner'].includes(user?.role ?? '');

  const { data, isLoading } = useQuery({
    queryKey: ['klotters', date],
    queryFn: () => ordersApi.klotters(date),
  });

  const result = data?.data?.data;
  const drivers: DriverKlotters[] = result?.drivers ?? [];
  const klotterSize: number = result?.klotter_size ?? 7;

  const [klotterSizeInput, setKlotterSizeInput] = useState<string>('');

  const updateSettings = useMutation({
    mutationFn: (size: number) => settingsApi.update({ klotter_size: size }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['klotters'] });
      setShowSettings(false);
    },
  });

  return (
    <div className="p-4 md:p-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><Layers className="h-6 w-6" /> Klotter Grouping</h1>
          <p className="text-gray-500 text-sm">Orders grouped per driver, batched in klotters of {klotterSize}</p>
        </div>
        <div className="flex items-center gap-3">
          <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-44" />
          {canManageSettings && (
            <Button variant="outline" onClick={() => { setKlotterSizeInput(String(klotterSize)); setShowSettings((s) => !s); }}>
              <Settings2 className="h-4 w-4" /> Klotter Size
            </Button>
          )}
        </div>
      </div>

      {showSettings && (
        <div className="bg-white rounded-lg border p-4 mb-6 flex items-end gap-3">
          <div className="space-y-1">
            <Label>Klotter Size (orders per batch)</Label>
            <Input
              type="number"
              min={1}
              className="w-32"
              value={klotterSizeInput}
              onChange={(e) => setKlotterSizeInput(e.target.value)}
            />
          </div>
          <Button
            onClick={() => {
              const size = parseInt(klotterSizeInput, 10);
              if (size > 0) updateSettings.mutate(size);
            }}
            disabled={updateSettings.isPending}
          >
            {updateSettings.isPending ? 'Saving...' : 'Save'}
          </Button>
        </div>
      )}

      {isLoading ? (
        <p className="text-center py-8 text-gray-400">Loading...</p>
      ) : drivers.length === 0 ? (
        <p className="text-center py-8 text-gray-400">No assigned orders for this date.</p>
      ) : (
        <div className="space-y-6">
          {drivers.map((driver) => (
            <div key={driver.driver_id} className="bg-white rounded-lg border overflow-hidden">
              <div className="bg-gray-50 border-b px-4 py-3">
                <div className="flex items-center justify-between">
                  <h2 className="font-semibold">{driver.driver_name}</h2>
                  <span className="text-sm text-gray-500">{driver.total_orders} order(s) · {driver.klotters.length} klotter(s)</span>
                </div>
                {(() => {
                  const allOrders = driver.klotters.flatMap((k) => k.orders);
                  const totals = paymentTotals(allOrders);
                  return (
                    <div className="flex flex-wrap gap-3 mt-1.5 text-xs text-gray-600">
                      {totals.cash           > 0 && <span className="bg-green-100 text-green-800 px-2 py-0.5 rounded">Cash: {formatCurrency(totals.cash)}</span>}
                      {totals.transfer       > 0 && <span className="bg-blue-100 text-blue-800 px-2 py-0.5 rounded">Transfer: {formatCurrency(totals.transfer)}</span>}
                      {totals.qris           > 0 && <span className="bg-purple-100 text-purple-800 px-2 py-0.5 rounded">QRIS: {formatCurrency(totals.qris)}</span>}
                      {totals.bayar_di_toko  > 0 && <span className="bg-orange-100 text-orange-800 px-2 py-0.5 rounded">Bayar di Toko: {formatCurrency(totals.bayar_di_toko)}</span>}
                    </div>
                  );
                })()}
              </div>
              <div className="p-4 space-y-4">
                {driver.klotters.map((klotter) => (
                  <div key={klotter.klotter_number} className="border rounded-md">
                    <div className="bg-blue-50 px-3 py-2 border-b">
                      <div className="flex items-center justify-between text-sm font-medium text-blue-700">
                        <div className="flex items-center gap-2">
                          <span>Klotter {klotter.klotter_number} ({klotter.orders.length} order{klotter.orders.length > 1 ? 's' : ''})</span>
                          <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${STATUS_BADGE[klotter.status] ?? 'bg-gray-100 text-gray-600'}`}>
                            {klotter.status.replace('_', ' ')}
                          </span>
                        </div>
                        <span className="font-normal text-xs text-blue-600">{formatCurrency(klotter.orders.reduce((s, o) => s + o.order_value, 0))}</span>
                      </div>
                      {(() => {
                        const totals = paymentTotals(klotter.orders);
                        return (
                          <div className="flex flex-wrap gap-2 mt-1 text-xs">
                            {totals.cash          > 0 && <span className="bg-green-100 text-green-800 px-1.5 py-0.5 rounded">Cash: {formatCurrency(totals.cash)}</span>}
                            {totals.transfer      > 0 && <span className="bg-blue-100 text-blue-800 px-1.5 py-0.5 rounded">Transfer: {formatCurrency(totals.transfer)}</span>}
                            {totals.qris          > 0 && <span className="bg-purple-100 text-purple-800 px-1.5 py-0.5 rounded">QRIS: {formatCurrency(totals.qris)}</span>}
                            {totals.bayar_di_toko > 0 && <span className="bg-orange-100 text-orange-800 px-1.5 py-0.5 rounded">Bayar di Toko: {formatCurrency(totals.bayar_di_toko)}</span>}
                          </div>
                        );
                      })()}
                    </div>
                    <div className="divide-y">
                      {klotter.orders.map((order) => (
                        <div key={order.id} className="px-3 py-2 flex items-center justify-between text-sm">
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <span className="font-medium">{order.customer_name}</span>
                              <span className={`px-1.5 py-0.5 rounded-full text-xs ${STATUS_COLORS[order.status]}`}>
                                {order.status.replace('_', ' ')}
                              </span>
                              {order.customer?.vip_level && (
                                <span className={`px-1.5 py-0.5 rounded-full text-xs ${VIP_COLORS[order.customer.vip_level]}`}>
                                  {order.customer.vip_level}
                                </span>
                              )}
                            </div>
                            <p className="text-gray-400 truncate text-xs">{order.product_name} · {order.delivery_address}</p>
                            {order.assigned_at && (
                              <p className="text-blue-400 text-xs">Dispatch: {formatTime(order.assigned_at)}</p>
                            )}
                          </div>
                          <div className="text-right ml-3 shrink-0">
                            <p className="font-medium">{formatCurrency(order.order_value)}</p>
                            {order.requested_delivery_start && (
                              <p className="text-xs text-gray-400">
                                {formatTime(order.requested_delivery_start)}–{formatTime(order.requested_delivery_end)}
                              </p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

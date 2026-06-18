'use client';

import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { reportsApi, ordersApi } from '@/lib/api';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { formatCurrency } from '@/lib/utils';
import { ArrowUp, ArrowDown, ArrowUpDown, ClipboardList } from 'lucide-react';

interface CashierRow {
  cashier_name: string;
  total_cash: number;
  total_transfer: number;
  total_qris: number;
  total_bayar_di_toko: number;
  total_orders: number;
}

type SortKey = keyof CashierRow;

function todayStr() {
  return new Date().toISOString().split('T')[0];
}

export default function ReportsPage() {
  const [startDate, setStartDate] = useState(todayStr());
  const [endDate, setEndDate]     = useState(todayStr());
  const [sortKey, setSortKey]     = useState<SortKey>('cashier_name');
  const [sortDir, setSortDir]     = useState<'asc' | 'desc'>('asc');

  const { data, isLoading } = useQuery({
    queryKey: ['reports', 'cashier-summary', startDate, endDate],
    queryFn: () => reportsApi.cashierSummary({ start_date: startDate, end_date: endDate }),
  });

  const { data: transferData, isLoading: transferLoading } = useQuery({
    queryKey: ['reports', 'transfer-orders', startDate, endDate],
    queryFn: () => ordersApi.list({
      payment_method: 'transfer',
      date_from: startDate,
      date_to: endDate,
      per_page: 9999,
    }),
  });

  const rows: CashierRow[] = data?.data?.data?.rows ?? [];
  const transferOrders = transferData?.data?.data ?? [];

  const sortedRows = useMemo(() => {
    const copy = [...rows];
    copy.sort((a, b) => {
      const av = a[sortKey];
      const bv = b[sortKey];
      const cmp = typeof av === 'string' && typeof bv === 'string'
        ? av.localeCompare(bv)
        : (av as number) - (bv as number);
      return sortDir === 'asc' ? cmp : -cmp;
    });
    return copy;
  }, [rows, sortKey, sortDir]);

  const totals = useMemo(() => rows.reduce((acc, r) => ({
    total_cash:          acc.total_cash + r.total_cash,
    total_transfer:      acc.total_transfer + r.total_transfer,
    total_qris:          acc.total_qris + r.total_qris,
    total_bayar_di_toko: acc.total_bayar_di_toko + r.total_bayar_di_toko,
    total_orders:        acc.total_orders + r.total_orders,
  }), { total_cash: 0, total_transfer: 0, total_qris: 0, total_bayar_di_toko: 0, total_orders: 0 }), [rows]);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  };

  const columns: { key: SortKey; label: string; align?: 'right' | 'left' }[] = [
    { key: 'cashier_name',        label: 'Cashier Name',    align: 'left' },
    { key: 'total_cash',          label: 'Cash',            align: 'right' },
    { key: 'total_transfer',      label: 'Transfer',        align: 'right' },
    { key: 'total_qris',          label: 'QRIS',            align: 'right' },
    { key: 'total_bayar_di_toko', label: 'Bayar di Toko',  align: 'right' },
    { key: 'total_orders',        label: 'Orders',          align: 'right' },
  ];

  const sortIcon = (key: SortKey) => {
    if (sortKey !== key) return <ArrowUpDown className="h-3 w-3 text-gray-300" />;
    return sortDir === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />;
  };

  return (
    <div className="p-4 md:p-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><ClipboardList className="h-6 w-6" /> Cashier Report</h1>
          <p className="text-gray-500 text-sm">Totals per cashier, grouped by payment method</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="space-y-1">
            <Label className="text-xs">Start Date</Label>
            <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="w-40" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">End Date</Label>
            <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="w-40" />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg border overflow-x-auto">
        <table className="w-full text-sm border-collapse">
          <thead className="bg-gray-50">
            <tr>
              {columns.map(({ key, label, align }) => (
                <th
                  key={key}
                  onClick={() => toggleSort(key)}
                  className={`px-4 py-3 font-medium text-gray-600 border cursor-pointer select-none hover:bg-gray-100 ${align === 'right' ? 'text-right' : 'text-left'}`}
                >
                  <div className={`flex items-center gap-1.5 ${align === 'right' ? 'justify-end' : ''}`}>
                    {label}
                    {sortIcon(key)}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={columns.length} className="text-center py-8 text-gray-400 border">Loading...</td></tr>
            ) : sortedRows.length === 0 ? (
              <tr><td colSpan={columns.length} className="text-center py-8 text-gray-400 border">No data for this date range</td></tr>
            ) : sortedRows.map((row) => (
              <tr key={row.cashier_name} className="hover:bg-gray-50">
                <td className="px-4 py-2 border font-medium">{row.cashier_name}</td>
                <td className="px-4 py-2 border text-right">{formatCurrency(row.total_cash)}</td>
                <td className="px-4 py-2 border text-right">{formatCurrency(row.total_transfer)}</td>
                <td className="px-4 py-2 border text-right">{formatCurrency(row.total_qris)}</td>
                <td className="px-4 py-2 border text-right">{formatCurrency(row.total_bayar_di_toko)}</td>
                <td className="px-4 py-2 border text-right">{row.total_orders}</td>
              </tr>
            ))}
          </tbody>
          {sortedRows.length > 0 && (
            <tfoot>
              <tr className="bg-gray-50 font-semibold">
                <td className="px-4 py-2 border">Total</td>
                <td className="px-4 py-2 border text-right">{formatCurrency(totals.total_cash)}</td>
                <td className="px-4 py-2 border text-right">{formatCurrency(totals.total_transfer)}</td>
                <td className="px-4 py-2 border text-right">{formatCurrency(totals.total_qris)}</td>
                <td className="px-4 py-2 border text-right">{formatCurrency(totals.total_bayar_di_toko)}</td>
                <td className="px-4 py-2 border text-right">{totals.total_orders}</td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>
      {/* Transfer Orders Detail */}
      <div className="mt-8">
        <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
          <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded font-medium">Transfer</span>
          Transfer Order Detail
        </h2>
        <div className="bg-white rounded-lg border overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-gray-600 border">Order #</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600 border">Customer</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600 border">Product</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600 border">Driver</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600 border">Date</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600 border">Value</th>
              </tr>
            </thead>
            <tbody>
              {transferLoading ? (
                <tr><td colSpan={6} className="text-center py-6 text-gray-400 border">Loading...</td></tr>
              ) : transferOrders.length === 0 ? (
                <tr><td colSpan={6} className="text-center py-6 text-gray-400 border">No transfer orders in this date range</td></tr>
              ) : transferOrders.map((o: { id: number; order_number: string; customer_name: string; product_name: string; order_value: number; requested_delivery_date: string; driver?: { driver_name: string } | null }) => (
                <tr key={o.id} className="hover:bg-gray-50">
                  <td className="px-4 py-2 border font-mono text-xs">{o.order_number}</td>
                  <td className="px-4 py-2 border">{o.customer_name}</td>
                  <td className="px-4 py-2 border text-gray-600 max-w-[160px] truncate">{o.product_name}</td>
                  <td className="px-4 py-2 border text-gray-600">{o.driver?.driver_name ?? '—'}</td>
                  <td className="px-4 py-2 border text-gray-600">{o.requested_delivery_date}</td>
                  <td className="px-4 py-2 border text-right font-medium">{formatCurrency(o.order_value)}</td>
                </tr>
              ))}
            </tbody>
            {transferOrders.length > 0 && (
              <tfoot>
                <tr className="bg-gray-50 font-semibold">
                  <td colSpan={5} className="px-4 py-2 border">Total ({transferOrders.length} orders)</td>
                  <td className="px-4 py-2 border text-right">
                    {formatCurrency(transferOrders.reduce((s: number, o: { order_value: number }) => s + o.order_value, 0))}
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>
    </div>
  );
}

'use client';

import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { reportsApi } from '@/lib/api';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { formatCurrency } from '@/lib/utils';
import { ArrowUp, ArrowDown, ArrowUpDown, ClipboardList } from 'lucide-react';

interface CashierRow {
  cashier_name: string;
  total_cash: number;
  total_transfer: number;
  total_qris: number;
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

  const rows: CashierRow[] = data?.data?.data?.rows ?? [];

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
    total_cash: acc.total_cash + r.total_cash,
    total_transfer: acc.total_transfer + r.total_transfer,
    total_qris: acc.total_qris + r.total_qris,
    total_orders: acc.total_orders + r.total_orders,
  }), { total_cash: 0, total_transfer: 0, total_qris: 0, total_orders: 0 }), [rows]);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  };

  const columns: { key: SortKey; label: string; align?: 'right' | 'left' }[] = [
    { key: 'cashier_name', label: 'Cashier Name', align: 'left' },
    { key: 'total_cash', label: 'Total Cash', align: 'right' },
    { key: 'total_transfer', label: 'Total Transfer', align: 'right' },
    { key: 'total_qris', label: 'Total QRIS', align: 'right' },
    { key: 'total_orders', label: 'Orders', align: 'right' },
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
                <td className="px-4 py-2 border text-right">{totals.total_orders}</td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </div>
  );
}

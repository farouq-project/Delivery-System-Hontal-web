'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ArrowDown, ArrowUp, Search } from 'lucide-react';
import { inventoryApi } from '@/lib/api';
import { formatQty, num } from '@/lib/pos';
import { formatCurrency } from '@/lib/utils';
import type { Paginated, StockMovement, StockMovementType } from '@/types/pos';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

const TYPE_STYLES: Record<StockMovementType, { label: string; className: string }> = {
  in:         { label: 'Stock in',   className: 'bg-green-100 text-green-700' },
  out:        { label: 'Stock out',  className: 'bg-orange-100 text-orange-700' },
  adjustment: { label: 'Adjustment', className: 'bg-blue-100 text-blue-700' },
  sale:       { label: 'Sale',       className: 'bg-purple-100 text-purple-700' },
};

type TypeFilter = 'all' | StockMovementType;

export default function MovementsTab() {
  const [search, setSearch]       = useState('');
  const [type, setType]           = useState<TypeFilter>('all');
  const [dateFrom, setDateFrom]   = useState('');
  const [dateTo, setDateTo]       = useState('');
  const [direction, setDirection] = useState<'asc' | 'desc'>('desc');
  const [page, setPage]           = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ['inventory', 'movements', search, type, dateFrom, dateTo, direction, page],
    queryFn: () => inventoryApi.movements({
      search: search || undefined,
      type: type === 'all' ? undefined : type,
      date_from: dateFrom || undefined,
      date_to: dateTo || undefined,
      sort: 'created_at',
      direction,
      page,
      per_page: 25,
    }),
  });

  const result = data?.data as Paginated<StockMovement> | undefined;
  const rows   = result?.data ?? [];

  return (
    <div>
      <div className="flex flex-wrap gap-3 mb-4 items-center">
        <div className="relative flex-1 min-w-48 max-w-sm">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Product name or SKU"
            className="pl-9"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          />
        </div>
        <div className="flex flex-wrap gap-1">
          {(['all', 'in', 'out', 'adjustment', 'sale'] as TypeFilter[]).map((t) => (
            <button
              key={t}
              onClick={() => { setType(t); setPage(1); }}
              className={`px-3 py-1.5 rounded-md text-xs font-medium border transition-colors ${
                type === t ? 'bg-gray-900 text-white border-gray-900' : 'bg-white text-gray-600 hover:bg-gray-50'
              }`}
            >
              {t === 'all' ? 'All' : TYPE_STYLES[t].label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2 text-sm">
          <Input type="date" value={dateFrom} onChange={(e) => { setDateFrom(e.target.value); setPage(1); }} className="w-36" aria-label="From date" />
          <span className="text-gray-400">–</span>
          <Input type="date" value={dateTo} onChange={(e) => { setDateTo(e.target.value); setPage(1); }} className="w-36" aria-label="To date" />
        </div>
      </div>

      <div className="bg-white rounded-lg border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th
                  className="text-left px-4 py-3 font-medium text-gray-600 cursor-pointer select-none hover:text-blue-600 whitespace-nowrap"
                  onClick={() => { setDirection((d) => (d === 'asc' ? 'desc' : 'asc')); setPage(1); }}
                >
                  Date {direction === 'asc'
                    ? <ArrowUp className="h-3 w-3 text-blue-500 ml-1 inline" />
                    : <ArrowDown className="h-3 w-3 text-blue-500 ml-1 inline" />}
                </th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Product</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Type</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">Change</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600 whitespace-nowrap">Stock after</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600 whitespace-nowrap">Cost / unit</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">By</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Note</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {isLoading ? (
                <tr><td colSpan={8} className="text-center py-8 text-gray-400">Loading…</td></tr>
              ) : rows.length === 0 ? (
                <tr><td colSpan={8} className="text-center py-8 text-gray-400">No stock movements yet</td></tr>
              ) : rows.map((m) => {
                const base  = num(m.qty_base);
                const style = TYPE_STYLES[m.type];
                return (
                  <tr key={m.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 whitespace-nowrap text-gray-600">
                      {new Date(m.created_at).toLocaleString('id-ID', { dateStyle: 'short', timeStyle: 'short' })}
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-medium">{m.product?.name ?? '—'}</div>
                      {m.product?.sku && <div className="text-xs text-gray-400">{m.product.sku}</div>}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${style.className}`}>{style.label}</span>
                    </td>
                    <td className={`px-4 py-3 text-right whitespace-nowrap font-medium tabular-nums ${base < 0 ? 'text-red-600' : 'text-green-700'}`}>
                      {base < 0 ? '−' : '+'}{formatQty(m.qty)} {m.unit_label}
                    </td>
                    <td className="px-4 py-3 text-right whitespace-nowrap tabular-nums text-gray-600">
                      {formatQty(m.stock_after)} {m.product?.base_unit}
                    </td>
                    <td className="px-4 py-3 text-right whitespace-nowrap tabular-nums text-gray-600">
                      {m.unit_cost !== null ? `${formatCurrency(num(m.unit_cost))} / ${m.unit_label}` : '—'}
                    </td>
                    <td className="px-4 py-3 text-gray-600">{m.creator?.name ?? '—'}</td>
                    <td className="px-4 py-3 text-gray-500 max-w-xs truncate" title={m.notes ?? undefined}>
                      {m.reference_type === 'pos_transaction' ? `POS sale #${m.reference_id}` : (m.notes ?? '—')}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {result && result.last_page > 1 && (
        <div className="flex items-center justify-between mt-4">
          <p className="text-sm text-gray-500">Page {result.current_page} of {result.last_page}</p>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Previous</Button>
            <Button size="sm" variant="outline" disabled={page >= result.last_page} onClick={() => setPage((p) => p + 1)}>Next</Button>
          </div>
        </div>
      )}
    </div>
  );
}

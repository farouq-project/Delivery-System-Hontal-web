'use client';

import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ArrowDown, ArrowUp, ArrowUpDown, Edit, MinusCircle, PackagePlus, Plus,
  Scale, Search, Trash2, X,
} from 'lucide-react';
import { inventoryApi } from '@/lib/api';
import { apiErrorMessage, formatQty, formatStock, num } from '@/lib/pos';
import { formatCurrency } from '@/lib/utils';
import { useAuthStore } from '@/store/auth';
import type { InventorySummary, Paginated, Product } from '@/types/pos';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import ProductForm from './product-form';
import StockDialog, { type StockMode } from './stock-dialog';
import MovementsTab from './movements-tab';

type SortField    = 'name' | 'sku' | 'stock_qty' | 'default_price' | 'is_active' | 'updated_at';
type SortDir      = 'asc' | 'desc';
type StatusFilter = 'all' | 'active' | 'inactive';
type BulkAction   = 'activate' | 'deactivate' | 'delete';

const NO_SELECTION = new Set<number>();

function SortIcon({ field, sortBy, sortDir }: { field: SortField; sortBy: SortField; sortDir: SortDir }) {
  if (sortBy !== field) return <ArrowUpDown className="h-3 w-3 text-gray-300 ml-1 inline" />;
  return sortDir === 'asc'
    ? <ArrowUp className="h-3 w-3 text-blue-500 ml-1 inline" />
    : <ArrowDown className="h-3 w-3 text-blue-500 ml-1 inline" />;
}

function stockState(p: Product): { label: string; className: string } | null {
  const stock = num(p.stock_qty);
  if (stock < 0)  return { label: 'Negative', className: 'bg-red-100 text-red-700' };
  if (stock === 0) return { label: 'Out of stock', className: 'bg-red-100 text-red-700' };
  if (p.low_stock_threshold !== null && stock <= num(p.low_stock_threshold)) {
    return { label: 'Low', className: 'bg-amber-100 text-amber-700' };
  }
  return null;
}

export default function InventoryPage() {
  const qc = useQueryClient();
  const role = useAuthStore((s) => s.user?.role ?? '');
  const canManage = ['merchant_owner', 'super_admin', 'developer'].includes(role);

  const [tab, setTab]                 = useState<'products' | 'history'>('products');
  const [search, setSearch]           = useState('');
  const [status, setStatus]           = useState<StatusFilter>('all');
  const [sortBy, setSortBy]           = useState<SortField>('name');
  const [sortDir, setSortDir]         = useState<SortDir>('asc');
  const [page, setPage]               = useState(1);
  const [perPage, setPerPage]         = useState(25);
  const [formProduct, setFormProduct] = useState<Product | null | undefined>(undefined);
  const [stockTarget, setStockTarget] = useState<{ product: Product; mode: StockMode } | null>(null);
  const [confirm, setConfirm]         = useState<{ action: BulkAction; ids: number[]; label: string } | null>(null);
  const [notice, setNotice]           = useState('');

  // A selection belongs to the view it was made in. Changing the search, filter, sort or page
  // makes it empty, so a bulk action can never reach records that are no longer on screen.
  const viewKey = `${search}|${status}|${sortBy}|${sortDir}|${page}|${perPage}`;
  const [selection, setSelection] = useState<{ view: string; ids: Set<number> }>({ view: '', ids: NO_SELECTION });
  const selectedIds = selection.view === viewKey ? selection.ids : NO_SELECTION;
  const setSelectedIds = (next: Set<number> | ((prev: Set<number>) => Set<number>)) =>
    setSelection((s) => {
      const prev = s.view === viewKey ? s.ids : NO_SELECTION;
      return { view: viewKey, ids: typeof next === 'function' ? next(prev) : next };
    });

  const toggleSort = (field: SortField) => {
    if (sortBy === field) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else { setSortBy(field); setSortDir('asc'); }
    setPage(1);
  };

  const { data: summaryRes } = useQuery({
    queryKey: ['inventory', 'summary'],
    queryFn: inventoryApi.summary,
  });
  const summary = summaryRes?.data?.data as InventorySummary | undefined;

  const { data, isLoading, error } = useQuery({
    queryKey: ['inventory', 'products', search, status, sortBy, sortDir, page, perPage],
    queryFn: () => inventoryApi.products({ search: search || undefined, status, sort: sortBy, direction: sortDir, page, per_page: perPage }),
    enabled: tab === 'products',
  });
  const result   = data?.data as Paginated<Product> | undefined;
  const products = useMemo(() => result?.data ?? [], [result]);

  const featureOff = (error as { response?: { data?: { code?: string } } } | null)?.response?.data?.code === 'feature_disabled';

  const allSelected  = products.length > 0 && products.every((p) => selectedIds.has(p.id));
  const someSelected = !allSelected && products.some((p) => selectedIds.has(p.id));
  const selectAll    = () => setSelectedIds(new Set(products.map((p) => p.id)));
  const unselectAll  = () => setSelectedIds(new Set());
  const toggleOne    = (id: number) => setSelectedIds((prev) => {
    const next = new Set(prev);
    if (next.has(id)) next.delete(id); else next.add(id);
    return next;
  });

  const bulkMutation = useMutation({
    mutationFn: ({ action, ids }: { action: BulkAction; ids: number[] }) => inventoryApi.bulk(action, ids),
    onSuccess: (res, { action }) => {
      const r = res.data.data as { deleted: number; archived: number; updated: number };
      setNotice(action === 'delete'
        ? `${r.deleted} deleted${r.archived ? `, ${r.archived} archived (they have stock or sales history, so they were deactivated instead)` : ''}.`
        : `${r.updated} product(s) ${action === 'activate' ? 'activated' : 'deactivated'}.`);
      setSelectedIds(new Set());
      setConfirm(null);
      qc.invalidateQueries({ queryKey: ['inventory'] });
    },
    onError: (err) => { setNotice(apiErrorMessage(err)); setConfirm(null); },
  });

  const askBulk = (action: BulkAction, ids: number[], label: string) => setConfirm({ action, ids, label });

  if (featureOff) {
    return (
      <div className="p-4 md:p-6">
        <h1 className="text-2xl font-bold mb-2">Inventory</h1>
        <p className="text-gray-500">Inventory is not enabled for your business. Contact Hontal support to turn it on.</p>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-5">
        <div>
          <h1 className="text-2xl font-bold">Inventory</h1>
          <p className="text-gray-500 text-sm">Products, selling units, and every stock movement</p>
        </div>
        {canManage && tab === 'products' && (
          <Button onClick={() => setFormProduct(null)}><Plus className="h-4 w-4" /> Add product</Button>
        )}
      </div>

      {summary && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
          {[
            { label: 'Active products', value: String(summary.active_products) },
            { label: 'Low stock', value: String(summary.low_stock), warn: summary.low_stock > 0 },
            { label: 'Out of stock', value: String(summary.out_of_stock), warn: summary.out_of_stock > 0 },
            { label: 'Stock value (last cost)', value: formatCurrency(summary.stock_value) },
          ].map((s) => (
            <div key={s.label} className="bg-white border rounded-lg px-4 py-3">
              <p className="text-xs text-gray-500">{s.label}</p>
              <p className={`text-lg font-semibold tabular-nums ${s.warn ? 'text-amber-600' : 'text-gray-900'}`}>{s.value}</p>
            </div>
          ))}
        </div>
      )}

      <div className="flex gap-1 border-b mb-4">
        {(['products', 'history'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
              tab === t ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {t === 'products' ? 'Products' : 'Stock history'}
          </button>
        ))}
      </div>

      {notice && (
        <div className="flex items-start justify-between gap-3 bg-blue-50 border border-blue-200 text-blue-800 text-sm px-3 py-2 rounded-md mb-4">
          <span>{notice}</span>
          <button onClick={() => setNotice('')} aria-label="Dismiss"><X className="h-4 w-4" /></button>
        </div>
      )}

      {tab === 'history' ? <MovementsTab /> : (
        <>
          <div className="flex flex-wrap gap-3 mb-4 items-center">
            <div className="relative flex-1 min-w-48 max-w-sm">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Name, SKU or barcode"
                className="pl-9"
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              />
            </div>
            <div className="flex gap-1">
              {(['all', 'active', 'inactive'] as StatusFilter[]).map((s) => (
                <button
                  key={s}
                  onClick={() => { setStatus(s); setPage(1); }}
                  className={`px-3 py-1.5 rounded-md text-xs font-medium border transition-colors capitalize ${
                    status === s ? 'bg-gray-900 text-white border-gray-900' : 'bg-white text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
            <div className="flex gap-1 items-center text-xs text-gray-500">
              Show
              {[25, 50, 100].map((n) => (
                <button
                  key={n}
                  onClick={() => { setPerPage(n); setPage(1); }}
                  className={`px-2 py-1 rounded border ${perPage === n ? 'bg-gray-900 text-white border-gray-900' : 'bg-white hover:bg-gray-50'}`}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>

          {canManage && selectedIds.size > 0 && (
            <div className="flex flex-wrap items-center gap-2 bg-gray-900 text-white rounded-lg px-4 py-2 mb-3 text-sm">
              <span className="font-medium">{selectedIds.size} selected</span>
              <button onClick={unselectAll} className="underline text-gray-300 hover:text-white">Unselect all</button>
              <div className="flex flex-wrap gap-2 ml-auto">
                <Button size="sm" variant="secondary" onClick={() => askBulk('activate', [...selectedIds], 'Activate')}>Activate</Button>
                <Button size="sm" variant="secondary" onClick={() => askBulk('deactivate', [...selectedIds], 'Deactivate')}>Deactivate</Button>
                <Button size="sm" variant="destructive" onClick={() => askBulk('delete', [...selectedIds], 'Delete')}>
                  <Trash2 className="h-3.5 w-3.5" /> Delete
                </Button>
              </div>
            </div>
          )}

          <div className="bg-white rounded-lg border overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    {canManage && (
                      <th className="px-4 py-3 w-8">
                        <input
                          type="checkbox"
                          checked={allSelected}
                          ref={(el) => { if (el) el.indeterminate = someSelected; }}
                          onChange={() => (allSelected ? unselectAll() : selectAll())}
                          aria-label={allSelected ? 'Unselect all on this page' : 'Select all on this page'}
                          title="Selects the products shown on this page"
                        />
                      </th>
                    )}
                    {([
                      ['name', 'Product', 'text-left'],
                      ['sku', 'SKU', 'text-left'],
                      ['stock_qty', 'Stock', 'text-right'],
                      ['default_price', 'Price', 'text-right'],
                      ['is_active', 'Status', 'text-left'],
                      ['updated_at', 'Updated', 'text-left'],
                    ] as [SortField, string, string][]).map(([field, label, align]) => (
                      <th
                        key={field}
                        className={`${align} px-4 py-3 font-medium text-gray-600 cursor-pointer select-none hover:text-blue-600 whitespace-nowrap`}
                        onClick={() => toggleSort(field)}
                      >
                        {label} <SortIcon field={field} sortBy={sortBy} sortDir={sortDir} />
                      </th>
                    ))}
                    <th className="text-right px-4 py-3 font-medium text-gray-600">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {isLoading ? (
                    <tr><td colSpan={8} className="text-center py-8 text-gray-400">Loading…</td></tr>
                  ) : products.length === 0 ? (
                    <tr><td colSpan={8} className="text-center py-8 text-gray-400">
                      {search || status !== 'all' ? 'No products match your search' : 'No products yet'}
                    </td></tr>
                  ) : products.map((p) => {
                    const state   = stockState(p);
                    const units   = p.units.filter((u) => u.is_active);
                    const defUnit = units.find((u) => u.is_default) ?? units[0];
                    return (
                      <tr key={p.id} className={`hover:bg-gray-50 ${selectedIds.has(p.id) ? 'bg-blue-50/50' : ''}`}>
                        {canManage && (
                          <td className="px-4 py-3">
                            <input type="checkbox" checked={selectedIds.has(p.id)} onChange={() => toggleOne(p.id)} aria-label={`Select ${p.name}`} />
                          </td>
                        )}
                        <td className="px-4 py-3">
                          <div className="font-medium">{p.name}</div>
                          <div className="text-xs text-gray-400">
                            {units.map((u) => `${u.unit_label} ${formatCurrency(num(u.selling_price))}`).join(' · ')}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-gray-600">
                          {p.sku ?? '—'}
                          {p.barcode && <div className="text-xs text-gray-400">{p.barcode}</div>}
                        </td>
                        <td className="px-4 py-3 text-right whitespace-nowrap">
                          <div className="font-medium tabular-nums">{formatStock(p)}</div>
                          <div className="flex items-center justify-end gap-1.5 text-xs text-gray-400 tabular-nums">
                            {state && <span className={`px-1.5 rounded ${state.className}`}>{state.label}</span>}
                            {num(defUnit?.conversion_to_base) > 1 && `${formatQty(p.stock_qty)} ${p.base_unit}`}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-right whitespace-nowrap tabular-nums">
                          {defUnit ? <>{formatCurrency(num(defUnit.selling_price))}<span className="text-xs text-gray-400"> / {defUnit.unit_label}</span></> : '—'}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${p.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                            {p.is_active ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-gray-500 whitespace-nowrap">
                          {new Date(p.updated_at).toLocaleDateString('id-ID')}
                        </td>
                        <td className="px-4 py-3">
                          {canManage ? (
                            <div className="flex justify-end gap-1">
                              <Button size="sm" variant="outline" onClick={() => setStockTarget({ product: p, mode: 'in' })} title="Stock in">
                                <PackagePlus className="h-3.5 w-3.5" /> In
                              </Button>
                              <Button size="sm" variant="ghost" onClick={() => setStockTarget({ product: p, mode: 'out' })} title="Stock out" aria-label={`Stock out ${p.name}`}>
                                <MinusCircle className="h-3.5 w-3.5" />
                              </Button>
                              <Button size="sm" variant="ghost" onClick={() => setStockTarget({ product: p, mode: 'adjust' })} title="Adjust after stock count" aria-label={`Adjust ${p.name}`}>
                                <Scale className="h-3.5 w-3.5" />
                              </Button>
                              <Button size="sm" variant="ghost" onClick={() => setFormProduct(p)} title="Edit" aria-label={`Edit ${p.name}`}>
                                <Edit className="h-3.5 w-3.5" />
                              </Button>
                              <Button size="sm" variant="ghost" onClick={() => askBulk('delete', [p.id], 'Delete')} title="Delete" aria-label={`Delete ${p.name}`}>
                                <Trash2 className="h-3.5 w-3.5 text-red-500" />
                              </Button>
                            </div>
                          ) : <span className="block text-right text-xs text-gray-400">View only</span>}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {result && (
            <div className="flex items-center justify-between mt-4">
              <p className="text-sm text-gray-500">
                {result.total} product{result.total === 1 ? '' : 's'}
                {result.last_page > 1 && ` · page ${result.current_page} of ${result.last_page}`}
              </p>
              {result.last_page > 1 && (
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Previous</Button>
                  <Button size="sm" variant="outline" disabled={page >= result.last_page} onClick={() => setPage((p) => p + 1)}>Next</Button>
                </div>
              )}
            </div>
          )}
        </>
      )}

      {formProduct !== undefined && <ProductForm product={formProduct} onClose={() => setFormProduct(undefined)} />}
      {stockTarget && <StockDialog product={stockTarget.product} mode={stockTarget.mode} onClose={() => setStockTarget(null)} />}

      <ConfirmDialog
        open={confirm !== null}
        title={confirm ? `${confirm.label} ${confirm.ids.length} product${confirm.ids.length === 1 ? '' : 's'}?` : ''}
        description={confirm?.action === 'delete'
          ? 'Products with no stock or sales history are deleted. Products with history are deactivated instead, so past sales and stock records stay intact.'
          : confirm?.action === 'deactivate'
            ? 'Inactive products stay in stock history but are hidden from the POS.'
            : 'Active products appear in the POS.'}
        confirmLabel={confirm?.label}
        variant={confirm?.action === 'delete' ? 'destructive' : 'default'}
        loading={bulkMutation.isPending}
        onCancel={() => setConfirm(null)}
        onConfirm={() => confirm && bulkMutation.mutate({ action: confirm.action, ids: confirm.ids })}
      />
    </div>
  );
}

'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ordersApi, settingsApi } from '@/lib/api';
import { DeliveryOrder } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { STATUS_COLORS, formatCurrency, formatDate, formatTime } from '@/lib/utils';

function calcDuration(createdAt: string | null, deliveredAt: string | null): string | null {
  if (!createdAt || !deliveredAt) return null;
  const ms = new Date(deliveredAt).getTime() - new Date(createdAt).getTime();
  if (ms <= 0) return null;
  const totalMinutes = Math.floor(ms / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours >= 24) return `${Math.floor(hours / 24)}d ${hours % 24}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}
import { Plus, Search, Eye, Pencil, Trash2, Camera, X } from 'lucide-react';
import OrderForm from './order-form';
import OrderDetail from './order-detail';
import PinDialog from '@/components/pin-dialog';
import { useCashierStore, CASHIER_NAMES } from '@/store/cashier';
import { CashierName } from '@/types';
import { useAuthStore } from '@/store/auth';

export default function OrdersPage() {
  const qc = useQueryClient();
  const authUser = useAuthStore((s) => s.user);
  const isOwner        = ['merchant_owner', 'super_admin', 'developer'].includes(authUser?.role ?? '');
  // Merchant Owner + Dispatcher can edit assigned/delivered orders (PIN protected)
  const canEditAssigned = ['merchant_owner', 'super_admin', 'developer', 'dispatcher'].includes(authUser?.role ?? '');
  const canViewPOD      = canEditAssigned;
  const cashierName = useCashierStore((s) => s.cashierName);
  const setCashierName = useCashierStore((s) => s.setCashierName);
  const [search, setSearch]     = useState('');
  const [status, setStatus]     = useState('all');
  const [page, setPage]         = useState(1);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing]   = useState<DeliveryOrder | null>(null);
  const [viewing, setViewing]   = useState<DeliveryOrder | null>(null);
  const [pinTarget, setPinTarget] = useState<DeliveryOrder | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [podPhoto, setPodPhoto] = useState<{ url: string; notes?: string } | null>(null);

  const { data: settingsData } = useQuery({
    queryKey: ['settings'],
    queryFn: () => settingsApi.get(),
  });
  const editPin: string = settingsData?.data?.data?.order_edit_pin ?? '152';

  const { data, isLoading } = useQuery({
    queryKey: ['orders', page, search, status],
    queryFn: () => ordersApi.list({ page, per_page: 20, search, status: status === 'all' ? undefined : status }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => ordersApi.remove(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['orders'] }),
  });

  const bulkDeleteMutation = useMutation({
    mutationFn: (ids: number[]) => ordersApi.bulkDelete(ids),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['orders'] });
      setSelectedIds(new Set());
    },
  });

  const bulkCashierMutation = useMutation({
    mutationFn: ({ ids, name }: { ids: number[]; name: string }) =>
      ordersApi.bulkUpdateCashier(ids, name),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['orders'] });
      qc.invalidateQueries({ queryKey: ['reports'] });
      setSelectedIds(new Set());
    },
  });

  const podMutation = useMutation({
    mutationFn: (id: number) => ordersApi.get(id),
    onSuccess: (res) => {
      const proof = res.data?.data?.proof;
      if (proof?.photo_path) {
        const base = (process.env.NEXT_PUBLIC_API_URL ?? '').replace('/api/v1', '');
        setPodPhoto({ url: `${base}/storage/${proof.photo_path}`, notes: proof.notes ?? undefined });
      } else {
        alert('No proof-of-delivery photo for this order.');
      }
    },
  });

  const orders: DeliveryOrder[] = data?.data?.data ?? [];
  const meta = data?.data ? {
    total: data.data.total,
    current_page: data.data.current_page,
    last_page: data.data.last_page,
  } : null;

  const allSelected = orders.length > 0 && orders.every((o) => selectedIds.has(o.id));

  const toggleAll = () => {
    setSelectedIds((prev) => {
      if (allSelected) return new Set();
      const next = new Set(prev);
      orders.forEach((o) => next.add(o.id));
      return next;
    });
  };

  const toggleOne = (id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  return (
    <div className="p-4 md:p-6">
      <div className="flex flex-col sm:grid sm:grid-cols-3 sm:items-center gap-3 mb-6">
        {/* Left: title */}
        <div>
          <h1 className="text-2xl font-bold">Delivery Orders</h1>
          <p className="text-gray-500 text-sm">{meta?.total ?? 0} total orders</p>
        </div>

        {/* Centre: active cashier — big & prominent */}
        <div className="text-center">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-0.5">Active Cashier</p>
          <p className="text-4xl font-extrabold text-blue-600 leading-none">{cashierName}</p>
        </div>

        {/* Right: selector + new order */}
        <div className="flex items-center gap-3 justify-end">
          <Select value={cashierName} onValueChange={(v) => setCashierName(v as CashierName)}>
            <SelectTrigger className="w-28"><SelectValue /></SelectTrigger>
            <SelectContent>
              {CASHIER_NAMES.map((name) => (
                <SelectItem key={name} value={name}>{name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button onClick={() => setShowForm(true)}><Plus className="h-4 w-4" /> New Order</Button>
        </div>
      </div>

      <div className="flex flex-wrap gap-3 mb-4">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search orders..."
            className="pl-9"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          />
        </div>
        <Select value={status} onValueChange={(v) => { setStatus(v); setPage(1); }}>
          <SelectTrigger className="w-44"><SelectValue placeholder="All statuses" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="assigned">Assigned</SelectItem>
            <SelectItem value="in_transit">In Transit</SelectItem>
            <SelectItem value="delivered">Delivered</SelectItem>
            <SelectItem value="failed">Failed</SelectItem>
          </SelectContent>
        </Select>
        {selectedIds.size > 0 && isOwner && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500">Change cashier:</span>
            <Select
              onValueChange={(v) => {
                if (confirm(`Change cashier to "${v}" for ${selectedIds.size} order(s)?`)) {
                  bulkCashierMutation.mutate({ ids: Array.from(selectedIds), name: v });
                }
              }}
            >
              <SelectTrigger className="w-28 h-8 text-xs"><SelectValue placeholder="Select…" /></SelectTrigger>
              <SelectContent>
                {CASHIER_NAMES.map((n) => (
                  <SelectItem key={n} value={n}>{n}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
        {selectedIds.size > 0 && (
          <Button
            variant="outline"
            className="text-red-500 hover:text-red-700"
            onClick={() => {
              if (confirm(`Delete ${selectedIds.size} order(s)? Only pending, assigned, or cancelled orders will be removed.`)) {
                bulkDeleteMutation.mutate(Array.from(selectedIds));
              }
            }}
          >
            <Trash2 className="h-4 w-4" /> Delete {selectedIds.size}
          </Button>
        )}
      </div>

      <div className="bg-white rounded-lg border overflow-hidden">
        <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="px-4 py-3 w-8">
                <input type="checkbox" checked={allSelected} onChange={toggleAll} />
              </th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Order #</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Customer</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Product</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Value</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Window</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Duration</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Cashier</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Status</th>
              <th className="text-right px-4 py-3 font-medium text-gray-600">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {isLoading ? (
              <tr><td colSpan={10} className="text-center py-8 text-gray-400">Loading...</td></tr>
            ) : orders.length === 0 ? (
              <tr><td colSpan={10} className="text-center py-8 text-gray-400">No orders found</td></tr>
            ) : orders.map((o) => (
              <tr key={o.id} className="hover:bg-gray-50">
                <td className="px-4 py-3">
                  <input type="checkbox" checked={selectedIds.has(o.id)} onChange={() => toggleOne(o.id)} />
                </td>
                <td className="px-4 py-3 font-mono text-xs font-medium">{o.order_number}</td>
                <td className="px-4 py-3">
                  <div className="font-medium">{o.customer_name}</div>
                  <div className="text-xs text-gray-400">{o.customer_phone}</div>
                </td>
                <td className="px-4 py-3 text-gray-600 max-w-[150px] truncate">{o.product_name}</td>
                <td className="px-4 py-3 text-gray-700">{formatCurrency(o.order_value)}</td>
                <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">
                  {o.status === 'delivered' && o.delivered_at
                    ? <>
                        {o.requested_delivery_start ? formatTime(o.requested_delivery_start) : '—'}
                        <span className="text-gray-400"> → </span>
                        <span className="text-green-600">{formatDate(o.delivered_at, 'HH:mm')} ✓</span>
                      </>
                    : o.requested_delivery_start
                      ? `${formatTime(o.requested_delivery_start)} - ${formatTime(o.requested_delivery_end)}`
                      : 'Anytime'}
                </td>
                <td className="px-4 py-3 text-xs whitespace-nowrap">
                  {(() => {
                    const dur = calcDuration(o.order_created_at, o.delivered_at);
                    return dur
                      ? <span className="text-blue-600 font-medium">{dur}</span>
                      : <span className="text-gray-300">—</span>;
                  })()}
                </td>
                <td className="px-4 py-3 text-xs text-gray-600">{o.cashier_name ?? '—'}</td>
                <td className="px-4 py-3">
                  <span className={`text-xs px-2 py-1 rounded-full font-medium ${STATUS_COLORS[o.status]}`}>
                    {o.status.replace('_', ' ')}
                  </span>
                </td>
                <td className="px-4 py-3 text-right">
                  <div className="flex justify-end gap-2">
                    <Button size="sm" variant="ghost" onClick={() => setViewing(o)}>
                      <Eye className="h-4 w-4" />
                    </Button>
                    {(o.status === 'pending' ||
                      (['assigned', 'delivered'].includes(o.status) && canEditAssigned)) && (
                      <Button
                        size="sm" variant="ghost"
                        title="Edit order"
                        onClick={() => {
                          if (o.status === 'pending') { setEditing(o); }
                          else { setPinTarget(o); }
                        }}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                    )}
                    {o.status === 'delivered' && canViewPOD && (
                      <Button
                        size="sm" variant="ghost"
                        title="View proof of delivery"
                        onClick={() => podMutation.mutate(o.id)}
                        disabled={podMutation.isPending}
                      >
                        <Camera className="h-4 w-4 text-blue-500" />
                      </Button>
                    )}
                    {(['pending', 'assigned', 'cancelled'].includes(o.status) ||
                      (o.status === 'delivered' && isOwner)) && (
                      <Button
                        size="sm" variant="ghost"
                        className="text-red-500 hover:text-red-700"
                        onClick={() => { if (confirm('Delete this order?')) deleteMutation.mutate(o.id); }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
      </div>

      {meta && meta.last_page > 1 && (
        <div className="flex justify-between items-center mt-4">
          <p className="text-sm text-gray-500">Page {meta.current_page} of {meta.last_page} ({meta.total} orders)</p>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>Previous</Button>
            <Button size="sm" variant="outline" disabled={page >= meta.last_page} onClick={() => setPage(p => p + 1)}>Next</Button>
          </div>
        </div>
      )}

      {showForm  && <OrderForm onClose={() => setShowForm(false)} />}
      {editing   && <OrderForm order={editing} onClose={() => setEditing(null)} />}
      {viewing   && <OrderDetail order={viewing} onClose={() => setViewing(null)} />}
      {pinTarget && (
        <PinDialog
          correctPin={editPin}
          onSuccess={() => { setEditing(pinTarget); setPinTarget(null); }}
          onCancel={() => setPinTarget(null)}
        />
      )}

      {podPhoto && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4" onClick={() => setPodPhoto(null)}>
          <div className="bg-white rounded-xl overflow-hidden max-w-lg w-full" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-4 py-3 border-b">
              <h3 className="font-semibold text-sm">Proof of Delivery</h3>
              <button onClick={() => setPodPhoto(null)} className="p-1 rounded hover:bg-gray-100">
                <X className="h-4 w-4" />
              </button>
            </div>
            <img src={podPhoto.url} alt="Proof of delivery" className="w-full max-h-[70vh] object-contain bg-gray-100" />
            {podPhoto.notes && (
              <p className="px-4 py-3 text-sm text-gray-600 border-t">{podPhoto.notes}</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

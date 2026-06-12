'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ordersApi } from '@/lib/api';
import { DeliveryOrder } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { STATUS_COLORS, formatCurrency, formatDate, formatTime } from '@/lib/utils';
import { Plus, Search, Eye, Trash2, Truck } from 'lucide-react';
import OrderForm from './order-form';
import OrderDetail from './order-detail';
import AssignDriverDialog from './assign-driver-dialog';

export default function OrdersPage() {
  const qc = useQueryClient();
  const [search, setSearch]     = useState('');
  const [status, setStatus]     = useState('all');
  const [page, setPage]         = useState(1);
  const [showForm, setShowForm] = useState(false);
  const [viewing, setViewing]   = useState<DeliveryOrder | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [assigningIds, setAssigningIds] = useState<number[] | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['orders', page, search, status],
    queryFn: () => ordersApi.list({ page, per_page: 20, search, status: status === 'all' ? undefined : status }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => ordersApi.remove(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['orders'] }),
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
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-bold">Delivery Orders</h1>
          <p className="text-gray-500 text-sm">{meta?.total ?? 0} total orders</p>
        </div>
        <Button onClick={() => setShowForm(true)}><Plus className="h-4 w-4" /> New Order</Button>
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
        {selectedIds.size > 0 && (
          <Button variant="outline" onClick={() => setAssigningIds(Array.from(selectedIds))}>
            <Truck className="h-4 w-4" /> Assign {selectedIds.size} to Driver
          </Button>
        )}
      </div>

      {/* Mobile card list */}
      <div className="md:hidden space-y-3">
        {isLoading ? (
          <div className="text-center py-8 text-gray-400">Loading...</div>
        ) : orders.length === 0 ? (
          <div className="text-center py-8 text-gray-400">No orders found</div>
        ) : orders.map((o) => (
          <div key={o.id} className="bg-white rounded-lg border p-4">
            <div className="flex items-start justify-between gap-2 mb-2">
              <div className="flex items-start gap-2 min-w-0">
                <input
                  type="checkbox"
                  className="mt-1"
                  checked={selectedIds.has(o.id)}
                  onChange={() => toggleOne(o.id)}
                />
                <div className="min-w-0">
                  <p className="font-mono text-xs font-medium text-gray-500">{o.order_number}</p>
                  <p className="font-medium">{o.customer_name}</p>
                  <p className="text-xs text-gray-400">{o.customer_phone}</p>
                </div>
              </div>
              <span className={`shrink-0 text-xs px-2 py-1 rounded-full font-medium ${STATUS_COLORS[o.status]}`}>
                {o.status.replace('_', ' ')}
              </span>
            </div>
            <p className="text-sm text-gray-600 truncate mb-1">{o.product_name}</p>
            <div className="flex items-center justify-between text-sm mb-2">
              <span className="font-medium text-gray-700">{formatCurrency(o.order_value)}</span>
              <span className="text-xs text-gray-500">
                {o.requested_delivery_start
                  ? `${formatTime(o.requested_delivery_start)} - ${formatTime(o.requested_delivery_end)}`
                  : 'Anytime'}
              </span>
            </div>
            {o.driver && (
              <p className="text-xs text-blue-600 mb-2">Driver: {o.driver.driver_name}</p>
            )}
            <div className="flex justify-end gap-2">
              <Button size="sm" variant="ghost" onClick={() => setViewing(o)}>
                <Eye className="h-4 w-4" />
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setAssigningIds([o.id])}>
                <Truck className="h-4 w-4" />
              </Button>
              {o.status === 'pending' && (
                <Button
                  size="sm" variant="ghost"
                  className="text-red-500 hover:text-red-700"
                  onClick={() => { if (confirm('Cancel this order?')) deleteMutation.mutate(o.id); }}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="hidden md:block bg-white rounded-lg border overflow-hidden">
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
              <th className="text-left px-4 py-3 font-medium text-gray-600">Driver</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Status</th>
              <th className="text-right px-4 py-3 font-medium text-gray-600">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {isLoading ? (
              <tr><td colSpan={9} className="text-center py-8 text-gray-400">Loading...</td></tr>
            ) : orders.length === 0 ? (
              <tr><td colSpan={9} className="text-center py-8 text-gray-400">No orders found</td></tr>
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
                <td className="px-4 py-3 text-xs text-gray-500">
                  {o.requested_delivery_start
                    ? `${formatTime(o.requested_delivery_start)} - ${formatTime(o.requested_delivery_end)}`
                    : 'Anytime'}
                </td>
                <td className="px-4 py-3 text-xs text-gray-600">{o.driver?.driver_name ?? '-'}</td>
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
                    <Button size="sm" variant="ghost" title="Assign driver" onClick={() => setAssigningIds([o.id])}>
                      <Truck className="h-4 w-4" />
                    </Button>
                    {o.status === 'pending' && (
                      <Button
                        size="sm" variant="ghost"
                        className="text-red-500 hover:text-red-700"
                        onClick={() => { if (confirm('Cancel this order?')) deleteMutation.mutate(o.id); }}
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
      {viewing   && <OrderDetail order={viewing} onClose={() => setViewing(null)} />}
      {assigningIds && (
        <AssignDriverDialog
          orderIds={assigningIds}
          onClose={() => { setAssigningIds(null); setSelectedIds(new Set()); }}
        />
      )}
    </div>
  );
}

'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { kirimApi } from '@/lib/api';
import { useAuthStore } from '@/store/auth';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { getErrorMessage } from '@/lib/utils';
import {
  Clock, PackageOpen, LogOut, ChevronRight,
  Users, Truck, CheckCircle2, AlertCircle, Plus,
} from 'lucide-react';

const ALLOWED_ROLES = ['hontal_dispatcher', 'super_admin', 'developer'];

// ── Types ─────────────────────────────────────────────────────────────────────

interface BatchMerchant { merchant_id: number; company_name: string; order_count: number }
interface Batch {
  id: number;
  window_start: string;
  window_end: string;
  status: 'open' | 'closed' | 'dispatched';
  order_count: number;
  route_count: number;
  merchants: BatchMerchant[];
}

interface BatchOrder {
  id: number;
  order_number: string;
  merchant_name: string;
  customer_name: string;
  delivery_address: string;
  product_name: string;
  status: string;
  depot: { id: number; name: string } | null;
  assigned_to_route: number | null;
}

interface DriverOption { id: number; name: string; vehicle_type: string; vehicle_plate: string; status: string }

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmt(iso: string) {
  return new Date(iso).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
}
function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('id-ID', { day: '2-digit', month: 'short' });
}

function StatusBadge({ status }: { status: Batch['status'] }) {
  const map = {
    open:       'bg-green-100 text-green-700',
    closed:     'bg-yellow-100 text-yellow-700',
    dispatched: 'bg-blue-100 text-blue-700',
  };
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${map[status]}`}>
      {status}
    </span>
  );
}

// ── Route Builder Dialog ──────────────────────────────────────────────────────

function RouteBuilderDialog({
  batchId,
  selectedOrders,
  onClose,
}: {
  batchId: number;
  selectedOrders: BatchOrder[];
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const [driverId, setDriverId] = useState<number | null>(null);
  const [notes, setNotes] = useState('');

  const { data: driversRes } = useQuery({
    queryKey: ['kirim-drivers'],
    queryFn: kirimApi.dispatch.drivers,
  });
  const drivers: DriverOption[] = driversRes?.data?.data ?? [];

  // Preview stop sequence: pickups first (grouped by depot), then dropoffs
  const depotGroups = selectedOrders.reduce<Record<number, BatchOrder[]>>((acc, o) => {
    const key = o.depot?.id ?? 0;
    (acc[key] = acc[key] || []).push(o);
    return acc;
  }, {});

  const mutation = useMutation({
    mutationFn: () => kirimApi.dispatch.createRoute({
      batch_id:  batchId,
      driver_id: driverId!,
      order_ids: selectedOrders.map((o) => o.id),
      notes,
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['dispatch-batch-orders', batchId] });
      qc.invalidateQueries({ queryKey: ['dispatch-batches'] });
      onClose();
    },
  });

  return (
    <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
      <DialogHeader>
        <DialogTitle>Build Route — {selectedOrders.length} orders</DialogTitle>
      </DialogHeader>

      <div className="space-y-4">
        {/* Driver selector */}
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-gray-700">Assign to Driver</label>
          {drivers.length === 0 ? (
            <p className="text-sm text-gray-400">No available Kirim drivers found.</p>
          ) : (
            <div className="space-y-2">
              {drivers.map((d) => (
                <button
                  key={d.id}
                  onClick={() => setDriverId(d.id)}
                  className={`w-full text-left px-3 py-2.5 rounded-lg border text-sm transition-colors ${
                    driverId === d.id
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="font-medium">{d.name}</div>
                  <div className="text-xs text-gray-400">{d.vehicle_plate} · {d.vehicle_type} · {d.status}</div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Stop preview */}
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-gray-700">Stop Sequence</label>
          <div className="border border-gray-100 rounded-lg overflow-hidden text-sm">
            {/* Pickups */}
            {Object.entries(depotGroups).map(([depotId, orders], i) => (
              <div key={depotId} className="px-3 py-2.5 bg-orange-50 border-b border-gray-100">
                <div className="flex items-center gap-2">
                  <span className="bg-orange-500 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center font-bold shrink-0">
                    {i + 1}
                  </span>
                  <div>
                    <p className="font-medium text-orange-800">Pickup — {orders[0].depot?.name ?? 'Unknown depot'}</p>
                    <p className="text-xs text-orange-600">Collect {orders.length} order{orders.length > 1 ? 's' : ''}: {orders.map(o => o.order_number).join(', ')}</p>
                  </div>
                </div>
              </div>
            ))}
            {/* Dropoffs */}
            {selectedOrders.map((o, i) => (
              <div key={o.id} className="px-3 py-2.5 border-b border-gray-50 last:border-0">
                <div className="flex items-center gap-2">
                  <span className="bg-blue-600 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center font-bold shrink-0">
                    {Object.keys(depotGroups).length + i + 1}
                  </span>
                  <div className="min-w-0">
                    <p className="font-medium truncate">{o.customer_name}</p>
                    <p className="text-xs text-gray-400 truncate">{o.delivery_address}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Notes */}
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-gray-700">Route notes (optional)</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-1 focus:ring-blue-500"
            rows={2}
          />
        </div>

        {mutation.error && <p className="text-sm text-red-600">{getErrorMessage(mutation.error)}</p>}

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button
            disabled={!driverId || mutation.isPending}
            onClick={() => mutation.mutate()}
          >
            {mutation.isPending ? 'Creating…' : 'Create Route'}
          </Button>
        </div>
      </div>
    </DialogContent>
  );
}

// ── Top-up Dialog ─────────────────────────────────────────────────────────────

function TopupDialog({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient();
  const [merchantId, setMerchantId] = useState('');
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');

  const mutation = useMutation({
    mutationFn: () => kirimApi.dispatch.topup(
      parseInt(merchantId),
      parseInt(amount),
      note || 'Manual top-up',
    ),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['dispatch-batches'] }); onClose(); },
  });

  return (
    <DialogContent className="max-w-sm">
      <DialogHeader><DialogTitle>Record Credit Top-Up</DialogTitle></DialogHeader>
      <div className="space-y-3">
        <div className="space-y-1">
          <label className="text-sm font-medium">Merchant ID</label>
          <input value={merchantId} onChange={(e) => setMerchantId(e.target.value)}
            className="w-full border rounded-lg px-3 py-2 text-sm" placeholder="e.g. 5" />
        </div>
        <div className="space-y-1">
          <label className="text-sm font-medium">Amount (IDR)</label>
          <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)}
            className="w-full border rounded-lg px-3 py-2 text-sm" placeholder="e.g. 500000" />
        </div>
        <div className="space-y-1">
          <label className="text-sm font-medium">Note</label>
          <input value={note} onChange={(e) => setNote(e.target.value)}
            className="w-full border rounded-lg px-3 py-2 text-sm" placeholder="e.g. Transfer BCA 120825" />
        </div>
        {mutation.error && <p className="text-sm text-red-600">{getErrorMessage(mutation.error)}</p>}
        <div className="flex justify-end gap-2 pt-1">
          <Button variant="outline" size="sm" onClick={onClose}>Cancel</Button>
          <Button size="sm" disabled={!merchantId || !amount || mutation.isPending}
            onClick={() => mutation.mutate()}>
            {mutation.isPending ? 'Saving…' : 'Record Top-Up'}
          </Button>
        </div>
      </div>
    </DialogContent>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function KirimDispatchPage() {
  const router = useRouter();
  const { user, clearAuth } = useAuthStore();
  const qc = useQueryClient();

  const [selectedBatch, setSelectedBatch] = useState<Batch | null>(null);
  const [selectedOrderIds, setSelectedOrderIds] = useState<Set<number>>(new Set());
  const [routeBuilderOpen, setRouteBuilderOpen] = useState(false);
  const [topupOpen, setTopupOpen] = useState(false);
  const [closingBatch, setClosingBatch] = useState<Batch | null>(null);

  // Role guard
  if (!ALLOWED_ROLES.includes(user?.role ?? '')) {
    return (
      <div className="min-h-screen flex items-center justify-center text-gray-500 text-sm">
        Access restricted.
      </div>
    );
  }

  const { data: batchRes, isLoading: batchesLoading } = useQuery({
    queryKey: ['dispatch-batches'],
    queryFn: kirimApi.dispatch.batches,
    refetchInterval: 30_000,
  });
  const batches: Batch[] = batchRes?.data?.data ?? [];

  const { data: ordersRes } = useQuery({
    queryKey: ['dispatch-batch-orders', selectedBatch?.id],
    queryFn: () => kirimApi.dispatch.batchOrders(selectedBatch!.id),
    enabled: !!selectedBatch,
  });
  const batchOrders: BatchOrder[] = ordersRes?.data?.data ?? [];

  const closeMutation = useMutation({
    mutationFn: (batchId: number) => kirimApi.dispatch.closeBatch(batchId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['dispatch-batches'] });
      setClosingBatch(null);
    },
  });

  const handleLogout = () => { clearAuth(); router.push('/login'); };

  const toggleOrder = (order: BatchOrder) => {
    if (order.assigned_to_route) return;
    setSelectedOrderIds((prev) => {
      const next = new Set(prev);
      next.has(order.id) ? next.delete(order.id) : next.add(order.id);
      return next;
    });
  };

  const selectedOrders = batchOrders.filter((o) => selectedOrderIds.has(o.id));

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <div className="bg-slate-900 text-white px-4 py-3 flex items-center justify-between sticky top-0 z-20">
        <div>
          <h1 className="font-bold text-base">Hontal Kirim — Dispatch Console</h1>
          <p className="text-slate-400 text-xs">{user?.name} · {user?.role}</p>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" className="border-slate-600 text-slate-200 hover:bg-slate-800 text-xs"
            onClick={() => setTopupOpen(true)}>
            <Plus className="h-3.5 w-3.5 mr-1" /> Top-Up
          </Button>
          <button onClick={handleLogout} className="p-2 rounded hover:bg-slate-700">
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden" style={{ height: 'calc(100vh - 56px)' }}>
        {/* Left: batch list */}
        <aside className="w-72 bg-white border-r border-gray-200 flex flex-col overflow-hidden shrink-0">
          <div className="px-3 py-2.5 border-b border-gray-100">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Batches</p>
          </div>
          <div className="flex-1 overflow-y-auto">
            {batchesLoading && (
              <div className="p-4 text-sm text-gray-400 text-center">Loading…</div>
            )}
            {batches.map((batch) => (
              <button
                key={batch.id}
                onClick={() => { setSelectedBatch(batch); setSelectedOrderIds(new Set()); }}
                className={`w-full text-left px-3 py-3 border-b border-gray-50 transition-colors ${
                  selectedBatch?.id === batch.id ? 'bg-blue-50 border-l-2 border-l-blue-500' : 'hover:bg-gray-50'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium text-gray-800">
                    {fmtDate(batch.window_start)} {fmt(batch.window_start)}–{fmt(batch.window_end)}
                  </span>
                  <StatusBadge status={batch.status} />
                </div>
                <div className="flex items-center gap-3 text-xs text-gray-500">
                  <span className="flex items-center gap-1">
                    <PackageOpen className="h-3 w-3" />{batch.order_count} orders
                  </span>
                  <span className="flex items-center gap-1">
                    <Truck className="h-3 w-3" />{batch.route_count} routes
                  </span>
                </div>
                {batch.merchants.length > 0 && (
                  <div className="mt-1 flex flex-wrap gap-1">
                    {batch.merchants.map((m) => (
                      <span key={m.merchant_id} className="text-xs bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded">
                        {m.company_name} ({m.order_count})
                      </span>
                    ))}
                  </div>
                )}
              </button>
            ))}
            {!batchesLoading && batches.length === 0 && (
              <div className="p-6 text-center text-sm text-gray-400">
                <Clock className="h-8 w-8 mx-auto mb-2 opacity-40" />
                No batches yet. Orders appear here when the first Kirim order is placed.
              </div>
            )}
          </div>
        </aside>

        {/* Right: batch detail */}
        <main className="flex-1 flex flex-col overflow-hidden">
          {!selectedBatch ? (
            <div className="flex-1 flex items-center justify-center text-gray-400 text-sm">
              <div className="text-center">
                <ChevronRight className="h-10 w-10 mx-auto mb-2 opacity-30" />
                Select a batch to view orders
              </div>
            </div>
          ) : (
            <>
              {/* Batch toolbar */}
              <div className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between">
                <div>
                  <h2 className="font-semibold text-gray-900 text-sm">
                    Batch {fmt(selectedBatch.window_start)}–{fmt(selectedBatch.window_end)} — {fmtDate(selectedBatch.window_start)}
                  </h2>
                  <p className="text-xs text-gray-500">
                    {batchOrders.length} orders · {batchOrders.filter(o => o.assigned_to_route).length} assigned
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {selectedBatch.status === 'open' && (
                    <Button size="sm" variant="outline" className="text-yellow-700 border-yellow-300"
                      onClick={() => setClosingBatch(selectedBatch)}>
                      Close Batch Now
                    </Button>
                  )}
                  {selectedOrderIds.size > 0 && (
                    <Button size="sm" onClick={() => setRouteBuilderOpen(true)}>
                      <Truck className="h-3.5 w-3.5 mr-1" />
                      Build Route ({selectedOrderIds.size})
                    </Button>
                  )}
                </div>
              </div>

              {/* Selection hint */}
              {batchOrders.some(o => !o.assigned_to_route) && selectedOrderIds.size === 0 && (
                <div className="bg-blue-50 border-b border-blue-100 px-4 py-2 text-xs text-blue-600">
                  Click unassigned orders to select them for a route
                </div>
              )}

              {/* Order table */}
              <div className="flex-1 overflow-y-auto">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-gray-50 z-10">
                    <tr className="border-b border-gray-100">
                      <th className="w-8 px-3 py-2" />
                      <th className="text-left px-3 py-2 font-medium text-gray-600">Order</th>
                      <th className="text-left px-3 py-2 font-medium text-gray-600">Merchant</th>
                      <th className="text-left px-3 py-2 font-medium text-gray-600">Customer</th>
                      <th className="text-left px-3 py-2 font-medium text-gray-600">Depot</th>
                      <th className="text-left px-3 py-2 font-medium text-gray-600">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {batchOrders.map((order) => {
                      const isSelected = selectedOrderIds.has(order.id);
                      const isAssigned = !!order.assigned_to_route;
                      return (
                        <tr
                          key={order.id}
                          onClick={() => toggleOrder(order)}
                          className={`transition-colors ${isAssigned ? 'opacity-50 cursor-default' : 'cursor-pointer'} ${
                            isSelected ? 'bg-blue-50' : 'hover:bg-gray-50'
                          }`}
                        >
                          <td className="px-3 py-2.5">
                            {isAssigned ? (
                              <CheckCircle2 className="h-4 w-4 text-green-500" />
                            ) : (
                              <div className={`h-4 w-4 rounded border-2 transition-colors ${
                                isSelected ? 'bg-blue-600 border-blue-600' : 'border-gray-300'
                              }`} />
                            )}
                          </td>
                          <td className="px-3 py-2.5 font-mono text-xs text-gray-700">{order.order_number}</td>
                          <td className="px-3 py-2.5 text-gray-600">{order.merchant_name}</td>
                          <td className="px-3 py-2.5">
                            <p className="font-medium text-gray-900">{order.customer_name}</p>
                            <p className="text-xs text-gray-400 truncate max-w-[180px]">{order.delivery_address}</p>
                          </td>
                          <td className="px-3 py-2.5 text-gray-500 text-xs">{order.depot?.name ?? '—'}</td>
                          <td className="px-3 py-2.5">
                            {isAssigned ? (
                              <span className="text-xs text-green-600 font-medium">Assigned</span>
                            ) : (
                              <span className="text-xs text-amber-600 font-medium">{order.status}</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                    {batchOrders.length === 0 && (
                      <tr>
                        <td colSpan={6} className="text-center py-12 text-gray-400 text-sm">
                          <AlertCircle className="h-8 w-8 mx-auto mb-2 opacity-40" />
                          No orders in this batch yet
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </main>
      </div>

      {/* Dialogs */}
      <Dialog open={routeBuilderOpen} onOpenChange={(o) => { if (!o) setRouteBuilderOpen(false); }}>
        {routeBuilderOpen && selectedBatch && (
          <RouteBuilderDialog
            batchId={selectedBatch.id}
            selectedOrders={selectedOrders}
            onClose={() => { setRouteBuilderOpen(false); setSelectedOrderIds(new Set()); }}
          />
        )}
      </Dialog>

      <Dialog open={topupOpen} onOpenChange={(o) => { if (!o) setTopupOpen(false); }}>
        {topupOpen && <TopupDialog onClose={() => setTopupOpen(false)} />}
      </Dialog>

      <ConfirmDialog
        open={!!closingBatch}
        title="Close batch early?"
        description={`Batch ${closingBatch ? `${fmt(closingBatch.window_start)}–${fmt(closingBatch.window_end)}` : ''} will be closed immediately. No new orders can be added after this.`}
        confirmLabel="Close Batch"
        onConfirm={() => closingBatch && closeMutation.mutate(closingBatch.id)}
        onCancel={() => setClosingBatch(null)}
      />
    </div>
  );
}

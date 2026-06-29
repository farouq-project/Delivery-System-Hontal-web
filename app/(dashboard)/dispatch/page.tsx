'use client';

import { useEffect, useRef, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { routesApi, driversApi, ordersApi } from '@/lib/api';
import { Route, Driver, DeliveryOrder } from '@/types';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { STATUS_COLORS, VIP_COLORS, formatTime } from '@/lib/utils';
import { Loader2, Trash2, RotateCcw, X } from 'lucide-react';
import dynamic from 'next/dynamic';
import { getErrorMessage } from '@/lib/utils';
import { useAuthStore } from '@/store/auth';

const DispatchBoard = dynamic(() => import('./dispatch-board'), { ssr: false });

export default function DispatchPage() {
  const qc = useQueryClient();
  const authUser = useAuthStore((s) => s.user);
  const isOwner = ['merchant_owner', 'super_admin', 'developer'].includes(authUser?.role ?? '');
  const today = new Date().toISOString().split('T')[0];

  // Track whether we've already triggered auto-routing for the current pending count
  // to avoid re-triggering after the route generates and route_sequence values appear.
  const lastAutoRoutedUnsequenced = useRef(-1);

  const { data: routesData, isLoading: routesLoading } = useQuery({
    queryKey: ['routes', today],
    queryFn: () => routesApi.list({ date: today }),
  });

  const { data: driversData } = useQuery({
    queryKey: ['drivers', 'available'],
    queryFn: () => driversApi.list({ status: 'available' }),
  });

  const { data: allDriversData } = useQuery({
    queryKey: ['drivers'],
    queryFn: () => driversApi.list(),
  });

  const { data: ordersData } = useQuery({
    queryKey: ['orders', 'pending'],
    queryFn: () => ordersApi.list({ status: 'pending', per_page: 200 }),
    refetchInterval: 30_000,
  });

  const { data: allAssignedOrdersData } = useQuery({
    queryKey: ['orders', 'assigned', today],
    queryFn: () => ordersApi.list({ status: 'assigned', date: today, per_page: 200 }),
    refetchInterval: 30_000,
  });

  const routes: Route[] = routesData?.data?.data ?? [];
  const drivers: Driver[] = driversData?.data?.data ?? [];
  const allDrivers: Driver[] = allDriversData?.data?.data ?? [];
  const pendingOrders: DeliveryOrder[] = ordersData?.data?.data ?? [];
  const allAssignedOrders: DeliveryOrder[] = (allAssignedOrdersData?.data?.data ?? [])
    .filter((o: DeliveryOrder) => !['delivered', 'failed', 'cancelled'].includes(o.status));
  const todayRouteId = routes[0]?.id ?? null;

  const { data: fullRouteData } = useQuery({
    queryKey: ['routes', 'full', todayRouteId],
    queryFn: () => routesApi.get(todayRouteId!),
    enabled: !!todayRouteId,
  });

  const todayRoute: Route | null = fullRouteData?.data?.data ?? null;

  const allStopMap = new Map(
    (todayRoute?.assignments.flatMap((a) => a.stops) ?? [])
      .map((s) => [s.order?.id, s])
  );

  const sortedPendingOrders = [...pendingOrders].sort((a, b) => {
    const sa = allStopMap.get(a.id)?.total_score ?? -Infinity;
    const sb = allStopMap.get(b.id)?.total_score ?? -Infinity;
    return sb - sa;
  });

  const sortedAssignedOrders = [...allAssignedOrders].sort((a, b) => {
    const sa = allStopMap.get(a.id)?.total_score;
    const sb = allStopMap.get(b.id)?.total_score;
    if (sa !== undefined && sb !== undefined) return sb - sa;
    if (sa !== undefined) return -1;
    if (sb !== undefined) return 1;
    return (a.route_sequence ?? Infinity) - (b.route_sequence ?? Infinity);
  });

  // Auto-route whenever there are pending orders without route sequences
  const generateMutation = useMutation({
    mutationFn: () => routesApi.generate({ route_date: today }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['routes'] });
      qc.invalidateQueries({ queryKey: ['orders'] });
      qc.invalidateQueries({ queryKey: ['klotters'] });
    },
  });

  useEffect(() => {
    const unsequenced = pendingOrders.filter(o => !o.route_sequence).length;
    if (
      unsequenced > 0 &&
      !generateMutation.isPending &&
      lastAutoRoutedUnsequenced.current !== unsequenced
    ) {
      lastAutoRoutedUnsequenced.current = unsequenced;
      generateMutation.mutate();
    }
  }, [pendingOrders]);

  // Reset unassigned stops only (leaves assigned orders intact)
  const resetUnassignedMutation = useMutation({
    mutationFn: (id: number) => routesApi.resetUnassigned(id),
    onSuccess: () => {
      lastAutoRoutedUnsequenced.current = -1; // allow auto-re-route after reset
      qc.invalidateQueries({ queryKey: ['routes'] });
      qc.invalidateQueries({ queryKey: ['orders'] });
      qc.invalidateQueries({ queryKey: ['klotters'] });
    },
  });

  // Owner-only: delete route record without touching order statuses
  const deleteRouteMutation = useMutation({
    mutationFn: (id: number) => routesApi.remove(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['routes'] });
      qc.invalidateQueries({ queryKey: ['klotters'] });
    },
  });

  const assignOrderMutation = useMutation({
    mutationFn: (vars: { order_id: number; driver_id: number }) => routesApi.assignOrder(vars),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['routes'] });
      qc.invalidateQueries({ queryKey: ['orders'] });
    },
  });

  const unassignOrderMutation = useMutation({
    mutationFn: (id: number) => ordersApi.unassign(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['routes'] });
      qc.invalidateQueries({ queryKey: ['orders'] });
      qc.invalidateQueries({ queryKey: ['klotters'] });
    },
  });

  const bulkUnassignMutation = useMutation({
    mutationFn: (ids: number[]) => ordersApi.bulkUnassign(ids),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['routes'] });
      qc.invalidateQueries({ queryKey: ['orders'] });
      qc.invalidateQueries({ queryKey: ['klotters'] });
      setSelectedAssignedIds([]);
    },
  });

  const [selectedOrderIds, setSelectedOrderIds] = useState<number[]>([]);
  const [bulkDriverId, setBulkDriverId] = useState('');
  const [selectedAssignedIds, setSelectedAssignedIds] = useState<number[]>([]);

  const toggleAssignedSelected = (id: number) =>
    setSelectedAssignedIds((prev) => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);

  const assignOrdersMutation = useMutation({
    mutationFn: (vars: { order_ids: number[]; driver_id: number }) => routesApi.assignOrders(vars),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['routes'] });
      qc.invalidateQueries({ queryKey: ['orders'] });
      setSelectedOrderIds([]);
      setBulkDriverId('');
    },
  });

  const toggleOrderSelected = (orderId: number) =>
    setSelectedOrderIds((prev) =>
      prev.includes(orderId) ? prev.filter((id) => id !== orderId) : [...prev, orderId]
    );

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 px-4 sm:px-6 py-4 border-b bg-white">
        <div>
          <h1 className="text-xl font-bold">Dispatch Board</h1>
          <p className="text-sm text-gray-500">
            {pendingOrders.length} pending · {allAssignedOrders.length} assigned
            {generateMutation.isPending && (
              <span className="ml-2 inline-flex items-center gap-1 text-blue-500">
                <Loader2 className="h-3 w-3 animate-spin" /> Auto-routing...
              </span>
            )}
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          {todayRoute && (
            <>
              <Button
                variant="outline"
                className="text-orange-600 hover:text-orange-700 hover:bg-orange-50"
                onClick={() => {
                  if (confirm('Clear routing for unassigned orders? They will be re-routed automatically. Assigned orders are unaffected.')) {
                    resetUnassignedMutation.mutate(todayRoute.id);
                  }
                }}
                disabled={resetUnassignedMutation.isPending}
              >
                <RotateCcw className="h-4 w-4" />
                {resetUnassignedMutation.isPending ? 'Resetting...' : 'Reset Unassigned'}
              </Button>
              {isOwner && (
                <Button
                  variant="outline"
                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
                  onClick={() => {
                    if (confirm('Delete this dispatch permanently? Orders keep their current status.')) {
                      deleteRouteMutation.mutate(todayRoute.id);
                    }
                  }}
                  disabled={deleteRouteMutation.isPending}
                >
                  <Trash2 className="h-4 w-4" />
                  {deleteRouteMutation.isPending ? 'Deleting...' : 'Delete Dispatch'}
                </Button>
              )}
            </>
          )}
        </div>
      </div>

      {/* Unassigned orders */}
      {pendingOrders.length > 0 && (
        <div className="border-b bg-white px-4 sm:px-6 py-3">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
            <h2 className="text-sm font-semibold text-gray-700">Unassigned Orders ({pendingOrders.length})</h2>
            {selectedOrderIds.length > 0 && (
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-500">{selectedOrderIds.length} selected</span>
                <Select value={bulkDriverId} onValueChange={setBulkDriverId}>
                  <SelectTrigger className="h-8 text-xs w-40"><SelectValue placeholder="Assign driver..." /></SelectTrigger>
                  <SelectContent>
                    {allDrivers.map((d) => (
                      <SelectItem key={d.id} value={String(d.id)}>{d.driver_name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  size="sm"
                  disabled={!bulkDriverId || assignOrdersMutation.isPending}
                  onClick={() => {
                    const sortedIds = [...selectedOrderIds].sort((a, b) => {
                      const sa = allStopMap.get(a)?.total_score ?? -Infinity;
                      const sb = allStopMap.get(b)?.total_score ?? -Infinity;
                      return sb - sa;
                    });
                    assignOrdersMutation.mutate({ order_ids: sortedIds, driver_id: Number(bulkDriverId) });
                  }}
                >
                  {assignOrdersMutation.isPending ? 'Assigning...' : `Assign ${selectedOrderIds.length}`}
                </Button>
              </div>
            )}
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-gray-500 border-b">
                  <th className="py-1.5 pr-2 w-8">
                    <input
                      type="checkbox"
                      className="h-3.5 w-3.5"
                      checked={sortedPendingOrders.length > 0 && selectedOrderIds.length === sortedPendingOrders.length}
                      onChange={() =>
                        setSelectedOrderIds(
                          selectedOrderIds.length === sortedPendingOrders.length ? [] : sortedPendingOrders.map((o) => o.id)
                        )
                      }
                    />
                  </th>
                  <th className="py-1.5 pr-3">Order #</th>
                  <th className="py-1.5 pr-3">Customer</th>
                  <th className="py-1.5 pr-3">Order Time</th>
                  <th className="py-1.5 pr-3">VIP</th>
                  <th className="py-1.5 pr-3">Total Score</th>
                  <th className="py-1.5 pr-3">Dist</th>
                  <th className="py-1.5 pr-3">Wait</th>
                  <th className="py-1.5 pr-3">Window</th>
                  <th className="py-1.5 pr-3">VIP Sc</th>
                  <th className="py-1.5 pr-3">GPS</th>
                  <th className="py-1.5 pr-3">Assign Driver</th>
                </tr>
              </thead>
              <tbody>
                {sortedPendingOrders.map((o) => {
                  const stop = allStopMap.get(o.id);
                  const hasCoords = !!(o.delivery_latitude && o.delivery_longitude);
                  return (
                    <tr key={o.id} className="border-b last:border-0">
                      <td className="py-1.5 pr-2">
                        <input type="checkbox" className="h-3.5 w-3.5" checked={selectedOrderIds.includes(o.id)} onChange={() => toggleOrderSelected(o.id)} />
                      </td>
                      <td className="py-1.5 pr-3 font-mono text-xs text-gray-500 whitespace-nowrap">{o.order_number}</td>
                      <td className="py-1.5 pr-3 font-medium whitespace-nowrap">{o.customer_name}</td>
                      <td className="py-1.5 pr-3 text-gray-500 whitespace-nowrap">{formatTime(o.requested_delivery_start)}</td>
                      <td className="py-1.5 pr-3 whitespace-nowrap">
                        <span className={`text-xs px-1.5 py-0.5 rounded-full ${VIP_COLORS[o.customer?.vip_level ?? 'standard']}`}>
                          {(o.customer?.vip_level ?? 'standard').toUpperCase()}
                        </span>
                      </td>
                      <td className="py-1.5 pr-3 whitespace-nowrap font-semibold text-indigo-700">{stop ? Math.round(stop.total_score) : '—'}</td>
                      <td className="py-1.5 pr-3 whitespace-nowrap text-gray-500 text-xs">{stop ? Math.round(stop.distance_score) : '—'}</td>
                      <td className="py-1.5 pr-3 whitespace-nowrap text-gray-500 text-xs">{stop ? Math.round(stop.waiting_score) : '—'}</td>
                      <td className="py-1.5 pr-3 whitespace-nowrap text-gray-500 text-xs">{stop ? Math.round(stop.window_score) : '—'}</td>
                      <td className="py-1.5 pr-3 whitespace-nowrap text-gray-500 text-xs">{stop ? Math.round(stop.vip_score) : '—'}</td>
                      <td className="py-1.5 pr-3 whitespace-nowrap">
                        {hasCoords ? <span className="text-xs text-green-600">✓</span> : <span className="text-xs text-orange-500">⚠</span>}
                      </td>
                      <td className="py-1.5 pr-3">
                        <Select value="" onValueChange={(v) => assignOrderMutation.mutate({ order_id: o.id, driver_id: Number(v) })}>
                          <SelectTrigger className="h-8 text-xs w-40"><SelectValue placeholder="Assign driver..." /></SelectTrigger>
                          <SelectContent>
                            {allDrivers.map((d) => (
                              <SelectItem key={d.id} value={String(d.id)}>{d.driver_name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Assigned orders — today only */}
      {allAssignedOrders.length > 0 && (
        <div className="border-b bg-white px-4 sm:px-6 py-3">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
            <h2 className="text-sm font-semibold text-gray-700">Assigned Orders — Today ({allAssignedOrders.length})</h2>
            <div className="flex items-center gap-2">
              {selectedAssignedIds.length > 0 ? (
                <>
                  <span className="text-xs text-gray-500">{selectedAssignedIds.length} selected</span>
                  <Button
                    size="sm" variant="outline"
                    className="h-7 text-xs text-orange-600 hover:text-orange-700 hover:bg-orange-50"
                    disabled={bulkUnassignMutation.isPending}
                    onClick={() => {
                      if (confirm(`Unassign ${selectedAssignedIds.length} order(s)?`)) {
                        bulkUnassignMutation.mutate(selectedAssignedIds);
                      }
                    }}
                  >
                    <X className="h-3 w-3 mr-1" />
                    {bulkUnassignMutation.isPending ? 'Resetting...' : `Reset ${selectedAssignedIds.length} Selected`}
                  </Button>
                  <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setSelectedAssignedIds([])}>Clear</Button>
                </>
              ) : (
                <Button
                  size="sm" variant="outline"
                  className="h-7 text-xs text-orange-600 hover:text-orange-700 hover:bg-orange-50"
                  disabled={bulkUnassignMutation.isPending}
                  onClick={() => {
                    if (confirm(`Reset ALL ${allAssignedOrders.length} assigned orders to pending?`)) {
                      bulkUnassignMutation.mutate(allAssignedOrders.map(o => o.id));
                    }
                  }}
                >
                  <RotateCcw className="h-3 w-3 mr-1" /> Reset All Assigned
                </Button>
              )}
            </div>
          </div>
          <div className="overflow-x-auto max-h-72">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-gray-500 border-b">
                  <th className="py-1.5 pr-2 w-8">
                    <input
                      type="checkbox"
                      className="h-3.5 w-3.5"
                      checked={sortedAssignedOrders.length > 0 && selectedAssignedIds.length === sortedAssignedOrders.length}
                      onChange={() =>
                        setSelectedAssignedIds(
                          selectedAssignedIds.length === sortedAssignedOrders.length ? [] : sortedAssignedOrders.map(o => o.id)
                        )
                      }
                    />
                  </th>
                  <th className="py-1.5 pr-3">Order #</th>
                  <th className="py-1.5 pr-3">Customer</th>
                  <th className="py-1.5 pr-3">Order Time</th>
                  <th className="py-1.5 pr-3">VIP</th>
                  <th className="py-1.5 pr-3">Total Score</th>
                  <th className="py-1.5 pr-3">Driver</th>
                  <th className="py-1.5 pr-3">Status</th>
                  <th className="py-1.5 pr-3"></th>
                </tr>
              </thead>
              <tbody>
                {sortedAssignedOrders.map((o) => (
                  <tr key={o.id} className="border-b last:border-0">
                    <td className="py-1.5 pr-2">
                      <input
                        type="checkbox" className="h-3.5 w-3.5"
                        checked={selectedAssignedIds.includes(o.id)}
                        onChange={() => toggleAssignedSelected(o.id)}
                      />
                    </td>
                    <td className="py-1.5 pr-3 font-mono text-xs text-gray-500 whitespace-nowrap">{o.order_number}</td>
                    <td className="py-1.5 pr-3 font-medium whitespace-nowrap">{o.customer_name}</td>
                    <td className="py-1.5 pr-3 text-gray-500 whitespace-nowrap">{formatTime(o.requested_delivery_start)}</td>
                    <td className="py-1.5 pr-3 whitespace-nowrap">
                      <span className={`text-xs px-1.5 py-0.5 rounded-full ${VIP_COLORS[o.customer?.vip_level ?? 'standard']}`}>
                        {(o.customer?.vip_level ?? 'standard').toUpperCase()}
                      </span>
                    </td>
                    <td className="py-1.5 pr-3 whitespace-nowrap font-semibold text-indigo-700">
                      {allStopMap.get(o.id)?.total_score !== undefined
                        ? Math.round(allStopMap.get(o.id)!.total_score)
                        : (o.route_sequence !== null ? `~${o.route_sequence}` : '—')}
                    </td>
                    <td className="py-1.5 pr-3 whitespace-nowrap">{o.driver?.driver_name ?? '—'}</td>
                    <td className="py-1.5 pr-3 whitespace-nowrap">
                      <span className={`text-xs px-1.5 py-0.5 rounded-full ${STATUS_COLORS[o.status]}`}>
                        {o.status.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="py-1.5 pr-3 whitespace-nowrap">
                      <Button
                        size="sm" variant="outline"
                        className="h-7 text-xs text-red-600 hover:text-red-700 hover:bg-red-50"
                        disabled={unassignOrderMutation.isPending}
                        onClick={() => {
                          if (confirm(`Reset ${o.order_number}?`)) {
                            unassignOrderMutation.mutate(o.id);
                          }
                        }}
                      >
                        Reset
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Board */}
      {routesLoading ? (
        <div className="flex-1 flex items-center justify-center text-gray-400">
          <Loader2 className="h-8 w-8 animate-spin mr-2" /> Loading route...
        </div>
      ) : !todayRoute ? (
        <div className="flex-1 flex flex-col items-center justify-center text-gray-400">
          <Loader2 className="h-16 w-16 mb-4 opacity-20 animate-spin" />
          <p className="text-lg font-medium">
            {generateMutation.isPending ? 'Routing in progress...' : 'Waiting for orders...'}
          </p>
          <p className="text-sm">New orders are routed automatically when they arrive.</p>
        </div>
      ) : (
        <DispatchBoard route={todayRoute} />
      )}
    </div>
  );
}

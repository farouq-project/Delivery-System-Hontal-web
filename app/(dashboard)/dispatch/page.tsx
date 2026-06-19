'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { routesApi, driversApi, ordersApi } from '@/lib/api';
import { Route, Driver, DeliveryOrder } from '@/types';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { STATUS_COLORS, VIP_COLORS, formatTime } from '@/lib/utils';
import { Play, Lock, Unlock, RotateCcw, Loader2, Trash2, X } from 'lucide-react';
import dynamic from 'next/dynamic';
import { getErrorMessage } from '@/lib/utils';
import { useAuthStore } from '@/store/auth';

const DispatchBoard = dynamic(() => import('./dispatch-board'), { ssr: false });

export default function DispatchPage() {
  const qc = useQueryClient();
  const authUser = useAuthStore((s) => s.user);
  const isOwner = ['merchant_owner', 'super_admin', 'developer'].includes(authUser?.role ?? '');
  const today = new Date().toISOString().split('T')[0];
  const [generating, setGenerating] = useState(false);

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
  });

  // Fix #3 & #4: only today's assigned orders, refresh every 30s for live status
  const { data: allAssignedOrdersData, refetch: refetchAssigned } = useQuery({
    queryKey: ['orders', 'assigned', today],
    queryFn: () => ordersApi.list({ status: 'assigned', date: today, per_page: 200 }),
    refetchInterval: 30_000,
  });

  const routes: Route[] = routesData?.data?.data ?? [];
  const drivers: Driver[] = driversData?.data?.data ?? [];
  const allDrivers: Driver[] = allDriversData?.data?.data ?? [];
  const pendingOrders: DeliveryOrder[] = ordersData?.data?.data ?? [];
  // Fix #4: only non-delivered assigned orders (status:'assigned' already filters, but also
  // exclude anything that slipped through with delivered/failed status from the API)
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

  // Fix #1: invalidate klotters on generate/reset
  const generateMutation = useMutation({
    mutationFn: () => routesApi.generate({ route_date: today }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['routes'] });
      qc.invalidateQueries({ queryKey: ['orders'] });
      qc.invalidateQueries({ queryKey: ['klotters'] });
    },
  });

  const lockMutation   = useMutation({ mutationFn: (id: number) => routesApi.lock(id),   onSuccess: () => qc.invalidateQueries({ queryKey: ['routes'] }) });
  const unlockMutation = useMutation({ mutationFn: (id: number) => routesApi.unlock(id), onSuccess: () => qc.invalidateQueries({ queryKey: ['routes'] }) });

  const resetMutation = useMutation({
    mutationFn: (id: number) => routesApi.reset(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['routes'] });
      qc.invalidateQueries({ queryKey: ['orders'] });
      qc.invalidateQueries({ queryKey: ['klotters'] }); // Fix #1
    },
  });

  // Fix #2: owner-only delete (keeps order statuses, removes route record)
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

  // Fix #6: separate bulk unassign for assigned orders table
  const bulkUnassignMutation = useMutation({
    mutationFn: (ids: number[]) => ordersApi.bulkUnassign(ids),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['routes'] });
      qc.invalidateQueries({ queryKey: ['orders'] });
      qc.invalidateQueries({ queryKey: ['klotters'] });
      setSelectedAssignedIds([]);
    },
  });

  // Unassigned orders selection (existing)
  const [selectedOrderIds, setSelectedOrderIds] = useState<number[]>([]);
  const [bulkDriverId, setBulkDriverId] = useState('');

  // Fix #6: separate checkbox state for assigned orders
  const [selectedAssignedIds, setSelectedAssignedIds] = useState<number[]>([]);

  const toggleAssignedSelected = (id: number) =>
    setSelectedAssignedIds((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);

  const assignOrdersMutation = useMutation({
    mutationFn: (vars: { order_ids: number[]; driver_id: number }) => routesApi.assignOrders(vars),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['routes'] });
      qc.invalidateQueries({ queryKey: ['orders'] });
      setSelectedOrderIds([]);
      setBulkDriverId('');
    },
  });

  const toggleOrderSelected = (orderId: number) => {
    setSelectedOrderIds((prev) =>
      prev.includes(orderId) ? prev.filter((id) => id !== orderId) : [...prev, orderId]
    );
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 px-4 sm:px-6 py-4 border-b bg-white">
        <div>
          <h1 className="text-xl font-bold">Dispatch Board</h1>
          <p className="text-sm text-gray-500">
            {pendingOrders.length} pending orders · {drivers.length} available drivers
          </p>
        </div>
        <div className="flex flex-col items-end gap-2">
        <div className="flex flex-wrap gap-3">
          {todayRoute ? (
            <>
              {todayRoute.status !== 'completed' && todayRoute.status !== 'cancelled' && !todayRoute.locked_at ? (
                <Button variant="default" onClick={() => lockMutation.mutate(todayRoute.id)} disabled={lockMutation.isPending}>
                  <Lock className="h-4 w-4" />
                  {lockMutation.isPending ? 'Locking...' : 'Lock Route'}
                </Button>
              ) : (
                <Button variant="outline" onClick={() => unlockMutation.mutate(todayRoute.id)} disabled={unlockMutation.isPending}>
                  <Unlock className="h-4 w-4" /> Unlock
                </Button>
              )}
              <Button
                variant="outline"
                onClick={() => generateMutation.mutate()}
                disabled={generateMutation.isPending || pendingOrders.length === 0}
              >
                <RotateCcw className="h-4 w-4" />
                {generateMutation.isPending ? 'Regenerating...' : 'Regenerate'}
              </Button>
              {/* Reset: returns all orders to pending AND deletes route */}
              <Button
                variant="outline"
                className="text-orange-600 hover:text-orange-700 hover:bg-orange-50"
                onClick={() => {
                  if (confirm('Reset today\'s dispatch? Unassigned orders will return to pending. Assigned orders keep their driver.')) {
                    resetMutation.mutate(todayRoute.id);
                  }
                }}
                disabled={resetMutation.isPending}
              >
                <RotateCcw className="h-4 w-4" />
                {resetMutation.isPending ? 'Resetting...' : 'Reset Unassigned'}
              </Button>
              {/* Fix #2: owner-only delete (no order status change) */}
              {isOwner && (
                <Button
                  variant="outline"
                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
                  onClick={() => {
                    if (confirm('Delete this dispatch permanently? Orders will NOT be returned to pending — they keep their current status.')) {
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
          ) : (
            <Button
              onClick={() => generateMutation.mutate()}
              disabled={generateMutation.isPending || pendingOrders.length === 0}
              className="bg-green-600 hover:bg-green-700"
            >
              {generateMutation.isPending ? (
                <><Loader2 className="h-4 w-4 animate-spin" /> Generating...</>
              ) : (
                <><Play className="h-4 w-4" /> Generate Route</>
              )}
            </Button>
          )}
        </div>
        {generateMutation.isError && (
          <p className="text-xs text-red-500">{getErrorMessage(generateMutation.error) || 'Failed to generate route.'}</p>
        )}
        {resetMutation.isError && (
          <p className="text-xs text-red-500">{getErrorMessage(resetMutation.error) || 'Failed to reset dispatch.'}</p>
        )}
        {deleteRouteMutation.isError && (
          <p className="text-xs text-red-500">{getErrorMessage(deleteRouteMutation.error) || 'Failed to delete dispatch.'}</p>
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
          {(assignOrderMutation.isError || assignOrdersMutation.isError) && (
            <p className="text-xs text-red-500 mt-2">
              {getErrorMessage(assignOrderMutation.error || assignOrdersMutation.error) || 'Failed to assign order.'}
            </p>
          )}
        </div>
      )}

      {/* Fix #3-#6: Assigned orders — today only, not delivered, with separate bulk reset */}
      {allAssignedOrders.length > 0 && (
        <div className="border-b bg-white px-4 sm:px-6 py-3">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
            <h2 className="text-sm font-semibold text-gray-700">
              Assigned Orders — Today ({allAssignedOrders.length})
            </h2>
            {/* Fix #6: bulk reset for assigned orders, independent of unassigned reset */}
            <div className="flex items-center gap-2">
              {selectedAssignedIds.length > 0 ? (
                <>
                  <span className="text-xs text-gray-500">{selectedAssignedIds.length} selected</span>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 text-xs text-orange-600 hover:text-orange-700 hover:bg-orange-50"
                    disabled={bulkUnassignMutation.isPending}
                    onClick={() => {
                      if (confirm(`Unassign ${selectedAssignedIds.length} order(s) and return to pending?`)) {
                        bulkUnassignMutation.mutate(selectedAssignedIds);
                      }
                    }}
                  >
                    <X className="h-3 w-3 mr-1" />
                    {bulkUnassignMutation.isPending ? 'Resetting...' : `Reset ${selectedAssignedIds.length} Selected`}
                  </Button>
                  <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setSelectedAssignedIds([])}>
                    Clear
                  </Button>
                </>
              ) : (
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 text-xs text-orange-600 hover:text-orange-700 hover:bg-orange-50"
                  disabled={bulkUnassignMutation.isPending || allAssignedOrders.length === 0}
                  onClick={() => {
                    if (confirm(`Reset ALL ${allAssignedOrders.length} assigned order(s) to pending?`)) {
                      bulkUnassignMutation.mutate(allAssignedOrders.map((o) => o.id));
                    }
                  }}
                >
                  <RotateCcw className="h-3 w-3 mr-1" />
                  Reset All Assigned
                </Button>
              )}
            </div>
          </div>
          <div className="overflow-x-auto max-h-72">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-gray-500 border-b">
                  {/* Fix #6: separate checkboxes for assigned orders */}
                  <th className="py-1.5 pr-2 w-8">
                    <input
                      type="checkbox"
                      className="h-3.5 w-3.5"
                      checked={sortedAssignedOrders.length > 0 && selectedAssignedIds.length === sortedAssignedOrders.length}
                      onChange={() =>
                        setSelectedAssignedIds(
                          selectedAssignedIds.length === sortedAssignedOrders.length ? [] : sortedAssignedOrders.map((o) => o.id)
                        )
                      }
                    />
                  </th>
                  <th className="py-1.5 pr-3">Order #</th>
                  <th className="py-1.5 pr-3">Customer</th>
                  <th className="py-1.5 pr-3">Order Time</th>
                  <th className="py-1.5 pr-3">VIP Label</th>
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
                        type="checkbox"
                        className="h-3.5 w-3.5"
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
                          if (confirm(`Reset order ${o.order_number}? It will be unassigned and returned to pending.`)) {
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
          {(unassignOrderMutation.isError || bulkUnassignMutation.isError) && (
            <p className="text-xs text-red-500 mt-2">
              {getErrorMessage(unassignOrderMutation.error || bulkUnassignMutation.error) || 'Failed to reset order(s).'}
            </p>
          )}
        </div>
      )}

      {/* Board */}
      {routesLoading ? (
        <div className="flex-1 flex items-center justify-center text-gray-400">
          <Loader2 className="h-8 w-8 animate-spin mr-2" /> Loading route...
        </div>
      ) : !todayRoute ? (
        <div className="flex-1 flex flex-col items-center justify-center text-gray-400">
          <Play className="h-16 w-16 mb-4 opacity-30" />
          <p className="text-lg font-medium">No route for today</p>
          <p className="text-sm">Assign drivers to orders in the panel above, then click "Generate Route" to optimize stop order.</p>
        </div>
      ) : (
        <DispatchBoard route={todayRoute} />
      )}
    </div>
  );
}

'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { routesApi, driversApi, ordersApi } from '@/lib/api';
import { Route, Driver, DeliveryOrder } from '@/types';
import { Button } from '@/components/ui/button';
import { STATUS_COLORS, formatTime } from '@/lib/utils';
import { Play, Lock, Unlock, RotateCcw, Loader2 } from 'lucide-react';
import dynamic from 'next/dynamic';

const DispatchBoard = dynamic(() => import('./dispatch-board'), { ssr: false });

export default function DispatchPage() {
  const qc = useQueryClient();
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

  const { data: ordersData } = useQuery({
    queryKey: ['orders', 'pending'],
    queryFn: () => ordersApi.list({ status: 'pending', per_page: 200 }),
  });

  const routes: Route[] = routesData?.data?.data ?? [];
  const drivers: Driver[] = driversData?.data?.data ?? [];
  const pendingOrders: DeliveryOrder[] = ordersData?.data?.data ?? [];
  const todayRouteId = routes[0]?.id ?? null;

  const { data: fullRouteData } = useQuery({
    queryKey: ['routes', 'full', todayRouteId],
    queryFn: () => routesApi.get(todayRouteId!),
    enabled: !!todayRouteId,
  });

  const todayRoute: Route | null = fullRouteData?.data?.data ?? null;

  const generateMutation = useMutation({
    mutationFn: async () => {
      const allDriversRes = await driversApi.list();
      const allDrivers: Driver[] = allDriversRes.data.data;
      const allOrdersRes = await ordersApi.list({ status: 'pending', per_page: 200 });
      const allOrders: DeliveryOrder[] = allOrdersRes.data.data;
      return routesApi.generate({
        driver_ids: allDrivers.map((d) => d.id),
        order_ids: allOrders.map((o) => o.id),
        route_date: today,
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['routes'] });
      qc.invalidateQueries({ queryKey: ['orders'] });
    },
  });

  const lockMutation   = useMutation({ mutationFn: (id: number) => routesApi.lock(id),   onSuccess: () => qc.invalidateQueries({ queryKey: ['routes'] }) });
  const unlockMutation = useMutation({ mutationFn: (id: number) => routesApi.unlock(id), onSuccess: () => qc.invalidateQueries({ queryKey: ['routes'] }) });

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
        <div className="flex flex-wrap gap-3">
          {todayRoute ? (
            <>
              {todayRoute.status !== 'completed' && todayRoute.status !== 'cancelled' && !todayRoute.locked_at ? (
                <Button
                  variant="default"
                  onClick={() => lockMutation.mutate(todayRoute.id)}
                  disabled={lockMutation.isPending}
                >
                  <Lock className="h-4 w-4" />
                  {lockMutation.isPending ? 'Locking...' : 'Lock Route'}
                </Button>
              ) : (
                <Button
                  variant="outline"
                  onClick={() => unlockMutation.mutate(todayRoute.id)}
                  disabled={unlockMutation.isPending}
                >
                  <Unlock className="h-4 w-4" /> Unlock
                </Button>
              )}
              <Button
                variant="outline"
                onClick={() => generateMutation.mutate()}
                disabled={generateMutation.isPending}
              >
                <RotateCcw className="h-4 w-4" />
                {generateMutation.isPending ? 'Regenerating...' : 'Regenerate'}
              </Button>
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
      </div>

      {/* Board */}
      {routesLoading ? (
        <div className="flex-1 flex items-center justify-center text-gray-400">
          <Loader2 className="h-8 w-8 animate-spin mr-2" /> Loading route...
        </div>
      ) : !todayRoute ? (
        <div className="flex-1 flex flex-col items-center justify-center text-gray-400">
          <Play className="h-16 w-16 mb-4 opacity-30" />
          <p className="text-lg font-medium">No route for today</p>
          <p className="text-sm">Click "Generate Route" to assign {pendingOrders.length} pending orders to drivers.</p>
        </div>
      ) : (
        <DispatchBoard route={todayRoute} />
      )}
    </div>
  );
}

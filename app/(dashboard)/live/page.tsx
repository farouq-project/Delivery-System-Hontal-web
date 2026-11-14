'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { driversApi, routesApi, settingsApi } from '@/lib/api';
import { LiveDriver, Route, RouteStop } from '@/types';
import { getErrorMessage, localDateString } from '@/lib/utils';
import { useAuthStore } from '@/store/auth';

function isGpsStale(lastSeen: string | null): boolean {
  if (!lastSeen) return true;
  const diffMs = Date.now() - new Date(lastSeen).getTime();
  return diffMs > 3 * 60 * 1000; // stale after 3 minutes
}

const LiveMap = dynamic(() => import('./live-map'), { ssr: false, loading: () => (
  <div className="h-full bg-gray-100 flex items-center justify-center text-gray-400">Loading map...</div>
)});
const DriverArea = dynamic(() => import('./driver-area'), { ssr: false });

// Owner and admin (dispatcher) change stop numbers — same rule as the API
const REORDER_ROLES = ['merchant_owner', 'dispatcher', 'super_admin', 'developer'];

type RouteResponse = { data: { data: Route } };

export default function LivePage() {
  const qc = useQueryClient();
  const role = useAuthStore((s) => s.user?.role ?? '');
  const [selectedDriver, setSelectedDriver] = useState<number | null>(null);
  const [focusPoint, setFocusPoint] = useState<{ lat: number; lng: number; key: number } | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const { data: driversData } = useQuery({
    queryKey: ['drivers', 'live'],
    queryFn: () => driversApi.live(),
    refetchInterval: 15_000,
  });

  const today = localDateString();

  const { data: routesData } = useQuery({
    queryKey: ['routes', today],
    queryFn: () => routesApi.list({ date: today }),
  });

  const todayRouteId: number | null = routesData?.data?.data?.[0]?.id ?? null;
  const fullRouteKey = ['routes', 'full', todayRouteId];

  const { data: fullRouteData } = useQuery({
    queryKey: fullRouteKey,
    queryFn: () => routesApi.get(todayRouteId!),
    enabled: !!todayRouteId,
    refetchInterval: 30_000,
  });

  const { data: settingsData } = useQuery({
    queryKey: ['settings'],
    queryFn: () => settingsApi.get(),
    staleTime: 5 * 60 * 1000,
  });

  // The new stop order shows on the list and the map at once, and is rolled back if the save fails
  const reorder = useMutation({
    mutationFn: ({ assignmentId, stopIds }: { assignmentId: number; stopIds: number[] }) =>
      routesApi.reorderStops(todayRouteId!, assignmentId, stopIds),
    onMutate: async ({ assignmentId, stopIds }) => {
      await qc.cancelQueries({ queryKey: fullRouteKey });
      const previous = qc.getQueryData<RouteResponse>(fullRouteKey);
      if (previous) {
        const route = previous.data.data;
        const position = new Map(stopIds.map((id, i) => [id, i + 1]));
        qc.setQueryData<RouteResponse>(fullRouteKey, {
          ...previous,
          data: {
            ...previous.data,
            data: {
              ...route,
              assignments: route.assignments.map((a) => a.id !== assignmentId ? a : {
                ...a,
                stops: a.stops
                  .map((s) => ({ ...s, stop_sequence: position.get(s.id) ?? s.stop_sequence }))
                  .sort((x, y) => x.stop_sequence - y.stop_sequence),
              }),
            },
          },
        });
      }
      return { previous };
    },
    onError: (err, _vars, context) => {
      if (context?.previous) qc.setQueryData(fullRouteKey, context.previous);
      setNotice(getErrorMessage(err) ?? 'Could not save the new stop order.');
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ['routes'] }),
  });

  const drivers: LiveDriver[] = driversData?.data?.data ?? [];
  const todayRoute: Route | null = fullRouteData?.data?.data ?? null;
  const staleDriverIds = new Set(drivers.filter((d) => isGpsStale(d.last_seen)).map((d) => d.driver_id));

  const settings = settingsData?.data?.data;
  const depot = settings?.depot_latitude != null && settings?.depot_longitude != null
    ? { lat: Number(settings.depot_latitude), lng: Number(settings.depot_longitude), address: settings.depot_address }
    : null;

  const focusStop = (stop: RouteStop) => {
    if (stop.order?.delivery_latitude && stop.order.delivery_longitude) {
      setFocusPoint({ lat: stop.order.delivery_latitude, lng: stop.order.delivery_longitude, key: Date.now() });
    }
  };

  const canReorder = REORDER_ROLES.includes(role);

  return (
    <div className="flex flex-col min-h-full md:h-full">
      {/* Map — smaller, zoomed to the depot */}
      <div className="h-[40vh] md:h-[45%] shrink-0">
        <LiveMap
          drivers={drivers}
          selectedDriver={selectedDriver}
          route={todayRoute}
          staleDriverIds={staleDriverIds}
          depot={depot}
          focusPoint={focusPoint}
        />
      </div>

      {/* Driver area */}
      <div className="h-[75vh] md:h-auto md:flex-1 md:min-h-0 flex flex-col border-t bg-white">
        <div className="px-4 py-2 border-b flex flex-wrap items-baseline justify-between gap-x-4 gap-y-0.5">
          <h2 className="font-semibold">Drivers</h2>
          <p className="text-xs text-gray-400">
            {canReorder
              ? 'Drag a stop up or down to change its number — the map and the driver app follow. Tap a stop to find it on the map.'
              : 'Tap a driver or a stop to find it on the map.'}
            {' '}Refreshes every 15s.
          </p>
        </div>
        <div className="flex-1 min-h-0">
          <DriverArea
            drivers={drivers}
            route={todayRoute}
            staleDriverIds={staleDriverIds}
            selectedDriver={selectedDriver}
            onSelectDriver={setSelectedDriver}
            canReorder={canReorder}
            savingAssignmentId={reorder.isPending ? reorder.variables?.assignmentId ?? null : null}
            onReorder={(assignmentId, stopIds) => reorder.mutate({ assignmentId, stopIds })}
            onFocusStop={focusStop}
            notice={notice}
            onNotice={setNotice}
          />
        </div>
      </div>
    </div>
  );
}

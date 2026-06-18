'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { driversApi, routesApi } from '@/lib/api';
import { Route } from '@/types';
import { LiveDriver } from '@/types';
import { DRIVER_STATUS_COLORS, formatDate } from '@/lib/utils';
import { WifiOff } from 'lucide-react';

function isGpsStale(lastSeen: string | null): boolean {
  if (!lastSeen) return true;
  const diffMs = Date.now() - new Date(lastSeen).getTime();
  return diffMs > 3 * 60 * 1000; // stale after 3 minutes
}
import dynamic from 'next/dynamic';

const LiveMap = dynamic(() => import('./live-map'), { ssr: false, loading: () => (
  <div className="flex-1 bg-gray-100 flex items-center justify-center text-gray-400">Loading map...</div>
)});

export default function LivePage() {
  const [selectedDriver, setSelectedDriver] = useState<number | null>(null);

  const { data: driversData } = useQuery({
    queryKey: ['drivers', 'live'],
    queryFn: () => driversApi.live(),
    refetchInterval: 15_000,
  });

  const today = new Date().toISOString().split('T')[0];

  const { data: routesData } = useQuery({
    queryKey: ['routes', today],
    queryFn: () => routesApi.list({ date: today }),
  });

  const todayRouteId: number | null = routesData?.data?.data?.[0]?.id ?? null;

  const { data: fullRouteData } = useQuery({
    queryKey: ['routes', 'full', todayRouteId],
    queryFn: () => routesApi.get(todayRouteId!),
    enabled: !!todayRouteId,
    refetchInterval: 30_000,
  });

  const drivers: LiveDriver[] = driversData?.data?.data ?? [];
  const todayRoute: Route | null = fullRouteData?.data?.data ?? null;

  return (
    <div className="flex flex-col md:flex-row h-full">
      {/* Sidebar */}
      <div className="w-full md:w-72 max-h-56 md:max-h-none bg-white border-b md:border-b-0 md:border-r overflow-y-auto flex-shrink-0">
        <div className="p-4 border-b">
          <h2 className="font-semibold text-lg">Live Tracking</h2>
          <p className="text-xs text-gray-400">Auto-refreshes every 15s</p>
        </div>

        <div className="p-3">
          <p className="text-xs font-medium text-gray-500 mb-2 uppercase tracking-wide">Drivers</p>
          {drivers.map((d) => {
            const stale = isGpsStale(d.last_seen);
            return (
              <button
                key={d.driver_id}
                className={`w-full text-left p-3 rounded-lg mb-2 border transition-colors ${
                  selectedDriver === d.driver_id ? 'border-blue-500 bg-blue-50' : 'border-transparent hover:bg-gray-50'
                }`}
                onClick={() => setSelectedDriver(selectedDriver === d.driver_id ? null : d.driver_id)}
              >
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-medium text-sm">{d.driver_name}</p>
                    <p className="text-xs text-gray-400">{d.vehicle_plate ?? d.vehicle_type}</p>
                  </div>
                  <span className={`text-xs px-1.5 py-0.5 rounded-full ${DRIVER_STATUS_COLORS[d.status]}`}>
                    {d.status.replace('_', ' ')}
                  </span>
                </div>
                {stale ? (
                  <p className="text-xs text-orange-500 mt-1 flex items-center gap-1">
                    <WifiOff className="h-3 w-3" />
                    GPS off or unavailable
                    {d.last_seen && <span className="text-gray-400">· last seen {formatDate(d.last_seen, 'HH:mm')}</span>}
                  </p>
                ) : (
                  <p className="text-xs text-green-600 mt-1">
                    {d.lat?.toFixed(4)}, {d.lng?.toFixed(4)}
                    <span className="text-gray-400 ml-1">· {formatDate(d.last_seen, 'HH:mm')}</span>
                  </p>
                )}
                {todayRoute && (
                  <p className="text-xs text-gray-500 mt-1">
                    {d.delivered_stops ?? 0}/{d.today_stops ?? 0} stops done
                  </p>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Map */}
      <LiveMap
        drivers={drivers}
        selectedDriver={selectedDriver}
        route={todayRoute}
        staleDriverIds={new Set(drivers.filter(d => isGpsStale(d.last_seen)).map(d => d.driver_id))}
      />
    </div>
  );
}

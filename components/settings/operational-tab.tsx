'use client';

import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { merchantPlatformApi } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import type { OperationalSettings } from '@/types';

export function OperationalTab() {
  const qc = useQueryClient();
  const { data: res, isLoading } = useQuery({
    queryKey: ['platform', 'operational'],
    queryFn: merchantPlatformApi.getOperational,
  });

  const settings: OperationalSettings | undefined = res?.data?.data;

  const [form, setForm] = useState({
    depot_address: '', depot_latitude: '', depot_longitude: '',
    routing_algorithm: 'balanced', max_stops_per_driver: '20',
    klotter_size: '10', max_delivery_radius_km: '',
    auto_dispatch: false, auto_geocode_enabled: false,
  });
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (settings) {
      setForm({
        depot_address:          settings.depot_address        ?? '',
        depot_latitude:         settings.depot_latitude       != null ? String(settings.depot_latitude)       : '',
        depot_longitude:        settings.depot_longitude      != null ? String(settings.depot_longitude)      : '',
        routing_algorithm:      settings.routing_algorithm    ?? 'balanced',
        max_stops_per_driver:   String(settings.max_stops_per_driver ?? 20),
        klotter_size:           String(settings.klotter_size         ?? 10),
        max_delivery_radius_km: settings.max_delivery_radius_km != null ? String(settings.max_delivery_radius_km) : '',
        auto_dispatch:          settings.auto_dispatch        ?? false,
        auto_geocode_enabled:   settings.auto_geocode_enabled ?? false,
      });
    }
  }, [settings]);

  const mutation = useMutation({
    mutationFn: (data: Record<string, unknown>) => merchantPlatformApi.updateOperational(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['platform', 'operational'] });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    mutation.mutate({
      depot_address:          form.depot_address          || null,
      depot_latitude:         form.depot_latitude         ? Number(form.depot_latitude)         : null,
      depot_longitude:        form.depot_longitude        ? Number(form.depot_longitude)        : null,
      routing_algorithm:      form.routing_algorithm,
      max_stops_per_driver:   Number(form.max_stops_per_driver),
      klotter_size:           Number(form.klotter_size),
      max_delivery_radius_km: form.max_delivery_radius_km ? Number(form.max_delivery_radius_km) : null,
      auto_dispatch:          form.auto_dispatch,
      auto_geocode_enabled:   form.auto_geocode_enabled,
    });
  };

  if (isLoading) {
    return <div className="space-y-3">{Array.from({ length: 5 }).map((_, i) => (
      <div key={i} className="h-10 bg-gray-100 rounded animate-pulse" />
    ))}</div>;
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Depot / Warehouse</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1">
            <Label htmlFor="depot_address">Depot Address</Label>
            <Input id="depot_address" value={form.depot_address}
              onChange={e => setForm(f => ({ ...f, depot_address: e.target.value }))} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label htmlFor="depot_lat">Latitude</Label>
              <Input id="depot_lat" type="number" step="any" value={form.depot_latitude}
                onChange={e => setForm(f => ({ ...f, depot_latitude: e.target.value }))}
                placeholder="-6.123456" />
            </div>
            <div className="space-y-1">
              <Label htmlFor="depot_lng">Longitude</Label>
              <Input id="depot_lng" type="number" step="any" value={form.depot_longitude}
                onChange={e => setForm(f => ({ ...f, depot_longitude: e.target.value }))}
                placeholder="106.789012" />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Delivery Rules</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label htmlFor="max_stops">Max Stops per Driver</Label>
              <Input id="max_stops" type="number" min="1" max="200" value={form.max_stops_per_driver}
                onChange={e => setForm(f => ({ ...f, max_stops_per_driver: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="klotter_size">Klotter Size</Label>
              <Input id="klotter_size" type="number" min="1" max="200" value={form.klotter_size}
                onChange={e => setForm(f => ({ ...f, klotter_size: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="radius">Max Delivery Radius (km)</Label>
              <Input id="radius" type="number" min="1" max="500" value={form.max_delivery_radius_km}
                onChange={e => setForm(f => ({ ...f, max_delivery_radius_km: e.target.value }))}
                placeholder="No limit" />
            </div>
            <div className="space-y-1">
              <Label htmlFor="routing">Routing Algorithm</Label>
              <select
                id="routing"
                value={form.routing_algorithm}
                onChange={e => setForm(f => ({ ...f, routing_algorithm: e.target.value }))}
                className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm"
              >
                <option value="balanced">Balanced (default)</option>
                <option value="distance">Distance-first</option>
                <option value="vip">VIP-first</option>
              </select>
            </div>
          </div>

          <div className="space-y-2 pt-1">
            <label className="flex items-center gap-3 cursor-pointer">
              <input type="checkbox" checked={form.auto_dispatch}
                onChange={e => setForm(f => ({ ...f, auto_dispatch: e.target.checked }))}
                className="h-4 w-4 rounded border-gray-300" />
              <span className="text-sm">Enable auto-dispatch</span>
            </label>
            <label className="flex items-center gap-3 cursor-pointer">
              <input type="checkbox" checked={form.auto_geocode_enabled}
                onChange={e => setForm(f => ({ ...f, auto_geocode_enabled: e.target.checked }))}
                className="h-4 w-4 rounded border-gray-300" />
              <span className="text-sm">Auto-geocode customer addresses on import</span>
            </label>
          </div>
        </CardContent>
      </Card>

      <div className="flex items-center gap-3">
        <button type="submit" disabled={mutation.isPending}
          className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 disabled:opacity-50">
          {mutation.isPending ? 'Saving…' : 'Save Operational Settings'}
        </button>
        {saved && <span className="text-sm text-green-600">Saved successfully.</span>}
        {mutation.isError && <span className="text-sm text-red-600">Failed to save. Try again.</span>}
      </div>
    </form>
  );
}

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
    routing_algorithm: 'balanced', routing_mode: 'balanced',
    max_stops_per_driver: '20', klotter_size: '10', max_delivery_radius_km: '',
    auto_dispatch: false, auto_geocode_enabled: false,
    hide_driver_logout: false, order_edit_pin: '',
    batch_enforcement: true, two_opt_enabled: true, distance_matrix_cache_ttl: '',
  });
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (settings) {
      setForm({
        depot_address:             settings.depot_address           ?? '',
        depot_latitude:            settings.depot_latitude          != null ? String(settings.depot_latitude)          : '',
        depot_longitude:           settings.depot_longitude         != null ? String(settings.depot_longitude)         : '',
        routing_algorithm:         settings.routing_algorithm       ?? 'balanced',
        routing_mode:              settings.routing_mode            ?? 'balanced',
        max_stops_per_driver:      String(settings.max_stops_per_driver ?? 20),
        klotter_size:              String(settings.klotter_size         ?? 10),
        max_delivery_radius_km:    settings.max_delivery_radius_km  != null ? String(settings.max_delivery_radius_km) : '',
        auto_dispatch:             settings.auto_dispatch           ?? false,
        auto_geocode_enabled:      settings.auto_geocode_enabled    ?? false,
        hide_driver_logout:        settings.hide_driver_logout      ?? false,
        order_edit_pin:            settings.order_edit_pin          ?? '',
        batch_enforcement:         settings.batch_enforcement       ?? true,
        two_opt_enabled:           settings.two_opt_enabled         ?? true,
        distance_matrix_cache_ttl: settings.distance_matrix_cache_ttl != null ? String(settings.distance_matrix_cache_ttl) : '',
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
      depot_address:             form.depot_address          || null,
      depot_latitude:            form.depot_latitude         ? Number(form.depot_latitude)         : null,
      depot_longitude:           form.depot_longitude        ? Number(form.depot_longitude)        : null,
      routing_algorithm:         form.routing_algorithm,
      routing_mode:              form.routing_mode,
      max_stops_per_driver:      Number(form.max_stops_per_driver),
      klotter_size:              Number(form.klotter_size),
      max_delivery_radius_km:    form.max_delivery_radius_km ? Number(form.max_delivery_radius_km) : null,
      auto_dispatch:             form.auto_dispatch,
      auto_geocode_enabled:      form.auto_geocode_enabled,
      hide_driver_logout:        form.hide_driver_logout,
      order_edit_pin:            form.order_edit_pin || null,
      batch_enforcement:         form.batch_enforcement,
      two_opt_enabled:           form.two_opt_enabled,
      distance_matrix_cache_ttl: form.distance_matrix_cache_ttl ? Number(form.distance_matrix_cache_ttl) : null,
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

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Routing Engine V2</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label htmlFor="routing_mode">Routing Mode</Label>
              <select
                id="routing_mode"
                value={form.routing_mode}
                onChange={e => setForm(f => ({ ...f, routing_mode: e.target.value }))}
                className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm"
              >
                <option value="economy">Economy (Haversine only — fastest)</option>
                <option value="balanced">Balanced (Haversine + 2-opt)</option>
                <option value="optimized">Optimized (Haversine + 2-opt + Google ETAs)</option>
              </select>
              <p className="text-xs text-gray-400">Economy uses no Google API. Optimized uses Google only for final ETA refinement.</p>
            </div>
            <div className="space-y-1">
              <Label htmlFor="dm_cache_ttl">Distance Matrix Cache TTL (seconds)</Label>
              <Input
                id="dm_cache_ttl"
                type="number"
                min="60"
                max="86400"
                value={form.distance_matrix_cache_ttl}
                onChange={e => setForm(f => ({ ...f, distance_matrix_cache_ttl: e.target.value }))}
                placeholder="600 (default)"
              />
            </div>
          </div>
          <div className="space-y-2 pt-1">
            <label className="flex items-center gap-3 cursor-pointer">
              <input type="checkbox" checked={form.batch_enforcement}
                onChange={e => setForm(f => ({ ...f, batch_enforcement: e.target.checked }))}
                className="h-4 w-4 rounded border-gray-300" />
              <div>
                <span className="text-sm font-medium">Batch enforcement</span>
                <p className="text-xs text-gray-400">Separate orders into morning / afternoon / late batches before routing</p>
              </div>
            </label>
            <label className="flex items-center gap-3 cursor-pointer">
              <input type="checkbox" checked={form.two_opt_enabled}
                onChange={e => setForm(f => ({ ...f, two_opt_enabled: e.target.checked }))}
                className="h-4 w-4 rounded border-gray-300" />
              <div>
                <span className="text-sm font-medium">2-opt improvement</span>
                <p className="text-xs text-gray-400">Post-process with 2-opt to reduce total route distance (disable for faster generation with large order counts)</p>
              </div>
            </label>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Driver App & Security</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <label className="flex items-center gap-3 cursor-pointer">
            <input type="checkbox" checked={form.hide_driver_logout}
              onChange={e => setForm(f => ({ ...f, hide_driver_logout: e.target.checked }))}
              className="h-4 w-4 rounded border-gray-300" />
            <div>
              <span className="text-sm font-medium">Hide logout button in driver app</span>
              <p className="text-xs text-gray-400">When enabled, drivers cannot log out from their mobile app</p>
            </div>
          </label>
          <div className="space-y-1">
            <Label htmlFor="order_edit_pin">Order Edit PIN</Label>
            <Input
              id="order_edit_pin"
              type="text"
              inputMode="numeric"
              pattern="\d{3,6}"
              maxLength={6}
              value={form.order_edit_pin}
              onChange={e => setForm(f => ({ ...f, order_edit_pin: e.target.value.replace(/\D/g, '') }))}
              placeholder="3–6 digits (e.g. 1234)"
              className="w-40"
            />
            <p className="text-xs text-gray-400">Required to edit or delete delivered orders</p>
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

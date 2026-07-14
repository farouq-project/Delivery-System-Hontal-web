'use client';

import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { merchantPlatformApi } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import type { TrackingSettings } from '@/types';

function Toggle({ checked, onChange, label, sub }: {
  checked: boolean; onChange: (v: boolean) => void; label: string; sub?: string;
}) {
  return (
    <label className="flex items-start gap-3 cursor-pointer">
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative shrink-0 mt-0.5 w-10 h-5 rounded-full transition-colors ${checked ? 'bg-blue-600' : 'bg-gray-300'}`}
      >
        <span className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${checked ? 'translate-x-5' : 'translate-x-0'}`} />
      </button>
      <div>
        <p className="text-sm font-medium">{label}</p>
        {sub && <p className="text-xs text-gray-500">{sub}</p>}
      </div>
    </label>
  );
}

export function TrackingTab() {
  const qc = useQueryClient();
  const { data: res, isLoading } = useQuery({
    queryKey: ['platform', 'tracking'],
    queryFn: merchantPlatformApi.getTracking,
  });

  const tracking: TrackingSettings | undefined = res?.data?.data;

  const [form, setForm] = useState({
    tracking_expiry_hours: '48', public_tracking_enabled: true,
    show_estimated_arrival: true, driver_location_visible: true,
  });
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (tracking) {
      setForm({
        tracking_expiry_hours:   String(tracking.tracking_expiry_hours ?? 48),
        public_tracking_enabled: tracking.public_tracking_enabled ?? true,
        show_estimated_arrival:  tracking.show_estimated_arrival  ?? true,
        driver_location_visible: tracking.driver_location_visible ?? true,
      });
    }
  }, [tracking]);

  const mutation = useMutation({
    mutationFn: (data: Record<string, unknown>) => merchantPlatformApi.updateTracking(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['platform', 'tracking'] });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    mutation.mutate({
      tracking_expiry_hours:   Number(form.tracking_expiry_hours),
      public_tracking_enabled: form.public_tracking_enabled,
      show_estimated_arrival:  form.show_estimated_arrival,
      driver_location_visible: form.driver_location_visible,
    });
  };

  if (isLoading) return <div className="h-40 bg-gray-100 rounded animate-pulse" />;

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Customer Tracking Page</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="max-w-xs space-y-1">
            <Label htmlFor="expiry">Tracking Link Expiry (hours)</Label>
            <Input id="expiry" type="number" min="1" max="168" value={form.tracking_expiry_hours}
              onChange={e => setForm(f => ({ ...f, tracking_expiry_hours: e.target.value }))} />
            <p className="text-xs text-gray-400">Links expire after this many hours post-delivery.</p>
          </div>

          <div className="space-y-3 pt-1">
            <Toggle
              checked={form.public_tracking_enabled}
              onChange={v => setForm(f => ({ ...f, public_tracking_enabled: v }))}
              label="Enable public tracking page"
              sub="Customers can view delivery status without login"
            />
            <Toggle
              checked={form.show_estimated_arrival}
              onChange={v => setForm(f => ({ ...f, show_estimated_arrival: v }))}
              label="Show estimated arrival time"
            />
            <Toggle
              checked={form.driver_location_visible}
              onChange={v => setForm(f => ({ ...f, driver_location_visible: v }))}
              label="Show driver location on tracking page"
            />
          </div>
        </CardContent>
      </Card>

      <div className="flex items-center gap-3">
        <button type="submit" disabled={mutation.isPending}
          className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 disabled:opacity-50">
          {mutation.isPending ? 'Saving…' : 'Save Tracking Settings'}
        </button>
        {saved && <span className="text-sm text-green-600">Saved successfully.</span>}
        {mutation.isError && <span className="text-sm text-red-600">Failed to save. Try again.</span>}
      </div>
    </form>
  );
}

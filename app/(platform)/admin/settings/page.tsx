'use client';

import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminApi } from '@/lib/api';
import type { PlatformSettingRow } from '@/types';
import { Settings2, Save } from 'lucide-react';

interface SettingsMap {
  data: Record<string, PlatformSettingRow>;
}

const LABELS: Record<string, { label: string; hint: string }> = {
  default_trial_days:            { label: 'Default Trial Days',               hint: 'Days new merchants get on trial (1–365).' },
  default_tracking_expiry_hours: { label: 'Tracking Link Expiry (hours)',      hint: 'Hours before a tracking link expires after delivery (1–8760).' },
  google_api_warning_threshold:  { label: 'Google API Warning Threshold',      hint: 'Request count that triggers a warning banner (0 = disabled).' },
  maintenance_mode:              { label: 'Maintenance Mode',                  hint: 'When enabled, API returns 503 for all non-admin requests.' },
};

export default function PlatformSettingsPage() {
  const qc = useQueryClient();

  const { data, isLoading } = useQuery<SettingsMap>({
    queryKey: ['admin', 'platform-settings'],
    queryFn: () => adminApi.getPlatformSettings().then(r => r.data),
    staleTime: 60_000,
  });

  const [form, setForm] = useState<Record<string, string | number | boolean>>({});
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (data?.data) {
      const initial: Record<string, string | number | boolean> = {};
      Object.values(data.data).forEach(row => { initial[row.key] = row.value; });
      setForm(initial);
    }
  }, [data]);

  const mutation = useMutation({
    mutationFn: (settings: Record<string, unknown>) => adminApi.updatePlatformSettings(settings),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'platform-settings'] });
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    },
  });

  if (isLoading) {
    return (
      <div className="p-6 max-w-xl">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Platform Settings</h1>
        </div>
        <div className="space-y-4">
          {[0, 1, 2, 3].map(i => <div key={i} className="h-16 bg-white border border-gray-200 rounded-lg animate-pulse" />)}
        </div>
      </div>
    );
  }

  const rows = Object.values(data?.data ?? {});

  return (
    <div className="p-6 max-w-xl">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Platform Settings</h1>
          <p className="text-sm text-gray-500 mt-1">Global defaults and feature flags</p>
        </div>
        <Settings2 className="h-6 w-6 text-gray-300" />
      </div>

      <form
        onSubmit={e => {
          e.preventDefault();
          mutation.mutate(form as Record<string, unknown>);
        }}
        className="bg-white border border-gray-200 rounded-lg shadow-sm divide-y divide-gray-100"
      >
        {rows.map((row) => {
          const meta = LABELS[row.key] ?? { label: row.key, hint: '' };
          const current = form[row.key] ?? row.value;

          return (
            <div key={row.key} className="px-5 py-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-800">{meta.label}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{meta.hint}</p>
                </div>
                {row.type === 'boolean' ? (
                  <button
                    type="button"
                    onClick={() => setForm(f => ({ ...f, [row.key]: !f[row.key] }))}
                    className={`relative inline-flex h-6 w-11 shrink-0 rounded-full border-2 border-transparent transition-colors focus:outline-none ${current ? 'bg-emerald-500' : 'bg-gray-200'}`}
                    role="switch"
                    aria-checked={!!current}
                  >
                    <span className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow transform transition-transform ${current ? 'translate-x-5' : 'translate-x-0'}`} />
                  </button>
                ) : (
                  <input
                    type="number"
                    value={current as number}
                    onChange={e => setForm(f => ({ ...f, [row.key]: e.target.value }))}
                    min={1}
                    className="w-28 border border-gray-300 rounded-md px-3 py-1.5 text-sm text-right"
                  />
                )}
              </div>
            </div>
          );
        })}

        <div className="px-5 py-4 flex items-center justify-between">
          <p className={`text-sm transition-opacity ${saved ? 'text-emerald-600 opacity-100' : 'opacity-0'}`}>
            Settings saved.
          </p>
          <button
            type="submit"
            disabled={mutation.isPending}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-md text-sm font-medium hover:bg-emerald-700 disabled:opacity-50 transition-colors"
          >
            <Save className="h-4 w-4" />
            {mutation.isPending ? 'Saving…' : 'Save Settings'}
          </button>
        </div>
      </form>

      {mutation.isError && (
        <p className="mt-3 text-sm text-red-600">Failed to save. Please try again.</p>
      )}
    </div>
  );
}

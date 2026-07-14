'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { merchantPlatformApi } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Plus, Trash2, ChevronDown, ChevronRight } from 'lucide-react';
import type { MerchantBranch } from '@/types';

const DAYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];

function BranchForm({
  initial,
  onSave,
  onCancel,
  saving,
}: {
  initial?: Partial<MerchantBranch>;
  onSave: (data: Record<string, unknown>) => void;
  onCancel: () => void;
  saving: boolean;
}) {
  const [form, setForm] = useState({
    name:                 initial?.name                  ?? '',
    address:              initial?.address               ?? '',
    depot_latitude:       initial?.depot_latitude        != null ? String(initial.depot_latitude)  : '',
    depot_longitude:      initial?.depot_longitude       != null ? String(initial.depot_longitude) : '',
    working_hours_start:  initial?.working_hours_start   ?? '',
    working_hours_end:    initial?.working_hours_end     ?? '',
    working_days:         initial?.working_days          ?? [] as string[],
    max_stops_per_driver: initial?.max_stops_per_driver  != null ? String(initial.max_stops_per_driver) : '',
    is_active:            initial?.is_active             ?? true,
  });

  const toggleDay = (d: string) =>
    setForm(f => ({
      ...f,
      working_days: f.working_days.includes(d)
        ? f.working_days.filter(x => x !== d)
        : [...f.working_days, d],
    }));

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      name:                 form.name,
      address:              form.address || null,
      depot_latitude:       form.depot_latitude  ? Number(form.depot_latitude)  : null,
      depot_longitude:      form.depot_longitude ? Number(form.depot_longitude) : null,
      working_hours_start:  form.working_hours_start  || null,
      working_hours_end:    form.working_hours_end    || null,
      working_days:         form.working_days.length ? form.working_days : null,
      max_stops_per_driver: form.max_stops_per_driver ? Number(form.max_stops_per_driver) : null,
      is_active:            form.is_active,
    });
  };

  return (
    <form onSubmit={handleSave} className="space-y-3 p-4 bg-gray-50 rounded-md border">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label>Branch Name *</Label>
          <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required />
        </div>
        <div className="space-y-1">
          <Label>Address</Label>
          <Input value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} />
        </div>
        <div className="space-y-1">
          <Label>Depot Latitude</Label>
          <Input type="number" step="any" value={form.depot_latitude}
            onChange={e => setForm(f => ({ ...f, depot_latitude: e.target.value }))} placeholder="-6.123456" />
        </div>
        <div className="space-y-1">
          <Label>Depot Longitude</Label>
          <Input type="number" step="any" value={form.depot_longitude}
            onChange={e => setForm(f => ({ ...f, depot_longitude: e.target.value }))} placeholder="106.789012" />
        </div>
        <div className="space-y-1">
          <Label>Open</Label>
          <Input type="time" value={form.working_hours_start}
            onChange={e => setForm(f => ({ ...f, working_hours_start: e.target.value }))} />
        </div>
        <div className="space-y-1">
          <Label>Close</Label>
          <Input type="time" value={form.working_hours_end}
            onChange={e => setForm(f => ({ ...f, working_hours_end: e.target.value }))} />
        </div>
        <div className="space-y-1">
          <Label>Max Stops / Driver</Label>
          <Input type="number" min="1" max="200" value={form.max_stops_per_driver}
            onChange={e => setForm(f => ({ ...f, max_stops_per_driver: e.target.value }))}
            placeholder="Inherit from main" />
        </div>
      </div>

      <div className="space-y-1">
        <Label>Working Days (optional override)</Label>
        <div className="flex flex-wrap gap-1.5">
          {DAYS.map(d => (
            <button key={d} type="button" onClick={() => toggleDay(d)}
              className={`px-2.5 py-1 text-xs rounded border transition-colors ${
                form.working_days.includes(d)
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'bg-white text-gray-600 border-gray-300 hover:border-blue-400'
              }`}>
              {d.charAt(0).toUpperCase() + d.slice(1)}
            </button>
          ))}
        </div>
      </div>

      <label className="flex items-center gap-2 cursor-pointer text-sm">
        <input type="checkbox" checked={form.is_active}
          onChange={e => setForm(f => ({ ...f, is_active: e.target.checked }))}
          className="h-4 w-4 rounded border-gray-300" />
        Active branch
      </label>

      <div className="flex gap-2 pt-1">
        <button type="submit" disabled={saving || !form.name.trim()}
          className="px-3 py-1.5 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 disabled:opacity-50">
          {saving ? 'Saving…' : 'Save'}
        </button>
        <button type="button" onClick={onCancel}
          className="px-3 py-1.5 text-sm text-gray-600 rounded-md border hover:bg-gray-100">
          Cancel
        </button>
      </div>
    </form>
  );
}

export function BranchesTab() {
  const qc = useQueryClient();
  const { data: res, isLoading } = useQuery({
    queryKey: ['platform', 'branches'],
    queryFn: merchantPlatformApi.getBranches,
  });

  const branches: MerchantBranch[] = res?.data?.data ?? [];
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<number | null>(null);

  const storeMutation = useMutation({
    mutationFn: (data: Record<string, unknown>) => merchantPlatformApi.storeBranch(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['platform', 'branches'] });
      setAdding(false);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Record<string, unknown> }) =>
      merchantPlatformApi.updateBranch(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['platform', 'branches'] });
      setEditing(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => merchantPlatformApi.destroyBranch(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['platform', 'branches'] }),
  });

  if (isLoading) return <div className="h-40 bg-gray-100 rounded animate-pulse" />;

  return (
    <div className="space-y-3">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Branches / Depots</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {branches.length === 0 && !adding ? (
            <p className="text-sm text-gray-400 p-4">No branches added yet.</p>
          ) : (
            <div className="divide-y">
              {branches.map((b) => (
                <div key={b.id}>
                  <div className="flex items-center justify-between px-4 py-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium">{b.name}</p>
                        {!b.is_active && (
                          <span className="text-xs px-1.5 py-0.5 bg-gray-100 text-gray-500 rounded">Inactive</span>
                        )}
                      </div>
                      {b.address && <p className="text-xs text-gray-400 truncate">{b.address}</p>}
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button type="button" onClick={() => setEditing(editing === b.id ? null : b.id)}
                        className="p-1.5 text-gray-400 hover:text-blue-600 transition-colors">
                        {editing === b.id ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                      </button>
                      <button type="button" onClick={() => deleteMutation.mutate(b.id)}
                        disabled={deleteMutation.isPending}
                        className="p-1.5 text-gray-400 hover:text-red-600 transition-colors disabled:opacity-50">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                  {editing === b.id && (
                    <div className="px-4 pb-4">
                      <BranchForm
                        initial={b}
                        onSave={(data) => updateMutation.mutate({ id: b.id, data })}
                        onCancel={() => setEditing(null)}
                        saving={updateMutation.isPending}
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {adding && (
            <div className="px-4 pb-4">
              <BranchForm
                onSave={(data) => storeMutation.mutate(data)}
                onCancel={() => setAdding(false)}
                saving={storeMutation.isPending}
              />
            </div>
          )}
        </CardContent>
      </Card>

      {!adding && (
        <button type="button" onClick={() => setAdding(true)}
          className="flex items-center gap-2 px-4 py-2 text-sm text-blue-600 border border-blue-300 rounded-md hover:bg-blue-50 transition-colors">
          <Plus className="h-4 w-4" />
          Add Branch
        </button>
      )}
    </div>
  );
}

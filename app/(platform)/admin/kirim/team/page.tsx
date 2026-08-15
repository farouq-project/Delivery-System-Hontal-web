'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminApi } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { getErrorMessage } from '@/lib/utils';
import { Plus, User, Truck } from 'lucide-react';

interface Dispatcher {
  id: number;
  name: string;
  email: string;
  is_active: boolean;
  last_login_at: string | null;
  created_at: string;
}

interface MitraDriver {
  id: number;
  driver_name: string;
  phone: string;
  vehicle_type: string;
  vehicle_plate: string;
  status: string;
  is_active: boolean;
  user: { id: number; name: string; email: string; last_login_at: string | null } | null;
}

function fmtDate(s: string | null) {
  if (!s) return '—';
  return new Date(s).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
}

function CreateDispatcherDialog({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient();
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [error, setError] = useState('');

  const mutation = useMutation({
    mutationFn: () => adminApi.kirim.createDispatcher(form),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin', 'kirim', 'dispatchers'] }); onClose(); },
    onError: (e) => setError(getErrorMessage(e) ?? ''),
  });

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader><DialogTitle>Add Dispatcher</DialogTitle></DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label>Full Name</Label>
            <Input placeholder="Sari Dispatcher" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
          </div>
          <div className="space-y-1.5">
            <Label>Email</Label>
            <Input type="email" placeholder="sari@hontal.id" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} />
          </div>
          <div className="space-y-1.5">
            <Label>Password</Label>
            <Input type="password" placeholder="min 8 characters" value={form.password} onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))} />
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={onClose}>Cancel</Button>
            <Button onClick={() => mutation.mutate()} disabled={!form.name || !form.email || form.password.length < 8 || mutation.isPending}>
              {mutation.isPending ? 'Creating…' : 'Add Dispatcher'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function CreateDriverDialog({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient();
  const [form, setForm] = useState({ name: '', email: '', password: '', phone: '', vehicle_type: 'motorcycle', vehicle_plate: '' });
  const [error, setError] = useState('');

  const mutation = useMutation({
    mutationFn: () => adminApi.kirim.createDriver(form),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin', 'kirim', 'drivers'] }); onClose(); },
    onError: (e) => setError(getErrorMessage(e) ?? ''),
  });

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader><DialogTitle>Add Mitra Driver</DialogTitle></DialogHeader>
        <div className="space-y-4 py-2">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5 col-span-2">
              <Label>Full Name</Label>
              <Input placeholder="Andri Kurniawan" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Email (login)</Label>
              <Input type="email" placeholder="andri@hontal.id" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Password</Label>
              <Input type="password" placeholder="min 8 chars" value={form.password} onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Phone</Label>
              <Input placeholder="0812-xxxx-xxxx" value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Vehicle Plate</Label>
              <Input placeholder="D 1234 ABX" value={form.vehicle_plate} onChange={(e) => setForm((f) => ({ ...f, vehicle_plate: e.target.value }))} />
            </div>
            <div className="space-y-1.5 col-span-2">
              <Label>Vehicle Type</Label>
              <select
                value={form.vehicle_type}
                onChange={(e) => setForm((f) => ({ ...f, vehicle_type: e.target.value }))}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
              >
                {['motorcycle', 'car', 'pickup_truck', 'van', 'truck'].map((v) => (
                  <option key={v} value={v}>{v.replace('_', ' ')}</option>
                ))}
              </select>
            </div>
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={onClose}>Cancel</Button>
            <Button
              onClick={() => mutation.mutate()}
              disabled={!form.name || !form.email || form.password.length < 8 || !form.phone || !form.vehicle_plate || mutation.isPending}
            >
              {mutation.isPending ? 'Creating…' : 'Add Driver'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

const DRIVER_STATUS: Record<string, string> = {
  available:   'bg-green-100 text-green-700',
  delivering:  'bg-blue-100 text-blue-700',
  offline:     'bg-gray-100 text-gray-500',
};

export default function KirimTeamPage() {
  const [tab, setTab]                   = useState<'dispatchers' | 'drivers'>('dispatchers');
  const [addingDispatcher, setAddingD]  = useState(false);
  const [addingDriver, setAddingDr]     = useState(false);

  const { data: dispData, isLoading: dispLoading } = useQuery({
    queryKey: ['admin', 'kirim', 'dispatchers'],
    queryFn:  adminApi.kirim.dispatchers,
    staleTime: 30_000,
  });

  const { data: drvData, isLoading: drvLoading } = useQuery({
    queryKey: ['admin', 'kirim', 'drivers'],
    queryFn:  adminApi.kirim.mitraDrivers,
    staleTime: 30_000,
  });

  const dispatchers: Dispatcher[]  = dispData?.data?.data ?? [];
  const drivers: MitraDriver[]     = drvData?.data?.data ?? [];
  const availableDrivers           = drivers.filter((d) => d.status === 'available').length;

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Hontal Internal Team</h1>
          <p className="text-sm text-gray-500 mt-1">
            Dispatchers and mitra drivers managed by Hontal
            {drivers.length > 0 && ` · ${availableDrivers}/${drivers.length} drivers available`}
          </p>
        </div>
        {tab === 'dispatchers' ? (
          <Button onClick={() => setAddingD(true)}>
            <Plus className="h-4 w-4 mr-1" /> Add Dispatcher
          </Button>
        ) : (
          <Button onClick={() => setAddingDr(true)}>
            <Plus className="h-4 w-4 mr-1" /> Add Driver
          </Button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-5 border-b border-gray-200">
        {(['dispatchers', 'drivers'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
              tab === t ? 'border-orange-500 text-orange-600' : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {t === 'dispatchers' ? <User className="h-4 w-4" /> : <Truck className="h-4 w-4" />}
            {t === 'dispatchers' ? `Dispatchers (${dispatchers.length})` : `Mitra Drivers (${drivers.length})`}
          </button>
        ))}
      </div>

      {/* Dispatchers table */}
      {tab === 'dispatchers' && (
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden shadow-sm">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-bold text-gray-700">Name</th>
                <th className="px-4 py-3 text-left text-xs font-bold text-gray-700">Email</th>
                <th className="px-4 py-3 text-center text-xs font-bold text-gray-700">Status</th>
                <th className="px-4 py-3 text-left text-xs font-bold text-gray-700">Last Login</th>
                <th className="px-4 py-3 text-left text-xs font-bold text-gray-700">Created</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {dispLoading && <tr><td colSpan={5} className="px-4 py-6 text-center text-gray-400">Loading…</td></tr>}
              {!dispLoading && dispatchers.length === 0 && (
                <tr><td colSpan={5} className="px-4 py-6 text-center text-gray-400">No dispatchers yet. Add the first one.</td></tr>
              )}
              {dispatchers.map((d) => (
                <tr key={d.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900">{d.name}</td>
                  <td className="px-4 py-3 text-gray-600">{d.email}</td>
                  <td className="px-4 py-3 text-center">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${d.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                      {d.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-500 text-xs">{fmtDate(d.last_login_at)}</td>
                  <td className="px-4 py-3 text-gray-500 text-xs">{fmtDate(d.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Drivers table */}
      {tab === 'drivers' && (
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden shadow-sm">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-bold text-gray-700">Driver</th>
                <th className="px-4 py-3 text-left text-xs font-bold text-gray-700">Login Email</th>
                <th className="px-4 py-3 text-left text-xs font-bold text-gray-700">Vehicle</th>
                <th className="px-4 py-3 text-center text-xs font-bold text-gray-700">Status</th>
                <th className="px-4 py-3 text-left text-xs font-bold text-gray-700">Last Seen</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {drvLoading && <tr><td colSpan={5} className="px-4 py-6 text-center text-gray-400">Loading…</td></tr>}
              {!drvLoading && drivers.length === 0 && (
                <tr><td colSpan={5} className="px-4 py-6 text-center text-gray-400">No mitra drivers yet. Add the first one.</td></tr>
              )}
              {drivers.map((d) => (
                <tr key={d.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <p className="font-medium text-gray-900">{d.driver_name}</p>
                    <p className="text-xs text-gray-400">{d.phone}</p>
                  </td>
                  <td className="px-4 py-3 text-gray-600 text-xs">{d.user?.email ?? '—'}</td>
                  <td className="px-4 py-3">
                    <p className="text-gray-800">{d.vehicle_plate}</p>
                    <p className="text-xs text-gray-400">{d.vehicle_type.replace('_', ' ')}</p>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${DRIVER_STATUS[d.status] ?? 'bg-gray-100 text-gray-500'}`}>
                      {d.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-500 text-xs">{fmtDate(d.user?.last_login_at ?? null)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {addingDispatcher && <CreateDispatcherDialog onClose={() => setAddingD(false)} />}
      {addingDriver     && <CreateDriverDialog     onClose={() => setAddingDr(false)} />}
    </div>
  );
}

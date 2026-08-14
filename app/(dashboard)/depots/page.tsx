'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { kirimApi } from '@/lib/api';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { Plus, Edit, Archive, Link2, MapPin } from 'lucide-react';
import { getErrorMessage } from '@/lib/utils';

interface Depot {
  id: number;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  contact_name: string | null;
  contact_phone: string | null;
  is_active: boolean;
  sort_order: number;
}

const schema = z.object({
  name:          z.string().min(2, 'Name required'),
  address:       z.string().min(5, 'Address required'),
  latitude:      z.coerce.number().min(-90).max(90),
  longitude:     z.coerce.number().min(-180).max(180),
  contact_name:  z.string().optional(),
  contact_phone: z.string().optional(),
  sort_order:    z.coerce.number().int().min(0).optional(),
});
type FormData = z.infer<typeof schema>;

function DepotForm({ depot, onClose }: { depot: Depot | null; onClose: () => void }) {
  const qc = useQueryClient();
  const [mapsLink, setMapsLink] = useState('');
  const [extracting, setExtracting] = useState(false);
  const [mapsError, setMapsError] = useState('');

  const { register, handleSubmit, setValue, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: depot ? {
      name:          depot.name,
      address:       depot.address,
      latitude:      depot.latitude,
      longitude:     depot.longitude,
      contact_name:  depot.contact_name ?? '',
      contact_phone: depot.contact_phone ?? '',
      sort_order:    depot.sort_order,
    } : { sort_order: 0 },
  });

  const mutation = useMutation({
    mutationFn: (data: FormData) =>
      depot ? kirimApi.depots.update(depot.id, data) : kirimApi.depots.create(data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['depots'] }); onClose(); },
  });

  const extractFromMapsLink = async () => {
    if (!mapsLink.trim()) return;
    setExtracting(true);
    setMapsError('');
    try {
      const res = await kirimApi.resolveMapsLink(mapsLink.trim());
      const { latitude, longitude } = res.data.data;
      setValue('latitude', latitude);
      setValue('longitude', longitude);
    } catch {
      setMapsError('Could not extract coordinates from this link.');
    } finally {
      setExtracting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit((d) => mutation.mutate(d))} className="space-y-4">
      <div className="space-y-1.5">
        <Label>Depot Name</Label>
        <Input placeholder="e.g. Gudang Selatan" {...register('name')} />
        {errors.name && <p className="text-xs text-red-500">{errors.name.message}</p>}
      </div>

      <div className="space-y-1.5">
        <Label>Address</Label>
        <Input placeholder="Full pickup address" {...register('address')} />
        {errors.address && <p className="text-xs text-red-500">{errors.address.message}</p>}
      </div>

      {/* Maps link extractor */}
      <div className="space-y-1.5">
        <Label>Google Maps Link (optional — to auto-fill coordinates)</Label>
        <div className="flex gap-2">
          <Input
            value={mapsLink}
            onChange={(e) => setMapsLink(e.target.value)}
            placeholder="Paste Google Maps link…"
          />
          <Button type="button" variant="outline" onClick={extractFromMapsLink} disabled={extracting}>
            <Link2 className="h-4 w-4" />
          </Button>
        </div>
        {mapsError && <p className="text-xs text-red-500">{mapsError}</p>}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label>Latitude</Label>
          <Input type="number" step="any" placeholder="-6.917" {...register('latitude')} />
          {errors.latitude && <p className="text-xs text-red-500">{errors.latitude.message}</p>}
        </div>
        <div className="space-y-1.5">
          <Label>Longitude</Label>
          <Input type="number" step="any" placeholder="107.619" {...register('longitude')} />
          {errors.longitude && <p className="text-xs text-red-500">{errors.longitude.message}</p>}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label>Contact Name</Label>
          <Input placeholder="PIC name" {...register('contact_name')} />
        </div>
        <div className="space-y-1.5">
          <Label>Contact Phone</Label>
          <Input placeholder="08xx" {...register('contact_phone')} />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label>Sort Order</Label>
        <Input type="number" min={0} {...register('sort_order')} />
      </div>

      {mutation.error && (
        <p className="text-sm text-red-600">{getErrorMessage(mutation.error)}</p>
      )}

      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
        <Button type="submit" disabled={mutation.isPending}>
          {mutation.isPending ? 'Saving…' : depot ? 'Update Depot' : 'Add Depot'}
        </Button>
      </div>
    </form>
  );
}

export default function DepotsPage() {
  const qc = useQueryClient();
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Depot | null>(null);
  const [archiving, setArchiving] = useState<Depot | null>(null);
  const [showInactive, setShowInactive] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['depots', showInactive],
    queryFn: () => kirimApi.depots.list(showInactive),
  });

  const archiveMutation = useMutation({
    mutationFn: (id: number) => kirimApi.depots.archive(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['depots'] }); setArchiving(null); },
  });

  const depots: Depot[] = data?.data?.data ?? [];

  return (
    <div className="p-4 md:p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Depots</h1>
          <p className="text-sm text-gray-500 mt-0.5">Pickup points for Hontal Kirim orders</p>
        </div>
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
            <input
              type="checkbox"
              checked={showInactive}
              onChange={(e) => setShowInactive(e.target.checked)}
              className="rounded"
            />
            Show archived
          </label>
          <Button onClick={() => { setEditing(null); setFormOpen(true); }}>
            <Plus className="h-4 w-4 mr-1" /> Add Depot
          </Button>
        </div>
      </div>

      {isLoading && (
        <div className="text-sm text-gray-400 py-8 text-center">Loading depots…</div>
      )}

      {!isLoading && depots.length === 0 && (
        <div className="bg-white rounded-lg border border-gray-200 py-16 text-center">
          <MapPin className="h-10 w-10 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 font-medium">No depots yet</p>
          <p className="text-sm text-gray-400 mt-1">Add a pickup point to start creating Kirim orders.</p>
          <Button className="mt-4" onClick={() => { setEditing(null); setFormOpen(true); }}>
            <Plus className="h-4 w-4 mr-1" /> Add First Depot
          </Button>
        </div>
      )}

      {depots.length > 0 && (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="text-left px-4 py-3 font-medium text-gray-600">Name</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Address</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Coordinates</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Contact</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Status</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {depots.map((depot) => (
                <tr key={depot.id} className={`hover:bg-gray-50 ${!depot.is_active ? 'opacity-50' : ''}`}>
                  <td className="px-4 py-3 font-medium text-gray-900">{depot.name}</td>
                  <td className="px-4 py-3 text-gray-600 max-w-xs truncate">{depot.address}</td>
                  <td className="px-4 py-3 text-gray-500 font-mono text-xs">
                    {depot.latitude.toFixed(6)}, {depot.longitude.toFixed(6)}
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {depot.contact_name && <span>{depot.contact_name}</span>}
                    {depot.contact_phone && <span className="text-gray-400 ml-1 text-xs">({depot.contact_phone})</span>}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
                      depot.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                    }`}>
                      {depot.is_active ? 'Active' : 'Archived'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => { setEditing(depot); setFormOpen(true); }}
                        className="p-1.5 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-700"
                        title="Edit"
                      >
                        <Edit className="h-4 w-4" />
                      </button>
                      {depot.is_active && (
                        <button
                          onClick={() => setArchiving(depot)}
                          className="p-1.5 rounded hover:bg-gray-100 text-gray-400 hover:text-red-500"
                          title="Archive"
                        >
                          <Archive className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Dialog open={formOpen} onOpenChange={(o) => { if (!o) setFormOpen(false); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit Depot' : 'Add Depot'}</DialogTitle>
          </DialogHeader>
          <DepotForm depot={editing} onClose={() => setFormOpen(false)} />
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!archiving}
        title="Archive depot?"
        description={`"${archiving?.name}" will be hidden from new orders. Existing orders are unaffected.`}
        confirmLabel="Archive"
        onConfirm={() => archiving && archiveMutation.mutate(archiving.id)}
        onCancel={() => setArchiving(null)}
      />
    </div>
  );
}

'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { driversApi } from '@/lib/api';
import { Driver } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { DRIVER_STATUS_COLORS } from '@/lib/utils';
import { Plus, Edit, Trash2, Signal } from 'lucide-react';
import DriverForm from './driver-form';
import { formatDate } from '@/lib/utils';

export default function DriversPage() {
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Driver | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['drivers'],
    queryFn: () => driversApi.list(),
    refetchInterval: 30_000,
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => driversApi.remove(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['drivers'] }),
  });

  const drivers: Driver[] = data?.data?.data ?? [];

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Drivers</h1>
          <p className="text-gray-500 text-sm">{drivers.length} drivers registered</p>
        </div>
        <Button onClick={() => { setEditing(null); setShowForm(true); }}>
          <Plus className="h-4 w-4" /> Add Driver
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {isLoading ? (
          <div className="col-span-3 text-center py-8 text-gray-400">Loading...</div>
        ) : drivers.map((d) => (
          <div key={d.id} className="bg-white rounded-lg border p-4 hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between mb-3">
              <div>
                <h3 className="font-semibold">{d.driver_name}</h3>
                <p className="text-sm text-gray-500">{d.phone}</p>
              </div>
              <span className={`text-xs px-2 py-1 rounded-full font-medium ${DRIVER_STATUS_COLORS[d.status]}`}>
                {d.status.replace('_', ' ')}
              </span>
            </div>
            <div className="space-y-1 text-sm text-gray-600 mb-3">
              <p>{d.vehicle_type} · <span className="font-medium">{d.vehicle_plate}</span></p>
              {d.current_lat && (
                <p className="flex items-center gap-1 text-xs text-green-600">
                  <Signal className="h-3 w-3" />
                  {d.current_lat.toFixed(4)}, {d.current_lng?.toFixed(4)}
                  <span className="text-gray-400">· {formatDate(d.last_seen, 'HH:mm')}</span>
                </p>
              )}
            </div>
            <div className="flex justify-end gap-2">
              <Button size="sm" variant="ghost" onClick={() => { setEditing(d); setShowForm(true); }}>
                <Edit className="h-4 w-4" />
              </Button>
              <Button
                size="sm" variant="ghost"
                className="text-red-500 hover:text-red-700"
                onClick={() => { if (confirm('Delete this driver?')) deleteMutation.mutate(d.id); }}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        ))}
      </div>

      {showForm && (
        <DriverForm driver={editing} onClose={() => { setShowForm(false); setEditing(null); }} />
      )}
    </div>
  );
}

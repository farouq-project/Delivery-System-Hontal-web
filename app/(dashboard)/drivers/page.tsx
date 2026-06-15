'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { driversApi } from '@/lib/api';
import { Driver } from '@/types';
import { Button } from '@/components/ui/button';
import { DRIVER_STATUS_COLORS } from '@/lib/utils';
import { Edit, Trash2, Signal } from 'lucide-react';
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
    <div className="p-4 md:p-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-bold">Drivers</h1>
          <p className="text-gray-500 text-sm">{drivers.length} drivers registered</p>
        </div>
      </div>
      <p className="text-xs text-gray-400 mb-4">
        Drivers are added by creating a user with the &quot;Driver&quot; role on the Users page. Edit here to set their vehicle details.
      </p>

      <div className="bg-white rounded-lg border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Name</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Phone</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Vehicle</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Status</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Location</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {isLoading ? (
                <tr><td colSpan={6} className="text-center py-8 text-gray-400">Loading...</td></tr>
              ) : drivers.length === 0 ? (
                <tr><td colSpan={6} className="text-center py-8 text-gray-400">No drivers yet</td></tr>
              ) : drivers.map((d) => (
                <tr key={d.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium whitespace-nowrap">{d.driver_name}</td>
                  <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{d.phone}</td>
                  <td className="px-4 py-3 text-gray-600 whitespace-nowrap">
                    {d.vehicle_type} · <span className="font-medium">{d.vehicle_plate}</span>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <span className={`text-xs px-2 py-1 rounded-full font-medium ${DRIVER_STATUS_COLORS[d.status]}`}>
                      {d.status.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    {d.current_lat ? (
                      <span className="flex items-center gap-1 text-xs text-green-600">
                        <Signal className="h-3 w-3" />
                        {d.current_lat.toFixed(4)}, {d.current_lng?.toFixed(4)}
                        <span className="text-gray-400">· {formatDate(d.last_seen, 'HH:mm')}</span>
                      </span>
                    ) : (
                      <span className="text-xs text-gray-400">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
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
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showForm && editing && (
        <DriverForm driver={editing} onClose={() => { setShowForm(false); setEditing(null); }} />
      )}
    </div>
  );
}

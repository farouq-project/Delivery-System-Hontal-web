'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { merchantPlatformApi } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Trash2 } from 'lucide-react';

interface Cluster {
  id: number;
  name: string;
}

export function ClustersTab() {
  const qc = useQueryClient();
  const { data: res, isLoading } = useQuery({
    queryKey: ['platform', 'clusters'],
    queryFn: merchantPlatformApi.getClusters,
  });

  const clusters: Cluster[] = res?.data?.data ?? [];
  const [name, setName] = useState('');

  const storeMutation = useMutation({
    mutationFn: (n: string) => merchantPlatformApi.storeCluster(n),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['platform', 'clusters'] });
      setName('');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => merchantPlatformApi.destroyCluster(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['platform', 'clusters'] }),
  });

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    storeMutation.mutate(name.trim());
  };

  if (isLoading) return <div className="h-40 bg-gray-100 rounded animate-pulse" />;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Delivery Clusters</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {clusters.length === 0 ? (
            <p className="text-sm text-gray-400 p-4">No clusters added yet.</p>
          ) : (
            <div className="divide-y">
              {clusters.map((c) => (
                <div key={c.id} className="flex items-center justify-between px-4 py-3">
                  <p className="text-sm font-medium">{c.name}</p>
                  <button
                    type="button"
                    onClick={() => deleteMutation.mutate(c.id)}
                    disabled={deleteMutation.isPending}
                    className="p-1.5 text-gray-400 hover:text-red-600 transition-colors disabled:opacity-50"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <form onSubmit={handleAdd} className="flex gap-2">
        <input
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder="Cluster name (e.g. Bandung Barat)"
          className="flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm"
        />
        <button type="submit" disabled={storeMutation.isPending || !name.trim()}
          className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 disabled:opacity-50">
          {storeMutation.isPending ? 'Adding…' : 'Add'}
        </button>
      </form>
    </div>
  );
}

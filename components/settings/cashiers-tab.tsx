'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { merchantPlatformApi } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Trash2 } from 'lucide-react';

interface Cashier {
  id: number;
  name: string;
  is_active: boolean;
}

export function CashiersTab() {
  const qc = useQueryClient();
  const { data: res, isLoading } = useQuery({
    queryKey: ['platform', 'cashiers'],
    queryFn: merchantPlatformApi.getCashiers,
  });

  const cashiers: Cashier[] = res?.data?.data ?? [];
  const [name, setName] = useState('');

  const storeMutation = useMutation({
    mutationFn: (n: string) => merchantPlatformApi.storeCashier(n),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['platform', 'cashiers'] });
      setName('');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => merchantPlatformApi.destroyCashier(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['platform', 'cashiers'] }),
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
          <CardTitle className="text-base">Cashier Names</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {cashiers.length === 0 ? (
            <p className="text-sm text-gray-400 p-4">No cashiers added yet.</p>
          ) : (
            <div className="divide-y">
              {cashiers.map((c) => (
                <div key={c.id} className="flex items-center justify-between px-4 py-3">
                  <div>
                    <p className="text-sm font-medium">{c.name}</p>
                    <p className="text-xs text-gray-400">{c.is_active ? 'Active' : 'Inactive'}</p>
                  </div>
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
          placeholder="Cashier name"
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

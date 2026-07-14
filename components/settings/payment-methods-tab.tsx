'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { merchantPlatformApi } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ChevronUp, ChevronDown } from 'lucide-react';
import type { MerchantPaymentMethod } from '@/types';

export function PaymentMethodsTab() {
  const qc = useQueryClient();
  const { data: res, isLoading } = useQuery({
    queryKey: ['platform', 'payment-methods'],
    queryFn: merchantPlatformApi.getPaymentMethods,
  });

  const methods: MerchantPaymentMethod[] = res?.data?.data ?? [];

  const [newLabel, setNewLabel] = useState('');
  const [newKey, setNewKey] = useState('');
  const [addError, setAddError] = useState('');

  const toggleMutation = useMutation({
    mutationFn: ({ id, is_enabled }: { id: number; is_enabled: boolean }) =>
      merchantPlatformApi.updatePaymentMethod(id, { is_enabled }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['platform', 'payment-methods'] }),
  });

  const defaultMutation = useMutation({
    mutationFn: (id: number) => merchantPlatformApi.updatePaymentMethod(id, { is_default: true }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['platform', 'payment-methods'] }),
  });

  const reorderMutation = useMutation({
    mutationFn: (ids: number[]) => merchantPlatformApi.reorderPaymentMethods(ids),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['platform', 'payment-methods'] }),
  });

  const storeMutation = useMutation({
    mutationFn: (data: Record<string, unknown>) => merchantPlatformApi.storePaymentMethod(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['platform', 'payment-methods'] });
      setNewLabel('');
      setNewKey('');
      setAddError('');
    },
    onError: () => setAddError('Failed to add. The key might already exist.'),
  });

  const move = (index: number, direction: -1 | 1) => {
    const ids = methods.map(m => m.id);
    const swap = index + direction;
    if (swap < 0 || swap >= ids.length) return;
    [ids[index], ids[swap]] = [ids[swap], ids[index]];
    reorderMutation.mutate(ids);
  };

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    setAddError('');
    const key = newKey.trim().toLowerCase().replace(/\s+/g, '_');
    if (!key || !newLabel.trim()) { setAddError('Key and label are required.'); return; }
    storeMutation.mutate({ method_key: key, label: newLabel.trim(), is_enabled: true });
  };

  if (isLoading) return <div className="h-40 bg-gray-100 rounded animate-pulse" />;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Payment Methods</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y">
            {methods.map((m, i) => (
              <div key={m.id} className="flex items-center gap-3 px-4 py-3">
                <div className="flex flex-col gap-0.5">
                  <button type="button" onClick={() => move(i, -1)} disabled={i === 0 || reorderMutation.isPending}
                    className="p-0.5 rounded hover:bg-gray-100 disabled:opacity-30">
                    <ChevronUp className="h-3 w-3" />
                  </button>
                  <button type="button" onClick={() => move(i, 1)} disabled={i === methods.length - 1 || reorderMutation.isPending}
                    className="p-0.5 rounded hover:bg-gray-100 disabled:opacity-30">
                    <ChevronDown className="h-3 w-3" />
                  </button>
                </div>

                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">{m.label}</p>
                  <p className="text-xs text-gray-400">{m.method_key}</p>
                </div>

                {m.is_default && (
                  <span className="text-xs px-2 py-0.5 bg-blue-50 text-blue-700 rounded-full">Default</span>
                )}
                {!m.is_default && m.is_enabled && (
                  <button type="button" onClick={() => defaultMutation.mutate(m.id)}
                    className="text-xs text-gray-400 hover:text-blue-600 transition-colors">
                    Set default
                  </button>
                )}

                <label className="flex items-center gap-2 cursor-pointer shrink-0">
                  <button
                    type="button"
                    role="switch"
                    aria-checked={m.is_enabled}
                    onClick={() => toggleMutation.mutate({ id: m.id, is_enabled: !m.is_enabled })}
                    disabled={toggleMutation.isPending}
                    className={`relative w-9 h-5 rounded-full transition-colors disabled:opacity-50 ${m.is_enabled ? 'bg-blue-600' : 'bg-gray-300'}`}
                  >
                    <span className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${m.is_enabled ? 'translate-x-4' : 'translate-x-0'}`} />
                  </button>
                </label>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Add Custom Method</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleAdd} className="flex flex-col sm:flex-row gap-2">
            <input
              value={newKey}
              onChange={e => setNewKey(e.target.value)}
              placeholder="method_key (e.g. cod)"
              className="flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm"
            />
            <input
              value={newLabel}
              onChange={e => setNewLabel(e.target.value)}
              placeholder="Display label (e.g. Cash on Delivery)"
              className="flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm"
            />
            <button type="submit" disabled={storeMutation.isPending}
              className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 disabled:opacity-50 whitespace-nowrap">
              {storeMutation.isPending ? 'Adding…' : 'Add'}
            </button>
          </form>
          {addError && <p className="text-xs text-red-600 mt-2">{addError}</p>}
        </CardContent>
      </Card>
    </div>
  );
}

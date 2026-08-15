'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminApi } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { getErrorMessage } from '@/lib/utils';
import { Plus, CreditCard, AlertTriangle } from 'lucide-react';

interface KirimMerchant {
  id: number;
  company_name: string;
  email: string;
  owner: { name: string; email: string } | null;
  kirim_enabled: boolean;
  credit_balance_idr: number;
  deliveries_remaining: number;
  is_blocked: boolean;
  total_kirim_orders: number;
  pending_kirim_orders: number;
  created_at: string;
}

function fmtIdr(n: number) {
  return 'Rp ' + new Intl.NumberFormat('id-ID').format(n);
}

function TopupDialog({ merchant, onClose }: { merchant: KirimMerchant; onClose: () => void }) {
  const qc = useQueryClient();
  const [amount, setAmount] = useState('');
  const [note, setNote]     = useState('');
  const [error, setError]   = useState('');

  const mutation = useMutation({
    mutationFn: () => adminApi.kirim.topup(merchant.id, parseInt(amount) * 1000, note || undefined),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin', 'kirim', 'merchants'] }); onClose(); },
    onError: (e) => setError(getErrorMessage(e) ?? ''),
  });

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Top Up Credit — {merchant.company_name}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="bg-gray-50 rounded-lg px-4 py-3 text-sm">
            <p className="text-gray-500">Current balance</p>
            <p className={`text-lg font-bold ${merchant.is_blocked ? 'text-red-600' : 'text-gray-900'}`}>
              {fmtIdr(merchant.credit_balance_idr)}
            </p>
            <p className="text-xs text-gray-400">{merchant.deliveries_remaining} deliveries remaining</p>
          </div>
          <div className="space-y-1.5">
            <Label>Amount (in thousands IDR)</Label>
            <div className="flex items-center gap-2">
              <Input
                type="number"
                min={10}
                placeholder="e.g. 500 = Rp 500.000"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
              <span className="text-sm text-gray-500 shrink-0">× 1.000</span>
            </div>
            {amount && (
              <p className="text-xs text-blue-600">= {fmtIdr(parseInt(amount || '0') * 1000)} ({Math.floor(parseInt(amount || '0') * 1000 / 10000)} deliveries)</p>
            )}
          </div>
          <div className="space-y-1.5">
            <Label>Note (optional)</Label>
            <Input placeholder="e.g. Monthly top-up" value={note} onChange={(e) => setNote(e.target.value)} />
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={onClose}>Cancel</Button>
            <Button onClick={() => mutation.mutate()} disabled={!amount || parseInt(amount) < 10 || mutation.isPending}>
              {mutation.isPending ? 'Processing…' : `Top Up ${amount ? fmtIdr(parseInt(amount) * 1000) : ''}`}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function CreateMerchantDialog({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient();
  const [form, setForm] = useState({ company_name: '', email: '', address: '', owner_name: '', owner_email: '', initial_topup_idr: '' });
  const [error, setError] = useState('');

  const mutation = useMutation({
    mutationFn: () => adminApi.kirim.createMerchant({
      ...form,
      initial_topup_idr: form.initial_topup_idr ? parseInt(form.initial_topup_idr) * 1000 : 0,
    }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin', 'kirim', 'merchants'] }); onClose(); },
    onError: (e) => setError(getErrorMessage(e) ?? ''),
  });

  const field = (label: string, key: keyof typeof form, placeholder?: string, type = 'text') => (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <Input type={type} placeholder={placeholder} value={form[key]} onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))} />
    </div>
  );

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Kirim Merchant</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          {field('Company Name', 'company_name', 'TelurKu')}
          {field('Company Email', 'email', 'admin@telurku.com', 'email')}
          {field('Address', 'address', 'Jl. Pasteur No. 1, Bandung')}
          <hr />
          {field('Owner Name', 'owner_name', 'Budi Santoso')}
          {field('Owner Email', 'owner_email', 'owner@telurku.com', 'email')}
          <div className="space-y-1.5">
            <Label>Initial Credit Top-up (thousands IDR, optional)</Label>
            <div className="flex items-center gap-2">
              <Input type="number" min={0} placeholder="500" value={form.initial_topup_idr} onChange={(e) => setForm((f) => ({ ...f, initial_topup_idr: e.target.value }))} />
              <span className="text-sm text-gray-500 shrink-0">× 1.000</span>
            </div>
            {form.initial_topup_idr && (
              <p className="text-xs text-blue-600">= {fmtIdr(parseInt(form.initial_topup_idr || '0') * 1000)}</p>
            )}
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={onClose}>Cancel</Button>
            <Button onClick={() => mutation.mutate()} disabled={!form.company_name || !form.owner_email || mutation.isPending}>
              {mutation.isPending ? 'Creating…' : 'Create Merchant'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function KirimMerchantsPage() {
  const [toppingUp, setToppingUp]   = useState<KirimMerchant | null>(null);
  const [creating, setCreating]     = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'kirim', 'merchants'],
    queryFn:  adminApi.kirim.merchants,
    staleTime: 30_000,
  });

  const merchants: KirimMerchant[] = data?.data?.data ?? [];

  const totalBalance   = merchants.reduce((s, m) => s + m.credit_balance_idr, 0);
  const blockedCount   = merchants.filter((m) => m.is_blocked).length;
  const pendingTotal   = merchants.reduce((s, m) => s + m.pending_kirim_orders, 0);

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Kirim Merchants</h1>
          <p className="text-sm text-gray-500 mt-1">Businesses using Hontal's pooled delivery network</p>
        </div>
        <Button onClick={() => setCreating(true)}>
          <Plus className="h-4 w-4 mr-1" /> Add Merchant
        </Button>
      </div>

      {/* Summary strip */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
          <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Total Merchants</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{merchants.length}</p>
          {blockedCount > 0 && <p className="text-xs text-red-600 mt-0.5">{blockedCount} blocked</p>}
        </div>
        <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
          <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Total Credit Float</p>
          <p className="text-2xl font-bold text-blue-700 mt-1">{fmtIdr(totalBalance)}</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
          <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Pending Orders</p>
          <p className="text-2xl font-bold text-orange-600 mt-1">{pendingTotal}</p>
          <p className="text-xs text-gray-400 mt-0.5">across all merchants</p>
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-bold text-gray-700">Merchant</th>
                <th className="px-4 py-3 text-left text-xs font-bold text-gray-700">Owner</th>
                <th className="px-4 py-3 text-right text-xs font-bold text-gray-700">Credit Balance</th>
                <th className="px-4 py-3 text-right text-xs font-bold text-gray-700">Deliveries Left</th>
                <th className="px-4 py-3 text-right text-xs font-bold text-gray-700">Orders (Total)</th>
                <th className="px-4 py-3 text-right text-xs font-bold text-gray-700">Pending</th>
                <th className="px-4 py-3 text-center text-xs font-bold text-gray-700">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {isLoading && (
                <tr><td colSpan={7} className="px-4 py-6 text-center text-gray-400">Loading…</td></tr>
              )}
              {!isLoading && merchants.length === 0 && (
                <tr><td colSpan={7} className="px-4 py-6 text-center text-gray-400">No Kirim merchants yet. Add one to get started.</td></tr>
              )}
              {merchants.map((m) => (
                <tr key={m.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      {m.is_blocked && <AlertTriangle className="h-4 w-4 text-red-500 shrink-0" />}
                      <div>
                        <p className="font-semibold text-gray-900">{m.company_name}</p>
                        <p className="text-xs text-gray-500">{m.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    {m.owner ? (
                      <>
                        <p className="text-gray-800">{m.owner.name}</p>
                        <p className="text-xs text-gray-500">{m.owner.email}</p>
                      </>
                    ) : <span className="text-gray-400">—</span>}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <p className={`font-semibold ${m.is_blocked ? 'text-red-600' : m.credit_balance_idr < 100000 ? 'text-amber-600' : 'text-gray-900'}`}>
                      {fmtIdr(m.credit_balance_idr)}
                    </p>
                    {m.is_blocked && <span className="text-xs text-red-500">BLOCKED</span>}
                  </td>
                  <td className="px-4 py-3 text-right text-gray-700">{m.deliveries_remaining}</td>
                  <td className="px-4 py-3 text-right text-gray-700">{m.total_kirim_orders.toLocaleString()}</td>
                  <td className="px-4 py-3 text-right">
                    <span className={m.pending_kirim_orders > 0 ? 'text-orange-600 font-semibold' : 'text-gray-400'}>
                      {m.pending_kirim_orders}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <button
                      onClick={() => setToppingUp(m)}
                      className="inline-flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg border border-blue-200 text-blue-700 hover:bg-blue-50 transition-colors"
                    >
                      <CreditCard className="h-3.5 w-3.5" />
                      Top Up
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {toppingUp && <TopupDialog merchant={toppingUp} onClose={() => setToppingUp(null)} />}
      {creating  && <CreateMerchantDialog onClose={() => setCreating(false)} />}
    </div>
  );
}

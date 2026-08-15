'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminApi } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { getErrorMessage } from '@/lib/utils';
import { ArrowLeft, CreditCard, ArrowRightLeft, AlertTriangle, TrendingUp, TrendingDown } from 'lucide-react';

interface KirimMerchantDetail {
  id: number;
  company_name: string;
  email: string;
  phone: string | null;
  address: string | null;
  slug: string;
  merchant_type: string;
  created_at: string;
  owner: { id: number; name: string; email: string } | null;
  kirim_enabled: boolean;
  credit: {
    balance_idr: number;
    deliveries_remaining: number;
    low_balance_threshold_idr: number;
    is_blocked: boolean;
  };
  order_stats: {
    total: number;
    pending: number;
    delivered: number;
    today: number;
  };
  recent_transactions: Array<{
    id: number;
    type: 'topup' | 'charge' | 'refund';
    amount_idr: number;
    note: string | null;
    created_at: string;
  }>;
}

function fmtIdr(n: number) {
  return 'Rp ' + new Intl.NumberFormat('id-ID').format(Math.abs(n));
}

function fmtDate(s: string) {
  return new Date(s).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
}

function fmtDatetime(s: string) {
  return new Date(s).toLocaleString('id-ID', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
}

function TopupDialog({ merchantId, companyName, currentBalance, onClose }: {
  merchantId: number;
  companyName: string;
  currentBalance: number;
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [error, setError] = useState('');

  const mutation = useMutation({
    mutationFn: () => adminApi.kirim.topup(merchantId, parseInt(amount) * 1000, note || undefined),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'kirim', 'merchant', merchantId] });
      qc.invalidateQueries({ queryKey: ['admin', 'kirim', 'merchants'] });
      onClose();
    },
    onError: (e) => setError(getErrorMessage(e) ?? ''),
  });

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Top Up Credit — {companyName}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="bg-gray-50 rounded-lg px-4 py-3 text-sm">
            <p className="text-gray-500">Current balance</p>
            <p className="text-lg font-bold text-gray-900">{fmtIdr(currentBalance)}</p>
            <p className="text-xs text-gray-400">{Math.floor(currentBalance / 10000)} deliveries remaining</p>
          </div>
          <div className="space-y-1.5">
            <Label>Amount (in thousands IDR)</Label>
            <div className="flex items-center gap-2">
              <Input
                type="number" min={10} placeholder="e.g. 500 = Rp 500.000"
                value={amount} onChange={(e) => setAmount(e.target.value)}
              />
              <span className="text-sm text-gray-500 shrink-0">× 1.000</span>
            </div>
            {amount && (
              <p className="text-xs text-blue-600">
                = {fmtIdr(parseInt(amount || '0') * 1000)} ({Math.floor(parseInt(amount || '0') * 1000 / 10000)} deliveries)
              </p>
            )}
          </div>
          <div className="space-y-1.5">
            <Label>Note (optional)</Label>
            <Input placeholder="e.g. Monthly top-up" value={note} onChange={(e) => setNote(e.target.value)} />
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={onClose}>Cancel</Button>
            <Button
              onClick={() => mutation.mutate()}
              disabled={!amount || parseInt(amount) < 10 || mutation.isPending}
            >
              {mutation.isPending ? 'Processing…' : `Top Up ${amount ? fmtIdr(parseInt(amount) * 1000) : ''}`}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function KirimMerchantDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const qc = useQueryClient();
  const merchantId = parseInt(id);

  const [topupOpen, setTopupOpen] = useState(false);
  const [convertConfirm, setConvertConfirm] = useState(false);

  const { data, isLoading, error } = useQuery({
    queryKey: ['admin', 'kirim', 'merchant', merchantId],
    queryFn: () => adminApi.kirim.merchantDetail(merchantId),
    staleTime: 30_000,
  });

  const merchant: KirimMerchantDetail | undefined = data?.data?.data;

  const convertMutation = useMutation({
    mutationFn: () => adminApi.kirim.convertToSistem(merchantId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'kirim', 'merchants'] });
      router.push('/admin/kirim/merchants');
    },
  });

  if (isLoading) {
    return (
      <div className="p-6 text-sm text-gray-400">Loading…</div>
    );
  }

  if (error || !merchant) {
    return (
      <div className="p-6">
        <p className="text-sm text-red-600">Merchant not found or not a Kirim merchant.</p>
        <Button variant="outline" size="sm" className="mt-3" onClick={() => router.back()}>Go back</Button>
      </div>
    );
  }

  const txTypeLabel: Record<string, string> = {
    topup:  'Top Up',
    charge: 'Charge',
    refund: 'Refund',
  };

  const txTypeColor: Record<string, string> = {
    topup:  'text-emerald-600',
    charge: 'text-red-600',
    refund: 'text-blue-600',
  };

  return (
    <div className="p-6 max-w-5xl">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <button
            onClick={() => router.back()}
            className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 mb-3 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Kirim Merchants
          </button>
          <h1 className="text-2xl font-bold text-gray-900">{merchant.company_name}</h1>
          <p className="text-sm text-gray-500 mt-0.5">{merchant.email}{merchant.phone ? ` · ${merchant.phone}` : ''}</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => setTopupOpen(true)}>
            <CreditCard className="h-4 w-4 mr-1.5" />
            Top Up Credit
          </Button>
          <Button
            variant="outline"
            className="text-orange-700 border-orange-200 hover:bg-orange-50"
            onClick={() => setConvertConfirm(true)}
          >
            <ArrowRightLeft className="h-4 w-4 mr-1.5" />
            Convert to Sistem
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
        {/* Credit balance */}
        <div className={`bg-white border rounded-lg p-4 shadow-sm ${merchant.credit.is_blocked ? 'border-red-200' : 'border-gray-200'}`}>
          <div className="flex items-center justify-between mb-1">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Credit Balance</p>
            {merchant.credit.is_blocked && <AlertTriangle className="h-4 w-4 text-red-500" />}
          </div>
          <p className={`text-2xl font-bold mt-1 ${merchant.credit.is_blocked ? 'text-red-600' : merchant.credit.balance_idr < merchant.credit.low_balance_threshold_idr ? 'text-amber-600' : 'text-gray-900'}`}>
            {fmtIdr(merchant.credit.balance_idr)}
          </p>
          <p className="text-xs text-gray-400 mt-0.5">{merchant.credit.deliveries_remaining} deliveries remaining</p>
          {merchant.credit.is_blocked && (
            <p className="text-xs text-red-500 font-medium mt-1">BLOCKED — top up to re-enable</p>
          )}
          {!merchant.credit.is_blocked && merchant.credit.balance_idr < merchant.credit.low_balance_threshold_idr && (
            <p className="text-xs text-amber-500 mt-1">Low balance warning</p>
          )}
        </div>

        {/* Order stats */}
        <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Order Summary</p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="text-xs text-gray-400">Total</p>
              <p className="text-lg font-bold text-gray-900">{merchant.order_stats.total.toLocaleString()}</p>
            </div>
            <div>
              <p className="text-xs text-gray-400">Today</p>
              <p className="text-lg font-bold text-blue-600">{merchant.order_stats.today}</p>
            </div>
            <div>
              <p className="text-xs text-gray-400">Pending</p>
              <p className="text-lg font-bold text-amber-600">{merchant.order_stats.pending}</p>
            </div>
            <div>
              <p className="text-xs text-gray-400">Delivered</p>
              <p className="text-lg font-bold text-emerald-600">{merchant.order_stats.delivered.toLocaleString()}</p>
            </div>
          </div>
        </div>

        {/* Business profile */}
        <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Business Profile</p>
          <dl className="space-y-2 text-sm">
            <div>
              <dt className="text-xs text-gray-400">Company</dt>
              <dd className="text-gray-800 font-medium">{merchant.company_name}</dd>
            </div>
            {merchant.owner && (
              <div>
                <dt className="text-xs text-gray-400">Owner</dt>
                <dd className="text-gray-800">{merchant.owner.name}</dd>
                <dd className="text-xs text-gray-500">{merchant.owner.email}</dd>
              </div>
            )}
            {merchant.address && (
              <div>
                <dt className="text-xs text-gray-400">Address</dt>
                <dd className="text-gray-700 text-xs">{merchant.address}</dd>
              </div>
            )}
            <div>
              <dt className="text-xs text-gray-400">Joined</dt>
              <dd className="text-gray-700">{fmtDate(merchant.created_at)}</dd>
            </div>
          </dl>
        </div>
      </div>

      {/* Credit transaction history */}
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden shadow-sm">
        <div className="px-4 py-3 border-b border-gray-100">
          <h2 className="text-sm font-semibold text-gray-800">Recent Credit Transactions</h2>
        </div>
        {merchant.recent_transactions.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-8">No transactions yet.</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500">Date</th>
                <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500">Type</th>
                <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500">Note</th>
                <th className="px-4 py-2.5 text-right text-xs font-medium text-gray-500">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {merchant.recent_transactions.map((tx) => (
                <tr key={tx.id}>
                  <td className="px-4 py-2.5 text-gray-500 text-xs">{fmtDatetime(tx.created_at)}</td>
                  <td className="px-4 py-2.5">
                    <span className={`text-xs font-medium flex items-center gap-1 ${txTypeColor[tx.type]}`}>
                      {tx.type === 'topup' ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                      {txTypeLabel[tx.type] ?? tx.type}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-gray-600 text-xs">{tx.note ?? '—'}</td>
                  <td className={`px-4 py-2.5 text-right font-medium font-mono text-sm ${txTypeColor[tx.type]}`}>
                    {tx.type === 'topup' ? '+' : '-'}{fmtIdr(tx.amount_idr)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Dialogs */}
      {topupOpen && (
        <TopupDialog
          merchantId={merchant.id}
          companyName={merchant.company_name}
          currentBalance={merchant.credit.balance_idr}
          onClose={() => setTopupOpen(false)}
        />
      )}

      {convertConfirm && (
        <Dialog open onOpenChange={() => setConvertConfirm(false)}>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle>Convert to Sistem merchant?</DialogTitle>
            </DialogHeader>
            <div className="py-2 text-sm text-gray-600 space-y-3">
              <p>
                <strong>{merchant.company_name}</strong> will be moved back to the Sistem Merchants list.
                The Hontal Kirim feature will be disabled. Credit balance is retained.
              </p>
              <p className="text-xs text-gray-400">
                They will need to set up their own drivers and routes to use the platform.
              </p>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setConvertConfirm(false)}>Cancel</Button>
              <Button
                className="bg-orange-600 hover:bg-orange-700 text-white"
                disabled={convertMutation.isPending}
                onClick={() => convertMutation.mutate()}
              >
                {convertMutation.isPending ? 'Converting…' : 'Convert to Sistem'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

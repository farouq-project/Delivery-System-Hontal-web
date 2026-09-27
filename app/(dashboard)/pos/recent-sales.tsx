'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Printer } from 'lucide-react';
import { posApi } from '@/lib/api';
import { printReceipt } from '@/lib/pos-receipt';
import { apiErrorMessage, num } from '@/lib/pos';
import { formatCurrency, localDateString } from '@/lib/utils';
import type { Paginated, PosTransaction } from '@/types/pos';
import { Button } from '@/components/ui/button';

interface Props {
  paymentLabel: (key: string | null) => string;
}

/** Today's sales with receipt reprint. */
export default function RecentSales({ paymentLabel }: Props) {
  const today = localDateString();
  const [printing, setPrinting] = useState<number | null>(null);
  const [error, setError] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['pos', 'transactions', today],
    queryFn: () => posApi.transactions({ date_from: today, date_to: today, per_page: 20 }),
  });
  const rows = (data?.data as Paginated<PosTransaction> | undefined)?.data ?? [];

  const reprint = async (id: number) => {
    setPrinting(id); setError('');
    // Open the window inside the click so popup blockers allow it, then fill it once data arrives.
    const target = window.open('', '_blank');
    if (!target) {
      setError('Allow pop-ups for this site to print receipts.');
      setPrinting(null);
      return;
    }
    try {
      const tx = (await posApi.transaction(id)).data.data as PosTransaction;
      printReceipt(tx, paymentLabel(tx.payment_method), target);
    } catch (err) {
      target.close();
      setError(apiErrorMessage(err, 'Could not load this receipt.'));
    }
    setPrinting(null);
  };

  return (
    <div className="bg-white border rounded-lg">
      <div className="px-4 py-3 border-b flex items-center justify-between">
        <h2 className="text-sm font-semibold">Today&apos;s sales</h2>
        <span className="text-xs text-gray-500">
          {rows.length} sale{rows.length === 1 ? '' : 's'} · {formatCurrency(rows.reduce((s, t) => s + num(t.total), 0))}
        </span>
      </div>
      {error && <p className="px-4 py-2 text-xs text-red-600 border-b">{error}</p>}
      {isLoading ? (
        <p className="px-4 py-6 text-center text-sm text-gray-400">Loading…</p>
      ) : rows.length === 0 ? (
        <p className="px-4 py-6 text-center text-sm text-gray-400">No sales yet today</p>
      ) : (
        <ul className="divide-y max-h-72 overflow-y-auto">
          {rows.map((t) => (
            <li key={t.id} className="px-4 py-2.5 flex items-center gap-3 text-sm">
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">
                  {t.transaction_number}
                  <span className={`ml-2 px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase ${t.type === 'delivery' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'}`}>
                    {t.type === 'delivery' ? 'Delivery' : 'Walk-in'}
                  </span>
                </p>
                <p className="text-xs text-gray-400 truncate">
                  {new Date(t.created_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                  {' · '}{paymentLabel(t.payment_method)}
                  {t.customer_name ? ` · ${t.customer_name}` : ''}
                  {t.delivery_order ? ` · ${t.delivery_order.order_number}` : ''}
                </p>
              </div>
              <span className="font-semibold tabular-nums whitespace-nowrap">{formatCurrency(num(t.total))}</span>
              <Button size="sm" variant="ghost" onClick={() => reprint(t.id)} disabled={printing === t.id} aria-label={`Print receipt ${t.transaction_number}`} title="Print receipt">
                <Printer className="h-3.5 w-3.5" />
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

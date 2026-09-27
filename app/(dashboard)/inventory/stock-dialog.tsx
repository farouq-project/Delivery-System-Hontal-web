'use client';

import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { inventoryApi } from '@/lib/api';
import { apiErrorMessage, formatQty, formatStock, num } from '@/lib/pos';
import { formatCurrency } from '@/lib/utils';
import type { Product } from '@/types/pos';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

export type StockMode = 'in' | 'out' | 'adjust';

const TITLES: Record<StockMode, string> = {
  in: 'Stock in',
  out: 'Stock out',
  adjust: 'Stock adjustment',
};

interface Props {
  product: Product;
  mode: StockMode;
  onClose: () => void;
}

// Matches components/ui/input.tsx so native selects look like the other fields.
const selectClass =
  'flex h-9 w-full rounded-md border border-gray-300 bg-white px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-blue-500';

export default function StockDialog({ product, mode, onClose }: Props) {
  const qc = useQueryClient();
  const units = product.units.filter((u) => u.is_active);
  const defaultUnit = units.find((u) => u.is_default) ?? units[0];

  const [unitId, setUnitId] = useState<number>(defaultUnit?.id ?? 0);
  const [qty, setQty]       = useState('');
  const [cost, setCost]     = useState('');
  const [notes, setNotes]   = useState('');
  const [error, setError]   = useState('');

  const unit       = units.find((u) => u.id === unitId) ?? defaultUnit;
  const conversion = num(unit?.conversion_to_base) || 1;
  const current    = num(product.stock_qty);

  // Preview of the balance after this movement, in base units. Adjust: the count becomes the stock.
  const entered = num(qty) * conversion;
  const after = qty === '' ? null
    : mode === 'in' ? current + entered
    : mode === 'out' ? current - entered
    : entered;

  const suggestedCost = product.default_cost ? Math.round(num(product.default_cost) * conversion) : null;

  const mutation = useMutation({
    mutationFn: () => {
      const common = { product_id: product.id, product_unit_id: unitId };
      if (mode === 'in') {
        return inventoryApi.stockIn({ ...common, qty: num(qty), unit_cost: cost === '' ? null : num(cost), notes: notes || null });
      }
      if (mode === 'out') return inventoryApi.stockOut({ ...common, qty: num(qty), notes });
      return inventoryApi.adjust({ ...common, counted_qty: num(qty), notes });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['inventory'] });
      onClose();
    },
    onError: (err) => setError(apiErrorMessage(err)),
  });

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (qty === '' || (mode !== 'adjust' && !(num(qty) > 0)) || num(qty) < 0) {
      setError(mode === 'adjust' ? 'Enter the quantity you counted.' : 'Enter a quantity greater than 0.');
      return;
    }
    if (mode !== 'in' && !notes.trim()) {
      setError(mode === 'out' ? 'Enter a reason, e.g. broken or expired.' : 'Enter a reason for the adjustment.');
      return;
    }
    setError('');
    if (!mutation.isPending) mutation.mutate();
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-md" onInteractOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle>{TITLES[mode]} — {product.name}</DialogTitle>
        </DialogHeader>

        <form onSubmit={submit} className="space-y-4">
          <p className="text-sm text-gray-500">
            Current stock: <strong className="text-gray-900">{formatStock(product)}</strong>
            {conversion > 1 && <span> ({formatQty(current)} {product.base_unit})</span>}
          </p>

          {error && <div className="bg-red-50 border border-red-200 text-red-700 text-sm p-3 rounded-md">{error}</div>}

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="s-qty">{mode === 'adjust' ? 'Counted quantity' : 'Quantity'}</Label>
              <Input
                id="s-qty" type="number" min="0" step="any" inputMode="decimal" autoFocus
                value={qty} onChange={(e) => setQty(e.target.value)} placeholder="0"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="s-unit">Unit</Label>
              <select id="s-unit" className={selectClass} value={unitId} onChange={(e) => setUnitId(Number(e.target.value))}>
                {units.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.unit_label}{num(u.conversion_to_base) !== 1 ? ` (${formatQty(u.conversion_to_base)} ${product.base_unit})` : ''}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {mode === 'in' && (
            <div className="space-y-1.5">
              <Label htmlFor="s-cost">Purchase cost per {unit?.unit_label} (Rp)</Label>
              <Input
                id="s-cost" type="number" min="0" step="any" inputMode="decimal"
                value={cost} onChange={(e) => setCost(e.target.value)}
                placeholder={suggestedCost !== null ? `Last: ${suggestedCost}` : 'Optional'}
              />
              <p className="text-xs text-gray-500">
                Saved with this delivery only — earlier stock and past sales keep their own cost.
              </p>
            </div>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="s-notes">
              {mode === 'in' ? 'Note' : 'Reason'} {mode !== 'in' && <span className="text-red-500">*</span>}
            </Label>
            <Input
              id="s-notes" value={notes} onChange={(e) => setNotes(e.target.value)}
              placeholder={mode === 'in' ? 'Supplier, invoice no. (optional)' : mode === 'out' ? 'Broken, expired, own use…' : 'Stock count'}
            />
          </div>

          {after !== null && (
            <div className={`text-sm rounded-md px-3 py-2 ${after < 0 ? 'bg-amber-50 text-amber-800' : 'bg-gray-50 text-gray-700'}`}>
              Stock after: <strong>{formatQty(after)} {product.base_unit}</strong>
              {mode === 'in' && cost !== '' && num(qty) > 0 && (
                <span className="text-gray-500"> · total cost {formatCurrency(num(cost) * num(qty))}</span>
              )}
              {after < 0 && <span> — this will make stock negative.</span>}
            </div>
          )}

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? 'Saving…' : TITLES[mode]}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

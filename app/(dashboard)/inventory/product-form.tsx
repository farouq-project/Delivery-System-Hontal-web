'use client';

import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Trash2 } from 'lucide-react';
import { inventoryApi } from '@/lib/api';
import { apiErrorMessage, num } from '@/lib/pos';
import type { Product } from '@/types/pos';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

interface UnitRow {
  id?: number;
  unit_label: string;
  conversion_to_base: string;
  selling_price: string;
  is_default: boolean;
}

interface Props {
  product: Product | null;
  onClose: () => void;
}

/** Base unit (conversion 1) is always the first row so there is exactly one. */
function initialUnits(product: Product | null): UnitRow[] {
  if (!product) {
    return [{ unit_label: 'pcs', conversion_to_base: '1', selling_price: '', is_default: true }];
  }
  const active = product.units.filter((u) => u.is_active);
  const base   = active.find((u) => num(u.conversion_to_base) === 1);
  const others = active.filter((u) => u !== base);
  return [base, ...others].filter(Boolean).map((u) => ({
    id: u!.id,
    unit_label: u!.unit_label,
    conversion_to_base: String(num(u!.conversion_to_base)),
    selling_price: String(num(u!.selling_price)),
    is_default: u!.is_default,
  }));
}

export default function ProductForm({ product, onClose }: Props) {
  const qc = useQueryClient();
  const isEdit = product !== null;

  const [name, setName]           = useState(product?.name ?? '');
  const [sku, setSku]             = useState(product?.sku ?? '');
  const [barcode, setBarcode]     = useState(product?.barcode ?? '');
  const [category, setCategory]   = useState(product?.category ?? '');
  const [threshold, setThreshold] = useState(product?.low_stock_threshold ? String(num(product.low_stock_threshold)) : '');
  const [isActive, setIsActive]   = useState(product?.is_active ?? true);
  const [units, setUnits]         = useState<UnitRow[]>(() => initialUnits(product));
  const [error, setError]         = useState('');

  const updateUnit = (i: number, patch: Partial<UnitRow>) =>
    setUnits((rows) => rows.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));

  const setDefault = (i: number) =>
    setUnits((rows) => rows.map((r, idx) => ({ ...r, is_default: idx === i })));

  const removeUnit = (i: number) =>
    setUnits((rows) => {
      const next = rows.filter((_, idx) => idx !== i);
      return next.some((r) => r.is_default) ? next : next.map((r, idx) => ({ ...r, is_default: idx === 0 }));
    });

  const addUnit = () =>
    setUnits((rows) => [...rows, { unit_label: '', conversion_to_base: '', selling_price: '', is_default: false }]);

  const validate = (): string | null => {
    if (!name.trim()) return 'Product name is required.';
    const labels = units.map((u) => u.unit_label.trim().toLowerCase());
    if (labels.some((l) => !l)) return 'Every unit needs a name.';
    if (new Set(labels).size !== labels.length) return 'Unit names must be different.';
    for (const [i, u] of units.entries()) {
      if (u.selling_price === '' || num(u.selling_price) < 0) return `Enter a selling price for "${u.unit_label || 'unit'}".`;
      if (i > 0 && (!(num(u.conversion_to_base) > 0) || num(u.conversion_to_base) === 1)) {
        return `"${u.unit_label}" must hold more or less than 1 ${units[0].unit_label} (e.g. tray = 30).`;
      }
    }
    return null;
  };

  const mutation = useMutation({
    mutationFn: () => {
      const payload = {
        name: name.trim(),
        sku: sku.trim() || null,
        barcode: barcode.trim() || null,
        category: category.trim() || null,
        low_stock_threshold: threshold === '' ? null : num(threshold),
        is_active: isActive,
        units: units.map((u, i) => ({
          ...(u.id ? { id: u.id } : {}),
          unit_label: u.unit_label.trim(),
          conversion_to_base: i === 0 ? 1 : num(u.conversion_to_base),
          selling_price: num(u.selling_price),
          is_default: u.is_default,
        })),
      };
      return isEdit ? inventoryApi.update(product!.id, payload) : inventoryApi.create(payload);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['inventory'] });
      onClose();
    },
    onError: (err) => setError(apiErrorMessage(err)),
  });

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const problem = validate();
    if (problem) { setError(problem); return; }
    setError('');
    if (!mutation.isPending) mutation.mutate();
  };

  const baseLabel = units[0]?.unit_label || 'base unit';

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" onInteractOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle>{isEdit ? `Edit ${product!.name}` : 'Add product'}</DialogTitle>
        </DialogHeader>

        <form onSubmit={submit} className="space-y-4">
          {error && <div className="bg-red-50 border border-red-200 text-red-700 text-sm p-3 rounded-md">{error}</div>}

          <div className="space-y-1.5">
            <Label htmlFor="p-name">Product name <span className="text-red-500">*</span></Label>
            <Input id="p-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Telur Omega" autoFocus />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="p-sku">SKU / code</Label>
              <Input id="p-sku" value={sku} onChange={(e) => setSku(e.target.value)} placeholder="EGG-OMEGA" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="p-barcode">Barcode</Label>
              <Input id="p-barcode" value={barcode} onChange={(e) => setBarcode(e.target.value)} placeholder="Scan or type" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="p-cat">Category</Label>
              <Input id="p-cat" value={category} onChange={(e) => setCategory(e.target.value)} placeholder="Telur" />
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Selling units</Label>
              <Button type="button" size="sm" variant="outline" onClick={addUnit}>
                <Plus className="h-3.5 w-3.5" /> Add unit
              </Button>
            </div>
            <p className="text-xs text-gray-500">
              Stock is counted in the first unit (<strong>{baseLabel}</strong>). Other units say how many {baseLabel} they hold.
            </p>
            <div className="border rounded-lg overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="text-left px-3 py-2 font-medium text-gray-600">Unit</th>
                    <th className="text-left px-3 py-2 font-medium text-gray-600">Contains</th>
                    <th className="text-left px-3 py-2 font-medium text-gray-600">Selling price (Rp)</th>
                    <th className="px-3 py-2 font-medium text-gray-600 text-center">Default</th>
                    <th className="w-10" />
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {units.map((u, i) => (
                    <tr key={u.id ?? `new-${i}`}>
                      <td className="px-3 py-2">
                        <Input
                          value={u.unit_label}
                          onChange={(e) => updateUnit(i, { unit_label: e.target.value })}
                          placeholder={i === 0 ? 'pcs' : 'tray'}
                          aria-label="Unit name"
                          className="min-w-20"
                        />
                      </td>
                      <td className="px-3 py-2">
                        {i === 0 ? (
                          <span className="text-xs text-gray-500 whitespace-nowrap">Base unit (1)</span>
                        ) : (
                          <div className="flex items-center gap-1.5">
                            <Input
                              type="number" min="0" step="any" inputMode="decimal"
                              value={u.conversion_to_base}
                              onChange={(e) => updateUnit(i, { conversion_to_base: e.target.value })}
                              placeholder="30"
                              aria-label="How many base units"
                              className="w-20"
                            />
                            <span className="text-xs text-gray-500 whitespace-nowrap">{baseLabel}</span>
                          </div>
                        )}
                      </td>
                      <td className="px-3 py-2">
                        <Input
                          type="number" min="0" step="any" inputMode="decimal"
                          value={u.selling_price}
                          onChange={(e) => updateUnit(i, { selling_price: e.target.value })}
                          placeholder="0"
                          aria-label="Selling price"
                          className="min-w-24"
                        />
                      </td>
                      <td className="px-3 py-2 text-center">
                        <input
                          type="radio" name="default-unit" checked={u.is_default} onChange={() => setDefault(i)}
                          aria-label={`Sell ${u.unit_label || 'this unit'} by default`}
                        />
                      </td>
                      <td className="px-2 py-2 text-center">
                        {i > 0 && (
                          <button
                            type="button" onClick={() => removeUnit(i)}
                            className="p-1 text-gray-400 hover:text-red-600" aria-label={`Remove ${u.unit_label || 'unit'}`}
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-end">
            <div className="space-y-1.5">
              <Label htmlFor="p-low">Low-stock alert at ({baseLabel})</Label>
              <Input
                id="p-low" type="number" min="0" step="any" value={threshold}
                onChange={(e) => setThreshold(e.target.value)} placeholder="Optional"
              />
            </div>
            <label className="flex items-center gap-2 text-sm pb-2">
              <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} />
              Active (shown in POS)
            </label>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? 'Saving…' : isEdit ? 'Save changes' : 'Add product'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CheckCircle2, Minus, Plus, Printer, ScanBarcode, ShoppingCart, Store, Trash2, Truck, X } from 'lucide-react';
import { customersApi, merchantPlatformApi, posApi, settingsApi } from '@/lib/api';
import { apiErrorMessage, formatQty, formatStock, num, PAYMENT_LABELS } from '@/lib/pos';
import { printReceipt } from '@/lib/pos-receipt';
import { formatCurrency, localDateString } from '@/lib/utils';
import { useCashierStore } from '@/store/cashier';
import type { Customer } from '@/types';
import type { PosProduct, PosTransaction, StockWarning } from '@/types/pos';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import DeliverySection, { emptyDelivery, type DeliveryState } from './delivery-section';
import RecentSales from './recent-sales';

type Mode = 'walk_in' | 'delivery';

interface CartLine {
  unitId: number;
  productId: number;
  name: string;
  units: PosProduct['active_units'];
  unitLabel: string;
  conversion: number;
  price: number;
  qty: string;
  baseUnit: string;
  stock: number;
}

interface Completed {
  tx: PosTransaction;
  full: PosTransaction | null;
  warnings: StockWarning[];
}

const FALLBACK_METHODS = [
  { method_key: 'cash', label: 'Tunai' },
  { method_key: 'transfer', label: 'Transfer' },
  { method_key: 'qris', label: 'QRIS' },
];

function lineFromUnit(p: PosProduct, unit: PosProduct['active_units'][number]): CartLine {
  return {
    unitId: unit.id, productId: p.id, name: p.name, units: p.active_units,
    unitLabel: unit.unit_label, conversion: num(unit.conversion_to_base), price: num(unit.selling_price),
    qty: '1', baseUnit: p.base_unit, stock: num(p.stock_qty),
  };
}

/** Round-up cash suggestions for quick tendering: exact, then the next 10k / 50k / 100k. */
function cashSuggestions(total: number): number[] {
  if (total <= 0) return [];
  const steps = [total, Math.ceil(total / 10000) * 10000, Math.ceil(total / 50000) * 50000, Math.ceil(total / 100000) * 100000];
  return [...new Set(steps)].filter((v) => v >= total).slice(0, 4);
}

export default function PosPage() {
  const qc = useQueryClient();
  const searchRef = useRef<HTMLInputElement>(null);

  const cashierName    = useCashierStore((s) => s.cashierName);
  const setCashierName = useCashierStore((s) => s.setCashierName);

  const [mode, setMode]                 = useState<Mode>('walk_in');
  const [search, setSearch]             = useState('');
  const [debounced, setDebounced]       = useState('');
  const [cart, setCart]                 = useState<CartLine[]>([]);
  const [discount, setDiscount]         = useState('');
  const [chosenMethod, setMethod]       = useState('cash');
  const [amountPaid, setAmountPaid]     = useState('');
  const [paidNow, setPaidNow]           = useState(false);
  const [delivery, setDelivery]         = useState<DeliveryState>(() => emptyDelivery(localDateString()));
  const [error, setError]               = useState('');
  const [scanNote, setScanNote]         = useState('');
  const [completed, setCompleted]       = useState<Completed | null>(null);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(search.trim()), 200);
    return () => clearTimeout(t);
  }, [search]);

  const { data: productsRes, isFetching, error: productsError } = useQuery({
    queryKey: ['pos', 'products', debounced],
    queryFn: () => posApi.products(debounced || undefined),
    staleTime: 15_000,
  });
  const products: PosProduct[] = productsRes?.data?.data ?? [];
  const featureOff = (productsError as { response?: { data?: { code?: string } } } | null)?.response?.data?.code === 'feature_disabled';

  // Same payment-method and cashier sources as the New Order form and Orders page.
  const { data: methodsRes } = useQuery({
    queryKey: ['paymentMethods'],
    queryFn: settingsApi.getPaymentMethods,
    staleTime: 5 * 60 * 1000,
  });
  const methods = useMemo<{ method_key: string; label: string }[]>(() => {
    const configured = methodsRes?.data?.data ?? [];
    return configured.length > 0 ? configured : FALLBACK_METHODS;
  }, [methodsRes]);

  // The chosen method may not exist once the merchant's list loads — fall back to the first one.
  const method = methods.some((m) => m.method_key === chosenMethod) ? chosenMethod : methods[0].method_key;

  const { data: cashiersRes } = useQuery({
    queryKey: ['cashiers'],
    queryFn: merchantPlatformApi.getCashiers,
    retry: false,
  });
  const cashiers = useMemo<{ id: number; name: string }[]>(() => cashiersRes?.data?.data ?? [], [cashiersRes]);

  // Same correction as the Orders page: the shared cashier store must hold a configured cashier.
  useEffect(() => {
    if (cashiers.length > 0 && !cashiers.some((c) => c.name === cashierName)) setCashierName(cashiers[0].name);
  }, [cashiers, cashierName, setCashierName]);

  const paymentLabel = useCallback(
    (key: string | null) => methods.find((m) => m.method_key === key)?.label ?? PAYMENT_LABELS[key ?? ''] ?? key ?? '-',
    [methods],
  );

  // ── Cart ──────────────────────────────────────────────────────────────────
  const addUnit = (p: PosProduct, unit: PosProduct['active_units'][number]) => {
    setCompleted(null);
    setError('');
    setCart((lines) => {
      const i = lines.findIndex((l) => l.unitId === unit.id);
      if (i >= 0) return lines.map((l, idx) => (idx === i ? { ...l, qty: formatQty(num(l.qty) + 1) } : l));
      return [...lines, lineFromUnit(p, unit)];
    });
  };

  const addProduct = (p: PosProduct) => {
    const unit = p.active_units.find((u) => u.is_default) ?? p.active_units[0];
    if (unit) addUnit(p, unit);
  };

  const setQty = (unitId: number, qty: string) =>
    setCart((lines) => lines.map((l) => (l.unitId === unitId ? { ...l, qty } : l)));

  const stepQty = (unitId: number, delta: number) =>
    setCart((lines) => lines.map((l) => (l.unitId === unitId ? { ...l, qty: formatQty(Math.max(1, num(l.qty) + delta)) } : l)));

  const changeUnit = (unitId: number, newUnitId: number) =>
    setCart((lines) => {
      const line = lines.find((l) => l.unitId === unitId);
      const unit = line?.units.find((u) => u.id === newUnitId);
      if (!line || !unit) return lines;
      const existing = lines.find((l) => l.unitId === newUnitId);
      if (existing) {
        // Merge into the line that already uses this unit.
        return lines
          .filter((l) => l.unitId !== unitId)
          .map((l) => (l.unitId === newUnitId ? { ...l, qty: formatQty(num(l.qty) + num(line.qty)) } : l));
      }
      return lines.map((l) => (l.unitId === unitId
        ? { ...l, unitId: unit.id, unitLabel: unit.unit_label, conversion: num(unit.conversion_to_base), price: num(unit.selling_price) }
        : l));
    });

  const removeLine = (unitId: number) => setCart((lines) => lines.filter((l) => l.unitId !== unitId));

  // Barcode scanners type the code and press Enter; an exact barcode/SKU match goes straight into the cart.
  const onSearchKeyDown = async (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== 'Enter') return;
    e.preventDefault();
    const code = search.trim();
    if (!code) return;
    try {
      const list = ((await posApi.products(code)).data.data ?? []) as PosProduct[];
      const exact = list.find((p) => p.barcode === code || p.sku === code);
      const pick  = exact ?? (list.length === 1 ? list[0] : null);
      if (pick) {
        addProduct(pick);
        setSearch('');
        setScanNote(`Added ${pick.name}`);
      } else {
        setScanNote(list.length === 0 ? `No product matches "${code}"` : 'Several products match — tap one below');
      }
    } catch (err) {
      setScanNote(apiErrorMessage(err));
    }
  };

  // ── Totals & payment ──────────────────────────────────────────────────────
  const subtotal = useMemo(
    () => Math.round(cart.reduce((s, l) => s + num(l.qty) * l.price, 0) * 100) / 100,
    [cart],
  );
  const discountValue = num(discount);
  const fee   = mode === 'delivery' ? num(delivery.fee) : 0;
  const total = Math.max(0, Math.round((subtotal - discountValue + fee) * 100) / 100);

  const isCash       = method === 'cash';
  const needsTender  = isCash && (mode === 'walk_in' || paidNow);
  const change       = needsTender && amountPaid !== '' ? num(amountPaid) - total : null;

  const validate = (): string | null => {
    if (cart.length === 0) return 'Add at least one product.';
    if (cart.some((l) => !(num(l.qty) > 0))) return 'Every quantity must be more than 0.';
    if (discountValue < 0 || discountValue > subtotal) return 'Discount cannot be more than the subtotal.';
    if (needsTender && (amountPaid === '' || num(amountPaid) < total)) return 'Amount paid is less than the total.';
    if (mode === 'delivery') {
      if (!delivery.customerName.trim()) return 'Enter the customer name.';
      if (!delivery.address.trim()) return 'Enter the delivery address.';
      if (delivery.deliveryType === 'hontal_kirim') {
        if (!delivery.depotId) return 'Choose a pickup depot for Hontal Kirim.';
        if (!delivery.coords) return 'Hontal Kirim needs a map location for the address.';
      }
    }
    return null;
  };

  const resetSale = () => {
    setCart([]);
    setDiscount('');
    setAmountPaid('');
    setPaidNow(false);
    setDelivery(emptyDelivery(localDateString()));
    setError('');
  };

  const sale = useMutation({
    mutationFn: async () => {
      let customerId = delivery.customer?.id ?? null;

      // Same rule as New Order: a name that is not a selected existing customer is registered
      // as a new customer. Remember it so a retry after a failed sale reuses it.
      if (mode === 'delivery' && !customerId) {
        const created = await customersApi.create({
          customer_name: delivery.customerName.trim(),
          phone: delivery.customerPhone.trim() || undefined,
          default_address: delivery.address.trim(),
          default_latitude: delivery.coords?.lat,
          default_longitude: delivery.coords?.lng,
          vip_level: 'standard',
        });
        const customer = created.data.data as Customer;
        customerId = customer.id;
        setDelivery((d) => ({ ...d, customer }));
      }

      const payload: Record<string, unknown> = {
        type: mode,
        items: cart.map((l) => ({ product_unit_id: l.unitId, qty: num(l.qty) })),
        discount: discountValue || 0,
        payment_method: method,
        cashier_name: cashierName || null,
      };

      if (needsTender) payload.amount_paid = num(amountPaid);
      else if (mode === 'delivery' && paidNow) payload.amount_paid = total;

      if (mode === 'delivery') {
        Object.assign(payload, {
          delivery_type: delivery.deliveryType,
          depot_id: delivery.deliveryType === 'hontal_kirim' ? delivery.depotId : null,
          delivery_fee: fee,
          customer_id: customerId,
          customer_name: delivery.customerName.trim(),
          customer_phone: delivery.customerPhone.trim() || null,
          delivery_address: delivery.address.trim(),
          delivery_latitude: delivery.coords?.lat ?? null,
          delivery_longitude: delivery.coords?.lng ?? null,
          delivery_notes: delivery.notes.trim() || null,
          requested_delivery_date: delivery.date || null,
        });
      }

      return posApi.create(payload);
    },
    onSuccess: async (res) => {
      const tx = res.data.data as PosTransaction;
      setCompleted({ tx, full: null, warnings: res.data.warnings ?? [] });
      resetSale();
      qc.invalidateQueries({ queryKey: ['pos'] });
      qc.invalidateQueries({ queryKey: ['inventory'] });
      qc.invalidateQueries({ queryKey: ['orders'] });
      searchRef.current?.focus();
      // Load merchant details now so Print can open its window synchronously on click.
      try {
        const full = (await posApi.transaction(tx.id)).data.data as PosTransaction;
        setCompleted((c) => (c && c.tx.id === tx.id ? { ...c, full } : c));
      } catch { /* the receipt can still be reprinted from Today's sales */ }
    },
    onError: (err) => setError(apiErrorMessage(err)),
  });

  const complete = () => {
    const problem = validate();
    if (problem) { setError(problem); return; }
    setError('');
    if (!sale.isPending) sale.mutate();
  };

  if (featureOff) {
    return (
      <div className="p-4 md:p-6">
        <h1 className="text-2xl font-bold mb-2">Kasir / POS</h1>
        <p className="text-gray-500">POS is not enabled for your business. Contact Hontal support to turn it on.</p>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-4">
        <div>
          <h1 className="text-2xl font-bold">Kasir / POS</h1>
          <p className="text-gray-500 text-sm">Scan or search products, then take payment</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right">
            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest">Active cashier</p>
            <p className="text-lg font-bold text-blue-600 leading-tight">{cashierName || '—'}</p>
          </div>
          {cashiers.length > 0 && (
            <Select value={cashierName} onValueChange={setCashierName}>
              <SelectTrigger className="w-28" aria-label="Change cashier"><SelectValue /></SelectTrigger>
              <SelectContent>
                {cashiers.map((c) => <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
          )}
        </div>
      </div>

      {/* Transaction type */}
      <div className="grid grid-cols-2 gap-2 max-w-md mb-4" role="tablist" aria-label="Transaction type">
        {([['walk_in', 'Walk-in', Store], ['delivery', 'Delivery', Truck]] as const).map(([m, label, Icon]) => (
          <button
            key={m} role="tab" aria-selected={mode === m}
            onClick={() => { setMode(m); setError(''); setAmountPaid(''); setPaidNow(false); }}
            className={`flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border text-sm font-semibold transition-colors ${
              mode === m ? 'bg-gray-900 text-white border-gray-900' : 'bg-white text-gray-600 hover:bg-gray-50'
            }`}
          >
            <Icon className="h-4 w-4" /> {label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_400px] gap-4 items-start">
        {/* Left: catalog */}
        <div className="space-y-4 min-w-0">
          <div>
            <div className="relative">
              <ScanBarcode className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
              <Input
                ref={searchRef}
                autoFocus
                className="pl-9 pr-9 h-10"
                placeholder="Scan barcode or search product name / SKU, then Enter"
                value={search}
                onChange={(e) => { setSearch(e.target.value); setScanNote(''); }}
                onKeyDown={onSearchKeyDown}
                aria-label="Search products"
              />
              {search && (
                <button onClick={() => { setSearch(''); searchRef.current?.focus(); }} className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600" aria-label="Clear search">
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
            {scanNote && <p className="text-xs text-gray-500 mt-1">{scanNote}</p>}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
            {products.length === 0 ? (
              <div className="col-span-full bg-white border rounded-lg py-10 text-center text-sm text-gray-400">
                {isFetching ? 'Loading products…' : debounced ? `No products match "${debounced}"` : 'No products yet — add them on the Inventory page.'}
              </div>
            ) : products.map((p) => {
              const stock = num(p.stock_qty);
              return (
                <div key={p.id} className="bg-white border rounded-lg p-3 flex flex-col gap-2">
                  <button onClick={() => addProduct(p)} className="text-left">
                    <p className="font-medium leading-snug">{p.name}</p>
                    <p className={`text-xs ${stock <= 0 ? 'text-red-600' : 'text-gray-400'}`}>
                      Stock: {formatStock({ ...p, units: p.active_units })}
                      {p.sku ? ` · ${p.sku}` : ''}
                    </p>
                  </button>
                  <div className="flex flex-wrap gap-1.5">
                    {p.active_units.map((u) => (
                      <button
                        key={u.id} onClick={() => addUnit(p, u)}
                        className={`px-2 py-1 rounded-md border text-xs transition-colors hover:border-blue-500 hover:bg-blue-50 ${u.is_default ? 'border-blue-300 bg-blue-50/60' : 'border-gray-200'}`}
                      >
                        <span className="font-semibold">{u.unit_label}</span>{' '}
                        <span className="text-gray-600 tabular-nums">{formatCurrency(num(u.selling_price))}</span>
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>

          <RecentSales paymentLabel={paymentLabel} />
        </div>

        {/* Right: cart & checkout */}
        <div className="bg-white border rounded-lg lg:sticky lg:top-4 flex flex-col">
          <div className="px-4 py-3 border-b flex items-center gap-2">
            <ShoppingCart className="h-4 w-4 text-gray-500" />
            <h2 className="font-semibold text-sm">Cart</h2>
            <span className="text-xs text-gray-400">{cart.length} item{cart.length === 1 ? '' : 's'}</span>
            {cart.length > 0 && (
              <button onClick={() => setCart([])} className="ml-auto text-xs text-gray-400 hover:text-red-600">Clear</button>
            )}
          </div>

          {completed && (
            <div className="m-4 mb-0 rounded-lg border border-green-200 bg-green-50 p-3 text-sm">
              <div className="flex items-start gap-2">
                <CheckCircle2 className="h-5 w-5 text-green-600 shrink-0" />
                <div className="flex-1">
                  <p className="font-semibold text-green-800">Sale completed · {completed.tx.transaction_number}</p>
                  <p className="text-green-700">
                    Total {formatCurrency(num(completed.tx.total))}
                    {num(completed.tx.change_amount) > 0 && <> · <strong>Change {formatCurrency(num(completed.tx.change_amount))}</strong></>}
                  </p>
                  {completed.tx.delivery_order && (
                    <p className="text-green-700">Delivery order {completed.tx.delivery_order.order_number} sent to dispatch</p>
                  )}
                  {completed.warnings.map((w) => (
                    <p key={w.product_id} className="text-amber-700 text-xs mt-1">
                      {w.product_name} is now at {formatQty(w.stock_after)} {w.base_unit} — record a stock-in or count.
                    </p>
                  ))}
                </div>
                <button onClick={() => setCompleted(null)} className="text-green-700 hover:text-green-900" aria-label="Dismiss"><X className="h-4 w-4" /></button>
              </div>
              <Button
                size="sm" className="w-full mt-2" variant="outline"
                disabled={!completed.full}
                onClick={() => completed.full && printReceipt(completed.full, paymentLabel(completed.full.payment_method))}
              >
                <Printer className="h-3.5 w-3.5" /> {completed.full ? 'Print receipt' : 'Preparing receipt…'}
              </Button>
            </div>
          )}

          <div className="p-4 space-y-4">
            {cart.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-6">Cart is empty</p>
            ) : (
              <ul className="divide-y -my-2">
                {cart.map((l) => {
                  const lineTotal = num(l.qty) * l.price;
                  return (
                    <li key={l.unitId} className="py-2 space-y-1.5">
                      <div className="flex items-start gap-2">
                        <p className="flex-1 text-sm font-medium leading-snug">{l.name}</p>
                        <button onClick={() => removeLine(l.unitId)} className="text-gray-300 hover:text-red-600" aria-label={`Remove ${l.name}`}>
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="flex items-center border rounded-md">
                          <button onClick={() => stepQty(l.unitId, -1)} className="px-2 py-1 text-gray-500 hover:text-gray-900" aria-label="Decrease quantity"><Minus className="h-3.5 w-3.5" /></button>
                          <input
                            value={l.qty} onChange={(e) => setQty(l.unitId, e.target.value)}
                            inputMode="decimal" aria-label={`Quantity of ${l.name}`}
                            className="w-12 text-center text-sm tabular-nums outline-none"
                          />
                          <button onClick={() => stepQty(l.unitId, 1)} className="px-2 py-1 text-gray-500 hover:text-gray-900" aria-label="Increase quantity"><Plus className="h-3.5 w-3.5" /></button>
                        </div>
                        {l.units.length > 1 ? (
                          <select
                            value={l.unitId} onChange={(e) => changeUnit(l.unitId, Number(e.target.value))}
                            className="h-8 rounded-md border border-gray-300 px-2 text-sm bg-white" aria-label={`Unit for ${l.name}`}
                          >
                            {l.units.map((u) => <option key={u.id} value={u.id}>{u.unit_label}</option>)}
                          </select>
                        ) : <span className="text-sm text-gray-600">{l.unitLabel}</span>}
                        <span className="ml-auto text-sm font-semibold tabular-nums">{formatCurrency(lineTotal)}</span>
                      </div>
                      <p className="text-xs text-gray-400 tabular-nums">
                        {formatCurrency(l.price)} / {l.unitLabel}
                        {num(l.qty) * l.conversion > l.stock && <span className="text-amber-600"> · more than in stock</span>}
                      </p>
                    </li>
                  );
                })}
              </ul>
            )}

            {mode === 'delivery' && (
              <div className="border-t pt-4">
                <h3 className="text-sm font-semibold mb-3 flex items-center gap-2"><Truck className="h-4 w-4" /> Delivery</h3>
                <DeliverySection value={delivery} onChange={(patch) => setDelivery((d) => ({ ...d, ...patch }))} />
              </div>
            )}

            <div className="border-t pt-4 space-y-1.5 text-sm">
              <div className="flex justify-between"><span className="text-gray-500">Subtotal</span><span className="tabular-nums">{formatCurrency(subtotal)}</span></div>
              <div className="flex justify-between items-center gap-3">
                <Label htmlFor="pos-discount" className="text-gray-500 font-normal">Discount</Label>
                <Input
                  id="pos-discount" type="number" min="0" inputMode="numeric" value={discount}
                  onChange={(e) => setDiscount(e.target.value)} placeholder="0" className="h-8 w-32 text-right"
                />
              </div>
              {mode === 'delivery' && (
                <div className="flex justify-between"><span className="text-gray-500">Delivery fee</span><span className="tabular-nums">{formatCurrency(fee)}</span></div>
              )}
              <div className="flex justify-between text-lg font-bold pt-1"><span>Total</span><span className="tabular-nums">{formatCurrency(total)}</span></div>
            </div>

            <div className="border-t pt-4 space-y-3">
              <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label="Payment method">
                {methods.map((m) => (
                  <button
                    key={m.method_key} role="radio" aria-checked={method === m.method_key}
                    onClick={() => { setMethod(m.method_key); setAmountPaid(''); }}
                    className={`px-3 py-1.5 rounded-md border text-sm font-medium transition-colors ${
                      method === m.method_key ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    {m.label}
                  </button>
                ))}
              </div>

              {mode === 'delivery' && (
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={paidNow} onChange={(e) => { setPaidNow(e.target.checked); setAmountPaid(''); }} />
                  Customer pays now (otherwise collected on delivery)
                </label>
              )}

              {needsTender && (
                <div className="space-y-2">
                  <Label htmlFor="pos-paid">Amount paid</Label>
                  <Input
                    id="pos-paid" type="number" min="0" inputMode="numeric" value={amountPaid}
                    onChange={(e) => setAmountPaid(e.target.value)} placeholder="0" className="h-10 text-lg text-right tabular-nums"
                  />
                  <div className="flex flex-wrap gap-1.5">
                    {cashSuggestions(total).map((v, i) => (
                      <button
                        key={v} onClick={() => setAmountPaid(String(v))}
                        className="px-2 py-1 rounded-md border text-xs hover:bg-gray-50 tabular-nums"
                      >
                        {i === 0 ? 'Exact' : formatCurrency(v)}
                      </button>
                    ))}
                  </div>
                  {change !== null && (
                    <div className={`flex justify-between rounded-md px-3 py-2 font-semibold ${change < 0 ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-800'}`}>
                      <span>{change < 0 ? 'Short' : 'Change'}</span>
                      <span className="tabular-nums text-lg">{formatCurrency(Math.abs(change))}</span>
                    </div>
                  )}
                </div>
              )}
            </div>

            {error && <div className="bg-red-50 border border-red-200 text-red-700 text-sm p-3 rounded-md">{error}</div>}

            <Button className="w-full h-11 text-base" onClick={complete} disabled={sale.isPending || cart.length === 0}>
              {sale.isPending ? 'Processing…' : `Complete sale · ${formatCurrency(total)}`}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

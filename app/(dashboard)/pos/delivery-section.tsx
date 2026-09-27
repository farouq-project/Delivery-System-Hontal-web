'use client';

import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link2, MapPin, Search } from 'lucide-react';
import { customersApi, kirimApi, ordersApi } from '@/lib/api';
import type { Customer } from '@/types';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';

export interface DeliveryState {
  deliveryType: 'merchant_managed' | 'hontal_kirim';
  depotId: number | null;
  customer: Customer | null;      // selected existing customer
  customerName: string;
  customerPhone: string;
  address: string;
  coords: { lat: number; lng: number } | null;
  notes: string;
  date: string;
  fee: string;
}

export function emptyDelivery(today: string): DeliveryState {
  return {
    deliveryType: 'merchant_managed', depotId: null, customer: null,
    customerName: '', customerPhone: '', address: '', coords: null, notes: '', date: today, fee: '',
  };
}

interface Props {
  value: DeliveryState;
  onChange: (patch: Partial<DeliveryState>) => void;
}

/**
 * Customer + delivery details for a delivery sale. Uses the same endpoints and the same
 * Merchant Managed / Hontal Kirim choice as the New Order form, which is left unchanged.
 */
export default function DeliverySection({ value, onChange }: Props) {
  const [results, setResults]       = useState<{ query: string; items: Customer[] }>({ query: '', items: [] });
  const [mapsLink, setMapsLink]     = useState('');
  const [locError, setLocError]     = useState('');
  const [locating, setLocating]     = useState(false);

  // Kirim availability — the balance endpoint is not open to every role, so a failure simply
  // hides the Kirim option, the same as on the New Order form.
  const { data: kirimRes } = useQuery({
    queryKey: ['kirim-balance'],
    queryFn: kirimApi.credit.balance,
    staleTime: 60_000,
    retry: false,
  });
  const kirimEnabled   = kirimRes?.data?.data?.kirim_enabled ?? false;
  const kirimBalance   = kirimRes?.data?.data?.balance_idr ?? 0;
  const kirimCanAfford = (kirimRes?.data?.data?.deliveries_remaining ?? 0) > 0;

  const { data: depotsRes } = useQuery({
    queryKey: ['depots'],
    queryFn: () => kirimApi.depots.list(false),
    enabled: value.deliveryType === 'hontal_kirim',
  });
  const depots: { id: number; name: string; address: string }[] = depotsRes?.data?.data ?? [];

  // Debounced customer lookup. Results are tagged with their query, so a slow response for an
  // older query is never shown against the name currently typed.
  useEffect(() => {
    const q = value.customerName;
    if (q.length < 2 || value.customer) return;
    let cancelled = false;
    const t = setTimeout(async () => {
      try {
        const items = (await customersApi.search(q)).data.data ?? [];
        if (!cancelled) setResults({ query: q, items });
      } catch {}
    }, 300);
    return () => { cancelled = true; clearTimeout(t); };
  }, [value.customerName, value.customer]);

  const suggestions = !value.customer && results.query === value.customerName ? results.items : [];

  const selectCustomer = (c: Customer) => {
    setResults({ query: '', items: [] });
    onChange({
      customer: c,
      customerName: c.customer_name,
      customerPhone: c.phone ?? '',
      address: c.default_address ?? '',
      coords: c.default_latitude ? { lat: Number(c.default_latitude), lng: Number(c.default_longitude) } : null,
    });
  };

  const changeName = (name: string) =>
    onChange(value.customer && name !== value.customer.customer_name
      ? { customerName: name, customer: null }
      : { customerName: name });

  const geocode = async () => {
    if (!value.address.trim()) return;
    setLocating(true); setLocError('');
    try {
      const res = await ordersApi.geocode(value.address);
      onChange({ coords: { lat: res.data.data.latitude, lng: res.data.data.longitude } });
    } catch { setLocError('Could not find this address on the map.'); }
    setLocating(false);
  };

  const resolveLink = async () => {
    if (!mapsLink.trim()) return;
    setLocating(true); setLocError('');
    try {
      const res = await customersApi.resolveMapsLink(mapsLink.trim());
      onChange({ coords: { lat: res.data.data.latitude, lng: res.data.data.longitude } });
    } catch (err) {
      setLocError((err as { response?: { data?: { message?: string } } })?.response?.data?.message
        ?? 'Could not read a location from this link.');
    }
    setLocating(false);
  };

  const isKirim = value.deliveryType === 'hontal_kirim';

  return (
    <div className="space-y-3">
      {kirimEnabled && (
        <div className="grid grid-cols-2 gap-2">
          {(['merchant_managed', 'hontal_kirim'] as const).map((t) => (
            <button
              key={t} type="button"
              onClick={() => onChange({ deliveryType: t, depotId: null })}
              className={`px-3 py-2 rounded-lg border text-sm font-medium transition-colors ${
                value.deliveryType === t
                  ? t === 'hontal_kirim' ? 'border-blue-600 bg-blue-50 text-blue-700' : 'border-gray-700 bg-gray-900 text-white'
                  : 'border-gray-200 text-gray-600 hover:border-gray-300'
              }`}
            >
              {t === 'merchant_managed' ? 'Own driver' : 'Hontal Kirim'}
            </button>
          ))}
        </div>
      )}

      {isKirim && (
        <div className="space-y-1.5">
          <div className="rounded-md bg-blue-50 border border-blue-200 px-3 py-2 text-xs text-blue-700">
            Kirim credit: <strong>Rp {Number(kirimBalance).toLocaleString('id-ID')}</strong>
            {!kirimCanAfford && <span className="ml-2 text-red-600 font-semibold">— Insufficient credit</span>}
          </div>
          <Label>Pickup depot <span className="text-red-500">*</span></Label>
          {depots.length === 0 ? (
            <p className="text-sm text-amber-600">No active depots. Add one on the Depots page.</p>
          ) : depots.map((d) => (
            <button
              key={d.id} type="button" onClick={() => onChange({ depotId: d.id })}
              className={`w-full text-left px-3 py-2 rounded-lg border text-sm ${value.depotId === d.id ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'}`}
            >
              <p className="font-medium">{d.name}</p>
              <p className="text-xs text-gray-400 truncate">{d.address}</p>
            </button>
          ))}
        </div>
      )}

      <div className="space-y-1.5 relative">
        <Label htmlFor="d-name">Customer <span className="text-red-500">*</span></Label>
        <div className="relative">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
          <Input
            id="d-name" className="pl-9" value={value.customerName} autoComplete="off"
            onChange={(e) => changeName(e.target.value)} placeholder="Search or type a new name"
          />
        </div>
        {value.customer && <p className="text-xs text-green-600">Existing customer selected</p>}
        {!value.customer && value.customerName.length >= 2 && suggestions.length === 0 && (
          <p className="text-xs text-gray-400">New customer — will be saved with this order</p>
        )}
        {suggestions.length > 0 && (
          <div className="absolute z-20 left-0 right-0 bg-white border rounded-md shadow-lg max-h-56 overflow-y-auto">
            {suggestions.map((c) => (
              <button
                key={c.id} type="button" onClick={() => selectCustomer(c)}
                className="w-full text-left px-3 py-2 hover:bg-gray-50 border-b last:border-0"
              >
                <p className="text-sm font-medium">{c.customer_name}</p>
                <p className="text-xs text-gray-400 truncate">{[c.phone, c.default_address].filter(Boolean).join(' · ')}</p>
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="d-phone">Phone</Label>
        <Input id="d-phone" value={value.customerPhone} onChange={(e) => onChange({ customerPhone: e.target.value })} placeholder="08…" inputMode="tel" />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="d-address">Delivery address <span className="text-red-500">*</span></Label>
        <textarea
          id="d-address" rows={2} value={value.address}
          onChange={(e) => onChange({ address: e.target.value, coords: null })}
          className="flex w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm placeholder:text-gray-400 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-blue-500"
          placeholder="Street, number, area"
        />
        <div className="flex gap-2">
          <Input value={mapsLink} onChange={(e) => setMapsLink(e.target.value)} placeholder="Paste Google Maps link (optional)" className="text-xs" />
          <Button type="button" size="sm" variant="outline" onClick={resolveLink} disabled={locating || !mapsLink.trim()} title="Use location from link">
            <Link2 className="h-3.5 w-3.5" />
          </Button>
          <Button type="button" size="sm" variant="outline" onClick={geocode} disabled={locating || !value.address.trim()} title="Find address on map">
            <MapPin className="h-3.5 w-3.5" />
          </Button>
        </div>
        {value.coords ? (
          <p className="text-xs text-green-600">Location set ({value.coords.lat.toFixed(5)}, {value.coords.lng.toFixed(5)})</p>
        ) : (
          <p className={`text-xs ${isKirim ? 'text-red-500' : 'text-gray-400'}`}>
            {isKirim ? 'Hontal Kirim needs a map location — paste a link or find the address.' : 'No map location yet — it will be looked up from the address.'}
          </p>
        )}
        {locError && <p className="text-xs text-red-500">{locError}</p>}
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1.5">
          <Label htmlFor="d-date">Delivery date</Label>
          <Input id="d-date" type="date" value={value.date} onChange={(e) => onChange({ date: e.target.value })} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="d-fee">Delivery fee (Rp)</Label>
          <Input id="d-fee" type="number" min="0" inputMode="numeric" value={value.fee} onChange={(e) => onChange({ fee: e.target.value })} placeholder="0" />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="d-notes">Note for driver</Label>
        <Input id="d-notes" value={value.notes} onChange={(e) => onChange({ notes: e.target.value })} placeholder="Gate colour, landmark…" />
      </div>
    </div>
  );
}

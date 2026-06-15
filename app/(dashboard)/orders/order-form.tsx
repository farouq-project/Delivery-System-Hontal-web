'use client';

import { useState, useEffect, useRef } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ordersApi, customersApi } from '@/lib/api';
import { Customer } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AddressAutocomplete } from '@/components/address-autocomplete';
import { ProductSuggestInput } from '@/components/product-suggest-input';
import { Search, Plus, Trash2 } from 'lucide-react';
import { PaymentMethod } from '@/types';
import { useCashierStore } from '@/store/cashier';

const itemSchema = z.object({
  name:     z.string().min(1, 'Required'),
  quantity: z.number().min(0).optional().nullable(),
  notes:    z.string().optional(),
});

const PAYMENT_METHODS: { value: PaymentMethod; label: string }[] = [
  { value: 'cash', label: 'Cash' },
  { value: 'transfer', label: 'Transfer' },
  { value: 'qris', label: 'QRIS' },
];

const schema = z.object({
  customer_id:              z.number().optional(),
  customer_name:            z.string().min(2, 'Customer name is required'),
  customer_phone:           z.string().optional(),
  items:                    z.array(itemSchema).min(1, 'Add at least one item'),
  order_value:              z.number().min(0),
  delivery_address:         z.string().min(5),
  requested_delivery_date:  z.string().min(1, 'Required'),
  requested_delivery_start: z.string().optional(),
  requested_delivery_end:   z.string().optional(),
  notes:                    z.string().optional(),
  cashier_name:             z.enum(['Mian', 'Sela', 'Epa', 'Tira']),
  payment_method:           z.enum(['cash', 'transfer', 'qris']),
});
type FormData = z.infer<typeof schema>;

function nowTime() {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

function formatThousands(value: string): string {
  const digits = value.replace(/\D/g, '');
  if (!digits) return '';
  return digits.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

export default function OrderForm({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient();
  const [query, setQuery]       = useState('');
  const [results, setResults]   = useState<Customer[]>([]);
  const [selected, setSelected] = useState<Customer | null>(null);
  const [coords, setCoords]     = useState<{ lat: number; lng: number } | null>(null);
  const [geocoding, setGeocoding] = useState(false);
  const debounce = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const skipNextSearch = useRef(false);

  const cashierName = useCashierStore((s) => s.cashierName);

  const { register, control, handleSubmit, setValue, watch, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      requested_delivery_date: new Date().toISOString().split('T')[0],
      requested_delivery_start: nowTime(),
      items: [{ name: '', quantity: undefined, notes: '' }],
      cashier_name: cashierName,
      payment_method: 'cash',
    },
  });

  const { fields, append, remove } = useFieldArray({ control, name: 'items' });

  useEffect(() => {
    if (skipNextSearch.current) { skipNextSearch.current = false; return; }
    if (query.length < 2) { setResults([]); return; }
    clearTimeout(debounce.current);
    debounce.current = setTimeout(async () => {
      try {
        const res = await customersApi.search(query);
        setResults(res.data.data ?? []);
      } catch {}
    }, 300);
  }, [query]);

  const selectCustomer = (c: Customer) => {
    skipNextSearch.current = true;
    setSelected(c);
    setResults([]);
    setQuery(c.customer_name);
    setValue('customer_id', c.id);
    setValue('customer_name', c.customer_name);
    setValue('customer_phone', c.phone ?? '');
    setValue('delivery_address', c.default_address);
    if (c.default_latitude) {
      setCoords({ lat: c.default_latitude, lng: c.default_longitude! });
    }
  };

  const handleCustomerNameChange = (value: string) => {
    setQuery(value);
    setValue('customer_name', value);
    if (selected && value !== selected.customer_name) {
      setSelected(null);
      setValue('customer_id', undefined);
    }
  };

  const handleGeocode = async () => {
    const addr = watch('delivery_address');
    if (!addr) return;
    setGeocoding(true);
    try {
      const res = await ordersApi.geocode(addr);
      setCoords({ lat: res.data.data.latitude, lng: res.data.data.longitude });
    } catch {}
    setGeocoding(false);
  };

  const mutation = useMutation({
    mutationFn: async (data: FormData) => {
      let customerId = data.customer_id;

      // If the typed name doesn't match a selected existing customer, register it as a new customer
      if (!customerId || !selected || selected.customer_name !== data.customer_name) {
        const created = await customersApi.create({
          customer_name: data.customer_name,
          phone: data.customer_phone || undefined,
          default_address: data.delivery_address,
          default_latitude: coords?.lat,
          default_longitude: coords?.lng,
          vip_level: 'standard',
        });
        customerId = created.data.data.id;
      }

      return ordersApi.create({
        ...data,
        customer_id: customerId,
        cashier_name: cashierName,
        delivery_latitude: coords?.lat,
        delivery_longitude: coords?.lng,
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['orders'] });
      onClose();
    },
  });

  const paymentMethod = watch('payment_method');

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent
        className="max-w-lg max-h-[90vh] overflow-y-auto"
        onInteractOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogHeader><DialogTitle>New Delivery Order</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit((d) => mutation.mutate(d))} className="space-y-4">
          {/* Customer autocomplete */}
          <div className="space-y-2">
            <Label>Customer</Label>
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
              <Input
                className="pl-9"
                placeholder="Type customer name (existing or new)..."
                value={query}
                onChange={(e) => handleCustomerNameChange(e.target.value)}
              />
              {results.length > 0 && (
                <div className="absolute z-10 top-full left-0 right-0 bg-white border rounded-md shadow-lg mt-1 max-h-48 overflow-y-auto">
                  {results.map((c) => (
                    <button
                      key={c.id} type="button"
                      className="w-full text-left px-3 py-2 hover:bg-blue-50 text-sm"
                      onClick={() => selectCustomer(c)}
                    >
                      <div className="font-medium">{c.customer_name}</div>
                      <div className="text-xs text-gray-400">{c.phone} · {c.default_address?.substring(0, 40)}...</div>
                    </button>
                  ))}
                </div>
              )}
            </div>
            {errors.customer_name && <p className="text-xs text-red-500">{errors.customer_name.message}</p>}
            {!selected && query.length >= 2 && (
              <p className="text-xs text-amber-600">New customer — will be saved as &quot;{query}&quot; (VIP: Standard)</p>
            )}
          </div>

          <div className="space-y-2">
            <Label>Delivery Address</Label>
            <div className="flex gap-2">
              <div className="flex-1">
                <AddressAutocomplete
                  value={watch('delivery_address') ?? ''}
                  onChange={(v) => setValue('delivery_address', v, { shouldValidate: true })}
                  onSelect={({ address, lat, lng }) => {
                    setValue('delivery_address', address, { shouldValidate: true });
                    setCoords({ lat, lng });
                  }}
                  placeholder="Address..."
                />
              </div>
              <Button type="button" variant="outline" size="sm" onClick={handleGeocode} disabled={geocoding}>
                {geocoding ? '...' : 'Pin'}
              </Button>
            </div>
            {coords && <p className="text-xs text-green-600">Pinned: {coords.lat.toFixed(5)}, {coords.lng.toFixed(5)}</p>}
            {errors.delivery_address && <p className="text-xs text-red-500">{errors.delivery_address.message}</p>}
          </div>

          <div className="space-y-2">
            <Label>Customer Phone {selected ? '' : '(optional)'}</Label>
            <Input {...register('customer_phone')} placeholder="0812-3456-7890" />
          </div>

          {/* Items */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Product / Item Description</Label>
              <Button
                type="button" variant="outline" size="sm"
                onClick={() => append({ name: '', quantity: undefined, notes: '' })}
              >
                <Plus className="h-4 w-4 mr-1" /> Add Item
              </Button>
            </div>
            <div className="space-y-3">
              {fields.map((field, index) => (
                <div key={field.id} className="flex gap-2 items-start border rounded-md p-2">
                  <div className="flex-1 space-y-2">
                    <ProductSuggestInput
                      value={watch(`items.${index}.name`) ?? ''}
                      onChange={(v) => setValue(`items.${index}.name`, v, { shouldValidate: true })}
                      placeholder="Susu Segar 5L"
                    />
                    {errors.items?.[index]?.name && (
                      <p className="text-xs text-red-500">{errors.items[index]?.name?.message}</p>
                    )}
                  </div>
                  <Input
                    type="number"
                    className="w-20"
                    placeholder="Qty"
                    {...register(`items.${index}.quantity`, {
                      setValueAs: (v) => (v === '' || v === null ? undefined : Number(v)),
                    })}
                  />
                  {fields.length > 1 && (
                    <Button type="button" variant="outline" size="sm" onClick={() => remove(index)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
            {errors.items && !Array.isArray(errors.items) && (
              <p className="text-xs text-red-500">{errors.items.message as string}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label>Order Value (Rp)</Label>
            <Input
              type="text"
              inputMode="numeric"
              value={formatThousands(String(watch('order_value') ?? ''))}
              onChange={(e) => {
                const digits = e.target.value.replace(/\D/g, '');
                setValue('order_value', digits ? Number(digits) : 0, { shouldValidate: true });
              }}
              placeholder="150.000"
            />
            {errors.order_value && <p className="text-xs text-red-500">{errors.order_value.message}</p>}
          </div>

          <div className="space-y-2">
            <Label>Payment Method</Label>
            <Select value={paymentMethod} onValueChange={(v) => setValue('payment_method', v as PaymentMethod)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {PAYMENT_METHODS.map(({ value, label }) => (
                  <SelectItem key={value} value={value}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Delivery Date</Label>
            <Input type="date" {...register('requested_delivery_date')} />
            {errors.requested_delivery_date && <p className="text-xs text-red-500">{errors.requested_delivery_date.message}</p>}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Window Start (optional, defaults to now)</Label>
              <Input type="time" {...register('requested_delivery_start')} />
            </div>
            <div className="space-y-2">
              <Label>Window End (optional)</Label>
              <Input type="time" {...register('requested_delivery_end')} />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Notes (optional)</Label>
            <Input {...register('notes')} placeholder="Delivery instructions..." />
          </div>

          {mutation.isError && <p className="text-xs text-red-500">Failed to create order. Please try again.</p>}
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? 'Creating...' : 'Create Order'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

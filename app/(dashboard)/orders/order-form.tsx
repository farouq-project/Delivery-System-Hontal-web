'use client';

import { useState, useEffect, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ordersApi, customersApi } from '@/lib/api';
import { Customer } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Search } from 'lucide-react';

const schema = z.object({
  customer_id:              z.number({ message: 'Select a customer' }),
  product_name:             z.string().min(2),
  order_value:              z.number().min(0),
  delivery_address:         z.string().min(5),
  requested_delivery_date:  z.string().min(1, 'Required'),
  requested_delivery_start: z.string().optional(),
  requested_delivery_end:   z.string().optional(),
  notes:                    z.string().optional(),
});
type FormData = z.infer<typeof schema>;

export default function OrderForm({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient();
  const [query, setQuery]       = useState('');
  const [results, setResults]   = useState<Customer[]>([]);
  const [selected, setSelected] = useState<Customer | null>(null);
  const [coords, setCoords]     = useState<{ lat: number; lng: number } | null>(null);
  const [geocoding, setGeocoding] = useState(false);
  const debounce = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const { register, handleSubmit, setValue, watch, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { requested_delivery_date: new Date().toISOString().split('T')[0] },
  });

  useEffect(() => {
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
    setSelected(c);
    setResults([]);
    setQuery(c.customer_name);
    setValue('customer_id', c.id);
    setValue('delivery_address', c.default_address);
    if (c.default_latitude) {
      setCoords({ lat: c.default_latitude, lng: c.default_longitude! });
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
    mutationFn: (data: FormData) =>
      ordersApi.create({ ...data, delivery_latitude: coords?.lat, delivery_longitude: coords?.lng }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['orders'] });
      onClose();
    },
  });

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>New Delivery Order</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit((d) => mutation.mutate(d))} className="space-y-4">
          {/* Customer autocomplete */}
          <div className="space-y-2">
            <Label>Customer</Label>
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
              <Input
                className="pl-9"
                placeholder="Type to search customers..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
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
                      <div className="text-xs text-gray-400">{c.phone} · {c.default_address.substring(0, 40)}...</div>
                    </button>
                  ))}
                </div>
              )}
            </div>
            {errors.customer_id && <p className="text-xs text-red-500">Please select a customer</p>}
          </div>

          <div className="space-y-2">
            <Label>Product / Item Description</Label>
            <Input {...register('product_name')} placeholder="Susu Segar 5L x10" />
            {errors.product_name && <p className="text-xs text-red-500">{errors.product_name.message}</p>}
          </div>

          <div className="space-y-2">
            <Label>Order Value (Rp)</Label>
            <Input
              type="number"
              {...register('order_value', { valueAsNumber: true })}
              placeholder="150000"
            />
            {errors.order_value && <p className="text-xs text-red-500">{errors.order_value.message}</p>}
          </div>

          <div className="space-y-2">
            <Label>Delivery Address</Label>
            <div className="flex gap-2">
              <Input {...register('delivery_address')} className="flex-1" placeholder="Address..." />
              <Button type="button" variant="outline" size="sm" onClick={handleGeocode} disabled={geocoding}>
                {geocoding ? '...' : 'Pin'}
              </Button>
            </div>
            {coords && <p className="text-xs text-green-600">Pinned: {coords.lat.toFixed(5)}, {coords.lng.toFixed(5)}</p>}
            {errors.delivery_address && <p className="text-xs text-red-500">{errors.delivery_address.message}</p>}
          </div>

          <div className="space-y-2">
            <Label>Delivery Date</Label>
            <Input type="date" {...register('requested_delivery_date')} />
            {errors.requested_delivery_date && <p className="text-xs text-red-500">{errors.requested_delivery_date.message}</p>}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Window Start (optional)</Label>
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

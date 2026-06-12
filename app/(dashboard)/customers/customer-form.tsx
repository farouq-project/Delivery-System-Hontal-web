'use client';

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { customersApi, ordersApi } from '@/lib/api';
import { Customer } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AddressAutocomplete } from '@/components/address-autocomplete';

const schema = z.object({
  customer_name: z.string().min(2),
  phone:         z.string().optional(),
  default_address: z.string().optional(),
  vip_level:     z.enum(['standard', 'silver', 'gold', 'platinum']),
  notes:         z.string().optional(),
});
type FormData = z.infer<typeof schema>;

interface Props { customer: Customer | null; onClose: () => void; }

export default function CustomerForm({ customer, onClose }: Props) {
  const qc = useQueryClient();
  const [geocoding, setGeocoding] = useState(false);
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(
    customer?.default_latitude ? { lat: customer.default_latitude, lng: customer.default_longitude! } : null
  );

  const { register, handleSubmit, setValue, watch, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: customer ? {
      customer_name: customer.customer_name,
      phone: customer.phone ?? '',
      default_address: customer.default_address ?? '',
      vip_level: customer.vip_level,
      notes: customer.notes ?? '',
    } : { vip_level: 'standard' },
  });

  const address = watch('default_address');

  const handleGeocode = async () => {
    if (!address) return;
    setGeocoding(true);
    try {
      const res = await ordersApi.geocode(address);
      const { latitude, longitude } = res.data.data;
      setCoords({ lat: latitude, lng: longitude });
    } catch {}
    setGeocoding(false);
  };

  const mutation = useMutation({
    mutationFn: (data: FormData) => {
      const payload = { ...data, default_latitude: coords?.lat, default_longitude: coords?.lng };
      return customer
        ? customersApi.update(customer.id, payload)
        : customersApi.create(payload);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['customers'] });
      onClose();
    },
  });

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{customer ? 'Edit Customer' : 'Add Customer'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit((d) => mutation.mutate(d))} className="space-y-4">
          <div className="space-y-2">
            <Label>Customer Name</Label>
            <Input {...register('customer_name')} placeholder="Warung Budi 1" />
            {errors.customer_name && <p className="text-xs text-red-500">{errors.customer_name.message}</p>}
          </div>
          <div className="space-y-2">
            <Label>Phone</Label>
            <Input {...register('phone')} placeholder="081234567890" />
            {errors.phone && <p className="text-xs text-red-500">{errors.phone.message}</p>}
          </div>
          <div className="space-y-2">
            <Label>Address</Label>
            <div className="flex gap-2">
              <div className="flex-1">
                <AddressAutocomplete
                  value={address ?? ''}
                  onChange={(v) => setValue('default_address', v)}
                  onSelect={({ address: addr, lat, lng }) => {
                    setValue('default_address', addr);
                    setCoords({ lat, lng });
                  }}
                  placeholder="Jl. Dago No. 1, Bandung"
                />
              </div>
              <Button type="button" variant="outline" size="sm" onClick={handleGeocode} disabled={geocoding}>
                {geocoding ? '...' : 'Geocode'}
              </Button>
            </div>
            {coords && (
              <p className="text-xs text-green-600">
                Coords: {coords.lat.toFixed(5)}, {coords.lng.toFixed(5)}
              </p>
            )}
            {errors.default_address && <p className="text-xs text-red-500">{errors.default_address.message}</p>}
          </div>
          <div className="space-y-2">
            <Label>VIP Level</Label>
            <Select defaultValue={customer?.vip_level ?? 'standard'} onValueChange={(v) => setValue('vip_level', v as FormData['vip_level'])}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="standard">Standard</SelectItem>
                <SelectItem value="silver">Silver</SelectItem>
                <SelectItem value="gold">Gold</SelectItem>
                <SelectItem value="platinum">Platinum</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Notes (optional)</Label>
            <Input {...register('notes')} placeholder="Delivery notes..." />
          </div>
          {mutation.isError && (
            <p className="text-xs text-red-500">Save failed. Please try again.</p>
          )}
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={isSubmitting || mutation.isPending}>
              {mutation.isPending ? 'Saving...' : 'Save'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

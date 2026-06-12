'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { driversApi } from '@/lib/api';
import { Driver } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

const schema = z.object({
  driver_name:   z.string().min(2),
  phone:         z.string().min(8),
  vehicle_type:  z.enum(['motorcycle', 'car', 'van']),
  vehicle_plate: z.string().min(3),
  email:         z.string().email().optional().or(z.literal('')),
  password:      z.string().min(6).optional().or(z.literal('')),
});
type FormData = z.infer<typeof schema>;

interface Props { driver: Driver | null; onClose: () => void; }

export default function DriverForm({ driver, onClose }: Props) {
  const qc = useQueryClient();

  const { register, handleSubmit, setValue, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: driver ? {
      driver_name: driver.driver_name,
      phone: driver.phone,
      vehicle_type: driver.vehicle_type,
      vehicle_plate: driver.vehicle_plate,
    } : { vehicle_type: 'motorcycle' },
  });

  const mutation = useMutation({
    mutationFn: (data: FormData) =>
      driver ? driversApi.update(driver.id, data) : driversApi.create(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['drivers'] });
      onClose();
    },
  });

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{driver ? 'Edit Driver' : 'Add Driver'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit((d) => mutation.mutate(d))} className="space-y-4">
          <div className="space-y-2">
            <Label>Driver Name</Label>
            <Input {...register('driver_name')} placeholder="Andri Kurniawan" />
            {errors.driver_name && <p className="text-xs text-red-500">{errors.driver_name.message}</p>}
          </div>
          <div className="space-y-2">
            <Label>Phone</Label>
            <Input {...register('phone')} placeholder="0812-1234-5678" />
            {errors.phone && <p className="text-xs text-red-500">{errors.phone.message}</p>}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Vehicle Type</Label>
              <Select defaultValue={driver?.vehicle_type ?? 'motorcycle'} onValueChange={(v) => setValue('vehicle_type', v as FormData['vehicle_type'])}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="motorcycle">Motorcycle</SelectItem>
                  <SelectItem value="car">Car</SelectItem>
                  <SelectItem value="van">Van</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Plate Number</Label>
              <Input {...register('vehicle_plate')} placeholder="D 1234 ABX" />
              {errors.vehicle_plate && <p className="text-xs text-red-500">{errors.vehicle_plate.message}</p>}
            </div>
          </div>
          {!driver && (
            <>
              <div className="space-y-2">
                <Label>Login Email</Label>
                <Input {...register('email')} type="email" placeholder="driver@segar.id" />
                {errors.email && <p className="text-xs text-red-500">{errors.email.message}</p>}
              </div>
              <div className="space-y-2">
                <Label>Password</Label>
                <Input {...register('password')} type="password" placeholder="min 6 characters" />
                {errors.password && <p className="text-xs text-red-500">{errors.password.message}</p>}
              </div>
            </>
          )}
          {mutation.isError && <p className="text-xs text-red-500">Save failed. Please try again.</p>}
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? 'Saving...' : 'Save'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

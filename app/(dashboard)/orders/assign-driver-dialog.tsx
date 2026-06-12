'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { driversApi, ordersApi } from '@/lib/api';
import { Driver } from '@/types';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

interface Props {
  orderIds: number[];
  onClose: () => void;
}

export default function AssignDriverDialog({ orderIds, onClose }: Props) {
  const qc = useQueryClient();
  const [driverId, setDriverId] = useState<string>('');

  const { data } = useQuery({
    queryKey: ['drivers'],
    queryFn: () => driversApi.list(),
  });

  const drivers: Driver[] = data?.data?.data ?? [];

  const mutation = useMutation({
    mutationFn: () => {
      const id = Number(driverId);
      return orderIds.length === 1
        ? ordersApi.assign(orderIds[0], id)
        : ordersApi.bulkAssign(orderIds, id);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['orders'] });
      onClose();
    },
  });

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Assign {orderIds.length > 1 ? `${orderIds.length} Orders` : 'Order'} to Driver</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Driver</Label>
            <Select value={driverId} onValueChange={setDriverId}>
              <SelectTrigger><SelectValue placeholder="Select a driver" /></SelectTrigger>
              <SelectContent>
                {drivers.map((d) => (
                  <SelectItem key={d.id} value={String(d.id)}>
                    {d.driver_name} · {d.vehicle_plate}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {mutation.isError && <p className="text-xs text-red-500">Failed to assign. Please try again.</p>}

          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button
              type="button"
              disabled={!driverId || mutation.isPending}
              onClick={() => mutation.mutate()}
            >
              {mutation.isPending ? 'Assigning...' : 'Assign'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

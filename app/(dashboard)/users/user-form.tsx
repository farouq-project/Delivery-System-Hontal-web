'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { usersApi, settingsApi } from '@/lib/api';
import { User, UserRole } from '@/types';
import { useAuthStore } from '@/store/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { getErrorMessage } from '@/lib/utils';
import { getRoleLabel } from '@/lib/roles';

const schema = z.object({
  name:        z.string().min(2),
  email:       z.string().email(),
  phone:       z.string().optional(),
  password:    z.string().min(8, 'Min 8 characters').optional().or(z.literal('')),
  role:        z.enum(['super_admin', 'developer', 'owner', 'merchant_owner', 'dispatcher', 'driver', 'kasir']),
  merchant_id: z.number().optional().nullable(),
  is_active:   z.boolean().optional(),
  can_logout:  z.boolean().optional(),
});
type FormData = z.infer<typeof schema>;

interface Props { user: User | null; onClose: () => void; }

export default function UserForm({ user, onClose }: Props) {
  const qc = useQueryClient();
  const { user: authUser } = useAuthStore();
  const isPlatformAdmin = authUser?.role === 'super_admin' || authUser?.role === 'developer';
  const isOwnerEditing  = ['owner', 'merchant_owner'].includes(authUser?.role ?? '') && ['owner', 'merchant_owner'].includes(user?.role ?? '');
  const [editPin, setEditPin] = useState('');

  const assignableRoles: UserRole[] = isPlatformAdmin
    ? ['super_admin', 'developer', 'merchant_owner', 'dispatcher', 'driver']
    : ['dispatcher', 'driver'];

  const { register, handleSubmit, setValue, watch, setError, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: user ? {
      name: user.name,
      email: user.email,
      phone: user.phone ?? '',
      role: user.role,
      merchant_id: user.merchant_id ?? undefined,
      is_active: user.is_active,
      can_logout: user.can_logout ?? true,
    } : { role: assignableRoles[0], is_active: true, can_logout: true },
  });

  const role = watch('role');

  const mutation = useMutation({
    mutationFn: async (data: FormData) => {
      const payload: Record<string, unknown> = { ...data };
      if (!payload.password) delete payload.password;
      if (!isPlatformAdmin) delete payload.merchant_id;
      const result = await (user ? usersApi.update(user.id, payload) : usersApi.create(payload));
      // If owner updated their own PIN, persist it to merchant settings
      if (isOwnerEditing && editPin.trim().length >= 3) {
        await settingsApi.update({ order_edit_pin: editPin.trim() });
      }
      return result;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['users'] });
      qc.invalidateQueries({ queryKey: ['settings'] });
      onClose();
    },
  });

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{user ? 'Edit User' : 'Add User'}</DialogTitle>
        </DialogHeader>
        <form
          onSubmit={handleSubmit((d) => {
            if (!user && !d.password) {
              setError('password', { message: 'Password is required' });
              return;
            }
            mutation.mutate(d);
          })}
          className="space-y-4"
        >
          <div className="space-y-2">
            <Label>Name</Label>
            <Input {...register('name')} placeholder="Full name" />
            {errors.name && <p className="text-xs text-red-500">{errors.name.message}</p>}
          </div>
          <div className="space-y-2">
            <Label>Email</Label>
            <Input {...register('email')} type="email" placeholder="user@example.com" />
            {errors.email && <p className="text-xs text-red-500">{errors.email.message}</p>}
          </div>
          <div className="space-y-2">
            <Label>Phone (optional)</Label>
            <Input {...register('phone')} placeholder="0812-3456-7890" />
          </div>
          <div className="space-y-2">
            <Label>Role</Label>
            <Select value={role} onValueChange={(v) => setValue('role', v as UserRole)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {assignableRoles.map((r) => (
                  <SelectItem key={r} value={r}>{getRoleLabel(r)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {isPlatformAdmin && role !== 'super_admin' && role !== 'developer' && (
            <div className="space-y-2">
              <Label>Merchant ID</Label>
              <Input
                type="number"
                {...register('merchant_id', { setValueAs: (v) => (v === '' ? undefined : Number(v)) })}
                placeholder="1"
              />
            </div>
          )}
          <div className="space-y-2">
            <Label>{user ? 'New Password (leave blank to keep current)' : 'Password'}</Label>
            <Input {...register('password')} type="password" placeholder="min 8 characters" />
            {errors.password && <p className="text-xs text-red-500">{errors.password.message}</p>}
          </div>
          {isOwnerEditing && (
            <div className="space-y-2">
              <Label>Order Edit PIN (3–6 digits, leave blank to keep current)</Label>
              <Input
                type="password"
                inputMode="numeric"
                maxLength={6}
                value={editPin}
                onChange={(e) => setEditPin(e.target.value.replace(/\D/g, ''))}
                placeholder="e.g. 152"
              />
              <p className="text-xs text-gray-400">Required to edit assigned orders. Only the merchant owner can change this.</p>
            </div>
          )}
          {role === 'driver' && (
            <div className="flex items-center justify-between py-1">
              <div>
                <p className="text-sm font-medium">Allow Logout</p>
                <p className="text-xs text-gray-400">Uncheck to prevent this driver from logging out</p>
              </div>
              <button
                type="button"
                onClick={() => setValue('can_logout', !watch('can_logout'))}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${
                  watch('can_logout') ? 'bg-blue-600' : 'bg-gray-300'
                }`}
              >
                <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                  watch('can_logout') ? 'translate-x-6' : 'translate-x-1'
                }`} />
              </button>
            </div>
          )}
          {mutation.isError && (
            <p className="text-xs text-red-500">
              {getErrorMessage(mutation.error) || 'Save failed. Please try again.'}
            </p>
          )}
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

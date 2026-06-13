'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { usersApi } from '@/lib/api';
import { User, UserRole } from '@/types';
import { useAuthStore } from '@/store/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { getErrorMessage } from '@/lib/utils';

const ROLE_LABELS: Record<UserRole, string> = {
  super_admin: 'Super Admin',
  developer: 'Developer',
  merchant_owner: 'Merchant Owner',
  dispatcher: 'Dispatcher',
  driver: 'Driver',
};

const schema = z.object({
  name:        z.string().min(2),
  email:       z.string().email(),
  phone:       z.string().optional(),
  password:    z.string().min(8, 'Min 8 characters').optional().or(z.literal('')),
  role:        z.enum(['super_admin', 'developer', 'merchant_owner', 'dispatcher', 'driver']),
  merchant_id: z.number().optional().nullable(),
  is_active:   z.boolean().optional(),
});
type FormData = z.infer<typeof schema>;

interface Props { user: User | null; onClose: () => void; }

export default function UserForm({ user, onClose }: Props) {
  const qc = useQueryClient();
  const { user: authUser } = useAuthStore();
  const isPlatformAdmin = authUser?.role === 'super_admin' || authUser?.role === 'developer';

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
    } : { role: assignableRoles[0], is_active: true },
  });

  const role = watch('role');

  const mutation = useMutation({
    mutationFn: (data: FormData) => {
      const payload: Record<string, unknown> = { ...data };
      if (!payload.password) delete payload.password;
      if (!isPlatformAdmin) delete payload.merchant_id;
      return user ? usersApi.update(user.id, payload) : usersApi.create(payload);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['users'] });
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
                  <SelectItem key={r} value={r}>{ROLE_LABELS[r]}</SelectItem>
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

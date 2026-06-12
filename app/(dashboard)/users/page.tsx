'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { usersApi } from '@/lib/api';
import { User } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Search, Edit, Trash2, KeyRound } from 'lucide-react';
import UserForm from './user-form';

const ROLE_LABELS: Record<string, string> = {
  super_admin: 'Super Admin',
  developer: 'Developer',
  merchant_owner: 'Merchant Owner',
  dispatcher: 'Dispatcher',
  driver: 'Driver',
};

export default function UsersPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<User | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['users', page, search],
    queryFn: () => usersApi.list({ page, search, per_page: 20 }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => usersApi.remove(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['users'] }),
  });

  const resetPasswordMutation = useMutation({
    mutationFn: (id: number) => usersApi.resetPassword(id),
  });

  const users: User[] = data?.data?.data ?? [];
  const meta = data?.data ? {
    total: data.data.total,
    current_page: data.data.current_page,
    last_page: data.data.last_page,
  } : null;

  const handleEdit = (u: User) => { setEditing(u); setShowForm(true); };
  const handleNew  = () => { setEditing(null); setShowForm(true); };
  const handleClose = () => { setShowForm(false); setEditing(null); };

  const handleResetPassword = async (u: User) => {
    if (!confirm(`Reset password for ${u.name}? A new random password will be generated.`)) return;
    const res = await resetPasswordMutation.mutateAsync(u.id);
    alert(`New password for ${u.name}: ${res.data.data.password}`);
  };

  return (
    <div className="p-4 md:p-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-bold">Users</h1>
          <p className="text-gray-500 text-sm">{meta?.total ?? 0} total users</p>
        </div>
        <Button onClick={handleNew}><Plus className="h-4 w-4" /> Add User</Button>
      </div>

      <div className="flex gap-3 mb-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search by name or email..."
            className="pl-9"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          />
        </div>
      </div>

      {/* Mobile card list */}
      <div className="md:hidden space-y-3">
        {isLoading ? (
          <div className="text-center py-8 text-gray-400">Loading...</div>
        ) : users.length === 0 ? (
          <div className="text-center py-8 text-gray-400">No users found</div>
        ) : users.map((u) => (
          <div key={u.id} className="bg-white rounded-lg border p-4">
            <div className="flex items-start justify-between gap-2 mb-2">
              <div className="min-w-0">
                <p className="font-medium truncate">{u.name}</p>
                <p className="text-sm text-gray-500 truncate">{u.email}</p>
              </div>
              {u.is_active ? (
                <span className="shrink-0 text-green-600 text-xs">Active</span>
              ) : (
                <span className="shrink-0 text-gray-400 text-xs">Inactive</span>
              )}
            </div>
            <div className="flex items-center justify-between">
              <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
                {ROLE_LABELS[u.role] ?? u.role}
              </span>
              <div className="flex gap-2">
                <Button size="sm" variant="ghost" title="Reset password" onClick={() => handleResetPassword(u)}>
                  <KeyRound className="h-4 w-4" />
                </Button>
                <Button size="sm" variant="ghost" onClick={() => handleEdit(u)}>
                  <Edit className="h-4 w-4" />
                </Button>
                <Button
                  size="sm" variant="ghost"
                  className="text-red-500 hover:text-red-700"
                  onClick={() => { if (confirm(`Delete user ${u.name}?`)) deleteMutation.mutate(u.id); }}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="hidden md:block bg-white rounded-lg border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Name</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Email</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Role</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Status</th>
              <th className="text-right px-4 py-3 font-medium text-gray-600">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {isLoading ? (
              <tr><td colSpan={5} className="text-center py-8 text-gray-400">Loading...</td></tr>
            ) : users.length === 0 ? (
              <tr><td colSpan={5} className="text-center py-8 text-gray-400">No users found</td></tr>
            ) : users.map((u) => (
              <tr key={u.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 font-medium">{u.name}</td>
                <td className="px-4 py-3 text-gray-600">{u.email}</td>
                <td className="px-4 py-3">
                  <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
                    {ROLE_LABELS[u.role] ?? u.role}
                  </span>
                </td>
                <td className="px-4 py-3">
                  {u.is_active ? (
                    <span className="text-green-600 text-xs">Active</span>
                  ) : (
                    <span className="text-gray-400 text-xs">Inactive</span>
                  )}
                </td>
                <td className="px-4 py-3 text-right">
                  <div className="flex justify-end gap-2">
                    <Button size="sm" variant="ghost" title="Reset password" onClick={() => handleResetPassword(u)}>
                      <KeyRound className="h-4 w-4" />
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => handleEdit(u)}>
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm" variant="ghost"
                      className="text-red-500 hover:text-red-700"
                      onClick={() => { if (confirm(`Delete user ${u.name}?`)) deleteMutation.mutate(u.id); }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {meta && meta.last_page > 1 && (
        <div className="flex justify-between items-center mt-4">
          <p className="text-sm text-gray-500">Page {meta.current_page} of {meta.last_page}</p>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>
              Previous
            </Button>
            <Button size="sm" variant="outline" disabled={page >= meta.last_page} onClick={() => setPage(p => p + 1)}>
              Next
            </Button>
          </div>
        </div>
      )}

      {showForm && (
        <UserForm user={editing} onClose={handleClose} />
      )}
    </div>
  );
}

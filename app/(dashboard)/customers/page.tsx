'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { customersApi } from '@/lib/api';
import { Customer } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { VIP_COLORS } from '@/lib/utils';
import { Plus, Search, Edit, Trash2, MapPin } from 'lucide-react';
import CustomerForm from './customer-form';

export default function CustomersPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Customer | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['customers', page, search],
    queryFn: () => customersApi.list({ page, search, per_page: 20 }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => customersApi.remove(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['customers'] }),
  });

  const customers: Customer[] = data?.data?.data ?? [];
  const meta = data?.data ? {
    total: data.data.total,
    current_page: data.data.current_page,
    last_page: data.data.last_page,
    per_page: data.data.per_page,
  } : null;

  const handleEdit = (c: Customer) => { setEditing(c); setShowForm(true); };
  const handleNew  = () => { setEditing(null); setShowForm(true); };
  const handleClose = () => { setShowForm(false); setEditing(null); };

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Customers</h1>
          <p className="text-gray-500 text-sm">{meta?.total ?? 0} total customers</p>
        </div>
        <Button onClick={handleNew}><Plus className="h-4 w-4" /> Add Customer</Button>
      </div>

      <div className="flex gap-3 mb-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search by name, phone, address..."
            className="pl-9"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          />
        </div>
      </div>

      <div className="bg-white rounded-lg border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Name</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Phone</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Address</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">VIP</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Coords</th>
              <th className="text-right px-4 py-3 font-medium text-gray-600">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {isLoading ? (
              <tr><td colSpan={6} className="text-center py-8 text-gray-400">Loading...</td></tr>
            ) : customers.length === 0 ? (
              <tr><td colSpan={6} className="text-center py-8 text-gray-400">No customers found</td></tr>
            ) : customers.map((c) => (
              <tr key={c.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 font-medium">{c.customer_name}</td>
                <td className="px-4 py-3 text-gray-600">{c.phone}</td>
                <td className="px-4 py-3 text-gray-600 max-w-xs truncate">{c.default_address}</td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${VIP_COLORS[c.vip_level]}`}>
                    {c.vip_level}
                  </span>
                </td>
                <td className="px-4 py-3">
                  {c.default_latitude ? (
                    <span className="text-green-600 flex items-center gap-1 text-xs">
                      <MapPin className="h-3 w-3" /> Set
                    </span>
                  ) : (
                    <span className="text-gray-400 text-xs">Not set</span>
                  )}
                </td>
                <td className="px-4 py-3 text-right">
                  <div className="flex justify-end gap-2">
                    <Button size="sm" variant="ghost" onClick={() => handleEdit(c)}>
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm" variant="ghost"
                      className="text-red-500 hover:text-red-700"
                      onClick={() => { if (confirm('Delete this customer?')) deleteMutation.mutate(c.id); }}
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
        <CustomerForm customer={editing} onClose={handleClose} />
      )}
    </div>
  );
}

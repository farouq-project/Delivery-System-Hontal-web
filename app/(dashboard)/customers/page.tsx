'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { customersApi } from '@/lib/api';
import { Customer } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { VIP_COLORS, formatCurrency } from '@/lib/utils';
import {
  Plus, Search, Edit, Trash2, Upload,
  ArrowUp, ArrowDown, ArrowUpDown, Map, TableIcon, Copy,
} from 'lucide-react';
import CustomerForm from './customer-form';
import CustomerImportDialog from './customer-import';
import dynamic from 'next/dynamic';
import { useAuthStore } from '@/store/auth';

const CustomerMap = dynamic(() => import('./customer-map'), {
  ssr: false,
  loading: () => <div className="flex-1 bg-gray-100 flex items-center justify-center text-gray-400 h-96">Loading map...</div>,
});

type SortField = 'customer_name' | 'default_latitude' | 'default_longitude' | 'total_belanja' | 'avg_belanja_per_month';
type SortDir   = 'asc' | 'desc';
type CoordsFilter   = 'all' | '1' | '0';
type ClusterFilter  = 'all' | '1' | '0';

const CLUSTER_NAMES = [
  'Banyak','Candra','Guru','Jingga','Kama','Kidang','Kumala','Larang',
  'Loka','Mayang','Naga','Naya','Pita','Purba','Rambut','Ratna',
  'Sima','Subang','Taru','Teja','Titis','Wangsa',
];

const CLUSTER_COLORS: Record<string, string> = {
  Banyak:'bg-red-100 text-red-700', Candra:'bg-orange-100 text-orange-700',
  Guru:'bg-amber-100 text-amber-700', Jingga:'bg-yellow-100 text-yellow-700',
  Kama:'bg-lime-100 text-lime-700', Kidang:'bg-green-100 text-green-700',
  Kumala:'bg-emerald-100 text-emerald-700', Larang:'bg-teal-100 text-teal-700',
  Loka:'bg-cyan-100 text-cyan-700', Mayang:'bg-sky-100 text-sky-700',
  Naga:'bg-blue-100 text-blue-700', Naya:'bg-indigo-100 text-indigo-700',
  Pita:'bg-violet-100 text-violet-700', Purba:'bg-purple-100 text-purple-700',
  Rambut:'bg-fuchsia-100 text-fuchsia-700', Ratna:'bg-pink-100 text-pink-700',
  Sima:'bg-rose-100 text-rose-700', Subang:'bg-slate-100 text-slate-700',
  Taru:'bg-gray-100 text-gray-700', Teja:'bg-zinc-100 text-zinc-700',
  Titis:'bg-stone-100 text-stone-700', Wangsa:'bg-neutral-100 text-neutral-700',
};

function SortIcon({ field, sortBy, sortDir }: { field: SortField; sortBy: SortField; sortDir: SortDir }) {
  if (sortBy !== field) return <ArrowUpDown className="h-3 w-3 text-gray-300 ml-1 inline" />;
  return sortDir === 'asc'
    ? <ArrowUp className="h-3 w-3 text-blue-500 ml-1 inline" />
    : <ArrowDown className="h-3 w-3 text-blue-500 ml-1 inline" />;
}

export default function CustomersPage() {
  const qc = useQueryClient();
  const authUser = useAuthStore((s) => s.user);
  const isOwner  = ['merchant_owner', 'super_admin', 'developer'].includes(authUser?.role ?? '');

  const [search, setSearch]             = useState('');
  const [page, setPage]                 = useState(1);
  const [perPage, setPerPage]           = useState(25);
  const [showForm, setShowForm]         = useState(false);
  const [showImport, setShowImport]     = useState(false);
  const [editing, setEditing]           = useState<Customer | null>(null);
  const [selectedIds, setSelectedIds]   = useState<Set<number>>(new Set());
  const [coordsFilter, setCoordsFilter]     = useState<CoordsFilter>('all');
  const [clusterFilter, setClusterFilter]   = useState<ClusterFilter>('all');
  const [editingClusterId, setEditingClusterId] = useState<number | null>(null);
  const [sortBy, setSortBy]             = useState<SortField>('customer_name');
  const [sortDir, setSortDir]           = useState<SortDir>('asc');
  const [viewMode, setViewMode]         = useState<'table' | 'map'>('table');

  const toggleSort = (field: SortField) => {
    if (sortBy === field) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortBy(field);
      setSortDir('asc');
    }
    setPage(1);
  };

  // Table query — paginated, filtered, sorted
  const updateClusterMutation = useMutation({
    mutationFn: ({ id, cluster }: { id: number; cluster: string | null }) =>
      customersApi.update(id, { cluster }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['customers'] });
      setEditingClusterId(null);
    },
  });

  const { data, isLoading } = useQuery({
    queryKey: ['customers', page, search, perPage, coordsFilter, clusterFilter, sortBy, sortDir],
    queryFn: () => customersApi.list({
      page,
      search,
      per_page: perPage,
      has_coords: coordsFilter === 'all' ? undefined : coordsFilter,
      cluster_filter: clusterFilter === 'all' ? undefined : clusterFilter,
      sort_by: sortBy,
      sort_dir: sortDir,
    }),
    enabled: viewMode === 'table',
  });

  // Map query — all customers with coordinates, no pagination
  const { data: mapData, isLoading: mapLoading } = useQuery({
    queryKey: ['customers', 'map', search],
    queryFn: () => customersApi.list({ has_coords: '1', per_page: 9999, search }),
    enabled: viewMode === 'map' && isOwner,
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => customersApi.remove(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['customers'] }),
  });

  const bulkDeleteMutation = useMutation({
    mutationFn: (ids: number[]) => customersApi.bulkDelete(ids),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['customers'] });
      setSelectedIds(new Set());
    },
  });

  const deduplicateMutation = useMutation({
    mutationFn: () => customersApi.deduplicate(),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ['customers'] });
      const { deleted, groups } = res.data?.data ?? {};
      alert(deleted > 0
        ? `Removed ${deleted} duplicate(s) from ${groups} name group(s). The record with the most order history was kept.`
        : 'No duplicates found.'
      );
    },
  });

  const customers: Customer[] = data?.data?.data ?? [];
  const mapCustomers: Customer[] = mapData?.data?.data ?? [];
  const meta = data?.data ? {
    total: data.data.total,
    current_page: data.data.current_page,
    last_page: data.data.last_page,
  } : null;

  const handleEdit  = (c: Customer) => { setEditing(c); setShowForm(true); };
  const handleNew   = () => { setEditing(null); setShowForm(true); };
  const handleClose = () => { setShowForm(false); setEditing(null); };

  const allSelected = customers.length > 0 && customers.every((c) => selectedIds.has(c.id));
  const toggleAll = () =>
    setSelectedIds((prev) => {
      if (allSelected) return new Set();
      const next = new Set(prev);
      customers.forEach((c) => next.add(c.id));
      return next;
    });
  const toggleOne = (id: number) =>
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });

  const handleDeduplicate = () => {
    if (confirm('Find and remove duplicate customers by name? The record with the most order history is kept. This cannot be undone.')) {
      deduplicateMutation.mutate();
    }
  };

  return (
    <div className="p-4 md:p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-bold">Customers</h1>
          <p className="text-gray-500 text-sm">{meta?.total ?? 0} total customers</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {isOwner && (
            <Button
              variant="outline"
              onClick={handleDeduplicate}
              disabled={deduplicateMutation.isPending}
              title="Remove duplicate customers by name"
            >
              <Copy className="h-4 w-4" />
              {deduplicateMutation.isPending ? 'Removing...' : 'Remove Duplicates'}
            </Button>
          )}
          {isOwner && (
            <Button
              variant={viewMode === 'map' ? 'default' : 'outline'}
              onClick={() => setViewMode((m) => m === 'map' ? 'table' : 'map')}
            >
              {viewMode === 'map'
                ? <><TableIcon className="h-4 w-4" /> Table</>
                : <><Map className="h-4 w-4" /> Map View</>}
            </Button>
          )}
          <Button variant="outline" onClick={() => setShowImport(true)}><Upload className="h-4 w-4" /> Import</Button>
          <Button onClick={handleNew}><Plus className="h-4 w-4" /> Add Customer</Button>
        </div>
      </div>

      {/* Toolbar (only shown in table mode) */}
      {viewMode === 'table' && (
        <div className="flex flex-wrap gap-3 mb-4 items-center">
          <div className="relative flex-1 min-w-48 max-w-sm">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search by name, phone..."
              className="pl-9"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            />
          </div>

          {isOwner && (
            <div className="flex items-center gap-1 text-xs">
              <span className="text-gray-500 mr-1">Cluster:</span>
              {(['all', '1', '0'] as ClusterFilter[]).map((v) => (
                <button
                  key={v}
                  onClick={() => { setClusterFilter(v); setPage(1); }}
                  className={`px-2.5 py-1 rounded border font-medium transition-colors ${
                    clusterFilter === v
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'bg-white text-gray-600 border-gray-300 hover:border-blue-400'
                  }`}
                >
                  {v === 'all' ? 'All' : v === '1' ? 'Has Cluster' : 'No Cluster'}
                </button>
              ))}
            </div>
          )}

          <div className="flex items-center gap-1 text-xs">
            <span className="text-gray-500 mr-1">GPS:</span>
            {(['all', '1', '0'] as CoordsFilter[]).map((v) => (
              <button
                key={v}
                onClick={() => { setCoordsFilter(v); setPage(1); }}
                className={`px-2.5 py-1 rounded border font-medium transition-colors ${
                  coordsFilter === v
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-white text-gray-600 border-gray-300 hover:border-blue-400'
                }`}
              >
                {v === 'all' ? 'All' : v === '1' ? 'Has GPS' : 'No GPS'}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-1 text-xs">
            <span className="text-gray-500 mr-1">Show:</span>
            {([50, 100, 9999] as const).map((n) => (
              <button
                key={n}
                onClick={() => { setPerPage(n); setPage(1); }}
                className={`px-2.5 py-1 rounded border font-medium transition-colors ${
                  perPage === n
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-white text-gray-600 border-gray-300 hover:border-blue-400'
                }`}
              >
                {n === 9999 ? 'All' : n}
              </button>
            ))}
          </div>

          {selectedIds.size > 0 && (
            <Button
              variant="outline"
              className="text-red-500 hover:text-red-700"
              onClick={() => {
                if (confirm(`Delete ${selectedIds.size} selected customer(s)?`)) {
                  bulkDeleteMutation.mutate(Array.from(selectedIds));
                }
              }}
              disabled={bulkDeleteMutation.isPending}
            >
              <Trash2 className="h-4 w-4" /> Delete {selectedIds.size} selected
            </Button>
          )}
        </div>
      )}

      {/* Map view */}
      {viewMode === 'map' && isOwner && (
        <div className="bg-white rounded-lg border overflow-hidden mb-4">
          <div className="px-4 py-2 border-b bg-gray-50 flex items-center justify-between">
            <p className="text-sm text-gray-500">
              {mapLoading ? 'Loading...' : `${mapCustomers.length} customers with GPS coordinates`}
            </p>
            <div className="relative max-w-xs w-48">
              <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-gray-400" />
              <Input
                placeholder="Search..."
                className="pl-8 h-7 text-xs"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>
          {!mapLoading && (
            <CustomerMap customers={mapCustomers} onEdit={handleEdit} />
          )}
        </div>
      )}

      {/* Table view */}
      {viewMode === 'table' && (
        <>
          <div className="bg-white rounded-lg border overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-4 py-3 w-8">
                      <input type="checkbox" checked={allSelected} onChange={toggleAll} />
                    </th>
                    <th
                      className="text-left px-4 py-3 font-medium text-gray-600 cursor-pointer select-none hover:text-blue-600"
                      onClick={() => toggleSort('customer_name')}
                    >
                      Name <SortIcon field="customer_name" sortBy={sortBy} sortDir={sortDir} />
                    </th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Phone</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600 w-32">Address</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">VIP</th>
                    {isOwner && (
                      <th className="text-left px-4 py-3 font-medium text-gray-600 whitespace-nowrap">
                        Cluster
                      </th>
                    )}
                    <th
                      className="text-left px-4 py-3 font-medium text-gray-600 cursor-pointer select-none hover:text-blue-600 whitespace-nowrap"
                      onClick={() => toggleSort('default_latitude')}
                      title="Click once: most south first. Click twice: closest to equator first"
                    >
                      Latitude <SortIcon field="default_latitude" sortBy={sortBy} sortDir={sortDir} />
                    </th>
                    <th
                      className="text-left px-4 py-3 font-medium text-gray-600 cursor-pointer select-none hover:text-blue-600 whitespace-nowrap"
                      onClick={() => toggleSort('default_longitude')}
                      title="Click once: most west first. Click twice: most east first"
                    >
                      Longitude <SortIcon field="default_longitude" sortBy={sortBy} sortDir={sortDir} />
                    </th>
                    {isOwner && (
                      <th
                        className="text-right px-4 py-3 font-medium text-gray-600 cursor-pointer select-none hover:text-blue-600 whitespace-nowrap"
                        onClick={() => toggleSort('total_belanja')}
                        title="Sort by total order value"
                      >
                        Total Belanja <SortIcon field="total_belanja" sortBy={sortBy} sortDir={sortDir} />
                      </th>
                    )}
                    {isOwner && (
                      <th
                        className="text-right px-4 py-3 font-medium text-gray-600 cursor-pointer select-none hover:text-blue-600 whitespace-nowrap"
                        onClick={() => toggleSort('avg_belanja_per_month')}
                        title="Sort by average monthly spending"
                      >
                        Avg/Bulan <SortIcon field="avg_belanja_per_month" sortBy={sortBy} sortDir={sortDir} />
                      </th>
                    )}
                    <th className="text-right px-4 py-3 font-medium text-gray-600">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {isLoading ? (
                    <tr><td colSpan={isOwner ? 11 : 8} className="text-center py-8 text-gray-400">Loading...</td></tr>
                  ) : customers.length === 0 ? (
                    <tr><td colSpan={isOwner ? 11 : 8} className="text-center py-8 text-gray-400">No customers found</td></tr>
                  ) : customers.map((c) => (
                    <tr key={c.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <input type="checkbox" checked={selectedIds.has(c.id)} onChange={() => toggleOne(c.id)} />
                      </td>
                      <td className="px-4 py-3 font-medium">{c.customer_name}</td>
                      <td className="px-4 py-3 text-gray-600">{c.phone}</td>
                      <td className="px-4 py-3 text-gray-600 w-32 max-w-[8rem] truncate">{c.default_address}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${VIP_COLORS[c.vip_level]}`}>
                          {c.vip_level}
                        </span>
                      </td>
                      {isOwner && (
                        <td className="px-4 py-3 whitespace-nowrap">
                          {editingClusterId === c.id ? (
                            <select
                              autoFocus
                              defaultValue={c.cluster ?? ''}
                              className="text-xs border rounded px-1 py-0.5 focus:outline-none focus:ring-1 focus:ring-blue-400"
                              onBlur={() => setEditingClusterId(null)}
                              onChange={(e) => {
                                const val = e.target.value || null;
                                updateClusterMutation.mutate({ id: c.id, cluster: val });
                              }}
                            >
                              <option value="">— none —</option>
                              {CLUSTER_NAMES.map(n => (
                                <option key={n} value={n}>{n}</option>
                              ))}
                            </select>
                          ) : (
                            <button
                              className="text-left"
                              onClick={() => setEditingClusterId(c.id)}
                              title="Click to change cluster"
                            >
                              {c.cluster && c.cluster !== 'no cluster' ? (
                                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${CLUSTER_COLORS[c.cluster] ?? 'bg-gray-100 text-gray-700'}`}>
                                  {c.cluster}
                                </span>
                              ) : (
                                <span className="text-gray-400 text-xs italic">no cluster</span>
                              )}
                            </button>
                          )}
                        </td>
                      )}
                      <td className="px-4 py-3 font-mono text-xs text-gray-700 whitespace-nowrap">
                        {c.default_latitude != null ? c.default_latitude.toFixed(6) : <span className="text-gray-300">—</span>}
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-gray-700 whitespace-nowrap">
                        {c.default_longitude != null ? c.default_longitude.toFixed(6) : <span className="text-gray-300">—</span>}
                      </td>
                      {isOwner && (
                        <td className="px-4 py-3 text-right text-sm font-medium text-gray-800 whitespace-nowrap">
                          {c.total_belanja != null ? formatCurrency(c.total_belanja) : <span className="text-gray-300">—</span>}
                        </td>
                      )}
                      {isOwner && (
                        <td className="px-4 py-3 text-right text-sm text-gray-600 whitespace-nowrap">
                          {c.avg_belanja_per_month != null ? formatCurrency(Math.round(c.avg_belanja_per_month)) : <span className="text-gray-300">—</span>}
                        </td>
                      )}
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
          </div>

          {meta && meta.last_page > 1 && (
            <div className="flex justify-between items-center mt-4">
              <p className="text-sm text-gray-500">Page {meta.current_page} of {meta.last_page}</p>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>Previous</Button>
                <Button size="sm" variant="outline" disabled={page >= meta.last_page} onClick={() => setPage(p => p + 1)}>Next</Button>
              </div>
            </div>
          )}
        </>
      )}

      {showForm && <CustomerForm customer={editing} onClose={handleClose} />}
      {showImport && <CustomerImportDialog onClose={() => setShowImport(false)} />}
    </div>
  );
}

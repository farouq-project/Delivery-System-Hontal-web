'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminApi } from '@/lib/api';
import type { PlatformPlan } from '@/types';
import { Plus, Archive, RotateCcw, Copy, Pencil, Trash2 } from 'lucide-react';

const AVAILABLE_FEATURES: Record<string, string> = {
  executive_dashboard:    'Executive Dashboard',
  business_intelligence:  'Business Intelligence',
  customer_domain:        'Customer Intelligence',
  merchant_platform:      'Merchant Platform',
  tracking:               'Tracking',
  marketing:              'Marketing',
  api_access:             'API Access',
  priority_support:       'Priority Support',
};

function fmtIdr(n: number) {
  if (n === 0) return 'Custom';
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n);
}

interface PlanForm {
  name: string;
  slug: string;
  description: string;
  monthly_price: string;
  trial_days: string;
  delivery_limit: string;
  driver_limit: string;
  branch_limit: string;
  customer_limit: string;
  features: string[];
  is_active: boolean;
  display_order: string;
}

const emptyForm: PlanForm = {
  name: '', slug: '', description: '', monthly_price: '0',
  trial_days: '14', delivery_limit: '', driver_limit: '',
  branch_limit: '', customer_limit: '', features: [],
  is_active: true, display_order: '0',
};

function slugify(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

function formToPayload(f: PlanForm) {
  return {
    name:           f.name,
    slug:           f.slug,
    description:    f.description || null,
    monthly_price:  parseInt(f.monthly_price) || 0,
    trial_days:     parseInt(f.trial_days) || 14,
    delivery_limit: f.delivery_limit ? parseInt(f.delivery_limit) : null,
    driver_limit:   f.driver_limit   ? parseInt(f.driver_limit)   : null,
    branch_limit:   f.branch_limit   ? parseInt(f.branch_limit)   : null,
    customer_limit: f.customer_limit ? parseInt(f.customer_limit) : null,
    features:       f.features,
    is_active:      f.is_active,
    display_order:  parseInt(f.display_order) || 0,
  };
}

function planToForm(p: PlatformPlan): PlanForm {
  return {
    name:           p.name,
    slug:           p.slug,
    description:    p.description ?? '',
    monthly_price:  String(p.monthly_price),
    trial_days:     String(p.trial_days ?? 14),
    delivery_limit: p.delivery_limit ? String(p.delivery_limit) : '',
    driver_limit:   p.driver_limit   ? String(p.driver_limit)   : '',
    branch_limit:   p.branch_limit   ? String(p.branch_limit)   : '',
    customer_limit: p.customer_limit ? String(p.customer_limit) : '',
    features:       p.features ?? [],
    is_active:      p.is_active,
    display_order:  String(p.display_order),
  };
}

export default function AdminPlansPage() {
  const qc = useQueryClient();
  const [showArchived, setShowArchived] = useState(false);
  const [modalMode, setModalMode]       = useState<'create' | 'edit' | null>(null);
  const [editingPlan, setEditingPlan]   = useState<PlatformPlan | null>(null);
  const [form, setForm]                 = useState<PlanForm>(emptyForm);
  const [error, setError]               = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'plans', showArchived],
    queryFn: () => adminApi.listPlans(showArchived ? { archived: 1 } : undefined),
    staleTime: 60_000,
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: ['admin', 'plans'] });

  const createMutation = useMutation({
    mutationFn: (data: Record<string, unknown>) => adminApi.createPlan(data),
    onSuccess: () => { invalidate(); setModalMode(null); setForm(emptyForm); },
    onError: (e: unknown) => setError((e as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Failed.'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Record<string, unknown> }) => adminApi.updatePlan(id, data),
    onSuccess: () => { invalidate(); setModalMode(null); setEditingPlan(null); },
    onError: (e: unknown) => setError((e as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Failed.'),
  });

  const duplicateMutation = useMutation({
    mutationFn: (id: number) => adminApi.duplicatePlan(id),
    onSuccess: () => invalidate(),
  });

  const archiveMutation = useMutation({
    mutationFn: (id: number) => adminApi.archivePlan(id),
    onSuccess: () => invalidate(),
  });

  const restoreMutation = useMutation({
    mutationFn: (id: number) => adminApi.restorePlan(id),
    onSuccess: () => invalidate(),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => adminApi.deletePlan(id),
    onSuccess: () => invalidate(),
    onError: (e: unknown) => alert((e as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Cannot delete.'),
  });

  const plans: PlatformPlan[] = data?.data?.data ?? [];

  const openCreate = () => { setForm(emptyForm); setEditingPlan(null); setError(''); setModalMode('create'); };
  const openEdit = (p: PlatformPlan) => { setForm(planToForm(p)); setEditingPlan(p); setError(''); setModalMode('edit'); };

  const handleSubmit = () => {
    const payload = formToPayload(form);
    if (!payload.name || !payload.slug) { setError('Name and slug are required.'); return; }
    if (modalMode === 'create') createMutation.mutate(payload as Record<string, unknown>);
    else if (editingPlan) updateMutation.mutate({ id: editingPlan.id, data: payload as Record<string, unknown> });
  };

  const toggleFeature = (key: string) => {
    setForm((prev) => ({
      ...prev,
      features: prev.features.includes(key)
        ? prev.features.filter((f) => f !== key)
        : [...prev.features, key],
    }));
  };

  return (
    <div className="p-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Platform Plans</h1>
          <p className="text-sm text-gray-500 mt-1">Subscription tiers available to merchants</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowArchived(!showArchived)}
            className={`px-3 py-2 text-sm rounded-md border transition-colors ${showArchived ? 'bg-gray-800 text-white border-gray-800' : 'border-gray-300 text-gray-700 hover:bg-gray-50'}`}
          >
            {showArchived ? 'Archived' : 'Active'}
          </button>
          <button
            onClick={openCreate}
            className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium bg-emerald-600 text-white rounded-md hover:bg-emerald-700"
          >
            <Plus className="h-4 w-4" />
            New Plan
          </button>
        </div>
      </div>

      {isLoading ? (
        <p className="text-sm text-gray-400">Loading plans…</p>
      ) : plans.length === 0 ? (
        <p className="text-sm text-gray-400">{showArchived ? 'No archived plans.' : 'No plans. Create your first plan.'}</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4">
          {plans.map((plan) => (
            <div
              key={plan.id}
              className={`bg-white border rounded-lg p-5 shadow-sm flex flex-col ${
                plan.deleted_at ? 'border-dashed border-gray-300 opacity-70' : plan.is_active ? 'border-gray-200' : 'border-dashed border-gray-300 opacity-80'
              }`}
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-gray-900">{plan.name}</p>
                  <p className="text-xs text-gray-400">{plan.slug}</p>
                </div>
                <div className="flex flex-col items-end gap-1 ml-2 shrink-0">
                  {!plan.is_active && !plan.deleted_at && (
                    <span className="text-[10px] font-semibold text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">Inactive</span>
                  )}
                  {plan.deleted_at && (
                    <span className="text-[10px] font-semibold text-orange-600 bg-orange-50 px-1.5 py-0.5 rounded">Archived</span>
                  )}
                </div>
              </div>
              {plan.description && <p className="text-xs text-gray-500 mb-3">{plan.description}</p>}
              <p className="text-2xl font-bold text-emerald-600 mb-3">
                {fmtIdr(plan.monthly_price)}
                {plan.monthly_price > 0 && <span className="text-sm font-normal text-gray-400">/mo</span>}
              </p>
              <ul className="space-y-1 text-xs text-gray-600 mb-3 flex-1">
                <li><span className="font-medium">{plan.trial_days ?? 14}</span> day trial</li>
                <li><span className="font-medium">{plan.delivery_limit?.toLocaleString() ?? 'Unlimited'}</span> deliveries/mo</li>
                <li><span className="font-medium">{plan.branch_limit ?? 'Unlimited'}</span> branches</li>
                <li><span className="font-medium">{plan.driver_limit ?? 'Unlimited'}</span> drivers</li>
                <li><span className="font-medium">{plan.customer_limit ?? 'Unlimited'}</span> customers</li>
              </ul>
              {typeof plan.subscriber_count === 'number' && (
                <p className="text-xs text-gray-400 mb-3 pt-2 border-t border-gray-100">
                  {plan.subscriber_count} active subscriber{plan.subscriber_count !== 1 ? 's' : ''}
                </p>
              )}
              <div className="flex flex-wrap gap-1.5 pt-2 border-t border-gray-100">
                {!plan.deleted_at && (
                  <>
                    <button onClick={() => openEdit(plan)} className="flex items-center gap-1 px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded hover:bg-gray-200">
                      <Pencil className="h-3 w-3" /> Edit
                    </button>
                    <button onClick={() => duplicateMutation.mutate(plan.id)} disabled={duplicateMutation.isPending} className="flex items-center gap-1 px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded hover:bg-gray-200 disabled:opacity-50">
                      <Copy className="h-3 w-3" /> Copy
                    </button>
                    <button onClick={() => { if (confirm('Archive this plan?')) archiveMutation.mutate(plan.id); }} disabled={archiveMutation.isPending} className="flex items-center gap-1 px-2 py-1 text-xs bg-orange-50 text-orange-700 border border-orange-200 rounded hover:bg-orange-100 disabled:opacity-50">
                      <Archive className="h-3 w-3" /> Archive
                    </button>
                    {(plan.subscriber_count ?? 0) === 0 && (
                      <button onClick={() => { if (confirm('Permanently delete? This cannot be undone.')) deleteMutation.mutate(plan.id); }} disabled={deleteMutation.isPending} className="flex items-center gap-1 px-2 py-1 text-xs bg-red-50 text-red-700 border border-red-200 rounded hover:bg-red-100 disabled:opacity-50">
                        <Trash2 className="h-3 w-3" /> Delete
                      </button>
                    )}
                  </>
                )}
                {plan.deleted_at && (
                  <button onClick={() => restoreMutation.mutate(plan.id)} disabled={restoreMutation.isPending} className="flex items-center gap-1 px-2 py-1 text-xs bg-emerald-50 text-emerald-700 border border-emerald-200 rounded hover:bg-emerald-100 disabled:opacity-50">
                    <RotateCcw className="h-3 w-3" /> Restore
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create / Edit modal */}
      {modalMode && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setModalMode(null)}>
          <div className="bg-white rounded-lg border border-gray-200 shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto p-6" onClick={(e) => e.stopPropagation()}>
            <p className="font-bold text-gray-900 text-lg mb-5">{modalMode === 'create' ? 'New Plan' : `Edit — ${editingPlan?.name}`}</p>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Name *</label>
                  <input
                    value={form.name}
                    onChange={(e) => setForm((f) => ({ ...f, name: e.target.value, slug: slugify(e.target.value) }))}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                    placeholder="Starter"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Slug *</label>
                  <input
                    value={form.slug}
                    onChange={(e) => setForm((f) => ({ ...f, slug: e.target.value }))}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm font-mono"
                    placeholder="starter"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Description</label>
                <input
                  value={form.description}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                  placeholder="Short description…"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Monthly Price (IDR)</label>
                  <input type="number" min={0} value={form.monthly_price} onChange={(e) => setForm((f) => ({ ...f, monthly_price: e.target.value }))} className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Trial Days</label>
                  <input type="number" min={0} value={form.trial_days} onChange={(e) => setForm((f) => ({ ...f, trial_days: e.target.value }))} className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm" />
                </div>
              </div>
              <p className="text-xs font-semibold text-gray-700 mt-2">Limits (blank = unlimited)</p>
              <div className="grid grid-cols-2 gap-3">
                {[
                  ['Deliveries/mo', 'delivery_limit'],
                  ['Drivers', 'driver_limit'],
                  ['Branches', 'branch_limit'],
                  ['Customers', 'customer_limit'],
                ].map(([label, key]) => (
                  <div key={key}>
                    <label className="block text-xs font-medium text-gray-700 mb-1">{label}</label>
                    <input
                      type="number"
                      min={1}
                      value={form[key as keyof PlanForm] as string}
                      onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                      placeholder="Unlimited"
                    />
                  </div>
                ))}
              </div>
              <div>
                <p className="text-xs font-semibold text-gray-700 mb-2">Features included in plan</p>
                <div className="grid grid-cols-2 gap-2">
                  {Object.entries(AVAILABLE_FEATURES).map(([key, label]) => (
                    <label key={key} className="flex items-center gap-2 text-sm cursor-pointer">
                      <input type="checkbox" checked={form.features.includes(key)} onChange={() => toggleFeature(key)} className="rounded" />
                      {label}
                    </label>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Display Order</label>
                  <input type="number" min={0} value={form.display_order} onChange={(e) => setForm((f) => ({ ...f, display_order: e.target.value }))} className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm" />
                </div>
                <div className="flex items-end pb-2">
                  <label className="flex items-center gap-2 text-sm cursor-pointer">
                    <input type="checkbox" checked={form.is_active} onChange={(e) => setForm((f) => ({ ...f, is_active: e.target.checked }))} className="rounded" />
                    Active (visible to merchants)
                  </label>
                </div>
              </div>
              {error && <p className="text-xs text-red-600">{error}</p>}
            </div>
            <div className="flex gap-2 mt-5">
              <button onClick={() => setModalMode(null)} className="flex-1 py-2 border border-gray-300 rounded-md text-sm text-gray-700">Cancel</button>
              <button
                onClick={handleSubmit}
                disabled={createMutation.isPending || updateMutation.isPending}
                className="flex-1 py-2 bg-emerald-600 text-white rounded-md text-sm font-medium hover:bg-emerald-700 disabled:opacity-50"
              >
                {(createMutation.isPending || updateMutation.isPending) ? 'Saving…' : modalMode === 'create' ? 'Create Plan' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminApi } from '@/lib/api';
import type { MerchantApplication, ApplicationStatus } from '@/types';
import { CheckCircle, XCircle, AlertCircle, Info, FileText, Plus, Pencil } from 'lucide-react';

const STATUS_CHIP: Record<ApplicationStatus, string> = {
  pending:   'bg-amber-100 text-amber-800',
  review:    'bg-blue-100 text-blue-800',
  approved:  'bg-emerald-100 text-emerald-700',
  rejected:  'bg-red-100 text-red-700',
  cancelled: 'bg-gray-100 text-gray-500',
  converted: 'bg-green-100 text-green-700',
};

const TYPE_CHIP: Record<string, string> = {
  sistem: 'bg-indigo-50 text-indigo-700',
  kirim:  'bg-orange-50 text-orange-700',
};

interface ApprovalResult {
  merchant_name: string;
  user_email: string;
  temp_password: string;
  plan: string | null;
  trial_ends_at: string | null;
  merchant_type?: string;
}

// ── Add Application Modal ───────────────────────────────────────────────────

function AddApplicationModal({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient();
  const [form, setForm] = useState({
    company_name: '', owner_name: '', email: '', phone: '',
    city: '', business_type: '', estimated_monthly_deliveries: '',
    selected_plan: '', notes: '',
    merchant_type_requested: 'sistem' as 'sistem' | 'kirim',
    status: 'pending' as 'pending' | 'converted',
  });
  const [error, setError] = useState('');

  const mutation = useMutation({
    mutationFn: () => adminApi.createApplication({
      ...form,
      estimated_monthly_deliveries: form.estimated_monthly_deliveries ? parseInt(form.estimated_monthly_deliveries) : undefined,
    }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin', 'applications'] }); onClose(); },
    onError: (e: unknown) => {
      const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Failed to create application';
      setError(msg);
    },
  });

  const f = (label: string, key: keyof typeof form, placeholder?: string, type = 'text') => (
    <div className="space-y-1">
      <label className="block text-xs font-medium text-gray-700">{label}</label>
      <input type={type} placeholder={placeholder} value={form[key] as string}
        onChange={(e) => setForm((p) => ({ ...p, [key]: e.target.value }))}
        className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm" />
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="bg-white rounded-lg border border-gray-200 shadow-xl w-full max-w-lg p-6 overflow-y-auto max-h-[90vh]" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <p className="font-bold text-gray-900 text-lg">Add Application</p>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl">&times;</button>
        </div>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            {f('Company Name *', 'company_name', 'PT Maju Jaya')}
            {f('Owner Name *', 'owner_name', 'Budi Santoso')}
            {f('Email *', 'email', 'owner@company.com', 'email')}
            {f('Phone', 'phone', '08123456789')}
            {f('City', 'city', 'Bandung')}
            {f('Business Type', 'business_type', 'Distributor Sembako')}
            {f('Est. Deliveries/Mo', 'estimated_monthly_deliveries', '200', 'number')}
            {f('Preferred Plan', 'selected_plan', 'starter')}
          </div>
          <div className="space-y-1">
            <label className="block text-xs font-medium text-gray-700">Merchant Type</label>
            <div className="grid grid-cols-2 gap-2">
              {(['sistem', 'kirim'] as const).map((t) => (
                <button key={t} type="button"
                  onClick={() => setForm((p) => ({ ...p, merchant_type_requested: t }))}
                  className={`px-3 py-2 text-sm border rounded-lg font-medium transition-colors ${form.merchant_type_requested === t ? (t === 'kirim' ? 'bg-orange-500 text-white border-orange-500' : 'bg-indigo-600 text-white border-indigo-600') : 'border-gray-200 text-gray-600 hover:border-gray-300'}`}
                >
                  {t === 'sistem' ? 'Sistem (own dispatch)' : 'Kirim (pooled delivery)'}
                </button>
              ))}
            </div>
          </div>
          <div className="space-y-1">
            <label className="block text-xs font-medium text-gray-700">Initial Status</label>
            <select value={form.status} onChange={(e) => setForm((p) => ({ ...p, status: e.target.value as 'pending' | 'converted' }))}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm">
              <option value="pending">Pending (new application)</option>
              <option value="converted">Converted (retrospective — merchant already exists)</option>
            </select>
          </div>
          <div className="space-y-1">
            <label className="block text-xs font-medium text-gray-700">Notes</label>
            <textarea value={form.notes} onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))}
              rows={2} placeholder="Any notes from the applicant…"
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm" />
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div className="flex gap-2 pt-2">
            <button onClick={onClose} className="flex-1 py-2 border border-gray-300 rounded-md text-sm text-gray-700 hover:bg-gray-50">Cancel</button>
            <button onClick={() => mutation.mutate()} disabled={!form.company_name || !form.owner_name || !form.email || mutation.isPending}
              className="flex-1 py-2 bg-gray-900 text-white rounded-md text-sm font-medium hover:bg-gray-800 disabled:opacity-50">
              {mutation.isPending ? 'Creating…' : 'Create Application'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Detail / Edit Modal ─────────────────────────────────────────────────────

function DetailModal({
  app,
  onClose,
  onApprove,
  onApproveKirim,
  onReject,
  onRequestInfo,
  approveLoading,
  approveKirimLoading,
}: {
  app: MerchantApplication;
  onClose: () => void;
  onApprove: () => void;
  onApproveKirim: () => void;
  onReject: () => void;
  onRequestInfo: () => void;
  approveLoading: boolean;
  approveKirimLoading: boolean;
}) {
  const qc = useQueryClient();
  const [editMode, setEditMode]   = useState(false);
  const [editData, setEditData]   = useState<Record<string, string>>({});
  const [notesText, setNotesText] = useState(app.internal_notes ?? '');
  const [notesEdit, setNotesEdit] = useState(false);

  const isActionable = app.status === 'pending' || app.status === 'review';

  const updateMutation = useMutation({
    mutationFn: () => adminApi.updateApplication(app.id, editData),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin', 'applications'] }); setEditMode(false); },
  });

  const notesMutation = useMutation({
    mutationFn: () => adminApi.updateApplicationNotes(app.id, notesText),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin', 'applications'] }); setNotesEdit(false); },
  });

  const startEdit = () => {
    setEditData({
      company_name: app.company_name,
      owner_name: app.owner_name,
      email: app.email,
      phone: app.phone ?? '',
      city: app.city ?? '',
      business_type: app.business_type ?? '',
      estimated_monthly_deliveries: app.estimated_monthly_deliveries?.toString() ?? '',
      selected_plan: app.selected_plan ?? '',
      merchant_type_requested: app.merchant_type_requested ?? 'sistem',
      notes: app.notes ?? '',
    });
    setEditMode(true);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="bg-white rounded-lg border border-gray-200 shadow-xl w-full max-w-lg p-6 overflow-y-auto max-h-[90vh]" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between mb-4">
          <div>
            <p className="font-bold text-gray-900 text-lg">{app.company_name}</p>
            <div className="flex items-center gap-2 mt-1">
              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_CHIP[app.status]}`}>{app.status}</span>
              {app.merchant_type_requested && (
                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${TYPE_CHIP[app.merchant_type_requested] ?? 'bg-gray-100 text-gray-500'}`}>
                  {app.merchant_type_requested}
                </span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {isActionable && !editMode && (
              <button onClick={startEdit} className="p-1.5 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-700">
                <Pencil className="h-4 w-4" />
              </button>
            )}
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">&times;</button>
          </div>
        </div>

        {editMode ? (
          <div className="space-y-3 mb-4">
            {[
              ['Company Name', 'company_name'],
              ['Owner Name', 'owner_name'],
              ['Email', 'email'],
              ['Phone', 'phone'],
              ['City', 'city'],
              ['Business Type', 'business_type'],
              ['Est. Deliveries/Mo', 'estimated_monthly_deliveries'],
              ['Preferred Plan', 'selected_plan'],
            ].map(([label, key]) => (
              <div key={key} className="space-y-1">
                <label className="block text-xs font-medium text-gray-700">{label}</label>
                <input value={editData[key] ?? ''} onChange={(e) => setEditData((p) => ({ ...p, [key]: e.target.value }))}
                  className="w-full border border-gray-300 rounded-md px-3 py-1.5 text-sm" />
              </div>
            ))}
            <div className="space-y-1">
              <label className="block text-xs font-medium text-gray-700">Merchant Type</label>
              <select value={editData.merchant_type_requested ?? 'sistem'}
                onChange={(e) => setEditData((p) => ({ ...p, merchant_type_requested: e.target.value }))}
                className="w-full border border-gray-300 rounded-md px-3 py-1.5 text-sm">
                <option value="sistem">Sistem</option>
                <option value="kirim">Kirim</option>
              </select>
            </div>
            <div className="flex gap-2 pt-1">
              <button onClick={() => setEditMode(false)} className="flex-1 py-1.5 border border-gray-300 rounded text-sm text-gray-700 hover:bg-gray-50">Cancel</button>
              <button onClick={() => updateMutation.mutate()} disabled={updateMutation.isPending}
                className="flex-1 py-1.5 bg-gray-900 text-white rounded text-sm hover:bg-gray-800 disabled:opacity-50">
                {updateMutation.isPending ? 'Saving…' : 'Save'}
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-2 text-sm mb-4">
            {([
              ['Owner', app.owner_name],
              ['Email', app.email],
              ['Phone', app.phone],
              ['City', app.city ?? '—'],
              ['Business type', app.business_type ?? '—'],
              ['Branches', app.branch_count?.toString() ?? '—'],
              ['Est. deliveries/mo', app.estimated_monthly_deliveries?.toString() ?? '—'],
              ['Selected plan', app.selected_plan ?? '—'],
              ['Merchant type', app.merchant_type_requested ?? '—'],
              ['Submitted', app.created_at.slice(0, 10)],
            ] as [string, string | null | undefined][]).map(([l, v]) => (
              <div key={l} className="flex gap-3">
                <span className="w-36 shrink-0 text-gray-500">{l}</span>
                <span className="text-gray-900">{v ?? '—'}</span>
              </div>
            ))}
            {app.notes && (
              <div className="pt-2">
                <p className="text-gray-500 mb-1">Applicant notes</p>
                <p className="text-gray-700 bg-gray-50 rounded p-2 text-xs">{app.notes}</p>
              </div>
            )}
            {app.rejection_reason && (
              <div className="pt-2">
                <p className="text-gray-500 mb-1">Rejection reason</p>
                <p className="text-red-700 bg-red-50 rounded p-2 text-xs">{app.rejection_reason}</p>
              </div>
            )}
          </div>
        )}

        {/* Internal notes */}
        <div className="pt-3 border-t border-gray-100">
          <p className="text-xs font-medium text-gray-700 mb-1">Internal Notes (super admin only)</p>
          {notesEdit ? (
            <div className="space-y-2">
              <textarea value={notesText} onChange={(e) => setNotesText(e.target.value)} rows={3}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm" />
              <div className="flex gap-2">
                <button onClick={() => setNotesEdit(false)} className="flex-1 py-1.5 border border-gray-300 rounded text-sm text-gray-700 hover:bg-gray-50">Cancel</button>
                <button onClick={() => notesMutation.mutate()} disabled={notesMutation.isPending}
                  className="flex-1 py-1.5 bg-gray-900 text-white rounded text-sm hover:bg-gray-800 disabled:opacity-50">
                  {notesMutation.isPending ? 'Saving…' : 'Save'}
                </button>
              </div>
            </div>
          ) : (
            <div className="bg-gray-50 rounded p-2 text-xs text-gray-700 cursor-pointer hover:bg-gray-100"
              onClick={() => setNotesEdit(true)}>
              {notesText || <span className="text-gray-400">Click to add internal notes…</span>}
            </div>
          )}
        </div>

        {/* Action buttons */}
        {isActionable && !editMode && (
          <div className="pt-4 border-t border-gray-100 mt-4 space-y-2">
            <p className="text-xs text-gray-500 font-medium mb-2">Approve as:</p>
            <div className="flex gap-2">
              <button onClick={onApprove} disabled={approveLoading}
                className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-indigo-600 text-white rounded-md text-sm font-medium hover:bg-indigo-700 disabled:opacity-50">
                <CheckCircle className="h-4 w-4" />
                {approveLoading ? 'Approving…' : 'Sistem Merchant'}
              </button>
              <button onClick={onApproveKirim} disabled={approveKirimLoading}
                className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-orange-500 text-white rounded-md text-sm font-medium hover:bg-orange-600 disabled:opacity-50">
                <CheckCircle className="h-4 w-4" />
                {approveKirimLoading ? 'Approving…' : 'Kirim Merchant'}
              </button>
            </div>
            <div className="flex gap-2">
              {app.status === 'pending' && (
                <button onClick={onRequestInfo}
                  className="flex-1 flex items-center justify-center gap-1 py-2 text-sm font-medium bg-blue-50 text-blue-700 border border-blue-200 rounded-md hover:bg-blue-100">
                  <Info className="h-4 w-4" /> Request Info
                </button>
              )}
              <button onClick={onReject}
                className="flex-1 flex items-center justify-center gap-1 py-2 text-sm font-medium bg-red-50 text-red-700 border border-red-200 rounded-md hover:bg-red-100">
                <XCircle className="h-4 w-4" /> Reject
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main page ───────────────────────────────────────────────────────────────

export default function AdminApplicationsPage() {
  const qc = useQueryClient();
  const [page, setPage]               = useState(1);
  const [statusFilter, setFilter]     = useState('');
  const [search, setSearch]           = useState('');
  const [selected, setSelected]       = useState<MerchantApplication | null>(null);
  const [approvalResult, setApprovalResult] = useState<ApprovalResult | null>(null);
  const [rejectModal, setRejectModal] = useState<MerchantApplication | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [requestInfoModal, setRequestInfoModal] = useState<MerchantApplication | null>(null);
  const [requestInfoNotes, setRequestInfoNotes] = useState('');
  const [addModal, setAddModal]       = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'applications', page, statusFilter, search],
    queryFn: () => adminApi.listApplications({
      page,
      status: statusFilter || undefined,
      search: search || undefined,
      per_page: 25,
    }),
    staleTime: 30_000,
  });

  const approveMutation = useMutation({
    mutationFn: (id: number) => adminApi.approveApplication(id),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ['admin', 'applications'] });
      setApprovalResult(res.data.data);
      setSelected(null);
    },
  });

  const approveKirimMutation = useMutation({
    mutationFn: (id: number) => adminApi.approveApplicationAsKirim(id),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ['admin', 'applications'] });
      setApprovalResult(res.data.data);
      setSelected(null);
    },
  });

  const rejectMutation = useMutation({
    mutationFn: ({ id, reason }: { id: number; reason: string }) =>
      adminApi.rejectApplication(id, reason),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'applications'] });
      setRejectModal(null);
      setRejectReason('');
    },
  });

  const requestInfoMutation = useMutation({
    mutationFn: ({ id, notes }: { id: number; notes?: string }) =>
      adminApi.requestInfoApplication(id, notes),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'applications'] });
      setRequestInfoModal(null);
      setRequestInfoNotes('');
    },
  });

  const apps: MerchantApplication[] = data?.data?.data ?? [];
  const lastPage = data?.data?.last_page ?? 1;

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Applications</h1>
          <p className="text-sm text-gray-500 mt-1">Prospective merchant sign-up requests</p>
        </div>
        <button onClick={() => setAddModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-gray-900 text-white rounded-lg text-sm font-medium hover:bg-gray-800">
          <Plus className="h-4 w-4" /> Add Application
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-3 mb-4">
        <input
          type="text"
          placeholder="Search company, owner, email…"
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          className="border border-gray-300 rounded-md px-3 py-2 text-sm w-64"
        />
        <select
          value={statusFilter}
          onChange={(e) => { setFilter(e.target.value); setPage(1); }}
          className="border border-gray-300 rounded-md px-3 py-2 text-sm"
        >
          <option value="">All statuses</option>
          {['pending', 'review', 'converted', 'approved', 'rejected', 'cancelled'].map((s) => (
            <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
          ))}
        </select>
      </div>

      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-bold text-gray-700">Company</th>
                <th className="px-4 py-3 text-left text-xs font-bold text-gray-700">Owner</th>
                <th className="px-4 py-3 text-left text-xs font-bold text-gray-700">Plan</th>
                <th className="px-4 py-3 text-left text-xs font-bold text-gray-700">Type</th>
                <th className="px-4 py-3 text-left text-xs font-bold text-gray-700">Status</th>
                <th className="px-4 py-3 text-left text-xs font-bold text-gray-700">Received</th>
                <th className="px-4 py-3 text-right text-xs font-bold text-gray-700">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {isLoading && (
                <tr><td colSpan={7} className="px-4 py-6 text-center text-gray-400">Loading…</td></tr>
              )}
              {!isLoading && apps.length === 0 && (
                <tr><td colSpan={7} className="px-4 py-6 text-center text-gray-400">No applications found.</td></tr>
              )}
              {apps.map((app) => (
                <tr key={app.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <p className="font-semibold text-gray-900">{app.company_name}</p>
                    <p className="text-xs text-gray-500">{app.city ?? '—'}</p>
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-gray-800">{app.owner_name}</p>
                    <p className="text-xs text-gray-500">{app.email}</p>
                  </td>
                  <td className="px-4 py-3 text-gray-600">{app.selected_plan ?? '—'}</td>
                  <td className="px-4 py-3">
                    {app.merchant_type_requested ? (
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${TYPE_CHIP[app.merchant_type_requested] ?? 'bg-gray-100 text-gray-500'}`}>
                        {app.merchant_type_requested}
                      </span>
                    ) : <span className="text-gray-400">—</span>}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_CHIP[app.status]}`}>
                      {app.status}
                    </span>
                    {app.internal_notes && (
                      <p className="text-xs text-blue-600 mt-0.5 truncate max-w-[140px]" title={app.internal_notes}>📝 note</p>
                    )}
                  </td>
                  <td className="px-4 py-3 text-gray-500 text-xs">{app.created_at.slice(0, 10)}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1.5">
                      <button onClick={() => setSelected(app)}
                        className="px-2.5 py-1.5 text-xs font-medium bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200">
                        <FileText className="h-3.5 w-3.5" />
                      </button>
                      {(app.status === 'pending' || app.status === 'review') && (
                        <>
                          <button onClick={() => { setSelected(app); }}
                            disabled={approveMutation.isPending}
                            title="Approve as Sistem"
                            className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50">
                            <CheckCircle className="h-3.5 w-3.5" />
                          </button>
                          <button onClick={() => { setSelected(app); }}
                            disabled={approveKirimMutation.isPending}
                            title="Approve as Kirim"
                            className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium bg-orange-500 text-white rounded-md hover:bg-orange-600 disabled:opacity-50">
                            <CheckCircle className="h-3.5 w-3.5" />
                          </button>
                          <button onClick={() => { setRejectModal(app); setRejectReason(''); }}
                            className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium bg-red-50 text-red-700 border border-red-200 rounded-md hover:bg-red-100">
                            <XCircle className="h-3.5 w-3.5" />
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {lastPage > 1 && (
          <div className="px-4 py-3 border-t border-gray-100 flex items-center gap-2 justify-end">
            <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} className="px-3 py-1.5 text-sm border border-gray-300 rounded-md disabled:opacity-40">Previous</button>
            <span className="text-sm text-gray-500">Page {page} of {lastPage}</span>
            <button onClick={() => setPage((p) => Math.min(lastPage, p + 1))} disabled={page === lastPage} className="px-3 py-1.5 text-sm border border-gray-300 rounded-md disabled:opacity-40">Next</button>
          </div>
        )}
      </div>

      {/* Detail / Edit Modal */}
      {selected && (
        <DetailModal
          app={selected}
          onClose={() => setSelected(null)}
          onApprove={() => approveMutation.mutate(selected.id)}
          onApproveKirim={() => approveKirimMutation.mutate(selected.id)}
          onReject={() => { setRejectModal(selected); setSelected(null); }}
          onRequestInfo={() => { setRequestInfoModal(selected); setSelected(null); }}
          approveLoading={approveMutation.isPending}
          approveKirimLoading={approveKirimMutation.isPending}
        />
      )}

      {/* Add Application */}
      {addModal && <AddApplicationModal onClose={() => setAddModal(false)} />}

      {/* Approval success */}
      {approvalResult && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-lg border border-gray-200 shadow-xl w-full max-w-md p-6">
            <div className="flex items-center gap-3 mb-4">
              <CheckCircle className="h-7 w-7 text-emerald-600 shrink-0" />
              <div>
                <p className="font-bold text-gray-900 text-lg">Merchant Provisioned</p>
                <p className="text-sm text-gray-500">{approvalResult.merchant_name} · {approvalResult.merchant_type ?? 'sistem'}</p>
              </div>
            </div>
            <div className="bg-gray-50 rounded-md p-4 space-y-2 text-sm mb-5">
              <div className="flex justify-between"><span className="text-gray-500">Login email</span><span className="font-medium text-gray-900">{approvalResult.user_email}</span></div>
              <div className="flex justify-between items-center">
                <span className="text-gray-500">Temp password</span>
                <code className="font-mono font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded">{approvalResult.temp_password}</code>
              </div>
              {approvalResult.plan && <div className="flex justify-between"><span className="text-gray-500">Plan</span><span className="font-medium">{approvalResult.plan}</span></div>}
              {approvalResult.trial_ends_at && <div className="flex justify-between"><span className="text-gray-500">Trial ends</span><span className="font-medium">{approvalResult.trial_ends_at}</span></div>}
            </div>
            <div className="flex items-start gap-2 mb-5 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-md p-3">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              Share these credentials securely. The password cannot be retrieved again.
            </div>
            <button onClick={() => setApprovalResult(null)} className="w-full py-2.5 bg-gray-900 text-white rounded-md text-sm font-medium hover:bg-gray-800">Done</button>
          </div>
        </div>
      )}

      {/* Reject modal */}
      {rejectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-lg border border-gray-200 shadow-xl w-full max-w-sm p-6">
            <p className="font-bold text-gray-900 mb-1">Reject application</p>
            <p className="text-sm text-gray-500 mb-4">{rejectModal.company_name}</p>
            <label className="block text-xs font-medium text-gray-700 mb-1">Rejection reason <span className="text-red-500">*</span></label>
            <textarea value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} rows={3}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm mb-4"
              placeholder="Explain why this application is being rejected…" />
            <div className="flex gap-2">
              <button onClick={() => setRejectModal(null)} className="flex-1 py-2 border border-gray-300 rounded-md text-sm text-gray-700 hover:bg-gray-50">Cancel</button>
              <button onClick={() => rejectMutation.mutate({ id: rejectModal.id, reason: rejectReason })}
                disabled={rejectMutation.isPending || !rejectReason.trim()}
                className="flex-1 py-2 bg-red-600 text-white rounded-md text-sm font-medium hover:bg-red-700 disabled:opacity-50">
                {rejectMutation.isPending ? 'Rejecting…' : 'Reject'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Request Info modal */}
      {requestInfoModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-lg border border-gray-200 shadow-xl w-full max-w-sm p-6">
            <p className="font-bold text-gray-900 mb-1">Request more information</p>
            <p className="text-sm text-gray-500 mb-4">{requestInfoModal.company_name}</p>
            <label className="block text-xs font-medium text-gray-700 mb-1">Internal note (optional)</label>
            <textarea value={requestInfoNotes} onChange={(e) => setRequestInfoNotes(e.target.value)} rows={3}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm mb-4"
              placeholder="What info is needed…" />
            <div className="flex gap-2">
              <button onClick={() => setRequestInfoModal(null)} className="flex-1 py-2 border border-gray-300 rounded-md text-sm text-gray-700 hover:bg-gray-50">Cancel</button>
              <button onClick={() => requestInfoMutation.mutate({ id: requestInfoModal.id, notes: requestInfoNotes || undefined })}
                disabled={requestInfoMutation.isPending}
                className="flex-1 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
                {requestInfoMutation.isPending ? 'Sending…' : 'Move to Review'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

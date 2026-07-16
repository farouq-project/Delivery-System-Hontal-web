'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminApi } from '@/lib/api';
import type { MerchantApplication, ApplicationStatus } from '@/types';
import { CheckCircle, XCircle, AlertCircle, Info, FileText } from 'lucide-react';

const STATUS_CHIP: Record<ApplicationStatus, string> = {
  pending:   'bg-amber-100 text-amber-800',
  review:    'bg-blue-100 text-blue-800',
  approved:  'bg-emerald-100 text-emerald-700',
  rejected:  'bg-red-100 text-red-700',
  cancelled: 'bg-gray-100 text-gray-500',
  converted: 'bg-green-100 text-green-700',
};

interface ApprovalResult {
  merchant_name: string;
  user_email: string;
  temp_password: string;
  plan: string | null;
  trial_ends_at: string | null;
}

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
  const [notesApp, setNotesApp]       = useState<MerchantApplication | null>(null);
  const [notesText, setNotesText]     = useState('');

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

  const notesMutation = useMutation({
    mutationFn: ({ id, notes }: { id: number; notes: string }) =>
      adminApi.updateApplicationNotes(id, notes),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'applications'] });
      setNotesApp(null);
      setNotesText('');
    },
  });

  const apps: MerchantApplication[] = data?.data?.data ?? [];
  const lastPage = data?.data?.last_page ?? 1;

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Applications</h1>
        <p className="text-sm text-gray-500 mt-1">Prospective merchant sign-up requests</p>
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
                <th className="px-4 py-3 text-left text-xs font-bold text-gray-700">Status</th>
                <th className="px-4 py-3 text-left text-xs font-bold text-gray-700">Received</th>
                <th className="px-4 py-3 text-right text-xs font-bold text-gray-700">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {isLoading && (
                <tr><td colSpan={6} className="px-4 py-6 text-center text-gray-400">Loading…</td></tr>
              )}
              {!isLoading && apps.length === 0 && (
                <tr><td colSpan={6} className="px-4 py-6 text-center text-gray-400">No applications found.</td></tr>
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
                      <button
                        onClick={() => setSelected(app)}
                        className="px-2.5 py-1.5 text-xs font-medium bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200"
                      >
                        <FileText className="h-3.5 w-3.5" />
                      </button>
                      {(app.status === 'pending' || app.status === 'review') && (
                        <>
                          <button
                            onClick={() => approveMutation.mutate(app.id)}
                            disabled={approveMutation.isPending}
                            className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium bg-emerald-600 text-white rounded-md hover:bg-emerald-700 disabled:opacity-50"
                          >
                            <CheckCircle className="h-3.5 w-3.5" />
                            Approve
                          </button>
                          {app.status === 'pending' && (
                            <button
                              onClick={() => { setRequestInfoModal(app); setRequestInfoNotes(''); }}
                              className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200 rounded-md hover:bg-blue-100"
                            >
                              <Info className="h-3.5 w-3.5" />
                              Info
                            </button>
                          )}
                          <button
                            onClick={() => { setRejectModal(app); setRejectReason(''); }}
                            className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium bg-red-50 text-red-700 border border-red-200 rounded-md hover:bg-red-100"
                          >
                            <XCircle className="h-3.5 w-3.5" />
                            Reject
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

      {/* Detail modal */}
      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setSelected(null)}>
          <div className="bg-white rounded-lg border border-gray-200 shadow-xl w-full max-w-lg p-6 overflow-y-auto max-h-[90vh]" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between mb-4">
              <div>
                <p className="font-bold text-gray-900 text-lg">{selected.company_name}</p>
                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_CHIP[selected.status]}`}>{selected.status}</span>
              </div>
              <button onClick={() => setSelected(null)} className="text-gray-400 hover:text-gray-600 text-xl leading-none">&times;</button>
            </div>
            <div className="space-y-2 text-sm mb-4">
              {[
                ['Owner', selected.owner_name],
                ['Email', selected.email],
                ['Phone', selected.phone],
                ['City', selected.city ?? '—'],
                ['Business type', selected.business_type ?? '—'],
                ['Branches', selected.branch_count?.toString() ?? '—'],
                ['Est. deliveries/mo', selected.estimated_monthly_deliveries?.toString() ?? '—'],
                ['Selected plan', selected.selected_plan ?? '—'],
                ['Submitted', selected.created_at.slice(0, 10)],
              ].map(([l, v]) => (
                <div key={l} className="flex gap-3">
                  <span className="w-36 shrink-0 text-gray-500">{l}</span>
                  <span className="text-gray-900">{v}</span>
                </div>
              ))}
              {selected.notes && (
                <div className="pt-2">
                  <p className="text-gray-500 mb-1">Applicant notes</p>
                  <p className="text-gray-700 bg-gray-50 rounded p-2 text-xs">{selected.notes}</p>
                </div>
              )}
              {selected.rejection_reason && (
                <div className="pt-2">
                  <p className="text-gray-500 mb-1">Rejection reason</p>
                  <p className="text-red-700 bg-red-50 rounded p-2 text-xs">{selected.rejection_reason}</p>
                </div>
              )}
            </div>
            <div className="pt-3 border-t border-gray-100">
              <p className="text-xs font-medium text-gray-700 mb-1">Internal Notes (super admin only)</p>
              {notesApp?.id === selected.id ? (
                <div className="space-y-2">
                  <textarea
                    value={notesText}
                    onChange={(e) => setNotesText(e.target.value)}
                    rows={3}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                  />
                  <div className="flex gap-2">
                    <button onClick={() => setNotesApp(null)} className="flex-1 py-1.5 border border-gray-300 rounded text-sm text-gray-700 hover:bg-gray-50">Cancel</button>
                    <button
                      onClick={() => notesMutation.mutate({ id: selected.id, notes: notesText })}
                      disabled={notesMutation.isPending}
                      className="flex-1 py-1.5 bg-gray-900 text-white rounded text-sm hover:bg-gray-800 disabled:opacity-50"
                    >
                      {notesMutation.isPending ? 'Saving…' : 'Save'}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="bg-gray-50 rounded p-2 text-xs text-gray-700 cursor-pointer hover:bg-gray-100" onClick={() => { setNotesApp(selected); setNotesText(selected.internal_notes ?? ''); }}>
                  {selected.internal_notes || <span className="text-gray-400">Click to add internal notes…</span>}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Approval success modal */}
      {approvalResult && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-lg border border-gray-200 shadow-xl w-full max-w-md p-6">
            <div className="flex items-center gap-3 mb-4">
              <CheckCircle className="h-7 w-7 text-emerald-600 shrink-0" />
              <div>
                <p className="font-bold text-gray-900 text-lg">Merchant Provisioned</p>
                <p className="text-sm text-gray-500">{approvalResult.merchant_name}</p>
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
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              rows={3}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm mb-4"
              placeholder="Explain why this application is being rejected…"
            />
            <div className="flex gap-2">
              <button onClick={() => setRejectModal(null)} className="flex-1 py-2 border border-gray-300 rounded-md text-sm text-gray-700 hover:bg-gray-50">Cancel</button>
              <button
                onClick={() => rejectMutation.mutate({ id: rejectModal.id, reason: rejectReason })}
                disabled={rejectMutation.isPending || !rejectReason.trim()}
                className="flex-1 py-2 bg-red-600 text-white rounded-md text-sm font-medium hover:bg-red-700 disabled:opacity-50"
              >
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
            <textarea
              value={requestInfoNotes}
              onChange={(e) => setRequestInfoNotes(e.target.value)}
              rows={3}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm mb-4"
              placeholder="What info is needed…"
            />
            <div className="flex gap-2">
              <button onClick={() => setRequestInfoModal(null)} className="flex-1 py-2 border border-gray-300 rounded-md text-sm text-gray-700 hover:bg-gray-50">Cancel</button>
              <button
                onClick={() => requestInfoMutation.mutate({ id: requestInfoModal.id, notes: requestInfoNotes || undefined })}
                disabled={requestInfoMutation.isPending}
                className="flex-1 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
              >
                {requestInfoMutation.isPending ? 'Sending…' : 'Move to Review'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

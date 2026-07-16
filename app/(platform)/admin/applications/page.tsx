'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminApi } from '@/lib/api';
import type { MerchantApplication, ApplicationStatus } from '@/types';
import { CheckCircle, XCircle, AlertCircle } from 'lucide-react';

const STATUS_CHIP: Record<ApplicationStatus, string> = {
  pending:   'bg-amber-100 text-amber-700',
  approved:  'bg-blue-100 text-blue-700',
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
  const [page, setPage]         = useState(1);
  const [statusFilter, setFilter] = useState('');
  const [search, setSearch]     = useState('');
  const [approvalResult, setApprovalResult] = useState<ApprovalResult | null>(null);
  const [rejectModal, setRejectModal] = useState<MerchantApplication | null>(null);
  const [rejectNotes, setRejectNotes] = useState('');

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
    },
  });

  const rejectMutation = useMutation({
    mutationFn: ({ id, notes }: { id: number; notes: string }) =>
      adminApi.rejectApplication(id, notes),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'applications'] });
      setRejectModal(null);
      setRejectNotes('');
    },
  });

  const apps: MerchantApplication[] = data?.data?.data ?? [];
  const meta = data?.data;
  const lastPage = meta?.last_page ?? 1;

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Applications</h1>
        <p className="text-sm text-gray-500 mt-1">Prospective merchant sign-up requests</p>
      </div>

      {/* Filters */}
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
          {['pending', 'converted', 'approved', 'rejected', 'cancelled'].map((s) => (
            <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
          ))}
        </select>
      </div>

      {/* Table */}
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
                  </td>
                  <td className="px-4 py-3 text-gray-500 text-xs">{app.created_at.slice(0, 10)}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-2">
                      {app.status === 'pending' && (
                        <>
                          <button
                            onClick={() => approveMutation.mutate(app.id)}
                            disabled={approveMutation.isPending}
                            className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
                          >
                            <CheckCircle className="h-3.5 w-3.5" />
                            Approve
                          </button>
                          <button
                            onClick={() => { setRejectModal(app); setRejectNotes(''); }}
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

      {/* Approval success modal */}
      {approvalResult && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-lg border border-gray-200 shadow-xl w-full max-w-md p-6">
            <div className="flex items-center gap-3 mb-4">
              <CheckCircle className="h-7 w-7 text-green-600 shrink-0" />
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
              {approvalResult.plan && <div className="flex justify-between"><span className="text-gray-500">Plan</span><span className="font-medium text-gray-900">{approvalResult.plan}</span></div>}
              {approvalResult.trial_ends_at && <div className="flex justify-between"><span className="text-gray-500">Trial ends</span><span className="font-medium text-gray-900">{approvalResult.trial_ends_at}</span></div>}
            </div>
            <div className="flex items-start gap-2 mb-5 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-md p-3">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              Share these credentials securely with the merchant owner. The password cannot be retrieved again.
            </div>
            <button onClick={() => setApprovalResult(null)} className="w-full py-2.5 bg-gray-900 text-white rounded-md text-sm font-medium hover:bg-gray-800">
              Done
            </button>
          </div>
        </div>
      )}

      {/* Reject modal */}
      {rejectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-lg border border-gray-200 shadow-xl w-full max-w-sm p-6">
            <p className="font-bold text-gray-900 mb-1">Reject application</p>
            <p className="text-sm text-gray-500 mb-4">{rejectModal.company_name}</p>
            <label className="block text-xs font-medium text-gray-700 mb-1">Reason / notes (optional)</label>
            <textarea
              value={rejectNotes}
              onChange={(e) => setRejectNotes(e.target.value)}
              rows={3}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm mb-4"
              placeholder="Internal notes…"
            />
            <div className="flex gap-2">
              <button onClick={() => setRejectModal(null)} className="flex-1 py-2 border border-gray-300 rounded-md text-sm text-gray-700 hover:bg-gray-50">Cancel</button>
              <button
                onClick={() => rejectMutation.mutate({ id: rejectModal.id, notes: rejectNotes })}
                disabled={rejectMutation.isPending}
                className="flex-1 py-2 bg-red-600 text-white rounded-md text-sm font-medium hover:bg-red-700 disabled:opacity-50"
              >
                {rejectMutation.isPending ? 'Rejecting…' : 'Reject'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

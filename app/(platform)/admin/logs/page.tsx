'use client';

import { Shield } from 'lucide-react';

export default function AuditLogsPage() {
  return (
    <div className="p-6 max-w-3xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Audit Logs</h1>
        <p className="text-sm text-gray-500 mt-1">Platform-wide activity and security events</p>
      </div>
      <div className="bg-white border border-gray-200 rounded-lg p-8 flex flex-col items-center gap-3 text-center shadow-sm">
        <Shield className="h-10 w-10 text-gray-300" />
        <p className="font-semibold text-gray-700">Coming in Phase 5.3</p>
        <p className="text-sm text-gray-400 max-w-sm">
          Merchant provisioning events, status changes, and super admin actions will be logged and searchable here.
        </p>
      </div>
    </div>
  );
}

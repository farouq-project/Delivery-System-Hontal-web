'use client';

import { useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { useMutation } from '@tanstack/react-query';
import { adminApi } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { FlaskConical, Copy, Check, AlertCircle } from 'lucide-react';

interface TrialResult {
  merchant: { id: number; ulid: string; company_name: string; email: string; slug: string };
  owner_email: string;
  dispatcher_email: string;
  driver_email: string;
  password: string;
  trial_expires_at: string;
  sample_customers: number;
  sample_orders: number;
}

function TrialWizardInner() {
  const searchParams = useSearchParams();

  const [form, setForm] = useState({
    company_name: searchParams.get('company_name') ?? '',
    owner_name:   searchParams.get('owner_name')   ?? '',
    owner_email:  searchParams.get('owner_email')  ?? '',
    password:     'demo1234',
    phone:        searchParams.get('phone')        ?? '',
    trial_days:   '30',
    with_samples: true,
  });
  const [result, setResult]   = useState<TrialResult | null>(null);
  const [copied, setCopied]   = useState('');
  const fromProspect = searchParams.get('from_prospect');

  const mutation = useMutation({
    mutationFn: () => adminApi.createTrialMerchant({
      ...form,
      trial_days:   Number(form.trial_days),
      with_samples: form.with_samples,
    }),
    onSuccess: (res) => setResult(res.data.data),
  });

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(''), 2000);
  };

  const CopyButton = ({ text, id }: { text: string; id: string }) => (
    <button
      type="button"
      onClick={() => handleCopy(text, id)}
      className="ml-2 text-gray-400 hover:text-gray-600 transition-colors"
    >
      {copied === id ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
    </button>
  );

  const resetForm = () => {
    setResult(null);
    setForm({ company_name: '', owner_name: '', owner_email: '', password: 'demo1234', phone: '', trial_days: '30', with_samples: true });
  };

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <FlaskConical className="h-6 w-6 text-emerald-500" />
        <div>
          <h1 className="text-xl font-bold">Trial Wizard</h1>
          <p className="text-sm text-gray-500">Provision a fully-configured trial merchant environment</p>
        </div>
      </div>

      {fromProspect && !result && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-3 mb-5 text-sm text-blue-800">
          Pre-filled from CRM prospect #{fromProspect}. Review and adjust before creating.
        </div>
      )}

      {!result ? (
        <div className="bg-white rounded-xl border p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2 space-y-1.5">
              <Label>Company Name *</Label>
              <Input
                value={form.company_name}
                onChange={(e) => setForm({ ...form, company_name: e.target.value })}
                placeholder="Bakti Gallon Bandung"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Owner Name *</Label>
              <Input
                value={form.owner_name}
                onChange={(e) => setForm({ ...form, owner_name: e.target.value })}
                placeholder="Pak Budi"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Owner Email *</Label>
              <Input
                type="email"
                value={form.owner_email}
                onChange={(e) => setForm({ ...form, owner_email: e.target.value })}
                placeholder="budi@contoh.com"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Password</Label>
              <Input
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                placeholder="demo1234"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Phone (optional)</Label>
              <Input
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                placeholder="08123456789"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Trial Days</Label>
              <Input
                type="number"
                min={1}
                max={365}
                value={form.trial_days}
                onChange={(e) => setForm({ ...form, trial_days: e.target.value })}
              />
            </div>
          </div>

          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={form.with_samples}
              onChange={(e) => setForm({ ...form, with_samples: e.target.checked })}
              className="rounded"
            />
            <span className="text-sm">Seed sample customers &amp; orders (recommended for demos)</span>
          </label>

          {mutation.isError && (
            <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-md px-3 py-2">
              <AlertCircle className="h-4 w-4 text-red-500 mt-0.5 shrink-0" />
              <p className="text-xs text-red-700">
                {(mutation.error as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Failed to create trial merchant.'}
              </p>
            </div>
          )}

          <div className="flex justify-end pt-2">
            <Button
              onClick={() => mutation.mutate()}
              disabled={mutation.isPending || !form.company_name || !form.owner_name || !form.owner_email}
            >
              {mutation.isPending ? 'Creating…' : 'Create Trial Merchant'}
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4">
            <p className="font-semibold text-emerald-800">
              {result.merchant.company_name} — Trial ready
            </p>
            <p className="text-xs text-emerald-600 mt-0.5">
              Expires {new Date(result.trial_expires_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
              {result.sample_customers > 0 && ` · ${result.sample_customers} sample customers · ${result.sample_orders} orders`}
            </p>
          </div>

          <div className="bg-white rounded-xl border divide-y">
            {[
              { label: 'Owner',      email: result.owner_email,      id: 'owner' },
              { label: 'Dispatcher', email: result.dispatcher_email, id: 'dispatcher' },
              { label: 'Driver',     email: result.driver_email,     id: 'driver' },
            ].map(({ label, email, id }) => (
              <div key={id} className="flex items-center justify-between px-4 py-3">
                <div>
                  <p className="text-xs text-gray-500">{label}</p>
                  <p className="text-sm font-mono">{email}</p>
                </div>
                <CopyButton text={email} id={id} />
              </div>
            ))}
            <div className="flex items-center justify-between px-4 py-3">
              <div>
                <p className="text-xs text-gray-500">Password (all accounts)</p>
                <p className="text-sm font-mono">{result.password}</p>
              </div>
              <CopyButton text={result.password} id="password" />
            </div>
            <div className="flex items-center justify-between px-4 py-3">
              <div>
                <p className="text-xs text-gray-500">Merchant ID</p>
                <p className="text-sm font-mono">{result.merchant.id}</p>
              </div>
              <CopyButton text={String(result.merchant.id)} id="mid" />
            </div>
          </div>

          <Button variant="outline" className="w-full" onClick={resetForm}>
            Create Another
          </Button>
        </div>
      )}
    </div>
  );
}

export default function TrialWizardPage() {
  return (
    <Suspense fallback={null}>
      <TrialWizardInner />
    </Suspense>
  );
}

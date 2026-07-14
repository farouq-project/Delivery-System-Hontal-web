'use client';

import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { merchantPlatformApi } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import type { InvoiceSettings } from '@/types';

export function InvoiceTab() {
  const qc = useQueryClient();
  const { data: res, isLoading } = useQuery({
    queryKey: ['platform', 'invoice'],
    queryFn: merchantPlatformApi.getInvoice,
  });

  const invoice: InvoiceSettings | undefined = res?.data?.data;

  const [form, setForm] = useState({
    invoice_prefix: 'INV-', invoice_date_format: 'DD/MM/YYYY', invoice_footer: '',
  });
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (invoice) {
      setForm({
        invoice_prefix:      invoice.invoice_prefix      ?? 'INV-',
        invoice_date_format: invoice.invoice_date_format ?? 'DD/MM/YYYY',
        invoice_footer:      invoice.invoice_footer      ?? '',
      });
    }
  }, [invoice]);

  const mutation = useMutation({
    mutationFn: (data: Record<string, unknown>) => merchantPlatformApi.updateInvoice(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['platform', 'invoice'] });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    mutation.mutate({
      invoice_prefix:      form.invoice_prefix      || null,
      invoice_date_format: form.invoice_date_format || null,
      invoice_footer:      form.invoice_footer      || null,
    });
  };

  if (isLoading) {
    return <div className="h-40 bg-gray-100 rounded animate-pulse" />;
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Invoice Settings</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label htmlFor="invoice_prefix">Invoice Number Prefix</Label>
              <Input id="invoice_prefix" value={form.invoice_prefix}
                onChange={e => setForm(f => ({ ...f, invoice_prefix: e.target.value }))}
                placeholder="INV-" maxLength={20} />
              <p className="text-xs text-gray-400">e.g. INV- → INV-0001</p>
            </div>
            <div className="space-y-1">
              <Label htmlFor="date_format">Date Format</Label>
              <select
                id="date_format"
                value={form.invoice_date_format}
                onChange={e => setForm(f => ({ ...f, invoice_date_format: e.target.value }))}
                className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm"
              >
                <option value="DD/MM/YYYY">DD/MM/YYYY</option>
                <option value="MM/DD/YYYY">MM/DD/YYYY</option>
                <option value="YYYY-MM-DD">YYYY-MM-DD</option>
              </select>
            </div>
          </div>
          <div className="space-y-1">
            <Label htmlFor="invoice_footer">Invoice Footer Text</Label>
            <textarea
              id="invoice_footer"
              value={form.invoice_footer}
              onChange={e => setForm(f => ({ ...f, invoice_footer: e.target.value }))}
              placeholder="e.g. Terima kasih atas kepercayaan Anda."
              rows={3}
              maxLength={1000}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm resize-none"
            />
          </div>
        </CardContent>
      </Card>

      <div className="flex items-center gap-3">
        <button type="submit" disabled={mutation.isPending}
          className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 disabled:opacity-50">
          {mutation.isPending ? 'Saving…' : 'Save Invoice Settings'}
        </button>
        {saved && <span className="text-sm text-green-600">Saved successfully.</span>}
        {mutation.isError && <span className="text-sm text-red-600">Failed to save. Try again.</span>}
      </div>
    </form>
  );
}

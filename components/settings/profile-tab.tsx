'use client';

import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { merchantPlatformApi } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import type { MerchantProfile } from '@/types';

export function ProfileTab() {
  const qc = useQueryClient();
  const { data: res, isLoading } = useQuery({
    queryKey: ['platform', 'profile'],
    queryFn: merchantPlatformApi.getProfile,
  });

  const profile: MerchantProfile | undefined = res?.data?.data;

  const [form, setForm] = useState({
    company_name: '', phone: '', email: '', address: '',
    logo_path: '', tax_number: '', invoice_footer: '', brand_color: '',
  });
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (profile) {
      setForm({
        company_name:   profile.company_name   ?? '',
        phone:          profile.phone          ?? '',
        email:          profile.email          ?? '',
        address:        profile.address        ?? '',
        logo_path:      profile.logo_path      ?? '',
        tax_number:     profile.tax_number     ?? '',
        invoice_footer: profile.invoice_footer ?? '',
        brand_color:    profile.brand_color    ?? '',
      });
    }
  }, [profile]);

  const mutation = useMutation({
    mutationFn: (data: Record<string, unknown>) => merchantPlatformApi.updateProfile(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['platform', 'profile'] });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    mutation.mutate({
      company_name:   form.company_name   || undefined,
      phone:          form.phone          || null,
      email:          form.email          || null,
      address:        form.address        || null,
      logo_path:      form.logo_path      || null,
      tax_number:     form.tax_number     || null,
      invoice_footer: form.invoice_footer || null,
      brand_color:    form.brand_color    || null,
    });
  };

  if (isLoading) {
    return <div className="space-y-3">{Array.from({ length: 4 }).map((_, i) => (
      <div key={i} className="h-10 bg-gray-100 rounded animate-pulse" />
    ))}</div>;
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Company Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label htmlFor="company_name">Company Name</Label>
              <Input id="company_name" value={form.company_name}
                onChange={e => setForm(f => ({ ...f, company_name: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="phone">Phone</Label>
              <Input id="phone" value={form.phone}
                onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" value={form.email}
                onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="tax_number">Tax Number (NPWP)</Label>
              <Input id="tax_number" value={form.tax_number}
                onChange={e => setForm(f => ({ ...f, tax_number: e.target.value }))}
                placeholder="Optional" />
            </div>
          </div>
          <div className="space-y-1">
            <Label htmlFor="address">Address</Label>
            <Input id="address" value={form.address}
              onChange={e => setForm(f => ({ ...f, address: e.target.value }))} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Branding</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label htmlFor="logo_path">Logo URL</Label>
              <Input id="logo_path" value={form.logo_path}
                onChange={e => setForm(f => ({ ...f, logo_path: e.target.value }))}
                placeholder="https://..." />
            </div>
            <div className="space-y-1">
              <Label htmlFor="brand_color">Brand Color (hex)</Label>
              <div className="flex gap-2 items-center">
                <Input id="brand_color" value={form.brand_color}
                  onChange={e => setForm(f => ({ ...f, brand_color: e.target.value }))}
                  placeholder="#1a73e8" maxLength={7} className="flex-1" />
                {form.brand_color?.match(/^#[0-9A-Fa-f]{6}$/) && (
                  <div
                    className="w-9 h-9 rounded border border-gray-200 shrink-0"
                    style={{ backgroundColor: form.brand_color }}
                  />
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={mutation.isPending}
          className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 disabled:opacity-50"
        >
          {mutation.isPending ? 'Saving…' : 'Save Profile'}
        </button>
        {saved && <span className="text-sm text-green-600">Saved successfully.</span>}
        {mutation.isError && <span className="text-sm text-red-600">Failed to save. Try again.</span>}
      </div>
    </form>
  );
}

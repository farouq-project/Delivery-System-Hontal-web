'use client';

import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { merchantPlatformApi } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import type { MerchantProfile, BusinessProfile, BusinessUnit } from '@/types';

const BUSINESS_TYPES = [
  { value: 'food_distributor', label: 'Food Distributor' },
  { value: 'bakery',           label: 'Bakery' },
  { value: 'restaurant',       label: 'Restaurant' },
  { value: 'catering',         label: 'Catering' },
  { value: 'retail',           label: 'Retail' },
  { value: 'water_distributor',label: 'Water Distributor' },
  { value: 'lpg',              label: 'LPG Distributor' },
  { value: 'florist',          label: 'Florist' },
  { value: 'custom',           label: 'Custom / Other' },
];

const BUSINESS_UNITS: { value: BusinessUnit; label: string }[] = [
  { value: 'order',   label: 'Order (general)' },
  { value: 'kg',      label: 'kg (kilogram)' },
  { value: 'tray',    label: 'Tray' },
  { value: 'box',     label: 'Box' },
  { value: 'pcs',     label: 'pcs (piece)' },
  { value: 'bottle',  label: 'Bottle / Botol' },
  { value: 'gallon',  label: 'Gallon / Galon' },
  { value: 'package', label: 'Package / Paket' },
  { value: 'custom',  label: 'Custom' },
];

export function ProfileTab() {
  const qc = useQueryClient();

  // ── Company identity (merchants table) ──────────────────────────────
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

  // ── Business identity (merchant_settings) ───────────────────────────
  const { data: bizRes, isLoading: bizLoading } = useQuery({
    queryKey: ['platform', 'business'],
    queryFn: merchantPlatformApi.getBusinessProfile,
  });
  const bizProfile: BusinessProfile | undefined = bizRes?.data?.data;

  const [bizForm, setBizForm] = useState({
    business_type:     '',
    business_unit:     'order' as BusinessUnit,
    business_category: '',
    operating_region:  '',
    currency:          'IDR',
  });
  const [bizSaved, setBizSaved] = useState(false);

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

  useEffect(() => {
    if (bizProfile) {
      setBizForm({
        business_type:     bizProfile.business_type     ?? '',
        business_unit:     bizProfile.business_unit     ?? 'order',
        business_category: bizProfile.business_category ?? '',
        operating_region:  bizProfile.operating_region  ?? '',
        currency:          bizProfile.currency          ?? 'IDR',
      });
    }
  }, [bizProfile]);

  const mutation = useMutation({
    mutationFn: (data: Record<string, unknown>) => merchantPlatformApi.updateProfile(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['platform', 'profile'] });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    },
  });

  const bizMutation = useMutation({
    mutationFn: (data: Record<string, unknown>) => merchantPlatformApi.updateBusinessProfile(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['platform', 'business'] });
      setBizSaved(true);
      setTimeout(() => setBizSaved(false), 3000);
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

  const handleBizSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    bizMutation.mutate({
      business_type:     bizForm.business_type     || null,
      business_unit:     bizForm.business_unit,
      business_category: bizForm.business_category || null,
      operating_region:  bizForm.operating_region  || null,
      currency:          bizForm.currency          || 'IDR',
    });
  };

  if (isLoading) {
    return <div className="space-y-3">{Array.from({ length: 4 }).map((_, i) => (
      <div key={i} className="h-10 bg-gray-100 rounded animate-pulse" />
    ))}</div>;
  }

  return (
    <div className="space-y-6">
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

    {/* Business Identity — separate form, reads from merchant_settings */}
    <form onSubmit={handleBizSubmit} className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Business Identity</CardTitle>
          <p className="text-xs text-gray-400 mt-0.5">
            Used to configure dashboard labels, metric units, and future module defaults.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          {bizLoading ? (
            <div className="space-y-3">{Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-9 bg-gray-100 rounded animate-pulse" />
            ))}</div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label htmlFor="business_type">Business Type</Label>
                <select
                  id="business_type"
                  value={bizForm.business_type}
                  onChange={e => setBizForm(f => ({ ...f, business_type: e.target.value }))}
                  className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm"
                >
                  <option value="">— Select type —</option>
                  {BUSINESS_TYPES.map(t => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <Label htmlFor="business_unit">Primary Business Unit</Label>
                <select
                  id="business_unit"
                  value={bizForm.business_unit}
                  onChange={e => setBizForm(f => ({ ...f, business_unit: e.target.value as BusinessUnit }))}
                  className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm"
                >
                  {BUSINESS_UNITS.map(u => (
                    <option key={u.value} value={u.value}>{u.label}</option>
                  ))}
                </select>
                <p className="text-xs text-gray-400">
                  Used in labels like "Delivery Cost / {BUSINESS_UNITS.find(u => u.value === bizForm.business_unit)?.label.split(' ')[0] ?? bizForm.business_unit}"
                </p>
              </div>
              <div className="space-y-1">
                <Label htmlFor="operating_region">Operating Region</Label>
                <Input
                  id="operating_region"
                  value={bizForm.operating_region}
                  onChange={e => setBizForm(f => ({ ...f, operating_region: e.target.value }))}
                  placeholder="e.g. Bandung, Jawa Barat"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="currency">Currency</Label>
                <Input
                  id="currency"
                  value={bizForm.currency}
                  onChange={e => setBizForm(f => ({ ...f, currency: e.target.value.toUpperCase().slice(0, 3) }))}
                  placeholder="IDR"
                  maxLength={3}
                  className="w-28"
                />
              </div>
              <div className="space-y-1 sm:col-span-2">
                <Label htmlFor="business_category">Business Category (optional)</Label>
                <Input
                  id="business_category"
                  value={bizForm.business_category}
                  onChange={e => setBizForm(f => ({ ...f, business_category: e.target.value }))}
                  placeholder="e.g. Food & Beverage, Consumer Goods"
                />
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={bizMutation.isPending || bizLoading}
          className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 disabled:opacity-50"
        >
          {bizMutation.isPending ? 'Saving…' : 'Save Business Identity'}
        </button>
        {bizSaved && <span className="text-sm text-green-600">Saved successfully.</span>}
        {bizMutation.isError && <span className="text-sm text-red-600">Failed to save. Try again.</span>}
      </div>
    </form>
    </div>
  );
}

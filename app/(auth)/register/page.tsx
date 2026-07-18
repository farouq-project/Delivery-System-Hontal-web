'use client';

import { useState } from 'react';
import Link from 'next/link';
import { publicApi } from '@/lib/api';
import { PLATFORM } from '@/lib/brand';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { CheckCircle, Building2 } from 'lucide-react';

const BUSINESS_TYPES = [
  'Distributor Air Minum',
  'Catering / Katering',
  'Bakery / Roti',
  'Frozen Food',
  'Telur / Unggas',
  'Grosir / Wholesale',
  'Lainnya',
];

export default function RegisterPage() {
  const [step, setStep] = useState<'form' | 'success'>('form');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const [form, setForm] = useState({
    company_name: '',
    owner_name: '',
    email: '',
    phone: '',
    city: '',
    business_type: '',
    branch_count: '',
    estimated_monthly_deliveries: '',
    notes: '',
  });
  const [customBusinessType, setCustomBusinessType] = useState('');

  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      const effectiveBusinessType =
        form.business_type === 'Lainnya' ? customBusinessType || 'Lainnya' : form.business_type;
      await publicApi.registerInterest({
        ...form,
        business_type: effectiveBusinessType,
        branch_count: form.branch_count ? Number(form.branch_count) : undefined,
        estimated_monthly_deliveries: form.estimated_monthly_deliveries
          ? Number(form.estimated_monthly_deliveries)
          : undefined,
      });
      setStep('success');
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { message?: string } } };
      setError(axiosErr.response?.data?.message ?? 'Gagal mengirim pendaftaran. Coba lagi.');
    } finally {
      setSubmitting(false);
    }
  };

  const year = new Date().getFullYear();

  if (step === 'success') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-6">
        <div className="max-w-md w-full text-center space-y-5">
          <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mx-auto">
            <CheckCircle className="h-8 w-8 text-emerald-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Pendaftaran Diterima!</h1>
          <p className="text-gray-600 text-sm leading-relaxed">
            Terima kasih telah mendaftar di <strong>{PLATFORM.name}</strong>. Tim kami akan meninjau
            permohonan Anda dan menghubungi dalam <strong>1–2 hari kerja</strong>.
          </p>
          <p className="text-sm text-gray-500">
            Setelah disetujui, Anda akan menerima informasi akun untuk mulai menggunakan platform.
          </p>
          <Link href="/login" className="inline-block text-sm text-blue-600 hover:text-blue-700 font-medium">
            ← Kembali ke halaman login
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex bg-gray-50">
      {/* Left branding panel */}
      <div className="hidden lg:flex flex-col justify-between w-2/5 bg-gray-900 p-12 text-white">
        <div className="flex items-center gap-2">
          <Building2 className="h-6 w-6 text-emerald-400" />
          <p className="text-xl font-bold tracking-tight">{PLATFORM.name}</p>
        </div>
        <div className="space-y-6">
          <p className="text-lg font-medium text-gray-200 leading-relaxed">
            Platform manajemen pengiriman untuk distributor modern.
          </p>
          <ul className="space-y-3 text-sm text-gray-400">
            {[
              'Routing otomatis dengan optimasi jarak',
              'Live tracking pengemudi',
              'Analitik bisnis mendalam',
              'Multi-cabang & multi-pengemudi',
            ].map((item) => (
              <li key={item} className="flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shrink-0" />
                {item}
              </li>
            ))}
          </ul>
        </div>
        <p className="text-xs text-gray-600">© {year} {PLATFORM.name}</p>
      </div>

      {/* Form panel */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-lg mx-auto px-6 py-10">
          {/* Mobile header */}
          <div className="lg:hidden mb-6 text-center">
            <p className="text-xl font-bold text-gray-900">{PLATFORM.name}</p>
          </div>

          <div className="mb-7">
            <h1 className="text-2xl font-bold text-gray-900">Daftar sebagai Merchant</h1>
            <p className="text-sm text-gray-500 mt-1">
              Isi data bisnis Anda. Tim kami akan memverifikasi dan mengaktifkan akun Anda.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 text-sm p-3 rounded-md">
                {error}
              </div>
            )}

            {/* Company info */}
            <div className="bg-white border border-gray-200 rounded-lg p-5 space-y-4">
              <p className="text-xs font-bold uppercase tracking-widest text-gray-500">Informasi Bisnis</p>
              <div className="space-y-1.5">
                <Label htmlFor="company_name">Nama Perusahaan / Bisnis *</Label>
                <Input
                  id="company_name"
                  value={form.company_name}
                  onChange={(e) => set('company_name', e.target.value)}
                  placeholder="UD Tirta Jaya / CV Barokah Food"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="business_type">Jenis Bisnis</Label>
                  <select
                    id="business_type"
                    value={form.business_type}
                    onChange={(e) => set('business_type', e.target.value)}
                    className="w-full border border-input rounded-md px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-ring"
                  >
                    <option value="">— Pilih —</option>
                    {BUSINESS_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                  </select>
                  {form.business_type === 'Lainnya' && (
                    <Input
                      value={customBusinessType}
                      onChange={(e) => setCustomBusinessType(e.target.value)}
                      placeholder="Sebutkan jenis bisnis Anda…"
                      autoFocus
                    />
                  )}
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="city">Kota</Label>
                  <Input
                    id="city"
                    value={form.city}
                    onChange={(e) => set('city', e.target.value)}
                    placeholder="Bandung"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="branch_count">Jumlah Cabang</Label>
                  <Input
                    id="branch_count"
                    type="number"
                    min={1}
                    value={form.branch_count}
                    onChange={(e) => set('branch_count', e.target.value)}
                    placeholder="1"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="estimated_monthly_deliveries">Est. Pengiriman/Bulan</Label>
                  <Input
                    id="estimated_monthly_deliveries"
                    type="number"
                    min={1}
                    value={form.estimated_monthly_deliveries}
                    onChange={(e) => set('estimated_monthly_deliveries', e.target.value)}
                    placeholder="500"
                  />
                </div>
              </div>
            </div>

            {/* Owner info */}
            <div className="bg-white border border-gray-200 rounded-lg p-5 space-y-4">
              <p className="text-xs font-bold uppercase tracking-widest text-gray-500">Informasi Kontak</p>
              <div className="space-y-1.5">
                <Label htmlFor="owner_name">Nama Pemilik / PIC *</Label>
                <Input
                  id="owner_name"
                  value={form.owner_name}
                  onChange={(e) => set('owner_name', e.target.value)}
                  placeholder="Budi Santoso"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="email">Email *</Label>
                  <Input
                    id="email"
                    type="email"
                    value={form.email}
                    onChange={(e) => set('email', e.target.value)}
                    placeholder="budi@perusahaan.com"
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="phone">No. Telepon *</Label>
                  <Input
                    id="phone"
                    type="tel"
                    value={form.phone}
                    onChange={(e) => set('phone', e.target.value)}
                    placeholder="0812-xxxx-xxxx"
                    required
                  />
                </div>
              </div>
            </div>

            {/* Notes */}
            <div className="bg-white border border-gray-200 rounded-lg p-5 space-y-3">
              <p className="text-xs font-bold uppercase tracking-widest text-gray-500">Informasi Tambahan</p>
              <div className="space-y-1.5">
                <Label htmlFor="notes">Catatan / Kebutuhan Khusus</Label>
                <textarea
                  id="notes"
                  rows={3}
                  value={form.notes}
                  onChange={(e) => set('notes', e.target.value)}
                  className="w-full border border-input rounded-md px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring"
                  placeholder="Ceritakan sedikit tentang bisnis Anda atau kebutuhan spesifik…"
                />
              </div>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-3 text-xs text-blue-700 leading-relaxed">
              Setelah mendaftar, tim {PLATFORM.name} akan meninjau permohonan Anda dan menghubungi melalui
              email atau telepon yang Anda daftarkan. Akun akan diaktifkan setelah verifikasi selesai.
            </div>

            <Button type="submit" className="w-full" disabled={submitting}>
              {submitting ? 'Mengirim…' : 'Kirim Pendaftaran'}
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-gray-500">
            Sudah punya akun?{' '}
            <Link href="/login" className="text-blue-600 hover:text-blue-700 font-medium">
              Masuk di sini
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

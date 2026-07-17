'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminApi } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ContactRound, Plus, Pencil, Trash2, AlertCircle } from 'lucide-react';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';

const STAGES = [
  { value: 'new',            label: 'Baru' },
  { value: 'contacted',      label: 'Dihubungi' },
  { value: 'demo_scheduled', label: 'Demo Terjadwal' },
  { value: 'negotiation',    label: 'Negosiasi' },
  { value: 'won',            label: 'Berhasil' },
  { value: 'lost',           label: 'Tidak Jadi' },
];
const CATEGORIES = ['water', 'catering', 'bakery', 'frozen', 'egg', 'wholesale', 'other'];
const STAGE_COLORS: Record<string, string> = {
  new:            'bg-gray-100 text-gray-700',
  contacted:      'bg-blue-100 text-blue-700',
  demo_scheduled: 'bg-indigo-100 text-indigo-700',
  negotiation:    'bg-amber-100 text-amber-700',
  won:            'bg-emerald-100 text-emerald-700',
  lost:           'bg-red-100 text-red-700',
};

interface Prospect {
  id: number;
  business_name: string;
  category: string | null;
  city: string | null;
  phone: string | null;
  contact_person: string | null;
  pipeline_stage: string;
  next_followup_at: string | null;
  notes: string | null;
  instagram: string | null;
  website: string | null;
  contact_role: string | null;
  address: string | null;
}

const emptyForm = {
  business_name: '', category: '', city: '', address: '', phone: '',
  website: '', instagram: '', contact_person: '', contact_role: '',
  pipeline_stage: 'new', notes: '', last_contact_at: '', next_followup_at: '',
};

export default function CrmPage() {
  const qc = useQueryClient();
  const [stageFilter, setStageFilter] = useState('');
  const [editing, setEditing] = useState<Prospect | null>(null);
  const [adding, setAdding] = useState(false);
  const [deleting, setDeleting] = useState<Prospect | null>(null);
  const [form, setForm] = useState(emptyForm);

  const { data, isLoading } = useQuery({
    queryKey: ['crm', stageFilter],
    queryFn: () => adminApi.listCrmProspects({ stage: stageFilter || undefined }),
  });
  const prospects: Prospect[] = data?.data?.data ?? [];

  const statsQuery = useQuery({
    queryKey: ['crm-stats'],
    queryFn: () => adminApi.getCrmStats(),
  });
  const stats = statsQuery.data?.data?.data;

  const saveMutation = useMutation({
    mutationFn: (payload: typeof emptyForm) =>
      editing ? adminApi.updateCrmProspect(editing.id, payload) : adminApi.createCrmProspect(payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['crm'] });
      qc.invalidateQueries({ queryKey: ['crm-stats'] });
      setEditing(null);
      setAdding(false);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => adminApi.deleteCrmProspect(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['crm'] });
      qc.invalidateQueries({ queryKey: ['crm-stats'] });
      setDeleting(null);
    },
  });

  const openEdit = (p: Prospect) => {
    setForm({
      business_name: p.business_name,
      category: p.category ?? '',
      city: p.city ?? '',
      address: p.address ?? '',
      phone: p.phone ?? '',
      website: p.website ?? '',
      instagram: p.instagram ?? '',
      contact_person: p.contact_person ?? '',
      contact_role: p.contact_role ?? '',
      pipeline_stage: p.pipeline_stage,
      notes: p.notes ?? '',
      last_contact_at: '',
      next_followup_at: p.next_followup_at ?? '',
    });
    setEditing(p);
  };

  const openAdd = () => {
    setForm(emptyForm);
    setAdding(true);
  };

  const isFormOpen = !!editing || adding;

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <ContactRound className="h-6 w-6 text-emerald-500" />
          <div>
            <h1 className="text-xl font-bold">CRM Prospects</h1>
            <p className="text-sm text-gray-500">Track potential merchant prospects</p>
          </div>
        </div>
        <Button onClick={openAdd} size="sm">
          <Plus className="h-4 w-4 mr-1" /> Add Prospect
        </Button>
      </div>

      {/* Stats row */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          <div className="bg-white border rounded-lg px-4 py-3">
            <p className="text-xs text-gray-500">Total</p>
            <p className="text-2xl font-bold">{stats.total}</p>
          </div>
          <div className="bg-emerald-50 border border-emerald-200 rounded-lg px-4 py-3">
            <p className="text-xs text-emerald-600">Won</p>
            <p className="text-2xl font-bold text-emerald-700">{stats.by_stage?.won ?? 0}</p>
          </div>
          <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3">
            <p className="text-xs text-amber-600">Due Today</p>
            <p className="text-2xl font-bold text-amber-700">{stats.due_today}</p>
          </div>
          <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3">
            <p className="text-xs text-red-600">Overdue</p>
            <p className="text-2xl font-bold text-red-700">{stats.overdue}</p>
          </div>
        </div>
      )}

      {/* Stage filter */}
      <div className="flex gap-2 mb-4 flex-wrap">
        <button
          onClick={() => setStageFilter('')}
          className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${!stageFilter ? 'bg-gray-800 text-white border-gray-800' : 'bg-white text-gray-600 border-gray-200 hover:border-gray-400'}`}
        >
          Semua
        </button>
        {STAGES.map((s) => (
          <button
            key={s.value}
            onClick={() => setStageFilter(s.value)}
            className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${stageFilter === s.value ? 'bg-gray-800 text-white border-gray-800' : 'bg-white text-gray-600 border-gray-200 hover:border-gray-400'}`}
          >
            {s.label}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="bg-white border rounded-xl overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-sm text-gray-400">Loading…</div>
        ) : prospects.length === 0 ? (
          <div className="p-8 text-center text-sm text-gray-400">
            {stageFilter ? 'No prospects in this stage.' : 'No prospects yet. Add the first one.'}
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wide">
              <tr>
                <th className="px-4 py-3 text-left">Bisnis</th>
                <th className="px-4 py-3 text-left hidden md:table-cell">Kota</th>
                <th className="px-4 py-3 text-left hidden md:table-cell">Kontak</th>
                <th className="px-4 py-3 text-left">Stage</th>
                <th className="px-4 py-3 text-left hidden lg:table-cell">Follow-up</th>
                <th className="px-4 py-3 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {prospects.map((p) => (
                <tr key={p.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <p className="font-medium">{p.business_name}</p>
                    {p.category && <p className="text-xs text-gray-400 capitalize">{p.category}</p>}
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell text-gray-500">{p.city ?? '—'}</td>
                  <td className="px-4 py-3 hidden md:table-cell">
                    <p>{p.contact_person ?? '—'}</p>
                    {p.phone && <p className="text-xs text-gray-400">{p.phone}</p>}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STAGE_COLORS[p.pipeline_stage] ?? 'bg-gray-100 text-gray-700'}`}>
                      {STAGES.find((s) => s.value === p.pipeline_stage)?.label ?? p.pipeline_stage}
                    </span>
                  </td>
                  <td className="px-4 py-3 hidden lg:table-cell text-gray-500 text-xs">
                    {p.next_followup_at
                      ? new Date(p.next_followup_at).toLocaleDateString('id-ID')
                      : '—'}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-1">
                      <button onClick={() => openEdit(p)} className="p-1.5 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-700">
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button onClick={() => setDeleting(p)} className="p-1.5 rounded hover:bg-red-50 text-gray-400 hover:text-red-600">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Form Dialog */}
      <Dialog open={isFormOpen} onOpenChange={(o) => { if (!o) { setEditing(null); setAdding(false); } }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit Prospect' : 'Tambah Prospect'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 pt-2">
            <div className="space-y-1.5">
              <Label>Nama Bisnis *</Label>
              <Input value={form.business_name} onChange={(e) => setForm({ ...form, business_name: e.target.value })} placeholder="UD Tirta Jaya" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Kategori</Label>
                <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                  <SelectTrigger><SelectValue placeholder="Pilih…" /></SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((c) => <SelectItem key={c} value={c} className="capitalize">{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Kota</Label>
                <Input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} placeholder="Bandung" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Kontak Person</Label>
                <Input value={form.contact_person} onChange={(e) => setForm({ ...form, contact_person: e.target.value })} placeholder="Pak Dudi" />
              </div>
              <div className="space-y-1.5">
                <Label>Jabatan</Label>
                <Input value={form.contact_role} onChange={(e) => setForm({ ...form, contact_role: e.target.value })} placeholder="Pemilik" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Telepon</Label>
                <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="0812..." />
              </div>
              <div className="space-y-1.5">
                <Label>Instagram</Label>
                <Input value={form.instagram} onChange={(e) => setForm({ ...form, instagram: e.target.value })} placeholder="@username" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Stage</Label>
              <Select value={form.pipeline_stage} onValueChange={(v) => setForm({ ...form, pipeline_stage: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {STAGES.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Follow-up Berikutnya</Label>
              <Input type="date" value={form.next_followup_at} onChange={(e) => setForm({ ...form, next_followup_at: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>Catatan</Label>
              <textarea
                className="w-full border rounded-md px-3 py-2 text-sm resize-none h-20 focus:outline-none focus:ring-2 focus:ring-ring"
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                placeholder="Tertarik dengan fitur routing…"
              />
            </div>
            {saveMutation.isError && (
              <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-md px-3 py-2">
                <AlertCircle className="h-4 w-4 text-red-500 mt-0.5 shrink-0" />
                <p className="text-xs text-red-700">Gagal menyimpan. Coba lagi.</p>
              </div>
            )}
            <div className="flex justify-end gap-2 pt-1">
              <Button variant="outline" onClick={() => { setEditing(null); setAdding(false); }}>Batal</Button>
              <Button onClick={() => saveMutation.mutate(form)} disabled={saveMutation.isPending || !form.business_name}>
                {saveMutation.isPending ? 'Menyimpan…' : 'Simpan'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete confirm */}
      <ConfirmDialog
        open={!!deleting}
        title="Hapus Prospect"
        description={`Hapus "${deleting?.business_name}"? Tindakan ini tidak bisa dibatalkan.`}
        confirmLabel="Hapus"
        variant="destructive"
        loading={deleteMutation.isPending}
        onConfirm={() => deleting && deleteMutation.mutate(deleting.id)}
        onCancel={() => setDeleting(null)}
      />
    </div>
  );
}

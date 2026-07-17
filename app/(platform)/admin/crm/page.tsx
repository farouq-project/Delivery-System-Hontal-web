'use client';

import { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminApi } from '@/lib/api';
import type { CrmMessageTemplate } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { ContactRound, Plus, Pencil, Trash2, AlertCircle, Upload, Copy, MessageSquare, ExternalLink, Check } from 'lucide-react';

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

const emptyTplForm = { name: '', content: '', category: '' };

function replacePlaceholders(template: string, prospect: Partial<Prospect>): string {
  return template
    .replace(/\{\{business_name\}\}/g, prospect.business_name ?? '')
    .replace(/\{\{company_name\}\}/g, 'Hontal')
    .replace(/\{\{coverage_area\}\}/g, prospect.city ?? '')
    .replace(/\{\{website\}\}/g, prospect.website ?? '')
    .replace(/\{\{phone\}\}/g, prospect.phone ?? '');
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const handle = () => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };
  return (
    <button onClick={handle} className="p-1.5 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-700 transition-colors" title="Salin">
      {copied ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
    </button>
  );
}

export default function CrmPage() {
  const qc = useQueryClient();
  const [stageFilter, setStageFilter] = useState('');
  const [editing, setEditing] = useState<Prospect | null>(null);
  const [adding, setAdding] = useState(false);
  const [deleting, setDeleting] = useState<Prospect | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [selectedTemplateId, setSelectedTemplateId] = useState<number | null>(null);

  // Import state
  const [importOpen, setImportOpen] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importResult, setImportResult] = useState<{ created: number; skipped: number; errors: string[] } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  // Templates state
  const [templatesOpen, setTemplatesOpen] = useState(false);
  const [tplEditing, setTplEditing] = useState<CrmMessageTemplate | null>(null);
  const [tplAdding, setTplAdding] = useState(false);
  const [tplDeleting, setTplDeleting] = useState<CrmMessageTemplate | null>(null);
  const [tplForm, setTplForm] = useState(emptyTplForm);

  // ── Data queries ──────────────────────────────────────────────────────────

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

  const templatesQuery = useQuery({
    queryKey: ['crm-templates'],
    queryFn: () => adminApi.listCrmTemplates(),
  });
  const templates: CrmMessageTemplate[] = templatesQuery.data?.data?.data ?? [];

  // ── Mutations ─────────────────────────────────────────────────────────────

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

  const importMutation = useMutation({
    mutationFn: (file: File) => adminApi.importCrmProspects(file),
    onSuccess: (res) => {
      setImportResult(res.data?.data);
      qc.invalidateQueries({ queryKey: ['crm'] });
      qc.invalidateQueries({ queryKey: ['crm-stats'] });
    },
  });

  const saveTplMutation = useMutation({
    mutationFn: (payload: typeof emptyTplForm) =>
      tplEditing ? adminApi.updateCrmTemplate(tplEditing.id, payload) : adminApi.createCrmTemplate(payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['crm-templates'] });
      setTplEditing(null);
      setTplAdding(false);
    },
  });

  const deleteTplMutation = useMutation({
    mutationFn: (id: number) => adminApi.deleteCrmTemplate(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['crm-templates'] });
      setTplDeleting(null);
    },
  });

  // ── Handlers ──────────────────────────────────────────────────────────────

  const openEdit = (p: Prospect) => {
    setForm({
      business_name: p.business_name, category: p.category ?? '', city: p.city ?? '',
      address: p.address ?? '', phone: p.phone ?? '', website: p.website ?? '',
      instagram: p.instagram ?? '', contact_person: p.contact_person ?? '',
      contact_role: p.contact_role ?? '', pipeline_stage: p.pipeline_stage,
      notes: p.notes ?? '', last_contact_at: '', next_followup_at: p.next_followup_at ?? '',
    });
    setSelectedTemplateId(null);
    setEditing(p);
  };

  const openAdd = () => { setForm(emptyForm); setAdding(true); };

  const openTplEdit = (t: CrmMessageTemplate) => {
    setTplForm({ name: t.name, content: t.content, category: t.category ?? '' });
    setTplEditing(t);
  };

  const openTplAdd = () => { setTplForm(emptyTplForm); setTplAdding(true); };

  const handleImport = () => {
    if (importFile) importMutation.mutate(importFile);
  };

  const selectedTemplate = templates.find((t) => t.id === selectedTemplateId) ?? null;
  const previewText = selectedTemplate
    ? replacePlaceholders(selectedTemplate.content, editing ?? {})
    : '';

  const whatsappLink = editing?.phone
    ? `https://wa.me/${editing.phone.replace(/\D/g, '')}`
    : null;

  const isFormOpen = !!editing || adding;
  const isTplFormOpen = !!tplEditing || tplAdding;

  // ── Render ────────────────────────────────────────────────────────────────

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
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setTemplatesOpen(true)}>
            <MessageSquare className="h-4 w-4 mr-1" /> Templates
          </Button>
          <Button variant="outline" size="sm" onClick={() => { setImportResult(null); setImportFile(null); setImportOpen(true); }}>
            <Upload className="h-4 w-4 mr-1" /> Import CSV
          </Button>
          <Button onClick={openAdd} size="sm">
            <Plus className="h-4 w-4 mr-1" /> Add Prospect
          </Button>
        </div>
      </div>

      {/* Stats */}
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
        {[{ value: '', label: 'Semua' }, ...STAGES].map((s) => (
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
            {stageFilter ? 'No prospects in this stage.' : 'No prospects yet. Add the first one or import a CSV.'}
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
                    {p.next_followup_at ? new Date(p.next_followup_at).toLocaleDateString('id-ID') : '—'}
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

      {/* ── Prospect Form Dialog ─────────────────────────────────────────────── */}
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
                <Select value={form.category || '__none'} onValueChange={(v) => setForm({ ...form, category: v === '__none' ? '' : v })}>
                  <SelectTrigger><SelectValue placeholder="Pilih…" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none">—</SelectItem>
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
              <Label>Website</Label>
              <Input value={form.website} onChange={(e) => setForm({ ...form, website: e.target.value })} placeholder="https://..." />
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

            {/* Template preview (only when editing) */}
            {editing && templates.length > 0 && (
              <div className="border-t pt-3 space-y-2">
                <Label className="flex items-center gap-1.5">
                  <MessageSquare className="h-3.5 w-3.5" /> Preview Pesan
                </Label>
                <Select
                  value={selectedTemplateId ? String(selectedTemplateId) : '__none'}
                  onValueChange={(v) => setSelectedTemplateId(v === '__none' ? null : Number(v))}
                >
                  <SelectTrigger><SelectValue placeholder="Pilih template…" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none">— Pilih template —</SelectItem>
                    {templates.map((t) => <SelectItem key={t.id} value={String(t.id)}>{t.name}</SelectItem>)}
                  </SelectContent>
                </Select>
                {previewText && (
                  <div className="relative bg-gray-50 border rounded-md p-3">
                    <p className="text-sm whitespace-pre-wrap text-gray-800 pr-8">{previewText}</p>
                    <div className="absolute top-2 right-2 flex gap-1">
                      <CopyButton text={previewText} />
                      {whatsappLink && (
                        <a href={whatsappLink} target="_blank" rel="noopener noreferrer"
                          className="p-1.5 rounded hover:bg-gray-100 text-gray-400 hover:text-green-600 transition-colors" title="Buka WhatsApp">
                          <ExternalLink className="h-3.5 w-3.5" />
                        </a>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

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

      {/* ── CSV Import Dialog ───────────────────────────────────────────────── */}
      <Dialog open={importOpen} onOpenChange={(o) => { if (!o) setImportOpen(false); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Import Prospects dari CSV</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="bg-gray-50 rounded-md p-3 text-xs text-gray-600 space-y-1">
              <p className="font-semibold text-gray-700 mb-1">Format kolom yang didukung:</p>
              <p>Business Name, Address, Phone, Website, Notes, Status/Pipeline Stage, Category, City, Contact Person</p>
              <p className="text-gray-400 mt-1">Baris pertama harus header. Status yang valid: new, contacted, demo_scheduled, negotiation, won, lost.</p>
            </div>
            <div>
              <input
                ref={fileRef}
                type="file"
                accept=".csv"
                className="hidden"
                onChange={(e) => setImportFile(e.target.files?.[0] ?? null)}
              />
              <div
                className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center cursor-pointer hover:border-emerald-400 transition-colors"
                onClick={() => fileRef.current?.click()}
              >
                <Upload className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                {importFile ? (
                  <p className="text-sm font-medium text-emerald-700">{importFile.name}</p>
                ) : (
                  <p className="text-sm text-gray-400">Klik untuk pilih file CSV</p>
                )}
              </div>
            </div>

            {importResult && (
              <div className={`rounded-md p-3 text-sm ${importResult.skipped > 0 ? 'bg-amber-50 border border-amber-200' : 'bg-emerald-50 border border-emerald-200'}`}>
                <p className="font-semibold text-gray-800">{importResult.created} prospects berhasil diimpor</p>
                {importResult.skipped > 0 && <p className="text-amber-700">{importResult.skipped} baris dilewati</p>}
                {importResult.errors.length > 0 && (
                  <ul className="mt-1 text-xs text-red-700 space-y-0.5">
                    {importResult.errors.map((e, i) => <li key={i}>{e}</li>)}
                  </ul>
                )}
              </div>
            )}

            {importMutation.isError && (
              <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-md px-3 py-2">
                <AlertCircle className="h-4 w-4 text-red-500 mt-0.5 shrink-0" />
                <p className="text-xs text-red-700">Import gagal. Pastikan format file CSV benar.</p>
              </div>
            )}

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setImportOpen(false)}>Tutup</Button>
              <Button
                onClick={handleImport}
                disabled={!importFile || importMutation.isPending}
              >
                {importMutation.isPending ? 'Mengimpor…' : 'Import'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Templates Dialog ────────────────────────────────────────────────── */}
      <Dialog open={templatesOpen} onOpenChange={(o) => { if (!o) setTemplatesOpen(false); }}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <DialogTitle>Message Templates</DialogTitle>
              <Button size="sm" onClick={openTplAdd}>
                <Plus className="h-4 w-4 mr-1" /> Buat Template
              </Button>
            </div>
          </DialogHeader>

          <div className="space-y-3 pt-2">
            <div className="bg-gray-50 border rounded-md px-3 py-2 text-xs text-gray-500">
              Placeholder yang tersedia: <code className="bg-white px-1 rounded">{'{{business_name}}'}</code>{' '}
              <code className="bg-white px-1 rounded">{'{{company_name}}'}</code>{' '}
              <code className="bg-white px-1 rounded">{'{{coverage_area}}'}</code>{' '}
              <code className="bg-white px-1 rounded">{'{{website}}'}</code>{' '}
              <code className="bg-white px-1 rounded">{'{{phone}}'}</code>
            </div>

            {templatesQuery.isLoading ? (
              <div className="py-8 text-center text-sm text-gray-400">Memuat templates…</div>
            ) : templates.length === 0 ? (
              <div className="py-8 text-center text-sm text-gray-400">Belum ada template. Buat yang pertama.</div>
            ) : (
              <div className="divide-y border rounded-lg overflow-hidden">
                {templates.map((t) => (
                  <div key={t.id} className="bg-white p-4">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm">{t.name}</p>
                        {t.category && <p className="text-xs text-gray-400 capitalize">{t.category}</p>}
                        <p className="text-xs text-gray-500 mt-1.5 whitespace-pre-wrap line-clamp-3">{t.content}</p>
                      </div>
                      <div className="flex gap-1 shrink-0">
                        <CopyButton text={t.content} />
                        <button onClick={() => openTplEdit(t)} className="p-1.5 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-700">
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button onClick={() => setTplDeleting(t)} className="p-1.5 rounded hover:bg-red-50 text-gray-400 hover:text-red-600">
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Template Form Dialog ────────────────────────────────────────────── */}
      <Dialog open={isTplFormOpen} onOpenChange={(o) => { if (!o) { setTplEditing(null); setTplAdding(false); } }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{tplEditing ? 'Edit Template' : 'Buat Template'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 pt-2">
            <div className="space-y-1.5">
              <Label>Nama Template *</Label>
              <Input value={tplForm.name} onChange={(e) => setTplForm({ ...tplForm, name: e.target.value })} placeholder="Perkenalan Awal" />
            </div>
            <div className="space-y-1.5">
              <Label>Kategori</Label>
              <Input value={tplForm.category} onChange={(e) => setTplForm({ ...tplForm, category: e.target.value })} placeholder="intro, follow-up, dll" />
            </div>
            <div className="space-y-1.5">
              <Label>Isi Pesan *</Label>
              <textarea
                className="w-full border rounded-md px-3 py-2 text-sm resize-none h-32 focus:outline-none focus:ring-2 focus:ring-ring font-mono"
                value={tplForm.content}
                onChange={(e) => setTplForm({ ...tplForm, content: e.target.value })}
                placeholder="Halo {{business_name}}, kami dari {{company_name}}…"
              />
            </div>
            {saveTplMutation.isError && (
              <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-md px-3 py-2">
                <AlertCircle className="h-4 w-4 text-red-500 mt-0.5 shrink-0" />
                <p className="text-xs text-red-700">Gagal menyimpan template.</p>
              </div>
            )}
            <div className="flex justify-end gap-2 pt-1">
              <Button variant="outline" onClick={() => { setTplEditing(null); setTplAdding(false); }}>Batal</Button>
              <Button onClick={() => saveTplMutation.mutate(tplForm)} disabled={saveTplMutation.isPending || !tplForm.name || !tplForm.content}>
                {saveTplMutation.isPending ? 'Menyimpan…' : 'Simpan'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Delete Dialogs ───────────────────────────────────────────────────── */}
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
      <ConfirmDialog
        open={!!tplDeleting}
        title="Hapus Template"
        description={`Hapus template "${tplDeleting?.name}"?`}
        confirmLabel="Hapus"
        variant="destructive"
        loading={deleteTplMutation.isPending}
        onConfirm={() => tplDeleting && deleteTplMutation.mutate(tplDeleting.id)}
        onCancel={() => setTplDeleting(null)}
      />
    </div>
  );
}

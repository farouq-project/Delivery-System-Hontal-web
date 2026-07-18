'use client';

import { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { adminApi } from '@/lib/api';
import type { CrmMessageTemplate, CrmActivity } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import {
  TrendingUp, Plus, Pencil, Trash2, AlertCircle, Upload, Copy, MessageSquare,
  ExternalLink, Check, Download, FlaskConical, FileText, Phone, Mail,
  MessageCircle, Calendar, StickyNote,
} from 'lucide-react';

// ── Constants ────────────────────────────────────────────────────────────────

const STAGES = [
  { value: 'new',            label: 'Baru',           color: 'bg-gray-100 text-gray-700' },
  { value: 'contacted',      label: 'Dihubungi',      color: 'bg-blue-100 text-blue-700' },
  { value: 'interested',     label: 'Tertarik',       color: 'bg-cyan-100 text-cyan-700' },
  { value: 'demo_scheduled', label: 'Demo Terjadwal', color: 'bg-indigo-100 text-indigo-700' },
  { value: 'trial_running',  label: 'Trial Aktif',    color: 'bg-violet-100 text-violet-700' },
  { value: 'negotiation',    label: 'Negosiasi',      color: 'bg-amber-100 text-amber-700' },
  { value: 'converted',      label: 'Berhasil',       color: 'bg-emerald-100 text-emerald-700' },
  { value: 'won',            label: 'Berhasil',       color: 'bg-emerald-100 text-emerald-700' },
  { value: 'lost',           label: 'Tidak Jadi',     color: 'bg-red-100 text-red-700' },
];

const STAGE_MAP = Object.fromEntries(STAGES.map(s => [s.value, s]));

// Stages shown as filter pills (exclude legacy 'won' / 'negotiation')
const FILTER_STAGES = STAGES.filter(s => !['won', 'negotiation'].includes(s.value));

const CATEGORIES = ['water', 'catering', 'bakery', 'frozen', 'egg', 'wholesale', 'other'];

const ACTIVITY_ICONS: Record<string, React.ElementType> = {
  note:      StickyNote,
  call:      Phone,
  whatsapp:  MessageCircle,
  email:     Mail,
  demo:      Calendar,
};

// Stages that make sense to launch a trial from
const TRIAL_STAGES = ['interested', 'demo_scheduled', 'trial_running'];

// ── Template placeholder replacement ────────────────────────────────────────

interface ProspectLike {
  business_name?: string;
  contact_person?: string | null;
  city?: string | null;
  category?: string | null;
  website?: string | null;
  phone?: string | null;
  address?: string | null;
  email?: string | null;
}

function replacePlaceholders(template: string, p: ProspectLike): string {
  return template
    .replace(/\{\{business_name\}\}/g, p.business_name ?? '')
    .replace(/\{\{contact_name\}\}/g,  p.contact_person ?? '')
    .replace(/\{\{company_name\}\}/g,  'Hontal')
    .replace(/\{\{coverage_area\}\}/g, p.city ?? '')
    .replace(/\{\{city\}\}/g,          p.city ?? '')
    .replace(/\{\{industry\}\}/g,      p.category ?? '')
    .replace(/\{\{website\}\}/g,       p.website ?? '')
    .replace(/\{\{phone\}\}/g,         p.phone ?? '')
    .replace(/\{\{address\}\}/g,       p.address ?? '')
    .replace(/\{\{sender_name\}\}/g,   'Tim Hontal')
    .replace(/\{\{sender_phone\}\}/g,  '')
    .replace(/\{\{demo_link\}\}/g,     '')
    .replace(/\{\{trial_days\}\}/g,    '30');
}

// ── Types ────────────────────────────────────────────────────────────────────

interface Prospect {
  id: number;
  business_name: string;
  category: string | null;
  city: string | null;
  phone: string | null;
  email: string | null;
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
  email: '', website: '', instagram: '', contact_person: '', contact_role: '',
  pipeline_stage: 'new', notes: '', last_contact_at: '', next_followup_at: '',
};

const emptyTplForm = { name: '', content: '', category: '' };

// ── CopyButton ────────────────────────────────────────────────────────────────

function CopyButton({ text, title = 'Salin' }: { text: string; title?: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={() => { navigator.clipboard.writeText(text).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); }); }}
      className="p-1.5 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-700 transition-colors"
      title={title}
    >
      {copied ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
    </button>
  );
}

// ── Activities Feed ───────────────────────────────────────────────────────────

function ActivitiesFeed({ prospectId }: { prospectId: number }) {
  const qc = useQueryClient();
  const [type, setType] = useState('note');
  const [content, setContent] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['crm-activities', prospectId],
    queryFn: () => adminApi.listCrmActivities(prospectId),
  });
  const activities: CrmActivity[] = data?.data?.data ?? [];

  const addMutation = useMutation({
    mutationFn: () => adminApi.addCrmActivity(prospectId, { type, content }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['crm-activities', prospectId] });
      setContent('');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (actId: number) => adminApi.deleteCrmActivity(prospectId, actId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['crm-activities', prospectId] }),
  });

  return (
    <div className="border-t pt-3 space-y-3">
      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Aktivitas</p>

      {isLoading && <p className="text-xs text-gray-400">Memuat…</p>}

      {activities.length > 0 && (
        <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
          {activities.map((a) => {
            const Icon = ACTIVITY_ICONS[a.type] ?? StickyNote;
            return (
              <div key={a.id} className="flex items-start gap-2 group">
                <Icon className="h-3.5 w-3.5 text-gray-400 mt-0.5 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-gray-700">{a.content}</p>
                  <p className="text-xs text-gray-400">
                    {a.created_by_name ?? 'Admin'} · {new Date(a.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </p>
                </div>
                <button
                  onClick={() => deleteMutation.mutate(a.id)}
                  className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-red-50 text-gray-300 hover:text-red-500 transition-all"
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              </div>
            );
          })}
        </div>
      )}

      {activities.length === 0 && !isLoading && (
        <p className="text-xs text-gray-400">Belum ada aktivitas.</p>
      )}

      <div className="flex gap-2 items-start">
        <select
          value={type}
          onChange={e => setType(e.target.value)}
          className="border rounded-md text-xs px-2 py-1.5 text-gray-600 shrink-0"
        >
          <option value="note">Catatan</option>
          <option value="call">Telepon</option>
          <option value="whatsapp">WhatsApp</option>
          <option value="email">Email</option>
          <option value="demo">Demo</option>
        </select>
        <Input
          value={content}
          onChange={e => setContent(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && content.trim()) addMutation.mutate(); }}
          placeholder="Catat aktivitas…"
          className="text-xs h-8"
        />
        <button
          onClick={() => addMutation.mutate()}
          disabled={!content.trim() || addMutation.isPending}
          className="px-2.5 py-1.5 bg-gray-800 text-white rounded-md text-xs disabled:opacity-50 shrink-0"
        >
          +
        </button>
      </div>
    </div>
  );
}

// ── Import Dialog ─────────────────────────────────────────────────────────────

interface ImportPreviewRow {
  business_name: string;
  contact_person?: string;
  city?: string;
  phone?: string;
  email?: string;
  pipeline_stage?: string;
}

interface ImportPreviewData {
  preview: ImportPreviewRow[];
  total_rows: number;
  valid_rows: number;
  skipped: number;
  errors: string[];
}

function ImportDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<ImportPreviewData | null>(null);
  const [importResult, setImportResult] = useState<{ created: number; skipped: number; errors: string[] } | null>(null);

  const previewMutation = useMutation({
    mutationFn: (file: File) => adminApi.previewCrmImport(file),
    onSuccess: (res) => setPreview(res.data?.data),
  });

  const importMutation = useMutation({
    mutationFn: (file: File) => adminApi.importCrmProspects(file),
    onSuccess: (res) => {
      setImportResult(res.data?.data);
      setPreview(null);
      qc.invalidateQueries({ queryKey: ['crm'] });
      qc.invalidateQueries({ queryKey: ['crm-stats'] });
    },
  });

  const handleFileChange = (file: File) => {
    setImportFile(file);
    setPreview(null);
    setImportResult(null);
    previewMutation.mutate(file);
  };

  const handleDownloadTemplate = async () => {
    try {
      const res = await adminApi.downloadCrmTemplate();
      const url = URL.createObjectURL(res.data as Blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'hontal-crm-template.csv';
      a.click();
      URL.revokeObjectURL(url);
    } catch {}
  };

  const handleClose = () => {
    setImportFile(null);
    setPreview(null);
    setImportResult(null);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) handleClose(); }}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Import Prospects dari CSV</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-2">
          {/* Template download */}
          <div className="flex items-center justify-between bg-gray-50 rounded-md px-3 py-2.5">
            <div>
              <p className="text-sm font-medium text-gray-700">1. Download template CSV</p>
              <p className="text-xs text-gray-400">Business Name, Contact Name, Phone, Email, City, Industry, Notes, Status</p>
            </div>
            <button
              onClick={handleDownloadTemplate}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs border border-gray-300 rounded-md hover:bg-white text-gray-600 transition-colors shrink-0"
            >
              <Download className="h-3.5 w-3.5" />
              Download
            </button>
          </div>

          {/* File drop zone */}
          <div>
            <p className="text-sm font-medium text-gray-700 mb-2">2. Upload file yang sudah diisi</p>
            <input
              ref={fileRef}
              type="file"
              accept=".csv"
              className="hidden"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFileChange(f); }}
            />
            <div
              className="border-2 border-dashed border-gray-300 rounded-lg p-5 text-center cursor-pointer hover:border-emerald-400 transition-colors"
              onClick={() => fileRef.current?.click()}
            >
              <Upload className="h-6 w-6 mx-auto mb-1.5 text-gray-300" />
              {importFile ? (
                <p className="text-sm font-medium text-emerald-700">{importFile.name}</p>
              ) : (
                <p className="text-sm text-gray-400">Klik untuk pilih file CSV</p>
              )}
            </div>
          </div>

          {/* Preview loading */}
          {previewMutation.isPending && (
            <p className="text-sm text-gray-400 text-center py-2">Memvalidasi file…</p>
          )}

          {/* Preview table */}
          {preview && !importResult && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-medium text-gray-700">
                  3. Preview — {preview.valid_rows} baris valid
                  {preview.skipped > 0 && <span className="text-amber-600 ml-1">({preview.skipped} dilewati)</span>}
                </p>
              </div>

              {preview.errors.length > 0 && (
                <div className="mb-2 bg-amber-50 border border-amber-200 rounded-md px-3 py-2">
                  <ul className="text-xs text-amber-700 space-y-0.5">
                    {preview.errors.map((e, i) => <li key={i}>{e}</li>)}
                  </ul>
                </div>
              )}

              {preview.preview.length > 0 && (
                <div className="overflow-x-auto border rounded-md">
                  <table className="min-w-full text-xs">
                    <thead className="bg-gray-50 border-b text-gray-500 uppercase tracking-wide">
                      <tr>
                        <th className="px-3 py-2 text-left">Bisnis</th>
                        <th className="px-3 py-2 text-left">Kota</th>
                        <th className="px-3 py-2 text-left">Kontak</th>
                        <th className="px-3 py-2 text-left">Stage</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {preview.preview.map((row, i) => (
                        <tr key={i} className="hover:bg-gray-50">
                          <td className="px-3 py-2 font-medium">{row.business_name}</td>
                          <td className="px-3 py-2 text-gray-500">{row.city ?? '—'}</td>
                          <td className="px-3 py-2 text-gray-500">{row.contact_person ?? '—'}</td>
                          <td className="px-3 py-2">
                            <span className={`px-1.5 py-0.5 rounded-full text-xs ${STAGE_MAP[row.pipeline_stage ?? 'new']?.color ?? 'bg-gray-100 text-gray-700'}`}>
                              {STAGE_MAP[row.pipeline_stage ?? 'new']?.label ?? row.pipeline_stage}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {preview.total_rows > 20 && (
                    <p className="text-xs text-gray-400 text-center py-2">
                      …dan {preview.valid_rows - 20} baris lainnya
                    </p>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Import result */}
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
            <Button variant="outline" onClick={handleClose}>Tutup</Button>
            {preview && !importResult && (
              <Button
                onClick={() => importFile && importMutation.mutate(importFile)}
                disabled={!importFile || importMutation.isPending || preview.valid_rows === 0}
              >
                {importMutation.isPending ? 'Mengimpor…' : `Import ${preview.valid_rows} Prospects`}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function CrmPage() {
  const qc = useQueryClient();
  const router = useRouter();
  const [stageFilter, setStageFilter] = useState('');
  const [editing, setEditing] = useState<Prospect | null>(null);
  const [adding, setAdding] = useState(false);
  const [deleting, setDeleting] = useState<Prospect | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [selectedTemplateId, setSelectedTemplateId] = useState<number | null>(null);
  const [importOpen, setImportOpen] = useState(false);
  const [templatesOpen, setTemplatesOpen] = useState(false);
  const [tplEditing, setTplEditing] = useState<CrmMessageTemplate | null>(null);
  const [tplAdding, setTplAdding] = useState(false);
  const [tplDeleting, setTplDeleting] = useState<CrmMessageTemplate | null>(null);
  const [tplForm, setTplForm] = useState(emptyTplForm);

  // ── Queries ────────────────────────────────────────────────────────────────

  const { data, isLoading } = useQuery({
    queryKey: ['crm', stageFilter],
    queryFn: () => adminApi.listCrmProspects({ stage: stageFilter || undefined }),
  });
  const prospects: Prospect[] = data?.data?.data ?? [];

  const statsQuery = useQuery({ queryKey: ['crm-stats'], queryFn: () => adminApi.getCrmStats() });
  const stats = statsQuery.data?.data?.data;

  const templatesQuery = useQuery({ queryKey: ['crm-templates'], queryFn: () => adminApi.listCrmTemplates() });
  const templates: CrmMessageTemplate[] = templatesQuery.data?.data?.data ?? [];

  // ── Mutations ──────────────────────────────────────────────────────────────

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

  // ── Handlers ───────────────────────────────────────────────────────────────

  const openEdit = (p: Prospect) => {
    setForm({
      business_name: p.business_name,  category: p.category ?? '',
      city: p.city ?? '',              address: p.address ?? '',
      phone: p.phone ?? '',            email: p.email ?? '',
      website: p.website ?? '',        instagram: p.instagram ?? '',
      contact_person: p.contact_person ?? '',
      contact_role: p.contact_role ?? '',
      pipeline_stage: p.pipeline_stage,
      notes: p.notes ?? '',
      last_contact_at: '',
      next_followup_at: p.next_followup_at ?? '',
    });
    setSelectedTemplateId(null);
    setEditing(p);
  };

  const openAdd = () => { setForm(emptyForm); setAdding(true); };

  const openTplEdit = (t: CrmMessageTemplate) => {
    setTplForm({ name: t.name, content: t.content, category: t.category ?? '' });
    setTplEditing(t);
  };

  const handleLaunchTrial = (p: Prospect) => {
    const params = new URLSearchParams({
      from_prospect: String(p.id),
      company_name:  p.business_name,
      owner_name:    p.contact_person ?? '',
      phone:         p.phone ?? '',
      owner_email:   p.email ?? '',
    });
    router.push(`/admin/trial-wizard?${params.toString()}`);
  };

  const selectedTemplate = templates.find((t) => t.id === selectedTemplateId) ?? null;
  const previewText = selectedTemplate ? replacePlaceholders(selectedTemplate.content, editing ?? {}) : '';
  const whatsappLink = editing?.phone
    ? `https://wa.me/${editing.phone.replace(/\D/g, '')}?text=${encodeURIComponent(previewText)}`
    : null;

  const isFormOpen = !!editing || adding;
  const isTplFormOpen = !!tplEditing || tplAdding;

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <TrendingUp className="h-6 w-6 text-emerald-500" />
          <div>
            <h1 className="text-xl font-bold">Sales CRM</h1>
            <p className="text-sm text-gray-500">Pipeline prospek merchant Hontal</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setTemplatesOpen(true)}>
            <MessageSquare className="h-4 w-4 mr-1" /> Templates
          </Button>
          <Button variant="outline" size="sm" onClick={() => setImportOpen(true)}>
            <Upload className="h-4 w-4 mr-1" /> Import CSV
          </Button>
          <Button onClick={openAdd} size="sm">
            <Plus className="h-4 w-4 mr-1" /> Tambah Prospek
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
            <p className="text-xs text-emerald-600">Berhasil</p>
            <p className="text-2xl font-bold text-emerald-700">{stats.converted ?? 0}</p>
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

      {/* Stage filter pills */}
      <div className="flex gap-2 mb-4 flex-wrap">
        {[{ value: '', label: 'Semua', color: '' }, ...FILTER_STAGES].map((s) => (
          <button
            key={s.value}
            onClick={() => setStageFilter(s.value)}
            className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
              stageFilter === s.value
                ? 'bg-gray-800 text-white border-gray-800'
                : 'bg-white text-gray-600 border-gray-200 hover:border-gray-400'
            }`}
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
            {stageFilter ? 'Tidak ada prospek di stage ini.' : 'Belum ada prospek. Tambah manual atau import CSV.'}
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
              {prospects.map((p) => {
                const stageInfo = STAGE_MAP[p.pipeline_stage];
                return (
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
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${stageInfo?.color ?? 'bg-gray-100 text-gray-700'}`}>
                        {stageInfo?.label ?? p.pipeline_stage}
                      </span>
                    </td>
                    <td className="px-4 py-3 hidden lg:table-cell text-gray-500 text-xs">
                      {p.next_followup_at ? new Date(p.next_followup_at).toLocaleDateString('id-ID') : '—'}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-1">
                        {TRIAL_STAGES.includes(p.pipeline_stage) && (
                          <button
                            onClick={() => handleLaunchTrial(p)}
                            className="p-1.5 rounded hover:bg-violet-50 text-gray-400 hover:text-violet-600"
                            title="Buat Trial Merchant"
                          >
                            <FlaskConical className="h-3.5 w-3.5" />
                          </button>
                        )}
                        <button onClick={() => openEdit(p)} className="p-1.5 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-700">
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button onClick={() => setDeleting(p)} className="p-1.5 rounded hover:bg-red-50 text-gray-400 hover:text-red-600">
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* ── Prospect Form Dialog ───────────────────────────────────────────── */}
      <Dialog open={isFormOpen} onOpenChange={(o) => { if (!o) { setEditing(null); setAdding(false); } }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit Prospek' : 'Tambah Prospek'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 pt-2">
            <div className="space-y-1.5">
              <Label>Nama Bisnis *</Label>
              <Input value={form.business_name} onChange={(e) => setForm({ ...form, business_name: e.target.value })} placeholder="UD Tirta Jaya" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Industri</Label>
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
                <Label>Nama Kontak</Label>
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
                <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="0812…" />
              </div>
              <div className="space-y-1.5">
                <Label>Email</Label>
                <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="budi@contoh.com" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Website</Label>
                <Input value={form.website} onChange={(e) => setForm({ ...form, website: e.target.value })} placeholder="https://…" />
              </div>
              <div className="space-y-1.5">
                <Label>Instagram</Label>
                <Input value={form.instagram} onChange={(e) => setForm({ ...form, instagram: e.target.value })} placeholder="@username" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Stage</Label>
                <Select value={form.pipeline_stage} onValueChange={(v) => setForm({ ...form, pipeline_stage: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {FILTER_STAGES.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Follow-up Berikutnya</Label>
                <Input type="date" value={form.next_followup_at} onChange={(e) => setForm({ ...form, next_followup_at: e.target.value })} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Catatan</Label>
              <textarea
                className="w-full border rounded-md px-3 py-2 text-sm resize-none h-16 focus:outline-none focus:ring-2 focus:ring-ring"
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                placeholder="Tertarik dengan fitur routing…"
              />
            </div>

            {/* Trial Wizard link */}
            {editing && TRIAL_STAGES.includes(form.pipeline_stage) && (
              <div className="flex items-center gap-2 bg-violet-50 border border-violet-200 rounded-md px-3 py-2">
                <FlaskConical className="h-4 w-4 text-violet-500 shrink-0" />
                <p className="text-xs text-violet-800 flex-1">Prospek ini siap untuk trial.</p>
                <button
                  onClick={() => { setEditing(null); setAdding(false); handleLaunchTrial({ ...editing, ...form }); }}
                  className="text-xs font-medium text-violet-700 hover:underline"
                >
                  Buat Trial →
                </button>
              </div>
            )}

            {/* Message template preview */}
            {editing && templates.length > 0 && (
              <div className="border-t pt-3 space-y-2">
                <Label className="flex items-center gap-1.5 text-xs">
                  <MessageSquare className="h-3.5 w-3.5" /> Preview Pesan WhatsApp
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
                    <p className="text-sm whitespace-pre-wrap text-gray-800 pr-14">{previewText}</p>
                    <div className="absolute top-2 right-2 flex gap-1">
                      <CopyButton text={previewText} />
                      {editing?.phone && (
                        <a
                          href={whatsappLink ?? '#'}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-1.5 rounded hover:bg-gray-100 text-gray-400 hover:text-green-600 transition-colors"
                          title="Kirim ke WhatsApp"
                        >
                          <ExternalLink className="h-3.5 w-3.5" />
                        </a>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Activities */}
            {editing && <ActivitiesFeed prospectId={editing.id} />}

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

      {/* ── Import Dialog ──────────────────────────────────────────────────── */}
      <ImportDialog open={importOpen} onClose={() => setImportOpen(false)} />

      {/* ── Templates Dialog ───────────────────────────────────────────────── */}
      <Dialog open={templatesOpen} onOpenChange={(o) => { if (!o) setTemplatesOpen(false); }}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <DialogTitle>Message Templates</DialogTitle>
              <Button size="sm" onClick={() => { setTplForm(emptyTplForm); setTplAdding(true); }}>
                <Plus className="h-4 w-4 mr-1" /> Buat Template
              </Button>
            </div>
          </DialogHeader>

          <div className="space-y-3 pt-2">
            <div className="bg-gray-50 border rounded-md px-3 py-2 text-xs text-gray-500 leading-relaxed">
              <span className="font-medium text-gray-600">Placeholder:</span>{' '}
              {[
                '{{business_name}}', '{{contact_name}}', '{{city}}', '{{industry}}',
                '{{website}}', '{{phone}}', '{{sender_name}}', '{{trial_days}}',
              ].map((p) => (
                <code key={p} className="bg-white border px-1 rounded mr-1">{p}</code>
              ))}
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
                        <CopyButton text={t.content} title="Salin isi" />
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

      {/* ── Template Form Dialog ───────────────────────────────────────────── */}
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
                className="w-full border rounded-md px-3 py-2 text-sm resize-none h-36 focus:outline-none focus:ring-2 focus:ring-ring font-mono text-xs"
                value={tplForm.content}
                onChange={(e) => setTplForm({ ...tplForm, content: e.target.value })}
                placeholder="Halo {{contact_name}}, perkenalkan kami dari {{company_name}}…"
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

      {/* ── Delete Dialogs ─────────────────────────────────────────────────── */}
      <ConfirmDialog
        open={!!deleting}
        title="Hapus Prospek"
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

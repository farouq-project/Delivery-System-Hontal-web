'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { growthApi } from '@/lib/api';
import { SectionHeader } from '@/components/bi/SectionHeader';
import { EmptyState }    from '@/components/bi/EmptyState';
import { fmtIdr, fmtNum } from '@/components/bi/format';
import {
  Megaphone, Plus, Pencil, Trash2, X, ChevronDown
} from 'lucide-react';
import type { MarketingCampaign, MarketingAggregate, MarketingLeadSourceRow } from '@/types';
import { cn } from '@/lib/utils';
import { usePlatformMerchantStore } from '@/store/platform-merchant';

const PLATFORMS  = ['whatsapp','instagram','facebook','tiktok','google','offline','other'];
const LEAD_SOURCES = ['google','meta','instagram','whatsapp','tiktok','referral','marketplace','offline','walk_in','other'];
const TYPES      = ['broadcast','promo','referral','seasonal','retention','acquisition'];

function KpiCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
      <p className="text-xs text-gray-500">{label}</p>
      <p className="text-xl font-bold text-gray-900 mt-1">{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
    </div>
  );
}

type FormState = {
  name: string; platform: string; lead_source: string; campaign_type: string;
  start_date: string; end_date: string; budget: string; spend: string;
  reach: string; clicks: string; wa_conversations: string; leads: string;
  orders: string; customers_acquired: string; attributed_revenue: string; notes: string;
};

const EMPTY_FORM: FormState = {
  name: '', platform: 'whatsapp', lead_source: 'other', campaign_type: 'broadcast',
  start_date: '', end_date: '', budget: '0', spend: '0',
  reach: '0', clicks: '0', wa_conversations: '0', leads: '0',
  orders: '0', customers_acquired: '0', attributed_revenue: '0', notes: '',
};

export default function BiMarketingPage() {
  const qc = useQueryClient();
  const { isViewingMode } = usePlatformMerchantStore();
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<MarketingCampaign | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);

  const { data, isLoading, error } = useQuery({
    queryKey: ['growth', 'marketing'],
    queryFn: growthApi.listMarketing,
    staleTime: 5 * 60 * 1000,
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: ['growth', 'marketing'] });

  const createMutation = useMutation({
    mutationFn: (d: Record<string, unknown>) => growthApi.createCampaign(d),
    onSuccess: () => { invalidate(); setShowForm(false); setForm(EMPTY_FORM); },
  });
  const updateMutation = useMutation({
    mutationFn: ({ id, d }: { id: number; d: Record<string, unknown> }) => growthApi.updateCampaign(id, d),
    onSuccess: () => { invalidate(); setEditing(null); setForm(EMPTY_FORM); },
  });
  const deleteMutation = useMutation({
    mutationFn: (id: number) => growthApi.deleteCampaign(id),
    onSuccess: () => invalidate(),
  });

  const openCreate = () => { setForm(EMPTY_FORM); setEditing(null); setShowForm(true); };
  const openEdit   = (c: MarketingCampaign) => {
    setEditing(c);
    setForm({
      name: c.name, platform: c.platform, lead_source: c.lead_source, campaign_type: c.campaign_type,
      start_date: c.start_date, end_date: c.end_date ?? '', budget: String(c.budget),
      spend: String(c.spend), reach: String(c.reach), clicks: String(c.clicks),
      wa_conversations: String(c.wa_conversations), leads: String(c.leads),
      orders: String(c.orders), customers_acquired: String(c.customers_acquired),
      attributed_revenue: String(c.attributed_revenue), notes: c.notes ?? '',
    });
    setShowForm(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const payload: Record<string, unknown> = {
      name: form.name, platform: form.platform, lead_source: form.lead_source,
      campaign_type: form.campaign_type, start_date: form.start_date,
      end_date: form.end_date || null,
      budget: parseFloat(form.budget) || 0, spend: parseFloat(form.spend) || 0,
      reach: parseInt(form.reach) || 0, clicks: parseInt(form.clicks) || 0,
      wa_conversations: parseInt(form.wa_conversations) || 0,
      leads: parseInt(form.leads) || 0, orders: parseInt(form.orders) || 0,
      customers_acquired: parseInt(form.customers_acquired) || 0,
      attributed_revenue: parseFloat(form.attributed_revenue) || 0,
      notes: form.notes || null,
    };
    if (editing) updateMutation.mutate({ id: editing.id, d: payload });
    else createMutation.mutate(payload);
  };

  if (isLoading) return <div className="p-6 text-gray-400 text-sm">Loading marketing data…</div>;
  if (error)     return <div className="p-6 text-red-500 text-sm">Failed to load marketing data.</div>;

  const campaigns: MarketingCampaign[] = data?.data?.data?.campaigns ?? [];
  const agg: MarketingAggregate        = data?.data?.data?.aggregate ?? {} as MarketingAggregate;
  const bySrc: MarketingLeadSourceRow[] = data?.data?.data?.by_source ?? [];

  const fmtCurrency = (n: number | null) => n !== null ? `Rp ${fmtNum(n)}` : '—';
  const fmtRoas     = (r: number | null) => r !== null ? `${r}x` : '—';
  const fmtRate     = (r: number | null) => r !== null ? `${r}%` : '—';

  return (
    <div className="p-4 md:p-6 space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Marketing Dashboard</h1>
          <p className="text-sm text-gray-500 mt-0.5">Track campaigns, lead sources, and marketing ROI</p>
        </div>
        {!isViewingMode && (
          <button
            onClick={openCreate}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors"
          >
            <Plus className="h-4 w-4" /> Add Campaign
          </button>
        )}
      </div>

      {/* Aggregate KPIs */}
      <section>
        <SectionHeader title="Overall Performance" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <KpiCard label="Total Spend" value={`Rp ${fmtNum(agg.total_spend ?? 0)}`} sub={`Budget: Rp ${fmtNum(agg.total_budget ?? 0)}`} />
          <KpiCard label="Total Leads" value={fmtNum(agg.total_leads ?? 0)} sub={`Orders: ${fmtNum(agg.total_orders ?? 0)}`} />
          <KpiCard label="Customers Acquired" value={fmtNum(agg.total_customers_acquired ?? 0)} sub={`CAC: ${fmtCurrency(agg.overall_cac)}`} />
          <KpiCard label="Overall ROAS" value={fmtRoas(agg.overall_roas)} sub={`Revenue: Rp ${fmtNum(agg.total_attributed_revenue ?? 0)}`} />
        </div>
        <div className="grid grid-cols-3 gap-3 mt-3">
          <KpiCard label="Reach" value={fmtNum(agg.total_reach ?? 0)} />
          <KpiCard label="WA Conversations" value={fmtNum(agg.total_conversations ?? 0)} />
          <KpiCard label="Conversion Rate" value={fmtRate(agg.overall_conversion_rate)} sub="Orders / Leads" />
        </div>
      </section>

      {/* By Lead Source */}
      {bySrc.length > 0 && (
        <section>
          <SectionHeader title="Revenue by Lead Source" />
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr className="border-b border-gray-200">
                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-700">Lead Source</th>
                    <th className="px-4 py-3 text-right text-xs font-bold text-gray-700">Campaigns</th>
                    <th className="px-4 py-3 text-right text-xs font-bold text-gray-700">Spend</th>
                    <th className="px-4 py-3 text-right text-xs font-bold text-gray-700">Leads</th>
                    <th className="px-4 py-3 text-right text-xs font-bold text-gray-700">Orders</th>
                    <th className="px-4 py-3 text-right text-xs font-bold text-gray-700">Revenue</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {bySrc.map((row) => (
                    <tr key={row.lead_source} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium text-gray-800 capitalize">{row.lead_source.replace('_', ' ')}</td>
                      <td className="px-4 py-3 text-right text-gray-600">{fmtNum(row.campaigns)}</td>
                      <td className="px-4 py-3 text-right text-gray-600">{fmtIdr(row.total_spend)}</td>
                      <td className="px-4 py-3 text-right text-gray-600">{fmtNum(row.total_leads)}</td>
                      <td className="px-4 py-3 text-right text-gray-600">{fmtNum(row.total_orders)}</td>
                      <td className="px-4 py-3 text-right font-semibold text-gray-800">{fmtIdr(row.total_revenue)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      )}

      {/* Campaign list */}
      <section>
        <SectionHeader title={`Campaigns (${campaigns.length})`} />
        {campaigns.length === 0 ? (
          <EmptyState description="No campaigns yet. Add your first campaign to start tracking marketing ROI." />
        ) : (
          <div className="space-y-3">
            {campaigns.map((c) => (
              <div key={c.id} className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-semibold text-gray-900 truncate">{c.name}</h3>
                      <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700 capitalize">{c.platform}</span>
                      <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 capitalize">{c.lead_source.replace('_',' ')}</span>
                    </div>
                    <p className="text-xs text-gray-400 mt-0.5">{c.start_date} — {c.end_date ?? 'ongoing'}</p>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-3">
                      <div><p className="text-xs text-gray-400">Spend</p><p className="text-sm font-medium">{fmtIdr(c.spend)}</p></div>
                      <div><p className="text-xs text-gray-400">Leads</p><p className="text-sm font-medium">{fmtNum(c.leads)}</p></div>
                      <div><p className="text-xs text-gray-400">CAC</p><p className="text-sm font-medium">{fmtCurrency(c.cac)}</p></div>
                      <div><p className="text-xs text-gray-400">ROAS</p><p className="text-sm font-medium">{fmtRoas(c.roas)}</p></div>
                      <div><p className="text-xs text-gray-400">Revenue</p><p className="text-sm font-medium text-green-700">{fmtIdr(c.attributed_revenue)}</p></div>
                      <div><p className="text-xs text-gray-400">Orders</p><p className="text-sm font-medium">{fmtNum(c.orders)}</p></div>
                      <div><p className="text-xs text-gray-400">Conv. Rate</p><p className="text-sm font-medium">{fmtRate(c.conversion_rate)}</p></div>
                      <div><p className="text-xs text-gray-400">Acquired</p><p className="text-sm font-medium">{fmtNum(c.customers_acquired)}</p></div>
                    </div>
                  </div>
                  {!isViewingMode && (
                    <div className="flex items-center gap-2 shrink-0">
                      <button onClick={() => openEdit(c)} className="p-1.5 rounded hover:bg-gray-100 text-gray-500">
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => { if (confirm('Delete this campaign?')) deleteMutation.mutate(c.id); }}
                        className="p-1.5 rounded hover:bg-red-50 text-gray-500 hover:text-red-600"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Campaign Form Modal — hidden in viewing mode */}
      {showForm && !isViewingMode && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b border-gray-200">
              <h2 className="text-lg font-bold text-gray-900">{editing ? 'Edit Campaign' : 'New Campaign'}</h2>
              <button onClick={() => { setShowForm(false); setEditing(null); setForm(EMPTY_FORM); }}>
                <X className="h-5 w-5 text-gray-500" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Campaign Name *</label>
                <input required value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent" />
              </div>

              <div className="grid grid-cols-2 gap-4">
                {([['platform', 'Platform', PLATFORMS], ['lead_source', 'Lead Source', LEAD_SOURCES], ['campaign_type', 'Type', TYPES]] as [keyof FormState, string, string[]][]).map(([key, lbl, opts]) => (
                  <div key={key}>
                    <label className="block text-sm font-medium text-gray-700 mb-1">{lbl}</label>
                    <select value={form[key]} onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm">
                      {opts.map((o) => (
                        <option key={o} value={o}>{o.replace('_',' ')}</option>
                      ))}
                    </select>
                  </div>
                ))}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Start Date *</label>
                  <input type="date" required value={form.start_date} onChange={(e) => setForm((f) => ({ ...f, start_date: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
                  <input type="date" value={form.end_date} onChange={(e) => setForm((f) => ({ ...f, end_date: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {([
                  ['budget','Budget (Rp)'],['spend','Actual Spend (Rp)'],
                  ['reach','Reach'],['clicks','Clicks'],
                  ['wa_conversations','WA Conversations'],['leads','Leads'],
                  ['orders','Orders'],['customers_acquired','Customers Acquired'],
                  ['attributed_revenue','Attributed Revenue (Rp)'],
                ] as [keyof FormState, string][]).map(([key, lbl]) => (
                  <div key={key}>
                    <label className="block text-sm font-medium text-gray-700 mb-1">{lbl}</label>
                    <input type="number" min="0" step={key === 'budget' || key === 'spend' || key === 'attributed_revenue' ? '0.01' : '1'}
                      value={form[key]}
                      onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
                  </div>
                ))}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                <textarea rows={2} value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => { setShowForm(false); setEditing(null); setForm(EMPTY_FORM); }}
                  className="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50">
                  Cancel
                </button>
                <button type="submit" disabled={createMutation.isPending || updateMutation.isPending}
                  className="px-4 py-2 text-sm font-medium bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50">
                  {editing ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

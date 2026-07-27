'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { growthApi } from '@/lib/api';
import { useMerchantLabels } from '@/lib/merchant-labels';
import { SectionHeader } from '@/components/bi/SectionHeader';
import { EmptyState }    from '@/components/bi/EmptyState';
import { fmtIdr, fmtNum, fmtPct } from '@/components/bi/format';
import { Target, Plus, Pencil, Trash2, X, CheckCircle2, AlertCircle, Clock, TrendingUp } from 'lucide-react';
import type { MerchantGoal, GoalMetric, GoalPeriodType, GoalStatus } from '@/types';
import { cn } from '@/lib/utils';

const METRICS: { value: GoalMetric; label: string }[] = [
  { value: 'revenue',       label: 'Revenue' },
  { value: 'orders',        label: 'Orders' },
  { value: 'new_customers', label: 'New Customers' },
  { value: 'customers',     label: 'Total Customers' },
  { value: 'success_rate',  label: 'Success Rate (%)' },
];

const PERIODS: { value: GoalPeriodType; label: string }[] = [
  { value: 'daily',     label: 'Daily' },
  { value: 'weekly',    label: 'Weekly' },
  { value: 'monthly',   label: 'Monthly' },
  { value: 'quarterly', label: 'Quarterly' },
  { value: 'yearly',    label: 'Yearly' },
];

function statusConfig(status: GoalStatus) {
  switch (status) {
    case 'achieved':    return { color: 'bg-green-100 text-green-700', icon: CheckCircle2, barColor: 'bg-green-500' };
    case 'on_track':    return { color: 'bg-blue-100 text-blue-700', icon: TrendingUp, barColor: 'bg-blue-500' };
    case 'in_progress': return { color: 'bg-indigo-100 text-indigo-700', icon: Clock, barColor: 'bg-indigo-400' };
    case 'behind':      return { color: 'bg-amber-100 text-amber-700', icon: AlertCircle, barColor: 'bg-amber-500' };
    case 'ended':       return { color: 'bg-gray-100 text-gray-500', icon: CheckCircle2, barColor: 'bg-gray-300' };
    default:            return { color: 'bg-gray-100 text-gray-500', icon: Clock, barColor: 'bg-gray-300' };
  }
}

function formatGoalValue(metric: GoalMetric, value: number): string {
  if (metric === 'revenue') return fmtIdr(value);
  if (metric === 'success_rate') return fmtPct(value);
  return fmtNum(value);
}

function GoalCard({ goal, onEdit, onDelete }: {
  goal: MerchantGoal;
  onEdit: (g: MerchantGoal) => void;
  onDelete: (id: number) => void;
}) {
  const cfg   = statusConfig(goal.status);
  const Icon  = cfg.icon;
  const label = METRICS.find((m) => m.value === goal.metric)?.label ?? goal.metric;

  return (
    <div className={cn('bg-white rounded-lg border p-4 shadow-sm', goal.is_active ? 'border-gray-200' : 'border-gray-100 opacity-70')}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span className="font-semibold text-gray-900">{label}</span>
            <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium flex items-center gap-1', cfg.color)}>
              <Icon className="h-3 w-3" />
              {goal.status.replace('_', ' ')}
            </span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-500 capitalize">{goal.period_type}</span>
          </div>
          <p className="text-xs text-gray-400 mb-3">
            {goal.period_start} — {goal.period_end}
            {goal.notes && ` · ${goal.notes}`}
          </p>

          {/* Progress bar */}
          <div className="space-y-1.5">
            <div className="flex justify-between items-end">
              <span className="text-2xl font-bold text-gray-900">{formatGoalValue(goal.metric, goal.current)}</span>
              <span className="text-sm text-gray-500">/ {formatGoalValue(goal.metric, goal.target_value)}</span>
            </div>
            <div className="w-full bg-gray-100 rounded-full h-2">
              <div
                className={cn('h-2 rounded-full transition-all', cfg.barColor)}
                style={{ width: `${Math.min(goal.pct, 100)}%` }}
              />
            </div>
            <div className="flex justify-between text-xs text-gray-500">
              <span>{goal.pct}% complete</span>
              {goal.raw_pct > 100 && (
                <span className="text-green-600 font-medium">+{Math.round(goal.raw_pct - 100)}% over target!</span>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          <button onClick={() => onEdit(goal)} className="p-1.5 rounded hover:bg-gray-100 text-gray-500">
            <Pencil className="h-4 w-4" />
          </button>
          <button
            onClick={() => { if (confirm('Delete this goal?')) onDelete(goal.id); }}
            className="p-1.5 rounded hover:bg-red-50 text-gray-500 hover:text-red-600"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

type FormState = {
  metric: GoalMetric; target_value: string;
  period_type: GoalPeriodType; period_start: string; period_end: string; notes: string;
};

const EMPTY_FORM: FormState = {
  metric: 'revenue', target_value: '', period_type: 'monthly',
  period_start: '', period_end: '', notes: '',
};

export default function BiGoalsPage() {
  const { label } = useMerchantLabels();
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<MerchantGoal | null>(null);
  const [form, setForm]       = useState<FormState>(EMPTY_FORM);

  const { data, isLoading, error } = useQuery({
    queryKey: ['growth', 'goals'],
    queryFn: growthApi.listGoals,
    staleTime: 2 * 60 * 1000,
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: ['growth', 'goals'] });

  const createMutation = useMutation({
    mutationFn: (d: Record<string, unknown>) => growthApi.createGoal(d),
    onSuccess: () => { invalidate(); setShowForm(false); setForm(EMPTY_FORM); },
  });
  const updateMutation = useMutation({
    mutationFn: ({ id, d }: { id: number; d: Record<string, unknown> }) => growthApi.updateGoal(id, d),
    onSuccess: () => { invalidate(); setEditing(null); setForm(EMPTY_FORM); setShowForm(false); },
  });
  const deleteMutation = useMutation({
    mutationFn: (id: number) => growthApi.deleteGoal(id),
    onSuccess: () => invalidate(),
  });

  const openCreate = () => { setForm(EMPTY_FORM); setEditing(null); setShowForm(true); };
  const openEdit   = (g: MerchantGoal) => {
    setEditing(g);
    setForm({
      metric: g.metric, target_value: String(g.target_value),
      period_type: g.period_type, period_start: g.period_start,
      period_end: g.period_end, notes: g.notes ?? '',
    });
    setShowForm(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const payload: Record<string, unknown> = {
      metric: form.metric, target_value: parseFloat(form.target_value),
      period_type: form.period_type, period_start: form.period_start,
      period_end: form.period_end, notes: form.notes || null,
    };
    if (editing) updateMutation.mutate({ id: editing.id, d: payload });
    else createMutation.mutate(payload);
  };

  if (isLoading) return <div className="p-6 text-gray-400 text-sm">Loading goals…</div>;
  if (error)     return <div className="p-6 text-red-500 text-sm">Failed to load goals.</div>;

  const goals: MerchantGoal[] = data?.data?.data ?? [];
  const active  = goals.filter((g) => g.is_active);
  const past    = goals.filter((g) => !g.is_active);

  return (
    <div className="p-4 md:p-6 space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Goal Tracking</h1>
          <p className="text-sm text-gray-500 mt-0.5">Set and track business targets across any time period</p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors"
        >
          <Plus className="h-4 w-4" /> New Goal
        </button>
      </div>

      {goals.length === 0 ? (
        <EmptyState description="No goals set yet. Create your first goal to start tracking business targets." />
      ) : (
        <>
          {active.length > 0 && (
            <section>
              <SectionHeader title="Active Goals" description="Goals within the current period" />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {active.map((g) => (
                  <GoalCard key={g.id} goal={g} onEdit={openEdit} onDelete={(id) => deleteMutation.mutate(id)} />
                ))}
              </div>
            </section>
          )}

          {past.length > 0 && (
            <section>
              <SectionHeader title="Past Goals" description="Ended periods" />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {past.map((g) => (
                  <GoalCard key={g.id} goal={g} onEdit={openEdit} onDelete={(id) => deleteMutation.mutate(id)} />
                ))}
              </div>
            </section>
          )}
        </>
      )}

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between p-5 border-b border-gray-200">
              <h2 className="text-lg font-bold text-gray-900">{editing ? 'Edit Goal' : 'New Goal'}</h2>
              <button onClick={() => { setShowForm(false); setEditing(null); setForm(EMPTY_FORM); }}>
                <X className="h-5 w-5 text-gray-500" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Metric *</label>
                <select required value={form.metric} onChange={(e) => setForm((f) => ({ ...f, metric: e.target.value as GoalMetric }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm">
                  {METRICS.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Target {form.metric === 'revenue' ? '(Rp)' : form.metric === 'success_rate' ? '(%)' : '(count)'} *
                </label>
                <input required type="number" min="0" step={form.metric === 'success_rate' ? '0.1' : '1'}
                  value={form.target_value}
                  onChange={(e) => setForm((f) => ({ ...f, target_value: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Period Type *</label>
                <select required value={form.period_type} onChange={(e) => setForm((f) => ({ ...f, period_type: e.target.value as GoalPeriodType }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm">
                  {PERIODS.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Start Date *</label>
                  <input required type="date" value={form.period_start}
                    onChange={(e) => setForm((f) => ({ ...f, period_start: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">End Date *</label>
                  <input required type="date" value={form.period_end}
                    onChange={(e) => setForm((f) => ({ ...f, period_end: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                <input type="text" maxLength={500} value={form.notes}
                  onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
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

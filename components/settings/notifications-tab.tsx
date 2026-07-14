'use client';

import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { merchantPlatformApi } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { NotificationSettings } from '@/types';

function Toggle({ checked, onChange, label, sub }: {
  checked: boolean; onChange: (v: boolean) => void; label: string; sub?: string;
}) {
  return (
    <label className="flex items-start gap-3 cursor-pointer">
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative shrink-0 mt-0.5 w-10 h-5 rounded-full transition-colors ${checked ? 'bg-blue-600' : 'bg-gray-300'}`}
      >
        <span className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${checked ? 'translate-x-5' : 'translate-x-0'}`} />
      </button>
      <div>
        <p className="text-sm font-medium">{label}</p>
        {sub && <p className="text-xs text-gray-500">{sub}</p>}
      </div>
    </label>
  );
}

export function NotificationsTab() {
  const qc = useQueryClient();
  const { data: res, isLoading } = useQuery({
    queryKey: ['platform', 'notifications'],
    queryFn: merchantPlatformApi.getNotifications,
  });

  const notif: NotificationSettings | undefined = res?.data?.data;

  const [form, setForm] = useState({
    whatsapp_notifications_enabled: false,
    email_notifications_enabled:    false,
    push_notifications_enabled:     false,
  });
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (notif) setForm({
      whatsapp_notifications_enabled: notif.whatsapp_notifications_enabled ?? false,
      email_notifications_enabled:    notif.email_notifications_enabled    ?? false,
      push_notifications_enabled:     notif.push_notifications_enabled     ?? false,
    });
  }, [notif]);

  const mutation = useMutation({
    mutationFn: (data: Record<string, unknown>) => merchantPlatformApi.updateNotifications(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['platform', 'notifications'] });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    mutation.mutate(form);
  };

  if (isLoading) return <div className="h-40 bg-gray-100 rounded animate-pulse" />;

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Notification Channels</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-xs text-gray-500">
            Configure which channels are used to notify customers about their orders.
            Channel integrations are configured separately.
          </p>
          <div className="space-y-3">
            <Toggle
              checked={form.whatsapp_notifications_enabled}
              onChange={v => setForm(f => ({ ...f, whatsapp_notifications_enabled: v }))}
              label="WhatsApp Notifications"
              sub="Send delivery updates via WhatsApp"
            />
            <Toggle
              checked={form.email_notifications_enabled}
              onChange={v => setForm(f => ({ ...f, email_notifications_enabled: v }))}
              label="Email Notifications"
              sub="Send delivery updates via email"
            />
            <Toggle
              checked={form.push_notifications_enabled}
              onChange={v => setForm(f => ({ ...f, push_notifications_enabled: v }))}
              label="Push Notifications"
              sub="Browser push for logged-in customers"
            />
          </div>
        </CardContent>
      </Card>

      <div className="flex items-center gap-3">
        <button type="submit" disabled={mutation.isPending}
          className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 disabled:opacity-50">
          {mutation.isPending ? 'Saving…' : 'Save Notification Settings'}
        </button>
        {saved && <span className="text-sm text-green-600">Saved successfully.</span>}
        {mutation.isError && <span className="text-sm text-red-600">Failed to save. Try again.</span>}
      </div>
    </form>
  );
}

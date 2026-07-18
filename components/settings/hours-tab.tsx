'use client';

import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { merchantPlatformApi } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import type { BusinessHours } from '@/types';

const DAYS = [
  { key: 'mon', label: 'Mon' },
  { key: 'tue', label: 'Tue' },
  { key: 'wed', label: 'Wed' },
  { key: 'thu', label: 'Thu' },
  { key: 'fri', label: 'Fri' },
  { key: 'sat', label: 'Sat' },
  { key: 'sun', label: 'Sun' },
];

export function HoursTab() {
  const qc = useQueryClient();
  const { data: res, isLoading } = useQuery({
    queryKey: ['platform', 'hours'],
    queryFn: merchantPlatformApi.getHours,
  });

  const hours: BusinessHours | undefined = res?.data?.data;

  const [start, setStart] = useState('08:00');
  const [end, setEnd] = useState('17:00');
  const [days, setDays] = useState<string[]>(['mon', 'tue', 'wed', 'thu', 'fri', 'sat']);
  const [holiday, setHoliday] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (hours) {
      setStart(hours.working_hours_start ?? '08:00');
      setEnd(hours.working_hours_end     ?? '17:00');
      setDays(hours.working_days         ?? ['mon', 'tue', 'wed', 'thu', 'fri', 'sat']);
      setHoliday(hours.holiday_mode_enabled ?? false);
    }
  }, [hours]);

  const toggleDay = (key: string) => {
    setDays(prev => prev.includes(key) ? prev.filter(d => d !== key) : [...prev, key]);
  };

  const mutation = useMutation({
    mutationFn: (data: Record<string, unknown>) => merchantPlatformApi.updateHours(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['platform', 'hours'] });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    mutation.mutate({ working_hours_start: start, working_hours_end: end, working_days: days, holiday_mode_enabled: holiday });
  };

  if (isLoading) {
    return <div className="h-40 bg-gray-100 rounded animate-pulse" />;
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Business Hours</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4 max-w-sm">
            <div className="space-y-1">
              <Label>Open</Label>
              <Input type="time" value={start} onChange={e => setStart(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label>Close</Label>
              <Input type="time" value={end} onChange={e => setEnd(e.target.value)} />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Working Days</Label>
            <div className="flex flex-wrap gap-2">
              {DAYS.map(({ key, label }) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => toggleDay(key)}
                  className={`px-3 py-1.5 text-sm rounded-md border transition-colors ${
                    days.includes(key)
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'bg-white text-gray-600 border-gray-300 hover:border-blue-400'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <label className="flex items-center gap-3 cursor-pointer pt-1">
            <input type="checkbox" checked={holiday}
              onChange={e => setHoliday(e.target.checked)}
              className="h-4 w-4 rounded border-gray-300" />
            <span className="text-sm">
              <span className="font-medium">Holiday Mode</span>
              <span className="text-gray-500 ml-1">— temporarily closes all deliveries</span>
            </span>
          </label>
        </CardContent>
      </Card>

      <div className="flex items-center gap-3">
        <button type="submit" disabled={mutation.isPending}
          className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 disabled:opacity-50">
          {mutation.isPending ? 'Saving…' : 'Save Business Hours'}
        </button>
        {saved && <span className="text-sm text-green-600">Saved successfully.</span>}
        {mutation.isError && <span className="text-sm text-red-600">Failed to save. Try again.</span>}
      </div>
    </form>
  );
}

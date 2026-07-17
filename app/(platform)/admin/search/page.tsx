'use client';

import { useState, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { adminApi } from '@/lib/api';
import type { SearchResult } from '@/types';
import { Search, Building2, Users, FileText, CreditCard } from 'lucide-react';
import Link from 'next/link';

const TYPE_ICON: Record<string, React.ElementType> = {
  merchant:     Building2,
  user:         Users,
  application:  FileText,
  subscription: CreditCard,
};

const TYPE_COLOR: Record<string, string> = {
  merchant:     'bg-blue-50 text-blue-600',
  user:         'bg-violet-50 text-violet-600',
  application:  'bg-amber-50 text-amber-600',
  subscription: 'bg-emerald-50 text-emerald-600',
};

export default function GlobalSearchPage() {
  const [query, setQuery] = useState('');
  const [debouncedQ, setDebouncedQ] = useState('');
  const [timer, setTimer] = useState<ReturnType<typeof setTimeout> | null>(null);

  const handleChange = useCallback((val: string) => {
    setQuery(val);
    if (timer) clearTimeout(timer);
    const t = setTimeout(() => setDebouncedQ(val), 350);
    setTimer(t);
  }, [timer]);

  const { data, isLoading } = useQuery<{ data: Record<string, SearchResult[]> }>({
    queryKey: ['admin', 'search', debouncedQ],
    queryFn: () => adminApi.globalSearch(debouncedQ),
    enabled: debouncedQ.length >= 2,
    staleTime: 10_000,
  });

  const results: SearchResult[] = data?.data
    ? (Object.values(data.data).flat() as SearchResult[])
    : [];

  const grouped = results.reduce<Record<string, SearchResult[]>>((acc, r) => {
    (acc[r.type] ??= []).push(r);
    return acc;
  }, {});

  return (
    <div className="p-6 max-w-3xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Global Search</h1>
        <p className="text-sm text-gray-500 mt-1">Search across merchants, users, applications, and subscriptions</p>
      </div>

      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <input
          type="text"
          placeholder="Type to search (min 2 characters)…"
          value={query}
          onChange={e => handleChange(e.target.value)}
          className="w-full border border-gray-300 rounded-lg pl-9 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
          autoFocus
        />
      </div>

      {isLoading && (
        <div className="text-sm text-gray-400 text-center py-8">Searching…</div>
      )}

      {debouncedQ.length >= 2 && !isLoading && results.length === 0 && (
        <div className="text-sm text-gray-400 text-center py-8">
          No results for &ldquo;{debouncedQ}&rdquo;
        </div>
      )}

      {Object.entries(grouped).map(([type, items]) => {
        const Icon = TYPE_ICON[type] ?? FileText;
        const chipCls = TYPE_COLOR[type] ?? 'bg-gray-50 text-gray-600';
        return (
          <div key={type} className="mb-5">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2 flex items-center gap-1.5">
              <Icon className="h-3.5 w-3.5" />
              {type}s
            </p>
            <div className="bg-white border border-gray-200 rounded-lg overflow-hidden shadow-sm divide-y divide-gray-100">
              {items.map((r) => (
                <Link
                  key={`${r.type}-${r.id}`}
                  href={r.url}
                  className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors"
                >
                  <span className={`text-xs px-2 py-0.5 rounded-full font-mono ${chipCls}`}>#{r.id}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{r.label}</p>
                    {r.sub && <p className="text-xs text-gray-400 truncate">{r.sub}</p>}
                  </div>
                  <svg className="h-4 w-4 text-gray-300 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </Link>
              ))}
            </div>
          </div>
        );
      })}

      {debouncedQ.length < 2 && (
        <div className="text-center py-12 text-sm text-gray-400">
          <Search className="h-8 w-8 mx-auto mb-3 opacity-30" />
          Enter at least 2 characters to search
        </div>
      )}
    </div>
  );
}

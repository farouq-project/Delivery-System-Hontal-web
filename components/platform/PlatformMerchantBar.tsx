'use client';

import { useState, useRef, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { adminApi } from '@/lib/api';
import { usePlatformMerchantStore, type PlatformMerchant } from '@/store/platform-merchant';
import { Building2, ChevronDown, X, Eye, Search } from 'lucide-react';
import { cn } from '@/lib/utils';

const STATUS_COLORS: Record<string, string> = {
  active:    'bg-green-100 text-green-700',
  trial:     'bg-blue-100 text-blue-700',
  paused:    'bg-yellow-100 text-yellow-700',
  expired:   'bg-red-100 text-red-700',
  cancelled: 'bg-gray-100 text-gray-500',
};

export function PlatformMerchantBar() {
  const qc = useQueryClient();
  const { selectedMerchant, isViewingMode, setSelectedMerchant, clearSelectedMerchant } =
    usePlatformMerchantStore();

  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'growth-targets'],
    queryFn: adminApi.merchantGrowthTargets,
    staleTime: 5 * 60 * 1000,
  });

  const merchants: PlatformMerchant[] = data?.data?.data ?? [];

  const filtered = search
    ? merchants.filter((m) =>
        m.company_name.toLowerCase().includes(search.toLowerCase()) ||
        m.email.toLowerCase().includes(search.toLowerCase()) ||
        (m.city ?? '').toLowerCase().includes(search.toLowerCase())
      )
    : merchants;

  const handleSelect = (merchant: PlatformMerchant) => {
    setSelectedMerchant(merchant);
    setOpen(false);
    setSearch('');
    // Invalidate all BI and growth queries so they refetch with the new merchant_id
    qc.invalidateQueries({ queryKey: ['bi'] });
    qc.invalidateQueries({ queryKey: ['growth'] });
  };

  const handleClear = () => {
    clearSelectedMerchant();
    qc.invalidateQueries({ queryKey: ['bi'] });
    qc.invalidateQueries({ queryKey: ['growth'] });
  };

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div className="border-b border-gray-200 bg-indigo-50 px-4 md:px-6 py-2 flex items-center gap-3">
      <Building2 className="h-4 w-4 text-indigo-500 shrink-0" />
      <span className="text-xs font-semibold text-indigo-700 uppercase tracking-wide shrink-0">
        Merchant View
      </span>

      <div className="relative flex-1 max-w-xs" ref={dropdownRef}>
        <button
          onClick={() => setOpen(!open)}
          className={cn(
            'w-full flex items-center justify-between gap-2 px-3 py-1.5 text-sm rounded-md border transition-colors',
            isViewingMode
              ? 'bg-white border-indigo-300 text-gray-900 font-medium'
              : 'bg-white border-gray-300 text-gray-500'
          )}
        >
          <span className="truncate">
            {selectedMerchant ? selectedMerchant.company_name : 'Select a merchant…'}
          </span>
          <ChevronDown className="h-4 w-4 shrink-0 text-gray-400" />
        </button>

        {open && (
          <div className="absolute top-full left-0 mt-1 w-80 bg-white rounded-lg border border-gray-200 shadow-lg z-50">
            <div className="p-2 border-b border-gray-100">
              <div className="flex items-center gap-2 px-2 py-1.5 bg-gray-50 rounded-md">
                <Search className="h-3.5 w-3.5 text-gray-400 shrink-0" />
                <input
                  autoFocus
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search merchants…"
                  className="flex-1 text-sm bg-transparent outline-none text-gray-700 placeholder:text-gray-400"
                />
              </div>
            </div>
            <div className="max-h-64 overflow-y-auto py-1">
              {isLoading ? (
                <p className="text-xs text-gray-400 text-center py-4">Loading…</p>
              ) : filtered.length === 0 ? (
                <p className="text-xs text-gray-400 text-center py-4">No merchants found.</p>
              ) : (
                filtered.map((m) => (
                  <button
                    key={m.id}
                    onClick={() => handleSelect(m)}
                    className={cn(
                      'w-full flex items-start gap-3 px-3 py-2.5 text-left hover:bg-indigo-50 transition-colors',
                      selectedMerchant?.id === m.id && 'bg-indigo-50'
                    )}
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{m.company_name}</p>
                      <p className="text-xs text-gray-400 truncate">{m.city ?? m.email}</p>
                    </div>
                    <div className="flex flex-col items-end gap-1 shrink-0">
                      {m.sub_status && (
                        <span className={cn('text-[10px] px-1.5 py-0.5 rounded-full font-medium capitalize',
                          STATUS_COLORS[m.sub_status] ?? 'bg-gray-100 text-gray-500')}>
                          {m.sub_status}
                        </span>
                      )}
                      {m.plan_slug && (
                        <span className="text-[10px] text-gray-400 font-mono">{m.plan_slug}</span>
                      )}
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>
        )}
      </div>

      {isViewingMode && selectedMerchant && (
        <>
          <div className="flex items-center gap-1.5 px-2 py-1 bg-amber-100 text-amber-700 rounded-md text-xs font-semibold shrink-0">
            <Eye className="h-3.5 w-3.5" />
            Read Only
          </div>
          <button
            onClick={handleClear}
            className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-800 transition-colors shrink-0"
          >
            <X className="h-3.5 w-3.5" />
            Exit
          </button>
        </>
      )}
    </div>
  );
}

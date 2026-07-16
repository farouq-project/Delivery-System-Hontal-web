'use client';

import { PLATFORM } from '@/lib/brand';

export function Footer() {
  const isDev = process.env.NODE_ENV === 'development';
  return (
    <footer className="flex items-center justify-between px-4 py-2 border-t border-gray-200 bg-white text-xs text-gray-400 shrink-0">
      <span>
        Powered by <span className="font-medium text-gray-500">{PLATFORM.name}</span>
      </span>
      <span className="flex items-center gap-2">
        <span>v{PLATFORM.version}</span>
        {isDev && (
          <span className="px-1.5 py-0.5 bg-amber-100 text-amber-700 rounded text-[10px] font-medium">
            Development
          </span>
        )}
      </span>
    </footer>
  );
}

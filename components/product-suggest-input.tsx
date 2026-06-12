'use client';

import { useEffect, useRef, useState } from 'react';
import { Input } from '@/components/ui/input';
import { ordersApi } from '@/lib/api';

interface ProductSuggestInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

export function ProductSuggestInput({ value, onChange, placeholder, className }: ProductSuggestInputProps) {
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [open, setOpen] = useState(false);
  const debounce = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  const handleChange = (text: string) => {
    onChange(text);

    clearTimeout(debounce.current);

    if (!text.trim()) {
      setSuggestions([]);
      setOpen(false);
      return;
    }

    debounce.current = setTimeout(async () => {
      try {
        const res = await ordersApi.productSuggestions(text);
        const data: string[] = res.data.data ?? [];
        setSuggestions(data);
        setOpen(data.length > 0);
      } catch {
        setSuggestions([]);
        setOpen(false);
      }
    }, 250);
  };

  const handleSelect = (name: string) => {
    onChange(name);
    setOpen(false);
  };

  return (
    <div ref={containerRef} className="relative">
      <Input
        className={className}
        value={value}
        placeholder={placeholder}
        onChange={(e) => handleChange(e.target.value)}
        onFocus={() => suggestions.length > 0 && setOpen(true)}
      />
      {open && suggestions.length > 0 && (
        <div className="absolute z-20 top-full left-0 right-0 bg-white border rounded-md shadow-lg mt-1 max-h-40 overflow-y-auto">
          {suggestions.map((s) => (
            <button
              key={s}
              type="button"
              className="w-full text-left px-3 py-2 hover:bg-blue-50 text-sm"
              onClick={() => handleSelect(s)}
            >
              {s}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

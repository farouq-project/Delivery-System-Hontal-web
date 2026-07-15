export function fmtIdr(value: number): string {
  if (value >= 1_000_000_000) return `Rp ${(value / 1_000_000_000).toFixed(1)}M`;
  if (value >= 1_000_000)     return `Rp ${(value / 1_000_000).toFixed(1)}jt`;
  if (value >= 1_000)         return `Rp ${(value / 1_000).toFixed(0)}rb`;
  return `Rp ${value.toFixed(0)}`;
}

export function fmtPct(value: number | null | undefined): string {
  if (value == null) return '—';
  return `${value.toFixed(1)}%`;
}

export function fmtNum(value: number): string {
  return value.toLocaleString('id-ID');
}

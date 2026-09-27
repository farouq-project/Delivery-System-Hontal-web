import type { PosTransaction } from '@/types/pos';
import { num, formatQty, PAYMENT_LABELS } from '@/lib/pos';

const idr = (v: string | number | null | undefined) =>
  new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(num(v));

// Every interpolated value is user-entered (product, customer and merchant names, notes).
// The print window is same-origin, so unescaped HTML could run script with access to the session.
function esc(value: unknown): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

/** Formats with the merchant's invoice_date_format (supports DD, MM, YYYY). */
function formatDate(iso: string | null, pattern: string): string {
  if (!iso) return '-';
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  const date = (pattern || 'DD/MM/YYYY')
    .replace('YYYY', String(d.getFullYear()))
    .replace('MM', pad(d.getMonth() + 1))
    .replace('DD', pad(d.getDate()));
  return `${date} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/**
 * Opens a printable receipt in a new window, the same way the existing order invoice prints.
 * Sized for 58/80mm thermal printers but also prints fine on A4.
 *
 * Pass `target` when the receipt data is fetched asynchronously: open the window synchronously
 * inside the click handler first, otherwise popup blockers reject the later window.open().
 */
export function printReceipt(tx: PosTransaction, paymentLabel?: string, target?: Window | null) {
  const r = tx.receipt;
  const method = paymentLabel ?? PAYMENT_LABELS[tx.payment_method ?? ''] ?? tx.payment_method ?? '-';
  const row = (label: string, value: string, bold = false) =>
    `<div class="row${bold ? ' bold' : ''}"><span>${esc(label)}</span><span>${esc(value)}</span></div>`;

  const items = tx.items.map((i) => `
    <div class="item">${esc(i.name_snapshot)}</div>
    <div class="row sub"><span>${esc(formatQty(i.qty))} ${esc(i.unit_label_snapshot)} × ${esc(idr(i.unit_price))}</span><span>${esc(idr(i.subtotal))}</span></div>`).join('');

  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Struk ${esc(tx.transaction_number)}</title>
<style>
  body { font-family: 'Courier New', monospace; font-size: 12px; max-width: 300px; margin: 0 auto; padding: 12px; color: #000; }
  .center { text-align: center; }
  h2 { font-size: 15px; margin: 0 0 2px; }
  .muted { color: #444; font-size: 11px; margin: 0; }
  .divider { border-top: 1px dashed #000; margin: 8px 0; }
  .row { display: flex; justify-content: space-between; gap: 8px; margin: 2px 0; }
  .row span:last-child { text-align: right; white-space: nowrap; }
  .item { margin-top: 5px; }
  .sub { color: #333; }
  .bold { font-weight: bold; }
  .total { font-size: 14px; font-weight: bold; }
  @media print { body { padding: 0; } }
</style></head><body>
<div class="center">
  <h2>${esc(r?.merchant_name ?? 'Struk Penjualan')}</h2>
  ${r?.merchant_address ? `<p class="muted">${esc(r.merchant_address)}</p>` : ''}
  ${r?.merchant_phone ? `<p class="muted">${esc(r.merchant_phone)}</p>` : ''}
</div>
<div class="divider"></div>
${row('No', tx.transaction_number)}
${row('Tanggal', formatDate(tx.completed_at ?? tx.created_at, r?.invoice_date_format ?? 'DD/MM/YYYY'))}
${tx.cashier_name ? row('Kasir', tx.cashier_name) : ''}
${row('Jenis', tx.type === 'delivery' ? 'Pengiriman' : 'Walk-in')}
${tx.type === 'delivery' ? `
  ${row('Pelanggan', tx.customer_name ?? '-')}
  ${tx.customer_phone ? row('Telepon', tx.customer_phone) : ''}
  ${tx.delivery_order ? row('No. Pesanan', tx.delivery_order.order_number) : ''}` : ''}
<div class="divider"></div>
${items}
<div class="divider"></div>
${row('Subtotal', idr(tx.subtotal))}
${num(tx.discount) > 0 ? row('Diskon', `- ${idr(tx.discount)}`) : ''}
${num(tx.delivery_fee) > 0 ? row('Ongkos Kirim', idr(tx.delivery_fee)) : ''}
<div class="row total"><span>TOTAL</span><span>${esc(idr(tx.total))}</span></div>
<div class="divider"></div>
${row('Pembayaran', method)}
${tx.amount_paid !== null
    ? `${row('Dibayar', idr(tx.amount_paid))}${num(tx.change_amount) > 0 ? row('Kembalian', idr(tx.change_amount), true) : ''}`
    : row('Status', 'Bayar saat diterima')}
<div class="divider"></div>
<p class="center muted">${esc(r?.invoice_footer || 'Terima kasih atas kunjungan Anda.')}</p>
<script>window.onload=function(){window.print();}</script>
</body></html>`;

  const w = target ?? window.open('', '_blank');
  if (w) {
    w.document.open();
    w.document.write(html);
    w.document.close();
  }
  return Boolean(w);
}

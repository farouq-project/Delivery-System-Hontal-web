'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ordersApi } from '@/lib/api';
import { DeliveryOrder } from '@/types';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { STATUS_COLORS, formatCurrency, formatDate, formatTime } from '@/lib/utils';
import { Copy, ExternalLink, Share2, Check, Printer, FileText } from 'lucide-react';

interface Props { order: DeliveryOrder; onClose: () => void; }

function buildTrackingUrl(ulid: string): string {
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  return `${origin}/track/${ulid}`;
}

function formatWhatsAppPhone(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (digits.startsWith('0')) return '62' + digits.slice(1);
  if (!digits.startsWith('62')) return '62' + digits;
  return digits;
}

function formatInvoiceText(order: DeliveryOrder): string {
  const date = order.order_created_at ? new Date(order.order_created_at).toLocaleDateString('id-ID') : '-';
  const value = new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(order.order_value ?? 0);
  return [
    `*BUKTI PENGIRIMAN*`,
    `No: ${order.order_number}`,
    `Tanggal: ${date}`,
    ``,
    `*Pelanggan:* ${order.customer_name}`,
    `*Alamat:* ${order.delivery_address}`,
    order.customer_phone ? `*Telepon:* ${order.customer_phone}` : null,
    ``,
    `*Produk:* ${order.product_name ?? '-'}`,
    `*Nilai:* ${value}`,
    order.payment_method ? `*Pembayaran:* ${order.payment_method}` : null,
    ``,
    `*Status:* ${order.status.replace(/_/g, ' ')}`,
  ].filter(Boolean).join('\n');
}

function handlePrintInvoice(order: DeliveryOrder) {
  const date = order.order_created_at ? new Date(order.order_created_at).toLocaleDateString('id-ID') : '-';
  const value = new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(order.order_value ?? 0);
  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Invoice ${order.order_number}</title>
<style>
  body { font-family: Arial, sans-serif; font-size: 13px; max-width: 360px; margin: 0 auto; padding: 16px; }
  h2 { font-size: 16px; margin: 0 0 4px; }
  .divider { border-top: 1px dashed #999; margin: 10px 0; }
  .row { display: flex; justify-content: space-between; margin: 4px 0; }
  .label { color: #666; }
  .bold { font-weight: bold; }
  @media print { body { font-size: 11px; } }
</style></head><body>
<h2>BUKTI PENGIRIMAN</h2>
<p style="margin:0;color:#666">No: <b>${order.order_number}</b> &nbsp;|&nbsp; ${date}</p>
<div class="divider"></div>
<div class="row"><span class="label">Pelanggan</span><span class="bold">${order.customer_name}</span></div>
<div class="row"><span class="label">Telepon</span><span>${order.customer_phone ?? '-'}</span></div>
<div style="margin:4px 0"><span class="label">Alamat:</span> ${order.delivery_address}</div>
<div class="divider"></div>
<div class="row"><span class="label">Produk</span><span>${order.product_name ?? '-'}</span></div>
<div class="row"><span class="label">Nilai Pesanan</span><span class="bold">${value}</span></div>
<div class="row"><span class="label">Pembayaran</span><span>${order.payment_method ?? '-'}</span></div>
<div class="row"><span class="label">Status</span><span>${order.status.replace(/_/g, ' ')}</span></div>
<div class="divider"></div>
<p style="text-align:center;color:#666;font-size:11px">Terima kasih atas kepercayaan Anda.</p>
<script>window.onload=function(){window.print();}</script>
</body></html>`;
  const w = window.open('', '_blank');
  if (w) { w.document.write(html); w.document.close(); }
}

export default function OrderDetail({ order, onClose }: Props) {
  const [copied, setCopied] = useState(false);

  const { data } = useQuery({
    queryKey: ['order-history', order.id],
    queryFn: () => ordersApi.history(order.id),
  });

  const trackingUrl = buildTrackingUrl(order.ulid);

  const handleCopy = () => {
    navigator.clipboard.writeText(trackingUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const handleOpenTracking = () => {
    window.open(trackingUrl, '_blank', 'noopener,noreferrer');
  };

  const handleWhatsApp = () => {
    const phone   = order.customer_phone ? formatWhatsAppPhone(order.customer_phone) : '';
    const message = encodeURIComponent(
      `Hello.\n\nYou can track your delivery here:\n${trackingUrl}\n\nThank you.`
    );
    const url = phone
      ? `https://wa.me/${phone}?text=${message}`
      : `https://wa.me/?text=${message}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const history: { status: string; notes: string | null; created_at: string; changed_by: string }[] =
    data?.data?.data ?? [];

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Order {order.order_number}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex justify-between">
            <span className={`text-sm px-3 py-1 rounded-full font-medium ${STATUS_COLORS[order.status]}`}>
              {order.status.replace('_', ' ')}
            </span>
            <span className="text-sm text-gray-500">{formatDate(order.order_created_at)}</span>
          </div>

          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <p className="text-gray-400 text-xs">Customer</p>
              <p className="font-medium">{order.customer_name}</p>
              <p className="text-gray-500">{order.customer_phone}</p>
            </div>
            <div>
              <p className="text-gray-400 text-xs">Value</p>
              <p className="font-medium">{formatCurrency(order.order_value)}</p>
            </div>
            <div>
              <p className="text-gray-400 text-xs">Cashier</p>
              <p className="font-medium">{order.cashier_name ?? '-'}</p>
            </div>
            <div>
              <p className="text-gray-400 text-xs">Payment Method</p>
              <p className="font-medium capitalize">{order.payment_method ?? '-'}</p>
            </div>
            <div className="col-span-2">
              <p className="text-gray-400 text-xs">Product</p>
              <p className="font-medium">{order.product_name}</p>
            </div>
            <div className="col-span-2">
              <p className="text-gray-400 text-xs">Delivery Address</p>
              <p className="font-medium">{order.delivery_address}</p>
            </div>
            <div>
              <p className="text-gray-400 text-xs">Delivery Date</p>
              <p className="font-medium">{formatDate(order.requested_delivery_date)}</p>
            </div>
            <div>
              <p className="text-gray-400 text-xs">Time Window</p>
              <p className="font-medium">
                {order.requested_delivery_start
                  ? `${formatTime(order.requested_delivery_start)} – ${formatTime(order.requested_delivery_end)}`
                  : 'Anytime'}
              </p>
            </div>
          </div>

          {/* Invoice */}
          <div>
            <p className="text-xs font-medium text-gray-500 mb-2 uppercase tracking-wide">Invoice / Bukti Pengiriman</p>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => handlePrintInvoice(order)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs border border-gray-200 rounded-md hover:bg-gray-50 text-gray-600"
              >
                <Printer className="h-3.5 w-3.5" />
                Print Invoice
              </button>
              {order.customer_phone && (
                <button
                  onClick={() => {
                    const phone = formatWhatsAppPhone(order.customer_phone!);
                    const text = encodeURIComponent(formatInvoiceText(order));
                    window.open(`https://wa.me/${phone}?text=${text}`, '_blank', 'noopener,noreferrer');
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs border border-green-200 rounded-md hover:bg-green-50 text-green-700"
                >
                  <FileText className="h-3.5 w-3.5" />
                  Kirim ke WhatsApp
                </button>
              )}
            </div>
          </div>

          {/* Tracking share */}
          <div>
            <p className="text-xs font-medium text-gray-500 mb-2 uppercase tracking-wide">Tracking</p>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={handleCopy}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs border border-gray-200 rounded-md hover:bg-gray-50 text-gray-600"
              >
                {copied ? <Check className="h-3.5 w-3.5 text-green-600" /> : <Copy className="h-3.5 w-3.5" />}
                {copied ? 'Copied!' : 'Copy Link'}
              </button>
              <button
                onClick={handleOpenTracking}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs border border-gray-200 rounded-md hover:bg-gray-50 text-gray-600"
              >
                <ExternalLink className="h-3.5 w-3.5" />
                Open Tracking
              </button>
              <span title={!order.customer_phone ? 'No customer phone number.' : undefined}>
                <button
                  onClick={handleWhatsApp}
                  disabled={!order.customer_phone}
                  className={`flex items-center gap-1.5 px-3 py-1.5 text-xs border rounded-md ${
                    order.customer_phone
                      ? 'border-green-200 hover:bg-green-50 text-green-700'
                      : 'border-gray-200 text-gray-300 cursor-not-allowed'
                  }`}
                >
                  <Share2 className="h-3.5 w-3.5" />
                  WhatsApp
                </button>
              </span>
            </div>
          </div>

          {history.length > 0 && (
            <div>
              <p className="text-xs font-medium text-gray-500 mb-2 uppercase tracking-wide">History</p>
              <div className="space-y-2">
                {history.map((h, i) => (
                  <div key={i} className="flex gap-3 text-sm">
                    <div className="w-2 h-2 rounded-full bg-blue-500 mt-1.5 shrink-0" />
                    <div>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${STATUS_COLORS[h.status]}`}>
                        {h.status.replace('_', ' ')}
                      </span>
                      {h.notes && <p className="text-gray-500 text-xs mt-0.5">{h.notes}</p>}
                      <p className="text-gray-400 text-xs">{formatDate(h.created_at, 'dd MMM HH:mm')}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

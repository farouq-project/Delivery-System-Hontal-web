'use client';

import { useQuery } from '@tanstack/react-query';
import { ordersApi } from '@/lib/api';
import { DeliveryOrder } from '@/types';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { STATUS_COLORS, formatCurrency, formatDate, formatTime } from '@/lib/utils';

interface Props { order: DeliveryOrder; onClose: () => void; }

export default function OrderDetail({ order, onClose }: Props) {
  const { data } = useQuery({
    queryKey: ['order-history', order.id],
    queryFn: () => ordersApi.history(order.id),
  });

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

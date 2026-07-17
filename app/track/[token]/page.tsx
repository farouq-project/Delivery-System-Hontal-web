'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { PLATFORM } from '@/lib/brand';
import { CheckCircle, Clock, XCircle, Truck, Package } from 'lucide-react';

interface TrackingData {
  order_number: string;
  customer_name: string;
  status: string;
  merchant_name: string;
  estimated_arrival?: string | null;
  driver_name?: string | null;
  notes?: string | null;
  predicted_delivery_time?: string | null;
  prediction_source?: 'customer_history' | 'merchant_average' | null;
}

const STATUS_CONFIG: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
  pending:     { label: 'Order Received',   icon: <Package className="h-6 w-6" />,      color: 'text-gray-500'  },
  assigned:    { label: 'Driver Assigned',  icon: <Truck className="h-6 w-6" />,        color: 'text-blue-600'  },
  in_progress: { label: 'Out for Delivery', icon: <Truck className="h-6 w-6" />,        color: 'text-blue-600'  },
  delivered:   { label: 'Delivered',        icon: <CheckCircle className="h-6 w-6" />,  color: 'text-green-600' },
  failed:      { label: 'Delivery Failed',  icon: <XCircle className="h-6 w-6" />,      color: 'text-red-600'   },
  cancelled:   { label: 'Cancelled',        icon: <XCircle className="h-6 w-6" />,      color: 'text-gray-500'  },
};

export default function TrackingPage() {
  const { token } = useParams<{ token: string }>();
  const [data, setData] = useState<TrackingData | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const baseUrl = process.env.NEXT_PUBLIC_API_URL?.replace('/api/v1', '') ?? 'http://localhost:8000';
    fetch(`${baseUrl}/api/v1/track/${token}`)
      .then(async (res) => {
        if (!res.ok) throw new Error('Not found');
        const json = await res.json();
        setData(json.data);
      })
      .catch(() => setError('Order not found or tracking link has expired.'))
      .finally(() => setLoading(false));
  }, [token]);

  const statusCfg = data ? (STATUS_CONFIG[data.status] ?? STATUS_CONFIG['pending']) : null;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="bg-white border-b border-gray-200 px-4 py-4">
        <div className="max-w-lg mx-auto flex items-center justify-between">
          {data?.merchant_name ? (
            <div>
              <p className="font-bold text-gray-900 text-lg">{data.merchant_name}</p>
              <p className="text-xs text-gray-500">Order Tracking</p>
            </div>
          ) : (
            <p className="font-bold text-gray-900 text-lg">Order Tracking</p>
          )}
        </div>
      </header>

      <main className="flex-1 flex items-start justify-center p-4 pt-10">
        <div className="w-full max-w-lg">
          {loading && (
            <div className="bg-white rounded-lg border border-gray-200 p-8 text-center text-sm text-gray-400">
              Loading order details…
            </div>
          )}

          {error && (
            <div className="bg-white rounded-lg border border-red-200 p-8 text-center">
              <XCircle className="h-8 w-8 text-red-400 mx-auto mb-3" />
              <p className="text-gray-700 font-medium">{error}</p>
            </div>
          )}

          {data && statusCfg && (
            <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
              <div className="px-6 py-5 border-b border-gray-100">
                <p className="text-xs text-gray-500 uppercase tracking-wide font-medium mb-1">Order</p>
                <p className="text-xl font-bold text-gray-900">{data.order_number}</p>
                <p className="text-sm text-gray-600 mt-0.5">{data.customer_name}</p>
              </div>

              <div className="px-6 py-5 flex items-center gap-4">
                <span className={statusCfg.color}>{statusCfg.icon}</span>
                <div>
                  <p className="font-semibold text-gray-900">{statusCfg.label}</p>
                  {data.predicted_delivery_time ? (
                    <p className="text-sm text-gray-500 flex items-center gap-1 mt-0.5">
                      <Clock className="h-3.5 w-3.5" />
                      Est. {new Date(data.predicted_delivery_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  ) : data.estimated_arrival ? (
                    <p className="text-sm text-gray-500 flex items-center gap-1 mt-0.5">
                      <Clock className="h-3.5 w-3.5" />
                      ETA {data.estimated_arrival}
                    </p>
                  ) : null}
                  {data.driver_name && (
                    <p className="text-sm text-gray-500 mt-0.5">Driver: {data.driver_name}</p>
                  )}
                </div>
              </div>

              {data.notes && (
                <div className="px-6 pb-5">
                  <p className="text-xs text-gray-500 uppercase tracking-wide font-medium mb-1">Notes</p>
                  <p className="text-sm text-gray-700">{data.notes}</p>
                </div>
              )}
            </div>
          )}
        </div>
      </main>

      <footer className="py-4 text-center text-xs text-gray-400">
        Powered by <span className="font-medium text-gray-500">{PLATFORM.name}</span>
      </footer>
    </div>
  );
}

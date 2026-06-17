'use client';

import { useEffect, useRef, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { driverApi } from '@/lib/api';
import { useAuthStore } from '@/store/auth';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { STATUS_COLORS, formatTime } from '@/lib/utils';
import { CheckCircle, XCircle, MapPin, Package, LogOut } from 'lucide-react';
import DeliverModal from './deliver-modal';
import { InstallButton } from '@/components/layout/install-button';

const queryClient = new QueryClient({ defaultOptions: { queries: { staleTime: 30_000 } } });

function DriverApp() {
  const router = useRouter();
  const { user, isAuthenticated, clearAuth } = useAuthStore();
  const qc = useQueryClient();
  const [delivering, setDelivering] = useState<number | null>(null);
  const [failing, setFailing] = useState<number | null>(null);
  const gpsInterval = useRef<ReturnType<typeof setInterval> | undefined>(undefined);

  useEffect(() => {
    if (!isAuthenticated()) { router.replace('/login'); return; }

    // GPS ping every 30s
    const ping = () => {
      if (!navigator.geolocation) return;
      navigator.geolocation.getCurrentPosition((pos) => {
        driverApi.updateLocation(pos.coords.latitude, pos.coords.longitude, pos.coords.accuracy).catch(() => {});
      });
    };
    ping();
    gpsInterval.current = setInterval(ping, 30_000);
    return () => clearInterval(gpsInterval.current);
  }, []);

  const { data, isLoading } = useQuery({
    queryKey: ['driver-today'],
    queryFn: () => driverApi.today(),
    refetchInterval: 60_000,
  });

  const failMutation = useMutation({
    mutationFn: ({ stopId, reason }: { stopId: number; reason: string }) =>
      driverApi.fail(stopId, reason),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['driver-today'] });
      setFailing(null);
    },
  });

  const stops = data?.data?.data?.stops ?? [];
  const driverInfo = data?.data?.data?.driver;
  const hideLogout = data?.data?.data?.hide_driver_logout ?? true;
  const pending = stops.filter((s: { order: { status: string } }) => s.order?.status !== 'delivered' && s.order?.status !== 'failed');
  const done    = stops.filter((s: { order: { status: string } }) => s.order?.status === 'delivered' || s.order?.status === 'failed');

  const handleLogout = async () => {
    try { await driverApi.updateStatus('off_duty'); } catch {}
    clearAuth();
    router.push('/login');
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-8">
      {/* Header */}
      <div className="bg-blue-600 text-white px-4 py-4">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="font-bold text-lg">Hontal Driver</h1>
            <p className="text-blue-100 text-sm">{user?.name}</p>
          </div>
          <div className="flex items-center gap-1">
            <InstallButton
              collapsed
              className="p-2 rounded-full hover:bg-blue-700 text-white"
              label="Install"
            />
            {!hideLogout && (
              <button onClick={handleLogout} className="p-2 rounded-full hover:bg-blue-700">
                <LogOut className="h-5 w-5" />
              </button>
            )}
          </div>
        </div>
        {driverInfo && (
          <div className="mt-3 flex gap-4 text-sm">
            <div className="bg-blue-700 rounded-lg px-3 py-2 text-center">
              <div className="text-xl font-bold">{pending.length}</div>
              <div className="text-xs text-blue-200">Remaining</div>
            </div>
            <div className="bg-blue-700 rounded-lg px-3 py-2 text-center">
              <div className="text-xl font-bold">{done.length}</div>
              <div className="text-xs text-blue-200">Done</div>
            </div>
            <div className="bg-blue-700 rounded-lg px-3 py-2 text-center">
              <div className="text-xl font-bold">{stops.length}</div>
              <div className="text-xs text-blue-200">Total</div>
            </div>
          </div>
        )}
      </div>

      {/* Progress bar */}
      {stops.length > 0 && (
        <div className="h-2 bg-gray-200">
          <div
            className="h-2 bg-green-500 transition-all"
            style={{ width: `${(done.length / stops.length) * 100}%` }}
          />
        </div>
      )}

      {/* Stops list */}
      <div className="px-4 py-4 space-y-3">
        {isLoading ? (
          <div className="text-center py-8 text-gray-400">Loading your stops...</div>
        ) : stops.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <Package className="h-12 w-12 mx-auto mb-3 opacity-30" />
            <p>No stops assigned for today</p>
          </div>
        ) : (
          <>
            {/* Pending stops first */}
            {pending.map((stop: {
              stop_id: number;
              stop_sequence: number;
              order: {
                status: string;
                customer_name: string;
                customer_phone: string;
                delivery_address: string;
                product_name: string;
                order_number: string;
                requested_delivery_start?: string;
                requested_delivery_end?: string;
              };
            }) => (
              <div key={stop.stop_id} className="bg-white rounded-xl border shadow-sm p-4">
                <div className="flex justify-between items-start mb-2">
                  <div className="flex items-center gap-2">
                    <span className="bg-blue-600 text-white text-xs font-bold w-7 h-7 rounded-full flex items-center justify-center">
                      {stop.stop_sequence}
                    </span>
                    <div>
                      <p className="font-semibold">{stop.order.customer_name}</p>
                      <p className="text-xs text-gray-400">{stop.order.customer_phone}</p>
                    </div>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${STATUS_COLORS[stop.order.status]}`}>
                    {stop.order.status.replace('_', ' ')}
                  </span>
                </div>

                <div className="space-y-1 mb-3">
                  <div className="flex items-start gap-2 text-sm">
                    <MapPin className="h-4 w-4 text-gray-400 mt-0.5 shrink-0" />
                    <p className="text-gray-600">{stop.order.delivery_address}</p>
                  </div>
                  <div className="flex items-start gap-2 text-sm">
                    <Package className="h-4 w-4 text-gray-400 mt-0.5 shrink-0" />
                    <p className="text-gray-600">{stop.order.product_name}</p>
                  </div>
                  {stop.order.requested_delivery_start && (
                    <p className="text-xs text-blue-500 ml-6">
                      Window: {formatTime(stop.order.requested_delivery_start)}–{formatTime(stop.order.requested_delivery_end)}
                    </p>
                  )}
                </div>

                {stop.order.status !== 'delivered' && stop.order.status !== 'failed' && (
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      className="flex-1 bg-green-500 hover:bg-green-600"
                      onClick={() => setDelivering(stop.stop_id)}
                    >
                      <CheckCircle className="h-4 w-4" /> Delivered
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1 border-red-300 text-red-500 hover:bg-red-50"
                      onClick={() => setFailing(stop.stop_id)}
                    >
                      <XCircle className="h-4 w-4" /> Failed
                    </Button>
                  </div>
                )}
              </div>
            ))}

            {/* Completed stops */}
            {done.length > 0 && (
              <div>
                <p className="text-xs text-gray-400 font-medium uppercase tracking-wide mb-2">Completed</p>
                {done.map((stop: {
                  stop_id: number;
                  stop_sequence: number;
                  order: {
                    status: string;
                    customer_name: string;
                    delivery_address: string;
                  };
                }) => (
                  <div key={stop.stop_id} className="bg-gray-100 rounded-lg p-3 mb-2 opacity-70 flex justify-between items-center">
                    <div>
                      <p className="font-medium text-sm">#{stop.stop_sequence} {stop.order.customer_name}</p>
                      <p className="text-xs text-gray-400">{stop.order.delivery_address?.substring(0, 40)}...</p>
                    </div>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${STATUS_COLORS[stop.order.status]}`}>
                      {stop.order.status}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {delivering !== null && (
        <DeliverModal stopId={delivering} onClose={() => setDelivering(null)} />
      )}

      {failing !== null && (
        <FailModal
          stopId={failing}
          onConfirm={(reason) => failMutation.mutate({ stopId: failing, reason })}
          onClose={() => setFailing(null)}
        />
      )}
    </div>
  );
}

function FailModal({ stopId, onConfirm, onClose }: { stopId: number; onConfirm: (r: string) => void; onClose: () => void }) {
  const [reason, setReason] = useState('');
  return (
    <div className="fixed inset-0 bg-black/50 flex items-end z-50">
      <div className="w-full bg-white rounded-t-2xl p-6">
        <h3 className="font-bold text-lg mb-3">Mark as Failed</h3>
        <p className="text-sm text-gray-500 mb-3">Why couldn't this delivery be completed?</p>
        <div className="space-y-2 mb-4">
          {['Customer not home', 'Address not found', 'Customer refused', 'Item damaged', 'Other'].map((r) => (
            <button
              key={r}
              className={`w-full text-left px-4 py-2.5 rounded-lg border transition-colors ${reason === r ? 'border-red-400 bg-red-50' : 'border-gray-200'}`}
              onClick={() => setReason(r)}
            >
              {r}
            </button>
          ))}
        </div>
        <div className="flex gap-3">
          <Button variant="outline" className="flex-1" onClick={onClose}>Cancel</Button>
          <Button className="flex-1 bg-red-500 hover:bg-red-600" disabled={!reason} onClick={() => onConfirm(reason)}>
            Confirm Failed
          </Button>
        </div>
      </div>
    </div>
  );
}

export default function DriverPage() {
  return (
    <QueryClientProvider client={queryClient}>
      <DriverApp />
    </QueryClientProvider>
  );
}

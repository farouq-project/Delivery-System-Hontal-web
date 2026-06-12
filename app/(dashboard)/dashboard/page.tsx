'use client';

import { useQuery } from '@tanstack/react-query';
import { ordersApi, driversApi } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PackageOpen, Truck, CheckCircle, Clock } from 'lucide-react';
import { LiveDriver } from '@/types';

export default function DashboardPage() {
  const { data: ordersData } = useQuery({
    queryKey: ['orders', 'summary'],
    queryFn: () => ordersApi.list({ per_page: 1 }),
  });

  const { data: driversData } = useQuery({
    queryKey: ['drivers', 'live'],
    queryFn: () => driversApi.live(),
    refetchInterval: 30_000,
  });

  const drivers: LiveDriver[] = driversData?.data?.data ?? [];
  const totalOrders = ordersData?.data?.meta?.total ?? 0;
  const activeDrivers = drivers.filter((d) => d.status === 'on_delivery' || d.status === 'delivering').length;
  const availableDrivers = drivers.filter((d) => d.status === 'available').length;

  const stats = [
    { label: "Today's Orders", value: totalOrders, icon: PackageOpen, color: 'text-blue-600' },
    { label: 'On Delivery',    value: activeDrivers, icon: Truck,       color: 'text-cyan-600' },
    { label: 'Available',      value: availableDrivers, icon: CheckCircle, color: 'text-green-600' },
    { label: 'Total Drivers',  value: drivers.length, icon: Clock,       color: 'text-purple-600' },
  ];

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-500 text-sm">Hontal Delivery Operations</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {stats.map(({ label, value, icon: Icon, color }) => (
          <Card key={label}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">{label}</p>
                  <p className="text-3xl font-bold mt-1">{value}</p>
                </div>
                <Icon className={`h-10 w-10 ${color} opacity-70`} />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader><CardTitle>Driver Status</CardTitle></CardHeader>
          <CardContent>
            {drivers.length === 0 ? (
              <p className="text-gray-400 text-sm">No drivers found</p>
            ) : (
              <div className="space-y-2">
                {drivers.map((d, i) => (
                  <div key={i} className="flex items-center justify-between py-2 border-b last:border-0">
                    <div>
                      <p className="font-medium text-sm">{d.driver_name}</p>
                      <p className="text-xs text-gray-400">{d.vehicle_plate ?? d.vehicle_type}</p>
                    </div>
                    <span className={`text-xs px-2 py-1 rounded-full font-medium
                      ${d.status === 'available' ? 'bg-green-100 text-green-700' :
                        d.status === 'on_delivery' ? 'bg-blue-100 text-blue-700' :
                        'bg-gray-100 text-gray-600'}`}>
                      {d.status.replace('_', ' ')}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Quick Links</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-2">
              {[
                { href: '/orders', label: 'View All Orders' },
                { href: '/dispatch', label: 'Dispatch Board' },
                { href: '/live', label: 'Live Tracking Map' },
                { href: '/customers', label: 'Manage Customers' },
              ].map(({ href, label }) => (
                <a key={href} href={href} className="block px-4 py-2 rounded-md bg-gray-50 hover:bg-blue-50 hover:text-blue-600 text-sm font-medium transition-colors">
                  {label} →
                </a>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

'use client';

import { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { LiveDriver, Route } from '@/types';
import { DRIVER_STATUS_COLORS } from '@/lib/utils';

// Fix leaflet default icon
delete (L.Icon.Default.prototype as { _getIconUrl?: unknown })._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

const DRIVER_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

function createDriverIcon(color: string, status: string) {
  const pulse = status === 'on_delivery' ? 'animate-pulse' : '';
  return L.divIcon({
    className: '',
    html: `<div style="
      width:36px;height:36px;border-radius:50%;
      background:${color};border:3px solid white;
      box-shadow:0 2px 8px rgba(0,0,0,0.3);
      display:flex;align-items:center;justify-content:center;
      font-size:16px;
    ">🚴</div>`,
    iconSize: [36, 36],
    iconAnchor: [18, 18],
  });
}

function createStopIcon(status: string) {
  const color = status === 'delivered' ? '#10b981' : status === 'failed' ? '#ef4444' : '#f59e0b';
  return L.divIcon({
    className: '',
    html: `<div style="
      width:20px;height:20px;border-radius:50%;
      background:${color};border:2px solid white;
      box-shadow:0 1px 4px rgba(0,0,0,0.3);
    "></div>`,
    iconSize: [20, 20],
    iconAnchor: [10, 10],
  });
}

function FlyToDriver({ driver }: { driver: LiveDriver | undefined }) {
  const map = useMap();
  useEffect(() => {
    if (driver?.lat && driver?.lng) {
      map.flyTo([driver.lat, driver.lng], 15, { duration: 1 });
    }
  }, [driver?.driver_id]);
  return null;
}

interface Props {
  drivers: LiveDriver[];
  selectedDriver: number | null;
  route: Route | null;
}

export default function LiveMap({ drivers, selectedDriver, route }: Props) {
  const selected = drivers.find((d) => d.driver_id === selectedDriver);

  const assignments = route?.assignments ?? [];

  return (
    <div className="flex-1 relative">
      <MapContainer
        center={[-6.9175, 107.6191]}
        zoom={12}
        className="w-full h-full"
        style={{ height: '100%' }}
      >
        <TileLayer
          attribution='© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {selected && <FlyToDriver driver={selected} />}

        {/* Route stop markers */}
        {assignments.map((assignment, aIdx) => {
          const color = DRIVER_COLORS[aIdx % DRIVER_COLORS.length];
          const coords = assignment.stops
            .filter((s) => s.order?.delivery_latitude)
            .map((s) => [s.order.delivery_latitude!, s.order.delivery_longitude!] as [number, number]);

          return (
            <div key={assignment.id}>
              {coords.length > 1 && (
                <Polyline positions={coords} color={color} weight={2} opacity={0.5} dashArray="5,5" />
              )}
              {assignment.stops.map((stop) => {
                if (!stop.order?.delivery_latitude) return null;
                return (
                  <Marker
                    key={stop.id ?? Math.random()}
                    position={[stop.order.delivery_latitude, stop.order.delivery_longitude!]}
                    icon={createStopIcon(stop.order.status)}
                  >
                    <Popup>
                      <div className="text-sm">
                        <p className="font-medium">#{stop.stop_sequence} {stop.order.customer_name}</p>
                        <p className="text-gray-500">{stop.order.delivery_address}</p>
                        <p className="text-gray-400 text-xs">{stop.order.order_number}</p>
                      </div>
                    </Popup>
                  </Marker>
                );
              })}
            </div>
          );
        })}

        {/* Driver markers */}
        {drivers.map((d, i) => {
          if (!d.lat) return null;
          const color = DRIVER_COLORS[i % DRIVER_COLORS.length];
          return (
            <Marker
              key={d.driver_id}
              position={[d.lat, d.lng!]}
              icon={createDriverIcon(color, d.status)}
            >
              <Popup>
                <div className="text-sm">
                  <p className="font-semibold">{d.driver_name}</p>
                  <p className="text-gray-500">{d.vehicle_plate}</p>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${DRIVER_STATUS_COLORS[d.status]}`}>
                    {d.status.replace('_', ' ')}
                  </span>
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>
    </div>
  );
}

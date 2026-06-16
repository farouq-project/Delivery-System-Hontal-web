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

// Klotter colors: green, blue, purple, yellow (cycle if >4 drivers)
const KLOTTER_COLORS = ['#10b981', '#3b82f6', '#8b5cf6', '#f59e0b', '#ef4444'];

function createDriverIcon(color: string) {
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

function createStopIcon(color: string, seq: number) {
  return L.divIcon({
    className: '',
    html: `<div style="
      width:26px;height:26px;border-radius:50%;
      background:${color};border:2px solid white;
      box-shadow:0 1px 4px rgba(0,0,0,0.35);
      display:flex;align-items:center;justify-content:center;
      color:white;font-size:11px;font-weight:700;
    ">${seq}</div>`,
    iconSize: [26, 26],
    iconAnchor: [13, 13],
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

  // Only real driver assignments (filter out null-driver unassigned group)
  const driverAssignments = (route?.assignments ?? []).filter((a) => !!a.driver);

  // Map driver_id → klotter color (indexed by assignment order)
  const driverColorMap = new Map<number, string>(
    driverAssignments.map((a, i) => [a.driver!.id, KLOTTER_COLORS[i % KLOTTER_COLORS.length]])
  );

  return (
    <div className="flex-1 relative">
      <MapContainer
        center={[-6.8592, 107.4805]}
        zoom={12}
        className="w-full h-full"
        style={{ height: '100%' }}
      >
        <TileLayer
          attribution='© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {selected && <FlyToDriver driver={selected} />}

        {/* Klotter stop markers — one color per driver, delivered stops removed */}
        {driverAssignments.map((assignment) => {
          const color = driverColorMap.get(assignment.driver!.id) ?? '#6b7280';

          // Only show stops that are not yet delivered or failed
          const remainingStops = assignment.stops.filter(
            (s) => !['delivered', 'failed'].includes(s.order?.status ?? '')
          );

          const coords = remainingStops
            .filter((s) => s.order?.delivery_latitude)
            .map((s) => [s.order.delivery_latitude!, s.order.delivery_longitude!] as [number, number]);

          return (
            <div key={assignment.id}>
              {coords.length > 1 && (
                <Polyline positions={coords} color={color} weight={2} opacity={0.5} dashArray="5,5" />
              )}
              {remainingStops.map((stop) => {
                if (!stop.order?.delivery_latitude) return null;
                return (
                  <Marker
                    key={stop.id ?? Math.random()}
                    position={[stop.order.delivery_latitude, stop.order.delivery_longitude!]}
                    icon={createStopIcon(color, stop.stop_sequence)}
                  >
                    <Popup>
                      <div className="text-sm">
                        <p className="font-medium">#{stop.stop_sequence} {stop.order.customer_name}</p>
                        <p className="text-gray-500">{stop.order.delivery_address}</p>
                        <p className="text-gray-400 text-xs">{stop.order.order_number}</p>
                        <p className="text-xs mt-0.5" style={{ color }}>
                          {assignment.driver!.driver_name}
                        </p>
                      </div>
                    </Popup>
                  </Marker>
                );
              })}
            </div>
          );
        })}

        {/* Driver markers — colored to match their klotter */}
        {drivers.map((d) => {
          if (!d.lat) return null;
          const color = driverColorMap.get(d.driver_id) ?? '#6b7280';
          return (
            <Marker
              key={d.driver_id}
              position={[d.lat, d.lng!]}
              icon={createDriverIcon(color)}
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

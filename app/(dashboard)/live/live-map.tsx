'use client';

import { useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { LiveDriver, Route } from '@/types';
import { DRIVER_STATUS_COLORS, orderProductLines } from '@/lib/utils';
import { driverColors, NO_ROUTE_COLOR } from './colors';

// Fix leaflet default icon
delete (L.Icon.Default.prototype as { _getIconUrl?: unknown })._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

// Used only until the depot location from Settings has loaded
const DEFAULT_CENTER: [number, number] = [-6.8592, 107.4805];
const DEPOT_ZOOM = 15;

// lucide "warehouse" icon, inlined because divIcon takes an HTML string
const WAREHOUSE_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 8.35V20a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V8.35A2 2 0 0 1 3.26 6.5l8-3.2a2 2 0 0 1 1.48 0l8 3.2A2 2 0 0 1 22 8.35Z"/><path d="M6 18h12"/><path d="M6 14h12"/><rect width="12" height="12" x="6" y="10"/></svg>`;

const depotIcon = L.divIcon({
  className: '',
  html: `<div style="
    width:38px;height:38px;border-radius:10px;
    background:#1e293b;border:3px solid white;
    box-shadow:0 2px 8px rgba(0,0,0,0.4);
    display:flex;align-items:center;justify-content:center;
  ">${WAREHOUSE_SVG}</div>`,
  iconSize: [38, 38],
  iconAnchor: [19, 19],
  popupAnchor: [0, -18],
});

export interface Depot {
  lat: number;
  lng: number;
  address?: string | null;
}

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

// Zoom to the depot once, when its location first arrives (it may load after the map)
function CenterOnDepot({ depot }: { depot: Depot }) {
  const map = useMap();
  const done = useRef(false);
  useEffect(() => {
    if (done.current) return;
    done.current = true;
    map.setView([depot.lat, depot.lng], DEPOT_ZOOM);
  }, [depot, map]);
  return null;
}

function DepotButton({ depot }: { depot: Depot }) {
  const map = useMap();
  const ref = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (ref.current) L.DomEvent.disableClickPropagation(ref.current);
  }, []);
  return (
    <button
      ref={ref}
      type="button"
      onClick={() => map.flyTo([depot.lat, depot.lng], DEPOT_ZOOM, { duration: 0.8 })}
      className="absolute top-3 right-3 z-[1000] rounded-md bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 shadow-md border hover:bg-slate-50"
      title="Back to the depot"
    >
      🏭 Depot
    </button>
  );
}

// Fly to a stop picked in the driver area
function FlyToStop({ point }: { point: { lat: number; lng: number; key: number } | null }) {
  const map = useMap();
  useEffect(() => {
    if (point) map.flyTo([point.lat, point.lng], Math.max(map.getZoom(), 16), { duration: 0.8 });
  }, [point, map]);
  return null;
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
  staleDriverIds?: Set<number>;
  depot?: Depot | null;
  /** Stop to fly to; `key` changes on every pick so the same stop can be picked twice */
  focusPoint?: { lat: number; lng: number; key: number } | null;
}

export default function LiveMap({ drivers, selectedDriver, route, staleDriverIds = new Set(), depot = null, focusPoint = null }: Props) {
  const selected = drivers.find((d) => d.driver_id === selectedDriver);

  // Only real driver assignments (filter out null-driver unassigned group)
  const driverAssignments = (route?.assignments ?? []).filter((a) => !!a.driver);

  // Map driver_id → klotter color (indexed by assignment order, same as the driver area)
  const driverColorMap = driverColors(route);

  return (
    <div className="h-full w-full relative z-0">
      <MapContainer
        center={depot ? [depot.lat, depot.lng] : DEFAULT_CENTER}
        zoom={depot ? DEPOT_ZOOM : 12}
        className="w-full h-full"
        style={{ height: '100%' }}
      >
        <TileLayer
          attribution='© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {depot && (
          <>
            <CenterOnDepot depot={depot} />
            <DepotButton depot={depot} />
            <Marker position={[depot.lat, depot.lng]} icon={depotIcon} zIndexOffset={1000}>
              <Popup>
                <div className="text-sm">
                  <p className="font-semibold">🏭 Depot</p>
                  {depot.address && <p className="text-gray-500">{depot.address}</p>}
                </div>
              </Popup>
            </Marker>
          </>
        )}

        {selected && <FlyToDriver driver={selected} />}
        <FlyToStop point={focusPoint} />

        {/* Klotter stop markers — one color per driver, delivered stops removed */}
        {driverAssignments.map((assignment) => {
          const color = driverColorMap.get(assignment.driver!.id) ?? NO_ROUTE_COLOR;

          // Only show stops that are not yet delivered or failed, in stop-number order
          const remainingStops = assignment.stops
            .filter((s) => !['delivered', 'failed'].includes(s.order?.status ?? ''))
            .sort((a, b) => a.stop_sequence - b.stop_sequence);

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
                    key={stop.id}
                    position={[stop.order.delivery_latitude, stop.order.delivery_longitude!]}
                    icon={createStopIcon(color, stop.stop_sequence)}
                  >
                    <Popup>
                      <div className="text-sm">
                        <p className="font-medium">#{stop.stop_sequence} {stop.order.customer_name}</p>
                        <p className="text-gray-500">{stop.order.delivery_address}</p>
                        {orderProductLines(stop.order).length > 0 && (
                          <ul className="my-1 text-gray-700">
                            {orderProductLines(stop.order).map((line, i) => (
                              <li key={i}>📦 {line}</li>
                            ))}
                          </ul>
                        )}
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

        {/* Driver markers — colored to match their klotter, grey if GPS stale */}
        {drivers.map((d) => {
          if (!d.lat) return null;
          const isStale = staleDriverIds.has(d.driver_id);
          const color = isStale ? '#9ca3af' : (driverColorMap.get(d.driver_id) ?? NO_ROUTE_COLOR);
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

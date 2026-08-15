'use client';

import { useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix leaflet default icon (webpack issue)
delete (L.Icon.Default.prototype as { _getIconUrl?: unknown })._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl:       'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl:     'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

// Color palette cycling per route
const ROUTE_COLORS = ['#3b82f6', '#10b981', '#8b5cf6', '#f59e0b', '#ef4444', '#06b6d4'];

function routeColor(index: number) {
  return ROUTE_COLORS[index % ROUTE_COLORS.length];
}

// ── Icons ─────────────────────────────────────────────────────────────────────

function orderIcon(state: 'unassigned' | 'selected' | 'assigned') {
  const bg: Record<typeof state, string> = {
    unassigned: '#f59e0b',
    selected:   '#3b82f6',
    assigned:   '#10b981',
  };
  return L.divIcon({
    className: '',
    html: `<div style="
      width:20px;height:20px;border-radius:50%;
      background:${bg[state]};border:2.5px solid white;
      box-shadow:0 1px 5px rgba(0,0,0,0.35);
    "></div>`,
    iconSize:   [20, 20],
    iconAnchor: [10, 10],
  });
}

function stopIcon(color: string, seq: number) {
  return L.divIcon({
    className: '',
    html: `<div style="
      width:26px;height:26px;border-radius:50%;
      background:${color};border:2.5px solid white;
      box-shadow:0 1px 5px rgba(0,0,0,0.4);
      display:flex;align-items:center;justify-content:center;
      color:white;font-size:11px;font-weight:700;
    ">${seq}</div>`,
    iconSize:   [26, 26],
    iconAnchor: [13, 13],
  });
}

function depotIcon() {
  return L.divIcon({
    className: '',
    html: `<div style="
      width:30px;height:30px;border-radius:6px;
      background:#ea580c;border:2.5px solid white;
      box-shadow:0 1px 5px rgba(0,0,0,0.4);
      display:flex;align-items:center;justify-content:center;
      font-size:14px;
    ">🏪</div>`,
    iconSize:   [30, 30],
    iconAnchor: [15, 15],
  });
}

function driverIcon(color: string) {
  return L.divIcon({
    className: '',
    html: `<div style="
      width:36px;height:36px;border-radius:50%;
      background:${color};border:3px solid white;
      box-shadow:0 2px 8px rgba(0,0,0,0.35);
      display:flex;align-items:center;justify-content:center;
      font-size:16px;
    ">🚴</div>`,
    iconSize:   [36, 36],
    iconAnchor: [18, 18],
  });
}

// ── Auto-fit bounds ───────────────────────────────────────────────────────────

function FitBounds({ points }: { points: [number, number][] }) {
  const map = useMap();
  const prevKey = useRef('');
  useEffect(() => {
    if (points.length === 0) return;
    const key = points.map(p => `${p[0].toFixed(3)},${p[1].toFixed(3)}`).join('|');
    if (key === prevKey.current) return;
    prevKey.current = key;
    if (points.length === 1) {
      map.setView(points[0], 14);
    } else {
      map.fitBounds(L.latLngBounds(points), { padding: [40, 40] });
    }
  }, [points.length]);
  return null;
}

// ── Types ─────────────────────────────────────────────────────────────────────

export interface MapOrder {
  id: number;
  order_number: string;
  customer_name: string;
  delivery_address: string;
  delivery_latitude: number;
  delivery_longitude: number;
  merchant_name: string;
  assigned_to_route: number | null;
}

export interface MapStop {
  id: number;
  seq: number;
  type: 'pickup' | 'dropoff';
  status: string;
  lat: number | null;
  lng: number | null;
  label: string;
  order_number: string | null;
  address: string | null;
}

export interface MapActiveRoute {
  id: number;
  status: string;
  driver_name: string;
  vehicle_plate: string;
  driver_lat: number | null;
  driver_lng: number | null;
  stops: MapStop[];
}

interface Props {
  dateOrders: MapOrder[];
  selectedOrderIds: Set<number>;
  activeRoutes: MapActiveRoute[];
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function DispatchMap({ dateOrders, selectedOrderIds, activeRoutes }: Props) {
  // Collect all points for auto-fit
  const orderPoints: [number, number][] = dateOrders
    .filter(o => o.delivery_latitude && o.delivery_longitude)
    .map(o => [o.delivery_latitude, o.delivery_longitude]);

  const routeStopPoints: [number, number][] = activeRoutes.flatMap(r =>
    r.stops.filter(s => s.lat && s.lng).map(s => [s.lat!, s.lng!] as [number, number])
  );

  const allPoints = [...orderPoints, ...routeStopPoints];

  return (
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

      {allPoints.length > 0 && <FitBounds points={allPoints} />}

      {/* Date order markers (visible when a date is selected) */}
      {dateOrders.map(order => {
        if (!order.delivery_latitude || !order.delivery_longitude) return null;
        const isSelected = selectedOrderIds.has(order.id);
        const isAssigned = !!order.assigned_to_route;
        const state = isAssigned ? 'assigned' : isSelected ? 'selected' : 'unassigned';
        return (
          <Marker
            key={`order-${order.id}`}
            position={[order.delivery_latitude, order.delivery_longitude]}
            icon={orderIcon(state)}
          >
            <Popup>
              <div className="text-sm min-w-[160px]">
                <p className="font-semibold">{order.customer_name}</p>
                <p className="text-gray-500 text-xs">{order.delivery_address}</p>
                <p className="text-gray-400 text-xs mt-0.5">{order.order_number}</p>
                <p className="text-gray-500 text-xs">{order.merchant_name}</p>
                {isAssigned && <p className="text-green-600 font-medium text-xs mt-1">Assigned to route #{order.assigned_to_route}</p>}
                {isSelected && !isAssigned && <p className="text-blue-600 font-medium text-xs mt-1">Selected for route</p>}
              </div>
            </Popup>
          </Marker>
        );
      })}

      {/* Active route overlays */}
      {activeRoutes.map((route, ri) => {
        const color = routeColor(ri);
        const deliveryStops = route.stops.filter(s => s.type === 'dropoff' && s.lat && s.lng && s.status !== 'completed');
        const polylineCoords = deliveryStops.map(s => [s.lat!, s.lng!] as [number, number]);
        const pickupStops = route.stops.filter(s => s.type === 'pickup' && s.lat && s.lng);

        return (
          <div key={`route-${route.id}`}>
            {/* Dashed polyline through delivery stops */}
            {polylineCoords.length > 1 && (
              <Polyline positions={polylineCoords} color={color} weight={2.5} opacity={0.65} dashArray="6,5" />
            )}

            {/* Depot / pickup stops */}
            {pickupStops.map(s => (
              <Marker key={`stop-${s.id}`} position={[s.lat!, s.lng!]} icon={depotIcon()}>
                <Popup>
                  <div className="text-sm min-w-[160px]">
                    <p className="font-semibold">🏪 {s.label}</p>
                    <p className="text-xs text-gray-500">Pickup stop</p>
                    <p className="text-xs font-medium mt-1" style={{ color }}>Route {route.id} — {route.driver_name}</p>
                  </div>
                </Popup>
              </Marker>
            ))}

            {/* Delivery stops */}
            {deliveryStops.map(s => (
              <Marker key={`stop-${s.id}`} position={[s.lat!, s.lng!]} icon={stopIcon(color, s.seq)}>
                <Popup>
                  <div className="text-sm min-w-[160px]">
                    <p className="font-semibold">#{s.seq} {s.label}</p>
                    {s.address && <p className="text-xs text-gray-500">{s.address}</p>}
                    {s.order_number && <p className="text-xs text-gray-400">{s.order_number}</p>}
                    <p className="text-xs font-medium mt-1" style={{ color }}>{route.driver_name} · {route.vehicle_plate}</p>
                  </div>
                </Popup>
              </Marker>
            ))}

            {/* Driver live position */}
            {route.driver_lat && route.driver_lng && (
              <Marker position={[route.driver_lat, route.driver_lng]} icon={driverIcon(color)}>
                <Popup>
                  <div className="text-sm min-w-[140px]">
                    <p className="font-semibold">{route.driver_name}</p>
                    <p className="text-xs text-gray-500">{route.vehicle_plate}</p>
                    <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${
                      route.status === 'active' ? 'bg-blue-100 text-blue-700' : 'bg-yellow-100 text-yellow-700'
                    }`}>
                      {route.status === 'active' ? 'En route' : 'Queued'}
                    </span>
                  </div>
                </Popup>
              </Marker>
            )}
          </div>
        );
      })}
    </MapContainer>
  );
}

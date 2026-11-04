'use client';

import { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, CircleMarker, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { orderProductLines } from '@/lib/utils';

export interface DriverMapStop {
  stop_id: number;
  stop_sequence: number;
  order: {
    status: string;
    customer_name: string;
    delivery_address: string;
    product_name?: string | null;
    items?: { name: string; quantity?: number | null }[] | null;
    delivery_latitude?: number | null;
    delivery_longitude?: number | null;
  };
}

interface Props {
  stops: DriverMapStop[];
  myPosition: { lat: number; lng: number } | null;
}

const isDone = (s: DriverMapStop) => s.order.status === 'delivered' || s.order.status === 'failed';

function stopIcon(seq: number, done: boolean) {
  const bg = done ? '#9ca3af' : '#2563eb';
  return L.divIcon({
    className: '',
    html: `<div style="
      width:26px;height:26px;border-radius:50%;
      background:${bg};border:2px solid white;
      box-shadow:0 1px 4px rgba(0,0,0,0.35);
      display:flex;align-items:center;justify-content:center;
      color:white;font-size:11px;font-weight:700;
    ">${seq}</div>`,
    iconSize: [26, 26],
    iconAnchor: [13, 13],
  });
}

// Re-frame only when the set of points changes (not on every GPS ping),
// so the map does not jump while the driver is looking at it.
function FitToPoints({ points }: { points: [number, number][] }) {
  const map = useMap();
  const key = points.map((p) => p.join(',')).join('|');
  useEffect(() => {
    if (points.length === 1) map.setView(points[0], 15);
    else if (points.length > 1) map.fitBounds(L.latLngBounds(points), { padding: [24, 24], maxZoom: 16 });
  }, [key]); // eslint-disable-line react-hooks/exhaustive-deps
  return null;
}

export default function DriverMap({ stops, myPosition }: Props) {
  const located = stops.filter((s) => s.order?.delivery_latitude && s.order?.delivery_longitude);
  const pending = located.filter((s) => !isDone(s));
  const toPoint = (s: DriverMapStop) => [s.order.delivery_latitude!, s.order.delivery_longitude!] as [number, number];

  // Frame the remaining stops; once everything is done, frame all stops; else the driver.
  const fitPoints: [number, number][] = pending.length
    ? pending.map(toPoint)
    : located.length
      ? located.map(toPoint)
      : myPosition ? [[myPosition.lat, myPosition.lng]] : [];

  if (!fitPoints.length) return null;

  return (
    // z-0 creates a stacking context: Leaflet's internal z-indexes stay below the page's modals.
    <div className="relative z-0 h-48 sm:h-64 w-full border-b">
      <MapContainer
        center={fitPoints[0]}
        zoom={14}
        scrollWheelZoom={false}
        className="h-full w-full"
        style={{ height: '100%' }}
      >
        <TileLayer
          attribution='© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <FitToPoints points={fitPoints} />

        {located.map((s) => {
          const done = isDone(s);
          const products = orderProductLines(s.order);
          return (
            <Marker
              key={s.stop_id}
              position={toPoint(s)}
              icon={stopIcon(s.stop_sequence, done)}
              zIndexOffset={done ? -100 : 0}
            >
              <Popup>
                <div className="text-sm min-w-40">
                  <p className="font-semibold">#{s.stop_sequence} {s.order.customer_name}</p>
                  <p className="text-gray-500">{s.order.delivery_address}</p>
                  {products.length > 0 && (
                    <ul className="my-1 text-gray-700">
                      {products.map((line, i) => <li key={i}>📦 {line}</li>)}
                    </ul>
                  )}
                  {done ? (
                    <p className="text-xs text-gray-400">{s.order.status}</p>
                  ) : (
                    <a
                      href={`https://www.google.com/maps/dir/?api=1&destination=${s.order.delivery_latitude},${s.order.delivery_longitude}&travelmode=driving`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 underline text-xs"
                    >
                      Navigate
                    </a>
                  )}
                </div>
              </Popup>
            </Marker>
          );
        })}

        {myPosition && (
          <CircleMarker
            center={[myPosition.lat, myPosition.lng]}
            radius={8}
            pathOptions={{ color: '#ffffff', weight: 3, fillColor: '#2563eb', fillOpacity: 1 }}
          >
            <Popup>You are here</Popup>
          </CircleMarker>
        )}
      </MapContainer>
    </div>
  );
}

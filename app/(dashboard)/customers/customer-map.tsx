'use client';

import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Customer } from '@/types';
import { Button } from '@/components/ui/button';

// Fix Leaflet default icon
delete (L.Icon.Default.prototype as { _getIconUrl?: unknown })._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl:       'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl:     'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

const VIP_PIN_COLOR: Record<string, string> = {
  standard:  '#6b7280',
  silver:    '#94a3b8',
  gold:      '#f59e0b',
  platinum:  '#8b5cf6',
};

function createPin(vipLevel: string) {
  const color = VIP_PIN_COLOR[vipLevel] ?? '#6b7280';
  return L.divIcon({
    className: '',
    html: `<div style="
      width:24px;height:24px;border-radius:50% 50% 50% 0;
      background:${color};border:2px solid white;
      box-shadow:0 1px 4px rgba(0,0,0,0.4);
      transform:rotate(-45deg);
    "></div>`,
    iconSize: [24, 24],
    iconAnchor: [12, 24],
    popupAnchor: [0, -24],
  });
}

interface Props {
  customers: Customer[];
  onEdit: (c: Customer) => void;
}

export default function CustomerMap({ customers, onEdit }: Props) {
  const withCoords = customers.filter(
    (c) => c.default_latitude != null && c.default_longitude != null
  );

  const center: [number, number] =
    withCoords.length > 0
      ? [
          withCoords.reduce((s, c) => s + c.default_latitude!, 0) / withCoords.length,
          withCoords.reduce((s, c) => s + c.default_longitude!, 0) / withCoords.length,
        ]
      : [-6.9175, 107.6191];

  return (
    <MapContainer center={center} zoom={11} style={{ height: '65vh', width: '100%' }}>
      <TileLayer
        attribution='© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {withCoords.map((c) => (
        <Marker
          key={c.id}
          position={[c.default_latitude!, c.default_longitude!]}
          icon={createPin(c.vip_level)}
        >
          <Popup minWidth={200}>
            <div className="text-sm space-y-1">
              <p className="font-semibold text-base leading-tight">{c.customer_name}</p>
              {c.phone && <p className="text-gray-500 text-xs">{c.phone}</p>}
              {c.default_address && (
                <p className="text-gray-500 text-xs leading-snug">{c.default_address}</p>
              )}
              <p className="text-gray-400 text-xs font-mono">
                {c.default_latitude?.toFixed(6)}, {c.default_longitude?.toFixed(6)}
              </p>
              <Button
                size="sm"
                className="w-full h-7 text-xs mt-1"
                onClick={() => onEdit(c)}
              >
                Edit Customer
              </Button>
            </div>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}

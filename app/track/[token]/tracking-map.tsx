'use client';

import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

delete (L.Icon.Default.prototype as { _getIconUrl?: unknown })._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl:       'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl:     'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

function makeIcon(emoji: string, bg: string) {
  return L.divIcon({
    className: '',
    html: `<div style="width:34px;height:34px;border-radius:50%;background:${bg};border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.25);display:flex;align-items:center;justify-content:center;font-size:15px;">${emoji}</div>`,
    iconSize:   [34, 34],
    iconAnchor: [17, 17],
  });
}

interface Props {
  deliveryLat:  number;
  deliveryLng:  number;
  customerName: string;
  driverLat?:   number | null;
  driverLng?:   number | null;
  depotLat?:    number | null;
  depotLng?:    number | null;
  depotName?:   string | null;
}

export default function TrackingMap({
  deliveryLat, deliveryLng, customerName,
  driverLat, driverLng,
  depotLat, depotLng, depotName,
}: Props) {
  const center: [number, number] = (driverLat && driverLng)
    ? [driverLat, driverLng]
    : [deliveryLat, deliveryLng];

  return (
    <MapContainer
      center={center}
      zoom={14}
      style={{ height: 280, width: '100%' }}
      scrollWheelZoom={false}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      <Marker position={[deliveryLat, deliveryLng]} icon={makeIcon('📦', '#ef4444')}>
        <Popup>{customerName}</Popup>
      </Marker>

      {driverLat && driverLng && (
        <Marker position={[driverLat, driverLng]} icon={makeIcon('🚴', '#3b82f6')}>
          <Popup>Driver sedang dalam perjalanan</Popup>
        </Marker>
      )}

      {depotLat && depotLng && (
        <Marker position={[depotLat, depotLng]} icon={makeIcon('🏪', '#10b981')}>
          <Popup>{depotName ?? 'Depot'}</Popup>
        </Marker>
      )}
    </MapContainer>
  );
}

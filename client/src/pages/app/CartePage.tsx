import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { ChevronRight } from 'lucide-react';
import { AppLayout } from '../../components/app/AppLayout';
import api from '../../services/api';

interface Dish {
  id: string;
  name: string;
  stock: number;
}

interface Fridge {
  id: string;
  name: string;
  location: string;
  lat: number;
  lng: number;
  online: boolean;
  temperature: number | null;
  dishes: Dish[];
}

function createFridgeIcon(online: boolean) {
  const bg = online ? '#1a3d2b' : '#9ca3af';
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="2" width="18" height="20" rx="2"/><path d="M3 11h18"/><path d="M13 3v8"/></svg>`;
  return L.divIcon({
    className: '',
    html: `<div style="width:44px;height:44px;background:${bg};border-radius:50%;display:flex;align-items:center;justify-content:center;border:3px solid white;box-shadow:0 4px 14px rgba(0,0,0,0.22)">${svg}</div>`,
    iconSize: [44, 44],
    iconAnchor: [22, 22],
    popupAnchor: [0, -28],
  });
}

function LocationFly() {
  const map = useMap();
  useEffect(() => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => map.flyTo([coords.latitude, coords.longitude], 14, { duration: 1.5 }),
      () => {},
    );
  }, [map]);
  return null;
}

function FridgePopup({ fridge }: { fridge: Fridge }) {
  const navigate = useNavigate();
  const available = fridge.dishes.filter((d) => d.stock > 0).length;

  return (
    <div style={{ minWidth: 190, fontFamily: 'inherit' }}>
      <p className="font-black text-gray-900 text-sm mb-0.5">{fridge.name}</p>
      <p className="text-xs text-gray-400 mb-2">{fridge.location}</p>
      {fridge.online ? (
        <p className="text-xs text-gray-700 mb-3">
          <span className="font-bold text-gray-900">{available}</span> plat{available !== 1 ? 's' : ''} disponible{available !== 1 ? 's' : ''}
          {fridge.temperature !== null && (
            <span className="ml-2 text-blue-600">{fridge.temperature}°C</span>
          )}
        </p>
      ) : (
        <p className="text-xs text-gray-400 mb-3">Hors ligne</p>
      )}
      <button
        onClick={() => navigate(`/app/frigo/${fridge.id}`)}
        className="w-full flex items-center justify-center gap-1 text-xs font-bold text-white rounded-xl py-2.5"
        style={{ background: '#1a3d2b' }}
      >
        Voir les plats <ChevronRight size={13} />
      </button>
    </div>
  );
}

export function CartePage() {
  const [fridges, setFridges] = useState<Fridge[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    api.get('/public/frigos').then((res) => setFridges(res.data.fridges)).catch(() => {});
  }, []);

  return (
    <AppLayout mapMode>
      <div style={{ position: 'relative', width: '100%', height: '100%' }}>
        <MapContainer
          center={[48.8566, 2.3522]}
          zoom={12}
          style={{ width: '100%', height: '100%' }}
          zoomControl={false}
        >
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          />
          <LocationFly />
          {fridges.map((fridge) => (
            <Marker
              key={fridge.id}
              position={[fridge.lat, fridge.lng]}
              icon={createFridgeIcon(fridge.online)}
            >
              <Popup>
                <FridgePopup fridge={fridge} />
              </Popup>
            </Marker>
          ))}
        </MapContainer>

        {/* Floating bottom panel */}
        <div style={{ position: 'absolute', bottom: 14, left: 16, zIndex: 1000 }}>
          <div style={{ display: 'flex', gap: 6 }}>
            {fridges.map((f) => (
              <button
                key={f.id}
                onClick={() => navigate(`/app/frigo/${f.id}`)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 5,
                  background: 'rgba(255,255,255,0.88)',
                  backdropFilter: 'blur(8px)',
                  WebkitBackdropFilter: 'blur(8px)',
                  borderRadius: 20,
                  padding: '5px 10px 5px 7px',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.10)',
                  border: 'none',
                  cursor: 'pointer',
                }}
              >
                <div style={{ width: 6, height: 6, borderRadius: '50%', background: f.online ? '#1a3d2b' : '#ccc', flexShrink: 0 }} />
                <span style={{ fontSize: 11, fontWeight: 600, color: '#333', whiteSpace: 'nowrap' }}>
                  {f.name}
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}

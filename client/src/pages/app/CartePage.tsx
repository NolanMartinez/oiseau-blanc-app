import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { ChevronRight, MapPin } from 'lucide-react';
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
  const bg = online ? '#1a3d2b' : '#a8a291';
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="2" width="18" height="20" rx="3"/><path d="M3 11h18"/><path d="M13 3v8"/></svg>`;
  return L.divIcon({
    className: '',
    html: `<div style="width:42px;height:42px;background:${bg};border-radius:50%;display:flex;align-items:center;justify-content:center;border:3px solid #f6f1e8;box-shadow:0 6px 20px rgba(28,28,28,0.25)">${svg}</div>`,
    iconSize: [42, 42],
    iconAnchor: [21, 21],
    popupAnchor: [0, -26],
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
    <div style={{ minWidth: 210, fontFamily: 'Inter, sans-serif', padding: '4px 2px' }}>
      <p
        style={{
          fontFamily: 'Fraunces, serif',
          fontSize: 17,
          fontWeight: 600,
          color: '#1c1c1c',
          letterSpacing: '-0.02em',
          marginBottom: 2,
        }}
      >
        {fridge.name}
      </p>
      <p style={{ fontSize: 11, color: '#9a9a9a', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
        {fridge.location}
      </p>
      {fridge.online ? (
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginBottom: 12 }}>
          <span style={{ fontFamily: 'Fraunces, serif', fontSize: 22, fontWeight: 600, color: '#1a3d2b' }}>
            {available}
          </span>
          <span style={{ fontSize: 12, color: '#4a4a4a' }}>
            plat{available !== 1 ? 's' : ''} disponible{available !== 1 ? 's' : ''}
          </span>
          {fridge.temperature !== null && (
            <span style={{ fontSize: 11, color: '#9a9a9a', marginLeft: 'auto' }}>{fridge.temperature}°C</span>
          )}
        </div>
      ) : (
        <p style={{ fontSize: 12, color: '#9a9a9a', marginBottom: 12 }}>Hors ligne</p>
      )}
      <button
        onClick={() => navigate(`/app/frigo/${fridge.id}`)}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 4,
          fontSize: 12,
          fontWeight: 600,
          color: '#fdfbf6',
          background: '#1a3d2b',
          borderRadius: 999,
          padding: '10px 14px',
          border: 'none',
          letterSpacing: '0.02em',
        }}
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
          style={{ width: '100%', height: '100%', background: '#f6f1e8' }}
          zoomControl={false}
        >
          <TileLayer
            url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>'
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

        {/* Top overlay card — titre + compteur */}
        <div
          style={{
            position: 'absolute',
            top: 16,
            left: 16,
            right: 16,
            zIndex: 1000,
            background: 'rgba(246,241,232,0.92)',
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
            borderRadius: 20,
            padding: '14px 18px',
            boxShadow: '0 10px 30px rgba(28,28,28,0.08)',
            border: '1px solid var(--line)',
            display: 'flex',
            alignItems: 'center',
            gap: 12,
          }}
        >
          <div
            style={{
              width: 40,
              height: 40,
              borderRadius: '50%',
              background: 'var(--forest)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <MapPin size={17} color="var(--ivory)" strokeWidth={2} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p
              style={{
                fontSize: 10,
                textTransform: 'uppercase',
                letterSpacing: '0.18em',
                color: 'var(--ink-faint)',
                fontWeight: 600,
              }}
            >
              Nos frigos
            </p>
            <p
              className="font-serif"
              style={{
                fontSize: 16,
                fontWeight: 600,
                color: 'var(--ink)',
                marginTop: 1,
                lineHeight: 1.2,
              }}
            >
              {fridges.length} point{fridges.length !== 1 ? 's' : ''} à proximité
            </p>
          </div>
        </div>

        {/* Bottom horizontal pills */}
        <div
          style={{
            position: 'absolute',
            bottom: 18,
            left: 0,
            right: 0,
            zIndex: 1000,
            overflowX: 'auto',
            paddingLeft: 16,
            paddingRight: 16,
            WebkitOverflowScrolling: 'touch',
          }}
        >
          <div style={{ display: 'flex', gap: 8, width: 'max-content' }}>
            {fridges.map((f) => {
              const available = f.dishes.filter((d) => d.stock > 0).length;
              return (
                <button
                  key={f.id}
                  onClick={() => navigate(`/app/frigo/${f.id}`)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    background: 'rgba(253,251,246,0.96)',
                    backdropFilter: 'blur(12px)',
                    WebkitBackdropFilter: 'blur(12px)',
                    borderRadius: 999,
                    padding: '9px 16px 9px 11px',
                    boxShadow: '0 6px 20px rgba(28,28,28,0.10)',
                    border: '1px solid var(--line)',
                    cursor: 'pointer',
                    flexShrink: 0,
                  }}
                >
                  <div
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: '50%',
                      background: f.online ? 'var(--forest)' : '#ccc',
                      flexShrink: 0,
                    }}
                  />
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                    <span
                      className="font-serif"
                      style={{
                        fontSize: 13,
                        fontWeight: 600,
                        color: 'var(--ink)',
                        whiteSpace: 'nowrap',
                        letterSpacing: '-0.01em',
                        lineHeight: 1.15,
                      }}
                    >
                      {f.name}
                    </span>
                    <span style={{ fontSize: 10, color: 'var(--ink-faint)', whiteSpace: 'nowrap' }}>
                      {f.online ? `${available} plats` : 'Hors ligne'}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}

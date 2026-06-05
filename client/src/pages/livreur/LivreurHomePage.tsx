import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronRight, Thermometer, Wifi, WifiOff } from 'lucide-react';
import { LivreurLayout } from './LivreurLayout';
import api from '../../services/api';

interface Fridge {
  id: string;
  name: string;
  location: string;
  online: boolean;
  temperature: number | null;
  lastSync: string;
}

interface FridgeWithAlert extends Fridge {
  hasUrgent: boolean;
  urgentCount: number;
}

export function LivreurHomePage() {
  const navigate = useNavigate();
  const [fridges, setFridges] = useState<FridgeWithAlert[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const res = await api.get('/livreur/frigos');
        const raw: Fridge[] = res.data.fridges;

        // Fetch suggestion counts in parallel to show urgent badges
        const withAlerts = await Promise.all(
          raw.map(async (f) => {
            try {
              const r = await api.get(`/livreur/frigos/${f.id}/suggestions`);
              const urgent = (r.data.suggestions as { priority: string }[]).filter(
                (s) => s.priority === 'URGENT',
              ).length;
              return { ...f, hasUrgent: urgent > 0, urgentCount: urgent };
            } catch {
              return { ...f, hasUrgent: false, urgentCount: 0 };
            }
          }),
        );

        withAlerts.sort((a, b) => Number(b.hasUrgent) - Number(a.hasUrgent));
        setFridges(withAlerts);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  return (
    <LivreurLayout>
      <div style={{ padding: '20px 16px 32px' }}>
        <p style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#319966', fontWeight: 700, marginBottom: 6 }}>
          Réapprovisionnement
        </p>
        <h1 style={{ fontSize: 26, fontWeight: 900, color: '#1a1a1a', marginBottom: 4, letterSpacing: '-0.02em' }}>
          Tournée du jour
        </h1>
        <p style={{ fontSize: 13, color: '#8c8c8c', marginBottom: 24 }}>
          Sélectionne un frigo pour voir les suggestions
        </p>

        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {[1, 2, 3].map((i) => (
              <div key={i} style={{ height: 88, borderRadius: 20, background: '#e8e8e8', opacity: 0.5 }} />
            ))}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {fridges.map((f) => (
              <button
                key={f.id}
                onClick={() => navigate(`/livreur/frigo/${f.id}`)}
                style={{
                  width: '100%',
                  background: '#ffffff',
                  border: f.hasUrgent ? '2px solid #ef4444' : '1px solid #e8e8e8',
                  borderRadius: 20,
                  padding: '14px 16px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  textAlign: 'left',
                  cursor: 'pointer',
                  transition: 'transform 0.1s',
                }}
              >
                <div
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: 14,
                    background: f.online ? '#e8f7f0' : '#f0f0f0',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                    position: 'relative',
                  }}
                >
                  {f.online
                    ? <Wifi size={20} color="#319966" />
                    : <WifiOff size={20} color="#b0b0b0" />
                  }
                  {f.hasUrgent && (
                    <span
                      style={{
                        position: 'absolute',
                        top: -4,
                        right: -4,
                        width: 18,
                        height: 18,
                        borderRadius: '50%',
                        background: '#ef4444',
                        color: '#ffffff',
                        fontSize: 10,
                        fontWeight: 800,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        border: '2px solid #ffffff',
                      }}
                    >
                      {f.urgentCount}
                    </span>
                  )}
                </div>

                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: 15, fontWeight: 800, color: '#1a1a1a', marginBottom: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {f.name}
                  </p>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <p style={{ fontSize: 11, color: '#8c8c8c', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
                      {f.location}
                    </p>
                    {f.temperature !== null && (
                      <span style={{ display: 'flex', alignItems: 'center', gap: 2, fontSize: 11, color: '#319966', fontWeight: 700, flexShrink: 0 }}>
                        <Thermometer size={10} />
                        {f.temperature}°C
                      </span>
                    )}
                  </div>
                  {f.hasUrgent && (
                    <p style={{ fontSize: 11, color: '#ef4444', fontWeight: 700, marginTop: 3 }}>
                      {f.urgentCount} action{f.urgentCount > 1 ? 's' : ''} urgente{f.urgentCount > 1 ? 's' : ''}
                    </p>
                  )}
                </div>

                <ChevronRight size={18} color="#c0c0c0" style={{ flexShrink: 0 }} />
              </button>
            ))}
          </div>
        )}
      </div>
    </LivreurLayout>
  );
}

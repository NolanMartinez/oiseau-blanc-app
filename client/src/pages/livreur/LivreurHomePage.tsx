import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronRight, MapPin, Package } from 'lucide-react';
import { LivreurLayout } from './LivreurLayout';
import api from '../../services/api';

interface SiteFridge {
  id: string;
  name: string;
  stockQty: number;
  stockItems: number;
}
interface Site {
  site: string;
  fridges: SiteFridge[];
  todayCount: number;
  todayRevenueCents: number;
  prevCount: number;
  prevRevenueCents: number;
}

const eur = (c: number) => (c / 100).toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €';

export function LivreurHomePage() {
  const navigate = useNavigate();
  const [sites, setSites] = useState<Site[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/livreur/sites')
      .then((res) => setSites(res.data.sites ?? []))
      .finally(() => setLoading(false));
  }, []);

  return (
    <LivreurLayout>
      <div style={{ padding: '20px 16px 32px' }}>
        <p style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#319966', fontWeight: 700, marginBottom: 6 }}>
          Tournée du jour
        </p>
        <h1 style={{ fontSize: 26, fontWeight: 900, color: '#1a1a1a', marginBottom: 4, letterSpacing: '-0.02em' }}>
          Sites
        </h1>
        <p style={{ fontSize: 13, color: '#8c8c8c', marginBottom: 24 }}>
          Ventes du jour et de la veille · stock par machine
        </p>

        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {[1, 2, 3].map((i) => <div key={i} style={{ height: 120, borderRadius: 20, background: '#e8e8e8', opacity: 0.5 }} />)}
          </div>
        ) : sites.length === 0 ? (
          <p style={{ textAlign: 'center', color: '#8c8c8c', fontSize: 13, paddingTop: 24 }}>Aucun site.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {sites.map((s) => (
              <div key={s.site} style={{ background: '#fff', border: '1px solid #e8e8e8', borderRadius: 20, overflow: 'hidden' }}>
                {/* En-tête site */}
                <div style={{ padding: '14px 16px 10px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                    <MapPin size={16} color="#319966" />
                    <span style={{ fontSize: 16, fontWeight: 800, color: '#1a1a1a', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.site}</span>
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <div style={{ flex: 1, background: '#e8f7f0', borderRadius: 12, padding: '8px 10px' }}>
                      <p style={{ fontSize: 10, color: '#319966', fontWeight: 700, textTransform: 'uppercase' }}>Aujourd'hui</p>
                      <p style={{ fontSize: 14, fontWeight: 800, color: '#1a1a1a' }}>{s.todayCount} · {eur(s.todayRevenueCents)}</p>
                    </div>
                    <div style={{ flex: 1, background: '#f5f5f0', borderRadius: 12, padding: '8px 10px' }}>
                      <p style={{ fontSize: 10, color: '#8c8c8c', fontWeight: 700, textTransform: 'uppercase' }}>Veille</p>
                      <p style={{ fontSize: 14, fontWeight: 800, color: '#3a3a3a' }}>{s.prevCount} · {eur(s.prevRevenueCents)}</p>
                    </div>
                  </div>
                </div>
                {/* Machines du site */}
                <div style={{ borderTop: '1px solid #f0f0f0' }}>
                  {s.fridges.map((f) => (
                    <button
                      key={f.id}
                      onClick={() => navigate(`/livreur/frigo/${f.id}`)}
                      style={{ width: '100%', background: 'none', border: 'none', borderTop: '1px solid #f5f5f5', padding: '11px 16px', display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', textAlign: 'left' }}
                    >
                      <Package size={15} color="#8c8c8c" />
                      <span style={{ flex: 1, fontSize: 14, fontWeight: 600, color: '#1a1a1a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.name}</span>
                      <span style={{ fontSize: 12, color: '#8c8c8c' }}>{f.stockQty} en stock</span>
                      <ChevronRight size={16} color="#c0c0c0" />
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Accès gestion des produits (activer / désactiver) */}
        <button
          onClick={() => navigate('/livreur/produits')}
          style={{ width: '100%', marginTop: 16, padding: '12px 16px', borderRadius: 16, border: '1px solid #e8e8e8', background: '#fff', display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', textAlign: 'left' }}
        >
          <div style={{ width: 36, height: 36, borderRadius: 10, background: '#eef2ff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Package size={16} color="#6366f1" />
          </div>
          <span style={{ flex: 1, fontSize: 14, fontWeight: 700, color: '#1a1a1a' }}>Activer / désactiver un produit</span>
          <ChevronRight size={16} color="#c0c0c0" />
        </button>
      </div>
    </LivreurLayout>
  );
}

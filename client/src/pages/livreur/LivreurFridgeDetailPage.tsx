import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { RefreshCw, Clock, MapPin } from 'lucide-react';
import { LivreurLayout } from './LivreurLayout';
import api from '../../services/api';

interface StockRow { dishName: string; quantity: number; expiryDate: string | null; expired: boolean; }
interface SaleRow { dishName: string; soldAt: string; board: string | null; boxNumber: number | null; amountCents: number; mode: string; source: string; }
interface Detail {
  fridge: { id: string; name: string; location: string | null };
  stock: StockRow[];
  todaySales: SaleRow[];
  prevSales: SaleRow[];
}

const eur = (c: number) => (c / 100).toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €';
const hhmm = (iso: string) => new Date(iso).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
const casier = (b: string | null, n: number | null) => (b || n != null) ? `${b ?? ''}${n ?? ''}` : '—';

function SalesTable({ rows }: { rows: SaleRow[] }) {
  if (rows.length === 0) return <p style={{ fontSize: 13, color: '#8c8c8c', padding: '8px 2px' }}>Aucune vente.</p>;
  const total = rows.reduce((s, r) => s + r.amountCents, 0);
  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
        <thead>
          <tr style={{ color: '#9ca3af', fontSize: 10, textTransform: 'uppercase' }}>
            <th style={{ textAlign: 'left', padding: '4px 6px' }}><Clock size={11} style={{ verticalAlign: 'middle' }} /> Heure</th>
            <th style={{ textAlign: 'left', padding: '4px 6px' }}>Produit</th>
            <th style={{ textAlign: 'center', padding: '4px 6px' }}><MapPin size={11} style={{ verticalAlign: 'middle' }} /> Casier</th>
            <th style={{ textAlign: 'right', padding: '4px 6px' }}>Prix</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} style={{ borderTop: '1px solid #f3f4f6' }}>
              <td style={{ padding: '7px 6px', color: '#6b7280', whiteSpace: 'nowrap' }}>{hhmm(r.soldAt)}</td>
              <td style={{ padding: '7px 6px', color: '#1a1a1a', fontWeight: 600 }}>
                {r.dishName}
                {r.mode === 'free' && <span style={{ marginLeft: 5, fontSize: 10, color: '#319966', fontWeight: 700 }}>offert</span>}
                {r.source === 'app' && <span style={{ marginLeft: 5, fontSize: 10, color: '#6366f1', fontWeight: 700 }}>app</span>}
              </td>
              <td style={{ padding: '7px 6px', textAlign: 'center', fontWeight: 700, color: '#3a3a3a' }}>{casier(r.board, r.boxNumber)}</td>
              <td style={{ padding: '7px 6px', textAlign: 'right', fontWeight: 700, color: '#1a1a1a', whiteSpace: 'nowrap' }}>{eur(r.amountCents)}</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr style={{ borderTop: '2px solid #319966' }}>
            <td colSpan={3} style={{ padding: '8px 6px', fontWeight: 800, color: '#111827' }}>{rows.length} vente{rows.length > 1 ? 's' : ''}</td>
            <td style={{ padding: '8px 6px', textAlign: 'right', fontWeight: 800, color: '#319966' }}>{eur(total)}</td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}

export function LivreurFridgeDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [d, setD] = useState<Detail | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'today' | 'prev'>('today');

  useEffect(() => {
    api.get(`/livreur/frigos/${id}/detail`)
      .then((res) => setD(res.data))
      .finally(() => setLoading(false));
  }, [id]);

  const H = ({ children }: { children: React.ReactNode }) => (
    <p style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#8c8c8c', margin: '22px 0 10px' }}>{children}</p>
  );

  return (
    <LivreurLayout title={d?.fridge.name ?? 'Frigo'} back>
      <div style={{ padding: '16px 16px 40px' }}>
        {d?.fridge.location && <p style={{ fontSize: 12, color: '#8c8c8c', marginBottom: 8 }}>{d.fridge.location}</p>}

        <button
          onClick={() => navigate(`/livreur/frigo/${id}/reassort`)}
          style={{ width: '100%', padding: '12px', borderRadius: 14, background: '#319966', border: 'none', color: '#fff', fontSize: 14, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, cursor: 'pointer', marginBottom: 4 }}
        >
          <RefreshCw size={15} /> Réassort
        </button>

        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 20 }}>
            {[1, 2, 3, 4].map((i) => <div key={i} style={{ height: 44, borderRadius: 12, background: '#e8e8e8', opacity: 0.5 }} />)}
          </div>
        ) : d ? (
          <>
            {/* Stock */}
            <H>Produits en stock ({d.stock.length})</H>
            {d.stock.length === 0 ? (
              <p style={{ fontSize: 13, color: '#8c8c8c' }}>Aucun produit en stock.</p>
            ) : (
              <div style={{ background: '#fff', border: '1px solid #e8e8e8', borderRadius: 14, overflow: 'hidden' }}>
                {d.stock.map((s, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 14px', borderTop: i ? '1px solid #f5f5f5' : 'none' }}>
                    <span style={{ flex: 1, fontSize: 14, fontWeight: 600, color: '#1a1a1a' }}>{s.dishName}</span>
                    {s.expiryDate && (
                      <span style={{ fontSize: 11, fontWeight: 700, color: s.expired ? '#ef4444' : '#8c8c8c' }}>
                        {s.expired ? 'à retirer · ' : 'DLC '}{new Date(s.expiryDate).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })}
                      </span>
                    )}
                    <span style={{ fontSize: 15, fontWeight: 800, color: '#319966', minWidth: 24, textAlign: 'right' }}>{s.quantity}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Ventes */}
            <H>Ventes</H>
            <div style={{ display: 'flex', gap: 6, marginBottom: 12, background: '#e8e8e8', borderRadius: 12, padding: 4 }}>
              {(['today', 'prev'] as const).map((t) => (
                <button key={t} onClick={() => setTab(t)}
                  style={{ flex: 1, padding: '7px', borderRadius: 9, border: 'none', fontSize: 13, fontWeight: 700, cursor: 'pointer',
                    background: tab === t ? '#fff' : 'transparent', color: tab === t ? '#1a1a1a' : '#8c8c8c',
                    boxShadow: tab === t ? '0 1px 4px rgba(0,0,0,0.1)' : 'none' }}>
                  {t === 'today' ? `Aujourd'hui (${d.todaySales.length})` : `Veille (${d.prevSales.length})`}
                </button>
              ))}
            </div>
            <div style={{ background: '#fff', border: '1px solid #e8e8e8', borderRadius: 14, padding: '8px 12px' }}>
              <SalesTable rows={tab === 'today' ? d.todaySales : d.prevSales} />
            </div>
          </>
        ) : (
          <p style={{ color: '#8c8c8c', marginTop: 20 }}>Impossible de charger le détail.</p>
        )}
      </div>
    </LivreurLayout>
  );
}

import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { CheckCircle, ChevronDown, ChevronUp, Minus, Plus } from 'lucide-react';
import { LivreurLayout } from './LivreurLayout';
import api from '../../services/api';

type Priority = 'URGENT' | 'REAPRO' | 'OPPORTUNITE' | 'OK';

interface Suggestion {
  stockId: string | null;
  dishId: string;
  dishName: string;
  category: string;
  allergens: string[];
  hasImage: boolean;
  currentStock: number;
  expiryDate: string | null;
  daysUntilExpiry: number | null;
  priority: Priority;
  priorityReason: string;
  recommendedQty: number;
  salesCount14d: number;
}

interface Fridge {
  id: string;
  name: string;
  location: string;
  online: boolean;
  temperature: number | null;
}

interface Change {
  stockId: string | null;
  dishId: string;
  dishName: string;
  delta: number;
  newExpiry: string | null;
  currentStock: number;
}

const ALLERGEN_ICONS: Record<string, string> = {
  gluten: '🌾', lactose: '🥛', lait: '🥛', oeufs: '🥚', oeuf: '🥚',
  arachides: '🥜', noix: '🌰', soja: '🫘', poisson: '🐟', fruits_de_mer: '🦐',
  crustacés: '🦞', mollusques: '🦑', céleri: '🥬', moutarde: '🫙',
  sésame: '🌿', sulfites: '🍷', lupin: '🌼',
};

function getAllergenIcon(a: string): string {
  const key = a.toLowerCase().replace(/[^a-z_]/g, '');
  return ALLERGEN_ICONS[key] ?? '⚠️';
}

const PRIORITY_CONFIG = {
  URGENT: { label: 'Urgent', color: '#ef4444', bg: '#fef2f2', dot: '#ef4444' },
  REAPRO: { label: 'À réapprovisionner', color: '#f59e0b', bg: '#fffbeb', dot: '#f59e0b' },
  OPPORTUNITE: { label: 'Opportunité', color: '#6366f1', bg: '#eef2ff', dot: '#6366f1' },
  OK: { label: 'Stock OK', color: '#319966', bg: '#e8f7f0', dot: '#319966' },
};

function SuggestionCard({
  s,
  delta,
  newExpiry,
  onChange,
}: {
  s: Suggestion;
  delta: number;
  newExpiry: string;
  onChange: (delta: number, expiry: string) => void;
}) {
  const cfg = PRIORITY_CONFIG[s.priority];
  const newQty = Math.max(0, s.currentStock + delta);

  return (
    <div
      style={{
        background: '#ffffff',
        border: `1px solid ${delta !== 0 || newExpiry ? '#319966' : '#e8e8e8'}`,
        borderRadius: 20,
        padding: 16,
        transition: 'border-color 0.15s',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 10 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3, flexWrap: 'wrap' }}>
            <span
              style={{
                fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em',
                color: cfg.color, background: cfg.bg, padding: '2px 7px', borderRadius: 999,
              }}
            >
              {cfg.label}
            </span>
            <span style={{ fontSize: 11, color: '#8c8c8c' }}>{s.priorityReason}</span>
          </div>
          <p style={{ fontSize: 15, fontWeight: 800, color: '#1a1a1a', lineHeight: 1.2 }}>{s.dishName}</p>
          <p style={{ fontSize: 11, color: '#a0a0a0', marginTop: 1 }}>{s.category}</p>
        </div>
        {s.hasImage && (
          <img
            src={`/api/v1/public/dishes/${s.dishId}/image`}
            alt=""
            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
            style={{ width: 48, height: 48, borderRadius: 12, objectFit: 'cover', flexShrink: 0 }}
          />
        )}
      </div>

      {s.allergens.length > 0 && (
        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginBottom: 10 }}>
          {s.allergens.map((a) => (
            <span
              key={a}
              title={a}
              style={{
                fontSize: 11, background: '#f5f5f0', border: '1px solid #e8e8e8',
                borderRadius: 999, padding: '2px 8px', color: '#666',
              }}
            >
              {getAllergenIcon(a)} {a}
            </span>
          ))}
        </div>
      )}

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
        <div>
          <p style={{ fontSize: 11, color: '#8c8c8c', marginBottom: 2 }}>En stock</p>
          <p style={{ fontSize: 20, fontWeight: 800, color: delta > 0 ? '#319966' : delta < 0 ? '#ef4444' : '#1a1a1a' }}>
            {newQty}
            {delta !== 0 && (
              <span style={{ fontSize: 12, color: '#8c8c8c', fontWeight: 500, marginLeft: 4 }}>
                ({delta > 0 ? '+' : ''}{delta})
              </span>
            )}
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button
            onClick={() => onChange(delta - 1, newExpiry)}
            style={{
              width: 36, height: 36, borderRadius: 12, background: '#f5f5f0', border: '1px solid #e8e8e8',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            <Minus size={16} color="#3a3a3a" />
          </button>
          <span style={{ fontSize: 13, fontWeight: 800, color: '#1a1a1a', minWidth: 20, textAlign: 'center' }}>
            {delta > 0 ? `+${delta}` : delta}
          </span>
          <button
            onClick={() => onChange(delta + 1, newExpiry)}
            style={{
              width: 36, height: 36, borderRadius: 12, background: '#319966', border: 'none',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            <Plus size={16} color="#ffffff" />
          </button>
        </div>
      </div>

      {s.recommendedQty > 0 && delta === 0 && (
        <button
          onClick={() => onChange(s.recommendedQty, newExpiry)}
          style={{
            marginTop: 8, width: '100%', padding: '8px 12px', borderRadius: 12,
            background: '#f5f5f0', border: '1px dashed #c8c8c8', fontSize: 12,
            color: '#319966', fontWeight: 700, cursor: 'pointer',
          }}
        >
          Apporter ~{s.recommendedQty} (suggéré)
        </button>
      )}

      <div style={{ marginTop: 10 }}>
        <label style={{ fontSize: 11, color: '#8c8c8c', fontWeight: 600, display: 'block', marginBottom: 4 }}>
          Date limite de consommation
        </label>
        <input
          type="date"
          value={newExpiry}
          onChange={(e) => onChange(delta, e.target.value)}
          style={{
            width: '100%', padding: '8px 12px', borderRadius: 12, border: '1px solid #e8e8e8',
            fontSize: 13, color: '#1a1a1a', background: '#f9f9f7',
          }}
        />
      </div>
    </div>
  );
}

export function LivreurRestockPage() {
  const { id } = useParams<{ id: string }>();
  const [fridge, setFridge] = useState<Fridge | null>(null);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [okExpanded, setOkExpanded] = useState(false);
  const [changes, setChanges] = useState<Record<string, { delta: number; newExpiry: string }>>({});
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get(`/livreur/frigos/${id}/suggestions`)
      .then((res) => {
        setFridge(res.data.fridge);
        setSuggestions(res.data.suggestions);
      })
      .catch(() => setError('Impossible de charger les suggestions.'))
      .finally(() => setLoading(false));
  }, [id]);

  function handleChange(dishId: string, delta: number, expiry: string) {
    setChanges((prev) => ({ ...prev, [dishId]: { delta, newExpiry: expiry } }));
  }

  function getChange(dishId: string) {
    return changes[dishId] ?? { delta: 0, newExpiry: '' };
  }

  const dirtyCount = Object.values(changes).filter(
    (c) => c.delta !== 0 || c.newExpiry,
  ).length;

  async function handleSubmit() {
    setError('');
    setSubmitting(true);
    try {
      const pending: Change[] = [];
      for (const [dishId, c] of Object.entries(changes)) {
        if (c.delta === 0 && !c.newExpiry) continue;
        const s = suggestions.find((x) => x.dishId === dishId);
        if (!s) continue;
        pending.push({
          stockId: s.stockId,
          dishId,
          dishName: s.dishName,
          delta: c.delta,
          newExpiry: c.newExpiry || null,
          currentStock: s.currentStock,
        });
      }

      await Promise.all(
        pending.map((p) => {
          const body: Record<string, unknown> = {};
          if (p.delta !== 0) body.quantity = Math.max(0, p.currentStock + p.delta);
          if (p.newExpiry) body.expiryDate = p.newExpiry;

          if (p.stockId) {
            return api.patch(`/admin/stock/${p.stockId}`, body);
          } else {
            return api.post('/admin/stock', {
              frigoId: id,
              dishId: p.dishId,
              quantity: Math.max(0, p.delta),
              ...(p.newExpiry ? { expiryDate: p.newExpiry } : {}),
            });
          }
        }),
      );

      setSuccess(true);
      setChanges({});
      const res = await api.get(`/livreur/frigos/${id}/suggestions`);
      setSuggestions(res.data.suggestions);
      setTimeout(() => setSuccess(false), 3000);
    } catch {
      setError('Erreur lors de l\'enregistrement. Réessaie.');
    } finally {
      setSubmitting(false);
    }
  }

  const urgent = suggestions.filter((s) => s.priority === 'URGENT');
  const reapro = suggestions.filter((s) => s.priority === 'REAPRO');
  const opportunite = suggestions.filter((s) => s.priority === 'OPPORTUNITE');
  const ok = suggestions.filter((s) => s.priority === 'OK');

  function Section({ title, color, items }: { title: string; color: string; items: Suggestion[] }) {
    if (items.length === 0) return null;
    return (
      <div style={{ marginBottom: 24 }}>
        <p style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color, marginBottom: 10 }}>
          {title} ({items.length})
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {items.map((s) => {
            const c = getChange(s.dishId);
            return (
              <SuggestionCard
                key={s.dishId}
                s={s}
                delta={c.delta}
                newExpiry={c.newExpiry}
                onChange={(d, e) => handleChange(s.dishId, d, e)}
              />
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <LivreurLayout title={fridge?.name ?? 'Frigo'} back>
      <div style={{ padding: '16px 16px 120px' }}>
        {fridge && (
          <p style={{ fontSize: 12, color: '#8c8c8c', marginBottom: 20 }}>{fridge.location}</p>
        )}

        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {[1, 2, 3].map((i) => (
              <div key={i} style={{ height: 160, borderRadius: 20, background: '#e8e8e8', opacity: 0.5 }} />
            ))}
          </div>
        ) : (
          <>
            <Section title="Urgent" color="#ef4444" items={urgent} />
            <Section title="À réapprovisionner" color="#f59e0b" items={reapro} />
            <Section title="Opportunités" color="#6366f1" items={opportunite} />

            {ok.length > 0 && (
              <div style={{ marginBottom: 24 }}>
                <button
                  onClick={() => setOkExpanded((v) => !v)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 6,
                    fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em',
                    color: '#319966', background: 'none', border: 'none', cursor: 'pointer', padding: 0, marginBottom: okExpanded ? 10 : 0,
                  }}
                >
                  Stock OK ({ok.length})
                  {okExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                </button>
                {okExpanded && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {ok.map((s) => {
                      const c = getChange(s.dishId);
                      return (
                        <SuggestionCard
                          key={s.dishId}
                          s={s}
                          delta={c.delta}
                          newExpiry={c.newExpiry}
                          onChange={(d, e) => handleChange(s.dishId, d, e)}
                        />
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>

      {/* Floating submit button */}
      {(dirtyCount > 0 || success || error) && (
        <div
          style={{
            position: 'fixed', bottom: 0, left: 0, right: 0,
            padding: '12px 16px 24px',
            background: 'linear-gradient(to bottom, transparent, #f5f5f0 40%)',
            zIndex: 100,
          }}
        >
          {error && (
            <p style={{ fontSize: 13, color: '#b91c1c', background: '#fef2f2', border: '1px solid #fee2e2', borderRadius: 12, padding: '10px 14px', marginBottom: 8 }}>
              {error}
            </p>
          )}
          {success && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#319966', background: '#e8f7f0', border: '1px solid #a7f3d0', borderRadius: 12, padding: '10px 14px', marginBottom: 8, fontWeight: 700 }}>
              <CheckCircle size={16} /> Modifications enregistrées !
            </div>
          )}
          {dirtyCount > 0 && (
            <button
              onClick={handleSubmit}
              disabled={submitting}
              style={{
                width: '100%', padding: '16px 20px', borderRadius: 999, border: 'none',
                background: '#319966', color: '#ffffff', fontSize: 15, fontWeight: 800,
                boxShadow: '0 8px 24px rgba(49,153,102,0.32)', cursor: 'pointer',
                opacity: submitting ? 0.6 : 1,
              }}
            >
              {submitting ? 'Enregistrement…' : `Valider (${dirtyCount} modification${dirtyCount > 1 ? 's' : ''})`}
            </button>
          )}
        </div>
      )}
    </LivreurLayout>
  );
}

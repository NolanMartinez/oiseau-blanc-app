import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { CheckCircle, ChevronDown, ChevronUp, Minus, Plus, Search, X, ListOrdered, LayoutList } from 'lucide-react';
import { LivreurLayout } from './LivreurLayout';
import api from '../../services/api';

type Priority = 'URGENT' | 'REAPRO' | 'OPPORTUNITE' | 'OK';
type Mode = 'guided' | 'quick';

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

interface CatalogDish {
  id: string;
  name: string;
  category: string;
  allergens: string[];
  hasImage: boolean;
}

interface Fridge {
  id: string;
  name: string;
  location: string;
  online: boolean;
  temperature: number | null;
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

const PRIORITY_CONFIG: Record<Priority, { label: string; color: string; bg: string; dot: string }> = {
  URGENT:     { label: 'Urgent',             color: '#ef4444', bg: '#fef2f2', dot: '#ef4444' },
  REAPRO:     { label: 'À réapprovisionner', color: '#f59e0b', bg: '#fffbeb', dot: '#f59e0b' },
  OPPORTUNITE:{ label: 'Opportunité',        color: '#6366f1', bg: '#eef2ff', dot: '#6366f1' },
  OK:         { label: 'Stock OK',           color: '#319966', bg: '#e8f7f0', dot: '#319966' },
};

const PRIORITY_ORDER: Record<Priority, number> = { URGENT: 0, REAPRO: 1, OPPORTUNITE: 2, OK: 3 };

// ─── SuggestionCard ──────────────────────────────────────────────────────────

function SuggestionCard({
  s, delta, newExpiry, onChange, isManual,
}: {
  s: Suggestion; delta: number; newExpiry: string;
  onChange: (delta: number, expiry: string) => void;
  isManual?: boolean;
}) {
  const cfg = PRIORITY_CONFIG[s.priority];
  const newQty = Math.max(0, s.currentStock + delta);

  return (
    <div style={{
      background: '#ffffff',
      border: `1px solid ${delta !== 0 || newExpiry ? '#319966' : '#e8e8e8'}`,
      borderRadius: 20, padding: 16, transition: 'border-color 0.15s',
    }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 10 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3, flexWrap: 'wrap' }}>
            {isManual ? (
              <span style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#8c8c8c', background: '#f0f0f0', padding: '2px 7px', borderRadius: 999 }}>
                Ajouté manuellement
              </span>
            ) : (
              <span style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: cfg.color, background: cfg.bg, padding: '2px 7px', borderRadius: 999 }}>
                {cfg.label}
              </span>
            )}
            {!isManual && <span style={{ fontSize: 11, color: '#8c8c8c' }}>{s.priorityReason}</span>}
          </div>
          <p style={{ fontSize: 15, fontWeight: 800, color: '#1a1a1a', lineHeight: 1.2 }}>{s.dishName}</p>
          <p style={{ fontSize: 11, color: '#a0a0a0', marginTop: 1 }}>{s.category}</p>
        </div>
        {s.hasImage && (
          <img src={`/api/v1/public/dishes/${s.dishId}/image`} alt=""
            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
            style={{ width: 48, height: 48, borderRadius: 12, objectFit: 'cover', flexShrink: 0 }} />
        )}
      </div>

      {s.allergens.length > 0 && (
        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginBottom: 10 }}>
          {s.allergens.map((a) => (
            <span key={a} title={a} style={{ fontSize: 11, background: '#f5f5f0', border: '1px solid #e8e8e8', borderRadius: 999, padding: '2px 8px', color: '#666' }}>
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
            {delta !== 0 && <span style={{ fontSize: 12, color: '#8c8c8c', fontWeight: 500, marginLeft: 4 }}>({delta > 0 ? '+' : ''}{delta})</span>}
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button onClick={() => onChange(delta - 1, newExpiry)}
            style={{ width: 36, height: 36, borderRadius: 12, background: '#f5f5f0', border: '1px solid #e8e8e8', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Minus size={16} color="#3a3a3a" />
          </button>
          <span style={{ fontSize: 13, fontWeight: 800, color: '#1a1a1a', minWidth: 20, textAlign: 'center' }}>
            {delta > 0 ? `+${delta}` : delta}
          </span>
          <button onClick={() => onChange(delta + 1, newExpiry)}
            style={{ width: 36, height: 36, borderRadius: 12, background: '#319966', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Plus size={16} color="#ffffff" />
          </button>
        </div>
      </div>

      {s.recommendedQty > 0 && delta === 0 && (
        <button onClick={() => onChange(s.recommendedQty, newExpiry)}
          style={{ marginTop: 8, width: '100%', padding: '8px 12px', borderRadius: 12, background: '#f5f5f0', border: '1px dashed #c8c8c8', fontSize: 12, color: '#319966', fontWeight: 700, cursor: 'pointer' }}>
          Apporter ~{s.recommendedQty} (suggéré)
        </button>
      )}

      <div style={{ marginTop: 10 }}>
        <label style={{ fontSize: 11, color: '#8c8c8c', fontWeight: 600, display: 'block', marginBottom: 4 }}>
          Date limite de consommation
        </label>
        <input type="date" value={newExpiry} onChange={(e) => onChange(delta, e.target.value)}
          style={{ width: '100%', padding: '8px 12px', borderRadius: 12, border: '1px solid #e8e8e8', fontSize: 13, color: '#1a1a1a', background: '#f9f9f7' }} />
      </div>
    </div>
  );
}

// ─── AddDishSheet ─────────────────────────────────────────────────────────────

function AddDishSheet({
  allDishes, excludeIds, onAdd, onClose,
}: {
  allDishes: CatalogDish[];
  excludeIds: Set<string>;
  onAdd: (dish: CatalogDish) => void;
  onClose: () => void;
}) {
  const [search, setSearch] = useState('');
  const filtered = allDishes
    .filter((d) => !excludeIds.has(d.id))
    .filter((d) => !search || d.name.toLowerCase().includes(search.toLowerCase()) || d.category.toLowerCase().includes(search.toLowerCase()));

  const byCategory = filtered.reduce<Record<string, CatalogDish[]>>((acc, d) => {
    (acc[d.category] ??= []).push(d);
    return acc;
  }, {});

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(0,0,0,0.4)', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
      <div style={{ background: '#f5f5f0', borderRadius: '24px 24px 0 0', maxHeight: '85vh', display: 'flex', flexDirection: 'column' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 16px 12px' }}>
          <p style={{ fontSize: 16, fontWeight: 800, color: '#1a1a1a' }}>Ajouter un plat</p>
          <button onClick={onClose} style={{ width: 32, height: 32, borderRadius: 10, background: '#e8e8e8', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <X size={16} color="#3a3a3a" />
          </button>
        </div>

        {/* Search */}
        <div style={{ padding: '0 16px 12px', position: 'relative' }}>
          <Search size={14} color="#8c8c8c" style={{ position: 'absolute', left: 28, top: '50%', transform: 'translateY(-50%)' }} />
          <input
            type="text"
            placeholder="Rechercher un plat…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            autoFocus
            style={{ width: '100%', padding: '10px 12px 10px 36px', borderRadius: 14, border: '1px solid #e0e0e0', fontSize: 14, background: '#ffffff', color: '#1a1a1a', boxSizing: 'border-box' }}
          />
        </div>

        {/* List */}
        <div style={{ overflowY: 'auto', flex: 1, padding: '0 16px 24px' }}>
          {filtered.length === 0 ? (
            <p style={{ textAlign: 'center', color: '#8c8c8c', fontSize: 13, paddingTop: 24 }}>Aucun plat trouvé</p>
          ) : (
            Object.entries(byCategory).map(([cat, items]) => (
              <div key={cat} style={{ marginBottom: 16 }}>
                <p style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#8c8c8c', fontWeight: 700, marginBottom: 8 }}>{cat}</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {items.map((d) => (
                    <div key={d.id} style={{ background: '#ffffff', borderRadius: 14, padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 10, border: '1px solid #e8e8e8' }}>
                      {d.hasImage && (
                        <img src={`/api/v1/public/dishes/${d.id}/image`} alt=""
                          onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                          style={{ width: 36, height: 36, borderRadius: 10, objectFit: 'cover', flexShrink: 0 }} />
                      )}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ fontSize: 14, fontWeight: 700, color: '#1a1a1a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{d.name}</p>
                        {d.allergens.length > 0 && (
                          <p style={{ fontSize: 10, color: '#8c8c8c', marginTop: 1 }}>
                            {d.allergens.map((a) => getAllergenIcon(a)).join(' ')} {d.allergens.join(', ')}
                          </p>
                        )}
                      </div>
                      <button
                        onClick={() => { onAdd(d); onClose(); }}
                        style={{ flexShrink: 0, padding: '6px 14px', borderRadius: 999, background: '#319966', border: 'none', color: '#ffffff', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
                        Ajouter
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

// ─── QuickImportRow ───────────────────────────────────────────────────────────

function QuickImportRow({
  s, delta, newExpiry, onChange,
}: {
  s: Suggestion; delta: number; newExpiry: string;
  onChange: (delta: number, expiry: string) => void;
}) {
  const cfg = PRIORITY_CONFIG[s.priority];
  const modified = delta !== 0 || !!newExpiry;

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px',
      background: modified ? '#f0faf4' : '#ffffff',
      border: `1px solid ${modified ? '#a7f3d0' : '#f0f0f0'}`,
      borderRadius: 14, transition: 'all 0.15s',
    }}>
      <div style={{ width: 8, height: 8, borderRadius: '50%', background: cfg.dot, flexShrink: 0 }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontSize: 13, fontWeight: 700, color: '#1a1a1a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.dishName}</p>
        <p style={{ fontSize: 10, color: '#8c8c8c' }}>stock: {s.currentStock}</p>
      </div>
      <input
        type="number"
        min="0"
        value={delta === 0 ? '' : delta}
        placeholder="0"
        onChange={(e) => {
          const v = parseInt(e.target.value);
          onChange(isNaN(v) ? 0 : Math.max(0, v), newExpiry);
        }}
        style={{
          width: 56, padding: '6px 8px', borderRadius: 10, border: `1px solid ${modified ? '#319966' : '#e0e0e0'}`,
          fontSize: 14, fontWeight: 700, color: '#1a1a1a', textAlign: 'center', background: '#ffffff',
        }}
      />
      <input
        type="date"
        value={newExpiry}
        onChange={(e) => onChange(delta, e.target.value)}
        style={{
          width: 120, padding: '6px 8px', borderRadius: 10, border: '1px solid #e0e0e0',
          fontSize: 12, color: '#1a1a1a', background: '#ffffff',
        }}
      />
    </div>
  );
}

// ─── Page principale ──────────────────────────────────────────────────────────

export function LivreurRestockPage() {
  const { id } = useParams<{ id: string }>();
  const [fridge, setFridge] = useState<Fridge | null>(null);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [extraDishes, setExtraDishes] = useState<Suggestion[]>([]);
  const [allDishes, setAllDishes] = useState<CatalogDish[]>([]);
  const [loading, setLoading] = useState(true);
  const [okExpanded, setOkExpanded] = useState(false);
  const [mode, setMode] = useState<Mode>('guided');
  const [showAddSheet, setShowAddSheet] = useState(false);
  const [changes, setChanges] = useState<Record<string, { delta: number; newExpiry: string }>>({});
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all([
      api.get(`/livreur/frigos/${id}/suggestions`),
      api.get('/public/dishes'),
    ]).then(([sugRes, dishRes]) => {
      setFridge(sugRes.data.fridge);
      setSuggestions(sugRes.data.suggestions);
      setAllDishes(dishRes.data.dishes);
    }).catch(() => setError('Impossible de charger les données.'))
      .finally(() => setLoading(false));
  }, [id]);

  function handleChange(dishId: string, delta: number, expiry: string) {
    setChanges((prev) => ({ ...prev, [dishId]: { delta, newExpiry: expiry } }));
  }

  function getChange(dishId: string) {
    return changes[dishId] ?? { delta: 0, newExpiry: '' };
  }

  function addManualDish(dish: CatalogDish) {
    const s: Suggestion = {
      stockId: null,
      dishId: dish.id,
      dishName: dish.name,
      category: dish.category,
      allergens: dish.allergens,
      hasImage: dish.hasImage,
      currentStock: 0,
      expiryDate: null,
      daysUntilExpiry: null,
      priority: 'OK',
      priorityReason: '',
      recommendedQty: 0,
      salesCount14d: 0,
    };
    setExtraDishes((prev) => [...prev, s]);
    setChanges((prev) => ({ ...prev, [dish.id]: { delta: 1, newExpiry: '' } }));
  }

  const dirtyCount = Object.values(changes).filter((c) => c.delta !== 0 || c.newExpiry).length;

  const allSuggestions = [...suggestions, ...extraDishes];
  const knownDishIds = new Set(allSuggestions.map((s) => s.dishId));

  async function handleSubmit() {
    setError('');
    setSubmitting(true);
    try {
      const pending = [];
      for (const [dishId, c] of Object.entries(changes)) {
        if (c.delta === 0 && !c.newExpiry) continue;
        const s = allSuggestions.find((x) => x.dishId === dishId);
        if (!s) continue;
        pending.push({ s, delta: c.delta, newExpiry: c.newExpiry || null });
      }

      await Promise.all(
        pending.map(({ s, delta, newExpiry }) => {
          const body: Record<string, unknown> = {};
          if (delta !== 0) body.quantity = Math.max(0, s.currentStock + delta);
          if (newExpiry) body.expiryDate = newExpiry;

          if (s.stockId) {
            return api.patch(`/admin/stock/${s.stockId}`, body);
          } else {
            return api.post('/admin/stock', {
              frigoId: id,
              dishId: s.dishId,
              quantity: Math.max(0, delta),
              ...(newExpiry ? { expiryDate: newExpiry } : {}),
            });
          }
        }),
      );

      setSuccess(true);
      setChanges({});
      setExtraDishes([]);
      const res = await api.get(`/livreur/frigos/${id}/suggestions`);
      setSuggestions(res.data.suggestions);
      setTimeout(() => setSuccess(false), 3000);
    } catch {
      setError("Erreur lors de l'enregistrement. Réessaie.");
    } finally {
      setSubmitting(false);
    }
  }

  const urgent = suggestions.filter((s) => s.priority === 'URGENT');
  const reapro = suggestions.filter((s) => s.priority === 'REAPRO');
  const opportunite = suggestions.filter((s) => s.priority === 'OPPORTUNITE');
  const ok = suggestions.filter((s) => s.priority === 'OK');

  function GuidedSection({ title, color, items, isExtra }: { title: string; color: string; items: Suggestion[]; isExtra?: boolean }) {
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
              <SuggestionCard key={s.dishId} s={s} delta={c.delta} newExpiry={c.newExpiry}
                onChange={(d, e) => handleChange(s.dishId, d, e)} isManual={isExtra} />
            );
          })}
        </div>
      </div>
    );
  }

  // Quick list: all known dishes + catalog extras, sorted by priority then name
  const quickListBase = allSuggestions.slice().sort((a, b) => {
    const pd = PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority];
    return pd !== 0 ? pd : a.dishName.localeCompare(b.dishName);
  });
  const catalogExtras: Suggestion[] = allDishes
    .filter((d) => !knownDishIds.has(d.id))
    .map((d) => ({
      stockId: null, dishId: d.id, dishName: d.name, category: d.category,
      allergens: d.allergens, hasImage: d.hasImage,
      currentStock: 0, expiryDate: null, daysUntilExpiry: null,
      priority: 'OK' as Priority, priorityReason: '', recommendedQty: 0, salesCount14d: 0,
    }));
  const quickList = [...quickListBase, ...catalogExtras];

  const floatingVisible = dirtyCount > 0 || success || !!error;

  return (
    <LivreurLayout title={fridge?.name ?? 'Frigo'} back>
      <div style={{ padding: '16px 16px 120px' }}>
        {fridge && <p style={{ fontSize: 12, color: '#8c8c8c', marginBottom: 12 }}>{fridge.location}</p>}

        {/* Mode toggle */}
        {!loading && (
          <div style={{ display: 'flex', gap: 6, marginBottom: 20, background: '#e8e8e8', borderRadius: 14, padding: 4 }}>
            <button
              onClick={() => setMode('guided')}
              style={{
                flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                padding: '8px 12px', borderRadius: 10, border: 'none', fontSize: 13, fontWeight: 700,
                background: mode === 'guided' ? '#ffffff' : 'transparent',
                color: mode === 'guided' ? '#1a1a1a' : '#8c8c8c',
                boxShadow: mode === 'guided' ? '0 1px 4px rgba(0,0,0,0.1)' : 'none',
                cursor: 'pointer', transition: 'all 0.15s',
              }}
            >
              <LayoutList size={14} /> Mode guidé
            </button>
            <button
              onClick={() => setMode('quick')}
              style={{
                flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                padding: '8px 12px', borderRadius: 10, border: 'none', fontSize: 13, fontWeight: 700,
                background: mode === 'quick' ? '#ffffff' : 'transparent',
                color: mode === 'quick' ? '#1a1a1a' : '#8c8c8c',
                boxShadow: mode === 'quick' ? '0 1px 4px rgba(0,0,0,0.1)' : 'none',
                cursor: 'pointer', transition: 'all 0.15s',
              }}
            >
              <ListOrdered size={14} /> Liste rapide
            </button>
          </div>
        )}

        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {[1, 2, 3].map((i) => <div key={i} style={{ height: 160, borderRadius: 20, background: '#e8e8e8', opacity: 0.5 }} />)}
          </div>
        ) : mode === 'guided' ? (
          <>
            <GuidedSection title="Urgent" color="#ef4444" items={urgent} />
            <GuidedSection title="À réapprovisionner" color="#f59e0b" items={reapro} />
            <GuidedSection title="Opportunités" color="#6366f1" items={opportunite} />

            {extraDishes.length > 0 && (
              <GuidedSection title="Ajoutés manuellement" color="#8c8c8c" items={extraDishes} isExtra />
            )}

            {ok.length > 0 && (
              <div style={{ marginBottom: 24 }}>
                <button
                  onClick={() => setOkExpanded((v) => !v)}
                  style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#319966', background: 'none', border: 'none', cursor: 'pointer', padding: 0, marginBottom: okExpanded ? 10 : 0 }}>
                  Stock OK ({ok.length})
                  {okExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                </button>
                {okExpanded && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {ok.map((s) => {
                      const c = getChange(s.dishId);
                      return <SuggestionCard key={s.dishId} s={s} delta={c.delta} newExpiry={c.newExpiry} onChange={(d, e) => handleChange(s.dishId, d, e)} />;
                    })}
                  </div>
                )}
              </div>
            )}

            {/* Bouton ajouter un plat */}
            <button
              onClick={() => setShowAddSheet(true)}
              style={{
                width: '100%', padding: '14px 16px', borderRadius: 16, border: '2px dashed #c8c8c8',
                background: 'transparent', fontSize: 14, fontWeight: 700, color: '#3a3a3a',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, cursor: 'pointer', marginBottom: 12,
              }}
            >
              <Plus size={16} /> Ajouter un plat (directive)
            </button>
          </>
        ) : (
          /* Mode liste rapide */
          <>
            <p style={{ fontSize: 11, color: '#8c8c8c', marginBottom: 12 }}>
              Renseigne les quantités apportées. Laisse à 0 pour ne rien modifier.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {quickList.map((s) => {
                const c = getChange(s.dishId);
                return (
                  <QuickImportRow key={s.dishId} s={s} delta={c.delta} newExpiry={c.newExpiry}
                    onChange={(d, e) => handleChange(s.dishId, d, e)} />
                );
              })}
            </div>
          </>
        )}
      </div>

      {/* Bottom bar */}
      {floatingVisible && (
        <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, padding: '12px 16px 24px', background: 'linear-gradient(to bottom, transparent, #f5f5f0 40%)', zIndex: 100 }}>
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
              style={{ width: '100%', padding: '16px 20px', borderRadius: 999, border: 'none', background: '#319966', color: '#ffffff', fontSize: 15, fontWeight: 800, boxShadow: '0 8px 24px rgba(49,153,102,0.32)', cursor: 'pointer', opacity: submitting ? 0.6 : 1 }}>
              {submitting ? 'Enregistrement…' : `Valider (${dirtyCount} modification${dirtyCount > 1 ? 's' : ''})`}
            </button>
          )}
        </div>
      )}

      {/* Sheet d'ajout */}
      {showAddSheet && (
        <AddDishSheet
          allDishes={allDishes}
          excludeIds={knownDishIds}
          onAdd={addManualDish}
          onClose={() => setShowAddSheet(false)}
        />
      )}
    </LivreurLayout>
  );
}

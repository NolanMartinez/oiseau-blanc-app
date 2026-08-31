import { useEffect, useState } from 'react';
import { Search, AlertCircle } from 'lucide-react';
import { LivreurLayout } from './LivreurLayout';
import api from '../../services/api';

interface Dish {
  id: string;
  name: string;
  category: string;
  isActive: boolean;
  hasImage: boolean;
}

// Interrupteur actif/inactif (même logique que « La Carte » côté admin, mais
// accessible au livreur). Désactiver un produit le retire de la carte publique.
function Toggle({ on, disabled, onChange }: { on: boolean; disabled?: boolean; onChange: () => void }) {
  return (
    <button
      onClick={onChange}
      disabled={disabled}
      style={{
        width: 46, height: 28, borderRadius: 999, border: 'none', flexShrink: 0,
        background: on ? '#319966' : '#d1d5db', position: 'relative',
        cursor: disabled ? 'default' : 'pointer', opacity: disabled ? 0.5 : 1,
        transition: 'background 0.15s',
      }}
      aria-pressed={on}
    >
      <span style={{
        position: 'absolute', top: 3, left: on ? 21 : 3, width: 22, height: 22,
        borderRadius: '50%', background: '#fff', transition: 'left 0.15s',
        boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
      }} />
    </button>
  );
}

export function LivreurProductsPage() {
  const [dishes, setDishes] = useState<Dish[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [savingId, setSavingId] = useState<string | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get('/admin/dishes')
      .then((res) => setDishes(res.data.dishes ?? []))
      .catch(() => setError('Impossible de charger les produits.'))
      .finally(() => setLoading(false));
  }, []);

  async function toggle(dish: Dish) {
    const next = !dish.isActive;
    setSavingId(dish.id);
    setError('');
    // Optimiste : on met à jour tout de suite, on annule si l'API échoue.
    setDishes((prev) => prev.map((d) => (d.id === dish.id ? { ...d, isActive: next } : d)));
    try {
      await api.patch(`/admin/dishes/${dish.id}`, { isActive: next });
    } catch {
      setDishes((prev) => prev.map((d) => (d.id === dish.id ? { ...d, isActive: dish.isActive } : d)));
      setError('Échec de la modification. Réessaie.');
    } finally {
      setSavingId(null);
    }
  }

  const filtered = dishes.filter(
    (d) => !search
      || d.name.toLowerCase().includes(search.toLowerCase())
      || d.category.toLowerCase().includes(search.toLowerCase()),
  );

  const byCategory = filtered.reduce<Record<string, Dish[]>>((acc, d) => {
    (acc[d.category] ??= []).push(d);
    return acc;
  }, {});

  const activeCount = dishes.filter((d) => d.isActive).length;

  return (
    <LivreurLayout title="Produits" back>
      <div style={{ padding: '16px 16px 40px' }}>
        <p style={{ fontSize: 13, color: '#8c8c8c', marginBottom: 16 }}>
          Active ou désactive un produit. Un produit désactivé n'apparaît plus sur la carte des clients.
          {!loading && ` · ${activeCount}/${dishes.length} actifs`}
        </p>

        {/* Recherche */}
        <div style={{ position: 'relative', marginBottom: 16 }}>
          <Search size={14} color="#8c8c8c" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)' }} />
          <input
            type="text"
            placeholder="Rechercher un produit…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ width: '100%', padding: '10px 12px 10px 34px', borderRadius: 14, border: '1px solid #e0e0e0', fontSize: 14, background: '#fff', color: '#1a1a1a', boxSizing: 'border-box' }}
          />
        </div>

        {error && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#b91c1c', background: '#fef2f2', border: '1px solid #fee2e2', borderRadius: 12, padding: '10px 14px', marginBottom: 12 }}>
            <AlertCircle size={16} /> {error}
          </div>
        )}

        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {[1, 2, 3, 4].map((i) => <div key={i} style={{ height: 60, borderRadius: 14, background: '#e8e8e8', opacity: 0.5 }} />)}
          </div>
        ) : filtered.length === 0 ? (
          <p style={{ textAlign: 'center', color: '#8c8c8c', fontSize: 13, paddingTop: 24 }}>Aucun produit trouvé</p>
        ) : (
          Object.entries(byCategory).map(([cat, items]) => (
            <div key={cat} style={{ marginBottom: 20 }}>
              <p style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#8c8c8c', fontWeight: 700, marginBottom: 8 }}>{cat}</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {items.map((d) => (
                  <div key={d.id} style={{
                    background: '#fff', borderRadius: 14, padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 12,
                    border: '1px solid #e8e8e8', opacity: d.isActive ? 1 : 0.6,
                  }}>
                    {d.hasImage && (
                      <img src={`/api/v1/public/dishes/${d.id}/image`} alt=""
                        onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                        style={{ width: 40, height: 40, borderRadius: 10, objectFit: 'cover', flexShrink: 0 }} />
                    )}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: 14, fontWeight: 700, color: '#1a1a1a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{d.name}</p>
                      <p style={{ fontSize: 11, color: d.isActive ? '#319966' : '#a0a0a0', fontWeight: 600 }}>
                        {d.isActive ? 'Actif' : 'Désactivé'}
                      </p>
                    </div>
                    <Toggle on={d.isActive} disabled={savingId === d.id} onChange={() => toggle(d)} />
                  </div>
                ))}
              </div>
            </div>
          ))
        )}
      </div>
    </LivreurLayout>
  );
}

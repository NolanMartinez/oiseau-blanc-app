import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Thermometer, Star, MapPin, Refrigerator, ChevronRight, RefreshCw } from 'lucide-react';
import { AppLayout } from '../../components/app/AppLayout';
import api, { userApi } from '../../services/api';
import { useUserAuth } from '../../context/UserAuthContext';

interface Dish {
  id: string;
  name: string;
  category: string;
  price: number;
  stock: number;
  allergens: string[];
}

interface Fridge {
  id: string;
  name: string;
  location: string;
  online: boolean;
  temperature: number | null;
  lastSync: string;
  dishes: Dish[];
}

function StockBadge({ stock }: { stock: number }) {
  if (stock === 0)
    return <span className="text-[10px] uppercase tracking-wider" style={{ color: '#c53838', fontWeight: 700 }}>Épuisé</span>;
  if (stock <= 2)
    return <span className="text-[10px] uppercase tracking-wider" style={{ color: '#a17600', fontWeight: 700 }}>Plus que {stock}</span>;
  return <span className="text-[10px] uppercase tracking-wider" style={{ color: 'var(--green)', fontWeight: 700 }}>Disponible</span>;
}

export function MonFrigoPage() {
  const { subscriber, updateSubscriber } = useUserAuth();
  const navigate = useNavigate();

  const [favoriId, setFavoriId] = useState<string | null>(subscriber?.favoriId ?? null);
  const [fridge, setFridge] = useState<Fridge | null>(null);
  const [fridges, setFridges] = useState<Fridge[]>([]);
  const [loading, setLoading] = useState(true);
  const [purchasedDishIds, setPurchasedDishIds] = useState<Set<string>>(new Set());
  const [choosing, setChoosing] = useState(false);

  // Charge le frigo favori ou la liste si pas de favori
  useEffect(() => {
    if (favoriId) {
      setLoading(true);
      api.get(`/public/frigos/${favoriId}`)
        .then((res) => setFridge(res.data.fridge))
        .catch(() => { setFavoriId(null); setFridge(null); })
        .finally(() => setLoading(false));
    } else {
      api.get('/public/frigos')
        .then((res) => setFridges(res.data.fridges))
        .catch(() => {})
        .finally(() => setLoading(false));
    }
  }, [favoriId]);

  // Achats pour le bouton "noter"
  useEffect(() => {
    if (!subscriber) return;
    userApi.get('/public/user/purchases')
      .then((res) => {
        const ids = new Set<string>(res.data.purchases.map((p: { dishId: string }) => p.dishId));
        setPurchasedDishIds(ids);
      })
      .catch(() => {});
  }, [subscriber]);

  async function handleChoose(frigoId: string) {
    try {
      await userApi.patch('/public/user/auth/frigo-favori', { frigoId });
      updateSubscriber({ favoriId: frigoId });
      setFridge(null);
      setLoading(true);
      setFavoriId(frigoId);
      setChoosing(false);
    } catch {
      // silencieux
    }
  }

  // Écran de sélection du frigo
  if (!favoriId || choosing) {
    return (
      <AppLayout>
        <div className="px-6 pt-10 pb-6 fade-up">
          <p className="text-[11px] uppercase tracking-[0.05em] font-semibold mb-3" style={{ color: 'var(--green)' }}>
            {choosing ? 'Changer de frigo' : 'Mon frigo'}
          </p>
          <h1 className="text-titre-gros mb-2" style={{ color: 'var(--ink)' }}>
            {choosing ? 'Choisissez\nun frigo' : 'Choisissez\nvotre frigo'}
          </h1>
          <p className="text-texte mb-8" style={{ color: 'var(--ink-soft)' }}>
            Votre frigo favori sera votre point de départ à chaque connexion.
          </p>

          {loading ? (
            <p className="text-sm text-center py-10" style={{ color: 'var(--ink-faint)' }}>Chargement…</p>
          ) : (
            <div className="space-y-3">
              {fridges.map((f) => {
                const available = f.dishes.filter((d) => d.stock > 0).length;
                return (
                  <button
                    key={f.id}
                    onClick={() => handleChoose(f.id)}
                    className="w-full rounded-3xl p-5 text-left transition-all hover:scale-[0.99] flex items-center gap-4"
                    style={{ background: '#ffffff', border: '1px solid var(--line)' }}
                  >
                    <div
                      className="w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0"
                      style={{ background: f.online ? 'var(--green)' : '#e5e5e5' }}
                    >
                      <Refrigerator size={18} color={f.online ? '#ffffff' : '#999'} strokeWidth={1.8} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[15px] font-bold truncate" style={{ color: 'var(--ink)' }}>{f.name}</p>
                      <p className="text-[12px] truncate mt-0.5" style={{ color: 'var(--ink-faint)' }}>{f.location}</p>
                      <p className="text-[11px] mt-1 font-semibold" style={{ color: f.online ? 'var(--green)' : '#bbb' }}>
                        {f.online ? `${available} plat${available !== 1 ? 's' : ''} disponible${available !== 1 ? 's' : ''}` : 'Hors ligne'}
                      </p>
                    </div>
                    <ChevronRight size={16} style={{ color: 'var(--ink-faint)', flexShrink: 0 }} />
                  </button>
                );
              })}
            </div>
          )}

          {choosing && (
            <button
              onClick={() => setChoosing(false)}
              className="w-full mt-6 text-[13px] text-center"
              style={{ color: 'var(--ink-faint)', fontWeight: 500 }}
            >
              Annuler
            </button>
          )}
        </div>
      </AppLayout>
    );
  }

  // Chargement du frigo favori
  if (loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-40 text-sm" style={{ color: 'var(--ink-faint)' }}>
          Chargement…
        </div>
      </AppLayout>
    );
  }

  if (!fridge) {
    return (
      <AppLayout>
        <div className="flex flex-col items-center justify-center h-60 gap-3">
          <p style={{ color: 'var(--ink-soft)' }}>Frigo introuvable.</p>
          <button onClick={() => setFavoriId(null)} className="text-sm underline" style={{ color: 'var(--green)', fontWeight: 600 }}>
            Choisir un autre frigo
          </button>
        </div>
      </AppLayout>
    );
  }

  const byCategory: Record<string, Dish[]> = {};
  for (const dish of fridge.dishes) {
    (byCategory[dish.category] ??= []).push(dish);
  }

  return (
    <AppLayout>
      {/* Hero */}
      <div className="px-6 pt-8 pb-4 fade-up">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-1.5 h-1.5 rounded-full" style={{ background: fridge.online ? 'var(--green)' : '#bdbdbd' }} />
          <p className="text-[10px] uppercase tracking-[0.05em]" style={{ color: fridge.online ? 'var(--green)' : 'var(--ink-faint)', fontWeight: 700 }}>
            {fridge.online ? 'En ligne' : 'Hors ligne'}
          </p>
          {fridge.online && fridge.temperature !== null && (
            <>
              <span style={{ color: 'var(--ink-faint)' }}>·</span>
              <span className="flex items-center gap-1 text-[10px]" style={{ color: 'var(--ink-faint)' }}>
                <Thermometer size={11} />
                {fridge.temperature}°C
              </span>
            </>
          )}
        </div>
        <h1 className="text-titre-gros mb-2" style={{ color: 'var(--ink)' }}>{fridge.name}</h1>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-[13px]" style={{ color: 'var(--ink-soft)' }}>
            <MapPin size={13} />
            <span>{fridge.location}</span>
          </div>
          <button
            onClick={() => setChoosing(true)}
            className="flex items-center gap-1 text-[11px]"
            style={{ color: 'var(--ink-faint)', fontWeight: 600 }}
          >
            <RefreshCw size={11} />
            Changer
          </button>
        </div>
      </div>

      {/* Séparateur */}
      <div className="px-6 mb-2 flex items-center gap-3">
        <div className="flex-1 h-px" style={{ background: 'var(--line)' }} />
        <span className="text-[10px] uppercase tracking-[0.05em]" style={{ color: 'var(--ink-faint)', fontWeight: 700 }}>La carte</span>
        <div className="flex-1 h-px" style={{ background: 'var(--line)' }} />
      </div>

      {/* Plats */}
      <div className="pb-10">
        {fridge.dishes.length === 0 ? (
          <p className="text-[13px] text-center py-16" style={{ color: 'var(--ink-faint)' }}>Aucun plat dans ce frigo.</p>
        ) : (
          Object.entries(byCategory).map(([category, dishes]) => (
            <div key={category} className="mt-6">
              <p className="px-6 mb-3 text-[11px] uppercase tracking-[0.05em]" style={{ color: 'var(--green)', fontWeight: 700 }}>
                {category}
              </p>
              <div className="px-6 space-y-3">
                {dishes.map((dish) => (
                  <div
                    key={dish.id}
                    className="rounded-3xl p-5"
                    style={{ background: '#ffffff', border: '1px solid var(--line)', opacity: dish.stock === 0 ? 0.55 : 1 }}
                  >
                    <div className="flex items-start justify-between gap-4 mb-3">
                      <h3 className="text-[18px] leading-tight flex-1" style={{ color: 'var(--ink)', fontWeight: 800 }}>{dish.name}</h3>
                      <span className="text-[18px] flex-shrink-0" style={{ color: 'var(--green)', fontWeight: 800 }}>
                        {dish.price.toFixed(2).replace('.', ',')} €
                      </span>
                    </div>
                    {dish.allergens.length > 0 && (
                      <p className="text-[11px] mb-3" style={{ color: 'var(--ink-faint)' }}>
                        Allergènes · {dish.allergens.join(', ')}
                      </p>
                    )}
                    <div className="flex items-center justify-between">
                      <StockBadge stock={dish.stock} />
                      {purchasedDishIds.has(dish.id) && (
                        <button
                          onClick={() => navigate(`/app/avis?dish=${dish.id}`)}
                          className="flex items-center gap-1.5 text-[11px] px-3 py-1.5 rounded-full hover:scale-95 transition-all"
                          style={{ color: '#a17600', background: 'var(--yellow-soft)', fontWeight: 700 }}
                        >
                          <Star size={11} fill="#f5b400" strokeWidth={0} />
                          Noter ce plat
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))
        )}
      </div>
    </AppLayout>
  );
}

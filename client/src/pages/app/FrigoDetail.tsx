import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Thermometer, Star } from 'lucide-react';
import { AppLayout } from '../../components/app/AppLayout';
import api from '../../services/api';

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
    return <span className="text-xs font-semibold text-red-500">Rupture de stock</span>;
  if (stock <= 2)
    return <span className="text-xs font-semibold text-orange-500">{stock} restant{stock > 1 ? 's' : ''}</span>;
  return <span className="text-xs font-semibold" style={{ color: '#1a3d2b' }}>{stock} en stock</span>;
}

export function FrigoDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [fridge, setFridge] = useState<Fridge | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!id) return;
    api.get(`/public/frigos/${id}`)
      .then((res) => setFridge(res.data.fridge))
      .catch((err) => { if (err?.response?.status === 404) setNotFound(true); })
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <AppLayout back>
        <div className="flex items-center justify-center h-40 text-sm text-gray-400">Chargement…</div>
      </AppLayout>
    );
  }

  if (notFound || !fridge) {
    return (
      <AppLayout back>
        <div className="flex flex-col items-center justify-center h-40 gap-2">
          <p className="text-sm text-gray-500">Frigo introuvable.</p>
          <button onClick={() => navigate('/app/carte')} className="text-sm font-bold underline" style={{ color: '#1a3d2b' }}>
            Retour à la carte
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
    <AppLayout back title={fridge.name}>
      {/* Info banner */}
      <div className="flex items-center gap-4 px-4 py-3" style={{ background: '#1a3d2b' }}>
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full" style={{ background: fridge.online ? '#4ade80' : '#6b7280' }} />
          <span className="text-xs font-semibold" style={{ color: fridge.online ? '#4ade80' : '#9ca3af' }}>
            {fridge.online ? 'En ligne' : 'Hors ligne'}
          </span>
        </div>
        {fridge.online && fridge.temperature !== null && (
          <span className="flex items-center gap-1 text-xs" style={{ color: 'rgba(255,255,255,0.6)' }}>
            <Thermometer size={12} />{fridge.temperature}°C
          </span>
        )}
        <span className="text-xs ml-auto" style={{ color: 'rgba(255,255,255,0.45)' }}>
          {fridge.location}
        </span>
      </div>

      {/* Dish list */}
      <div className="pb-6">
        {fridge.dishes.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-12">Aucun plat dans ce frigo.</p>
        ) : (
          Object.entries(byCategory).map(([category, dishes]) => (
            <div key={category} className="mt-5">
              <p className="text-[11px] font-black text-gray-400 uppercase tracking-widest px-4 mb-2">
                {category}
              </p>
              <div className="bg-white">
                {dishes.map((dish, i) => (
                  <div
                    key={dish.id}
                    className="px-4 py-4 flex items-start gap-4"
                    style={i !== 0 ? { borderTop: '1px solid #f4f4f4' } : {}}
                  >
                    <div className="flex-1 min-w-0">
                      <p className={`font-black text-sm mb-1 ${dish.stock === 0 ? 'text-gray-300' : 'text-gray-900'}`}>
                        {dish.name}
                      </p>
                      {dish.allergens.length > 0 && (
                        <p className="text-[11px] text-gray-400 mb-1.5">
                          Allergènes : {dish.allergens.join(', ')}
                        </p>
                      )}
                      <StockBadge stock={dish.stock} />
                      {dish.stock > 0 && (
                        <button
                          onClick={() => navigate(`/app/avis?dish=${dish.id}`)}
                          className="flex items-center gap-1 mt-2 text-xs font-bold"
                          style={{ color: '#1a3d2b' }}
                        >
                          <Star size={11} /> Donner un avis
                        </button>
                      )}
                    </div>
                    <span className={`font-black text-base flex-shrink-0 ${dish.stock === 0 ? 'text-gray-300' : 'text-gray-900'}`}>
                      {dish.price.toFixed(2)} €
                    </span>
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

import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useLang } from '../../context/LanguageContext';
import { Thermometer, Star, MapPin } from 'lucide-react';
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
  const { t } = useLang();
  if (stock === 0) {
    return (
      <span className="text-[10px] uppercase tracking-wider" style={{ color: '#c53838', fontWeight: 700 }}>
        {t('out_of_stock')}
      </span>
    );
  }
  if (stock <= 2) {
    return (
      <span className="text-[10px] uppercase tracking-wider" style={{ color: '#a17600', fontWeight: 700 }}>
        {t('only_left', stock)}
      </span>
    );
  }
  return (
    <span className="text-[10px] uppercase tracking-wider" style={{ color: 'var(--green)', fontWeight: 700 }}>
      {t('available')}
    </span>
  );
}

export function FrigoDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { subscriber } = useUserAuth();
  const { lang, t } = useLang();
  const [fridge, setFridge] = useState<Fridge | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [purchasedDishIds, setPurchasedDishIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!id) return;
    api.get(`/public/frigos/${id}?lang=${lang}`)
      .then((res) => setFridge(res.data.fridge))
      .catch((err) => { if (err?.response?.status === 404) setNotFound(true); })
      .finally(() => setLoading(false));
  }, [id, lang]);

  useEffect(() => {
    if (!subscriber) { setPurchasedDishIds(new Set()); return; }
    userApi.get('/public/user/purchases')
      .then((res) => {
        const ids = new Set<string>(res.data.purchases.map((p: { dishId: string }) => p.dishId));
        setPurchasedDishIds(ids);
      })
      .catch(() => setPurchasedDishIds(new Set()));
  }, [subscriber]);

  if (loading) {
    return (
      <AppLayout back>
        <div className="flex items-center justify-center h-40 text-sm" style={{ color: 'var(--ink-faint)' }}>
          {t('loading')}
        </div>
      </AppLayout>
    );
  }

  if (notFound || !fridge) {
    return (
      <AppLayout back>
        <div className="flex flex-col items-center justify-center h-60 gap-3">
          <p style={{ color: 'var(--ink-soft)' }}>{t('fridge_not_found')}</p>
          <button
            onClick={() => navigate('/app/carte')}
            className="text-sm underline"
            style={{ color: 'var(--forest)', fontWeight: 600 }}
          >
            {t('back_to_map')}
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
    <AppLayout back>
      {/* Hero */}
      <div className="px-6 pt-8 pb-6 fade-up">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-1.5 h-1.5 rounded-full" style={{ background: fridge.online ? 'var(--green)' : '#bdbdbd' }} />
          <p
            className="text-[10px] uppercase tracking-[0.05em]"
            style={{ color: fridge.online ? 'var(--green)' : 'var(--ink-faint)', fontWeight: 700 }}
          >
            {fridge.online ? t('online') : t('offline')}
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
        <h1 className="text-titre-gros mb-3" style={{ color: 'var(--ink)' }}>{fridge.name}</h1>
        <div className="flex items-center gap-1.5 text-[13px]" style={{ color: 'var(--ink-soft)' }}>
          <MapPin size={13} />
          <span>{fridge.location}</span>
        </div>
      </div>

      <div className="px-6 mb-2 flex items-center gap-3">
        <div className="flex-1 h-px" style={{ background: 'var(--line)' }} />
        <span className="text-[10px] uppercase tracking-[0.05em]" style={{ color: 'var(--ink-faint)', fontWeight: 700 }}>
          {t('the_menu')}
        </span>
        <div className="flex-1 h-px" style={{ background: 'var(--line)' }} />
      </div>

      <div className="pb-10">
        {fridge.dishes.length === 0 ? (
          <p className="text-[13px] text-center py-16" style={{ color: 'var(--ink-faint)' }}>
            {t('no_dishes')}
          </p>
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
                    className="rounded-3xl p-5 transition-all"
                    style={{ background: '#ffffff', border: '1px solid var(--line)', opacity: dish.stock === 0 ? 0.55 : 1 }}
                  >
                    <div className="flex items-start justify-between gap-4 mb-3">
                      <h3 className="text-[18px] leading-tight flex-1" style={{ color: 'var(--ink)', fontWeight: 800 }}>
                        {dish.name}
                      </h3>
                      <span className="text-[18px] flex-shrink-0" style={{ color: 'var(--green)', fontWeight: 800 }}>
                        {dish.price.toFixed(2).replace('.', ',')} €
                      </span>
                    </div>
                    {dish.allergens.length > 0 && (
                      <p className="text-[11px] mb-3" style={{ color: 'var(--ink-faint)' }}>
                        {t('allergens')} · {dish.allergens.join(', ')}
                      </p>
                    )}
                    <div className="flex items-center justify-between">
                      <StockBadge stock={dish.stock} />
                      {purchasedDishIds.has(dish.id) && (
                        <button
                          onClick={() => navigate(`/app/avis?dish=${dish.id}`)}
                          className="flex items-center gap-1.5 text-[11px] px-3 py-1.5 rounded-full transition-all hover:scale-95"
                          style={{ color: '#a17600', background: 'var(--yellow-soft)', fontWeight: 700 }}
                        >
                          <Star size={11} fill="#f5b400" strokeWidth={0} />
                          {t('rate_dish')}
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

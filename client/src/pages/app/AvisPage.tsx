import { useState, useEffect, FormEvent } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Star, CheckCircle, Lock, ShoppingBag, ChevronDown } from 'lucide-react';
import { AppLayout } from '../../components/app/AppLayout';
import { userApi } from '../../services/api';
import { useUserAuth } from '../../context/UserAuthContext';

const LABELS: Record<number, string> = { 1: 'Décevant', 2: 'Moyen', 3: 'Bien', 4: 'Très bien', 5: 'Excellent' };

interface Purchase {
  dishId: string;
  dishName: string;
  frigoName: string;
  hasReview: boolean;
}

function StarRating({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const [hovered, setHovered] = useState(0);
  return (
    <div className="flex gap-3">
      {[1, 2, 3, 4, 5].map((star) => {
        const active = star <= (hovered || value);
        return (
          <button
            key={star}
            type="button"
            onClick={() => onChange(star)}
            onMouseEnter={() => setHovered(star)}
            onMouseLeave={() => setHovered(0)}
            className="transition-all active:scale-90"
          >
            <Star
              size={38}
              strokeWidth={1.4}
              style={{
                color: active ? 'var(--terracotta)' : 'var(--line)',
                fill: active ? 'var(--terracotta)' : 'transparent',
                transition: 'all 0.2s',
              }}
            />
          </button>
        );
      })}
    </div>
  );
}

export function AvisPage() {
  const { subscriber, isLoading: authLoading } = useUserAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();

  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [purchasesLoading, setPurchasesLoading] = useState(false);
  const [dishId, setDishId] = useState(params.get('dish') ?? '');
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!subscriber) return;
    setPurchasesLoading(true);
    userApi.get('/public/user/purchases')
      .then((res) => setPurchases(res.data.purchases))
      .catch(() => setPurchases([]))
      .finally(() => setPurchasesLoading(false));
  }, [subscriber]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    if (!dishId) { setError('Veuillez sélectionner un plat.'); return; }
    if (rating === 0) { setError('Veuillez attribuer une note.'); return; }
    setLoading(true);
    try {
      await userApi.post('/public/reviews', { dish_id: dishId, rating, comment: comment || undefined });
      setSuccess(true);
    } catch (err: unknown) {
      const status = (err as { response?: { status?: number } })?.response?.status;
      if (status === 403) setError('Vous ne pouvez noter que les plats que vous avez pris.');
      else setError('Une erreur est survenue. Veuillez réessayer.');
    } finally {
      setLoading(false);
    }
  }

  if (authLoading) {
    return (
      <AppLayout title="Mon avis">
        <div className="flex items-center justify-center h-40 text-sm" style={{ color: 'var(--ink-faint)' }}>
          Chargement…
        </div>
      </AppLayout>
    );
  }

  // Non connecté
  if (!subscriber) {
    return (
      <AppLayout title="Mon avis">
        <div className="flex flex-col items-center justify-center px-6 pt-20 text-center fade-up">
          <div
            className="w-16 h-16 rounded-full flex items-center justify-center mb-6"
            style={{ background: 'var(--forest-soft)' }}
          >
            <Lock size={22} style={{ color: 'var(--forest)' }} />
          </div>
          <p
            className="text-[10px] uppercase tracking-[0.22em] mb-3"
            style={{ color: 'var(--terracotta)', fontWeight: 600 }}
          >
            Réservé aux clients
          </p>
          <h2 className="font-serif-display text-[34px] leading-none mb-4" style={{ color: 'var(--ink)' }}>
            Identifiez-vous
          </h2>
          <p className="text-[14px] leading-relaxed mb-10 max-w-xs" style={{ color: 'var(--ink-soft)' }}>
            Connectez-vous pour noter les plats que vous avez pris dans nos frigos.
          </p>
          <button
            onClick={() => navigate('/app/login?next=/app/avis')}
            className="px-10 py-4 rounded-full text-[13px] transition-all hover:scale-[0.98]"
            style={{
              background: 'var(--forest)',
              color: 'var(--ivory)',
              fontWeight: 600,
              letterSpacing: '0.02em',
              boxShadow: '0 8px 24px rgba(26,61,43,0.22)',
            }}
          >
            Se connecter
          </button>
        </div>
      </AppLayout>
    );
  }

  // Connecté mais aucun achat
  if (!purchasesLoading && purchases.length === 0) {
    return (
      <AppLayout title="Mon avis">
        <div className="flex flex-col items-center justify-center px-6 pt-20 text-center fade-up">
          <div
            className="w-16 h-16 rounded-full flex items-center justify-center mb-6"
            style={{ background: 'var(--terracotta-soft)' }}
          >
            <ShoppingBag size={22} style={{ color: 'var(--terracotta)' }} />
          </div>
          <h2 className="font-serif-display text-[34px] leading-none mb-4" style={{ color: 'var(--ink)' }}>
            Aucun plat pris
          </h2>
          <p className="text-[14px] leading-relaxed max-w-xs" style={{ color: 'var(--ink-soft)' }}>
            Vous pourrez noter un plat après l'avoir pris dans l'un de nos frigos.
          </p>
        </div>
      </AppLayout>
    );
  }

  // Succès
  if (success) {
    return (
      <AppLayout title="Mon avis">
        <div className="flex flex-col items-center justify-center px-6 pt-24 text-center fade-up">
          <div
            className="w-16 h-16 rounded-full flex items-center justify-center mb-6"
            style={{ background: 'var(--forest-soft)' }}
          >
            <CheckCircle size={28} style={{ color: 'var(--forest)' }} />
          </div>
          <p
            className="text-[10px] uppercase tracking-[0.22em] mb-3"
            style={{ color: 'var(--terracotta)', fontWeight: 600 }}
          >
            Avis enregistré
          </p>
          <h2 className="font-serif-display text-[40px] leading-none mb-4" style={{ color: 'var(--ink)' }}>
            Merci
          </h2>
          <p className="text-[14px] leading-relaxed mb-10" style={{ color: 'var(--ink-soft)' }}>
            Votre retour nous aide à améliorer nos plats.
          </p>
          <button
            onClick={() => { setSuccess(false); setRating(0); setComment(''); setDishId(''); }}
            className="text-[13px] underline"
            style={{ color: 'var(--forest)', fontWeight: 600 }}
          >
            Donner un autre avis
          </button>
        </div>
      </AppLayout>
    );
  }

  const currentPurchase = purchases.find((p) => p.dishId === dishId);

  return (
    <AppLayout title="Mon avis">
      <div className="px-6 pt-8 pb-4 fade-up">
        <p
          className="text-[10px] uppercase tracking-[0.22em] mb-3"
          style={{ color: 'var(--terracotta)', fontWeight: 600 }}
        >
          Votre expérience
        </p>
        <h1
          className="font-serif-display text-[38px] leading-[1.02] mb-3"
          style={{ color: 'var(--ink)' }}
        >
          Notez un plat
        </h1>
        <p className="text-[14px] leading-relaxed" style={{ color: 'var(--ink-soft)' }}>
          Partagez votre retour avec la communauté.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="px-6 pb-6 space-y-6">
        {/* Plat */}
        <section>
          <label
            className="text-[11px] uppercase tracking-[0.18em] block mb-3"
            style={{ color: 'var(--ink-faint)', fontWeight: 600 }}
          >
            Quel plat ?
          </label>
          {purchasesLoading ? (
            <p className="text-[13px]" style={{ color: 'var(--ink-faint)' }}>Chargement…</p>
          ) : (
            <div className="relative">
              <select
                value={dishId}
                onChange={(e) => setDishId(e.target.value)}
                className="w-full py-4 px-5 pr-12 rounded-2xl text-[14px] focus:outline-none appearance-none"
                style={{
                  background: 'var(--ivory)',
                  border: '1px solid var(--line)',
                  color: 'var(--ink)',
                  fontWeight: 500,
                }}
              >
                <option value="">Sélectionner un plat…</option>
                {purchases.map((p) => (
                  <option key={p.dishId} value={p.dishId}>
                    {p.dishName}{p.hasReview ? ' — déjà noté' : ''}
                  </option>
                ))}
              </select>
              <ChevronDown
                size={16}
                style={{
                  position: 'absolute',
                  right: 18,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: 'var(--ink-faint)',
                  pointerEvents: 'none',
                }}
              />
            </div>
          )}
          {currentPurchase?.hasReview && (
            <p className="text-[12px] mt-3" style={{ color: 'var(--terracotta)', fontWeight: 500 }}>
              Vous avez déjà noté ce plat — votre avis sera mis à jour.
            </p>
          )}
        </section>

        {/* Note */}
        <section>
          <label
            className="text-[11px] uppercase tracking-[0.18em] block mb-4"
            style={{ color: 'var(--ink-faint)', fontWeight: 600 }}
          >
            Votre note
          </label>
          <StarRating value={rating} onChange={setRating} />
          {rating > 0 && (
            <p
              className="font-serif mt-4 text-[18px]"
              style={{ color: 'var(--terracotta)', fontWeight: 600, letterSpacing: '-0.015em' }}
            >
              {LABELS[rating]}
            </p>
          )}
        </section>

        {/* Commentaire */}
        <section>
          <label
            className="text-[11px] uppercase tracking-[0.18em] block mb-3"
            style={{ color: 'var(--ink-faint)', fontWeight: 600 }}
          >
            Commentaire · optionnel
          </label>
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            maxLength={500}
            rows={4}
            placeholder="Partagez votre expérience…"
            className="w-full rounded-2xl px-5 py-4 text-[14px] focus:outline-none resize-none"
            style={{
              background: 'var(--ivory)',
              border: '1px solid var(--line)',
              color: 'var(--ink)',
              fontFamily: 'inherit',
            }}
          />
          <p className="text-[11px] text-right mt-2" style={{ color: 'var(--ink-faint)' }}>
            {comment.length}/500
          </p>
        </section>

        {/* Submit flottant */}
        <div
          className="sticky bottom-0 z-10 -mx-6 px-6 pt-10 pb-5"
          style={{ background: 'linear-gradient(to bottom, transparent, var(--cream) 45%)' }}
        >
          {error && (
            <p
              className="text-[13px] rounded-xl px-4 py-3 mb-3"
              style={{ background: '#fef2f2', color: '#b91c1c', border: '1px solid #fee2e2' }}
            >
              {error}
            </p>
          )}
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-full py-4 text-[14px] disabled:opacity-50 transition-all hover:scale-[0.99]"
            style={{
              background: 'var(--forest)',
              color: 'var(--ivory)',
              fontWeight: 600,
              letterSpacing: '0.02em',
              boxShadow: '0 8px 24px rgba(26,61,43,0.22)',
            }}
          >
            {loading ? 'Envoi…' : 'Envoyer mon avis'}
          </button>
        </div>
      </form>
    </AppLayout>
  );
}

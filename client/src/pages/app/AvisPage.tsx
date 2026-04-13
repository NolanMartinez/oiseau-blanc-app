import { useState, useEffect, FormEvent } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Star, CheckCircle, Lock, ShoppingBag } from 'lucide-react';
import { AppLayout } from '../../components/app/AppLayout';
import { userApi } from '../../services/api';
import { useUserAuth } from '../../context/UserAuthContext';

const LABELS: Record<number, string> = { 1: 'Mauvais', 2: 'Moyen', 3: 'Bien', 4: 'Très bien', 5: 'Excellent !' };

interface Purchase {
  dishId: string;
  dishName: string;
  frigoName: string;
  hasReview: boolean;
}

function StarRating({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const [hovered, setHovered] = useState(0);
  return (
    <div className="flex gap-2">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          onClick={() => onChange(star)}
          onMouseEnter={() => setHovered(star)}
          onMouseLeave={() => setHovered(0)}
          className="transition-transform active:scale-90"
        >
          <Star
            size={38}
            strokeWidth={1.5}
            className={star <= (hovered || value) ? 'fill-amber-400 text-amber-400' : 'text-gray-200'}
          />
        </button>
      ))}
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
        <div className="flex items-center justify-center h-40 text-sm text-gray-400">Chargement…</div>
      </AppLayout>
    );
  }

  // Non connecté
  if (!subscriber) {
    return (
      <AppLayout title="Mon avis">
        <div className="bg-white px-4 pt-5 pb-5">
          <h1 className="text-2xl font-black text-gray-900 leading-tight">Notez un plat</h1>
        </div>
        <div className="flex flex-col items-center justify-center px-6 pt-12 text-center">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-5">
            <Lock size={26} className="text-gray-400" />
          </div>
          <h2 className="text-xl font-black text-gray-900 mb-2">Identifiez-vous</h2>
          <p className="text-sm text-gray-500 mb-8 max-w-xs">
            Connectez-vous pour noter les plats que vous avez pris dans nos frigos.
          </p>
          <button
            onClick={() => navigate('/app/login?next=/app/avis')}
            className="px-8 py-3.5 text-white font-black rounded-2xl text-sm"
            style={{ background: '#1a3d2b', boxShadow: '0 6px 20px rgba(26,61,43,0.35)' }}
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
        <div className="bg-white px-4 pt-5 pb-5">
          <h1 className="text-2xl font-black text-gray-900 leading-tight">Notez un plat</h1>
        </div>
        <div className="flex flex-col items-center justify-center px-6 pt-12 text-center">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-5">
            <ShoppingBag size={26} className="text-gray-400" />
          </div>
          <h2 className="text-xl font-black text-gray-900 mb-2">Aucun plat pris</h2>
          <p className="text-sm text-gray-500 max-w-xs">
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
        <div className="flex flex-col items-center justify-center px-6 pt-20 text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-5">
            <CheckCircle className="text-green-600" size={32} />
          </div>
          <h2 className="text-2xl font-black text-gray-900 mb-2">Merci !</h2>
          <p className="text-sm text-gray-500 mb-8">Votre retour nous aide à améliorer nos plats.</p>
          <button
            onClick={() => { setSuccess(false); setRating(0); setComment(''); setDishId(''); }}
            className="text-sm font-bold underline"
            style={{ color: '#1a3d2b' }}
          >
            Donner un autre avis
          </button>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout title="Mon avis">
      <div className="bg-white px-4 pt-5 pb-5">
        <h1 className="text-2xl font-black text-gray-900 leading-tight">Notez un plat</h1>
        <p className="text-sm text-gray-500 mt-1">Partagez votre expérience avec la communauté.</p>
      </div>

      <form onSubmit={handleSubmit}>
        {/* Plat */}
        <div className="bg-white mt-2 px-4 py-5">
          <p className="text-xs font-black text-gray-400 uppercase tracking-widest mb-3">Quel plat ?</p>
          {purchasesLoading ? (
            <p className="text-sm text-gray-400">Chargement de vos plats…</p>
          ) : (
            <select
              value={dishId}
              onChange={(e) => setDishId(e.target.value)}
              className="w-full py-3 px-3 rounded-xl text-sm text-gray-800 focus:outline-none"
              style={{ background: '#f2f2f2', border: 'none' }}
            >
              <option value="">Sélectionner un plat…</option>
              {purchases.map((p) => (
                <option key={p.dishId} value={p.dishId}>
                  {p.dishName}{p.hasReview ? ' ✓' : ''}
                </option>
              ))}
            </select>
          )}
          {dishId && purchases.find((p) => p.dishId === dishId)?.hasReview && (
            <p className="text-xs text-amber-500 mt-2 font-medium">
              Vous avez déjà noté ce plat — votre avis sera mis à jour.
            </p>
          )}
        </div>

        {/* Note */}
        <div className="bg-white mt-2 px-4 py-5">
          <p className="text-xs font-black text-gray-400 uppercase tracking-widest mb-3">Votre note</p>
          <StarRating value={rating} onChange={setRating} />
          {rating > 0 && (
            <p className="text-sm font-bold text-amber-500 mt-2">{LABELS[rating]}</p>
          )}
        </div>

        {/* Commentaire */}
        <div className="bg-white mt-2 px-4 py-5">
          <p className="text-xs font-black text-gray-400 uppercase tracking-widest mb-3">
            Commentaire <span className="normal-case font-normal text-gray-300">(optionnel)</span>
          </p>
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            maxLength={500}
            rows={3}
            placeholder="Partagez votre expérience…"
            className="w-full rounded-xl px-3 py-3 text-sm text-gray-800 focus:outline-none resize-none"
            style={{ background: '#f2f2f2', border: 'none' }}
          />
          <p className="text-xs text-gray-400 text-right mt-1">{comment.length}/500</p>
        </div>

        {/* Floating submit */}
        <div
          className="sticky bottom-0 z-10 px-4 pt-10 pb-5"
          style={{ background: 'linear-gradient(to bottom, transparent, #f4f4f4 45%)' }}
        >
          {error && (
            <p className="text-sm font-medium text-red-600 bg-red-50 rounded-xl px-4 py-3 mb-3">{error}</p>
          )}
          <button
            type="submit"
            disabled={loading}
            className="w-full text-white font-black rounded-2xl py-4 text-sm disabled:opacity-50"
            style={{ background: '#1a3d2b', boxShadow: '0 6px 20px rgba(26,61,43,0.35)' }}
          >
            {loading ? 'Envoi…' : 'Envoyer mon avis'}
          </button>
        </div>
      </form>
    </AppLayout>
  );
}

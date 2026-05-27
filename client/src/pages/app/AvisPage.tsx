import { useState, useEffect, type FormEvent } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Star, CheckCircle, Lock, ShoppingBag, ChevronDown } from 'lucide-react';
import { AppLayout } from '../../components/app/AppLayout';
import { userApi } from '../../services/api';
import { useUserAuth } from '../../context/UserAuthContext';
import { useLang } from '../../context/LanguageContext';

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
                color: active ? 'var(--yellow)' : 'var(--line)',
                fill: active ? 'var(--yellow)' : 'transparent',
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
  const { t } = useLang();

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
    if (!dishId) { setError(t('error_select_dish')); return; }
    if (rating === 0) { setError(t('error_select_rating')); return; }
    setLoading(true);
    try {
      await userApi.post('/public/reviews', { dish_id: dishId, rating, comment: comment || undefined });
      setSuccess(true);
    } catch (err: unknown) {
      const status = (err as { response?: { status?: number } })?.response?.status;
      if (status === 403) setError(t('error_generic'));
      else setError(t('error_generic'));
    } finally {
      setLoading(false);
    }
  }

  if (authLoading) {
    return (
      <AppLayout title={t('my_review')}>
        <div className="flex items-center justify-center h-40 text-sm" style={{ color: 'var(--ink-faint)' }}>
          {t('loading')}
        </div>
      </AppLayout>
    );
  }

  if (!subscriber) {
    return (
      <AppLayout title={t('my_review')}>
        <div className="flex flex-col items-center justify-center px-6 pt-20 text-center fade-up">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-6" style={{ background: 'var(--green-soft)' }}>
            <Lock size={22} style={{ color: 'var(--green)' }} />
          </div>
          <p className="text-[10px] uppercase tracking-[0.05em] mb-3" style={{ color: 'var(--green)', fontWeight: 700 }}>
            {t('reserved_for_customers')}
          </p>
          <h2 className="text-titre mb-4" style={{ color: 'var(--ink)' }}>
            {t('sign_in_title')}
          </h2>
          <p className="text-texte mb-10 max-w-xs" style={{ color: 'var(--ink-soft)' }}>
            {t('sign_in_to_review')}
          </p>
          <button
            onClick={() => navigate('/app/login?next=/app/avis')}
            className="text-cta px-10 py-4 rounded-full transition-all hover:scale-[0.98]"
            style={{ background: 'var(--green)', color: '#ffffff', fontWeight: 700, boxShadow: '0 8px 24px rgba(49,153,102,0.28)' }}
          >
            {t('sign_in')}
          </button>
        </div>
      </AppLayout>
    );
  }

  if (!purchasesLoading && purchases.length === 0) {
    return (
      <AppLayout title={t('my_review')}>
        <div className="flex flex-col items-center justify-center px-6 pt-20 text-center fade-up">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-6" style={{ background: 'var(--peach-soft)' }}>
            <ShoppingBag size={22} style={{ color: '#c47b30' }} />
          </div>
          <h2 className="text-titre mb-4" style={{ color: 'var(--ink)' }}>
            {t('no_purchases')}
          </h2>
          <p className="text-texte max-w-xs" style={{ color: 'var(--ink-soft)' }}>
            {t('no_purchases_desc')}
          </p>
        </div>
      </AppLayout>
    );
  }

  if (success) {
    return (
      <AppLayout title={t('my_review')}>
        <div className="flex flex-col items-center justify-center px-6 pt-24 text-center fade-up">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-6" style={{ background: 'var(--green-soft)' }}>
            <CheckCircle size={28} style={{ color: 'var(--green)' }} />
          </div>
          <p className="text-[10px] uppercase tracking-[0.05em] mb-3" style={{ color: 'var(--green)', fontWeight: 700 }}>
            {t('review_saved')}
          </p>
          <h2 className="text-titre-gros mb-4" style={{ color: 'var(--ink)' }}>
            {t('thank_you')}
          </h2>
          <p className="text-texte mb-10" style={{ color: 'var(--ink-soft)' }}>
            {t('review_thanks_desc')}
          </p>
          <button
            onClick={() => { setSuccess(false); setRating(0); setComment(''); setDishId(''); }}
            className="text-[13px] underline"
            style={{ color: 'var(--green)', fontWeight: 700 }}
          >
            {t('give_another_review')}
          </button>
        </div>
      </AppLayout>
    );
  }

  const currentPurchase = purchases.find((p) => p.dishId === dishId);
  const LABELS: Record<number, string> = {
    1: t('rating_1'), 2: t('rating_2'), 3: t('rating_3'), 4: t('rating_4'), 5: t('rating_5'),
  };

  return (
    <AppLayout title={t('my_review')}>
      <div className="px-6 pt-8 pb-4 fade-up">
        <p className="text-[10px] uppercase tracking-[0.05em] mb-3" style={{ color: 'var(--green)', fontWeight: 700 }}>
          {t('your_experience')}
        </p>
        <h1 className="text-titre-gros mb-3" style={{ color: 'var(--ink)' }}>
          {t('rate_a_dish')}
        </h1>
        <p className="text-texte" style={{ color: 'var(--ink-soft)' }}>
          {t('share_your_experience')}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="px-6 pb-6 space-y-6">
        <section>
          <label className="text-[11px] uppercase tracking-[0.05em] block mb-3" style={{ color: 'var(--ink-faint)', fontWeight: 700 }}>
            {t('which_dish')}
          </label>
          {purchasesLoading ? (
            <p className="text-[13px]" style={{ color: 'var(--ink-faint)' }}>{t('loading')}</p>
          ) : (
            <div className="relative">
              <select
                value={dishId}
                onChange={(e) => setDishId(e.target.value)}
                className="w-full py-4 px-5 pr-12 rounded-2xl text-[14px] focus:outline-none appearance-none"
                style={{ background: '#ffffff', border: '1px solid var(--line)', color: 'var(--ink)', fontWeight: 500 }}
              >
                <option value="">{t('select_dish')}</option>
                {purchases.map((p) => (
                  <option key={p.dishId} value={p.dishId}>
                    {p.dishName}{p.hasReview ? ` ${t('already_reviewed')}` : ''}
                  </option>
                ))}
              </select>
              <ChevronDown size={16} style={{ position: 'absolute', right: 18, top: '50%', transform: 'translateY(-50%)', color: 'var(--ink-faint)', pointerEvents: 'none' }} />
            </div>
          )}
          {currentPurchase?.hasReview && (
            <p className="text-[12px] mt-3" style={{ color: '#a17600', fontWeight: 600 }}>
              {t('will_update_review')}
            </p>
          )}
        </section>

        <section>
          <label className="text-[11px] uppercase tracking-[0.05em] block mb-4" style={{ color: 'var(--ink-faint)', fontWeight: 700 }}>
            {t('your_rating')}
          </label>
          <StarRating value={rating} onChange={setRating} />
          {rating > 0 && (
            <p className="mt-4 text-[18px]" style={{ color: 'var(--ink)', fontWeight: 800 }}>
              {LABELS[rating]}
            </p>
          )}
        </section>

        <section>
          <label className="text-[11px] uppercase tracking-[0.05em] block mb-3" style={{ color: 'var(--ink-faint)', fontWeight: 700 }}>
            {t('comment_optional')}
          </label>
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            maxLength={500}
            rows={4}
            placeholder={t('share_experience_placeholder')}
            className="w-full rounded-2xl px-5 py-4 text-[14px] focus:outline-none resize-none"
            style={{ background: '#ffffff', border: '1px solid var(--line)', color: 'var(--ink)', fontFamily: 'inherit' }}
          />
          <p className="text-[11px] text-right mt-2" style={{ color: 'var(--ink-faint)' }}>
            {comment.length}/500
          </p>
        </section>

        <div className="sticky bottom-0 z-10 -mx-6 px-6 pt-10 pb-5" style={{ background: 'linear-gradient(to bottom, transparent, var(--cream) 45%)' }}>
          {error && (
            <p className="text-[13px] rounded-xl px-4 py-3 mb-3" style={{ background: '#fef2f2', color: '#b91c1c', border: '1px solid #fee2e2' }}>
              {error}
            </p>
          )}
          <button
            type="submit"
            disabled={loading}
            className="text-cta w-full rounded-full py-4 disabled:opacity-50 transition-all hover:scale-[0.99]"
            style={{ background: 'var(--green)', color: '#ffffff', fontWeight: 700, boxShadow: '0 8px 24px rgba(49,153,102,0.28)' }}
          >
            {loading ? t('sending') : t('send_review')}
          </button>
        </div>
      </form>
    </AppLayout>
  );
}

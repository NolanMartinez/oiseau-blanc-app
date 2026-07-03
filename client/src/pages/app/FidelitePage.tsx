import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Gift, Lock, Ticket, Sparkles } from 'lucide-react';
import { AppLayout } from '../../components/app/AppLayout';
import { userApi } from '../../services/api';
import { useUserAuth } from '../../context/UserAuthContext';
import { useLang } from '../../context/LanguageContext';

export function FidelitePage() {
  const { subscriber, isLoading, updateSubscriber } = useUserAuth();
  const navigate = useNavigate();
  const { t } = useLang();
  const [refreshing, setRefreshing] = useState(false);

  // Rafraîchit les points (ils évoluent à chaque achat à la borne).
  useEffect(() => {
    if (!subscriber) return;
    setRefreshing(true);
    userApi.get('/public/user/auth/me')
      .then((res) => updateSubscriber({
        loyaltyCode: res.data.subscriber.loyaltyCode,
        loyalty: res.data.subscriber.loyalty,
      }))
      .catch(() => {})
      .finally(() => setRefreshing(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (isLoading) {
    return (
      <AppLayout title={t('nav_loyalty')}>
        <div className="flex items-center justify-center h-40 text-sm" style={{ color: 'var(--ink-faint)' }}>
          {t('loading')}
        </div>
      </AppLayout>
    );
  }

  // Non connecté → invite à se connecter (le code est lié au compte).
  if (!subscriber) {
    return (
      <AppLayout title={t('nav_loyalty')}>
        <div className="flex flex-col items-center justify-center px-6 pt-20 text-center fade-up">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-6" style={{ background: 'var(--green-soft)' }}>
            <Lock size={22} style={{ color: 'var(--green)' }} />
          </div>
          <h2 className="text-titre mb-4" style={{ color: 'var(--ink)' }}>{t('sign_in_title')}</h2>
          <p className="text-texte mb-10 max-w-xs" style={{ color: 'var(--ink-soft)' }}>{t('loyalty_sign_in')}</p>
          <button
            onClick={() => navigate('/app/login?next=/app/fidelite')}
            className="text-cta px-10 py-4 rounded-full transition-all hover:scale-[0.98]"
            style={{ background: 'var(--green)', color: '#ffffff', fontWeight: 700, boxShadow: '0 8px 24px rgba(49,153,102,0.28)' }}
          >
            {t('sign_in')}
          </button>
        </div>
      </AppLayout>
    );
  }

  const points = subscriber.loyalty?.points ?? 0;
  const reward = subscriber.loyalty?.pointsReward ?? 100;
  const pct = Math.min(100, Math.round((points / reward) * 100));
  const remaining = Math.max(0, reward - points);
  const ready = points >= reward;

  return (
    <AppLayout title={t('nav_loyalty')}>
      <div className="px-6 py-6 space-y-5 fade-up">
        {/* Carte principale : code + progression */}
        <div
          className="rounded-3xl p-6 text-white"
          style={{ background: 'linear-gradient(135deg, var(--green) 0%, #2a7d54 100%)' }}
        >
          <div className="flex items-center gap-2 mb-4">
            <Gift size={20} />
            <p style={{ fontSize: 15, fontWeight: 800 }}>{t('loyalty_card')}</p>
          </div>

          {/* Code fidélité */}
          <p style={{ fontSize: 12, opacity: 0.85 }}>{t('loyalty_your_code')}</p>
          <p style={{ fontSize: 44, fontWeight: 800, letterSpacing: '0.18em', lineHeight: 1.2 }}>
            {subscriber.loyaltyCode ?? '·····'}
          </p>

          {/* Prochain avantage */}
          <div className="mt-5">
            <div className="flex items-center justify-between" style={{ fontSize: 13, fontWeight: 600 }}>
              <span>{points} {t('loyalty_points_word')}</span>
              <span style={{ opacity: 0.9 }}>{ready ? '🎁' : `${points} / ${reward}`}</span>
            </div>
            <div style={{ marginTop: 6, height: 10, borderRadius: 999, background: 'rgba(255,255,255,0.25)' }}>
              <div style={{ width: `${pct}%`, height: '100%', borderRadius: 999, background: '#ffffff', transition: 'width .3s' }} />
            </div>
            <p style={{ fontSize: 13, fontWeight: 700, marginTop: 10 }}>
              {ready ? t('loyalty_reward_ready') : t('loyalty_next_reward').replace('{{count}}', String(remaining))}
            </p>
          </div>
        </div>

        {/* Repas offert disponible */}
        {ready && (
          <div
            className="rounded-2xl p-4 flex items-center gap-3"
            style={{ background: 'var(--green-soft)', border: '1px solid var(--green)' }}
          >
            <Ticket size={20} style={{ color: 'var(--green)' }} />
            <p className="text-[13px]" style={{ color: 'var(--ink)', fontWeight: 600 }}>
              {t('loyalty_redeem_hint')}
            </p>
          </div>
        )}

        {/* Comment ça marche */}
        <div className="rounded-2xl p-5" style={{ background: '#ffffff', border: '1px solid var(--line)' }}>
          <div className="flex items-center gap-2 mb-3">
            <Sparkles size={16} style={{ color: 'var(--green)' }} />
            <p className="text-[14px]" style={{ color: 'var(--ink)', fontWeight: 700 }}>{t('loyalty_how_title')}</p>
          </div>
          <p className="text-[13px] leading-relaxed" style={{ color: 'var(--ink-soft)' }}>
            {t('loyalty_how_text')}
          </p>
        </div>

        {refreshing && (
          <p className="text-center text-[11px]" style={{ color: 'var(--ink-faint)' }}>{t('loading')}</p>
        )}
      </div>
    </AppLayout>
  );
}

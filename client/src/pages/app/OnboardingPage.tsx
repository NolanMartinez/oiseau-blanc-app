import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Refrigerator, ChevronRight, Bell, Check } from 'lucide-react';
import api, { userApi } from '../../services/api';
import { useUserAuth } from '../../context/UserAuthContext';
import { FriggoWordmark } from '../../components/app/AppLayout';
import { usePushNotifications } from '../../hooks/usePushNotifications';

interface Fridge {
  id: string;
  name: string;
  location: string;
  online: boolean;
  dishes: { stock: number }[];
}

type Step = 'frigo' | 'notifs' | 'done';

export function OnboardingPage() {
  const { subscriber, updateSubscriber } = useUserAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>('frigo');
  const [fridges, setFridges] = useState<Fridge[]>([]);
  const [loadingFridges, setLoadingFridges] = useState(true);
  const [saving, setSaving] = useState(false);
  const { status: pushStatus, subscribe: subscribePush } = usePushNotifications(!!subscriber);

  useEffect(() => {
    api.get('/public/frigos')
      .then((res) => setFridges(res.data.fridges))
      .catch(() => {})
      .finally(() => setLoadingFridges(false));
  }, []);

  async function handleChooseFrigo(frigoId: string) {
    setSaving(true);
    try {
      await userApi.patch('/public/user/auth/frigo-favori', { frigoId });
      updateSubscriber({ favoriId: frigoId });
      setStep('notifs');
    } catch {}
    setSaving(false);
  }

  async function handleNotifs(enable: boolean) {
    if (enable) {
      try {
        if (pushStatus !== 'unsupported' && pushStatus !== 'denied') {
          await subscribePush();
        }
        await userApi.patch('/public/user/me', { consentEmail: true });
        updateSubscriber({ consentEmail: true, consentPush: true });
      } catch {}
    }
    setStep('done');
    setTimeout(() => navigate('/app/mon-frigo', { replace: true }), 1400);
  }

  const safeTop: React.CSSProperties = {
    paddingTop: 'max(env(safe-area-inset-top, 0px), 24px)',
  };

  if (step === 'done') {
    return (
      <div
        className="min-h-screen flex flex-col items-center justify-center px-8 text-center fade-up"
        style={{ background: 'var(--cream)' }}
      >
        <div
          className="w-16 h-16 rounded-full flex items-center justify-center mb-6"
          style={{ background: 'var(--green)' }}
        >
          <Check size={28} color="#fff" strokeWidth={2.5} />
        </div>
        <FriggoWordmark size={28} />
        <h1 className="text-titre-gros mt-4 mb-3" style={{ color: 'var(--ink)' }}>Tout est prêt !</h1>
        <p className="text-texte" style={{ color: 'var(--ink-soft)' }}>Bienvenue chez Friggo.</p>
      </div>
    );
  }

  if (step === 'notifs') {
    return (
      <div
        className="min-h-screen flex flex-col px-6 fade-up"
        style={{ background: 'var(--cream)', ...safeTop }}
      >
        <div className="pb-10 flex-1 flex flex-col">
          <div className="flex gap-1.5 mb-8">
            <div className="h-1 flex-1 rounded-full" style={{ background: 'var(--green)' }} />
            <div className="h-1 flex-1 rounded-full" style={{ background: 'var(--green)' }} />
          </div>

          <FriggoWordmark size={20} />

          <div className="mt-8 flex-1 flex flex-col">
            <div
              className="w-14 h-14 rounded-2xl flex items-center justify-center mb-6"
              style={{ background: 'var(--green)' }}
            >
              <Bell size={24} color="#fff" strokeWidth={1.8} />
            </div>
            <h1 className="text-titre-gros mb-3" style={{ color: 'var(--ink)' }}>
              Restez<br />informé
            </h1>
            <p className="text-texte mb-10" style={{ color: 'var(--ink-soft)', maxWidth: '30ch' }}>
              Recevez une notification dès qu'un nouveau plat est disponible dans votre frigo favori.
            </p>
            <div className="mt-auto space-y-3">
              <button
                onClick={() => handleNotifs(true)}
                className="w-full rounded-full py-4 flex items-center justify-center gap-2 transition-all hover:scale-[0.99]"
                style={{
                  background: 'var(--green)',
                  color: '#ffffff',
                  fontWeight: 700,
                  boxShadow: '0 8px 24px rgba(49,153,102,0.28)',
                }}
              >
                <Bell size={16} />
                Activer les notifications
              </button>
              <button
                onClick={() => handleNotifs(false)}
                className="w-full text-[13px] text-center py-3"
                style={{ color: 'var(--ink-faint)', fontWeight: 500 }}
              >
                Passer pour l'instant
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen flex flex-col px-6 fade-up"
      style={{ background: 'var(--cream)', ...safeTop }}
    >
      <div className="pb-10">
        <div className="flex gap-1.5 mb-8">
          <div className="h-1 flex-1 rounded-full" style={{ background: 'var(--green)' }} />
          <div className="h-1 flex-1 rounded-full" style={{ background: 'var(--line)' }} />
        </div>

        <FriggoWordmark size={20} />

        <div className="mt-8">
          <h1 className="text-titre-gros mb-2" style={{ color: 'var(--ink)' }}>
            Choisissez<br />votre frigo
          </h1>
          <p className="text-texte mb-8" style={{ color: 'var(--ink-soft)', maxWidth: '30ch' }}>
            Votre frigo favori sera votre point de départ à chaque connexion.
          </p>

          {loadingFridges ? (
            <p className="text-sm text-center py-10" style={{ color: 'var(--ink-faint)' }}>
              Chargement…
            </p>
          ) : (
            <div className="space-y-3">
              {fridges.map((f) => {
                const available = f.dishes.filter((d) => d.stock > 0).length;
                return (
                  <button
                    key={f.id}
                    onClick={() => !saving && handleChooseFrigo(f.id)}
                    disabled={saving}
                    className="w-full rounded-3xl p-5 text-left transition-all hover:scale-[0.99] flex items-center gap-4 disabled:opacity-60"
                    style={{ background: '#ffffff', border: '1px solid var(--line)' }}
                  >
                    <div
                      className="w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0"
                      style={{ background: f.online ? 'var(--green)' : '#e5e5e5' }}
                    >
                      <Refrigerator size={18} color={f.online ? '#ffffff' : '#999'} strokeWidth={1.8} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[15px] font-bold truncate" style={{ color: 'var(--ink)' }}>
                        {f.name}
                      </p>
                      <p className="text-[12px] truncate mt-0.5" style={{ color: 'var(--ink-faint)' }}>
                        {f.location}
                      </p>
                      <p
                        className="text-[11px] mt-1 font-semibold"
                        style={{ color: f.online ? 'var(--green)' : '#bbb' }}
                      >
                        {f.online
                          ? `${available} plat${available !== 1 ? 's' : ''} disponible${available !== 1 ? 's' : ''}`
                          : 'Hors ligne'}
                      </p>
                    </div>
                    <ChevronRight size={16} style={{ color: 'var(--ink-faint)', flexShrink: 0 }} />
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

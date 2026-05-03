import { useState, useEffect } from 'react';
import { Lock, LogOut, Mail, Phone, Bell, Check } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { AppLayout } from '../../components/app/AppLayout';
import { userApi } from '../../services/api';
import { useUserAuth } from '../../context/UserAuthContext';

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className="relative flex-shrink-0 transition-all"
      style={{
        width: 46,
        height: 28,
        borderRadius: 999,
        background: checked ? 'var(--green)' : 'var(--line)',
        border: 'none',
      }}
      aria-pressed={checked}
    >
      <div
        className="absolute top-1 transition-all"
        style={{
          left: checked ? 21 : 3,
          width: 22,
          height: 22,
          borderRadius: '50%',
          background: '#ffffff',
          boxShadow: '0 2px 6px rgba(0,0,0,0.15)',
        }}
      />
    </button>
  );
}

export function ProfilPage() {
  const { subscriber, isLoading: authLoading, logout } = useUserAuth();
  const navigate = useNavigate();

  const [consentEmail, setConsentEmail] = useState(false);
  const [consentPush, setConsentPush] = useState(false);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!subscriber) return;
    setConsentEmail(subscriber.consentEmail ?? false);
    setConsentPush(subscriber.consentPush ?? false);
  }, [subscriber]);

  async function handleSave() {
    setError('');
    setSaved(false);
    setLoading(true);
    try {
      await userApi.patch('/public/user/auth/me', { consentEmail, consentPush });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch {
      setError('Une erreur est survenue. Veuillez réessayer.');
    } finally {
      setLoading(false);
    }
  }

  if (authLoading) {
    return (
      <AppLayout title="Mon profil">
        <div className="flex items-center justify-center h-40 text-sm" style={{ color: 'var(--ink-faint)' }}>
          Chargement…
        </div>
      </AppLayout>
    );
  }

  if (!subscriber) {
    return (
      <AppLayout title="Mon profil">
        <div className="flex flex-col items-center justify-center px-6 pt-20 text-center fade-up">
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center mb-6"
            style={{ background: 'var(--green-soft)' }}
          >
            <Lock size={22} style={{ color: 'var(--green)' }} />
          </div>
          <h2 className="text-titre mb-4" style={{ color: 'var(--ink)' }}>
            Identifiez-vous
          </h2>
          <p className="text-texte mb-10 max-w-xs" style={{ color: 'var(--ink-soft)' }}>
            Connectez-vous pour accéder à votre profil et vos préférences.
          </p>
          <button
            onClick={() => navigate('/app/login?next=/app/profil')}
            className="text-cta px-10 py-4 rounded-full transition-all hover:scale-[0.98]"
            style={{
              background: 'var(--green)',
              color: '#ffffff',
              fontWeight: 700,
              boxShadow: '0 8px 24px rgba(49,153,102,0.28)',
            }}
          >
            Se connecter
          </button>
        </div>
      </AppLayout>
    );
  }

  const initial = (subscriber.email ?? subscriber.phone ?? '?').charAt(0).toUpperCase();

  return (
    <AppLayout title="Mon profil">
      {/* Hero avatar + identifiant */}
      <div className="px-6 pt-10 pb-8 flex flex-col items-center text-center fade-up">
        <div
          className="w-20 h-20 rounded-3xl flex items-center justify-center mb-4"
          style={{
            background: 'var(--green)',
            color: '#ffffff',
          }}
        >
          <span
            className="text-[30px]"
            style={{ fontWeight: 800 }}
          >
            {initial}
          </span>
        </div>
        <p
          className="text-[10px] uppercase tracking-[0.05em] mb-2"
          style={{ color: 'var(--green)', fontWeight: 700 }}
        >
          Membre
        </p>
        <p
          className="text-[20px]"
          style={{ color: 'var(--ink)', fontWeight: 800 }}
        >
          {subscriber.email ?? subscriber.phone}
        </p>
        <div className="flex items-center gap-1.5 mt-1 text-[12px]" style={{ color: 'var(--ink-faint)' }}>
          {subscriber.email ? <Mail size={11} /> : <Phone size={11} />}
          <span>Identifiant de connexion</span>
        </div>
      </div>

      {/* Séparateur */}
      <div className="px-6 mb-4 flex items-center gap-3">
        <div className="flex-1 h-px" style={{ background: 'var(--line)' }} />
        <span
          className="text-[10px] uppercase tracking-[0.05em]"
          style={{ color: 'var(--ink-faint)', fontWeight: 700 }}
        >
          Préférences
        </span>
        <div className="flex-1 h-px" style={{ background: 'var(--line)' }} />
      </div>

      {/* Notifications */}
      <div className="px-6 space-y-3">
        <div
          className="rounded-2xl p-5 flex items-center gap-4"
          style={{ background: '#ffffff', border: '1px solid var(--line)' }}
        >
          <div
            className="w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0"
            style={{ background: 'var(--blue-soft)' }}
          >
            <Mail size={16} style={{ color: '#2a93c7' }} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[14px]" style={{ color: 'var(--ink)', fontWeight: 700 }}>
              Notifications par email
            </p>
            <p className="text-[11px] mt-0.5" style={{ color: 'var(--ink-faint)' }}>
              Menus du jour, nouveautés
            </p>
          </div>
          <Toggle checked={consentEmail} onChange={setConsentEmail} />
        </div>

        <div
          className="rounded-2xl p-5 flex items-center gap-4"
          style={{ background: '#ffffff', border: '1px solid var(--line)' }}
        >
          <div
            className="w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0"
            style={{ background: 'var(--green-soft)' }}
          >
            <Bell size={16} style={{ color: 'var(--green)' }} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[14px]" style={{ color: 'var(--ink)', fontWeight: 700 }}>
              Notifications push
            </p>
            <p className="text-[11px] mt-0.5" style={{ color: 'var(--ink-faint)' }}>
              Alertes en temps réel
            </p>
          </div>
          <Toggle checked={consentPush} onChange={setConsentPush} />
        </div>
      </div>

      {/* Déconnexion */}
      <div className="px-6 mt-6">
        <button
          onClick={() => { logout(); navigate('/app/carte'); }}
          className="w-full rounded-2xl p-5 flex items-center gap-4 transition-all hover:scale-[0.99]"
          style={{ background: '#ffffff', border: '1px solid var(--line)' }}
        >
          <div
            className="w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0"
            style={{ background: '#fdf1ef' }}
          >
            <LogOut size={16} style={{ color: '#c53838' }} />
          </div>
          <p className="text-[14px] text-left flex-1" style={{ color: '#c53838', fontWeight: 700 }}>
            Se déconnecter
          </p>
        </button>
      </div>

      {/* Save button */}
      <div
        className="sticky bottom-0 z-10 px-6 pt-10 pb-6 mt-6"
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
        {saved && (
          <div
            className="text-[13px] rounded-xl px-4 py-3 mb-3 flex items-center gap-2 justify-center"
            style={{ background: 'var(--green-soft)', color: 'var(--green)', fontWeight: 700 }}
          >
            <Check size={14} /> Préférences enregistrées
          </div>
        )}
        <button
          onClick={handleSave}
          disabled={loading}
          className="text-cta w-full rounded-full py-4 disabled:opacity-50 transition-all hover:scale-[0.99]"
          style={{
            background: 'var(--green)',
            color: '#ffffff',
            fontWeight: 700,
            boxShadow: '0 8px 24px rgba(49,153,102,0.28)',
          }}
        >
          {loading ? 'Enregistrement…' : 'Enregistrer'}
        </button>
      </div>
    </AppLayout>
  );
}

import { useState, useEffect } from 'react';
import { Lock, LogOut, Mail, Phone } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { AppLayout } from '../../components/app/AppLayout';
import { userApi } from '../../services/api';
import { useUserAuth } from '../../context/UserAuthContext';

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
        <div className="flex items-center justify-center h-40 text-sm text-gray-400">Chargement…</div>
      </AppLayout>
    );
  }

  if (!subscriber) {
    return (
      <AppLayout title="Mon profil">
        <div className="bg-white px-4 pt-5 pb-5">
          <h1 className="text-2xl font-black text-gray-900 leading-tight">Mon profil</h1>
        </div>
        <div className="flex flex-col items-center justify-center px-6 pt-12 text-center">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-5">
            <Lock size={26} className="text-gray-400" />
          </div>
          <h2 className="text-xl font-black text-gray-900 mb-2">Identifiez-vous</h2>
          <p className="text-sm text-gray-500 mb-8 max-w-xs">
            Connectez-vous pour accéder à votre profil et vos préférences.
          </p>
          <button
            onClick={() => navigate('/app/login?next=/app/profil')}
            className="px-8 py-3.5 text-white font-black rounded-2xl text-sm"
            style={{ background: '#1a3d2b', boxShadow: '0 6px 20px rgba(26,61,43,0.35)' }}
          >
            Se connecter
          </button>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout title="Mon profil">
      <div className="bg-white px-4 pt-5 pb-5">
        <h1 className="text-2xl font-black text-gray-900 leading-tight">Mon profil</h1>
      </div>

      {/* Identifiant */}
      <div className="bg-white mt-2 px-4 py-5">
        <p className="text-xs font-black text-gray-400 uppercase tracking-widest mb-3">Mon compte</p>
        <div className="flex items-center gap-3 py-2">
          <div className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: '#e8f0ea' }}>
            {subscriber.email ? (
              <Mail size={16} style={{ color: '#1a3d2b' }} />
            ) : (
              <Phone size={16} style={{ color: '#1a3d2b' }} />
            )}
          </div>
          <div>
            <p className="text-sm font-bold text-gray-900">{subscriber.email ?? subscriber.phone}</p>
            <p className="text-xs text-gray-400">Votre identifiant de connexion</p>
          </div>
        </div>
      </div>

      {/* Préférences notifications */}
      <div className="bg-white mt-2 px-4 py-5">
        <p className="text-xs font-black text-gray-400 uppercase tracking-widest mb-4">Notifications</p>

        <label className="flex items-start gap-4 cursor-pointer py-1" onClick={() => setConsentEmail((v) => !v)}>
          <div
            className="w-5 h-5 rounded flex items-center justify-center flex-shrink-0 mt-0.5 transition-all"
            style={{ background: consentEmail ? '#1a3d2b' : '#e5e7eb' }}
          >
            {consentEmail && (
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                <path d="M2 6l3 3 5-5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            )}
          </div>
          <div>
            <p className="text-sm font-bold text-gray-900">Notifications par email</p>
            <p className="text-xs text-gray-400 mt-0.5">Menus du jour, nouveautés, promotions</p>
          </div>
        </label>

        <div className="my-3" style={{ borderTop: '1px solid #f4f4f4' }} />

        <label className="flex items-start gap-4 cursor-pointer py-1" onClick={() => setConsentPush((v) => !v)}>
          <div
            className="w-5 h-5 rounded flex items-center justify-center flex-shrink-0 mt-0.5 transition-all"
            style={{ background: consentPush ? '#1a3d2b' : '#e5e7eb' }}
          >
            {consentPush && (
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                <path d="M2 6l3 3 5-5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            )}
          </div>
          <div>
            <p className="text-sm font-bold text-gray-900">Notifications push</p>
            <p className="text-xs text-gray-400 mt-0.5">Alertes en temps réel sur votre navigateur</p>
          </div>
        </label>
      </div>

      {/* Déconnexion */}
      <div className="bg-white mt-2 px-4 py-2">
        <button
          onClick={() => { logout(); navigate('/app/carte'); }}
          className="flex items-center gap-3 w-full py-3 text-left"
        >
          <div className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 bg-red-50">
            <LogOut size={16} className="text-red-400" />
          </div>
          <p className="text-sm font-bold text-red-400">Se déconnecter</p>
        </button>
      </div>

      {/* Floating save */}
      <div
        className="sticky bottom-0 z-10 px-4 pt-10 pb-5"
        style={{ background: 'linear-gradient(to bottom, transparent, #f4f4f4 45%)' }}
      >
        {error && (
          <p className="text-sm font-medium text-red-600 bg-red-50 rounded-xl px-4 py-3 mb-3">{error}</p>
        )}
        {saved && (
          <p className="text-sm font-medium text-green-700 bg-green-50 rounded-xl px-4 py-3 mb-3 text-center">
            Préférences enregistrées
          </p>
        )}
        <button
          onClick={handleSave}
          disabled={loading}
          className="w-full text-white font-black rounded-2xl py-4 text-sm disabled:opacity-50"
          style={{ background: '#1a3d2b', boxShadow: '0 6px 20px rgba(26,61,43,0.35)' }}
        >
          {loading ? 'Enregistrement…' : 'Enregistrer'}
        </button>
      </div>
    </AppLayout>
  );
}

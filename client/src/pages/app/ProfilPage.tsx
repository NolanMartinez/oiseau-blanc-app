import { useState, FormEvent } from 'react';
import { CheckCircle } from 'lucide-react';
import { AppLayout } from '../../components/app/AppLayout';
import api from '../../services/api';

export function ProfilPage() {
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [consentEmail, setConsentEmail] = useState(false);
  const [consentPush, setConsentPush] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    if (!email && !phone) { setError('Veuillez renseigner au moins un email ou un numéro de téléphone.'); return; }
    if (!consentEmail && !consentPush) { setError('Veuillez accepter au moins un type de notification.'); return; }
    setLoading(true);
    try {
      await api.post('/public/subscribe', {
        email: email || undefined,
        phone: phone || undefined,
        consent_email: consentEmail,
        consent_push: consentPush,
      });
      setSuccess(true);
    } catch {
      setError('Une erreur est survenue. Veuillez réessayer.');
    } finally {
      setLoading(false);
    }
  }

  if (success) {
    return (
      <AppLayout title="Mon profil">
        <div className="flex flex-col items-center justify-center px-6 pt-20 text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-5">
            <CheckCircle className="text-green-600" size={32} />
          </div>
          <h2 className="text-2xl font-black text-gray-900 mb-2">Inscription confirmée !</h2>
          <p className="text-sm text-gray-500">
            Vous recevrez les actualités des frigos L'Oiseau Blanc.
          </p>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout title="Mon profil">
      {/* Page header */}
      <div className="bg-white px-4 pt-5 pb-5">
        <h1 className="text-2xl font-black text-gray-900 leading-tight">Notifications</h1>
        <p className="text-sm text-gray-500 mt-1">
          Recevez les menus du jour, nouveautés et promotions.
        </p>
      </div>

      <form onSubmit={handleSubmit}>
        {/* Coordonnées */}
        <div className="bg-white mt-2 px-4 py-5">
          <p className="text-xs font-black text-gray-400 uppercase tracking-widest mb-1">Vos coordonnées</p>
          <p className="text-xs text-gray-400 mb-3">Email ou téléphone requis</p>
          <div className="space-y-2">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="votre@email.fr"
              className="w-full py-3 px-4 rounded-xl text-sm text-gray-800 focus:outline-none"
              style={{ background: '#f2f2f2', border: 'none' }}
            />
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="06 00 00 00 00"
              className="w-full py-3 px-4 rounded-xl text-sm text-gray-800 focus:outline-none"
              style={{ background: '#f2f2f2', border: 'none' }}
            />
          </div>
        </div>

        {/* Consentements */}
        <div className="bg-white mt-2 px-4 py-5">
          <p className="text-xs font-black text-gray-400 uppercase tracking-widest mb-4">Je souhaite recevoir</p>
          <label className="flex items-start gap-4 cursor-pointer py-1">
            <div
              className="w-5 h-5 rounded flex items-center justify-center flex-shrink-0 mt-0.5 transition-all"
              style={{ background: consentEmail ? '#1a3d2b' : '#e5e7eb' }}
              onClick={() => setConsentEmail((v) => !v)}
            >
              {consentEmail && (
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                  <path d="M2 6l3 3 5-5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              )}
            </div>
            <input type="checkbox" checked={consentEmail} onChange={(e) => setConsentEmail(e.target.checked)} className="sr-only" />
            <div>
              <p className="text-sm font-bold text-gray-900">Notifications par email</p>
              <p className="text-xs text-gray-400 mt-0.5">Menus du jour, nouveautés, promotions</p>
            </div>
          </label>
          <div className="my-3" style={{ borderTop: '1px solid #f4f4f4' }} />
          <label className="flex items-start gap-4 cursor-pointer py-1">
            <div
              className="w-5 h-5 rounded flex items-center justify-center flex-shrink-0 mt-0.5 transition-all"
              style={{ background: consentPush ? '#1a3d2b' : '#e5e7eb' }}
              onClick={() => setConsentPush((v) => !v)}
            >
              {consentPush && (
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                  <path d="M2 6l3 3 5-5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              )}
            </div>
            <input type="checkbox" checked={consentPush} onChange={(e) => setConsentPush(e.target.checked)} className="sr-only" />
            <div>
              <p className="text-sm font-bold text-gray-900">Notifications push</p>
              <p className="text-xs text-gray-400 mt-0.5">Alertes en temps réel sur votre navigateur</p>
            </div>
          </label>
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
            {loading ? 'Inscription…' : "S'inscrire aux notifications"}
          </button>
          <p className="text-xs text-gray-400 text-center mt-3 px-2">
            Vos données sont utilisées uniquement pour vous informer sur les frigos L'Oiseau Blanc.
          </p>
        </div>
      </form>
    </AppLayout>
  );
}

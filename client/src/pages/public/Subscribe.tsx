import { useState, FormEvent } from 'react';
import { Bell, Mail, Phone, CheckCircle } from 'lucide-react';
import api from '../../services/api';

export function Subscribe() {
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

    if (!email && !phone) {
      setError('Veuillez renseigner au moins un email ou un numéro de téléphone.');
      return;
    }
    if (!consentEmail && !consentPush) {
      setError('Veuillez accepter au moins un type de notification.');
      return;
    }

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
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="bg-white rounded-2xl shadow-md p-8 w-full max-w-md text-center">
          <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="text-green-600" size={28} />
          </div>
          <h2 className="text-xl font-bold text-gray-800 mb-2">Inscription confirmée !</h2>
          <p className="text-sm text-gray-500">
            Vous recevrez désormais les actualités des frigos L'Oiseau Blanc.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl shadow-md p-8 w-full max-w-md">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
            <Bell className="text-blue-600" size={20} />
          </div>
          <div>
            <h1 className="text-lg font-bold text-gray-800">Restez informé</h1>
            <p className="text-xs text-gray-500">L'Oiseau Blanc Traiteur</p>
          </div>
        </div>

        <p className="text-sm text-gray-600 mb-6">
          Inscrivez-vous pour recevoir les menus du jour, les nouveautés et les promotions disponibles dans votre frigo.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Email */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="votre@email.fr"
                className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Téléphone */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Téléphone
            </label>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="06 00 00 00 00"
                className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <p className="text-xs text-gray-400">Au moins un des deux champs est requis.</p>

          {/* Consentements */}
          <div className="border border-gray-200 rounded-xl p-4 space-y-3">
            <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
              Je souhaite recevoir
            </p>
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={consentEmail}
                onChange={(e) => setConsentEmail(e.target.checked)}
                className="mt-0.5 accent-blue-600"
              />
              <span className="text-sm text-gray-700">
                Les notifications par <strong>email</strong> (menus, nouveautés)
              </span>
            </label>
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={consentPush}
                onChange={(e) => setConsentPush(e.target.checked)}
                className="mt-0.5 accent-blue-600"
              />
              <span className="text-sm text-gray-700">
                Les notifications <strong>push</strong> sur mon navigateur
              </span>
            </label>
          </div>

          {error && (
            <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-medium rounded-lg py-2.5 text-sm transition-colors"
          >
            {loading ? 'Inscription...' : "S'inscrire"}
          </button>

          <p className="text-xs text-gray-400 text-center">
            Vos données sont utilisées uniquement pour vous envoyer des informations sur les frigos L'Oiseau Blanc. Vous pouvez vous désinscrire à tout moment.
          </p>
        </form>
      </div>
    </div>
  );
}

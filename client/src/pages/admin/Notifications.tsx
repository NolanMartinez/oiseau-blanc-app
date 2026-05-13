import { useState } from 'react';
import { Bell, Send, Users, ClipboardList, Refrigerator, Star, Megaphone } from 'lucide-react';
import { AdminLayout } from '../../components/admin/AdminLayout';
import api from '../../services/api';

interface Template {
  icon: React.ElementType;
  label: string;
  title: string;
  body: string;
  url: string;
}

const TEMPLATES: Template[] = [
  {
    icon: ClipboardList,
    label: 'Nouveau sondage',
    title: '📋 Nouveau sondage disponible',
    body: 'Votre avis compte ! Un nouveau sondage vous attend sur Friggo.',
    url: '/app/sondages',
  },
  {
    icon: Refrigerator,
    label: 'Nouveau plat',
    title: '🥘 Nouveau plat disponible',
    body: 'Un nouveau plat vient d\'arriver dans votre frigo favori. Dépêchez-vous !',
    url: '/app/mon-frigo',
  },
  {
    icon: Star,
    label: 'Laisser un avis',
    title: '⭐ Partagez votre avis',
    body: 'Vous avez récemment commandé chez Friggo. Deux minutes pour nous donner votre retour ?',
    url: '/app/avis',
  },
  {
    icon: Megaphone,
    label: 'Message libre',
    title: '',
    body: '',
    url: '/app/mon-frigo',
  },
];

export function Notifications() {
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [url, setUrl] = useState('/app/mon-frigo');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ sent: number; total: number } | null>(null);
  const [error, setError] = useState('');
  const [activeTemplate, setActiveTemplate] = useState<number | null>(null);

  function applyTemplate(idx: number) {
    const t = TEMPLATES[idx];
    setTitle(t.title);
    setBody(t.body);
    setUrl(t.url);
    setActiveTemplate(idx);
    setResult(null);
    setError('');
  }

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || !body.trim()) {
      setError('Titre et message sont requis.');
      return;
    }
    setLoading(true);
    setResult(null);
    setError('');
    try {
      const res = await api.post('/admin/notifications/send', { title, body, url });
      setResult(res.data);
    } catch {
      setError('Erreur lors de l\'envoi. Vérifiez que les clés VAPID sont configurées.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <AdminLayout title="Notifications push">
      <div className="max-w-xl space-y-6">

        {/* Compteur abonnés */}
        <div className="bg-white rounded-xl border border-gray-200 p-4 flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-green-50 flex items-center justify-center flex-shrink-0">
            <Users size={17} className="text-green-600" />
          </div>
          <p className="text-sm text-gray-600">
            Envoi broadcast à <span className="font-semibold text-gray-800">tous les abonnés</span> ayant activé les notifications push.
          </p>
        </div>

        {/* Templates */}
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-3">Modèles rapides</p>
          <div className="grid grid-cols-2 gap-2">
            {TEMPLATES.map((t, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => applyTemplate(idx)}
                className={`flex items-center gap-2.5 px-4 py-3 rounded-xl border text-left transition-all text-sm font-medium ${
                  activeTemplate === idx
                    ? 'border-green-500 bg-green-50 text-green-700'
                    : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
                }`}
              >
                <t.icon size={15} className={activeTemplate === idx ? 'text-green-600' : 'text-gray-400'} />
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* Formulaire */}
        <form onSubmit={handleSend} className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1.5">
              Titre
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => { setTitle(e.target.value); setActiveTemplate(null); }}
              placeholder="Titre de la notification"
              className="w-full px-3 py-2.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:border-green-400"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1.5">
              Message
            </label>
            <textarea
              value={body}
              onChange={(e) => { setBody(e.target.value); setActiveTemplate(null); }}
              placeholder="Contenu de la notification…"
              rows={3}
              className="w-full px-3 py-2.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:border-green-400 resize-none"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1.5">
              Lien à ouvrir au clic
            </label>
            <select
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              className="w-full px-3 py-2.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:border-green-400 bg-white"
            >
              <option value="/app/mon-frigo">Mon Frigo</option>
              <option value="/app/sondages">Sondages</option>
              <option value="/app/avis">Avis</option>
              <option value="/app/profil">Profil</option>
            </select>
          </div>

          {error && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          {result && (
            <div className="flex items-center gap-2 text-sm text-green-700 bg-green-50 border border-green-100 rounded-lg px-3 py-2">
              <Bell size={14} />
              <span>
                <span className="font-semibold">{result.sent}</span> notification{result.sent !== 1 ? 's' : ''} envoyée{result.sent !== 1 ? 's' : ''} sur {result.total} abonné{result.total !== 1 ? 's' : ''}.
              </span>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg bg-green-600 text-white text-sm font-semibold hover:bg-green-700 transition-colors disabled:opacity-50"
          >
            <Send size={14} />
            {loading ? 'Envoi en cours…' : 'Envoyer la notification'}
          </button>
        </form>

      </div>
    </AdminLayout>
  );
}

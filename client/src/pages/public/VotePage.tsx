import { useState, useEffect, type FormEvent } from 'react';
import { CheckCircle, ArrowLeft, Mail, Phone, Vote } from 'lucide-react';
import api from '../../services/api';

interface MenuVote {
  id: string;
  title: string;
  options: string[];
  voteDeadline: string;
}

function formatDeadline(d: string) {
  return new Date(d).toLocaleString('fr-FR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

// ─── Formulaire de vote ───────────────────────────────────────────────────────

function VoteForm({ vote, onBack }: { vote: MenuVote; onBack: () => void }) {
  const [selectedOption, setSelectedOption] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');

    if (!selectedOption) { setError('Veuillez choisir une option.'); return; }
    if (!email && !phone) { setError('Veuillez renseigner votre email ou téléphone.'); return; }

    setLoading(true);
    try {
      await api.post(`/public/votes/${vote.id}/vote`, {
        email: email || undefined,
        phone: phone || undefined,
        selectedOption,
      });
      setSuccess(true);
    } catch (err: unknown) {
      const status = (err as { response?: { status?: number } })?.response?.status;
      if (status === 409) {
        setError('Vous avez déjà voté pour ce menu.');
      } else if (status === 403) {
        setError('Ce vote est terminé.');
      } else {
        setError('Une erreur est survenue. Veuillez réessayer.');
      }
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
          <h2 className="text-xl font-bold text-gray-800 mb-2">Vote enregistré !</h2>
          <p className="text-sm text-gray-500 mb-2">
            Vous avez voté pour <span className="font-semibold text-gray-700">«&nbsp;{selectedOption}&nbsp;»</span>.
          </p>
          <p className="text-sm text-gray-400 mb-6">Merci pour votre participation !</p>
          <button onClick={onBack} className="text-sm text-blue-600 hover:underline">
            Voir les autres votes
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4 py-8">
      <div className="bg-white rounded-2xl shadow-md p-8 w-full max-w-md">
        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 mb-6 transition-colors"
        >
          <ArrowLeft size={15} />
          Retour aux votes
        </button>

        <div className="mb-6">
          <h1 className="text-xl font-bold text-gray-800">{vote.title}</h1>
          <p className="text-xs text-gray-400 mt-1">
            Vote jusqu'au {formatDeadline(vote.voteDeadline)}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <p className="text-sm font-medium text-gray-700 mb-3">Votre choix *</p>
            <div className="space-y-2">
              {vote.options.map((option) => (
                <label
                  key={option}
                  className={`flex items-center gap-3 cursor-pointer rounded-xl border-2 px-4 py-3.5 transition-all ${
                    selectedOption === option
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <input
                    type="radio"
                    name="option"
                    value={option}
                    checked={selectedOption === option}
                    onChange={() => setSelectedOption(option)}
                    className="accent-blue-600"
                  />
                  <span className="text-sm font-medium text-gray-700">{option}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="border-t border-gray-100 pt-4 space-y-3">
            <p className="text-sm font-medium text-gray-700">Votre contact</p>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={15} />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="votre@email.fr"
                className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={15} />
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="06 00 00 00 00"
                className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <p className="text-xs text-gray-400">Au moins un des deux est requis.</p>
          </div>

          {error && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-medium rounded-lg py-2.5 text-sm transition-colors"
          >
            {loading ? 'Envoi…' : 'Valider mon vote'}
          </button>
        </form>
      </div>
    </div>
  );
}

// ─── Page liste ───────────────────────────────────────────────────────────────

export function VotePage() {
  const [votes, setVotes] = useState<MenuVote[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<MenuVote | null>(null);

  useEffect(() => {
    api.get('/public/votes')
      .then((res) => setVotes(res.data.votes))
      .finally(() => setLoading(false));
  }, []);

  if (selected) {
    return <VoteForm vote={selected} onBack={() => setSelected(null)} />;
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-lg">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-800">Votes menus</h1>
          <p className="text-sm text-gray-500 mt-1">
            L'Oiseau Blanc Traiteur — dites-nous quels plats vous aimeriez retrouver.
          </p>
        </div>

        {loading ? (
          <p className="text-sm text-gray-400 text-center py-8">Chargement…</p>
        ) : votes.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-sm p-10 text-center">
            <div className="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center mx-auto mb-3">
              <Vote size={20} className="text-gray-400" />
            </div>
            <p className="text-sm text-gray-500 font-medium">Aucun vote en cours</p>
            <p className="text-xs text-gray-400 mt-1">Revenez bientôt !</p>
          </div>
        ) : (
          <div className="space-y-3">
            {votes.map((vote) => (
              <div
                key={vote.id}
                className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 flex items-center justify-between gap-4"
              >
                <div>
                  <p className="font-semibold text-gray-800">{vote.title}</p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {vote.options.length} options · jusqu'au {formatDeadline(vote.voteDeadline)}
                  </p>
                </div>
                <button
                  onClick={() => setSelected(vote)}
                  className="flex-shrink-0 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
                >
                  Voter
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

import { useState, useEffect, FormEvent } from 'react';
import { Vote, CheckCircle, ArrowLeft } from 'lucide-react';
import { AppLayout } from '../../components/app/AppLayout';
import api from '../../services/api';

interface MenuVote {
  id: string;
  title: string;
  options: string[];
  voteDeadline: string;
}

function formatDeadline(d: string) {
  return new Date(d).toLocaleString('fr-FR', {
    day: '2-digit', month: 'long', year: 'numeric',
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
        email: email || undefined, phone: phone || undefined, selectedOption,
      });
      setSuccess(true);
    } catch (err: unknown) {
      const status = (err as { response?: { status?: number } })?.response?.status;
      if (status === 409) setError('Vous avez déjà voté pour ce menu.');
      else if (status === 403) setError('Ce vote est terminé.');
      else setError('Une erreur est survenue. Veuillez réessayer.');
    } finally {
      setLoading(false);
    }
  }

  if (success) {
    return (
      <div className="flex flex-col items-center justify-center px-6 pt-20 text-center">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-5">
          <CheckCircle className="text-green-600" size={32} />
        </div>
        <h2 className="text-2xl font-black text-gray-900 mb-2">Vote enregistré !</h2>
        <p className="text-sm text-gray-500 mb-1">Vous avez voté pour</p>
        <p className="text-sm font-bold text-gray-900 mb-8">« {selectedOption} »</p>
        <button onClick={onBack} className="text-sm font-bold underline" style={{ color: '#1a3d2b' }}>
          Voir les autres votes
        </button>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="bg-white px-4 pt-4 pb-5" style={{ borderBottom: '1px solid #f4f4f4' }}>
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 text-sm font-semibold text-gray-400 mb-3"
        >
          <ArrowLeft size={15} />Retour
        </button>
        <h2 className="text-xl font-black text-gray-900 leading-tight">{vote.title}</h2>
        <p className="text-xs text-gray-400 mt-1">Vote jusqu'au {formatDeadline(vote.voteDeadline)}</p>
      </div>

      <form onSubmit={handleSubmit}>
        {/* Options */}
        <div className="bg-white mt-2 px-4 py-5">
          <p className="text-xs font-black text-gray-400 uppercase tracking-widest mb-4">Votre choix</p>
          <div className="space-y-2">
            {vote.options.map((option) => (
              <label
                key={option}
                className="flex items-center gap-3 cursor-pointer rounded-2xl px-4 py-4 transition-all"
                style={
                  selectedOption === option
                    ? { background: '#e8f0ea', border: '2px solid #1a3d2b' }
                    : { background: '#f7f7f7', border: '2px solid transparent' }
                }
              >
                <input
                  type="radio"
                  name="option"
                  value={option}
                  checked={selectedOption === option}
                  onChange={() => setSelectedOption(option)}
                  className="sr-only"
                />
                <div
                  className="w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0"
                  style={{ borderColor: selectedOption === option ? '#1a3d2b' : '#d1d5db' }}
                >
                  {selectedOption === option && (
                    <div className="w-2.5 h-2.5 rounded-full" style={{ background: '#1a3d2b' }} />
                  )}
                </div>
                <span className="text-sm font-bold text-gray-800">{option}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Contact */}
        <div className="bg-white mt-2 px-4 py-5">
          <p className="text-xs font-black text-gray-400 uppercase tracking-widest mb-1">Votre contact</p>
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
            {loading ? 'Envoi…' : 'Valider mon vote'}
          </button>
        </div>
      </form>
    </div>
  );
}

// ─── Page liste ───────────────────────────────────────────────────────────────

export function VotesPage() {
  const [votes, setVotes] = useState<MenuVote[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<MenuVote | null>(null);

  useEffect(() => {
    api.get('/public/votes').then((res) => setVotes(res.data.votes)).finally(() => setLoading(false));
  }, []);

  return (
    <AppLayout title="Votes menus">
      {selected ? (
        <VoteForm vote={selected} onBack={() => setSelected(null)} />
      ) : (
        <>
          {/* Page header */}
          <div className="bg-white px-4 pt-5 pb-5">
            <h1 className="text-2xl font-black text-gray-900 leading-tight">Votes menus</h1>
            <p className="text-sm text-gray-500 mt-1">Dites-nous quels plats vous aimeriez retrouver.</p>
          </div>

          <div className="px-4 pt-4 pb-6">
            {loading ? (
              <p className="text-sm text-gray-400 text-center py-12">Chargement…</p>
            ) : votes.length === 0 ? (
              <div className="bg-white rounded-2xl p-12 text-center">
                <div className="w-12 h-12 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-3">
                  <Vote size={20} className="text-gray-300" />
                </div>
                <p className="text-sm font-bold text-gray-400">Aucun vote en cours</p>
                <p className="text-xs text-gray-300 mt-1">Revenez bientôt !</p>
              </div>
            ) : (
              <div className="space-y-3">
                {votes.map((vote) => (
                  <div key={vote.id} className="bg-white rounded-2xl px-4 py-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="font-black text-gray-900 text-sm">{vote.title}</p>
                        <p className="text-xs text-gray-400 mt-0.5">
                          {vote.options.length} options · jusqu'au {formatDeadline(vote.voteDeadline)}
                        </p>
                      </div>
                      <button
                        onClick={() => setSelected(vote)}
                        className="flex-shrink-0 text-white text-xs font-black px-4 py-2.5 rounded-xl"
                        style={{ background: '#1a3d2b' }}
                      >
                        Voter
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </AppLayout>
  );
}

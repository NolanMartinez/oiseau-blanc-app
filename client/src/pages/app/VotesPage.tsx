import { useState, useEffect, FormEvent } from 'react';
import { Vote, CheckCircle, ArrowLeft, ChevronRight, Clock } from 'lucide-react';
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
    day: '2-digit', month: 'long',
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
      <div className="flex flex-col items-center justify-center px-6 pt-24 text-center fade-up">
        <div
          className="w-16 h-16 rounded-2xl flex items-center justify-center mb-6"
          style={{ background: 'var(--green-soft)' }}
        >
          <CheckCircle size={28} style={{ color: 'var(--green)' }} />
        </div>
        <p
          className="text-[10px] uppercase tracking-[0.05em] mb-3"
          style={{ color: 'var(--green)', fontWeight: 700 }}
        >
          Vote enregistré
        </p>
        <h2 className="text-titre-gros mb-4" style={{ color: 'var(--ink)' }}>
          Merci
        </h2>
        <p className="text-[13px] mb-1" style={{ color: 'var(--ink-soft)' }}>
          Vous avez voté pour
        </p>
        <p
          className="text-[20px] mb-10"
          style={{ color: 'var(--ink)', fontWeight: 800 }}
        >
          « {selectedOption} »
        </p>
        <button
          onClick={onBack}
          className="text-[13px] underline"
          style={{ color: 'var(--green)', fontWeight: 700 }}
        >
          Voir les autres votes
        </button>
      </div>
    );
  }

  return (
    <div className="fade-up">
      {/* Header */}
      <div className="px-6 pt-6 pb-6">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 text-[12px] mb-4"
          style={{ color: 'var(--ink-faint)', fontWeight: 500 }}
        >
          <ArrowLeft size={13} /> Retour
        </button>
        <p
          className="text-[10px] uppercase tracking-[0.05em] mb-3"
          style={{ color: 'var(--green)', fontWeight: 700 }}
        >
          Vote menu
        </p>
        <h2 className="text-titre" style={{ color: 'var(--ink)' }}>
          {vote.title}
        </h2>
        <div className="flex items-center gap-1.5 mt-3 text-[12px]" style={{ color: 'var(--ink-faint)' }}>
          <Clock size={12} />
          <span>Jusqu'au {formatDeadline(vote.voteDeadline)}</span>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="px-6 pb-6 space-y-8">
        {/* Options */}
        <section>
          <p
            className="text-[11px] uppercase tracking-[0.05em] mb-4"
            style={{ color: 'var(--ink-faint)', fontWeight: 700 }}
          >
            Votre choix
          </p>
          <div className="space-y-2">
            {vote.options.map((option) => {
              const active = selectedOption === option;
              return (
                <label
                  key={option}
                  className="flex items-center gap-3 cursor-pointer rounded-2xl px-5 py-5 transition-all"
                  style={{
                    background: active ? 'var(--green-soft)' : '#ffffff',
                    border: `1px solid ${active ? 'var(--green)' : 'var(--line)'}`,
                  }}
                >
                  <input
                    type="radio"
                    name="option"
                    value={option}
                    checked={active}
                    onChange={() => setSelectedOption(option)}
                    className="sr-only"
                  />
                  <div
                    className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0"
                    style={{
                      border: `2px solid ${active ? 'var(--green)' : 'var(--line)'}`,
                    }}
                  >
                    {active && (
                      <div className="w-2.5 h-2.5 rounded-full" style={{ background: 'var(--green)' }} />
                    )}
                  </div>
                  <span
                    className="text-[16px]"
                    style={{ color: 'var(--ink)', fontWeight: 800 }}
                  >
                    {option}
                  </span>
                </label>
              );
            })}
          </div>
        </section>

        {/* Contact */}
        <section>
          <p
            className="text-[11px] uppercase tracking-[0.05em] mb-1"
            style={{ color: 'var(--ink-faint)', fontWeight: 700 }}
          >
            Vos coordonnées
          </p>
          <p className="text-[12px] mb-4" style={{ color: 'var(--ink-faint)' }}>
            Email ou téléphone requis
          </p>
          <div className="space-y-2">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="votre@email.fr"
              className="w-full py-4 px-5 rounded-2xl text-[14px] focus:outline-none"
              style={{
                background: '#ffffff',
                border: '1px solid var(--line)',
                color: 'var(--ink)',
              }}
            />
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="06 00 00 00 00"
              className="w-full py-4 px-5 rounded-2xl text-[14px] focus:outline-none"
              style={{
                background: '#ffffff',
                border: '1px solid var(--line)',
                color: 'var(--ink)',
              }}
            />
          </div>
        </section>

        {/* Submit flottant */}
        <div
          className="sticky bottom-0 z-10 -mx-6 px-6 pt-10 pb-5"
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
          <button
            type="submit"
            disabled={loading}
            className="text-cta w-full rounded-full py-4 disabled:opacity-50 transition-all hover:scale-[0.99]"
            style={{
              background: 'var(--green)',
              color: '#ffffff',
              fontWeight: 700,
              boxShadow: '0 8px 24px rgba(49,153,102,0.28)',
            }}
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
        <div className="fade-up">
          <div className="px-6 pt-8 pb-6">
            <p
              className="text-[10px] uppercase tracking-[0.05em] mb-3"
              style={{ color: 'var(--green)', fontWeight: 700 }}
            >
              À vous de choisir
            </p>
            <h1
              className="text-titre-gros mb-3"
              style={{ color: 'var(--ink)' }}
            >
              Votes menus
            </h1>
            <p className="text-texte" style={{ color: 'var(--ink-soft)' }}>
              Dites-nous quels plats vous aimeriez retrouver.
            </p>
          </div>

          <div className="px-6 pb-10">
            {loading ? (
              <p className="text-[13px] text-center py-12" style={{ color: 'var(--ink-faint)' }}>
                Chargement…
              </p>
            ) : votes.length === 0 ? (
              <div
                className="rounded-3xl py-16 text-center"
                style={{ background: '#ffffff', border: '1px solid var(--line)' }}
              >
                <div
                  className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4"
                  style={{ background: 'var(--green-soft)' }}
                >
                  <Vote size={20} style={{ color: 'var(--green)' }} />
                </div>
                <p className="text-[18px]" style={{ color: 'var(--ink)', fontWeight: 800 }}>
                  Aucun vote en cours
                </p>
                <p className="text-[12px] mt-1" style={{ color: 'var(--ink-faint)' }}>
                  Revenez bientôt
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {votes.map((vote) => (
                  <button
                    key={vote.id}
                    onClick={() => setSelected(vote)}
                    className="w-full text-left rounded-3xl p-5 flex items-center gap-4 transition-all hover:scale-[0.995]"
                    style={{ background: '#ffffff', border: '1px solid var(--line)' }}
                  >
                    <div className="flex-1 min-w-0">
                      <p
                        className="text-[17px] leading-tight"
                        style={{ color: 'var(--ink)', fontWeight: 800 }}
                      >
                        {vote.title}
                      </p>
                      <div className="flex items-center gap-2 mt-2 text-[11px]" style={{ color: 'var(--ink-faint)' }}>
                        <span>{vote.options.length} options</span>
                        <span>·</span>
                        <span className="flex items-center gap-1">
                          <Clock size={10} />
                          {formatDeadline(vote.voteDeadline)}
                        </span>
                      </div>
                    </div>
                    <div
                      className="w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0"
                      style={{ background: 'var(--green)' }}
                    >
                      <ChevronRight size={16} style={{ color: '#ffffff' }} />
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </AppLayout>
  );
}

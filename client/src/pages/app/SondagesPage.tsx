import { useState, useEffect, FormEvent } from 'react';
import { ClipboardList, CheckCircle, ArrowLeft } from 'lucide-react';
import { AppLayout } from '../../components/app/AppLayout';
import api from '../../services/api';

type QuestionType = 'text' | 'rating' | 'choice' | 'multi';

interface Question {
  id: string;
  label: string;
  type: QuestionType;
  options?: string[];
}

interface Survey {
  id: string;
  title: string;
  questions: Question[];
}

// ─── Rendu d'une question ─────────────────────────────────────────────────────

function QuestionField({ question, value, onChange }: {
  question: Question;
  value: unknown;
  onChange: (val: unknown) => void;
}) {
  if (question.type === 'text') {
    return (
      <textarea
        value={(value as string) ?? ''}
        onChange={(e) => onChange(e.target.value)}
        rows={3}
        placeholder="Votre réponse (optionnel)…"
        className="w-full rounded-xl px-3 py-3 text-sm text-gray-800 focus:outline-none resize-none"
        style={{ background: '#f2f2f2', border: 'none' }}
      />
    );
  }

  if (question.type === 'rating') {
    const LABELS: Record<number, string> = { 1: 'Mauvais', 2: 'Moyen', 3: 'Bien', 4: 'Très bien', 5: 'Excellent' };
    return (
      <div className="flex items-center gap-2 flex-wrap">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => onChange(n)}
            className="w-12 h-12 rounded-xl text-sm font-black transition-all"
            style={
              value === n
                ? { background: '#1a3d2b', color: 'white' }
                : { background: '#f2f2f2', color: '#6b7280' }
            }
          >
            {n}
          </button>
        ))}
        {value != null && (
          <span className="text-sm font-bold ml-1" style={{ color: '#1a3d2b' }}>
            {LABELS[value as number]}
          </span>
        )}
      </div>
    );
  }

  if (question.type === 'choice') {
    return (
      <div className="space-y-2">
        {(question.options ?? []).map((option) => (
          <label
            key={option}
            className="flex items-center gap-3 cursor-pointer rounded-2xl px-4 py-4 transition-all"
            style={
              value === option
                ? { background: '#e8f0ea', border: '2px solid #1a3d2b' }
                : { background: '#f7f7f7', border: '2px solid transparent' }
            }
          >
            <input
              type="radio"
              name={question.id}
              value={option}
              checked={value === option}
              onChange={() => onChange(option)}
              className="sr-only"
            />
            <div
              className="w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0"
              style={{ borderColor: value === option ? '#1a3d2b' : '#d1d5db' }}
            >
              {value === option && (
                <div className="w-2.5 h-2.5 rounded-full" style={{ background: '#1a3d2b' }} />
              )}
            </div>
            <span className="text-sm font-semibold text-gray-800">{option}</span>
          </label>
        ))}
      </div>
    );
  }

  if (question.type === 'multi') {
    const selected = (value as string[]) ?? [];
    return (
      <div className="space-y-2">
        {(question.options ?? []).map((option) => {
          const checked = selected.includes(option);
          return (
            <label
              key={option}
              className="flex items-center gap-3 cursor-pointer rounded-2xl px-4 py-4 transition-all"
              style={
                checked
                  ? { background: '#e8f0ea', border: '2px solid #1a3d2b' }
                  : { background: '#f7f7f7', border: '2px solid transparent' }
              }
            >
              <input
                type="checkbox"
                checked={checked}
                onChange={(e) =>
                  onChange(e.target.checked ? [...selected, option] : selected.filter((o) => o !== option))
                }
                className="sr-only"
              />
              <div
                className="w-5 h-5 rounded flex items-center justify-center flex-shrink-0"
                style={{ background: checked ? '#1a3d2b' : '#e5e7eb' }}
              >
                {checked && (
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                    <path d="M2 6l3 3 5-5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
              </div>
              <span className="text-sm font-semibold text-gray-800">{option}</span>
            </label>
          );
        })}
      </div>
    );
  }

  return null;
}

// ─── Formulaire ───────────────────────────────────────────────────────────────

function SurveyForm({ survey, onBack }: { survey: Survey; onBack: () => void }) {
  const [answers, setAnswers] = useState<Record<string, unknown>>({});
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    if (!email && !phone) { setError('Veuillez renseigner votre email ou téléphone.'); return; }
    const missing = survey.questions.filter((q) => {
      if (q.type === 'text') return false;
      const a = answers[q.id];
      return a === undefined || a === null || (Array.isArray(a) && a.length === 0);
    });
    if (missing.length > 0) { setError('Veuillez répondre à toutes les questions obligatoires.'); return; }
    setLoading(true);
    try {
      await api.post(`/public/surveys/${survey.id}/respond`, {
        email: email || undefined, phone: phone || undefined, answers,
      });
      setSuccess(true);
    } catch (err: unknown) {
      const status = (err as { response?: { status?: number } })?.response?.status;
      setError(status === 409 ? 'Vous avez déjà répondu à ce sondage.' : 'Une erreur est survenue.');
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
        <h2 className="text-2xl font-black text-gray-900 mb-2">Merci !</h2>
        <p className="text-sm text-gray-500 mb-8">Vos retours nous aident à améliorer nos services.</p>
        <button onClick={onBack} className="text-sm font-bold underline" style={{ color: '#1a3d2b' }}>
          Voir les autres sondages
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
        <h2 className="text-xl font-black text-gray-900 leading-tight">{survey.title}</h2>
        <p className="text-xs text-gray-400 mt-1">
          {survey.questions.length} question{survey.questions.length !== 1 ? 's' : ''}
        </p>
      </div>

      <form onSubmit={handleSubmit}>
        {/* Questions */}
        {survey.questions.map((q, i) => (
          <div key={q.id} className="bg-white mt-2 px-4 py-5">
            <p className="text-xs font-black text-gray-400 uppercase tracking-widest mb-4">
              Question {i + 1}
              {q.type !== 'text' && <span className="text-red-400 ml-1 normal-case">*</span>}
            </p>
            <p className="text-sm font-bold text-gray-900 mb-3">{q.label}</p>
            <QuestionField
              question={q}
              value={answers[q.id]}
              onChange={(v) => setAnswers((p) => ({ ...p, [q.id]: v }))}
            />
          </div>
        ))}

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
            {loading ? 'Envoi…' : 'Envoyer mes réponses'}
          </button>
        </div>
      </form>
    </div>
  );
}

// ─── Page liste ───────────────────────────────────────────────────────────────

export function SondagesPage() {
  const [surveys, setSurveys] = useState<Survey[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Survey | null>(null);

  useEffect(() => {
    api.get('/public/surveys').then((res) => setSurveys(res.data.surveys)).finally(() => setLoading(false));
  }, []);

  return (
    <AppLayout title="Sondages">
      {selected ? (
        <SurveyForm survey={selected} onBack={() => setSelected(null)} />
      ) : (
        <>
          {/* Page header */}
          <div className="bg-white px-4 pt-5 pb-5">
            <h1 className="text-2xl font-black text-gray-900 leading-tight">Sondages</h1>
            <p className="text-sm text-gray-500 mt-1">Partagez vos retours pour améliorer nos services.</p>
          </div>

          <div className="px-4 pt-4 pb-6">
            {loading ? (
              <p className="text-sm text-gray-400 text-center py-12">Chargement…</p>
            ) : surveys.length === 0 ? (
              <div className="bg-white rounded-2xl p-12 text-center">
                <div className="w-12 h-12 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-3">
                  <ClipboardList size={20} className="text-gray-300" />
                </div>
                <p className="text-sm font-bold text-gray-400">Aucun sondage disponible</p>
                <p className="text-xs text-gray-300 mt-1">Revenez bientôt !</p>
              </div>
            ) : (
              <div className="space-y-3">
                {surveys.map((survey) => (
                  <div
                    key={survey.id}
                    className="bg-white rounded-2xl px-4 py-4 flex items-center justify-between gap-3"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="font-black text-gray-900 text-sm">{survey.title}</p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {survey.questions.length} question{survey.questions.length !== 1 ? 's' : ''}
                      </p>
                    </div>
                    <button
                      onClick={() => setSelected(survey)}
                      className="flex-shrink-0 text-white text-xs font-black px-4 py-2.5 rounded-xl"
                      style={{ background: '#1a3d2b' }}
                    >
                      Répondre
                    </button>
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

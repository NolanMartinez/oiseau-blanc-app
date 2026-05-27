import { useState, useEffect, type FormEvent } from 'react';
import { ClipboardList, CheckCircle, ArrowLeft, ChevronRight } from 'lucide-react';
import { AppLayout } from '../../components/app/AppLayout';
import api, { userApi } from '../../services/api';

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
        className="w-full rounded-2xl px-5 py-4 text-[14px] focus:outline-none resize-none"
        style={{
          background: 'var(--ivory)',
          border: '1px solid var(--line)',
          color: 'var(--ink)',
          fontFamily: 'inherit',
        }}
      />
    );
  }

  if (question.type === 'rating') {
    const LABELS: Record<number, string> = { 1: 'Décevant', 2: 'Moyen', 3: 'Bien', 4: 'Très bien', 5: 'Excellent' };
    return (
      <div className="flex items-center gap-2 flex-wrap">
        {[1, 2, 3, 4, 5].map((n) => {
          const active = value === n;
          return (
            <button
              key={n}
              type="button"
              onClick={() => onChange(n)}
              className="transition-all"
              style={{
                width: 48,
                height: 48,
                borderRadius: 16,
                fontSize: 18,
                fontWeight: 800,
                background: active ? 'var(--green)' : '#ffffff',
                color: active ? '#ffffff' : 'var(--ink-soft)',
                border: active ? 'none' : '1px solid var(--line)',
              }}
            >
              {n}
            </button>
          );
        })}
        {value != null && (
          <span
            className="ml-2 text-[16px]"
            style={{ color: 'var(--ink)', fontWeight: 800 }}
          >
            {LABELS[value as number]}
          </span>
        )}
      </div>
    );
  }

  if (question.type === 'choice') {
    return (
      <div className="space-y-2">
        {(question.options ?? []).map((option) => {
          const active = value === option;
          return (
            <label
              key={option}
              className="flex items-center gap-3 cursor-pointer rounded-2xl px-5 py-4 transition-all"
              style={{
                background: active ? 'var(--green-soft)' : '#ffffff',
                border: `1px solid ${active ? 'var(--green)' : 'var(--line)'}`,
              }}
            >
              <input
                type="radio"
                name={question.id}
                value={option}
                checked={active}
                onChange={() => onChange(option)}
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
              <span className="text-[14px]" style={{ color: 'var(--ink)', fontWeight: 500 }}>
                {option}
              </span>
            </label>
          );
        })}
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
              className="flex items-center gap-3 cursor-pointer rounded-2xl px-5 py-4 transition-all"
              style={{
                background: checked ? 'var(--green-soft)' : '#ffffff',
                border: `1px solid ${checked ? 'var(--green)' : 'var(--line)'}`,
              }}
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
                className="w-5 h-5 rounded-md flex items-center justify-center flex-shrink-0"
                style={{
                  background: checked ? 'var(--green)' : 'transparent',
                  border: `2px solid ${checked ? 'var(--green)' : 'var(--line)'}`,
                }}
              >
                {checked && (
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                    <path d="M2 6l3 3 5-5" stroke="#ffffff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
              </div>
              <span className="text-[14px]" style={{ color: 'var(--ink)', fontWeight: 500 }}>
                {option}
              </span>
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
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    const missing = survey.questions.filter((q) => {
      if (q.type === 'text') return false;
      const a = answers[q.id];
      return a === undefined || a === null || (Array.isArray(a) && a.length === 0);
    });
    if (missing.length > 0) { setError('Veuillez répondre à toutes les questions obligatoires.'); return; }
    setLoading(true);
    try {
      await userApi.post(`/public/surveys/${survey.id}/respond`, { answers });
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
      <div className="flex flex-col items-center justify-center px-6 pt-24 text-center fade-up">
        <div
          className="w-16 h-16 rounded-2xl flex items-center justify-center mb-6"
          style={{ background: 'var(--green-soft)' }}
        >
          <CheckCircle size={28} style={{ color: 'var(--green)' }} />
        </div>
        <h2 className="text-titre-gros mb-4" style={{ color: 'var(--ink)' }}>
          Merci
        </h2>
        <p className="text-texte mb-10" style={{ color: 'var(--ink-soft)' }}>
          Vos retours nous aident à améliorer nos services.
        </p>
        <button
          onClick={onBack}
          className="text-[13px] underline"
          style={{ color: 'var(--green)', fontWeight: 700 }}
        >
          Voir les autres sondages
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
          Sondage
        </p>
        <h2 className="text-titre" style={{ color: 'var(--ink)' }}>
          {survey.title}
        </h2>
        <p className="text-[12px] mt-2" style={{ color: 'var(--ink-faint)' }}>
          {survey.questions.length} question{survey.questions.length !== 1 ? 's' : ''}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="px-6 pb-6 space-y-8">
        {/* Questions */}
        {survey.questions.map((q, i) => (
          <section key={q.id}>
            <p
              className="text-[11px] uppercase tracking-[0.05em] mb-2"
              style={{ color: 'var(--ink-faint)', fontWeight: 700 }}
            >
              Question {i + 1}
              {q.type !== 'text' && (
                <span style={{ color: 'var(--green)', marginLeft: 4 }}>·</span>
              )}
            </p>
            <p
              className="text-[18px] mb-4"
              style={{ color: 'var(--ink)', fontWeight: 800, lineHeight: 1.3 }}
            >
              {q.label}
            </p>
            <QuestionField
              question={q}
              value={answers[q.id]}
              onChange={(v) => setAnswers((p) => ({ ...p, [q.id]: v }))}
            />
          </section>
        ))}

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
        <div className="fade-up">
          <div className="px-6 pt-8 pb-6">
            <p
              className="text-[10px] uppercase tracking-[0.05em] mb-3"
              style={{ color: 'var(--green)', fontWeight: 700 }}
            >
              Votre avis compte
            </p>
            <h1
              className="text-titre-gros mb-3"
              style={{ color: 'var(--ink)' }}
            >
              Sondages
            </h1>
            <p className="text-texte" style={{ color: 'var(--ink-soft)' }}>
              Partagez vos retours pour améliorer nos services.
            </p>
          </div>

          <div className="px-6 pb-10">
            {loading ? (
              <p className="text-[13px] text-center py-12" style={{ color: 'var(--ink-faint)' }}>
                Chargement…
              </p>
            ) : surveys.length === 0 ? (
              <div
                className="rounded-3xl py-16 text-center"
                style={{ background: '#ffffff', border: '1px solid var(--line)' }}
              >
                <div
                  className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4"
                  style={{ background: 'var(--green-soft)' }}
                >
                  <ClipboardList size={20} style={{ color: 'var(--green)' }} />
                </div>
                <p className="text-[18px]" style={{ color: 'var(--ink)', fontWeight: 800 }}>
                  Aucun sondage
                </p>
                <p className="text-[12px] mt-1" style={{ color: 'var(--ink-faint)' }}>
                  Revenez bientôt
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {surveys.map((survey) => (
                  <button
                    key={survey.id}
                    onClick={() => setSelected(survey)}
                    className="w-full text-left rounded-3xl p-5 flex items-center gap-4 transition-all hover:scale-[0.995]"
                    style={{ background: '#ffffff', border: '1px solid var(--line)' }}
                  >
                    <div className="flex-1 min-w-0">
                      <p
                        className="text-[17px] leading-tight"
                        style={{ color: 'var(--ink)', fontWeight: 800 }}
                      >
                        {survey.title}
                      </p>
                      <p className="text-[11px] mt-1.5" style={{ color: 'var(--ink-faint)' }}>
                        {survey.questions.length} question{survey.questions.length !== 1 ? 's' : ''}
                      </p>
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

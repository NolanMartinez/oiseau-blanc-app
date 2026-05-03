import { useState, useEffect, type FormEvent } from 'react';
import { CheckCircle, ArrowLeft, Mail, Phone, ClipboardList } from 'lucide-react';
import api from '../../services/api';

// ─── Types ────────────────────────────────────────────────────────────────────

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
  createdAt: string;
}

// ─── Rendu d'une question ──────────────────────────────────────────────────────

function QuestionField({
  question,
  value,
  onChange,
}: {
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
        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
      />
    );
  }

  if (question.type === 'rating') {
    const LABELS: Record<number, string> = { 1: 'Mauvais', 2: 'Moyen', 3: 'Bien', 4: 'Très bien', 5: 'Excellent' };
    return (
      <div className="flex items-center gap-2">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => onChange(n)}
            className={`w-11 h-11 rounded-xl border-2 text-sm font-semibold transition-all ${
              value === n
                ? 'bg-blue-600 border-blue-600 text-white shadow-md scale-105'
                : 'border-gray-200 text-gray-500 hover:border-blue-300 hover:text-blue-600'
            }`}
          >
            {n}
          </button>
        ))}
        {value != null && (
          <span className="text-sm text-blue-600 font-medium ml-1">{LABELS[value as number]}</span>
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
            className={`flex items-center gap-3 cursor-pointer rounded-xl border-2 px-4 py-3 transition-all ${
              value === option ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            <input
              type="radio"
              name={question.id}
              value={option}
              checked={value === option}
              onChange={() => onChange(option)}
              className="text-blue-600 accent-blue-600"
            />
            <span className="text-sm text-gray-700">{option}</span>
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
              className={`flex items-center gap-3 cursor-pointer rounded-xl border-2 px-4 py-3 transition-all ${
                checked ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <input
                type="checkbox"
                checked={checked}
                onChange={(e) => {
                  onChange(
                    e.target.checked ? [...selected, option] : selected.filter((o) => o !== option)
                  );
                }}
                className="text-blue-600 accent-blue-600"
              />
              <span className="text-sm text-gray-700">{option}</span>
            </label>
          );
        })}
      </div>
    );
  }

  return null;
}

// ─── Formulaire de réponse ────────────────────────────────────────────────────

function SurveyForm({
  survey,
  onBack,
}: {
  survey: Survey;
  onBack: () => void;
}) {
  const [answers, setAnswers] = useState<Record<string, unknown>>({});
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  function setAnswer(questionId: string, value: unknown) {
    setAnswers((prev) => ({ ...prev, [questionId]: value }));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');

    if (!email && !phone) {
      setError('Veuillez renseigner votre email ou téléphone.');
      return;
    }

    const missing = survey.questions.filter((q) => {
      if (q.type === 'text') return false;
      const a = answers[q.id];
      if (a === undefined || a === null) return true;
      if (Array.isArray(a) && a.length === 0) return true;
      return false;
    });

    if (missing.length > 0) {
      setError('Veuillez répondre à toutes les questions obligatoires.');
      return;
    }

    setLoading(true);
    try {
      await api.post(`/public/surveys/${survey.id}/respond`, {
        email: email || undefined,
        phone: phone || undefined,
        answers,
      });
      setSuccess(true);
    } catch (err: unknown) {
      const status = (err as { response?: { status?: number } })?.response?.status;
      if (status === 409) {
        setError('Vous avez déjà répondu à ce sondage.');
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
          <h2 className="text-xl font-bold text-gray-800 mb-2">Merci pour votre réponse !</h2>
          <p className="text-sm text-gray-500 mb-6">
            Vos retours nous aident à améliorer nos services.
          </p>
          <button onClick={onBack} className="text-sm text-blue-600 hover:underline">
            Voir les autres sondages
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4 py-8">
      <div className="bg-white rounded-2xl shadow-md p-8 w-full max-w-lg">
        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 mb-6 transition-colors"
        >
          <ArrowLeft size={15} />
          Retour aux sondages
        </button>

        <div className="mb-6">
          <h1 className="text-xl font-bold text-gray-800">{survey.title}</h1>
          <p className="text-sm text-gray-500 mt-1">
            {survey.questions.length} question{survey.questions.length !== 1 ? 's' : ''} · L'Oiseau Blanc Traiteur
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {survey.questions.map((question, idx) => (
            <div key={question.id}>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {idx + 1}. {question.label}
                {question.type !== 'text' && (
                  <span className="text-red-500 ml-1">*</span>
                )}
              </label>
              <QuestionField
                question={question}
                value={answers[question.id]}
                onChange={(val) => setAnswer(question.id, val)}
              />
            </div>
          ))}

          {/* Contact */}
          <div className="border-t border-gray-100 pt-5 space-y-3">
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

          {error && (
            <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-medium rounded-lg py-2.5 text-sm transition-colors"
          >
            {loading ? 'Envoi…' : 'Envoyer mes réponses'}
          </button>
        </form>
      </div>
    </div>
  );
}

// ─── Page liste des sondages ──────────────────────────────────────────────────

export function SurveyPage() {
  const [surveys, setSurveys] = useState<Survey[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Survey | null>(null);

  useEffect(() => {
    api.get('/public/surveys')
      .then((res) => setSurveys(res.data.surveys))
      .finally(() => setLoading(false));
  }, []);

  if (selected) {
    return <SurveyForm survey={selected} onBack={() => setSelected(null)} />;
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-lg">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-800">Sondages de préférences</h1>
          <p className="text-sm text-gray-500 mt-1">
            L'Oiseau Blanc Traiteur — partagez vos retours pour améliorer nos services.
          </p>
        </div>

        {loading ? (
          <p className="text-sm text-gray-400 text-center py-8">Chargement…</p>
        ) : surveys.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-sm p-10 text-center">
            <div className="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center mx-auto mb-3">
              <ClipboardList size={20} className="text-gray-400" />
            </div>
            <p className="text-sm text-gray-500 font-medium">Aucun sondage disponible</p>
            <p className="text-xs text-gray-400 mt-1">Revenez bientôt !</p>
          </div>
        ) : (
          <div className="space-y-3">
            {surveys.map((survey) => (
              <div
                key={survey.id}
                className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 flex items-center justify-between gap-4"
              >
                <div>
                  <p className="font-semibold text-gray-800">{survey.title}</p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {survey.questions.length} question{survey.questions.length !== 1 ? 's' : ''}
                  </p>
                </div>
                <button
                  onClick={() => setSelected(survey)}
                  className="flex-shrink-0 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
                >
                  Répondre
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

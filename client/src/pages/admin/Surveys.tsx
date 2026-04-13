import { useState, useEffect } from 'react';
import { Plus, Pencil, Trash2, BarChart2, X, CheckCircle, ClipboardList } from 'lucide-react';
import { AdminLayout } from '../../components/admin/AdminLayout';
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
  active: boolean;
  createdAt: string;
  _count: { responses: number };
}

interface SurveyResponse {
  id: string;
  answers: Record<string, unknown>;
  createdAt: string;
  subscriber: { email: string | null; phone: string | null };
}

interface SurveyWithResponses extends Survey {
  responses: SurveyResponse[];
}

interface QuestionDraft {
  _key: string;
  id: string;
  label: string;
  type: QuestionType;
  options: string[];
}

const TYPE_LABELS: Record<QuestionType, string> = {
  text: 'Texte libre',
  rating: 'Note 1–5',
  choice: 'Choix unique',
  multi: 'Choix multiple',
};

// ─── Agrégation des réponses ──────────────────────────────────────────────────

function aggregateQuestion(question: Question, responses: SurveyResponse[]) {
  const answers = responses.map((r) => r.answers[question.id]);

  if (question.type === 'rating') {
    const nums = answers.filter((a) => typeof a === 'number') as number[];
    if (nums.length === 0) return { type: 'rating' as const, avg: null, dist: [], total: 0 };
    const avg = nums.reduce((a, b) => a + b, 0) / nums.length;
    const dist = [1, 2, 3, 4, 5].map((n) => ({ n, count: nums.filter((x) => x === n).length }));
    return { type: 'rating' as const, avg: Math.round(avg * 10) / 10, dist, total: nums.length };
  }

  if (question.type === 'choice') {
    const counts: Record<string, number> = {};
    (question.options ?? []).forEach((o) => { counts[o] = 0; });
    (answers as string[]).forEach((a) => {
      if (a && typeof a === 'string') counts[a] = (counts[a] || 0) + 1;
    });
    const total = Object.values(counts).reduce((a, b) => a + b, 0);
    return { type: 'choice' as const, counts, total };
  }

  if (question.type === 'multi') {
    const counts: Record<string, number> = {};
    (question.options ?? []).forEach((o) => { counts[o] = 0; });
    (answers as string[][]).forEach((arr) => {
      if (Array.isArray(arr)) arr.forEach((a) => { counts[a] = (counts[a] || 0) + 1; });
    });
    return { type: 'multi' as const, counts, total: responses.length };
  }

  const texts = (answers as string[]).filter((a) => a && typeof a === 'string' && (a as string).trim());
  return { type: 'text' as const, texts: texts as string[] };
}

// ─── Modal création / édition ──────────────────────────────────────────────────

function SurveyModal({
  initial,
  onClose,
  onSaved,
}: {
  initial: Survey | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [title, setTitle] = useState(initial?.title ?? '');
  const [active, setActive] = useState(initial?.active ?? false);
  const [questions, setQuestions] = useState<QuestionDraft[]>(() =>
    (initial?.questions ?? []).map((q, i) => ({
      _key: `existing_${i}`,
      id: q.id,
      label: q.label,
      type: q.type,
      options: q.options ?? [],
    }))
  );
  const [newOptionInputs, setNewOptionInputs] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  function addQuestion() {
    const key = `new_${Date.now()}`;
    setQuestions((prev) => [...prev, { _key: key, id: key, label: '', type: 'text', options: [] }]);
  }

  function removeQuestion(key: string) {
    setQuestions((prev) => prev.filter((q) => q._key !== key));
  }

  function updateQuestion(key: string, patch: Partial<QuestionDraft>) {
    setQuestions((prev) => prev.map((q) => (q._key === key ? { ...q, ...patch } : q)));
  }

  function addOption(key: string) {
    const option = (newOptionInputs[key] ?? '').trim();
    if (!option) return;
    const q = questions.find((q) => q._key === key);
    if (!q) return;
    updateQuestion(key, { options: [...q.options, option] });
    setNewOptionInputs((prev) => ({ ...prev, [key]: '' }));
  }

  function removeOption(key: string, option: string) {
    const q = questions.find((q) => q._key === key);
    if (!q) return;
    updateQuestion(key, { options: q.options.filter((o) => o !== option) });
  }

  async function handleSave() {
    setError('');
    if (!title.trim()) { setError('Le titre est requis.'); return; }
    if (questions.length === 0) { setError('Ajoutez au moins une question.'); return; }
    for (const q of questions) {
      if (!q.label.trim()) { setError('Chaque question doit avoir un libellé.'); return; }
      if ((q.type === 'choice' || q.type === 'multi') && q.options.length < 2) {
        setError('Les questions à choix doivent avoir au moins 2 options.'); return;
      }
    }

    setLoading(true);
    try {
      const payload = {
        title: title.trim(),
        active,
        questions: questions.map((q) => ({
          id: q.id,
          label: q.label.trim(),
          type: q.type,
          ...(q.type === 'choice' || q.type === 'multi' ? { options: q.options } : {}),
        })),
      };
      if (initial) {
        await api.patch(`/admin/surveys/${initial.id}`, payload);
      } else {
        await api.post('/admin/surveys', payload);
      }
      onSaved();
    } catch {
      setError('Une erreur est survenue. Veuillez réessayer.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 flex-shrink-0">
          <h2 className="font-semibold text-gray-800">
            {initial ? 'Modifier le sondage' : 'Nouveau sondage'}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto p-6 space-y-6">
          {/* Titre */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Titre *</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ex : Qualité des plats de mars"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Questions */}
          <div>
            <p className="text-sm font-medium text-gray-700 mb-3">Questions *</p>
            <div className="space-y-3">
              {questions.map((q, idx) => (
                <div key={q._key} className="border border-gray-200 rounded-xl p-4 space-y-3">
                  <div className="flex items-start gap-3">
                    <span className="text-xs font-semibold text-gray-400 mt-2.5 w-5 flex-shrink-0">
                      {idx + 1}
                    </span>
                    <input
                      type="text"
                      value={q.label}
                      onChange={(e) => updateQuestion(q._key, { label: e.target.value })}
                      placeholder="Libellé de la question"
                      className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <select
                      value={q.type}
                      onChange={(e) =>
                        updateQuestion(q._key, {
                          type: e.target.value as QuestionType,
                          options: [],
                        })
                      }
                      className="border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      {(Object.entries(TYPE_LABELS) as [QuestionType, string][]).map(([v, label]) => (
                        <option key={v} value={v}>{label}</option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={() => removeQuestion(q._key)}
                      className="text-gray-400 hover:text-red-500 transition-colors mt-2"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>

                  {/* Options pour choix unique / multiple */}
                  {(q.type === 'choice' || q.type === 'multi') && (
                    <div className="ml-8 space-y-2">
                      {q.options.map((option) => (
                        <div key={option} className="flex items-center gap-2">
                          <span className="flex-1 text-sm text-gray-600 bg-gray-50 border border-gray-200 rounded-lg px-3 py-1.5">
                            {option}
                          </span>
                          <button
                            type="button"
                            onClick={() => removeOption(q._key, option)}
                            className="text-gray-400 hover:text-red-500 transition-colors"
                          >
                            <X size={14} />
                          </button>
                        </div>
                      ))}
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={newOptionInputs[q._key] ?? ''}
                          onChange={(e) =>
                            setNewOptionInputs((prev) => ({ ...prev, [q._key]: e.target.value }))
                          }
                          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addOption(q._key); } }}
                          placeholder="Ajouter une option…"
                          className="flex-1 border border-dashed border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                        <button
                          type="button"
                          onClick={() => addOption(q._key)}
                          className="text-blue-600 hover:text-blue-700 transition-colors"
                        >
                          <Plus size={16} />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>

            <button
              type="button"
              onClick={addQuestion}
              className="mt-3 flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700 font-medium transition-colors"
            >
              <Plus size={15} />
              Ajouter une question
            </button>
          </div>

          {/* Statut */}
          <label className="flex items-center gap-3 cursor-pointer">
            <div
              onClick={() => setActive((v) => !v)}
              className={`w-10 h-5 rounded-full transition-colors cursor-pointer flex-shrink-0 ${active ? 'bg-green-500' : 'bg-gray-300'}`}
            >
              <span
                className={`block w-4 h-4 bg-white rounded-full shadow mt-0.5 transition-transform ${active ? 'translate-x-5' : 'translate-x-0.5'}`}
              />
            </div>
            <span className="text-sm text-gray-700">Sondage actif (visible par les abonnés)</span>
          </label>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200 flex-shrink-0">
          {error && <p className="text-sm text-red-600">{error}</p>}
          {!error && <span />}
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 transition-colors"
            >
              Annuler
            </button>
            <button
              onClick={handleSave}
              disabled={loading}
              className="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-medium rounded-lg transition-colors"
            >
              {loading ? 'Enregistrement…' : 'Enregistrer'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Modal résultats ──────────────────────────────────────────────────────────

function ResultsModal({
  survey,
  onClose,
}: {
  survey: SurveyWithResponses;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 flex-shrink-0">
          <div>
            <h2 className="font-semibold text-gray-800">{survey.title}</h2>
            <p className="text-xs text-gray-400 mt-0.5">
              {survey.responses.length} réponse{survey.responses.length !== 1 ? 's' : ''}
            </p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="overflow-y-auto p-6 space-y-6">
          {survey.responses.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-8">Aucune réponse pour l'instant.</p>
          ) : (
            survey.questions.map((question, idx) => {
              const agg = aggregateQuestion(question, survey.responses);
              return (
                <div key={question.id}>
                  <p className="text-sm font-medium text-gray-700 mb-3">
                    {idx + 1}. {question.label}
                    <span className="ml-2 text-xs font-normal text-gray-400">
                      ({TYPE_LABELS[question.type]})
                    </span>
                  </p>

                  {agg.type === 'rating' && (
                    <div className="space-y-2">
                      <p className="text-sm font-semibold text-gray-700">
                        Moyenne : {agg.avg !== null ? `${agg.avg}/5` : '—'}
                      </p>
                      {agg.dist.map(({ n, count }) => (
                        <div key={n} className="flex items-center gap-2">
                          <span className="text-xs text-gray-500 w-5">{n}★</span>
                          <div className="flex-1 bg-gray-100 rounded-full h-2">
                            <div
                              className="bg-yellow-400 rounded-full h-2 transition-all"
                              style={{ width: agg.total ? `${(count / agg.total) * 100}%` : '0%' }}
                            />
                          </div>
                          <span className="text-xs text-gray-500 w-4 text-right">{count}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {(agg.type === 'choice' || agg.type === 'multi') && (
                    <div className="space-y-2">
                      {Object.entries(agg.counts).map(([option, count]) => (
                        <div key={option} className="flex items-center gap-2">
                          <span className="text-xs text-gray-600 w-32 truncate">{option}</span>
                          <div className="flex-1 bg-gray-100 rounded-full h-2">
                            <div
                              className="bg-blue-400 rounded-full h-2 transition-all"
                              style={{ width: agg.total ? `${(count / agg.total) * 100}%` : '0%' }}
                            />
                          </div>
                          <span className="text-xs text-gray-400 w-16 text-right">
                            {agg.total ? Math.round((count / agg.total) * 100) : 0}% ({count})
                          </span>
                        </div>
                      ))}
                    </div>
                  )}

                  {agg.type === 'text' && (
                    <div className="space-y-2">
                      {agg.texts.length === 0 ? (
                        <p className="text-xs text-gray-400 italic">Aucune réponse texte.</p>
                      ) : (
                        agg.texts.map((text, i) => (
                          <p key={i} className="text-sm text-gray-600 bg-gray-50 rounded-lg px-3 py-2">
                            "{text}"
                          </p>
                        ))
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Page principale ──────────────────────────────────────────────────────────

export function Surveys() {
  const [surveys, setSurveys] = useState<Survey[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingSurvey, setEditingSurvey] = useState<Survey | null>(null);
  const [resultsData, setResultsData] = useState<SurveyWithResponses | null>(null);
  const [resultsLoading, setResultsLoading] = useState(false);

  async function fetchSurveys() {
    setLoading(true);
    try {
      const res = await api.get('/admin/surveys');
      setSurveys(res.data.surveys);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { fetchSurveys(); }, []);

  async function handleToggleActive(survey: Survey) {
    await api.patch(`/admin/surveys/${survey.id}`, { active: !survey.active });
    fetchSurveys();
  }

  async function handleDelete(survey: Survey) {
    const label = survey._count.responses > 0
      ? `Ce sondage contient ${survey._count.responses} réponse(s). Supprimer quand même ?`
      : 'Supprimer ce sondage ?';
    if (!confirm(label)) return;
    await api.delete(`/admin/surveys/${survey.id}`);
    fetchSurveys();
  }

  async function handleViewResults(survey: Survey) {
    setResultsLoading(true);
    try {
      const res = await api.get(`/admin/surveys/${survey.id}/responses`);
      setResultsData(res.data.survey);
    } finally {
      setResultsLoading(false);
    }
  }

  function openCreate() {
    setEditingSurvey(null);
    setShowModal(true);
  }

  function openEdit(survey: Survey) {
    setEditingSurvey(survey);
    setShowModal(true);
  }

  function handleSaved() {
    setShowModal(false);
    fetchSurveys();
  }

  return (
    <AdminLayout title="Sondages">
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-gray-500">{surveys.length} sondage{surveys.length !== 1 ? 's' : ''}</p>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
        >
          <Plus size={15} />
          Nouveau sondage
        </button>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-sm text-gray-400">Chargement…</div>
        ) : surveys.length === 0 ? (
          <div className="p-12 text-center">
            <div className="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center mx-auto mb-3">
              <ClipboardList size={20} className="text-gray-400" />
            </div>
            <p className="text-sm text-gray-500 font-medium">Aucun sondage</p>
            <p className="text-xs text-gray-400 mt-1">Créez votre premier sondage pour recueillir les préférences de vos abonnés.</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Titre</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Questions</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Réponses</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Statut</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {surveys.map((survey) => (
                <tr key={survey.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 font-medium text-gray-800">{survey.title}</td>
                  <td className="px-4 py-3 text-gray-500">{survey.questions.length}</td>
                  <td className="px-4 py-3 text-gray-500">{survey._count.responses}</td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => handleToggleActive(survey)}
                      title={survey.active ? 'Désactiver' : 'Activer'}
                      className={`w-10 h-5 rounded-full transition-colors flex-shrink-0 ${survey.active ? 'bg-green-500' : 'bg-gray-300'}`}
                    >
                      <span
                        className={`block w-4 h-4 bg-white rounded-full shadow mt-0.5 transition-transform ${survey.active ? 'translate-x-5' : 'translate-x-0.5'}`}
                      />
                    </button>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => handleViewResults(survey)}
                        disabled={resultsLoading}
                        title="Voir les résultats"
                        className="text-gray-400 hover:text-blue-500 transition-colors disabled:opacity-40"
                      >
                        <BarChart2 size={15} />
                      </button>
                      <button
                        onClick={() => openEdit(survey)}
                        title="Modifier"
                        className="text-gray-400 hover:text-gray-700 transition-colors"
                      >
                        <Pencil size={15} />
                      </button>
                      <button
                        onClick={() => handleDelete(survey)}
                        title="Supprimer"
                        className="text-gray-400 hover:text-red-500 transition-colors"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {showModal && (
        <SurveyModal
          initial={editingSurvey}
          onClose={() => setShowModal(false)}
          onSaved={handleSaved}
        />
      )}

      {resultsData && (
        <ResultsModal survey={resultsData} onClose={() => setResultsData(null)} />
      )}
    </AdminLayout>
  );
}

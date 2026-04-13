import { useState, useEffect } from 'react';
import { Plus, Pencil, Trash2, BarChart2, X, Vote } from 'lucide-react';
import { AdminLayout } from '../../components/admin/AdminLayout';
import api from '../../services/api';

// ─── Types ────────────────────────────────────────────────────────────────────

interface MenuVote {
  id: string;
  title: string;
  options: string[];
  voteDeadline: string;
  _count: { responses: number };
}

interface VoteResponse {
  id: string;
  selectedOptions: string[];
  createdAt: string;
  subscriber: { email: string | null; phone: string | null };
}

interface VoteWithResults extends MenuVote {
  responses: VoteResponse[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function isOpen(deadline: string) {
  return new Date(deadline) > new Date();
}

function formatDeadline(d: string) {
  return new Date(d).toLocaleString('fr-FR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

function defaultDeadline() {
  const d = new Date();
  d.setDate(d.getDate() + 7);
  d.setHours(12, 0, 0, 0);
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
}

function toDatetimeLocal(iso: string) {
  const d = new Date(iso);
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
}

// ─── Modal création / édition ──────────────────────────────────────────────────

function VoteModal({
  initial,
  onClose,
  onSaved,
}: {
  initial: MenuVote | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [title, setTitle] = useState(initial?.title ?? '');
  const [options, setOptions] = useState<string[]>(initial?.options ?? ['', '']);
  const [deadline, setDeadline] = useState(
    initial ? toDatetimeLocal(initial.voteDeadline) : defaultDeadline()
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  function updateOption(idx: number, val: string) {
    setOptions((prev) => prev.map((o, i) => (i === idx ? val : o)));
  }

  function addOption() {
    setOptions((prev) => [...prev, '']);
  }

  function removeOption(idx: number) {
    if (options.length <= 2) return;
    setOptions((prev) => prev.filter((_, i) => i !== idx));
  }

  async function handleSave() {
    setError('');
    if (!title.trim()) { setError('Le titre est requis.'); return; }
    const cleanOptions = options.map((o) => o.trim()).filter(Boolean);
    if (cleanOptions.length < 2) { setError('Au moins 2 options sont requises.'); return; }
    if (!deadline) { setError('La date limite est requise.'); return; }

    setLoading(true);
    try {
      const payload = { title: title.trim(), options: cleanOptions, voteDeadline: new Date(deadline).toISOString() };
      if (initial) {
        await api.patch(`/admin/votes/${initial.id}`, payload);
      } else {
        await api.post('/admin/votes', payload);
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
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 flex-shrink-0">
          <h2 className="font-semibold text-gray-800">
            {initial ? 'Modifier le vote' : 'Nouveau vote'}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="overflow-y-auto p-6 space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Titre *</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ex : Menu de la semaine du 20 juin"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Options *</label>
            <div className="space-y-2">
              {options.map((option, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <input
                    type="text"
                    value={option}
                    onChange={(e) => updateOption(idx, e.target.value)}
                    placeholder={`Option ${idx + 1}`}
                    className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  {options.length > 2 && (
                    <button
                      type="button"
                      onClick={() => removeOption(idx)}
                      className="text-gray-400 hover:text-red-500 transition-colors"
                    >
                      <X size={16} />
                    </button>
                  )}
                </div>
              ))}
            </div>
            <button
              type="button"
              onClick={addOption}
              className="mt-2 flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-700 font-medium transition-colors"
            >
              <Plus size={14} />
              Ajouter une option
            </button>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Date limite *</label>
            <input
              type="datetime-local"
              value={deadline}
              onChange={(e) => setDeadline(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200 flex-shrink-0">
          {error ? <p className="text-sm text-red-600">{error}</p> : <span />}
          <div className="flex gap-3">
            <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 transition-colors">
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

function ResultsModal({ vote, onClose }: { vote: VoteWithResults; onClose: () => void }) {
  const total = vote.responses.length;

  const counts: Record<string, number> = {};
  vote.options.forEach((o) => { counts[o] = 0; });
  vote.responses.forEach((r) => {
    const selected = (r.selectedOptions as string[])[0];
    if (selected) counts[selected] = (counts[selected] || 0) + 1;
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <div>
            <h2 className="font-semibold text-gray-800">{vote.title}</h2>
            <p className="text-xs text-gray-400 mt-0.5">{total} vote{total !== 1 ? 's' : ''}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="p-6">
          {total === 0 ? (
            <p className="text-sm text-gray-400 text-center py-6">Aucun vote pour l'instant.</p>
          ) : (
            <div className="space-y-3">
              {vote.options.map((option) => {
                const count = counts[option] ?? 0;
                const pct = total ? Math.round((count / total) * 100) : 0;
                return (
                  <div key={option}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="font-medium text-gray-700">{option}</span>
                      <span className="text-gray-500">{pct}% ({count})</span>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-2.5">
                      <div
                        className="bg-blue-500 rounded-full h-2.5 transition-all"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Page principale ──────────────────────────────────────────────────────────

export function Votes() {
  const [votes, setVotes] = useState<MenuVote[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingVote, setEditingVote] = useState<MenuVote | null>(null);
  const [resultsData, setResultsData] = useState<VoteWithResults | null>(null);
  const [resultsLoading, setResultsLoading] = useState(false);

  async function fetchVotes() {
    setLoading(true);
    try {
      const res = await api.get('/admin/votes');
      setVotes(res.data.votes);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { fetchVotes(); }, []);

  async function handleDelete(vote: MenuVote) {
    const label = vote._count.responses > 0
      ? `Ce vote contient ${vote._count.responses} réponse(s). Supprimer quand même ?`
      : 'Supprimer ce vote ?';
    if (!confirm(label)) return;
    await api.delete(`/admin/votes/${vote.id}`);
    fetchVotes();
  }

  async function handleViewResults(vote: MenuVote) {
    setResultsLoading(true);
    try {
      const res = await api.get(`/admin/votes/${vote.id}/results`);
      setResultsData(res.data.vote);
    } finally {
      setResultsLoading(false);
    }
  }

  return (
    <AdminLayout title="Votes menus">
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-gray-500">{votes.length} vote{votes.length !== 1 ? 's' : ''}</p>
        <button
          onClick={() => { setEditingVote(null); setShowModal(true); }}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
        >
          <Plus size={15} />
          Nouveau vote
        </button>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-sm text-gray-400">Chargement…</div>
        ) : votes.length === 0 ? (
          <div className="p-12 text-center">
            <div className="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center mx-auto mb-3">
              <Vote size={20} className="text-gray-400" />
            </div>
            <p className="text-sm text-gray-500 font-medium">Aucun vote</p>
            <p className="text-xs text-gray-400 mt-1">Proposez des menus à vos abonnés pour connaître leurs préférences.</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Titre</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Options</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Votes</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Date limite</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Statut</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {votes.map((vote) => {
                const open = isOpen(vote.voteDeadline);
                return (
                  <tr key={vote.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 font-medium text-gray-800">{vote.title}</td>
                    <td className="px-4 py-3 text-gray-500">{vote.options.length}</td>
                    <td className="px-4 py-3 text-gray-500">{vote._count.responses}</td>
                    <td className="px-4 py-3 text-gray-500 text-xs">{formatDeadline(vote.voteDeadline)}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full ${
                        open ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${open ? 'bg-green-500' : 'bg-gray-400'}`} />
                        {open ? 'Ouvert' : 'Terminé'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleViewResults(vote)}
                          disabled={resultsLoading}
                          title="Voir les résultats"
                          className="text-gray-400 hover:text-blue-500 transition-colors disabled:opacity-40"
                        >
                          <BarChart2 size={15} />
                        </button>
                        <button
                          onClick={() => { setEditingVote(vote); setShowModal(true); }}
                          title="Modifier"
                          className="text-gray-400 hover:text-gray-700 transition-colors"
                        >
                          <Pencil size={15} />
                        </button>
                        <button
                          onClick={() => handleDelete(vote)}
                          title="Supprimer"
                          className="text-gray-400 hover:text-red-500 transition-colors"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {showModal && (
        <VoteModal
          initial={editingVote}
          onClose={() => setShowModal(false)}
          onSaved={() => { setShowModal(false); fetchVotes(); }}
        />
      )}
      {resultsData && <ResultsModal vote={resultsData} onClose={() => setResultsData(null)} />}
    </AdminLayout>
  );
}

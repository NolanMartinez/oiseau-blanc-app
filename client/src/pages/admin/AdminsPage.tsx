import { useState, useEffect } from 'react';
import { Plus, Pencil, Trash2, X, Users, Shield } from 'lucide-react';
import { AdminLayout } from '../../components/admin/AdminLayout';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';

interface Admin {
  id: string;
  email: string;
  role: 'SUPER_ADMIN' | 'ADMIN';
  createdAt: string;
}

// ─── Modal création / édition ──────────────────────────────────────────────────

function AdminModal({
  initial,
  onClose,
  onSaved,
}: {
  initial: Admin | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [email, setEmail] = useState(initial?.email ?? '');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'ADMIN' | 'SUPER_ADMIN'>(initial?.role ?? 'ADMIN');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSave() {
    setError('');
    if (!email.trim()) { setError('L\'email est requis.'); return; }
    if (!initial && !password) { setError('Le mot de passe est requis.'); return; }
    if (password && password.length < 8) { setError('Mot de passe minimum 8 caractères.'); return; }

    setLoading(true);
    try {
      const payload: Record<string, unknown> = { email: email.trim(), role };
      if (password) payload.password = password;

      if (initial) {
        await api.patch(`/admin/admins/${initial.id}`, payload);
      } else {
        await api.post('/admin/admins', payload);
      }
      onSaved();
    } catch (err: unknown) {
      const status = (err as { response?: { status?: number } })?.response?.status;
      if (status === 409) {
        setError('Un admin avec cet email existe déjà.');
      } else {
        setError('Une erreur est survenue. Veuillez réessayer.');
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h2 className="font-semibold text-gray-800">
            {initial ? 'Modifier l\'admin' : 'Nouvel admin'}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@oiseaublanc.fr"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Mot de passe {initial && <span className="text-gray-400 font-normal">(laisser vide pour ne pas changer)</span>}
              {!initial && <span className="text-red-500 ml-1">*</span>}
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Minimum 8 caractères"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Rôle</label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as 'ADMIN' | 'SUPER_ADMIN')}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="ADMIN">Admin</option>
              <option value="SUPER_ADMIN">Super Admin</option>
            </select>
          </div>
        </div>

        <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200">
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

// ─── Page principale ──────────────────────────────────────────────────────────

export function AdminsPage() {
  const { admin: currentAdmin } = useAuth();
  const [admins, setAdmins] = useState<Admin[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingAdmin, setEditingAdmin] = useState<Admin | null>(null);

  async function fetchAdmins() {
    setLoading(true);
    try {
      const res = await api.get('/admin/admins');
      setAdmins(res.data);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { fetchAdmins(); }, []);

  async function handleDelete(admin: Admin) {
    if (!confirm(`Supprimer l'admin ${admin.email} ?`)) return;
    await api.delete(`/admin/admins/${admin.id}`);
    fetchAdmins();
  }

  if (currentAdmin?.role !== 'SUPER_ADMIN') {
    return (
      <AdminLayout title="Admins">
        <div className="flex items-center gap-3 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
          <Shield size={16} className="text-red-500 flex-shrink-0" />
          <p className="text-sm text-red-700">Accès réservé aux Super Admins.</p>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title="Admins">
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-gray-500">{admins.length} admin{admins.length !== 1 ? 's' : ''}</p>
        <button
          onClick={() => { setEditingAdmin(null); setShowModal(true); }}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
        >
          <Plus size={15} />
          Nouvel admin
        </button>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-sm text-gray-400">Chargement…</div>
        ) : admins.length === 0 ? (
          <div className="p-12 text-center">
            <div className="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center mx-auto mb-3">
              <Users size={20} className="text-gray-400" />
            </div>
            <p className="text-sm text-gray-500">Aucun admin</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Email</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Rôle</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Créé le</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {admins.map((admin) => (
                <tr key={admin.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 font-medium text-gray-800">
                    {admin.email}
                    {admin.id === currentAdmin?.id && (
                      <span className="ml-2 text-xs text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full font-medium">Vous</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${
                      admin.role === 'SUPER_ADMIN'
                        ? 'bg-purple-100 text-purple-700'
                        : 'bg-gray-100 text-gray-600'
                    }`}>
                      {admin.role === 'SUPER_ADMIN' ? 'Super Admin' : 'Admin'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-500">
                    {new Date(admin.createdAt).toLocaleDateString('fr-FR')}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => { setEditingAdmin(admin); setShowModal(true); }}
                        title="Modifier"
                        className="text-gray-400 hover:text-gray-700 transition-colors"
                      >
                        <Pencil size={15} />
                      </button>
                      {admin.id !== currentAdmin?.id && (
                        <button
                          onClick={() => handleDelete(admin)}
                          title="Supprimer"
                          className="text-gray-400 hover:text-red-500 transition-colors"
                        >
                          <Trash2 size={15} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {showModal && (
        <AdminModal
          initial={editingAdmin}
          onClose={() => setShowModal(false)}
          onSaved={() => { setShowModal(false); fetchAdmins(); }}
        />
      )}
    </AdminLayout>
  );
}

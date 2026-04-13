import { useEffect, useState } from 'react';
import { Mail, Phone, Trash2, ChevronLeft, ChevronRight } from 'lucide-react';
import { AdminLayout } from '../../components/admin/AdminLayout';
import api from '../../services/api';

interface Subscriber {
  id: string;
  email: string | null;
  phone: string | null;
  consentEmail: boolean;
  consentPush: boolean;
  createdAt: string;
  _count: { reviews: number };
}

interface PageData {
  subscribers: Subscriber[];
  total: number;
  page: number;
  pages: number;
}

export function Subscribers() {
  const [data, setData] = useState<PageData | null>(null);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

  async function fetchSubscribers(p: number) {
    setLoading(true);
    try {
      const res = await api.get(`/admin/subscribers?page=${p}`);
      setData(res.data);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { fetchSubscribers(page); }, [page]);

  async function handleDelete(id: string) {
    if (!confirm('Supprimer cet abonné ?')) return;
    await api.delete(`/admin/subscribers/${id}`);
    fetchSubscribers(page);
  }

  return (
    <AdminLayout title="Abonnés">
      {/* Compteur */}
      {data && (
        <p className="text-sm text-gray-500 mb-4">
          {data.total} abonné{data.total > 1 ? 's' : ''} au total
        </p>
      )}

      {/* Tableau */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-sm text-gray-400">Chargement...</div>
        ) : data?.subscribers.length === 0 ? (
          <div className="p-8 text-center text-sm text-gray-400">Aucun abonné pour l'instant.</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Contact</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Consentements</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Avis</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Inscrit le</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {data?.subscribers.map((s) => (
                <tr key={s.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3">
                    <div className="space-y-0.5">
                      {s.email && (
                        <div className="flex items-center gap-1.5 text-gray-700">
                          <Mail size={13} className="text-gray-400" />
                          {s.email}
                        </div>
                      )}
                      {s.phone && (
                        <div className="flex items-center gap-1.5 text-gray-700">
                          <Phone size={13} className="text-gray-400" />
                          {s.phone}
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${s.consentEmail ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-400'}`}>
                        Email
                      </span>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${s.consentPush ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-400'}`}>
                        Push
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-600">{s._count.reviews}</td>
                  <td className="px-4 py-3 text-gray-500">
                    {new Date(s.createdAt).toLocaleDateString('fr-FR')}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => handleDelete(s.id)}
                      className="text-gray-400 hover:text-red-500 transition-colors"
                    >
                      <Trash2 size={15} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {/* Pagination */}
        {data && data.pages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200">
            <p className="text-xs text-gray-500">
              Page {data.page} sur {data.pages}
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="p-1.5 rounded hover:bg-gray-100 disabled:opacity-40 transition-colors"
              >
                <ChevronLeft size={16} />
              </button>
              <button
                onClick={() => setPage((p) => Math.min(data.pages, p + 1))}
                disabled={page === data.pages}
                className="p-1.5 rounded hover:bg-gray-100 disabled:opacity-40 transition-colors"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}

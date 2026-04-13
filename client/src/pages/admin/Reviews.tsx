import { useEffect, useState } from 'react';
import { Star, Trash2, ChevronLeft, ChevronRight, Download } from 'lucide-react';
import { AdminLayout } from '../../components/admin/AdminLayout';
import api from '../../services/api';
import { MOCK_DISHES } from '../../utils/mockDishes';

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

interface Review {
  id: string;
  dishId: string;
  rating: number;
  comment: string | null;
  createdAt: string;
  subscriber: { email: string | null; phone: string | null };
}

interface PageData {
  reviews: Review[];
  total: number;
  page: number;
  pages: number;
  average: number | null;
}

function Stars({ rating }: { rating: number }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((s) => (
        <Star
          key={s}
          size={14}
          className={s <= rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-200'}
        />
      ))}
    </div>
  );
}

function getDishName(dishId: string) {
  return MOCK_DISHES.find((d) => d.id === dishId)?.name ?? dishId;
}

export function Reviews() {
  const [data, setData] = useState<PageData | null>(null);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  async function fetchReviews(p: number) {
    setLoading(true);
    try {
      const res = await api.get(`/admin/reviews?page=${p}`);
      setData(res.data);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { fetchReviews(page); }, [page]);

  async function handleDelete(id: string) {
    if (!confirm('Supprimer cet avis ?')) return;
    await api.delete(`/admin/reviews/${id}`);
    fetchReviews(page);
  }

  async function handleExport() {
    setExporting(true);
    try {
      const res = await api.get('/admin/reviews/export', { responseType: 'blob' });
      downloadBlob(res.data as Blob, 'avis.csv');
    } finally {
      setExporting(false);
    }
  }

  return (
    <AdminLayout title="Avis">
      {/* Stats + export */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-6">
          {data && (
            <>
              <p className="text-sm text-gray-500">{data.total} avis au total</p>
              {data.average !== null && (
                <div className="flex items-center gap-2">
                  <Stars rating={Math.round(data.average)} />
                  <span className="text-sm font-semibold text-gray-700">{data.average}/5</span>
                  <span className="text-sm text-gray-400">moyenne générale</span>
                </div>
              )}
            </>
          )}
        </div>
        <button
          onClick={handleExport}
          disabled={exporting}
          className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-800 border border-gray-200 hover:border-gray-300 px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50"
        >
          <Download size={14} />
          {exporting ? 'Export…' : 'Exporter CSV'}
        </button>
      </div>

      {/* Tableau */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-sm text-gray-400">Chargement...</div>
        ) : data?.reviews.length === 0 ? (
          <div className="p-8 text-center text-sm text-gray-400">Aucun avis pour l'instant.</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Plat</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Note</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Commentaire</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Abonné</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Date</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {data?.reviews.map((r) => (
                <tr key={r.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 font-medium text-gray-800">
                    {getDishName(r.dishId)}
                  </td>
                  <td className="px-4 py-3">
                    <Stars rating={r.rating} />
                  </td>
                  <td className="px-4 py-3 text-gray-600 max-w-xs">
                    {r.comment ? (
                      <span className="line-clamp-2">{r.comment}</span>
                    ) : (
                      <span className="text-gray-300 italic">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-gray-500">
                    {r.subscriber.email ?? r.subscriber.phone}
                  </td>
                  <td className="px-4 py-3 text-gray-500">
                    {new Date(r.createdAt).toLocaleDateString('fr-FR')}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => handleDelete(r.id)}
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

        {data && data.pages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200">
            <p className="text-xs text-gray-500">Page {data.page} sur {data.pages}</p>
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

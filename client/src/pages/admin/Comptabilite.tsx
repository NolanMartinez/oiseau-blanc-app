import { useState, useEffect, useCallback } from 'react';
import { Download, TrendingUp, ShoppingCart, AlertCircle } from 'lucide-react';
import { AdminLayout } from '../../components/admin/AdminLayout';
import api from '../../services/api';

type Preset = 'today' | 'yesterday' | 'week' | 'month' | 'year' | 'custom';
type Granularity = 'detail' | 'daily' | 'monthly';

interface BreakdownRow {
  period: string;
  count: number;
  revenue: number;
}

interface Stats {
  totalTransactions: number;
  totalRevenue: number;
  breakdown: BreakdownRow[];
  granularity: 'daily' | 'monthly';
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function toISODate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function getPresetRange(preset: Preset): { from: string; to: string } {
  const now = new Date();
  const today = toISODate(now);

  if (preset === 'today') return { from: today, to: today };

  if (preset === 'yesterday') {
    const y = new Date(now);
    y.setDate(y.getDate() - 1);
    const yd = toISODate(y);
    return { from: yd, to: yd };
  }

  if (preset === 'week') {
    const day = now.getDay() === 0 ? 6 : now.getDay() - 1;
    const mon = new Date(now);
    mon.setDate(now.getDate() - day);
    return { from: toISODate(mon), to: today };
  }

  if (preset === 'month') {
    const first = new Date(now.getFullYear(), now.getMonth(), 1);
    return { from: toISODate(first), to: today };
  }

  if (preset === 'year') {
    const first = new Date(now.getFullYear(), 0, 1);
    return { from: toISODate(first), to: today };
  }

  return { from: today, to: today };
}

const PRESETS: { key: Preset; label: string }[] = [
  { key: 'today', label: "Aujourd'hui" },
  { key: 'yesterday', label: 'Hier' },
  { key: 'week', label: 'Cette semaine' },
  { key: 'month', label: 'Ce mois-ci' },
  { key: 'year', label: 'Cette année' },
  { key: 'custom', label: 'Personnalisé' },
];

const GRANULARITIES: { key: Granularity; label: string }[] = [
  { key: 'detail', label: 'Ligne par ligne' },
  { key: 'daily', label: 'Par jour' },
  { key: 'monthly', label: 'Par mois' },
];

const MONTHS_FR = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Août', 'Sep', 'Oct', 'Nov', 'Déc'];

function formatPeriod(period: string): string {
  if (period.length === 7) {
    const [year, month] = period.split('-');
    return `${MONTHS_FR[parseInt(month) - 1]} ${year}`;
  }
  return new Date(period + 'T12:00:00').toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
}

export function Comptabilite() {
  const [preset, setPreset] = useState<Preset>('today');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');
  const [granularity, setGranularity] = useState<Granularity>('daily');
  const [stats, setStats] = useState<Stats | null>(null);
  const [statsLoading, setStatsLoading] = useState(false);
  const [statsError, setStatsError] = useState('');
  const [exporting, setExporting] = useState(false);

  const { from, to } = preset === 'custom'
    ? { from: customFrom, to: customTo }
    : getPresetRange(preset);

  const loadStats = useCallback(() => {
    if (!from || !to || from > to) return;
    setStatsLoading(true);
    setStatsError('');
    api.get(`/admin/accounting/stats?from=${from}&to=${to}`)
      .then((res) => setStats(res.data))
      .catch(() => setStatsError('Impossible de charger les statistiques.'))
      .finally(() => setStatsLoading(false));
  }, [from, to]);

  useEffect(() => {
    if (preset !== 'custom') loadStats();
  }, [preset, loadStats]);

  useEffect(() => {
    if (preset === 'custom' && customFrom && customTo && customFrom <= customTo) loadStats();
  }, [preset, customFrom, customTo, loadStats]);

  // Auto-rafraîchissement : les ventes remontées par la borne apparaissent sans
  // recharger la page (toutes les 30 s + au retour sur l'onglet).
  useEffect(() => {
    const iv = window.setInterval(() => loadStats(), 30_000);
    const onFocus = () => loadStats();
    window.addEventListener('focus', onFocus);
    return () => {
      window.clearInterval(iv);
      window.removeEventListener('focus', onFocus);
    };
  }, [loadStats]);

  async function handleExport() {
    if (!from || !to) return;
    setExporting(true);
    try {
      const res = await api.get(
        `/admin/accounting/export?from=${from}&to=${to}&granularity=${granularity}`,
        { responseType: 'blob' },
      );
      const fileDate = `${from.replace(/-/g, '')}_${to.replace(/-/g, '')}`;
      const names: Record<Granularity, string> = {
        detail: `ventes_${fileDate}.csv`,
        daily: `ventes_par_jour_${fileDate}.csv`,
        monthly: `ventes_par_mois_${fileDate}.csv`,
      };
      downloadBlob(res.data as Blob, names[granularity]);
    } finally {
      setExporting(false);
    }
  }

  return (
    <AdminLayout title="Comptabilité">
      <div className="space-y-6 max-w-3xl">

        {/* Sélecteur de période */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Période</p>
          <div className="flex flex-wrap gap-2">
            {PRESETS.map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setPreset(key)}
                className={`px-3.5 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  preset === key
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {preset === 'custom' && (
            <div className="flex items-center gap-3 mt-4">
              <div>
                <label className="block text-xs text-gray-500 mb-1">Du</label>
                <input
                  type="date"
                  value={customFrom}
                  onChange={(e) => setCustomFrom(e.target.value)}
                  className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <span className="text-gray-400 mt-5">→</span>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Au</label>
                <input
                  type="date"
                  value={customTo}
                  min={customFrom}
                  onChange={(e) => setCustomTo(e.target.value)}
                  className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          )}
        </div>

        {/* KPIs */}
        {statsError ? (
          <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">
            <AlertCircle size={16} className="flex-shrink-0" /> {statsError}
          </div>
        ) : statsLoading ? (
          <div className="grid grid-cols-2 gap-4">
            {[1, 2].map((i) => (
              <div key={i} className="h-24 bg-gray-100 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : stats ? (
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <div className="flex items-center gap-2 mb-1">
                <ShoppingCart size={16} className="text-blue-500" />
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Ventes</p>
              </div>
              <p className="text-3xl font-black text-gray-900">{stats.totalTransactions.toLocaleString('fr-FR')}</p>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <div className="flex items-center gap-2 mb-1">
                <TrendingUp size={16} className="text-green-500" />
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Chiffre d'affaires</p>
              </div>
              <p className="text-3xl font-black text-gray-900">
                {stats.totalRevenue.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €
              </p>
            </div>
          </div>
        ) : null}

        {/* Breakdown preview */}
        {stats && stats.breakdown.length > 0 && (
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="px-5 py-3 border-b border-gray-100">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                Détail {stats.granularity === 'monthly' ? 'par mois' : 'par jour'}
              </p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="text-left px-5 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                      {stats.granularity === 'monthly' ? 'Mois' : 'Date'}
                    </th>
                    <th className="text-right px-5 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Ventes</th>
                    <th className="text-right px-5 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">CA (€)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {stats.breakdown.slice(0, 10).map((row) => (
                    <tr key={row.period} className="hover:bg-gray-50">
                      <td className="px-5 py-2.5 text-gray-700 font-medium">{formatPeriod(row.period)}</td>
                      <td className="px-5 py-2.5 text-right text-gray-600">{row.count}</td>
                      <td className="px-5 py-2.5 text-right text-gray-800 font-semibold tabular-nums">
                        {row.revenue.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {stats.breakdown.length > 10 && (
              <div className="px-5 py-2 bg-gray-50 border-t border-gray-100 text-xs text-gray-400">
                +{stats.breakdown.length - 10} lignes supplémentaires dans l'export
              </div>
            )}
          </div>
        )}

        {/* Export */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Format d'export</p>
          <div className="flex gap-2 mb-4 flex-wrap">
            {GRANULARITIES.map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setGranularity(key)}
                className={`px-3.5 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  granularity === key
                    ? 'bg-gray-900 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          <p className="text-xs text-gray-400 mb-4">
            {granularity === 'detail' && 'Une ligne par transaction — Date, Heure, Plat, Catégorie, Frigo, Prix'}
            {granularity === 'daily' && 'Agrégé par jour — Date, Nb ventes, CA total'}
            {granularity === 'monthly' && 'Agrégé par mois — Mois, Nb ventes, CA total'}
          </p>

          <p className="text-xs text-amber-600 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2 mb-4">
            Les prix utilisés sont les tarifs actuels des plats. Les modifications de prix ne sont pas rétroactives.
          </p>

          <button
            onClick={handleExport}
            disabled={exporting || !stats || stats.totalTransactions === 0}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-medium px-5 py-2.5 rounded-lg transition-colors"
          >
            <Download size={15} />
            {exporting ? 'Export en cours…' : 'Exporter CSV'}
          </button>
        </div>

      </div>
    </AdminLayout>
  );
}

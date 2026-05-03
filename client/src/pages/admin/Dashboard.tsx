import { useState, useEffect } from 'react';
import { Users, Star, ClipboardList, Vote } from 'lucide-react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts';
import { AdminLayout } from '../../components/admin/AdminLayout';
import api from '../../services/api';

interface DayPoint {
  date: string;
  count: number;
}

interface DishRating {
  dishId: string;
  name: string;
  average: number;
  count: number;
}

interface Stats {
  subscribers: number;
  reviews: number;
  activeSurveys: number;
  openVotes: number;
  reviewsLast30Days: DayPoint[];
  subscribersLast30Days: DayPoint[];
  ratingsByDish: DishRating[];
}

// Formate "2026-04-14" → "14/04"
function fmtDate(iso: string) {
  const [, m, d] = iso.split('-');
  return `${d}/${m}`;
}

// Tooltip personnalisé pour les line charts
function LineTooltip({ active, payload, label }: {
  active?: boolean;
  payload?: { value: number }[];
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm shadow">
      <p className="text-gray-500 mb-0.5">{label}</p>
      <p className="font-semibold text-gray-800">{payload[0].value}</p>
    </div>
  );
}

// Tooltip pour le bar chart des notes
function BarTooltip({ active, payload }: {
  active?: boolean;
  payload?: { payload: DishRating }[];
}) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm shadow max-w-[200px]">
      <p className="font-semibold text-gray-800 mb-0.5 break-words">{d.name}</p>
      <p className="text-gray-500">{d.average}/5 — {d.count} avis</p>
    </div>
  );
}

export function Dashboard() {
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    api.get('/admin/dashboard/stats')
      .then((res) => setStats(res.data))
      .catch(() => {});
  }, []);

  const kpis = [
    { label: 'Abonnés', value: stats?.subscribers ?? '—', icon: Users, color: 'bg-blue-50 text-blue-600' },
    { label: 'Avis déposés', value: stats?.reviews ?? '—', icon: Star, color: 'bg-yellow-50 text-yellow-600' },
    { label: 'Sondages actifs', value: stats?.activeSurveys ?? '—', icon: ClipboardList, color: 'bg-green-50 text-green-600' },
    { label: 'Votes en cours', value: stats?.openVotes ?? '—', icon: Vote, color: 'bg-purple-50 text-purple-600' },
  ];

  // Filtre les ticks pour n'afficher qu'environ 6 dates sur 30 jours
  function tickFilter(_date: string, index: number, data: DayPoint[]) {
    const step = Math.ceil(data.length / 6);
    return index % step === 0 || index === data.length - 1;
  }

  return (
    <AdminLayout title="Dashboard">
      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {kpis.map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="bg-white rounded-xl border border-gray-200 p-5 flex items-center gap-4">
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${color}`}>
              <Icon size={20} />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-800">{value}</p>
              <p className="text-sm text-gray-500">{label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Graphiques */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">

        {/* Avis par jour */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="text-sm font-semibold text-gray-700 mb-4">Avis déposés — 30 derniers jours</h3>
          {!stats ? (
            <div className="h-48 flex items-center justify-center text-sm text-gray-400">Chargement…</div>
          ) : (
            <ResponsiveContainer width="100%" height={180}>
              <LineChart data={stats.reviewsLast30Days} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis
                  dataKey="date"
                  tickFormatter={fmtDate}
                  tick={{ fontSize: 11, fill: '#9ca3af' }}
                  tickLine={false}
                  axisLine={false}
                  interval="preserveStartEnd"
                  ticks={stats.reviewsLast30Days
                    .filter((d, i) => tickFilter(d.date, i, stats.reviewsLast30Days))
                    .map((d) => d.date)}
                />
                <YAxis
                  allowDecimals={false}
                  tick={{ fontSize: 11, fill: '#9ca3af' }}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip content={<LineTooltip />} />
                <Line
                  type="monotone"
                  dataKey="count"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 4, strokeWidth: 0 }}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Abonnés par jour */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="text-sm font-semibold text-gray-700 mb-4">Nouveaux abonnés — 30 derniers jours</h3>
          {!stats ? (
            <div className="h-48 flex items-center justify-center text-sm text-gray-400">Chargement…</div>
          ) : (
            <ResponsiveContainer width="100%" height={180}>
              <LineChart data={stats.subscribersLast30Days} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis
                  dataKey="date"
                  tickFormatter={fmtDate}
                  tick={{ fontSize: 11, fill: '#9ca3af' }}
                  tickLine={false}
                  axisLine={false}
                  interval="preserveStartEnd"
                  ticks={stats.subscribersLast30Days
                    .filter((d, i) => tickFilter(d.date, i, stats.subscribersLast30Days))
                    .map((d) => d.date)}
                />
                <YAxis
                  allowDecimals={false}
                  tick={{ fontSize: 11, fill: '#9ca3af' }}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip content={<LineTooltip />} />
                <Line
                  type="monotone"
                  dataKey="count"
                  stroke="#10b981"
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 4, strokeWidth: 0 }}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Notes par plat */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h3 className="text-sm font-semibold text-gray-700 mb-4">Notes moyennes par plat</h3>
        {!stats ? (
          <div className="h-48 flex items-center justify-center text-sm text-gray-400">Chargement…</div>
        ) : stats.ratingsByDish.length === 0 ? (
          <div className="h-32 flex items-center justify-center text-sm text-gray-400">
            Aucun avis pour l'instant.
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <BarChart
              data={stats.ratingsByDish}
              layout="vertical"
              margin={{ top: 0, right: 40, left: 8, bottom: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" horizontal={false} />
              <XAxis
                type="number"
                domain={[0, 5]}
                ticks={[0, 1, 2, 3, 4, 5]}
                tick={{ fontSize: 11, fill: '#9ca3af' }}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                type="category"
                dataKey="name"
                width={140}
                tick={{ fontSize: 11, fill: '#374151' }}
                tickLine={false}
                axisLine={false}
                tickFormatter={(v: string) => v.length > 20 ? v.slice(0, 19) + '…' : v}
              />
              <Tooltip content={<BarTooltip />} cursor={{ fill: '#f9fafb' }} />
              <Bar dataKey="average" fill="#f59e0b" radius={[0, 4, 4, 0]} barSize={16} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </AdminLayout>
  );
}

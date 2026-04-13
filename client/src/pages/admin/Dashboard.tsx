import { AdminLayout } from '../../components/admin/AdminLayout';
import { Users, Star, ClipboardList, Vote } from 'lucide-react';

const stats = [
  { label: 'Abonnés', value: '—', icon: Users, color: 'bg-blue-50 text-blue-600' },
  { label: 'Avis déposés', value: '—', icon: Star, color: 'bg-yellow-50 text-yellow-600' },
  { label: 'Sondages actifs', value: '—', icon: ClipboardList, color: 'bg-green-50 text-green-600' },
  { label: 'Votes en cours', value: '—', icon: Vote, color: 'bg-purple-50 text-purple-600' },
];

export function Dashboard() {
  return (
    <AdminLayout title="Dashboard">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {stats.map(({ label, value, icon: Icon, color }) => (
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

      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <p className="text-sm text-gray-400 text-center py-8">
          Les statistiques seront disponibles une fois les données connectées.
        </p>
      </div>
    </AdminLayout>
  );
}

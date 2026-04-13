import { Bell, Mail, Smartphone, Clock, AlertTriangle } from 'lucide-react';
import { AdminLayout } from '../../components/admin/AdminLayout';

const features = [
  {
    icon: Mail,
    title: 'Campagnes email (Mailchimp)',
    description: 'Envoi automatique aux abonnés ayant consenti à recevoir des emails. Synchronisation des contacts et déclenchement de campagnes via l\'API Mailchimp.',
    status: 'À venir',
  },
  {
    icon: Smartphone,
    title: 'Notifications push (Web Push)',
    description: 'Notifications navigateur pour les abonnés ayant consenti aux push. Nécessite la confirmation du mode de déploiement (web app ou mobile).',
    status: 'À confirmer',
  },
  {
    icon: Clock,
    title: 'Fréquence configurable',
    description: 'Paramétrage de la fréquence d\'envoi (hebdomadaire, bi-mensuelle…) directement depuis le panel admin.',
    status: 'À venir',
  },
];

export function Notifications() {
  return (
    <AdminLayout title="Notifications">
      <div className="flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 mb-6">
        <AlertTriangle size={16} className="text-amber-500 flex-shrink-0" />
        <p className="text-sm text-amber-700">
          <span className="font-semibold">Module en cours de développement.</span>{' '}
          L'intégration Mailchimp et les notifications push seront disponibles prochainement.
        </p>
      </div>

      <div className="mb-6">
        <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center mb-3">
          <Bell size={22} className="text-blue-600" />
        </div>
        <h3 className="text-base font-semibold text-gray-800">Fonctionnalités prévues</h3>
        <p className="text-sm text-gray-500 mt-1">
          Ce module permettra d'informer vos abonnés des nouveaux menus, plats du jour et résultats de votes.
        </p>
      </div>

      <div className="space-y-3">
        {features.map(({ icon: Icon, title, description, status }) => (
          <div key={title} className="bg-white rounded-xl border border-gray-200 p-5 flex items-start gap-4">
            <div className="w-9 h-9 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0 mt-0.5">
              <Icon size={17} className="text-gray-500" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <p className="text-sm font-semibold text-gray-800">{title}</p>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                  status === 'À confirmer'
                    ? 'bg-orange-100 text-orange-600'
                    : 'bg-blue-100 text-blue-600'
                }`}>
                  {status}
                </span>
              </div>
              <p className="text-sm text-gray-500">{description}</p>
            </div>
          </div>
        ))}
      </div>
    </AdminLayout>
  );
}

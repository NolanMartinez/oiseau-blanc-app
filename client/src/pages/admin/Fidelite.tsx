import { useEffect, useState } from 'react';
import { Gift, Save, Coins } from 'lucide-react';
import { AdminLayout } from '../../components/admin/AdminLayout';
import api from '../../services/api';

interface LoyaltyConfig {
  enabled: boolean;
  eurosPerPoint: number;
  pointsReward: number;
}

export function Fidelite() {
  const [config, setConfig] = useState<LoyaltyConfig>({ enabled: true, eurosPerPoint: 1, pointsReward: 100 });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    api
      .get('/admin/loyalty/settings')
      .then((res) => setConfig(res.data))
      .catch(() => setError('Impossible de charger la configuration.'))
      .finally(() => setLoading(false));
  }, []);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (config.eurosPerPoint <= 0 || config.pointsReward <= 0) {
      setError('Les valeurs doivent être supérieures à 0.');
      return;
    }
    setSaving(true);
    setSaved(false);
    setError('');
    try {
      const res = await api.put('/admin/loyalty/settings', {
        enabled: config.enabled,
        eurosPerPoint: Number(config.eurosPerPoint),
        pointsReward: Number(config.pointsReward),
      });
      setConfig(res.data);
      setSaved(true);
    } catch {
      setError('Erreur lors de l\'enregistrement.');
    } finally {
      setSaving(false);
    }
  }

  // Exemple concret pour l'admin : combien pour un repas offert ?
  const eurosForReward = config.eurosPerPoint * config.pointsReward;

  return (
    <AdminLayout title="Fidélité">
      <div className="max-w-xl space-y-6">
        {/* Explication */}
        <div className="bg-white rounded-xl border border-gray-200 p-4 flex items-start gap-3">
          <div className="w-9 h-9 rounded-lg bg-green-50 flex items-center justify-center flex-shrink-0">
            <Gift size={17} className="text-green-600" />
          </div>
          <p className="text-sm text-gray-600">
            Le client cumule des points à chaque achat en s'identifiant (email ou téléphone) sur la borne.
            Une fois le seuil atteint, il bénéficie d'un <span className="font-semibold text-gray-800">repas offert</span>.
          </p>
        </div>

        {loading ? (
          <p className="text-sm text-gray-500">Chargement…</p>
        ) : (
          <form onSubmit={handleSave} className="bg-white rounded-xl border border-gray-200 p-5 space-y-5">
            {/* Activer / désactiver */}
            <label className="flex items-center justify-between gap-3 cursor-pointer">
              <span className="text-sm font-medium text-gray-800">Programme de fidélité activé</span>
              <input
                type="checkbox"
                checked={config.enabled}
                onChange={(e) => { setConfig({ ...config, enabled: e.target.checked }); setSaved(false); }}
                className="h-5 w-5 accent-green-600"
              />
            </label>

            <div className="border-t border-gray-100" />

            {/* Euros par point */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1.5">
                Montant pour gagner 1 point (en €)
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min={0.5}
                  step={0.5}
                  value={config.eurosPerPoint}
                  onChange={(e) => { setConfig({ ...config, eurosPerPoint: Number(e.target.value) }); setSaved(false); }}
                  className="w-32 px-3 py-2.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:border-green-400"
                />
                <span className="text-sm text-gray-500">€ dépensé = 1 point</span>
              </div>
            </div>

            {/* Points pour récompense */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1.5">
                Points nécessaires pour un repas offert
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min={1}
                  step={1}
                  value={config.pointsReward}
                  onChange={(e) => { setConfig({ ...config, pointsReward: Number(e.target.value) }); setSaved(false); }}
                  className="w-32 px-3 py-2.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:border-green-400"
                />
                <span className="text-sm text-gray-500">points = 1 repas offert</span>
              </div>
            </div>

            {/* Récap concret */}
            <div className="flex items-center gap-2 text-sm text-gray-600 bg-gray-50 border border-gray-100 rounded-lg px-3 py-2.5">
              <Coins size={15} className="text-amber-500" />
              <span>
                Soit un repas offert tous les{' '}
                <span className="font-semibold text-gray-800">{eurosForReward.toLocaleString('fr-FR')} €</span> dépensés.
              </span>
            </div>

            {error && (
              <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
                {error}
              </p>
            )}
            {saved && (
              <p className="text-sm text-green-700 bg-green-50 border border-green-100 rounded-lg px-3 py-2">
                Configuration enregistrée.
              </p>
            )}

            <button
              type="submit"
              disabled={saving}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg bg-green-600 text-white text-sm font-semibold hover:bg-green-700 transition-colors disabled:opacity-50"
            >
              <Save size={14} />
              {saving ? 'Enregistrement…' : 'Enregistrer'}
            </button>
          </form>
        )}
      </div>
    </AdminLayout>
  );
}

import { useEffect, useState } from 'react';
import { Building2, Save, ReceiptText } from 'lucide-react';
import { AdminLayout } from '../../components/admin/AdminLayout';
import api from '../../services/api';

interface Company {
  name: string;
  address: string;
  siret: string;
  tvaNumber: string;
  tvaRate: number;
}

export function Entreprise() {
  const [c, setC] = useState<Company>({ name: '', address: '', siret: '', tvaNumber: '', tvaRate: 10 });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get('/admin/company/settings')
      .then((res) => setC(res.data))
      .catch(() => setError('Impossible de charger les coordonnées.'))
      .finally(() => setLoading(false));
  }, []);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!c.name.trim()) { setError('La raison sociale est requise.'); return; }
    setSaving(true); setSaved(false); setError('');
    try {
      const res = await api.put('/admin/company/settings', {
        name: c.name.trim(),
        address: c.address.trim(),
        siret: c.siret.trim(),
        tvaNumber: c.tvaNumber.trim(),
        tvaRate: Number(c.tvaRate),
      });
      setC(res.data);
      setSaved(true);
    } catch {
      setError('Erreur lors de l\'enregistrement.');
    } finally {
      setSaving(false);
    }
  }

  const field = (k: keyof Company) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setC({ ...c, [k]: k === 'tvaRate' ? Number(e.target.value) : e.target.value });
    setSaved(false);
  };
  const input = 'w-full px-3 py-2.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:border-green-400';
  const label = 'block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1.5';

  return (
    <AdminLayout title="Entreprise & reçus">
      <div className="max-w-xl space-y-6">
        <div className="bg-white rounded-xl border border-gray-200 p-4 flex items-start gap-3">
          <div className="w-9 h-9 rounded-lg bg-green-50 flex items-center justify-center flex-shrink-0">
            <ReceiptText size={17} className="text-green-600" />
          </div>
          <p className="text-sm text-gray-600">
            Ces informations apparaissent sur les <span className="font-semibold text-gray-800">justificatifs d'achat</span> envoyés par email aux clients (reçus avec le détail HT / TVA / TTC).
          </p>
        </div>

        {loading ? (
          <p className="text-sm text-gray-500">Chargement…</p>
        ) : (
          <form onSubmit={handleSave} className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
            <div className="flex items-center gap-2 text-gray-800 font-semibold text-sm">
              <Building2 size={16} className="text-green-600" /> Coordonnées
            </div>
            <div>
              <label className={label}>Raison sociale *</label>
              <input value={c.name} onChange={field('name')} placeholder="L'Oiseau Blanc Traiteur" className={input} />
            </div>
            <div>
              <label className={label}>Adresse</label>
              <input value={c.address} onChange={field('address')} placeholder="59 rue Roger Salengro, 59770 Marly" className={input} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={label}>SIRET</label>
                <input value={c.siret} onChange={field('siret')} placeholder="123 456 789 00012" className={input} />
              </div>
              <div>
                <label className={label}>N° TVA (facultatif)</label>
                <input value={c.tvaNumber} onChange={field('tvaNumber')} placeholder="FR..." className={input} />
              </div>
            </div>
            <div>
              <label className={label}>Taux de TVA (%)</label>
              <div className="flex items-center gap-2">
                <input type="number" min={0} max={100} step={0.1} value={c.tvaRate} onChange={field('tvaRate')} className="w-28 px-3 py-2.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:border-green-400" />
                <span className="text-sm text-gray-500">appliqué aux plats (restauration à emporter : souvent 10 %)</span>
              </div>
            </div>

            {error && <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{error}</p>}
            {saved && <p className="text-sm text-green-700 bg-green-50 border border-green-100 rounded-lg px-3 py-2">Coordonnées enregistrées.</p>}

            <button type="submit" disabled={saving} className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg bg-green-600 text-white text-sm font-semibold hover:bg-green-700 transition-colors disabled:opacity-50">
              <Save size={14} />
              {saving ? 'Enregistrement…' : 'Enregistrer'}
            </button>
          </form>
        )}
      </div>
    </AdminLayout>
  );
}

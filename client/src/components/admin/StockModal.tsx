import { useState } from 'react';
import { X } from 'lucide-react';
import api from '../../services/api';

interface StockModalProps {
  frigoId: string;
  frigoName: string;
  // Mode édition : le plat est déjà choisi. Mode création : null.
  fixedDish: { id: string; name: string } | null;
  // Mode création : plats du catalogue affectables (actifs, pas déjà dans le frigo).
  availableDishes: { id: string; name: string }[];
  initialQuantity?: number;
  initialExpiryDate?: string | null;
  stockId?: string | null;
  initialPromoPercent?: number | null;
  onClose: () => void;
  onSaved: () => void;
}

export function StockModal({
  frigoId,
  frigoName,
  fixedDish,
  availableDishes,
  initialQuantity,
  initialExpiryDate,
  stockId,
  initialPromoPercent,
  onClose,
  onSaved,
}: StockModalProps) {
  const isEdit = fixedDish !== null;
  const [dishId, setDishId] = useState(fixedDish?.id ?? availableDishes[0]?.id ?? '');
  const [quantity, setQuantity] = useState(String(initialQuantity ?? 0));
  const [expiryDate, setExpiryDate] = useState(
    initialExpiryDate ? initialExpiryDate.slice(0, 10) : '',
  );
  const [promoPercent, setPromoPercent] = useState(String(initialPromoPercent ?? 0));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const noDishAvailable = !isEdit && availableDishes.length === 0;

  async function handleSave() {
    setError('');
    if (!dishId) { setError('Choisissez un plat.'); return; }
    const qty = parseInt(quantity, 10);
    if (Number.isNaN(qty) || qty < 0) { setError('La quantité doit être un entier positif.'); return; }
    const promo = promoPercent !== '' ? parseInt(promoPercent, 10) : 0;
    if (Number.isNaN(promo) || promo < 0 || promo > 95) { setError('La remise doit être comprise entre 0 et 95%.'); return; }

    setLoading(true);
    try {
      if (stockId) {
        await api.patch(`/admin/stock/${stockId}`, {
          quantity: qty,
          expiryDate: expiryDate || null,
          promoPercent: promo > 0 ? promo : null,
        });
      } else {
        await api.post('/admin/stock', {
          frigoId,
          dishId,
          quantity: qty,
          expiryDate: expiryDate || null,
        });
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
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <div>
            <h2 className="font-semibold text-gray-800">
              {isEdit ? 'Modifier le stock' : 'Ajouter un plat'}
            </h2>
            <p className="text-xs text-gray-400 mt-0.5">{frigoName}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4">
          {/* Plat */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Plat</label>
            {isEdit ? (
              <p className="text-sm text-gray-800 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2">
                {fixedDish.name}
              </p>
            ) : noDishAvailable ? (
              <p className="text-sm text-gray-500 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2">
                Tous les plats actifs sont déjà affectés à ce frigo.
              </p>
            ) : (
              <select
                value={dishId}
                onChange={(e) => setDishId(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {availableDishes.map((d) => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>
            )}
          </div>

          {/* Quantité */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Quantité en stock</label>
            <input
              type="number"
              min="0"
              step="1"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Date limite de consommation */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Date limite de consommation
            </label>
            <input
              type="date"
              value={expiryDate}
              onChange={(e) => setExpiryDate(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <p className="text-xs text-gray-400 mt-1">
              Utilisée pour suggérer des promotions à l'approche de la péremption.
            </p>
          </div>

          {/* Remise promotionnelle — uniquement en mode édition */}
          {isEdit && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Remise promotionnelle (%)
              </label>
              <input
                type="number"
                min="0"
                max="95"
                step="1"
                value={promoPercent}
                onChange={(e) => setPromoPercent(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="0"
              />
              <p className="text-xs text-gray-400 mt-1">
                0 = pas de promotion. Uniquement pour ce frigo.
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200 gap-3">
          {error ? <p className="text-sm text-red-600">{error}</p> : <span />}
          <div className="flex gap-3 flex-shrink-0">
            <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 transition-colors">
              Annuler
            </button>
            <button
              onClick={handleSave}
              disabled={loading || noDishAvailable}
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

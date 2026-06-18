import { useState, useEffect } from 'react';
import { Refrigerator, Wifi, WifiOff, ChevronDown, ChevronUp, Plus, Pencil, Trash2 } from 'lucide-react';
import { AdminLayout } from '../../components/admin/AdminLayout';
import { StockModal } from '../../components/admin/StockModal';
import api from '../../services/api';
import type { Fridge, FridgeDish, CatalogDish } from '../../types/dish';

function formatSync(iso: string) {
  const diff = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (diff < 1) return 'À l\'instant';
  if (diff < 60) return `Il y a ${diff} min`;
  return `Il y a ${Math.round(diff / 60)} h`;
}

function StockBadge({ stock }: { stock: number }) {
  if (stock === 0) return (
    <span className="text-xs font-medium text-red-600 bg-red-50 px-2 py-0.5 rounded-full">Rupture</span>
  );
  if (stock <= 2) return (
    <span className="text-xs font-medium text-orange-600 bg-orange-50 px-2 py-0.5 rounded-full">{stock} restant{stock > 1 ? 's' : ''}</span>
  );
  return (
    <span className="text-xs font-medium text-green-700 bg-green-50 px-2 py-0.5 rounded-full">{stock} en stock</span>
  );
}

// Pastille date limite de consommation : rouge ≤3j, orange ≤7j, neutre au-delà
function DlcBadge({ expiryDate }: { expiryDate: string | null }) {
  if (!expiryDate) return <span className="text-xs text-gray-300">—</span>;
  const days = Math.ceil((new Date(expiryDate).getTime() - Date.now()) / 86400000);
  const dateStr = new Date(expiryDate).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' });

  let label: string;
  let cls: string;
  if (days < 0) {
    label = `${dateStr} · périmé`;
    cls = 'text-red-600 bg-red-50';
  } else if (days === 0) {
    label = `${dateStr} · aujourd'hui`;
    cls = 'text-red-600 bg-red-50';
  } else if (days <= 3) {
    label = `${dateStr} · J-${days}`;
    cls = 'text-red-600 bg-red-50';
  } else if (days <= 7) {
    label = `${dateStr} · J-${days}`;
    cls = 'text-orange-600 bg-orange-50';
  } else {
    label = dateStr;
    cls = 'text-gray-500 bg-gray-100';
  }
  return <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${cls}`}>{label}</span>;
}

function PriceCell({ dish }: { dish: FridgeDish }) {
  if (dish.promoPercent && dish.promoPercent > 0) {
    return (
      <div className="flex items-center gap-1.5">
        <span className="text-gray-400 line-through">{dish.price.toFixed(2)} €</span>
        <span className="text-green-700 font-semibold">{dish.finalPrice.toFixed(2)} €</span>
        <span className="text-[10px] font-bold text-white bg-red-500 px-1.5 py-0.5 rounded">
          -{dish.promoPercent}%
        </span>
      </div>
    );
  }
  return <span className="text-gray-700 font-medium">{dish.price.toFixed(2)} €</span>;
}

function FridgeCard({
  fridge,
  onAddDish,
  onEditDish,
  onRemoveDish,
}: {
  fridge: Fridge;
  onAddDish: (fridge: Fridge) => void;
  onEditDish: (fridge: Fridge, dish: FridgeDish) => void;
  onRemoveDish: (dish: FridgeDish) => void;
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className={`bg-white rounded-xl border overflow-hidden transition-all ${
      fridge.online ? 'border-gray-200' : 'border-gray-200 opacity-80'
    }`}>
      <div
        className="flex items-center justify-between p-5 cursor-pointer select-none"
        onClick={() => setExpanded((v) => !v)}
      >
        <div className="flex items-center gap-4 min-w-0">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
            fridge.online ? 'bg-blue-50' : 'bg-gray-100'
          }`}>
            <Refrigerator size={20} className={fridge.online ? 'text-blue-600' : 'text-gray-400'} />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="font-semibold text-gray-800 truncate">{fridge.name}</p>
              {fridge.online ? (
                <span className="flex items-center gap-1 text-xs text-green-700 bg-green-50 px-2 py-0.5 rounded-full font-medium flex-shrink-0">
                  <Wifi size={11} />En ligne
                </span>
              ) : (
                <span className="flex items-center gap-1 text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full font-medium flex-shrink-0">
                  <WifiOff size={11} />Hors ligne
                </span>
              )}
            </div>
            <p className="text-xs text-gray-400 mt-0.5 truncate">{fridge.location}</p>
          </div>
        </div>

        <div className="flex items-center gap-3 sm:gap-6 flex-shrink-0">
          {fridge.online && fridge.temperature !== null && (
            <div className="text-right hidden sm:block">
              <p className="text-lg font-bold text-gray-800">{fridge.temperature}°C</p>
              <p className="text-xs text-gray-400">Température</p>
            </div>
          )}
          <div className="text-right">
            <p className="text-sm font-semibold text-gray-700">{fridge.dishes.length}</p>
            <p className="text-xs text-gray-400">Plats</p>
          </div>
          <div className="text-right hidden sm:block">
            <p className="text-xs text-gray-400">{formatSync(fridge.lastSync)}</p>
            <p className="text-xs text-gray-300">Sync</p>
          </div>
          {expanded ? (
            <ChevronUp size={16} className="text-gray-400" />
          ) : (
            <ChevronDown size={16} className="text-gray-400" />
          )}
        </div>
      </div>

      {expanded && (
        <div className="border-t border-gray-100">
          {fridge.dishes.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-6">Aucun plat dans ce frigo.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="text-left px-5 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Plat</th>
                    <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Prix</th>
                    <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Stock</th>
                    <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">DLC</th>
                    <th className="px-4 py-2.5" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {fridge.dishes.map((dish) => (
                    <tr key={dish.stockId} className="hover:bg-gray-50 transition-colors">
                      <td className="px-5 py-3">
                        <p className="font-medium text-gray-800">{dish.name}</p>
                        <p className="text-xs text-gray-400">{dish.category}</p>
                      </td>
                      <td className="px-4 py-3"><PriceCell dish={dish} /></td>
                      <td className="px-4 py-3"><StockBadge stock={dish.stock} /></td>
                      <td className="px-4 py-3"><DlcBadge expiryDate={dish.expiryDate} /></td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => onEditDish(fridge, dish)}
                            title="Modifier le stock"
                            className="text-gray-400 hover:text-gray-700 transition-colors"
                          >
                            <Pencil size={15} />
                          </button>
                          <button
                            onClick={() => onRemoveDish(dish)}
                            title="Retirer du frigo"
                            className="text-gray-400 hover:text-red-500 transition-colors"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <div className="p-4 border-t border-gray-100">
            <button
              onClick={() => onAddDish(fridge)}
              className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700 font-medium transition-colors"
            >
              <Plus size={15} />
              Ajouter un plat à ce frigo
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

interface ModalState {
  frigoId: string;
  frigoName: string;
  fixedDish: { id: string; name: string } | null;
  availableDishes: { id: string; name: string }[];
  initialQuantity?: number;
  initialExpiryDate?: string | null;
  stockId?: string | null;
  initialPromoPercent?: number | null;
}

export function Frigos() {
  const [fridges, setFridges] = useState<Fridge[]>([]);
  const [catalog, setCatalog] = useState<CatalogDish[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<ModalState | null>(null);

  async function fetchData() {
    setLoading(true);
    try {
      const [frigosRes, dishesRes] = await Promise.all([
        api.get('/admin/frigos'),
        api.get('/admin/dishes'),
      ]);
      setFridges(frigosRes.data.fridges);
      setCatalog(dishesRes.data.dishes);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { fetchData(); }, []);

  function handleAddDish(fridge: Fridge) {
    const assigned = new Set(fridge.dishes.map((d) => d.id));
    const available = catalog
      .filter((d) => d.isActive && !assigned.has(d.id))
      .map((d) => ({ id: d.id, name: d.name }));
    setModal({
      frigoId: fridge.id,
      frigoName: fridge.name,
      fixedDish: null,
      availableDishes: available,
    });
  }

  function handleEditDish(fridge: Fridge, dish: FridgeDish) {
    setModal({
      frigoId: fridge.id,
      frigoName: fridge.name,
      fixedDish: { id: dish.id, name: dish.name },
      availableDishes: [],
      initialQuantity: dish.stock,
      initialExpiryDate: dish.expiryDate,
      stockId: dish.stockId,
      initialPromoPercent: dish.promoPercent,
    });
  }

  async function handleRemoveDish(dish: FridgeDish) {
    if (!confirm(`Retirer « ${dish.name} » de ce frigo ?`)) return;
    await api.delete(`/admin/stock/${dish.stockId}`);
    fetchData();
  }

  function handleSaved() {
    setModal(null);
    fetchData();
  }

  const online = fridges.filter((f) => f.online).length;

  return (
    <AdminLayout title="Frigos">
      {!loading && (
        <div className="flex items-center gap-6 mb-5">
          <p className="text-sm text-gray-500">{fridges.length} frigo{fridges.length !== 1 ? 's' : ''}</p>
          <span className="text-gray-200">|</span>
          <p className="text-sm text-green-600 font-medium">{online} en ligne</p>
          {fridges.length - online > 0 && (
            <>
              <span className="text-gray-200">|</span>
              <p className="text-sm text-gray-400">{fridges.length - online} hors ligne</p>
            </>
          )}
        </div>
      )}

      {loading ? (
        <div className="text-sm text-gray-400 text-center py-12">Chargement…</div>
      ) : (
        <div className="space-y-3">
          {fridges.map((fridge) => (
            <FridgeCard
              key={fridge.id}
              fridge={fridge}
              onAddDish={handleAddDish}
              onEditDish={handleEditDish}
              onRemoveDish={handleRemoveDish}
            />
          ))}
        </div>
      )}

      {modal && (
        <StockModal
          frigoId={modal.frigoId}
          frigoName={modal.frigoName}
          fixedDish={modal.fixedDish}
          availableDishes={modal.availableDishes}
          initialQuantity={modal.initialQuantity}
          initialExpiryDate={modal.initialExpiryDate}
          stockId={modal.stockId}
          initialPromoPercent={modal.initialPromoPercent}
          onClose={() => setModal(null)}
          onSaved={handleSaved}
        />
      )}
    </AdminLayout>
  );
}

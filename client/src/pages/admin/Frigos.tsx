import { useState, useEffect } from 'react';
import { Refrigerator, Wifi, WifiOff, ChevronDown, ChevronUp, AlertTriangle } from 'lucide-react';
import { AdminLayout } from '../../components/admin/AdminLayout';
import api from '../../services/api';

interface Dish {
  id: string;
  name: string;
  category: string;
  price: number;
  stock: number;
  allergens: string[];
}

interface Fridge {
  id: string;
  name: string;
  location: string;
  online: boolean;
  temperature: number | null;
  lastSync: string;
  dishes: Dish[];
}

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

function FridgeCard({ fridge }: { fridge: Fridge }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className={`bg-white rounded-xl border overflow-hidden transition-all ${
      fridge.online ? 'border-gray-200' : 'border-gray-200 opacity-80'
    }`}>
      <div
        className="flex items-center justify-between p-5 cursor-pointer select-none"
        onClick={() => setExpanded((v) => !v)}
      >
        <div className="flex items-center gap-4">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
            fridge.online ? 'bg-blue-50' : 'bg-gray-100'
          }`}>
            <Refrigerator size={20} className={fridge.online ? 'text-blue-600' : 'text-gray-400'} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <p className="font-semibold text-gray-800">{fridge.name}</p>
              {fridge.online ? (
                <span className="flex items-center gap-1 text-xs text-green-700 bg-green-50 px-2 py-0.5 rounded-full font-medium">
                  <Wifi size={11} />En ligne
                </span>
              ) : (
                <span className="flex items-center gap-1 text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full font-medium">
                  <WifiOff size={11} />Hors ligne
                </span>
              )}
            </div>
            <p className="text-xs text-gray-400 mt-0.5">{fridge.location}</p>
          </div>
        </div>

        <div className="flex items-center gap-6 flex-shrink-0">
          {fridge.online && fridge.temperature !== null && (
            <div className="text-right">
              <p className="text-lg font-bold text-gray-800">{fridge.temperature}°C</p>
              <p className="text-xs text-gray-400">Température</p>
            </div>
          )}
          <div className="text-right">
            <p className="text-sm font-semibold text-gray-700">{fridge.dishes.length}</p>
            <p className="text-xs text-gray-400">Plats</p>
          </div>
          <div className="text-right">
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
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left px-5 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Plat</th>
                  <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Catégorie</th>
                  <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Prix</th>
                  <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Stock</th>
                  <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Allergènes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {fridge.dishes.map((dish) => (
                  <tr key={dish.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-5 py-3 font-medium text-gray-800">{dish.name}</td>
                    <td className="px-4 py-3 text-gray-500">{dish.category}</td>
                    <td className="px-4 py-3 text-gray-700 font-medium">{dish.price.toFixed(2)} €</td>
                    <td className="px-4 py-3">
                      <StockBadge stock={dish.stock} />
                    </td>
                    <td className="px-4 py-3 text-gray-400 text-xs">
                      {dish.allergens.length > 0 ? dish.allergens.join(', ') : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}

export function Frigos() {
  const [fridges, setFridges] = useState<Fridge[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/admin/frigos')
      .then((res) => setFridges(res.data.fridges))
      .finally(() => setLoading(false));
  }, []);

  const online = fridges.filter((f) => f.online).length;

  return (
    <AdminLayout title="Frigos & Plats">
      {/* Bannière mock */}
      <div className="flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 mb-5">
        <AlertTriangle size={16} className="text-amber-500 flex-shrink-0" />
        <p className="text-sm text-amber-700">
          <span className="font-semibold">Données simulées</span> — En attente de la clé API Bicom.
          Ces données sont des exemples et ne reflètent pas le stock réel.
        </p>
      </div>

      {/* Stats rapides */}
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
            <FridgeCard key={fridge.id} fridge={fridge} />
          ))}
        </div>
      )}
    </AdminLayout>
  );
}

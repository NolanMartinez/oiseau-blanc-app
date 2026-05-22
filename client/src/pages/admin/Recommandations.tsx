import { useState, useEffect } from 'react';
import {
  Lightbulb,
  TrendingUp,
  TrendingDown,
  Eye,
  Tag,
  AlertTriangle,
  Sliders,
} from 'lucide-react';
import { AdminLayout } from '../../components/admin/AdminLayout';
import { StockModal } from '../../components/admin/StockModal';
import api from '../../services/api';

// ─── Types ────────────────────────────────────────────────────────────────────

interface PromoSuggestion {
  stockId: string;
  frigoId: string;
  frigoName: string;
  dishId: string;
  dishName: string;
  quantity: number;
  expiryDate: string;
  daysLeft: number;
  expired: boolean;
  suggestedPromoPercent: number | null;
  price: number;
  promoPrice: number | null;
  urgency: 'haute' | 'moyenne';
}

interface StockAdvice {
  stockId: string;
  frigoId: string;
  frigoName: string;
  dishId: string;
  dishName: string;
  category: string;
  quantity: number;
  expiryDate: string | null;
  type: 'augmenter' | 'reduire' | 'surveiller';
  message: string;
  recommendedQuantity: number | null;
  salesCount: number;
  crossNote: string | null;
}

function expiryLabel(promo: PromoSuggestion): string {
  if (promo.daysLeft < 0) return 'Périmé';
  if (promo.daysLeft === 0) return 'Périme aujourd\'hui';
  if (promo.daysLeft === 1) return 'Périme demain';
  return `Périme dans ${promo.daysLeft} jours`;
}

// ─── Carte promo ──────────────────────────────────────────────────────────────

function PromoCard({
  promo,
  onApplied,
  onIgnored,
}: {
  promo: PromoSuggestion;
  onApplied: () => void;
  onIgnored: () => void;
}) {
  const [percent, setPercent] = useState(promo.suggestedPromoPercent ?? 30);
  const [loading, setLoading] = useState(false);

  const promoPrice = Math.round(promo.price * (1 - percent / 100) * 100) / 100;

  async function applyPromo() {
    setLoading(true);
    try {
      await api.patch(`/admin/stock/${promo.stockId}`, { promoPercent: percent });
      onApplied();
    } finally {
      setLoading(false);
    }
  }

  async function removeStock() {
    if (!confirm(`Retirer « ${promo.dishName} » du ${promo.frigoName} ?`)) return;
    setLoading(true);
    try {
      await api.delete(`/admin/stock/${promo.stockId}`);
      onApplied();
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className={`rounded-xl border p-4 ${promo.expired ? 'border-red-200 bg-red-50' : 'border-gray-200 bg-white'}`}
    >
      <div className="flex items-start justify-between gap-3 mb-2">
        <div className="min-w-0">
          <p className="font-semibold text-gray-800 truncate">{promo.dishName}</p>
          <p className="text-xs text-gray-400 mt-0.5">{promo.frigoName}</p>
        </div>
        <span
          className={`text-xs font-medium px-2 py-0.5 rounded-full flex-shrink-0 ${
            promo.expired || promo.daysLeft <= 2
              ? 'text-red-600 bg-red-100'
              : 'text-orange-600 bg-orange-100'
          }`}
        >
          {expiryLabel(promo)}
        </span>
      </div>

      <p className="text-xs text-gray-500 mb-3">
        {promo.quantity} en stock · DLC {new Date(promo.expiryDate).toLocaleDateString('fr-FR')}
      </p>

      {promo.expired ? (
        <div className="flex items-center justify-between gap-3">
          <p className="text-xs text-red-600 flex items-center gap-1.5">
            <AlertTriangle size={14} />
            Plat périmé — à retirer du frigo.
          </p>
          <button
            onClick={removeStock}
            disabled={loading}
            className="px-3 py-1.5 text-sm bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white font-medium rounded-lg transition-colors flex-shrink-0"
          >
            Retirer
          </button>
        </div>
      ) : (
        <>
          <div className="flex items-center gap-2 mb-3">
            <span className="text-gray-400 line-through text-sm">{promo.price.toFixed(2)} €</span>
            <span className="text-green-700 font-bold">{promoPrice.toFixed(2)} €</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 border border-gray-300 rounded-lg px-2 py-1.5">
              <input
                type="number"
                min="1"
                max="95"
                value={percent}
                onChange={(e) => setPercent(Math.min(95, Math.max(1, Number(e.target.value) || 0)))}
                className="w-12 text-sm text-center focus:outline-none"
              />
              <span className="text-sm text-gray-400">%</span>
            </div>
            <button
              onClick={applyPromo}
              disabled={loading}
              className="flex-1 px-3 py-2 text-sm bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-medium rounded-lg transition-colors"
            >
              {loading ? 'Application…' : 'Appliquer la promo'}
            </button>
            <button
              onClick={onIgnored}
              disabled={loading}
              className="px-3 py-2 text-sm text-gray-500 hover:text-gray-700 transition-colors"
            >
              Ignorer
            </button>
          </div>
        </>
      )}
    </div>
  );
}

// ─── Carte conseil de stock ───────────────────────────────────────────────────

const ADVICE_STYLE: Record<
  StockAdvice['type'],
  { label: string; icon: typeof TrendingUp; cls: string }
> = {
  augmenter: { label: 'Augmenter le stock', icon: TrendingUp, cls: 'text-green-700 bg-green-50' },
  reduire: { label: 'Réduire le stock', icon: TrendingDown, cls: 'text-orange-700 bg-orange-50' },
  surveiller: { label: 'À surveiller', icon: Eye, cls: 'text-gray-600 bg-gray-100' },
};

function AdviceCard({ advice, onAdjust }: { advice: StockAdvice; onAdjust: (a: StockAdvice) => void }) {
  const style = ADVICE_STYLE[advice.type];
  const Icon = style.icon;
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4">
      <div className="flex items-start justify-between gap-3 mb-2">
        <div className="min-w-0">
          <p className="font-semibold text-gray-800 truncate">{advice.dishName}</p>
          <p className="text-xs text-gray-400 mt-0.5">{advice.frigoName}</p>
        </div>
        <span className={`flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full flex-shrink-0 ${style.cls}`}>
          <Icon size={12} />
          {style.label}
        </span>
      </div>
      <p className="text-sm text-gray-600">{advice.message}</p>
      {advice.crossNote && (
        <p className="text-xs text-blue-600 mt-1.5 flex items-center gap-1.5">
          <TrendingUp size={12} />
          {advice.crossNote}
        </p>
      )}
      <div className="flex items-center justify-between gap-3 mt-3">
        <p className="text-xs text-gray-400">
          Stock actuel : {advice.quantity}
          {advice.recommendedQuantity !== null && ` · suggéré : ${advice.recommendedQuantity}`}
        </p>
        <button
          onClick={() => onAdjust(advice)}
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium rounded-lg transition-colors flex-shrink-0"
        >
          <Sliders size={14} />
          Ajuster
        </button>
      </div>
    </div>
  );
}

// ─── Page principale ──────────────────────────────────────────────────────────

interface AdjustModalState {
  frigoId: string;
  frigoName: string;
  fixedDish: { id: string; name: string };
  initialQuantity: number;
  initialExpiryDate: string | null;
}

export function Recommandations() {
  const [promos, setPromos] = useState<PromoSuggestion[]>([]);
  const [advice, setAdvice] = useState<StockAdvice[]>([]);
  const [loading, setLoading] = useState(true);
  const [ignored, setIgnored] = useState<Set<string>>(new Set());
  const [adjust, setAdjust] = useState<AdjustModalState | null>(null);

  async function fetchRecommendations() {
    setLoading(true);
    try {
      const res = await api.get('/admin/recommendations');
      setPromos(res.data.promoSuggestions);
      setAdvice(res.data.stockAdvice);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { fetchRecommendations(); }, []);

  function handleIgnore(stockId: string) {
    setIgnored((prev) => new Set(prev).add(stockId));
  }

  function handleAdjust(a: StockAdvice) {
    setAdjust({
      frigoId: a.frigoId,
      frigoName: a.frigoName,
      fixedDish: { id: a.dishId, name: a.dishName },
      initialQuantity: a.recommendedQuantity ?? a.quantity,
      initialExpiryDate: a.expiryDate,
    });
  }

  const visiblePromos = promos.filter((p) => !ignored.has(p.stockId));

  return (
    <AdminLayout title="Recommandations">
      {loading ? (
        <div className="text-sm text-gray-400 text-center py-12">Chargement…</div>
      ) : (
        <div className="space-y-8">
          {/* Promos suggérées */}
          <section>
            <div className="flex items-center gap-2 mb-3">
              <Tag size={16} className="text-gray-500" />
              <h3 className="text-sm font-semibold text-gray-700">
                Promotions suggérées
                {visiblePromos.length > 0 && (
                  <span className="ml-2 text-xs font-medium text-white bg-red-500 px-1.5 py-0.5 rounded-full">
                    {visiblePromos.length}
                  </span>
                )}
              </h3>
            </div>
            {visiblePromos.length === 0 ? (
              <p className="text-sm text-gray-400 bg-white border border-gray-200 rounded-xl p-6 text-center">
                Aucun plat proche de la péremption. Tout est sous contrôle.
              </p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {visiblePromos.map((promo) => (
                  <PromoCard
                    key={promo.stockId}
                    promo={promo}
                    onApplied={fetchRecommendations}
                    onIgnored={() => handleIgnore(promo.stockId)}
                  />
                ))}
              </div>
            )}
          </section>

          {/* Conseils de stock */}
          <section>
            <div className="flex items-center gap-2 mb-3">
              <Lightbulb size={16} className="text-gray-500" />
              <h3 className="text-sm font-semibold text-gray-700">Conseils de stock</h3>
            </div>
            {advice.length === 0 ? (
              <p className="text-sm text-gray-400 bg-white border border-gray-200 rounded-xl p-6 text-center">
                Aucun ajustement de stock conseillé pour le moment.
              </p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {advice.map((a) => (
                  <AdviceCard key={a.stockId} advice={a} onAdjust={handleAdjust} />
                ))}
              </div>
            )}
          </section>
        </div>
      )}

      {adjust && (
        <StockModal
          frigoId={adjust.frigoId}
          frigoName={adjust.frigoName}
          fixedDish={adjust.fixedDish}
          availableDishes={[]}
          initialQuantity={adjust.initialQuantity}
          initialExpiryDate={adjust.initialExpiryDate}
          onClose={() => setAdjust(null)}
          onSaved={() => {
            setAdjust(null);
            fetchRecommendations();
          }}
        />
      )}
    </AdminLayout>
  );
}

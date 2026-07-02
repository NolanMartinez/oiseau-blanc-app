import { Plus } from "lucide-react";
import { useLang } from "../../i18n";
import { useKiosk, type GroupedDish } from "../../state/kiosk";
import { SETTING_KEYS } from "../../db";
import { formatPrice } from "../../utils/format";
import { DishImage } from "../../components/DishImage";

export function DishDetailScreen({
  group,
  remaining,
  onAddToCart,
  onBack,
}: {
  group: GroupedDish;
  remaining: number;
  onAddToCart: () => void;
  onBack: () => void;
}) {
  const { t } = useLang();
  const { setting } = useKiosk();
  const currency = setting(SETTING_KEYS.currency, "EUR");

  return (
    <div className="flex h-full flex-col">
      <header className="flex items-center bg-white px-8 py-5 shadow-sm">
        <button onClick={onBack} className="text-2xl font-bold text-[var(--green)] active:opacity-60">
          ‹ {t("back")}
        </button>
      </header>

      <div className="flex flex-1 flex-row overflow-hidden">
        {/* Image (moitié gauche) — badge « dispo » superposé en haut à droite. */}
        <div className="relative w-1/2 shrink-0 bg-gradient-to-br from-[var(--green-tint)] to-[var(--blue-soft)]">
          <DishImage
            dishId={group.dish.id}
            category={group.dish.category}
            localUrl={group.imageUrl}
            emojiSize="text-9xl"
          />
          <span className="absolute right-4 top-4 rounded-full bg-white/90 px-4 py-1.5 text-base font-bold text-[var(--green)] shadow">
            {t("qty_available", { n: remaining })}
          </span>
        </div>

        {/* Détails (moitié droite) — compact : titre, prix, description et allergènes
            tiennent sans défiler (mauvais pour le client). Contenu centré verticalement. */}
        <div className="flex flex-1 flex-col justify-center gap-3 overflow-y-auto p-6">
          <h1 className="text-3xl font-extrabold leading-tight line-clamp-3">{group.dish.name}</h1>
          <p className="text-4xl font-extrabold text-[var(--green)]">
            {formatPrice(group.priceCents, currency)}
          </p>
          {group.dish.description && (
            <p className="line-clamp-4 text-lg leading-relaxed text-[var(--ink-soft)]">
              {group.dish.description}
            </p>
          )}

          {group.dish.allergens.length > 0 && (
            <div>
              <p className="mb-2 text-sm font-bold uppercase tracking-wide text-[var(--ink-faint)]">
                {t("allergens")}
              </p>
              <div className="flex flex-wrap gap-2">
                {group.dish.allergens.map((a) => (
                  <span key={a} className="rounded-full bg-[var(--peach)] px-3 py-1 text-base capitalize">
                    {a}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* CTA */}
      <div className="bg-white p-6 shadow-[0_-4px_20px_rgba(0,0,0,0.06)]">
        <button
          onClick={onAddToCart}
          disabled={remaining <= 0}
          className="flex w-full items-center justify-center gap-3 rounded-2xl bg-[var(--green)] py-6 text-3xl font-extrabold text-white shadow-lg active:scale-[0.98] disabled:opacity-40"
        >
          <Plus size={28} />
          {t("add_to_cart")}
        </button>
      </div>
    </div>
  );
}

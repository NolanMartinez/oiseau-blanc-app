import { Plus } from "lucide-react";
import { useLang } from "../../i18n";
import { useKiosk, type GroupedDish } from "../../state/kiosk";
import { SETTING_KEYS } from "../../db";
import { formatPrice } from "../../utils/format";
import { categoryEmoji } from "../../utils/emoji";

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
        {/* Image (moitié gauche) */}
        <div className="w-1/2 shrink-0 bg-gradient-to-br from-[var(--green-tint)] to-[var(--blue-soft)]">
          {group.imageUrl ? (
            <img src={group.imageUrl} alt={group.dish.name} className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-9xl">
              {categoryEmoji(group.dish.category)}
            </div>
          )}
        </div>

        {/* Détails (moitié droite) */}
        <div className="flex flex-1 flex-col gap-5 overflow-y-auto p-8">
          <div className="flex items-center gap-3">
            <span className="rounded-full bg-[var(--blue-soft)] px-4 py-1.5 text-base font-semibold text-[var(--ink-soft)]">
              {t("qty_available", { n: remaining })}
            </span>
          </div>

          <h1 className="text-4xl font-extrabold leading-tight">{group.dish.name}</h1>
          {group.dish.description && (
            <p className="text-xl leading-relaxed text-[var(--ink-soft)]">{group.dish.description}</p>
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

          <p className="mt-auto text-5xl font-extrabold text-[var(--green)]">
            {formatPrice(group.priceCents, currency)}
          </p>
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

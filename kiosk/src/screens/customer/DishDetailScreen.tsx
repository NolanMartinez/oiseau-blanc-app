import { UtensilsCrossed } from "lucide-react";
import { useLang } from "../../i18n";
import { useKiosk, type MenuItem } from "../../state/kiosk";
import { SETTING_KEYS } from "../../db";
import { formatPrice } from "../../utils/format";

export function DishDetailScreen({
  item,
  onOrder,
  onBack,
}: {
  item: MenuItem;
  onOrder: () => void;
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

      <div className="flex flex-1 flex-col overflow-y-auto lg:flex-row">
        {/* Image */}
        <div className="aspect-[4/3] w-full bg-[var(--green-tint)] lg:aspect-auto lg:w-1/2">
          {item.imageUrl ? (
            <img src={item.imageUrl} alt={item.dish.name} className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-[var(--green)]">
              <UtensilsCrossed size={80} />
            </div>
          )}
        </div>

        {/* Détails */}
        <div className="flex flex-1 flex-col gap-5 p-8">
          {item.dish.category && (
            <span className="w-fit rounded-full bg-[var(--green-tint)] px-4 py-1.5 text-base font-semibold text-[var(--green)]">
              {item.dish.category}
            </span>
          )}
          <h1 className="text-4xl font-extrabold leading-tight">{item.dish.name}</h1>
          {item.dish.description && (
            <p className="text-xl leading-relaxed text-[var(--ink-soft)]">{item.dish.description}</p>
          )}

          {item.dish.allergens.length > 0 && (
            <div>
              <p className="mb-2 text-sm font-bold uppercase tracking-wide text-[var(--ink-faint)]">
                {t("allergens")}
              </p>
              <div className="flex flex-wrap gap-2">
                {item.dish.allergens.map((a) => (
                  <span key={a} className="rounded-full bg-[var(--peach)] px-3 py-1 text-base capitalize">
                    {a}
                  </span>
                ))}
              </div>
            </div>
          )}

          <p className="mt-auto text-5xl font-extrabold text-[var(--green)]">
            {formatPrice(item.priceCents, currency)}
          </p>
        </div>
      </div>

      {/* CTA */}
      <div className="bg-white p-6 shadow-[0_-4px_20px_rgba(0,0,0,0.06)]">
        <button
          onClick={onOrder}
          className="w-full rounded-2xl bg-[var(--green)] py-6 text-3xl font-extrabold text-white shadow-lg active:scale-[0.98]"
        >
          {t("order")}
        </button>
      </div>
    </div>
  );
}

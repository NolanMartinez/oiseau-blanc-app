import { Trash2, ShoppingCart } from "lucide-react";
import { useLang } from "../../i18n";
import { formatPrice } from "../../utils/format";
import type { CartLine } from "../../state/cart";

export function CartScreen({
  cart,
  currency,
  onRemove,
  onValidate,
  onContinue,
}: {
  cart: CartLine[];
  currency: string;
  onRemove: (lockerId: number) => void;
  onValidate: () => void;
  onContinue: () => void;
}) {
  const { t } = useLang();
  const total = cart.reduce((sum, l) => sum + l.priceCents, 0);

  return (
    <div className="flex h-full flex-col">
      <header className="flex items-center bg-white px-8 py-5 shadow-sm">
        <button onClick={onContinue} className="text-2xl font-bold text-[var(--green)] active:opacity-60">
          ‹ {t("continue_shopping")}
        </button>
        <h1 className="mx-auto text-3xl font-extrabold">{t("cart")}</h1>
        <span className="w-32" />
      </header>

      {cart.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-4 text-[var(--ink-faint)]">
          <ShoppingCart size={56} />
          <p className="text-2xl">{t("cart_empty")}</p>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto p-6">
          <div className="mx-auto max-w-2xl space-y-3">
            {cart.map((line) => (
              <div
                key={line.lockerId}
                className="flex items-center gap-4 rounded-2xl bg-white p-4 shadow-sm"
              >
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[var(--green-tint)] font-bold text-[var(--green)]">
                  {line.boxNumber}
                </div>
                <p className="flex-1 text-lg font-bold">{line.name}</p>
                <p className="text-lg font-extrabold text-[var(--green)]">
                  {formatPrice(line.priceCents, currency)}
                </p>
                <button
                  onClick={() => onRemove(line.lockerId)}
                  className="text-gray-400 active:text-red-500"
                  aria-label={t("remove")}
                >
                  <Trash2 size={22} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Pied : total + valider */}
      {cart.length > 0 && (
        <div className="bg-white p-6 shadow-[0_-4px_20px_rgba(0,0,0,0.06)]">
          <div className="mx-auto flex max-w-2xl items-center justify-between">
            <div>
              <p className="text-sm font-semibold uppercase text-[var(--ink-faint)]">{t("total")}</p>
              <p className="text-4xl font-extrabold">{formatPrice(total, currency)}</p>
            </div>
            <button
              onClick={onValidate}
              className="rounded-2xl bg-[var(--green)] px-12 py-5 text-3xl font-extrabold text-white shadow-lg active:scale-[0.98]"
            >
              {t("validate")}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

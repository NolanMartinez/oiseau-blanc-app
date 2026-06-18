import { UtensilsCrossed } from "lucide-react";
import { useLang } from "../../i18n";
import { useKiosk, type MenuItem } from "../../state/kiosk";
import { SETTING_KEYS } from "../../db";
import { formatPrice } from "../../utils/format";
import { LangSwitcher } from "../../components/LangSwitcher";

export function MenuScreen({
  onSelect,
  onBack,
}: {
  onSelect: (item: MenuItem) => void;
  onBack: () => void;
}) {
  const { t } = useLang();
  const { menuItems, setting } = useKiosk();
  const currency = setting(SETTING_KEYS.currency, "EUR");
  const venteLibre = setting(SETTING_KEYS.venteLibre) === "1";

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <header className="flex items-center justify-between bg-white px-8 py-5 shadow-sm">
        <button onClick={onBack} className="text-2xl font-bold text-[var(--green)] active:opacity-60">
          ‹ {t("back")}
        </button>
        <h1 className="text-3xl font-extrabold">{t("menu_title")}</h1>
        <LangSwitcher />
      </header>

      {venteLibre && (
        <div className="bg-[var(--yellow)] py-2 text-center text-sm font-bold text-[var(--ink)]">
          ⚠ {t("free_sale")}
        </div>
      )}

      {/* Grille de plats */}
      {menuItems.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-4 text-[var(--ink-faint)]">
          <UtensilsCrossed size={56} />
          <p className="text-2xl">{t("no_dishes")}</p>
        </div>
      ) : (
        <div className="grid flex-1 grid-cols-2 gap-5 overflow-y-auto p-6 lg:grid-cols-3">
          {menuItems.map((item) => (
            <button
              key={item.locker.id}
              onClick={() => onSelect(item)}
              className="flex flex-col overflow-hidden rounded-3xl bg-white text-left shadow-md transition active:scale-[0.98]"
            >
              <div className="aspect-[4/3] w-full overflow-hidden bg-[var(--green-tint)]">
                {item.imageUrl ? (
                  <img src={item.imageUrl} alt={item.dish.name} className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-[var(--green)]">
                    <UtensilsCrossed size={48} />
                  </div>
                )}
              </div>
              <div className="flex flex-1 flex-col gap-2 p-4">
                <p className="line-clamp-2 text-xl font-bold leading-tight">{item.dish.name}</p>
                {item.dish.category && (
                  <p className="text-sm text-[var(--ink-faint)]">{item.dish.category}</p>
                )}
                <p className="mt-auto text-2xl font-extrabold text-[var(--green)]">
                  {formatPrice(item.priceCents, currency)}
                </p>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

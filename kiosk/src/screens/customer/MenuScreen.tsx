import { useEffect, useMemo, useState } from "react";
import { UtensilsCrossed, Plus, ShoppingCart, ChevronLeft, ChevronRight } from "lucide-react";
import { useLang } from "../../i18n";
import { useKiosk, type GroupedDish } from "../../state/kiosk";
import { SETTING_KEYS } from "../../db";
import { formatPrice } from "../../utils/format";
import { categoryEmoji } from "../../utils/emoji";
import { LangSwitcher } from "../../components/LangSwitcher";

export function MenuScreen({
  category,
  onCategoryChange,
  onOpenDetail,
  onAddToCart,
  reservedByDish,
  cartCount,
  cartTotalCents,
  onViewCart,
  onBack,
}: {
  category: string;
  onCategoryChange: (c: string) => void;
  onOpenDetail: (g: GroupedDish) => void;
  onAddToCart: (g: GroupedDish) => void;
  reservedByDish: Record<string, number>;
  cartCount: number;
  cartTotalCents: number;
  onViewCart: () => void;
  onBack: () => void;
}) {
  const { t } = useLang();
  const { groupedMenu, categories, setting } = useKiosk();
  const currency = setting(SETTING_KEYS.currency, "EUR");

  const shown = useMemo(
    () => (category ? groupedMenu.filter((g) => g.dish.category === category) : groupedMenu),
    [groupedMenu, category],
  );

  // Pagination : 4 plats par page (grille 2×2) pour de grandes images.
  const PAGE_SIZE = 4;
  const [page, setPage] = useState(0);
  const totalPages = Math.max(1, Math.ceil(shown.length / PAGE_SIZE));
  // Revient en page valide quand la catégorie change ou que la liste se réduit.
  useEffect(() => {
    setPage((p) => Math.min(p, totalPages - 1));
  }, [totalPages]);
  useEffect(() => {
    setPage(0);
  }, [category]);
  const pageItems = shown.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  const remaining = (g: GroupedDish) => g.quantity - (reservedByDish[g.dish.id] ?? 0);

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <header className="flex items-center justify-between bg-white px-8 py-4 shadow-sm">
        <button onClick={onBack} className="text-2xl font-bold text-[var(--green)] active:opacity-60">
          ‹ {t("back")}
        </button>
        <h1 className="text-2xl font-extrabold">{t("menu_title")}</h1>
        <LangSwitcher />
      </header>

      {/* Onglets catégories */}
      <div className="flex gap-2 overflow-x-auto border-b border-[var(--line)] bg-white px-6 py-3">
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => onCategoryChange(cat)}
            className={`shrink-0 rounded-full px-5 py-2 text-base font-bold ${
              category === cat ? "bg-[var(--green)] text-white" : "bg-gray-100 text-[var(--ink-soft)]"
            }`}
          >
            {categoryEmoji(cat)} {cat}
          </button>
        ))}
      </div>

      {/* Grille de plats groupés — paginée (3×2), flèches de navigation */}
      {shown.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-4 text-[var(--ink-faint)]">
          <UtensilsCrossed size={56} />
          <p className="text-2xl">{t("no_dishes")}</p>
        </div>
      ) : (
        <div className="flex flex-1 items-stretch gap-2 overflow-hidden p-4">
          {/* Flèche précédent */}
          <button
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            disabled={page === 0}
            aria-label={t("prev")}
            className="flex w-16 shrink-0 items-center justify-center rounded-2xl bg-white text-[var(--green)] shadow-md active:scale-95 disabled:opacity-30"
          >
            <ChevronLeft size={40} />
          </button>

          {/* Page courante : 2 colonnes × 2 lignes (grandes images) */}
          <div className="grid flex-1 grid-cols-2 grid-rows-2 gap-5">
            {pageItems.map((g) => {
              const left = remaining(g);
              return (
                <div
                  key={g.dish.id}
                  className="flex min-h-0 flex-col overflow-hidden rounded-3xl bg-white shadow-md"
                >
                  {/* Image en grand : occupe toute la carte, titre + prix superposés en bas. */}
                  <button
                    onClick={() => onOpenDetail(g)}
                    className="relative min-h-0 flex-1 overflow-hidden bg-gradient-to-br from-[var(--green-tint)] to-[var(--blue-soft)] text-left transition active:scale-[0.99]"
                  >
                    {g.imageUrl ? (
                      <img src={g.imageUrl} alt={g.dish.name} className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-8xl">
                        {categoryEmoji(g.dish.category)}
                      </div>
                    )}
                    <span className="absolute right-3 top-3 rounded-full bg-white/90 px-3 py-1 text-sm font-bold text-[var(--green)] shadow">
                      {t("qty_available", { n: left })}
                    </span>
                    {/* Dégradé + titre + prix par-dessus l'image (toujours lisibles). */}
                    <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/45 to-transparent px-4 pb-3 pt-12">
                      <p className="line-clamp-2 text-lg font-bold leading-tight text-white drop-shadow">
                        {g.dish.name}
                      </p>
                      <p className="text-2xl font-extrabold text-white drop-shadow">
                        {formatPrice(g.priceCents, currency)}
                      </p>
                    </div>
                  </button>

                  <div className="shrink-0 p-3">
                    <button
                      onClick={() => onAddToCart(g)}
                      disabled={left <= 0}
                      className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[var(--green)] py-2.5 text-base font-extrabold text-white active:scale-[0.98] disabled:opacity-40"
                    >
                      <Plus size={18} />
                      {t("add_to_cart")}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Flèche suivant */}
          <button
            onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
            disabled={page >= totalPages - 1}
            aria-label={t("next")}
            className="flex w-16 shrink-0 items-center justify-center rounded-2xl bg-white text-[var(--green)] shadow-md active:scale-95 disabled:opacity-30"
          >
            <ChevronRight size={40} />
          </button>
        </div>
      )}

      {/* Indicateur de page */}
      {shown.length > PAGE_SIZE && (
        <div className="flex items-center justify-center gap-2 bg-white pb-2 text-sm font-bold text-[var(--ink-faint)]">
          {Array.from({ length: totalPages }).map((_, i) => (
            <span
              key={i}
              className={`h-2.5 rounded-full transition-all ${
                i === page ? "w-6 bg-[var(--green)]" : "w-2.5 bg-gray-300"
              }`}
            />
          ))}
        </div>
      )}

      {/* Barre panier */}
      {cartCount > 0 && (
        <button
          onClick={onViewCart}
          className="flex items-center justify-between bg-[var(--green)] px-8 py-5 text-white shadow-[0_-4px_20px_rgba(0,0,0,0.15)] active:opacity-90"
        >
          <span className="flex items-center gap-3 text-xl font-bold">
            <ShoppingCart size={26} />
            {t("view_cart")} ({cartCount})
          </span>
          <span className="text-2xl font-extrabold">{formatPrice(cartTotalCents, currency)}</span>
        </button>
      )}
    </div>
  );
}

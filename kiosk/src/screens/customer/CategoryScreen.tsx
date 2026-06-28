import { useLang } from "../../i18n";
import { useKiosk } from "../../state/kiosk";
import { categoryEmoji } from "../../utils/emoji";
import { LangSwitcher } from "../../components/LangSwitcher";

export function CategoryScreen({
  onSelect,
  onBack,
}: {
  onSelect: (category: string) => void;
  onBack: () => void;
}) {
  const { t } = useLang();
  const { categories } = useKiosk();

  return (
    <div className="flex h-full flex-col">
      <header className="flex items-center justify-between bg-white px-8 py-5 shadow-sm">
        <button onClick={onBack} className="text-2xl font-bold text-[var(--green)] active:opacity-60">
          ‹ {t("back")}
        </button>
        <h1 className="text-3xl font-extrabold">{t("choose_category")}</h1>
        <LangSwitcher />
      </header>

      <div className="grid flex-1 grid-cols-2 content-center gap-6 overflow-y-auto p-8 lg:grid-cols-3">
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => onSelect(cat)}
            className="flex flex-col items-center justify-center gap-4 rounded-3xl bg-white p-8 shadow-md transition active:scale-[0.98]"
          >
            <span className="text-7xl">{categoryEmoji(cat)}</span>
            <span className="text-2xl font-extrabold text-[var(--ink)]">{cat}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

import { UtensilsCrossed } from "lucide-react";
import { useLang } from "../../i18n";

const DEVELOPED_BY = "L'Oiseau Blanc Traiteur";

export function IdleScreen({ onStart }: { onStart: () => void }) {
  const { t } = useLang();
  return (
    <button
      onClick={onStart}
      className="relative flex h-full w-full flex-col items-center justify-center gap-10 bg-gradient-to-b from-[var(--green-tint)] to-[var(--blue-soft)]"
    >
      <div className="flex flex-col items-center gap-6">
        <div className="flex h-40 w-40 items-center justify-center rounded-[2.5rem] bg-white shadow-xl">
          <span className="text-5xl leading-none" style={{ fontWeight: 900, letterSpacing: "-0.03em" }}>
            <span style={{ color: "#70C8F2" }}>Frig</span>
            <span style={{ color: "#319966" }}>go</span>
          </span>
        </div>
      </div>

      <div className="mt-6 flex animate-pulse flex-col items-center gap-4">
        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-[var(--green)] text-white shadow-lg">
          <UtensilsCrossed size={36} />
        </div>
        <p className="text-3xl font-bold text-[var(--green)]">{t("touch_to_order")}</p>
      </div>

      {/* Footer "développé par" */}
      <p className="absolute bottom-5 left-0 right-0 text-center text-sm text-[var(--ink-faint)]">
        {t("developed_by")} {DEVELOPED_BY}
      </p>
    </button>
  );
}

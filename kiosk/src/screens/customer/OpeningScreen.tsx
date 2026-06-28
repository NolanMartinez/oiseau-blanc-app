import { Loader2, PackageOpen, DoorOpen, ChevronRight } from "lucide-react";
import { useLang } from "../../i18n";
import type { LockerPhase } from "../../hardware";

export function OpeningScreen({
  phase,
  boxNumber,
  index,
  total,
  onNext,
}: {
  phase: LockerPhase;
  boxNumber: number;
  index: number;
  total: number;
  onNext: () => void;
}) {
  const { t } = useLang();
  const opened = phase === "open";
  const isLast = index >= total;

  return (
    <div className="flex h-full flex-col items-center justify-center gap-7 bg-gradient-to-b from-[var(--green-tint)] to-white px-8">
      {total > 1 && (
        <p className="text-xl font-bold text-[var(--ink-soft)]">
          {t("item_progress", { i: index, n: total })}
        </p>
      )}

      <div className="flex h-28 w-28 items-center justify-center rounded-full bg-[var(--green)] text-white shadow-xl">
        {opened ? <DoorOpen size={56} /> : <Loader2 size={56} className="animate-spin" />}
      </div>

      <p className="text-3xl font-semibold text-[var(--ink-soft)]">{t("take_your_dish")}</p>

      <div className="flex flex-col items-center rounded-3xl bg-white px-12 py-6 shadow-md">
        <span className="text-base font-bold uppercase tracking-wide text-[var(--ink-faint)]">
          {t("box")}
        </span>
        <span className="text-8xl font-extrabold leading-none text-[var(--green)]">{boxNumber}</span>
      </div>

      {/* Le bouton n'apparaît qu'une fois la porte ouverte (capteur / délai). */}
      {opened && (
        <>
          <p className="flex items-center gap-2 text-lg font-medium text-[var(--ink-soft)]">
            <PackageOpen size={22} className="text-[var(--green)]" /> {t("close_door")}
          </p>
          <button
            onClick={onNext}
            className="flex items-center gap-3 rounded-2xl bg-[var(--green)] px-12 py-5 text-2xl font-extrabold text-white shadow-lg active:scale-[0.98]"
          >
            {isLast ? t("finish") : t("next")}
            <ChevronRight size={28} />
          </button>
        </>
      )}
    </div>
  );
}

import { Loader2, PackageOpen, DoorOpen } from "lucide-react";
import { useLang } from "../../i18n";
import type { LockerPhase } from "../../hardware";

export function OpeningScreen({
  phase,
  boxNumber,
}: {
  phase: LockerPhase;
  boxNumber: number;
}) {
  const { t } = useLang();
  const opened = phase === "open";

  return (
    <div className="flex h-full flex-col items-center justify-center gap-8 bg-gradient-to-b from-[var(--green-tint)] to-white px-8">
      <div className="flex h-28 w-28 items-center justify-center rounded-full bg-[var(--green)] text-white shadow-xl">
        {opened ? <DoorOpen size={56} /> : <Loader2 size={56} className="animate-spin" />}
      </div>

      <p className="text-2xl font-semibold text-[var(--ink-soft)]">
        {opened ? t("take_your_dish") : t("opening_locker")}
      </p>

      <div className="flex flex-col items-center gap-2">
        <p className="text-7xl font-extrabold text-[var(--green)]">
          {t("locker_number", { n: boxNumber })}
        </p>
      </div>

      {opened && (
        <div className="mt-4 flex items-center gap-3 rounded-2xl bg-white px-6 py-4 shadow-md">
          <PackageOpen size={28} className="text-[var(--green)]" />
          <p className="text-xl font-medium">{t("close_door")}</p>
        </div>
      )}
    </div>
  );
}

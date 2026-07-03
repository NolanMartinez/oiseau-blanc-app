import { useMemo, useState } from "react";
import { AlertTriangle, DoorOpen } from "lucide-react";
import { useLang } from "../../i18n";
import { useKiosk } from "../../state/kiosk";
import { hardware } from "../../hardware";

// Alerte affichée à l'ouverture de l'admin borne : liste les casiers dont la DLC
// est dépassée, pour que le livreur retire les produits périmés.
export function ExpiredAlert() {
  const { t } = useLang();
  const { lockers, dishes, repo, reload } = useKiosk();
  const [dismissed, setDismissed] = useState(false);
  const [busy, setBusy] = useState<number | null>(null);

  const dishById = useMemo(() => new Map(dishes.map((d) => [d.id, d])), [dishes]);
  const today = new Date().toISOString().slice(0, 10);
  const expired = useMemo(
    () =>
      lockers
        .filter((l) => l.dishId && l.expiryDate && l.expiryDate.slice(0, 10) < today)
        .sort((a, b) => a.board.localeCompare(b.board) || a.boxNumber - b.boxNumber),
    [lockers, today],
  );

  if (dismissed || expired.length === 0) return null;

  async function openAndRemove(lockerId: number, board: string, address: number, boxNumber: number) {
    setBusy(boxNumber);
    void hardware.openLocker(board, address ?? boxNumber).catch(() => {});
    if (repo) {
      await repo.clearLocker(lockerId);
      await reload();
    }
    setBusy(null);
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 px-6">
      <div className="flex max-h-[85vh] w-full max-w-lg flex-col rounded-2xl bg-white shadow-xl">
        <div className="flex items-center gap-3 border-b border-[var(--line)] px-6 py-4">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-red-50">
            <AlertTriangle size={22} className="text-red-500" />
          </div>
          <div>
            <h2 className="text-lg font-extrabold text-[var(--ink)]">{t("expired_title")}</h2>
            <p className="text-sm text-[var(--ink-soft)]">{t("expired_intro")}</p>
          </div>
        </div>

        <div className="flex-1 space-y-2 overflow-y-auto p-4">
          {expired.map((l) => (
            <div
              key={l.id}
              className="flex items-center gap-3 rounded-xl border-2 border-red-200 bg-red-50 p-3"
            >
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-white text-lg font-extrabold text-red-500">
                {l.boxNumber}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate font-bold text-[var(--ink)]">
                  {l.dishId ? dishById.get(l.dishId)?.name ?? "?" : "?"}
                </p>
                <p className="text-xs font-medium text-red-600">
                  {t("expiry")} : {l.expiryDate?.slice(0, 10)}
                </p>
              </div>
              <button
                onClick={() => openAndRemove(l.id, l.board, l.address ?? l.boxNumber, l.boxNumber)}
                disabled={busy === l.boxNumber}
                className="flex shrink-0 items-center gap-2 rounded-lg bg-[var(--green)] px-3 py-2 text-sm font-bold text-white active:opacity-80 disabled:opacity-50"
              >
                <DoorOpen size={16} />
                {t("open_and_remove")}
              </button>
            </div>
          ))}
        </div>

        <div className="border-t border-[var(--line)] p-4">
          <button
            onClick={() => setDismissed(true)}
            className="w-full rounded-xl bg-gray-800 py-3 font-bold text-white active:opacity-80"
          >
            {t("understood")}
          </button>
        </div>
      </div>
    </div>
  );
}

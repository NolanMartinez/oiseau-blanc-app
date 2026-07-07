import { useMemo, useState } from "react";
import { DoorOpen, Lock, Trash2, CheckSquare, RefreshCw } from "lucide-react";
import { useLang } from "../../i18n";
import { useKiosk } from "../../state/kiosk";
import { hardware } from "../../hardware";
import type { Locker } from "../../db";

export function BoxControlScreen() {
  const { t } = useLang();
  const { dispensers, lockers, dishes, repo, reload, runSync } = useKiosk();
  const [board, setBoard] = useState("A");
  const [busyBox, setBusyBox] = useState<number | null>(null);
  const [msg, setMsg] = useState("");
  const [targetBox, setTargetBox] = useState("");
  const [confirm, setConfirm] = useState<Locker | null>(null);
  const [syncing, setSyncing] = useState(false);

  async function updateProducts() {
    setSyncing(true);
    const res = await runSync();
    flash(res.ok ? `${t("synced", { n: res.dishCount })}` : t("sync_failed"));
    setSyncing(false);
  }

  const boardLockers = useMemo(
    () => lockers.filter((l) => l.board === board).sort((a, b) => a.boxNumber - b.boxNumber),
    [lockers, board],
  );
  const dishById = useMemo(() => new Map(dishes.map((d) => [d.id, d])), [dishes]);

  function flash(m: string) {
    setMsg(m);
    window.setTimeout(() => setMsg(""), 2800);
  }

  // Ouvre le casier ET le vide (retire le plat) — usage livreur : il enlève le
  // plat du casier, qui redevient donc disponible/vide.
  async function openAndEmpty(l: Locker) {
    setBusyBox(l.boxNumber);
    await hardware.openLocker(board, l.address ?? l.boxNumber);
    if (l.dishId && repo) {
      await repo.clearLocker(l.id);
      await reload();
    }
    setBusyBox(null);
    flash(`${t("box")} ${l.boxNumber} — ${t("opened_emptied")}`);
  }

  // Casier rempli → on demande confirmation du produit à retirer. Casier vide → ouverture simple.
  function requestOpen(l: Locker) {
    if (l.dishId) setConfirm(l);
    else void openAndEmpty(l);
  }

  async function openTargetBox() {
    const n = parseInt(targetBox, 10);
    if (!Number.isFinite(n) || n < 1 || n > 32) return;
    const l = boardLockers.find((x) => x.boxNumber === n);
    if (l) {
      requestOpen(l);
    } else {
      setBusyBox(n);
      await hardware.openLocker(board, n);
      setBusyBox(null);
      flash(`${t("box")} ${n} · ${t("open")}`);
    }
    setTargetBox("");
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--line)] bg-white px-6 py-4">
        <h2 className="text-2xl font-extrabold">{t("box_title")}</h2>
        <div className="flex flex-wrap items-center justify-end gap-3">
          <div className="flex gap-1">
            {dispensers.map((d) => (
              <button
                key={d.board}
                onClick={() => setBoard(d.board)}
                className={`h-10 w-10 rounded-lg text-lg font-bold ${
                  board === d.board ? "bg-[var(--green)] text-white" : "bg-gray-100 text-[var(--ink-soft)]"
                }`}
              >
                {d.board}
              </button>
            ))}
          </div>
          <button
            onClick={() => hardware.closeAll(board)}
            className="flex items-center gap-2 rounded-xl bg-gray-800 px-4 py-2.5 font-bold text-white active:opacity-80"
          >
            <Lock size={18} />
            {t("close_all")}
          </button>
          <button
            onClick={() => hardware.clearError(board)}
            className="flex items-center gap-2 rounded-xl border-2 border-gray-200 px-4 py-2.5 font-bold text-[var(--ink-soft)] active:bg-gray-50"
          >
            <CheckSquare size={18} />
            {t("clear_error")}
          </button>
          <button
            onClick={updateProducts}
            disabled={syncing}
            className="flex items-center gap-2 rounded-xl bg-[var(--blue)] px-4 py-2.5 font-bold text-white active:opacity-80 disabled:opacity-50"
          >
            <RefreshCw size={18} className={syncing ? "animate-spin" : ""} />
            {t("update_products")}
          </button>
        </div>
      </div>

      {/* Bandeau : explication + message */}
      <div className="flex items-center gap-3 bg-[var(--green-tint)] px-6 py-2 text-sm">
        <Trash2 size={16} className="text-[var(--green)]" />
        <span className="font-medium text-[var(--green)]">{t("open_empty_hint")}</span>
        {msg && <span className="ml-auto font-semibold text-[var(--ink-soft)]">{msg}</span>}
      </div>

      {/* Ouverture ciblée par numéro */}
      <div className="flex items-center gap-3 border-b border-[var(--line)] bg-white px-6 py-3">
        <span className="text-sm font-medium text-[var(--ink-soft)]">{t("open_box_by_number")}</span>
        <input
          type="number"
          min={1}
          max={32}
          inputMode="numeric"
          value={targetBox}
          onChange={(e) => setTargetBox(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && openTargetBox()}
          placeholder="1–32"
          className="w-24 rounded-lg border-2 border-gray-200 px-3 py-2 text-center text-lg font-bold focus:border-[var(--green)] focus:outline-none"
        />
        <button
          onClick={openTargetBox}
          disabled={!targetBox}
          className="flex items-center gap-2 rounded-xl bg-[var(--green)] px-4 py-2.5 font-bold text-white active:opacity-80 disabled:opacity-40"
        >
          <DoorOpen size={18} />
          {t("open")}
        </button>
      </div>

      {/* Grille : chaque casier montre son plat (s'il est rempli) */}
      <div className="grid flex-1 grid-cols-4 content-start gap-3 overflow-y-auto p-6 sm:grid-cols-6 lg:grid-cols-8">
        {boardLockers.map((l) => {
          const name = l.dishId ? dishById.get(l.dishId)?.name : null;
          return (
            <button
              key={l.id}
              onClick={() => requestOpen(l)}
              disabled={busyBox === l.boxNumber}
              className={`flex aspect-square flex-col items-center justify-center gap-1 rounded-xl border-2 p-1 text-center ${
                busyBox === l.boxNumber
                  ? "border-[var(--blue)] bg-[var(--blue-soft)]"
                  : name
                    ? "border-2 border-[var(--green)]/40 bg-white shadow-sm active:bg-gray-50"
                    : "border-dashed border-amber-400 bg-amber-50 active:bg-amber-100"
              }`}
            >
              <span className={`text-xl font-extrabold ${name ? "" : "text-amber-500"}`}>{l.boxNumber}</span>
              {name ? (
                <span className="line-clamp-2 text-[10px] leading-tight text-[var(--ink-soft)]">{name}</span>
              ) : (
                <span className="text-[11px] font-bold uppercase tracking-wide text-amber-600">{t("empty")}</span>
              )}
            </button>
          );
        })}
      </div>

      {/* Confirmation : quel produit retire-t-on ? */}
      {confirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-6">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 text-center shadow-xl">
            <p className="text-lg font-bold">{t("confirm_remove")}</p>
            <p className="mt-3 text-[var(--ink-soft)]">
              {t("box")} {confirm.boxNumber} —{" "}
              <span className="font-semibold text-[var(--ink)]">
                {confirm.dishId ? dishById.get(confirm.dishId)?.name : ""}
              </span>
            </p>
            <div className="mt-6 flex gap-3">
              <button
                onClick={() => setConfirm(null)}
                className="flex-1 rounded-xl border-2 border-gray-200 py-3 font-bold text-[var(--ink-soft)] active:bg-gray-50"
              >
                {t("cancel")}
              </button>
              <button
                onClick={() => {
                  const l = confirm;
                  setConfirm(null);
                  void openAndEmpty(l);
                }}
                className="flex-1 rounded-xl bg-[var(--green)] py-3 font-bold text-white active:opacity-80"
              >
                {t("open_and_remove")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

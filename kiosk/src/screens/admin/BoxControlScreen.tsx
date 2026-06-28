import { useEffect, useMemo, useState } from "react";
import { DoorOpen, Lock, AlertTriangle, CheckSquare } from "lucide-react";
import { useLang } from "../../i18n";
import { useKiosk } from "../../state/kiosk";
import { hardware, type LockerEvent } from "../../hardware";

export function BoxControlScreen() {
  const { t } = useLang();
  const { dispensers, lockers } = useKiosk();
  const [board, setBoard] = useState("A");
  const [busyBox, setBusyBox] = useState<number | null>(null);
  const [lastEvent, setLastEvent] = useState<LockerEvent | null>(null);
  const [targetBox, setTargetBox] = useState("");

  const boardLockers = useMemo(
    () => lockers.filter((l) => l.board === board).sort((a, b) => a.boxNumber - b.boxNumber),
    [lockers, board],
  );

  useEffect(() => {
    const unsub = hardware.onLockerEvent((e) => {
      setLastEvent(e);
      if (e.phase === "closed") setBusyBox(null);
    });
    return unsub;
  }, []);

  async function openBox(boxNumber: number, address: number | null) {
    setBusyBox(boxNumber);
    await hardware.openLocker(board, address ?? boxNumber);
    setBusyBox(null);
  }

  async function openTargetBox() {
    const n = parseInt(targetBox, 10);
    if (!Number.isFinite(n) || n < 1 || n > 32) return;
    setBusyBox(n);
    await hardware.openLocker(board, n);
    setBusyBox(null);
    setTargetBox("");
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--line)] bg-white px-6 py-4">
        <h2 className="text-2xl font-extrabold">{t("box_title")}</h2>
        <div className="flex items-center gap-3">
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
        </div>
      </div>

      {/* Bandeau d'état */}
      <div className="flex items-center gap-6 bg-[var(--green-tint)] px-6 py-2 text-sm">
        <span className="flex items-center gap-2 font-medium text-[var(--green)]">
          <CheckSquare size={16} /> {t("door_closed")}
        </span>
        <span className="flex items-center gap-2 text-[var(--ink-faint)]">
          <AlertTriangle size={16} /> {t("alarm")}: —
        </span>
        {lastEvent && (
          <span className="ml-auto text-[var(--ink-faint)]">
            {lastEvent.message ?? `${t("box")} ${lastEvent.boxNumber} · ${lastEvent.phase}`}
          </span>
        )}
      </div>

      {/* Ouverture ciblée par numéro (carte {board}, casier 1–32) */}
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

      {/* Grille */}
      <div className="grid flex-1 grid-cols-4 content-start gap-3 overflow-y-auto p-6 sm:grid-cols-6 lg:grid-cols-8">
        {boardLockers.map((l) => (
          <button
            key={l.id}
            onClick={() => openBox(l.boxNumber, l.address)}
            disabled={busyBox === l.boxNumber}
            className={`flex aspect-square flex-col items-center justify-center gap-1 rounded-xl border-2 ${
              busyBox === l.boxNumber
                ? "border-[var(--blue)] bg-[var(--blue-soft)]"
                : "border-transparent bg-white shadow-sm active:bg-gray-50"
            }`}
          >
            <span className="text-xl font-extrabold">{l.boxNumber}</span>
            <DoorOpen size={16} className="text-[var(--ink-faint)]" />
          </button>
        ))}
      </div>
    </div>
  );
}

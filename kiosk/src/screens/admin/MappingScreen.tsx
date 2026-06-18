import { useEffect, useMemo, useState } from "react";
import { RefreshCw, Trash2, Check, ScanLine, Link2 } from "lucide-react";
import { useLang } from "../../i18n";
import { useKiosk } from "../../state/kiosk";
import { SETTING_KEYS, type DishCache, type Locker } from "../../db";
import { formatPrice } from "../../utils/format";
import { useBarcodeScanner } from "../../hooks/useBarcodeScanner";

export function MappingScreen() {
  const { t } = useLang();
  const { dispensers, lockers, dishes, repo, reload, runSync, setting } = useKiosk();
  const [board, setBoard] = useState("A");
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [dishId, setDishId] = useState("");
  const [priceEuros, setPriceEuros] = useState("");
  const [expiry, setExpiry] = useState("");
  const [syncMsg, setSyncMsg] = useState("");
  const [syncing, setSyncing] = useState(false);
  // Mode scan (douchette)
  const [scanMode, setScanMode] = useState(false);
  const [pendingDish, setPendingDish] = useState<DishCache | null>(null);
  const [linkCode, setLinkCode] = useState<string | null>(null);
  const [linkDishId, setLinkDishId] = useState("");
  const [scanMsg, setScanMsg] = useState("");
  const currency = setting(SETTING_KEYS.currency, "EUR");

  const boardLockers = useMemo(
    () => lockers.filter((l) => l.board === board).sort((a, b) => a.boxNumber - b.boxNumber),
    [lockers, board],
  );
  const dishById = useMemo(() => new Map(dishes.map((d) => [d.id, d])), [dishes]);
  const selected = boardLockers.find((l) => l.id === selectedId) ?? null;

  // Pré-remplit l'éditeur quand on sélectionne un casier.
  useEffect(() => {
    if (!selected) return;
    setDishId(selected.dishId ?? "");
    setPriceEuros(selected.price != null ? (selected.price / 100).toFixed(2) : "");
    setExpiry(selected.expiryDate ? selected.expiryDate.slice(0, 10) : "");
  }, [selectedId]); // eslint-disable-line react-hooks/exhaustive-deps

  async function save() {
    if (!repo || !selected) return;
    const price = priceEuros.trim() ? Math.round(parseFloat(priceEuros) * 100) : null;
    await repo.setLockerMapping(selected.id, {
      dishId: dishId || null,
      price: Number.isNaN(price as number) ? null : price,
      expiryDate: expiry || null,
    });
    await reload();
    setSelectedId(null);
  }

  async function clear() {
    if (!repo || !selected) return;
    await repo.clearLocker(selected.id);
    await reload();
    setSelectedId(null);
  }

  async function doSync() {
    setSyncing(true);
    setSyncMsg(t("syncing"));
    const res = await runSync();
    setSyncMsg(res.ok ? t("synced", { n: res.dishCount }) : `${t("sync_failed")} : ${res.error ?? ""}`);
    setSyncing(false);
  }

  function lockerLabel(l: Locker) {
    return l.dishId ? dishById.get(l.dishId)?.name ?? "?" : null;
  }

  // ── Mode scan : produit -> tiroir ─────────────────────────────────────────
  async function handleScan(code: string) {
    if (!repo) return;
    const asNum = parseInt(code, 10);
    const isDrawer = /^\d+$/.test(code) && asNum >= 1 && asNum <= boardLockers.length;

    if (isDrawer) {
      const locker = boardLockers.find((l) => l.boxNumber === asNum);
      if (!locker) return;
      if (pendingDish) {
        await repo.setLockerMapping(locker.id, {
          dishId: pendingDish.id,
          price: pendingDish.price,
          expiryDate: null,
        });
        await reload();
        setScanMsg(`${t("box")} ${asNum} ← ${pendingDish.name}`);
      } else {
        setSelectedId(locker.id);
        setScanMsg(`${t("box")} ${asNum}`);
      }
      return;
    }

    // Code produit : on cherche le plat associé.
    const dish = await repo.getDishByBarcode(code);
    if (dish) {
      setPendingDish(dish);
      setLinkCode(null);
      setScanMsg(`▶ ${dish.name}`);
    } else {
      // Code inconnu : proposer de le lier à un plat.
      setLinkCode(code);
      setLinkDishId("");
      setScanMsg("");
    }
  }

  useBarcodeScanner(scanMode, handleScan);

  async function linkBarcode() {
    if (!repo || !linkCode || !linkDishId) return;
    await repo.setDishBarcode(linkDishId, linkCode);
    await reload();
    const dish = dishes.find((d) => d.id === linkDishId) ?? null;
    setPendingDish(dish ? { ...dish, barcode: linkCode } : null);
    setScanMsg(dish ? `▶ ${dish.name}` : "");
    setLinkCode(null);
  }

  function toggleScan() {
    setScanMode((v) => !v);
    setPendingDish(null);
    setLinkCode(null);
    setScanMsg("");
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--line)] bg-white px-6 py-4">
        <h2 className="text-2xl font-extrabold">{t("mapping_title")}</h2>
        <div className="flex items-center gap-3">
          {/* Sélecteur de distributeur */}
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-[var(--ink-faint)]">{t("dispenser")}</span>
            <div className="flex gap-1">
              {dispensers.map((d) => (
                <button
                  key={d.board}
                  onClick={() => {
                    setBoard(d.board);
                    setSelectedId(null);
                  }}
                  className={`h-10 w-10 rounded-lg text-lg font-bold ${
                    board === d.board ? "bg-[var(--green)] text-white" : "bg-gray-100 text-[var(--ink-soft)]"
                  }`}
                >
                  {d.board}
                </button>
              ))}
            </div>
          </div>
          <button
            onClick={toggleScan}
            className={`flex items-center gap-2 rounded-xl px-4 py-2.5 font-bold active:opacity-80 ${
              scanMode ? "bg-[var(--green)] text-white" : "border-2 border-gray-200 text-[var(--ink-soft)]"
            }`}
          >
            <ScanLine size={18} />
            {t("scan_mode")}
          </button>
          <button
            onClick={doSync}
            disabled={syncing}
            className="flex items-center gap-2 rounded-xl bg-[var(--blue)] px-4 py-2.5 font-bold text-white active:opacity-80 disabled:opacity-50"
          >
            <RefreshCw size={18} className={syncing ? "animate-spin" : ""} />
            {t("sync")}
          </button>
        </div>
      </div>

      {syncMsg && <div className="bg-[var(--green-tint)] px-6 py-2 text-sm font-medium text-[var(--green)]">{syncMsg}</div>}

      {/* Bandeau mode scan */}
      {scanMode && (
        <div className="flex flex-wrap items-center gap-3 border-b border-[var(--line)] bg-[var(--blue-soft)] px-6 py-3">
          <ScanLine size={18} className="text-[var(--green)]" />
          <span className="text-sm font-semibold text-[var(--ink-soft)]">{t("scan_help")}</span>
          {pendingDish && (
            <span className="rounded-full bg-white px-3 py-1 text-sm font-bold text-[var(--green)]">
              {t("pending_dish")} : {pendingDish.name}
            </span>
          )}
          {scanMsg && <span className="text-sm font-medium text-[var(--ink-faint)]">{scanMsg}</span>}

          {/* Code inconnu : liaison à un plat */}
          {linkCode && (
            <div className="ml-auto flex items-center gap-2 rounded-xl bg-white px-3 py-2 shadow-sm">
              <Link2 size={16} className="text-[var(--blue)]" />
              <span className="font-mono text-sm">{linkCode}</span>
              <select
                value={linkDishId}
                onChange={(e) => setLinkDishId(e.target.value)}
                className="rounded-lg border border-gray-300 px-2 py-1.5 text-sm"
              >
                <option value="">{t("link_barcode")}…</option>
                {dishes.map((d) => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>
              <button
                onClick={linkBarcode}
                disabled={!linkDishId}
                className="rounded-lg bg-[var(--green)] px-3 py-1.5 text-sm font-bold text-white disabled:opacity-50"
              >
                {t("save")}
              </button>
            </div>
          )}
        </div>
      )}

      <div className="flex flex-1 overflow-hidden">
        {/* Grille des casiers */}
        <div className="grid flex-1 grid-cols-4 content-start gap-3 overflow-y-auto p-6 sm:grid-cols-6 lg:grid-cols-8">
          {boardLockers.map((l) => {
            const name = lockerLabel(l);
            return (
              <button
                key={l.id}
                onClick={() => setSelectedId(l.id)}
                className={`flex aspect-square flex-col items-center justify-center gap-1 rounded-xl border-2 p-1 text-center ${
                  selectedId === l.id
                    ? "border-[var(--green)] bg-[var(--green-tint)]"
                    : name
                      ? "border-transparent bg-white shadow-sm"
                      : "border-dashed border-gray-300 bg-gray-50"
                }`}
              >
                <span className="text-lg font-extrabold">{l.boxNumber}</span>
                {name ? (
                  <span className="line-clamp-2 text-[10px] leading-tight text-[var(--ink-soft)]">{name}</span>
                ) : (
                  <span className="text-[10px] text-gray-400">{t("none")}</span>
                )}
              </button>
            );
          })}
        </div>

        {/* Éditeur de casier */}
        {selected && (
          <div className="w-80 shrink-0 overflow-y-auto border-l border-[var(--line)] bg-white p-6">
            <p className="mb-4 text-xl font-extrabold">
              {t("box")} {selected.boxNumber}
            </p>

            <label className="mb-1 block text-sm font-semibold text-[var(--ink-faint)]">{t("dish")}</label>
            <select
              value={dishId}
              onChange={(e) => {
                setDishId(e.target.value);
                const d = dishById.get(e.target.value);
                if (d && !priceEuros) setPriceEuros((d.price / 100).toFixed(2));
              }}
              className="mb-4 w-full rounded-xl border border-gray-300 px-3 py-2.5"
            >
              <option value="">{t("none")}</option>
              {dishes.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>

            <label className="mb-1 block text-sm font-semibold text-[var(--ink-faint)]">
              {t("price")} ({currency})
            </label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={priceEuros}
              onChange={(e) => setPriceEuros(e.target.value)}
              className="mb-4 w-full rounded-xl border border-gray-300 px-3 py-2.5"
              placeholder="0.00"
            />

            <label className="mb-1 block text-sm font-semibold text-[var(--ink-faint)]">{t("expiry")}</label>
            <input
              type="date"
              value={expiry}
              onChange={(e) => setExpiry(e.target.value)}
              className="mb-6 w-full rounded-xl border border-gray-300 px-3 py-2.5"
            />

            {selected.price == null && dishId && dishById.get(dishId) && (
              <p className="mb-4 -mt-3 text-xs text-[var(--ink-faint)]">
                Prix catalogue : {formatPrice(dishById.get(dishId)!.price, currency)}
              </p>
            )}

            <div className="flex gap-3">
              <button
                onClick={clear}
                className="flex flex-1 items-center justify-center gap-2 rounded-xl border-2 border-gray-200 py-3 font-bold text-[var(--ink-soft)] active:bg-gray-50"
              >
                <Trash2 size={18} />
                {t("clear")}
              </button>
              <button
                onClick={save}
                className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-[var(--green)] py-3 font-bold text-white active:opacity-80"
              >
                <Check size={18} />
                {t("save")}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

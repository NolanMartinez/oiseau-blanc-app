import { useEffect, useMemo, useState } from "react";
import { RefreshCw, Trash2, Check, ScanLine, Link2, CheckSquare } from "lucide-react";
import { useLang } from "../../i18n";
import { useKiosk } from "../../state/kiosk";
import { SETTING_KEYS, type DishCache, type Locker } from "../../db";
import { formatPrice } from "../../utils/format";
import { byCategoryThenName } from "../../utils/categories";
import { useBarcodeScanner } from "../../hooks/useBarcodeScanner";
import { hardware } from "../../hardware";

interface RestockBox { board: string; boxNumber: number; address: number }

const MAX_DLC_DAYS = 10;
const DEFAULT_DLC_DAYS = 3;

/** Date ISO (YYYY-MM-DD) à aujourd'hui + n jours. */
function isoDatePlus(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

export function MappingScreen() {
  const { t } = useLang();
  const { dispensers, lockers, dishes, repo, reload, runSync, setting } = useKiosk();
  const [board, setBoard] = useState("A");
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [multiMode, setMultiMode] = useState(false);
  const [dishId, setDishId] = useState("");
  const [priceEuros, setPriceEuros] = useState("");
  const [expiry, setExpiry] = useState("");
  const [dlcError, setDlcError] = useState("");
  const [syncMsg, setSyncMsg] = useState("");
  const [syncing, setSyncing] = useState(false);
  // Mode scan (douchette)
  const [scanMode, setScanMode] = useState(false);
  const [pendingDish, setPendingDish] = useState<DishCache | null>(null);
  const [linkCode, setLinkCode] = useState<string | null>(null);
  const [linkDishId, setLinkDishId] = useState("");
  const [scanMsg, setScanMsg] = useState("");
  // Réassort : casiers à ouvrir un par un pour que l'opérateur y place les plats.
  const [restock, setRestock] = useState<{ boxes: RestockBox[]; idx: number } | null>(null);
  const currency = setting(SETTING_KEYS.currency, "EUR");

  const boardLockers = useMemo(
    () => lockers.filter((l) => l.board === board).sort((a, b) => a.boxNumber - b.boxNumber),
    [lockers, board],
  );
  const dishById = useMemo(() => new Map(dishes.map((d) => [d.id, d])), [dishes]);
  // Plats regroupés par catégorie, dans l'ordre voulu (Entrées, Salades, Plats à
  // chauffer, Desserts) puis alphabétique — pour les menus déroulants.
  const dishGroups = useMemo(() => {
    const sorted = [...dishes].sort((a, b) =>
      byCategoryThenName(a.category, a.name, b.category, b.name),
    );
    const groups: { category: string; items: DishCache[] }[] = [];
    for (const d of sorted) {
      const cat = d.category ?? "Autres";
      let g = groups.find((x) => x.category === cat);
      if (!g) {
        g = { category: cat, items: [] };
        groups.push(g);
      }
      g.items.push(d);
    }
    return groups;
  }, [dishes]);
  // Casier unique sélectionné (édition « simple »). En multi, single = null.
  const single = selectedIds.length === 1 ? boardLockers.find((l) => l.id === selectedIds[0]) ?? null : null;

  function selectOnly(id: number) {
    setSelectedIds([id]);
  }
  function toggleSelect(id: number) {
    setSelectedIds((prev) => {
      if (multiMode) return prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id];
      return [id];
    });
  }

  // Pré-remplit l'éditeur sur sélection simple ; vide quand on déselectionne tout.
  // En multi-sélection (>1), on garde les champs comme gabarit d'affectation groupée.
  useEffect(() => {
    if (selectedIds.length === 1) {
      const l = boardLockers.find((x) => x.id === selectedIds[0]);
      if (l) {
        setDishId(l.dishId ?? "");
        setPriceEuros(l.price != null ? (l.price / 100).toFixed(2) : "");
        setExpiry(l.expiryDate ? l.expiryDate.slice(0, 10) : "");
        setDlcError("");
      }
    } else if (selectedIds.length === 0) {
      setDishId("");
      setPriceEuros("");
      setExpiry("");
      setDlcError("");
    }
  }, [selectedIds]); // eslint-disable-line react-hooks/exhaustive-deps

  async function save() {
    if (!repo || selectedIds.length === 0) return;
    setDlcError("");
    // DLC obligatoire et bornée à aujourd'hui + 10 jours (uniquement si un plat est affecté).
    if (dishId) {
      if (!expiry) {
        setDlcError(t("dlc_required"));
        return;
      }
      if (expiry < isoDatePlus(0) || expiry > isoDatePlus(MAX_DLC_DAYS)) {
        setDlcError(t("dlc_max_10"));
        return;
      }
    }
    const price = priceEuros.trim() ? Math.round(parseFloat(priceEuros) * 100) : null;
    // Casiers concernés (pour l'ouverture réassort) — capturés avant le reload.
    // Uniquement quand on AFFECTE un plat (pas au vidage).
    const restockBoxes: RestockBox[] = dishId
      ? selectedIds
          .map((id) => boardLockers.find((l) => l.id === id))
          .filter((l): l is Locker => !!l)
          .map((l) => ({ board: l.board, boxNumber: l.boxNumber, address: l.address ?? l.boxNumber }))
          .sort((a, b) => a.boxNumber - b.boxNumber)
      : [];
    // Affectation (groupée) à tous les casiers sélectionnés.
    for (const id of selectedIds) {
      await repo.setLockerMapping(id, {
        dishId: dishId || null,
        price: Number.isNaN(price as number) ? null : price,
        expiryDate: dishId ? expiry : null,
      });
    }
    await reload();
    setSelectedIds([]);
    // Ouvre le 1er casier pour que l'opérateur y place le plat ; il confirmera
    // chaque casier (qui se referme) pour passer au suivant.
    if (restockBoxes.length > 0) {
      setRestock({ boxes: restockBoxes, idx: 0 });
      void hardware.openLocker(restockBoxes[0].board, restockBoxes[0].address).catch(() => {});
    }
  }

  // Confirme le casier courant (le referme) et passe au suivant, ou clôt le réassort.
  function confirmRestock() {
    setRestock((r) => {
      if (!r) return null;
      void hardware.closeAll(r.boxes[r.idx].board).catch(() => {});
      const next = r.idx + 1;
      if (next >= r.boxes.length) return null;
      void hardware.openLocker(r.boxes[next].board, r.boxes[next].address).catch(() => {});
      return { ...r, idx: next };
    });
  }

  async function clear() {
    if (!repo || selectedIds.length === 0) return;
    for (const id of selectedIds) await repo.clearLocker(id);
    await reload();
    setSelectedIds([]);
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
          // DLC obligatoire : on met une valeur par défaut (ajustable dans l'éditeur).
          expiryDate: isoDatePlus(DEFAULT_DLC_DAYS),
        });
        await reload();
        setScanMsg(`${t("box")} ${asNum} ← ${pendingDish.name}`);
      } else {
        selectOnly(locker.id);
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
                    setSelectedIds([]);
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
            onClick={() => {
              setMultiMode((v) => !v);
              setSelectedIds([]);
            }}
            className={`flex items-center gap-2 rounded-xl px-4 py-2.5 font-bold active:opacity-80 ${
              multiMode ? "bg-[var(--green)] text-white" : "border-2 border-gray-200 text-[var(--ink-soft)]"
            }`}
          >
            <CheckSquare size={18} />
            {t("multi_select")}
          </button>
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
                {dishGroups.map((g) => (
                  <optgroup key={g.category} label={g.category}>
                    {g.items.map((d) => (
                      <option key={d.id} value={d.id}>{d.name}</option>
                    ))}
                  </optgroup>
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
                onClick={() => toggleSelect(l.id)}
                className={`flex aspect-square flex-col items-center justify-center gap-1 rounded-xl border-2 p-1 text-center ${
                  selectedIds.includes(l.id)
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

        {/* Éditeur de casier (simple ou groupé) */}
        {selectedIds.length > 0 && (
          <div className="w-80 shrink-0 overflow-y-auto border-l border-[var(--line)] bg-white p-6">
            <p className="mb-1 text-xl font-extrabold">
              {single ? `${t("box")} ${single.boxNumber}` : t("n_boxes_selected", { n: selectedIds.length })}
            </p>
            {!single && (
              <p className="mb-3 text-xs text-[var(--ink-faint)]">
                {t("apply_to_all_selected")}
              </p>
            )}

            <label className="mb-1 block text-sm font-semibold text-[var(--ink-faint)]">{t("dish")}</label>
            <select
              value={dishId}
              onChange={(e) => {
                setDishId(e.target.value);
                const d = dishById.get(e.target.value);
                if (d && !priceEuros) setPriceEuros((d.price / 100).toFixed(2));
                // DLC : pré-remplit la date limite = aujourd'hui + DLC (jours) de la
                // fiche produit, bornée à 10 jours max.
                if (d && d.dlcDays != null) {
                  setExpiry(isoDatePlus(Math.min(d.dlcDays, MAX_DLC_DAYS)));
                  setDlcError("");
                }
              }}
              className="mb-4 w-full rounded-xl border border-gray-300 px-3 py-2.5"
            >
              <option value="">{t("none")}</option>
              {dishGroups.map((g) => (
                <optgroup key={g.category} label={g.category}>
                  {g.items.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name}
                    </option>
                  ))}
                </optgroup>
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

            <label className="mb-1 block text-sm font-semibold text-[var(--ink-faint)]">
              {t("expiry")} <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              value={expiry}
              min={isoDatePlus(0)}
              max={isoDatePlus(MAX_DLC_DAYS)}
              onChange={(e) => {
                setExpiry(e.target.value);
                setDlcError("");
              }}
              className="w-full rounded-xl border border-gray-300 px-3 py-2.5"
            />
            <p className="mb-4 mt-1 text-xs text-[var(--ink-faint)]">{t("dlc_max_10")}</p>
            {dlcError && <p className="mb-3 -mt-2 text-sm font-semibold text-red-600">{dlcError}</p>}

            {(single ? single.price == null : true) && dishId && dishById.get(dishId) && (
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

      {/* Réassort : ouverture des casiers un par un + confirmation/fermeture. */}
      {restock && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-6">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <h3 className="text-xl font-extrabold">{t("restock_title")}</h3>
            <div className="mt-4 flex flex-wrap gap-2">
              {restock.boxes.map((b, i) => (
                <span
                  key={b.boxNumber}
                  className={`rounded-lg px-3 py-1.5 text-base font-bold ${
                    i === restock.idx
                      ? "bg-[var(--green)] text-white"
                      : i < restock.idx
                        ? "bg-gray-100 text-gray-400 line-through"
                        : "bg-gray-100 text-[var(--ink-soft)]"
                  }`}
                >
                  {b.boxNumber}
                </span>
              ))}
            </div>
            <div className="mt-5 rounded-2xl bg-[var(--green-tint)] py-6 text-center">
              <p className="text-sm font-bold uppercase tracking-wide text-[var(--green)]">{t("box")}</p>
              <p className="text-7xl font-extrabold leading-none text-[var(--green)]">
                {restock.boxes[restock.idx].boxNumber}
              </p>
              <p className="mt-2 text-sm text-[var(--ink-soft)]">{t("restock_place")}</p>
            </div>
            <button
              onClick={confirmRestock}
              className="mt-5 w-full rounded-2xl bg-[var(--green)] py-4 text-xl font-extrabold text-white active:scale-[0.98]"
            >
              {restock.idx + 1 < restock.boxes.length ? t("restock_next") : t("finish")}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

import { useEffect, useMemo, useState } from "react";
import { RefreshCw, Check, Play, ChevronDown, ChevronRight, Cpu } from "lucide-react";
import { useLang } from "../../i18n";
import { useKiosk } from "../../state/kiosk";
import { SETTING_KEYS } from "../../db";
import { hardware, encodeFrame, boardIndex, boxAddr } from "../../hardware";

const BOARDS = ["A", "B", "C", "D", "E"];
const BAUDS = [1200, 2400, 4800, 9600, 19200, 38400, 57600, 115200];
const PARITIES = ["none", "even", "odd"];

interface LinkDraft {
  comPort: string;
  baud: number;
  parity: string;
  enabled: boolean;
}

export function LiaisonsScreen() {
  const { t } = useLang();
  const { settings, dispensers, lockers, repo, reload, setSetting } = useKiosk();

  const [ports, setPorts] = useState<string[]>([]);
  const [links, setLinks] = useState<Record<string, LinkDraft>>({});
  const [addrBoard, setAddrBoard] = useState("A");
  const [addr, setAddr] = useState<Record<number, string>>({});
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [toast, setToast] = useState("");
  const [testBox, setTestBox] = useState(1);
  const [testResult, setTestResult] = useState("");

  const frameOpen = settings[SETTING_KEYS.frameOpen] ?? "02 {board} {box} {xor}";
  const boxBase = parseInt(settings[SETTING_KEYS.boxBase] ?? "1", 10) || 0;

  function flash(m: string) {
    setToast(m);
    window.setTimeout(() => setToast(""), 1800);
  }

  // Détecte les ports COM réels au montage.
  useEffect(() => {
    hardware.listComPorts().then(setPorts).catch(() => setPorts([]));
  }, []);

  // Initialise les brouillons de liaison depuis les dispensers.
  useEffect(() => {
    const byBoard = new Map(dispensers.map((d) => [d.board, d]));
    const next: Record<string, LinkDraft> = {};
    for (const b of BOARDS) {
      const d = byBoard.get(b);
      next[b] = {
        comPort: d?.comPort ?? "",
        baud: d?.baud ?? 9600,
        parity: d?.parity ?? "none",
        enabled: d?.enabled ?? false,
      };
    }
    setLinks(next);
  }, [dispensers]);

  // Initialise les adresses physiques pour la carte sélectionnée.
  useEffect(() => {
    const next: Record<number, string> = {};
    for (const l of lockers.filter((x) => x.board === addrBoard)) {
      next[l.id] = l.address != null ? String(l.address) : "";
    }
    setAddr(next);
  }, [lockers, addrBoard]);

  const addrLockers = useMemo(
    () => lockers.filter((l) => l.board === addrBoard).sort((a, b) => a.boxNumber - b.boxNumber),
    [lockers, addrBoard],
  );

  async function saveLink(board: string) {
    if (!repo) return;
    const l = links[board];
    await repo.setDispenserLink(board, l);
    await reload();
    flash(`${t("mainboard")} ${board} — ${t("saved")}`);
  }

  async function saveFrameSetting(key: string, value: string) {
    await setSetting(key, value);
    await reload();
    flash(t("saved"));
  }

  async function saveAddress(lockerId: number, raw: string) {
    if (!repo) return;
    const v = raw.trim() === "" ? null : parseInt(raw, 10);
    await repo.setLockerAddress(lockerId, Number.isNaN(v as number) ? null : v);
    await reload();
  }

  async function runTest() {
    setTestResult("…");
    try {
      const l = addrLockers.find((x) => x.boxNumber === testBox);
      const physical = l?.address ?? testBox;
      await hardware.openLocker(addrBoard, physical);
      setTestResult(`✓ ${addrBoard} · ${t("box")} ${testBox} → ${physical}`);
    } catch (e) {
      setTestResult(`✗ ${e instanceof Error ? e.message : "erreur"}`);
    }
  }

  // Aperçu local de la trame (instantané, sans aller-retour).
  const framePreview = useMemo(() => {
    try {
      return encodeFrame(frameOpen, boardIndex(addrBoard), boxAddr(testBox, boxBase));
    } catch (e) {
      return e instanceof Error ? e.message : "—";
    }
  }, [frameOpen, addrBoard, testBox, boxBase]);

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-[var(--line)] bg-white px-6 py-4">
        <h2 className="text-2xl font-extrabold">{t("liaisons_title")}</h2>
        <button
          onClick={() => hardware.listComPorts().then(setPorts)}
          className="flex items-center gap-2 rounded-xl border-2 border-gray-200 px-4 py-2.5 font-bold text-[var(--ink-soft)] active:bg-gray-50"
        >
          <RefreshCw size={18} />
          {t("detect_ports")}
        </button>
      </div>

      {toast && (
        <div className="flex items-center gap-2 bg-[var(--green-tint)] px-6 py-2 text-sm font-semibold text-[var(--green)]">
          <Check size={16} /> {toast}
        </div>
      )}

      <div className="flex-1 space-y-5 overflow-y-auto p-6">
        {/* Cartes & ports COM */}
        <section className="rounded-2xl bg-white p-6 shadow-sm">
          <p className="mb-4 text-lg font-bold">{t("board_links")}</p>
          <div className="space-y-3">
            {BOARDS.map((b) => {
              const l = links[b];
              if (!l) return null;
              return (
                <div key={b} className="flex flex-wrap items-end gap-3 rounded-xl border border-[var(--line)] p-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-[var(--green-tint)] text-xl font-extrabold text-[var(--green)]">
                    {b}
                  </div>

                  <div className="flex-1">
                    <label className="mb-1 block text-xs font-semibold text-[var(--ink-faint)]">{t("payment_port")} COM</label>
                    <input
                      list="com-ports"
                      value={l.comPort}
                      onChange={(e) => setLinks((p) => ({ ...p, [b]: { ...p[b], comPort: e.target.value } }))}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2"
                      placeholder="COM1"
                    />
                  </div>

                  <div className="w-28">
                    <label className="mb-1 block text-xs font-semibold text-[var(--ink-faint)]">{t("baud")}</label>
                    <select
                      value={l.baud}
                      onChange={(e) => setLinks((p) => ({ ...p, [b]: { ...p[b], baud: parseInt(e.target.value, 10) } }))}
                      className="w-full rounded-lg border border-gray-300 px-2 py-2"
                    >
                      {BAUDS.map((x) => (
                        <option key={x} value={x}>{x}</option>
                      ))}
                    </select>
                  </div>

                  <div className="w-24">
                    <label className="mb-1 block text-xs font-semibold text-[var(--ink-faint)]">{t("parity")}</label>
                    <select
                      value={l.parity}
                      onChange={(e) => setLinks((p) => ({ ...p, [b]: { ...p[b], parity: e.target.value } }))}
                      className="w-full rounded-lg border border-gray-300 px-2 py-2"
                    >
                      {PARITIES.map((x) => (
                        <option key={x} value={x}>{x}</option>
                      ))}
                    </select>
                  </div>

                  <label className="flex items-center gap-2 pb-2">
                    <input
                      type="checkbox"
                      checked={l.enabled}
                      onChange={(e) => setLinks((p) => ({ ...p, [b]: { ...p[b], enabled: e.target.checked } }))}
                      className="h-5 w-5 accent-[var(--green)]"
                    />
                    <span className="text-sm font-medium">{t("enabled_f")}</span>
                  </label>

                  <button
                    onClick={() => saveLink(b)}
                    className="flex items-center gap-2 rounded-lg bg-[var(--green)] px-4 py-2 font-bold text-white active:opacity-80"
                  >
                    <Check size={16} />
                    {t("save")}
                  </button>
                </div>
              );
            })}
          </div>
          <datalist id="com-ports">
            {ports.map((p) => (
              <option key={p} value={p} />
            ))}
          </datalist>
        </section>

        {/* Trame d'ouverture */}
        <section className="rounded-2xl bg-white p-6 shadow-sm">
          <p className="mb-4 text-lg font-bold">{t("open_frame")}</p>
          <input
            defaultValue={frameOpen}
            onBlur={(e) => saveFrameSetting(SETTING_KEYS.frameOpen, e.target.value)}
            className="w-full rounded-xl border border-gray-300 px-3 py-2.5 font-mono"
            placeholder="02 {board} {box} {xor}"
          />
          <p className="mt-1 text-xs text-[var(--ink-faint)]">{t("frame_hint")}</p>

          <div className="mt-4 flex items-center gap-4">
            <div>
              <label className="mb-1 block text-sm font-semibold text-[var(--ink-faint)]">{t("box_base_label")}</label>
              <select
                value={String(boxBase)}
                onChange={(e) => saveFrameSetting(SETTING_KEYS.boxBase, e.target.value)}
                className="rounded-xl border border-gray-300 px-3 py-2.5"
              >
                <option value="1">1 → 1..32</option>
                <option value="0">0 → 0..31</option>
              </select>
            </div>
            <div className="flex-1">
              <label className="mb-1 block text-sm font-semibold text-[var(--ink-faint)]">{t("preview")}</label>
              <div className="rounded-xl bg-gray-900 px-3 py-2.5 font-mono text-[var(--blue)]">{framePreview}</div>
            </div>
          </div>

          {/* Avancé : trames optionnelles */}
          <button
            onClick={() => setShowAdvanced((v) => !v)}
            className="mt-4 flex items-center gap-1 text-sm font-semibold text-[var(--green)]"
          >
            {showAdvanced ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
            {t("advanced")}
          </button>
          {showAdvanced && (
            <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-semibold text-[var(--ink-faint)]">{t("close_all_frame")}</label>
                <input
                  defaultValue={settings[SETTING_KEYS.frameCloseAll] ?? ""}
                  onBlur={(e) => saveFrameSetting(SETTING_KEYS.frameCloseAll, e.target.value)}
                  className="w-full rounded-xl border border-gray-300 px-3 py-2.5 font-mono"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-semibold text-[var(--ink-faint)]">{t("clear_frame")}</label>
                <input
                  defaultValue={settings[SETTING_KEYS.frameClear] ?? ""}
                  onBlur={(e) => saveFrameSetting(SETTING_KEYS.frameClear, e.target.value)}
                  className="w-full rounded-xl border border-gray-300 px-3 py-2.5 font-mono"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-semibold text-[var(--ink-faint)]">{t("frame_defrost")}</label>
                <input
                  defaultValue={settings[SETTING_KEYS.frameDefrost] ?? ""}
                  onBlur={(e) => saveFrameSetting(SETTING_KEYS.frameDefrost, e.target.value)}
                  className="w-full rounded-xl border border-gray-300 px-3 py-2.5 font-mono"
                />
              </div>
            </div>
          )}
        </section>

        {/* Adresses physiques + test */}
        <section className="rounded-2xl bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <p className="text-lg font-bold">{t("physical_addresses")}</p>
            <div className="flex gap-1">
              {BOARDS.filter((b) => links[b]?.enabled || b === "A").map((b) => (
                <button
                  key={b}
                  onClick={() => setAddrBoard(b)}
                  className={`h-9 w-9 rounded-lg font-bold ${
                    addrBoard === b ? "bg-[var(--green)] text-white" : "bg-gray-100 text-[var(--ink-soft)]"
                  }`}
                >
                  {b}
                </button>
              ))}
            </div>
          </div>
          <p className="mb-3 text-xs text-[var(--ink-faint)]">{t("physical_addr_hint")}</p>

          <div className="grid grid-cols-4 gap-2 sm:grid-cols-6 lg:grid-cols-8">
            {addrLockers.map((l) => (
              <div key={l.id} className="rounded-lg border border-[var(--line)] p-1.5 text-center">
                <div className="text-xs font-bold text-[var(--ink-faint)]">{l.boxNumber}</div>
                <input
                  value={addr[l.id] ?? ""}
                  onChange={(e) => setAddr((p) => ({ ...p, [l.id]: e.target.value }))}
                  onBlur={(e) => saveAddress(l.id, e.target.value)}
                  className="w-full rounded border border-gray-200 px-1 py-1 text-center text-sm"
                  placeholder={String(l.boxNumber)}
                  inputMode="numeric"
                />
              </div>
            ))}
          </div>

          {/* Test d'ouverture */}
          <div className="mt-5 flex flex-wrap items-end gap-3 border-t border-[var(--line)] pt-4">
            <Cpu size={20} className="mb-2 text-[var(--ink-faint)]" />
            <div className="w-28">
              <label className="mb-1 block text-xs font-semibold text-[var(--ink-faint)]">{t("box")}</label>
              <input
                type="number"
                min={1}
                max={32}
                value={testBox}
                onChange={(e) => setTestBox(parseInt(e.target.value, 10) || 1)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2"
              />
            </div>
            <button
              onClick={runTest}
              className="flex items-center gap-2 rounded-lg bg-[var(--blue)] px-5 py-2.5 font-bold text-white active:opacity-80"
            >
              <Play size={16} />
              {t("test")}
            </button>
            {testResult && <span className="pb-2 font-mono text-sm text-[var(--ink-soft)]">{testResult}</span>}
          </div>
        </section>
      </div>
    </div>
  );
}

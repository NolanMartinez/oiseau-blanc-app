import { useState } from "react";
import { RefreshCw, Check } from "lucide-react";
import { useLang, SUPPORTED_LANGS, type LangCode } from "../../i18n";
import { useKiosk } from "../../state/kiosk";
import { SETTING_KEYS } from "../../db";

function Toggle({ on, onChange }: { on: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!on)}
      className={`relative h-8 w-14 rounded-full transition ${on ? "bg-[var(--green)]" : "bg-gray-300"}`}
    >
      <span
        className={`absolute top-1 h-6 w-6 rounded-full bg-white transition ${on ? "left-7" : "left-1"}`}
      />
    </button>
  );
}

export function SettingsScreen() {
  const { t, lang, setLang } = useLang();
  const { settings, setSetting, runSync } = useKiosk();
  const [toast, setToast] = useState("");
  const [syncing, setSyncing] = useState(false);

  function flash(msg: string) {
    setToast(msg);
    window.setTimeout(() => setToast(""), 1800);
  }

  async function save(key: string, value: string) {
    await setSetting(key, value);
    flash(t("saved"));
  }

  async function doSync() {
    setSyncing(true);
    const res = await runSync();
    setSyncing(false);
    flash(res.ok ? t("synced", { n: res.dishCount }) : t("sync_failed"));
  }

  const get = (k: string, fb = "") => settings[k] ?? fb;

  const comPorts: { key: string; label: string }[] = [
    { key: SETTING_KEYS.mainboardA, label: `${t("mainboard")} A` },
    { key: SETTING_KEYS.mainboardB, label: `${t("mainboard")} B` },
    { key: SETTING_KEYS.mainboardC, label: `${t("mainboard")} C` },
    { key: SETTING_KEYS.mainboardD, label: `${t("mainboard")} D` },
    { key: SETTING_KEYS.mainboardE, label: `${t("mainboard")} E` },
    { key: SETTING_KEYS.paymentCom, label: t("payment_port") },
  ];

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-[var(--line)] bg-white px-6 py-4">
        <h2 className="text-2xl font-extrabold">{t("settings_title")}</h2>
        <button
          onClick={doSync}
          disabled={syncing}
          className="flex items-center gap-2 rounded-xl bg-[var(--blue)] px-4 py-2.5 font-bold text-white active:opacity-80 disabled:opacity-50"
        >
          <RefreshCw size={18} className={syncing ? "animate-spin" : ""} />
          {t("check_updates")}
        </button>
      </div>

      {toast && (
        <div className="flex items-center gap-2 bg-[var(--green-tint)] px-6 py-2 text-sm font-semibold text-[var(--green)]">
          <Check size={16} /> {toast}
        </div>
      )}

      <div className="grid flex-1 grid-cols-1 content-start gap-5 overflow-y-auto p-6 lg:grid-cols-2">
        {/* Connexion serveur */}
        <section className="rounded-2xl bg-white p-6 shadow-sm">
          <p className="mb-4 text-lg font-bold">{t("backend_url")}</p>
          <label className="mb-1 block text-sm font-semibold text-[var(--ink-faint)]">{t("backend_url")}</label>
          <input
            defaultValue={get(SETTING_KEYS.backendUrl)}
            onBlur={(e) => save(SETTING_KEYS.backendUrl, e.target.value)}
            className="mb-4 w-full rounded-xl border border-gray-300 px-3 py-2.5"
            placeholder="http://192.168.1.10:3001"
          />
          <label className="mb-1 block text-sm font-semibold text-[var(--ink-faint)]">{t("frigo_id")}</label>
          <input
            defaultValue={get(SETTING_KEYS.frigoId)}
            onBlur={(e) => save(SETTING_KEYS.frigoId, e.target.value)}
            className="w-full rounded-xl border border-gray-300 px-3 py-2.5"
            placeholder="f1"
          />
        </section>

        {/* Ports COM */}
        <section className="rounded-2xl bg-white p-6 shadow-sm">
          <p className="mb-4 text-lg font-bold">{t("com_ports")}</p>
          <div className="grid grid-cols-2 gap-3">
            {comPorts.map((c) => (
              <div key={c.key}>
                <label className="mb-1 block text-sm font-semibold text-[var(--ink-faint)]">{c.label}</label>
                <input
                  defaultValue={get(c.key)}
                  onBlur={(e) => save(c.key, e.target.value)}
                  className="w-full rounded-xl border border-gray-300 px-3 py-2.5"
                  placeholder="COM1"
                />
              </div>
            ))}
          </div>
        </section>

        {/* Activation */}
        <section className="rounded-2xl bg-white p-6 shadow-sm">
          <p className="mb-4 text-lg font-bold">{t("activation")}</p>
          <div className="flex items-center justify-between py-2">
            <span className="font-medium">{t("mdb")}</span>
            <Toggle on={get(SETTING_KEYS.mdbEnabled) === "1"} onChange={(v) => save(SETTING_KEYS.mdbEnabled, v ? "1" : "0")} />
          </div>
          <div className="flex items-center justify-between py-2">
            <span className="font-medium">{t("free_sale")}</span>
            <Toggle on={get(SETTING_KEYS.venteLibre) === "1"} onChange={(v) => save(SETTING_KEYS.venteLibre, v ? "1" : "0")} />
          </div>
          <div className="mt-3">
            <label className="mb-1 block text-sm font-semibold text-[var(--ink-faint)]">{t("currency")}</label>
            <input
              defaultValue={get(SETTING_KEYS.currency, "EUR")}
              onBlur={(e) => save(SETTING_KEYS.currency, e.target.value.toUpperCase())}
              className="w-32 rounded-xl border border-gray-300 px-3 py-2.5"
            />
          </div>
        </section>

        {/* Température / alarme / PIN / langue */}
        <section className="rounded-2xl bg-white p-6 shadow-sm">
          <p className="mb-4 text-lg font-bold">{t("temp_thresholds")}</p>
          <div className="mb-4 grid grid-cols-3 gap-3">
            <div>
              <label className="mb-1 block text-sm font-semibold text-[var(--ink-faint)]">[F] °C</label>
              <input
                type="number"
                defaultValue={get(SETTING_KEYS.tempThresholdF, "-15")}
                onBlur={(e) => save(SETTING_KEYS.tempThresholdF, e.target.value)}
                className="w-full rounded-xl border border-gray-300 px-3 py-2.5"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-semibold text-[var(--ink-faint)]">[C] °C</label>
              <input
                type="number"
                defaultValue={get(SETTING_KEYS.tempThresholdC, "10")}
                onBlur={(e) => save(SETTING_KEYS.tempThresholdC, e.target.value)}
                className="w-full rounded-xl border border-gray-300 px-3 py-2.5"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-semibold text-[var(--ink-faint)]">{t("alarm_delay")}</label>
              <input
                type="number"
                defaultValue={get(SETTING_KEYS.alarmDelay, "180")}
                onBlur={(e) => save(SETTING_KEYS.alarmDelay, e.target.value)}
                className="w-full rounded-xl border border-gray-300 px-3 py-2.5"
              />
            </div>
          </div>

          <label className="mb-1 block text-sm font-semibold text-[var(--ink-faint)]">{t("admin_pin")}</label>
          <input
            defaultValue={get(SETTING_KEYS.adminPin, "1234")}
            onBlur={(e) => save(SETTING_KEYS.adminPin, e.target.value)}
            className="mb-4 w-40 rounded-xl border border-gray-300 px-3 py-2.5"
            inputMode="numeric"
          />

          <label className="mb-1 block text-sm font-semibold text-[var(--ink-faint)]">{t("language")}</label>
          <div className="flex flex-wrap gap-2">
            {SUPPORTED_LANGS.map((l) => (
              <button
                key={l.code}
                onClick={() => {
                  setLang(l.code as LangCode);
                  save(SETTING_KEYS.langDefault, l.code);
                }}
                className={`flex items-center gap-2 rounded-xl px-3 py-2 font-semibold ${
                  lang === l.code ? "bg-[var(--green)] text-white" : "bg-gray-100 text-[var(--ink-soft)]"
                }`}
              >
                <span className="text-lg">{l.flag}</span>
                {l.code.toUpperCase()}
              </button>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}

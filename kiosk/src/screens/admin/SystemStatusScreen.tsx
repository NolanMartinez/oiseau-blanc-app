import { useEffect, useState } from "react";
import { Wifi, WifiOff, CreditCard, RadioTower, RefreshCw, Thermometer, HardDrive, Cpu } from "lucide-react";
import { useLang } from "../../i18n";
import { useKiosk } from "../../state/kiosk";
import { hardware } from "../../hardware";
import { pingBackend } from "../../sync";
import { SETTING_KEYS } from "../../db";

const RELEASE = "1.0.0";

function StatusDot({ ok }: { ok: boolean }) {
  return <span className={`inline-block h-3 w-3 rounded-full ${ok ? "bg-green-500" : "bg-red-500"}`} />;
}

export function SystemStatusScreen() {
  const { t } = useLang();
  const { setting } = useKiosk();
  const [temp, setTemp] = useState<number | null>(null);
  const [online, setOnline] = useState(false);
  const mdbEnabled = setting(SETTING_KEYS.mdbEnabled) === "1";

  useEffect(() => {
    let active = true;
    async function refresh() {
      const tp = await hardware.readTemperature("A");
      const net = await pingBackend(setting(SETTING_KEYS.backendUrl));
      if (active) {
        setTemp(tp);
        setOnline(net);
      }
    }
    refresh();
    const id = window.setInterval(refresh, 5000);
    return () => {
      active = false;
      clearInterval(id);
    };
  }, [setting]);

  const rows: { icon: React.ReactNode; label: string; ok: boolean }[] = [
    { icon: <RadioTower size={20} />, label: t("comm"), ok: true },
    { icon: <CreditCard size={20} />, label: t("payment_system"), ok: mdbEnabled },
    { icon: online ? <Wifi size={20} /> : <WifiOff size={20} />, label: t("internet"), ok: online },
    { icon: <RefreshCw size={20} />, label: t("updated"), ok: true },
  ];

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-[var(--line)] bg-white px-6 py-4">
        <h2 className="text-2xl font-extrabold">{t("status_title")}</h2>
      </div>

      <div className="grid flex-1 grid-cols-1 content-start gap-5 overflow-y-auto p-6 md:grid-cols-2">
        {/* État liaisons */}
        <div className="rounded-2xl bg-white p-6 shadow-sm">
          <p className="mb-4 text-lg font-bold">{t("comm")}</p>
          <div className="space-y-3">
            {rows.map((r) => (
              <div key={r.label} className="flex items-center justify-between">
                <span className="flex items-center gap-3 text-[var(--ink-soft)]">
                  {r.icon}
                  {r.label}
                </span>
                <StatusDot ok={r.ok} />
              </div>
            ))}
          </div>
        </div>

        {/* Réfrigération */}
        <div className="rounded-2xl bg-white p-6 shadow-sm">
          <p className="mb-4 text-lg font-bold">{t("temperature")}</p>
          <div className="flex items-center gap-4">
            <Thermometer size={40} className="text-[var(--blue)]" />
            <span className="text-5xl font-extrabold">
              {temp != null ? `${temp.toFixed(1)}°C` : "—"}
            </span>
          </div>
          <div className="mt-4 flex items-center justify-between text-[var(--ink-soft)]">
            <span>{t("machine_in_phase")}</span>
            <StatusDot ok={true} />
          </div>
        </div>

        {/* Stockage / version */}
        <div className="rounded-2xl bg-white p-6 shadow-sm">
          <p className="mb-4 text-lg font-bold">{t("flash_free")}</p>
          <div className="flex items-center gap-4">
            <HardDrive size={36} className="text-[var(--green)]" />
            <span className="text-3xl font-extrabold">65,9 %</span>
          </div>
        </div>

        <div className="rounded-2xl bg-white p-6 shadow-sm">
          <p className="mb-4 text-lg font-bold">{t("release")}</p>
          <div className="flex items-center gap-4">
            <Cpu size={36} className="text-[var(--ink-soft)]" />
            <div>
              <p className="text-2xl font-extrabold">Friggo Borne {RELEASE}</p>
              <p className={`text-sm font-semibold ${online ? "text-green-600" : "text-red-500"}`}>
                {online ? t("online") : t("offline")}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

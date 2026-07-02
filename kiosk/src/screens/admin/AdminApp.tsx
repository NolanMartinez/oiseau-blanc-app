import { useState } from "react";
import { Grid3x3, DoorOpen, Activity, Settings as SettingsIcon, LogOut, Power, Cable } from "lucide-react";
import { useLang } from "../../i18n";
import { quitApp } from "../../platform/app";
import { MappingScreen } from "./MappingScreen";
import { BoxControlScreen } from "./BoxControlScreen";
import { SystemStatusScreen } from "./SystemStatusScreen";
import { SettingsScreen } from "./SettingsScreen";
import { LiaisonsScreen } from "./LiaisonsScreen";
import type { AdminRole } from "./PinLock";

type Tab = "mapping" | "liaisons" | "box" | "status" | "settings";

// Onglets autorisés par rôle. Le livreur n'accède qu'au réassort et à l'ouverture
// des casiers — pas aux liaisons/réglages, pour éviter les fausses manip.
const LIVREUR_TABS: Tab[] = ["mapping", "box"];

export function AdminApp({ role, onExit }: { role: AdminRole; onExit: () => void }) {
  const { t } = useLang();
  const isLivreur = role === "livreur";
  const [tab, setTab] = useState<Tab>("mapping");

  const allNav: { id: Tab; icon: React.ReactNode; label: string }[] = [
    { id: "mapping", icon: <Grid3x3 size={22} />, label: t("nav_mapping") },
    { id: "liaisons", icon: <Cable size={22} />, label: t("nav_liaisons") },
    { id: "box", icon: <DoorOpen size={22} />, label: t("nav_box") },
    { id: "status", icon: <Activity size={22} />, label: t("nav_status") },
    { id: "settings", icon: <SettingsIcon size={22} />, label: t("nav_settings") },
  ];
  const nav = isLivreur ? allNav.filter((n) => LIVREUR_TABS.includes(n.id)) : allNav;

  return (
    <div className="flex h-full">
      {/* Sidebar */}
      <aside className="flex w-56 flex-col bg-gray-900 text-white">
        <div className="border-b border-gray-700 px-5 py-5">
          <p className="text-xs uppercase tracking-widest text-gray-400">
            {isLivreur ? t("role_livreur") : "Administration"}
          </p>
          <h1 className="mt-1 text-lg" style={{ fontWeight: 900, letterSpacing: "-0.02em" }}>
            <span style={{ color: "#70C8F2" }}>Frig</span>
            <span style={{ color: "#319966" }}>go</span>
          </h1>
        </div>

        <nav className="flex-1 space-y-1 px-3 py-4">
          {nav.map((n) => (
            <button
              key={n.id}
              onClick={() => setTab(n.id)}
              className={`flex w-full items-center gap-3 rounded-lg px-3 py-3 text-left text-sm transition ${
                tab === n.id ? "bg-[var(--green)] text-white" : "text-gray-400 active:bg-gray-800"
              }`}
            >
              {n.icon}
              {n.label}
            </button>
          ))}
        </nav>

        <button
          onClick={onExit}
          className="mx-3 mt-3 flex items-center gap-2 rounded-lg px-3 py-3 text-sm text-gray-400 active:bg-gray-800"
        >
          <LogOut size={20} />
          {t("exit_admin")}
        </button>
        {/* Fermer l'application est réservé à l'admin (risque d'immobiliser la borne). */}
        {!isLivreur && (
          <button
            onClick={() => quitApp()}
            className="mx-3 mb-3 mt-1 flex items-center gap-2 rounded-lg bg-red-600/90 px-3 py-3 text-sm font-semibold text-white active:bg-red-700"
          >
            <Power size={20} />
            {t("quit_app")}
          </button>
        )}
      </aside>

      {/* Contenu */}
      <main className="flex-1 overflow-hidden bg-[var(--cream)]">
        {tab === "mapping" && <MappingScreen />}
        {tab === "liaisons" && <LiaisonsScreen />}
        {tab === "box" && <BoxControlScreen />}
        {tab === "status" && <SystemStatusScreen />}
        {tab === "settings" && <SettingsScreen />}
      </main>
    </div>
  );
}

import { useRef, useState } from "react";
import { Loader2 } from "lucide-react";
import { LangProvider } from "./i18n";
import { KioskProvider, useKiosk } from "./state/kiosk";
import { CustomerApp } from "./screens/customer/CustomerApp";
import { AdminApp } from "./screens/admin/AdminApp";
import { PinLock, type AdminRole } from "./screens/admin/PinLock";

type Mode = "customer" | "pin" | "admin";

/** Zone tactile invisible (coin haut-gauche) : 5 appuis rapides => accès admin. */
function AdminHotspot({ onTrigger }: { onTrigger: () => void }) {
  const taps = useRef<number[]>([]);
  function handle() {
    const now = Date.now();
    taps.current = [...taps.current.filter((tp) => now - tp < 1500), now];
    if (taps.current.length >= 5) {
      taps.current = [];
      onTrigger();
    }
  }
  return (
    <button
      onClick={handle}
      aria-label="admin"
      className="fixed left-0 top-0 z-50 h-16 w-16 opacity-0"
      tabIndex={-1}
    />
  );
}

function Shell() {
  const { ready } = useKiosk();
  const [mode, setMode] = useState<Mode>("customer");
  const [role, setRole] = useState<AdminRole>("admin");

  if (!ready) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-[var(--cream)]">
        <Loader2 size={48} className="animate-spin text-[var(--green)]" />
      </div>
    );
  }

  return (
    <div className="h-full w-full">
      {mode === "customer" && (
        <>
          <CustomerApp />
          <AdminHotspot onTrigger={() => setMode("pin")} />
        </>
      )}
      {mode === "pin" && (
        <PinLock
          onUnlock={(r) => {
            setRole(r);
            setMode("admin");
          }}
          onCancel={() => setMode("customer")}
        />
      )}
      {mode === "admin" && <AdminApp role={role} onExit={() => setMode("customer")} />}
    </div>
  );
}

export default function App() {
  return (
    <LangProvider>
      <KioskProvider>
        <Shell />
      </KioskProvider>
    </LangProvider>
  );
}

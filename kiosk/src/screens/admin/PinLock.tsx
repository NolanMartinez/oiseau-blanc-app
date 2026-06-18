import { useState } from "react";
import { Delete, Lock, X } from "lucide-react";
import { useLang } from "../../i18n";
import { useKiosk } from "../../state/kiosk";
import { SETTING_KEYS } from "../../db";

export function PinLock({ onUnlock, onCancel }: { onUnlock: () => void; onCancel: () => void }) {
  const { t } = useLang();
  const { setting } = useKiosk();
  const [pin, setPin] = useState("");
  const [error, setError] = useState(false);

  const expected = setting(SETTING_KEYS.adminPin, "1234");

  function press(d: string) {
    setError(false);
    const next = (pin + d).slice(0, 6);
    setPin(next);
  }

  function validate() {
    if (pin === expected) {
      onUnlock();
    } else {
      setError(true);
      setPin("");
    }
  }

  return (
    <div className="flex h-full flex-col items-center justify-center gap-8 bg-gray-900 px-8 text-white">
      <button onClick={onCancel} className="absolute right-6 top-6 text-gray-400 active:text-white">
        <X size={32} />
      </button>

      <div className="flex flex-col items-center gap-3">
        <Lock size={40} className="text-[var(--blue)]" />
        <h1 className="text-3xl font-bold">{t("admin_access")}</h1>
        <p className="text-gray-400">{t("enter_pin")}</p>
      </div>

      {/* Affichage du PIN */}
      <div className="flex gap-3">
        {Array.from({ length: Math.max(4, pin.length) }).map((_, i) => (
          <div
            key={i}
            className={`h-4 w-4 rounded-full ${i < pin.length ? "bg-[var(--blue)]" : "bg-gray-600"}`}
          />
        ))}
      </div>

      {error && <p className="text-lg font-semibold text-red-400">{t("wrong_pin")}</p>}

      {/* Clavier */}
      <div className="grid grid-cols-3 gap-4">
        {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((d) => (
          <button
            key={d}
            onClick={() => press(d)}
            className="h-20 w-20 rounded-2xl bg-gray-800 text-3xl font-bold active:bg-gray-700"
          >
            {d}
          </button>
        ))}
        <button
          onClick={() => setPin(pin.slice(0, -1))}
          className="flex h-20 w-20 items-center justify-center rounded-2xl bg-gray-800 active:bg-gray-700"
        >
          <Delete size={28} />
        </button>
        <button
          onClick={() => press("0")}
          className="h-20 w-20 rounded-2xl bg-gray-800 text-3xl font-bold active:bg-gray-700"
        >
          0
        </button>
        <button
          onClick={validate}
          className="h-20 w-20 rounded-2xl bg-[var(--green)] text-xl font-bold active:opacity-80"
        >
          OK
        </button>
      </div>
    </div>
  );
}

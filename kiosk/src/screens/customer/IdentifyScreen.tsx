import { useState } from "react";
import { Gift, ChevronRight, Delete } from "lucide-react";
import { useLang } from "../../i18n";
import { useKiosk } from "../../state/kiosk";
import { SETTING_KEYS } from "../../db";
import { loyaltyLookup, type LoyaltyStatus } from "../../sync";

// Écran d'identification fidélité (facultatif) : le client saisit son code à 6
// chiffres (obtenu dans son profil sur l'app friggo) sur un pavé numérique.
export function IdentifyScreen({
  onValidated,
  onSkip,
}: {
  onValidated: (code: string, loyalty: LoyaltyStatus | null, useReward: boolean) => void;
  onSkip: () => void;
}) {
  const { t } = useLang();
  const { setting } = useKiosk();
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [status, setStatus] = useState<LoyaltyStatus | null>(null);
  const [useReward, setUseReward] = useState(false);

  const frigoId = setting(SETTING_KEYS.frigoId);
  const backendUrl = setting(SETTING_KEYS.backendUrl);

  function press(d: string) {
    setError(false);
    setStatus(null);
    setCode((c) => (c + d).slice(0, 5));
  }

  async function lookup() {
    if (code.length !== 5) return;
    setLoading(true);
    const res = await loyaltyLookup(backendUrl, frigoId, code);
    setLoading(false);
    if (!res) {
      setError(true); // code inconnu
      setCode("");
      return;
    }
    setStatus(res);
    setUseReward(res.rewardAvailable);
  }

  return (
    <div className="flex h-full flex-col">
      <header className="flex items-center bg-white px-8 py-5 shadow-sm">
        <button onClick={onSkip} className="text-2xl font-bold text-[var(--green)] active:opacity-60">
          ‹ {t("back")}
        </button>
        <h1 className="mx-auto flex items-center gap-2 text-3xl font-extrabold">
          <Gift size={28} className="text-[var(--green)]" />
          {t("loyalty_title")}
        </h1>
        <span className="w-24" />
      </header>

      <div className="flex flex-1 flex-col items-center justify-center gap-6 p-6">
        <p className="max-w-lg text-center text-xl text-[var(--ink-soft)]">{t("loyalty_prompt")}</p>

        {!status ? (
          <>
            {/* Affichage du code : 5 cases */}
            <div className="flex gap-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <div
                  key={i}
                  className={`flex h-16 w-12 items-center justify-center rounded-2xl border-2 text-3xl font-extrabold ${
                    i < code.length ? "border-[var(--green)] bg-[var(--green-tint)]" : "border-gray-200 bg-white"
                  }`}
                >
                  {code[i] ?? ""}
                </div>
              ))}
            </div>

            {error && <p className="text-lg font-semibold text-red-500">{t("loyalty_unknown_code")}</p>}

            {/* Pavé numérique */}
            <div className="grid grid-cols-3 gap-3">
              {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((d) => (
                <button
                  key={d}
                  onClick={() => press(d)}
                  className="h-16 w-20 rounded-2xl bg-white text-3xl font-bold text-[var(--ink)] shadow-sm active:scale-95 active:bg-gray-100"
                >
                  {d}
                </button>
              ))}
              <button
                onClick={() => setCode((c) => c.slice(0, -1))}
                className="flex h-16 w-20 items-center justify-center rounded-2xl bg-white text-[var(--ink)] shadow-sm active:scale-95"
              >
                <Delete size={26} />
              </button>
              <button
                onClick={() => press("0")}
                className="h-16 w-20 rounded-2xl bg-white text-3xl font-bold text-[var(--ink)] shadow-sm active:scale-95 active:bg-gray-100"
              >
                0
              </button>
              <button
                onClick={lookup}
                disabled={loading || code.length !== 5}
                className="flex h-16 w-20 items-center justify-center rounded-2xl bg-[var(--green)] text-lg font-extrabold text-white shadow-md active:scale-95 disabled:opacity-40"
              >
                {loading ? "…" : "OK"}
              </button>
            </div>
          </>
        ) : (
          <div className="flex w-full max-w-md flex-col items-center gap-4">
            {/* Solde */}
            <div className="w-full rounded-2xl bg-[var(--green-tint)] px-6 py-4 text-center">
              <p className="text-2xl font-extrabold text-[var(--green)]">
                {t("loyalty_balance", { n: status.points })}
              </p>
              {status.rewardAvailable ? (
                <p className="mt-1 text-lg font-bold text-[var(--green)]">{t("loyalty_reward_ready")}</p>
              ) : (
                <p className="mt-1 text-base text-[var(--ink-soft)]">
                  {t("loyalty_to_go", { n: Math.max(0, status.pointsReward - status.points) })}
                </p>
              )}
            </div>

            {/* Utiliser le repas offert */}
            {status.rewardAvailable && (
              <label className="flex w-full items-center justify-between gap-3 rounded-2xl border-2 border-[var(--green)]/40 bg-white px-5 py-4">
                <span className="text-lg font-bold">{t("loyalty_use_reward")}</span>
                <input
                  type="checkbox"
                  checked={useReward}
                  onChange={(e) => setUseReward(e.target.checked)}
                  className="h-6 w-6 accent-[var(--green)]"
                />
              </label>
            )}

            <button
              onClick={() => onValidated(code, status, useReward)}
              className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[var(--green)] px-10 py-4 text-2xl font-extrabold text-white shadow-lg active:scale-[0.98]"
            >
              {t("validate")}
              <ChevronRight size={26} />
            </button>
          </div>
        )}

        <button onClick={onSkip} className="text-lg font-semibold text-[var(--ink-faint)] underline active:opacity-60">
          {t("loyalty_skip")}
        </button>
      </div>
    </div>
  );
}

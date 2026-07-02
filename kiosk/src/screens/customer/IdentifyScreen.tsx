import { useState } from "react";
import { Gift, ChevronRight } from "lucide-react";
import { useLang } from "../../i18n";
import { useKiosk } from "../../state/kiosk";
import { SETTING_KEYS } from "../../db";
import { loyaltyLookup, type LoyaltyStatus } from "../../sync";

// Écran d'identification fidélité (facultatif) : le client saisit son email ou
// téléphone pour cumuler des points, et peut utiliser un repas offert s'il y a droit.
export function IdentifyScreen({
  onValidated,
  onSkip,
}: {
  onValidated: (contact: string, loyalty: LoyaltyStatus | null, useReward: boolean) => void;
  onSkip: () => void;
}) {
  const { t } = useLang();
  const { setting } = useKiosk();
  const [contact, setContact] = useState("");
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<LoyaltyStatus | null>(null);
  const [useReward, setUseReward] = useState(false);

  const frigoId = setting(SETTING_KEYS.frigoId);
  const backendUrl = setting(SETTING_KEYS.backendUrl);

  async function lookup() {
    const c = contact.trim();
    if (c.length < 3) return;
    setLoading(true);
    const res = await loyaltyLookup(backendUrl, frigoId, c);
    setStatus(res);
    setUseReward(res?.rewardAvailable ?? false);
    setLoading(false);
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

      <div className="flex flex-1 flex-col items-center justify-center gap-6 p-8">
        <p className="max-w-lg text-center text-xl text-[var(--ink-soft)]">{t("loyalty_prompt")}</p>

        <input
          value={contact}
          onChange={(e) => { setContact(e.target.value); setStatus(null); }}
          placeholder={t("loyalty_placeholder")}
          className="w-full max-w-md rounded-2xl border-2 border-gray-200 px-5 py-4 text-center text-2xl font-semibold focus:border-[var(--green)] focus:outline-none"
        />

        {!status ? (
          <button
            onClick={lookup}
            disabled={loading || contact.trim().length < 3}
            className="rounded-2xl bg-[var(--green)] px-10 py-4 text-2xl font-extrabold text-white shadow-lg active:scale-[0.98] disabled:opacity-40"
          >
            {loading ? "…" : t("validate")}
          </button>
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
              onClick={() => onValidated(contact.trim(), status, useReward)}
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

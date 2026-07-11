import { useState } from "react";
import { ReceiptText, Mail, Check } from "lucide-react";
import { useLang } from "../../i18n";
import { OnScreenKeyboard } from "../../components/OnScreenKeyboard";

// Écran facultatif après l'achat : proposer un justificatif par email.
// - Si le client a un code fidélité → envoi direct à l'email de son compte.
// - Sinon → il tape son email au clavier tactile.
export function ReceiptScreen({
  hasLoyaltyCode,
  sending,
  sentMsg,
  onSendWithCode,
  onSendWithEmail,
  onSkip,
}: {
  hasLoyaltyCode: boolean;
  sending: boolean;
  sentMsg: string; // message après tentative d'envoi ("" si rien)
  onSendWithCode: () => void;
  onSendWithEmail: (email: string) => void;
  onSkip: () => void;
}) {
  const { t } = useLang();
  const [typing, setTyping] = useState(!hasLoyaltyCode);
  const [email, setEmail] = useState("");
  const valid = /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email.trim());

  return (
    <div className="flex h-full flex-col">
      <header className="flex items-center justify-center bg-white px-8 py-5 shadow-sm">
        <h1 className="flex items-center gap-2 text-3xl font-extrabold">
          <ReceiptText size={28} className="text-[var(--green)]" />
          {t("receipt_title")}
        </h1>
      </header>

      <div className="flex flex-1 flex-col items-center justify-center gap-5 p-6">
        {sentMsg ? (
          <div className="flex flex-col items-center gap-3">
            <Check size={56} className="text-[var(--green)]" />
            <p className="text-2xl font-bold text-[var(--green)]">{sentMsg}</p>
          </div>
        ) : (
          <>
            <p className="max-w-lg text-center text-xl text-[var(--ink-soft)]">{t("receipt_prompt")}</p>

            {!typing ? (
              // Client identifié (code fidélité) : envoi direct à l'email du compte.
              <div className="flex w-full max-w-md flex-col gap-3">
                <button
                  onClick={onSendWithCode}
                  disabled={sending}
                  className="flex items-center justify-center gap-2 rounded-2xl bg-[var(--green)] px-8 py-5 text-2xl font-extrabold text-white shadow-lg active:scale-[0.98] disabled:opacity-50"
                >
                  <Mail size={24} />
                  {sending ? "…" : t("receipt_send_account")}
                </button>
                <button
                  onClick={() => setTyping(true)}
                  className="text-lg font-semibold text-[var(--ink-faint)] underline active:opacity-60"
                >
                  {t("receipt_other_email")}
                </button>
              </div>
            ) : (
              // Saisie de l'email au clavier tactile.
              <>
                <div className="flex min-h-[3.75rem] w-full max-w-md items-center justify-center rounded-2xl border-2 border-gray-200 bg-white px-5 py-4 text-2xl font-semibold">
                  {email ? (
                    <span className="break-all">{email}</span>
                  ) : (
                    <span className="text-[var(--ink-faint)]">{t("receipt_email_placeholder")}</span>
                  )}
                </div>
                <OnScreenKeyboard
                  onKey={(c) => setEmail((v) => (v + c).slice(0, 80))}
                  onBackspace={() => setEmail((v) => v.slice(0, -1))}
                />
                <button
                  onClick={() => onSendWithEmail(email.trim())}
                  disabled={sending || !valid}
                  className="rounded-2xl bg-[var(--green)] px-10 py-4 text-2xl font-extrabold text-white shadow-lg active:scale-[0.98] disabled:opacity-40"
                >
                  {sending ? "…" : t("receipt_send")}
                </button>
              </>
            )}

            <button onClick={onSkip} className="text-lg font-semibold text-[var(--ink-faint)] underline active:opacity-60">
              {t("receipt_skip")}
            </button>
          </>
        )}
      </div>
    </div>
  );
}

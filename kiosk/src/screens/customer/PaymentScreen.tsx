import { CreditCard, Loader2, CheckCircle2, XCircle } from "lucide-react";
import { useLang } from "../../i18n";
import { formatPrice } from "../../utils/format";
import type { PaymentPhase } from "../../hardware";

export function PaymentScreen({
  phase,
  amountCents,
  currency,
  onCancel,
}: {
  phase: PaymentPhase;
  amountCents: number;
  currency: string;
  onCancel: () => void;
}) {
  const { t } = useLang();

  const view = (() => {
    switch (phase) {
      case "processing":
        return { icon: <Loader2 size={72} className="animate-spin" />, label: t("processing_payment"), color: "var(--blue)" };
      case "approved":
        return { icon: <CheckCircle2 size={72} />, label: t("payment_approved"), color: "var(--green)" };
      case "declined":
      case "timeout":
        return { icon: <XCircle size={72} />, label: t("payment_failed"), color: "#e23b3b" };
      case "cancelled":
        return { icon: <XCircle size={72} />, label: t("payment_cancelled"), color: "#e23b3b" };
      default:
        return { icon: <CreditCard size={72} className="animate-pulse" />, label: t("present_card"), color: "var(--green)" };
    }
  })();

  const showCancel = phase === "waiting";

  return (
    <div className="flex h-full flex-col items-center justify-center gap-8 bg-white px-8">
      <p className="text-xl font-semibold uppercase tracking-wide text-[var(--ink-faint)]">
        {t("insert_amount")}
      </p>
      <p className="text-6xl font-extrabold">{formatPrice(amountCents, currency)}</p>

      <div className="my-4 flex flex-col items-center gap-5" style={{ color: view.color }}>
        {view.icon}
        <p className="text-3xl font-bold">{view.label}</p>
      </div>

      {showCancel && (
        <button
          onClick={onCancel}
          className="rounded-2xl border-2 border-[var(--line)] px-10 py-4 text-2xl font-bold text-[var(--ink-soft)] active:scale-95"
        >
          {t("cancel")}
        </button>
      )}
    </div>
  );
}

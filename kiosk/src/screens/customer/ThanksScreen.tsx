import { CheckCircle2 } from "lucide-react";
import { useLang } from "../../i18n";

export function ThanksScreen() {
  const { t } = useLang();
  return (
    <div className="flex h-full flex-col items-center justify-center gap-6 bg-gradient-to-b from-[var(--green-tint)] to-white">
      <CheckCircle2 size={96} className="text-[var(--green)]" />
      <p className="text-5xl font-extrabold text-[var(--green)]">{t("thank_you")}</p>
      <p className="text-2xl text-[var(--ink-soft)]">{t("enjoy")} 🍽️</p>
    </div>
  );
}

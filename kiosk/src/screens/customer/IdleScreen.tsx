import { UtensilsCrossed } from "lucide-react";
import { useLang } from "../../i18n";

const DEVELOPED_BY = "L'Oiseau Blanc Traiteur";

// QR code vers https://app.friggo.fr (généré statiquement — aucune dépendance,
// fonctionne hors-ligne). À regénérer si l'URL change (ex. liens stores).
function FriggoQr({ size = 120 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 25 25" shapeRendering="crispEdges" aria-label="QR code app.friggo.fr">
      <path fill="#ffffff" d="M0 0h25v25H0z" />
      <path stroke="#000000" d="M0 0.5h7m2 0h1m3 0h1m2 0h1m1 0h7M0 1.5h1m5 0h1m2 0h2m1 0h5m1 0h1m5 0h1M0 2.5h1m1 0h3m1 0h1m1 0h1m1 0h1m3 0h1m1 0h1m1 0h1m1 0h3m1 0h1M0 3.5h1m1 0h3m1 0h1m1 0h1m1 0h1m1 0h2m1 0h1m2 0h1m1 0h3m1 0h1M0 4.5h1m1 0h3m1 0h1m1 0h3m1 0h2m2 0h1m1 0h1m1 0h3m1 0h1M0 5.5h1m5 0h1m1 0h1m1 0h2m1 0h4m1 0h1m5 0h1M0 6.5h7m1 0h1m1 0h1m1 0h1m1 0h1m1 0h1m1 0h7M8 7.5h1m1 0h1m1 0h1m3 0h1M0 8.5h1m1 0h5m4 0h1m1 0h3m2 0h5M0 9.5h1m15 0h2m1 0h1m3 0h1M1 10.5h1m1 0h1m2 0h2m1 0h2m1 0h5m1 0h2m1 0h1m1 0h2M1 11.5h1m2 0h1m3 0h1m2 0h2m2 0h1m2 0h1m5 0h1M0 12.5h2m1 0h1m2 0h1m1 0h7m2 0h2m1 0h1m1 0h3M0 13.5h3m4 0h1m1 0h2m3 0h1m1 0h2m1 0h1m1 0h1m1 0h1M0 14.5h1m1 0h1m1 0h3m2 0h5m1 0h1m2 0h4m1 0h2M0 15.5h1m3 0h1m2 0h1m1 0h1m1 0h1m6 0h3m3 0h1M0 16.5h1m2 0h2m1 0h3m2 0h1m3 0h6m1 0h1M8 17.5h1m3 0h2m2 0h1m3 0h2M0 18.5h7m2 0h1m3 0h2m1 0h1m1 0h1m1 0h1m1 0h3M0 19.5h1m5 0h1m1 0h1m1 0h1m1 0h2m2 0h1m3 0h2m1 0h2M0 20.5h1m1 0h3m1 0h1m1 0h1m1 0h1m1 0h1m1 0h7m1 0h3M0 21.5h1m1 0h3m1 0h1m1 0h2m5 0h2m1 0h1m1 0h5M0 22.5h1m1 0h3m1 0h1m1 0h1m2 0h2m8 0h2m1 0h1M0 23.5h1m5 0h1m3 0h2m2 0h4m1 0h3m2 0h1M0 24.5h7m1 0h4m7 0h6" />
    </svg>
  );
}

export function IdleScreen({ onStart }: { onStart: () => void }) {
  const { t } = useLang();
  return (
    <button
      onClick={onStart}
      className="relative flex h-full w-full flex-col items-center justify-center gap-10 bg-gradient-to-b from-[var(--green-tint)] to-[var(--blue-soft)]"
    >
      <div className="flex flex-col items-center gap-6">
        <div className="flex h-40 w-40 items-center justify-center rounded-[2.5rem] bg-white shadow-xl">
          <span className="text-5xl leading-none" style={{ fontWeight: 900, letterSpacing: "-0.03em" }}>
            <span style={{ color: "#70C8F2" }}>Frig</span>
            <span style={{ color: "#319966" }}>go</span>
          </span>
        </div>
      </div>

      <div className="mt-6 flex animate-pulse flex-col items-center gap-4">
        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-[var(--green)] text-white shadow-lg">
          <UtensilsCrossed size={36} />
        </div>
        <p className="text-3xl font-bold text-[var(--green)]">{t("touch_to_order")}</p>
      </div>

      {/* Encart « Téléchargez l'app » + QR code (coin bas droit) */}
      <div className="absolute bottom-16 right-8 flex items-center gap-4 rounded-2xl bg-white/95 px-5 py-4 shadow-xl">
        <div className="rounded-lg border border-[var(--line)] bg-white p-1.5">
          <FriggoQr size={104} />
        </div>
        <div className="text-left">
          <p className="text-xl font-extrabold text-[var(--ink)]">Téléchargez l'app</p>
          <p className="text-sm text-[var(--ink-soft)]">Carte, fidélité & reçus</p>
          <p className="mt-1 text-sm font-semibold text-[var(--green)]">app.friggo.fr</p>
        </div>
      </div>

      {/* Footer "développé par" */}
      <p className="absolute bottom-5 left-0 right-0 text-center text-sm text-[var(--ink-faint)]">
        {t("developed_by")} {DEVELOPED_BY}
      </p>
    </button>
  );
}

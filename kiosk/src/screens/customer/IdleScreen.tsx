import { UtensilsCrossed } from "lucide-react";
import { useLang } from "../../i18n";

const DEVELOPED_BY = "L'Oiseau Blanc Traiteur";

// QR code vers la fiche Play Store de Friggo (généré statiquement — aucune
// dépendance, fonctionne hors-ligne). À regénérer si l'URL change.
// URL : https://play.google.com/store/apps/details?id=com.friggo.myapp
function FriggoQr({ size = 120 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 33 33" shapeRendering="crispEdges" aria-label="QR code Google Play Friggo">
      <path fill="#ffffff" d="M0 0h33v33H0z" />
      <path stroke="#000000" d="M0 0.5h7m2 0h1m2 0h1m4 0h5m1 0h1m2 0h7M0 1.5h1m5 0h1m3 0h1m1 0h1m2 0h2m1 0h1m1 0h3m1 0h1m1 0h1m5 0h1M0 2.5h1m1 0h3m1 0h1m1 0h1m6 0h2m2 0h1m1 0h1m1 0h1m2 0h1m1 0h3m1 0h1M0 3.5h1m1 0h3m1 0h1m1 0h1m3 0h6m5 0h2m1 0h1m1 0h3m1 0h1M0 4.5h1m1 0h3m1 0h1m1 0h2m1 0h1m1 0h2m1 0h8m2 0h1m1 0h3m1 0h1M0 5.5h1m5 0h1m1 0h1m1 0h1m1 0h6m4 0h1m3 0h1m5 0h1M0 6.5h7m1 0h1m1 0h1m1 0h1m1 0h1m1 0h1m1 0h1m1 0h1m1 0h1m1 0h7M8 7.5h4m2 0h2m3 0h1m1 0h2m1 0h1M0 8.5h1m1 0h5m2 0h1m1 0h5m1 0h1m4 0h3m1 0h5M0 9.5h2m14 0h1m1 0h3m2 0h2m1 0h2m1 0h4M1 10.5h1m3 0h5m1 0h2m2 0h1m1 0h1m3 0h2m5 0h1m1 0h2M2 11.5h2m1 0h1m4 0h1m8 0h4m1 0h2m2 0h3M0 12.5h1m2 0h1m2 0h5m1 0h1m2 0h1m1 0h1m1 0h2m1 0h4m1 0h3M0 13.5h1m1 0h4m1 0h2m7 0h5m2 0h1m2 0h1m3 0h3M2 14.5h5m2 0h2m2 0h1m1 0h2m5 0h1m2 0h3m1 0h1m1 0h1M0 15.5h1m6 0h2m1 0h2m3 0h1m3 0h5m1 0h2m3 0h1M0 16.5h3m1 0h1m1 0h2m3 0h2m3 0h3m3 0h2m1 0h1m1 0h2m3 0h1M0 17.5h2m8 0h1m1 0h1m3 0h1m1 0h2m1 0h1m1 0h1m1 0h3m1 0h4M0 18.5h1m1 0h5m3 0h1m3 0h4m2 0h1m5 0h3m1 0h2M1 19.5h2m2 0h1m1 0h2m1 0h1m3 0h1m1 0h1m3 0h3m1 0h2m1 0h4M0 20.5h1m2 0h1m2 0h3m4 0h2m1 0h2m4 0h1m2 0h1m2 0h2M0 21.5h1m1 0h1m1 0h2m1 0h2m1 0h1m1 0h1m3 0h5m2 0h2m1 0h1m2 0h1m2 0h1M0 22.5h1m1 0h1m3 0h1m3 0h1m4 0h3m4 0h1m6 0h1m1 0h1M0 23.5h1m2 0h2m2 0h2m2 0h1m2 0h3m2 0h6m4 0h2m1 0h1M0 24.5h1m1 0h1m1 0h1m1 0h3m2 0h3m3 0h1m1 0h1m2 0h1m1 0h5m2 0h2M8 25.5h1m2 0h2m1 0h1m1 0h2m1 0h2m3 0h1m3 0h1m1 0h3M0 26.5h7m4 0h3m1 0h1m1 0h1m4 0h3m1 0h1m1 0h1m1 0h2M0 27.5h1m5 0h1m1 0h1m2 0h1m3 0h2m3 0h5m3 0h4M0 28.5h1m1 0h3m1 0h1m1 0h1m3 0h1m1 0h2m1 0h3m2 0h1m1 0h6M0 29.5h1m1 0h3m1 0h1m1 0h1m1 0h1m1 0h1m3 0h1m1 0h2m1 0h1m2 0h2m2 0h5M0 30.5h1m1 0h3m1 0h1m1 0h1m1 0h1m3 0h2m1 0h2m1 0h1m1 0h2m2 0h2m2 0h1M0 31.5h1m5 0h1m9 0h1m3 0h4m1 0h2m1 0h3M0 32.5h7m1 0h1m3 0h2m2 0h2m1 0h1m2 0h3m2 0h1m3 0h1" />
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
          <p className="mt-1 text-sm font-semibold text-[var(--green)]">Scannez pour installer</p>
        </div>
      </div>

      {/* Footer "développé par" */}
      <p className="absolute bottom-5 left-0 right-0 text-center text-sm text-[var(--ink-faint)]">
        {t("developed_by")} {DEVELOPED_BY}
      </p>
    </button>
  );
}

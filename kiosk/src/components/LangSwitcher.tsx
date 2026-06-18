import { useState } from "react";
import { Globe } from "lucide-react";
import { SUPPORTED_LANGS, useLang } from "../i18n";

export function LangSwitcher() {
  const { lang, setLang } = useLang();
  const [open, setOpen] = useState(false);
  const current = SUPPORTED_LANGS.find((l) => l.code === lang);

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 rounded-full bg-white/80 px-4 py-2.5 text-lg shadow-sm backdrop-blur active:scale-95"
      >
        <Globe size={22} className="text-[var(--green)]" />
        <span className="text-2xl leading-none">{current?.flag}</span>
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 z-20 mt-2 w-52 overflow-hidden rounded-2xl bg-white shadow-xl">
            {SUPPORTED_LANGS.map((l) => (
              <button
                key={l.code}
                onClick={() => {
                  setLang(l.code);
                  setOpen(false);
                }}
                className={`flex w-full items-center gap-3 px-4 py-3 text-left text-lg active:bg-gray-100 ${
                  l.code === lang ? "bg-[var(--green-tint)] font-semibold" : ""
                }`}
              >
                <span className="text-2xl leading-none">{l.flag}</span>
                {l.label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

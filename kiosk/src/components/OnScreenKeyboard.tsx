import { Delete, ArrowBigUp } from "lucide-react";
import { useState } from "react";

// Clavier tactile à l'écran (la borne n'a pas de clavier physique) : lettres +
// chiffres + caractères d'email (@ . _ -), pour saisir une adresse email.
const ROWS = [
  ["1", "2", "3", "4", "5", "6", "7", "8", "9", "0"],
  ["a", "z", "e", "r", "t", "y", "u", "i", "o", "p"],
  ["q", "s", "d", "f", "g", "h", "j", "k", "l", "m"],
  ["w", "x", "c", "v", "b", "n", "@", ".", "-", "_"],
];

export function OnScreenKeyboard({
  onKey,
  onBackspace,
}: {
  onKey: (char: string) => void;
  onBackspace: () => void;
}) {
  const [caps, setCaps] = useState(false);

  const press = (char: string) => {
    onKey(caps && /[a-z]/.test(char) ? char.toUpperCase() : char);
    if (caps) setCaps(false);
  };

  return (
    <div className="mx-auto w-full max-w-3xl space-y-2 select-none">
      {ROWS.map((row, i) => (
        <div key={i} className="flex justify-center gap-1.5">
          {i === 3 && (
            <button
              onClick={() => setCaps((v) => !v)}
              className={`flex h-14 min-w-14 items-center justify-center rounded-xl text-xl font-bold active:scale-95 ${
                caps ? "bg-[var(--green)] text-white" : "bg-white text-[var(--ink)] shadow-sm"
              }`}
            >
              <ArrowBigUp size={26} />
            </button>
          )}
          {row.map((char) => (
            <button
              key={char}
              onClick={() => press(char)}
              className="h-14 min-w-[3.25rem] flex-1 rounded-xl bg-white text-2xl font-bold text-[var(--ink)] shadow-sm active:scale-95 active:bg-gray-100"
            >
              {caps && /[a-z]/.test(char) ? char.toUpperCase() : char}
            </button>
          ))}
          {i === 3 && (
            <button
              onClick={onBackspace}
              className="flex h-14 min-w-16 items-center justify-center rounded-xl bg-white text-[var(--ink)] shadow-sm active:scale-95 active:bg-gray-100"
            >
              <Delete size={26} />
            </button>
          )}
        </div>
      ))}
      <div className="flex justify-center gap-1.5">
        <button
          onClick={() => onKey("@gmail.com")}
          className="h-14 flex-1 rounded-xl bg-white text-lg font-semibold text-[var(--ink-soft)] shadow-sm active:scale-95"
        >
          @gmail.com
        </button>
        <button
          onClick={() => onKey(".fr")}
          className="h-14 flex-1 rounded-xl bg-white text-lg font-semibold text-[var(--ink-soft)] shadow-sm active:scale-95"
        >
          .fr
        </button>
      </div>
    </div>
  );
}

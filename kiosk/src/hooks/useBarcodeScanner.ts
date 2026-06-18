import { useEffect, useRef } from "react";

// Capture une douchette USB (clavier HID) : elle « tape » les caractères du
// code très vite puis Entrée. On distingue d'une saisie humaine par la vitesse
// (caractères espacés de moins de ~50 ms). Marche dans Tauri et navigateur.
//
// `enabled` permet d'activer la capture seulement quand le mode scan est actif,
// pour ne pas intercepter la frappe dans les champs de saisie.
export function useBarcodeScanner(enabled: boolean, onScan: (code: string) => void) {
  const buffer = useRef("");
  const lastTime = useRef(0);
  const onScanRef = useRef(onScan);
  onScanRef.current = onScan;

  useEffect(() => {
    if (!enabled) return;

    const INTER_CHAR_MS = 50; // au-delà, on considère que c'est une frappe humaine

    function handler(e: KeyboardEvent) {
      // On ignore si l'utilisateur tape dans un champ.
      const target = e.target as HTMLElement | null;
      if (target && ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName)) return;

      const now = Date.now();
      if (now - lastTime.current > INTER_CHAR_MS) buffer.current = "";
      lastTime.current = now;

      if (e.key === "Enter") {
        const code = buffer.current.trim();
        buffer.current = "";
        if (code.length >= 1) onScanRef.current(code);
        return;
      }
      // Caractères imprimables uniquement.
      if (e.key.length === 1) buffer.current += e.key;
    }

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [enabled]);
}

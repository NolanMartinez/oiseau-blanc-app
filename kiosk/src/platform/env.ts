// Détecte si l'app tourne dans Tauri (borne réelle) ou dans un simple
// navigateur (dev/preview UI). Permet un repli gracieux sans matériel ni SQLite.
export function isTauri(): boolean {
  return typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
}

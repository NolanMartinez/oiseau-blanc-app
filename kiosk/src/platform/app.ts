// Fermeture de l'application (équivalent Alt+F4).
import { isTauri } from "./env";

export async function quitApp(): Promise<void> {
  if (isTauri()) {
    const { getCurrentWindow } = await import("@tauri-apps/api/window");
    await getCurrentWindow().close();
  } else {
    // En navigateur, on ne peut fermer que les onglets ouverts par script.
    window.close();
  }
}

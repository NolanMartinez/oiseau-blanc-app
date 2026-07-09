import { check } from "@tauri-apps/plugin-updater";
import { relaunch } from "@tauri-apps/plugin-process";

export type UpdateStatus =
  | { kind: "checking" }
  | { kind: "uptodate" }
  | { kind: "available"; version: string }
  | { kind: "downloading"; percent: number }
  | { kind: "installing" }
  | { kind: "done"; version: string }
  | { kind: "error"; message: string };

/**
 * Vérifie s'il existe une nouvelle version de l'app, la télécharge, l'installe
 * puis redémarre la borne. `onStatus` permet d'afficher la progression.
 */
export async function checkAndInstallUpdate(onStatus: (s: UpdateStatus) => void): Promise<void> {
  try {
    onStatus({ kind: "checking" });
    const update = await check();
    if (!update) {
      onStatus({ kind: "uptodate" });
      return;
    }

    onStatus({ kind: "available", version: update.version });

    let downloaded = 0;
    let total = 0;
    await update.downloadAndInstall((event) => {
      switch (event.event) {
        case "Started":
          total = event.data.contentLength ?? 0;
          onStatus({ kind: "downloading", percent: 0 });
          break;
        case "Progress":
          downloaded += event.data.chunkLength;
          onStatus({
            kind: "downloading",
            percent: total > 0 ? Math.round((downloaded / total) * 100) : 0,
          });
          break;
        case "Finished":
          onStatus({ kind: "installing" });
          break;
      }
    });

    onStatus({ kind: "done", version: update.version });
    // Petit délai pour laisser voir le message, puis on relance l'app à jour.
    await new Promise((r) => setTimeout(r, 1200));
    await relaunch();
  } catch (e) {
    onStatus({ kind: "error", message: e instanceof Error ? e.message : String(e) });
  }
}

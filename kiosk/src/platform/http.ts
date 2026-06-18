// fetch unifié : dans Tauri on passe par le plugin HTTP (contourne CORS et
// permet d'atteindre un backend LAN) ; sinon fetch navigateur standard.
import { isTauri } from "./env";

export async function kioskFetch(input: string, init?: RequestInit): Promise<Response> {
  if (isTauri()) {
    const { fetch } = await import("@tauri-apps/plugin-http");
    return fetch(input, init);
  }
  return window.fetch(input, init);
}

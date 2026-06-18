// Wrappers matériels unifiés.
//   - Dans Tauri : appelle les commandes Rust + écoute les événements `hw://*`.
//   - Dans le navigateur : exécute un simulateur JS identique à `mock.rs`.
// Le reste de l'app ne connaît que cette API, jamais `invoke`.

import { isTauri } from "../platform/env";

export type LockerPhase = "opening" | "open" | "closed" | "error";
export type PaymentPhase =
  | "waiting"
  | "processing"
  | "approved"
  | "declined"
  | "cancelled"
  | "timeout";
export type PaymentOutcome = "approved" | "declined" | "cancelled" | "timeout";
export type DoorState = "open" | "closed" | "unknown";

export interface LockerEvent {
  board: string;
  boxNumber: number;
  phase: LockerPhase;
  message?: string | null;
}
export interface PaymentEvent {
  phase: PaymentPhase;
  amountCents: number;
}
export interface PaymentResult {
  outcome: PaymentOutcome;
}

export type HwMode = "sim" | "real";

export interface BoardLink {
  comPort: string;
  baud: number;
  parity: string;
  enabled: boolean;
}

export interface SerialConfig {
  boards: Record<string, BoardLink>;
  frameOpen: string;
  frameCloseAll: string;
  frameClear: string;
  frameDefrost: string;
  boxBase: number;
}

export interface Hardware {
  openLocker(board: string, boxNumber: number): Promise<void>;
  closeAll(board: string): Promise<void>;
  clearError(board: string): Promise<void>;
  defrost(board: string): Promise<void>;
  doorState(board: string): Promise<DoorState>;
  readTemperature(board: string): Promise<number>;
  requestPayment(amountCents: number): Promise<PaymentResult>;
  cancelPayment(): Promise<void>;
  onLockerEvent(cb: (e: LockerEvent) => void): () => void;
  onPaymentEvent(cb: (e: PaymentEvent) => void): () => void;
  // Liaisons matériel
  listComPorts(): Promise<string[]>;
  setHwConfig(mode: HwMode, config: SerialConfig): Promise<void>;
  previewFrame(board: string, boxNumber: number): Promise<string>;
}

// Encodeur de trame (miroir JS de hardware/frame.rs) — pour l'aperçu en mode
// navigateur. La borne réelle utilise l'encodeur Rust.
export function encodeFrame(template: string, board: number, boxAddr: number): string {
  const out: number[] = [];
  for (const tok of template.trim().split(/\s+/).filter(Boolean)) {
    if (tok === "{board}") out.push(board & 0xff);
    else if (tok === "{box}") out.push(boxAddr & 0xff);
    else if (tok === "{xor}") out.push(out.reduce((a, b) => a ^ b, 0));
    else if (tok === "{sum8}") out.push(out.reduce((a, b) => (a + b) & 0xff, 0));
    else if (tok === "{len}") out.push(out.length & 0xff);
    else if (/^[0-9a-fA-F]{2}$/.test(tok)) out.push(parseInt(tok, 16));
    else throw new Error(`jeton inconnu : « ${tok} »`);
  }
  if (out.length === 0) throw new Error("gabarit de trame vide");
  return out.map((b) => b.toString(16).toUpperCase().padStart(2, "0")).join(" ");
}

export function boardIndex(board: string): number {
  return board.charCodeAt(0) - 65; // 'A' -> 0
}
export function boxAddr(boxNumber: number, boxBase: number): number {
  return boxBase === 0 ? Math.max(0, boxNumber - 1) : boxNumber;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// ── Implémentation navigateur (simulateur) ──────────────────────────────────
class BrowserHardware implements Hardware {
  private lockerCbs = new Set<(e: LockerEvent) => void>();
  private paymentCbs = new Set<(e: PaymentEvent) => void>();
  private paymentCancelled = false;

  private emitLocker(e: LockerEvent) {
    this.lockerCbs.forEach((cb) => cb(e));
  }
  private emitPayment(e: PaymentEvent) {
    this.paymentCbs.forEach((cb) => cb(e));
  }

  async openLocker(board: string, boxNumber: number): Promise<void> {
    this.emitLocker({ board, boxNumber, phase: "opening" });
    await sleep(900);
    this.emitLocker({ board, boxNumber, phase: "open" });
    await sleep(4000);
    this.emitLocker({ board, boxNumber, phase: "closed" });
  }

  async closeAll(board: string): Promise<void> {
    await sleep(500);
    this.emitLocker({ board, boxNumber: 0, phase: "closed", message: "Tous les casiers refermés" });
  }

  async clearError(board: string): Promise<void> {
    await sleep(300);
    this.emitLocker({ board, boxNumber: 0, phase: "closed", message: "Erreurs acquittées" });
  }

  async defrost(board: string): Promise<void> {
    await sleep(300);
    this.emitLocker({ board, boxNumber: 0, phase: "closed", message: "Dégivrage lancé (simulé)" });
  }

  async doorState(): Promise<DoorState> {
    return "closed";
  }

  async readTemperature(): Promise<number> {
    return 3.5 + (Math.random() * 3 - 1.5);
  }

  async requestPayment(amountCents: number): Promise<PaymentResult> {
    this.paymentCancelled = false;
    this.emitPayment({ phase: "waiting", amountCents });
    for (let i = 0; i < 20; i++) {
      if (this.paymentCancelled) {
        this.emitPayment({ phase: "cancelled", amountCents });
        return { outcome: "cancelled" };
      }
      await sleep(100);
    }
    this.emitPayment({ phase: "processing", amountCents });
    await sleep(800);
    if (this.paymentCancelled) {
      this.emitPayment({ phase: "cancelled", amountCents });
      return { outcome: "cancelled" };
    }
    this.emitPayment({ phase: "approved", amountCents });
    return { outcome: "approved" };
  }

  async cancelPayment(): Promise<void> {
    this.paymentCancelled = true;
  }

  onLockerEvent(cb: (e: LockerEvent) => void): () => void {
    this.lockerCbs.add(cb);
    return () => this.lockerCbs.delete(cb);
  }
  onPaymentEvent(cb: (e: PaymentEvent) => void): () => void {
    this.paymentCbs.add(cb);
    return () => this.paymentCbs.delete(cb);
  }

  private cfg: SerialConfig | null = null;

  async listComPorts(): Promise<string[]> {
    // Ports fictifs pour la maquette navigateur.
    return ["COM1", "COM2", "COM3", "COM4"];
  }
  async setHwConfig(_mode: HwMode, config: SerialConfig): Promise<void> {
    this.cfg = config;
  }
  async previewFrame(board: string, boxNumber: number): Promise<string> {
    const tpl = this.cfg?.frameOpen ?? "02 {board} {box} {xor}";
    const base = this.cfg?.boxBase ?? 1;
    return encodeFrame(tpl, boardIndex(board), boxAddr(boxNumber, base));
  }
}

// ── Implémentation Tauri (matériel réel via commandes Rust) ──────────────────
class TauriHardware implements Hardware {
  // Imports dynamiques pour ne pas casser le build navigateur.
  private async invoke<T>(cmd: string, args?: Record<string, unknown>): Promise<T> {
    const { invoke } = await import("@tauri-apps/api/core");
    return invoke<T>(cmd, args);
  }

  openLocker(board: string, boxNumber: number) {
    return this.invoke<void>("open_locker", { board, boxNumber });
  }
  closeAll(board: string) {
    return this.invoke<void>("close_all", { board });
  }
  clearError(board: string) {
    return this.invoke<void>("clear_error", { board });
  }
  defrost(board: string) {
    return this.invoke<void>("defrost", { board });
  }
  doorState(board: string) {
    return this.invoke<DoorState>("door_state", { board });
  }
  readTemperature(board: string) {
    return this.invoke<number>("read_temperature", { board });
  }
  requestPayment(amountCents: number) {
    return this.invoke<PaymentResult>("request_payment", { amountCents });
  }
  cancelPayment() {
    return this.invoke<void>("cancel_payment");
  }

  onLockerEvent(cb: (e: LockerEvent) => void): () => void {
    let unlisten: (() => void) | null = null;
    import("@tauri-apps/api/event").then(({ listen }) => {
      listen<any>("hw://locker", (ev) => cb(normalizeLocker(ev.payload))).then((u) => {
        unlisten = u;
      });
    });
    return () => unlisten?.();
  }
  onPaymentEvent(cb: (e: PaymentEvent) => void): () => void {
    let unlisten: (() => void) | null = null;
    import("@tauri-apps/api/event").then(({ listen }) => {
      listen<any>("hw://payment", (ev) => cb(normalizePayment(ev.payload))).then((u) => {
        unlisten = u;
      });
    });
    return () => unlisten?.();
  }

  listComPorts() {
    return this.invoke<string[]>("list_com_ports");
  }
  setHwConfig(mode: HwMode, config: SerialConfig) {
    return this.invoke<void>("set_hw_config", { mode, config });
  }
  previewFrame(board: string, boxNumber: number) {
    return this.invoke<string>("preview_frame", { board, boxNumber });
  }
}

// Les structs Rust sérialisent en snake_case : on normalise en camelCase.
function normalizeLocker(p: any): LockerEvent {
  return {
    board: p.board,
    boxNumber: p.box_number ?? p.boxNumber,
    phase: p.phase,
    message: p.message ?? null,
  };
}
function normalizePayment(p: any): PaymentEvent {
  return { phase: p.phase, amountCents: p.amount_cents ?? p.amountCents };
}

export const hardware: Hardware = isTauri() ? new TauriHardware() : new BrowserHardware();

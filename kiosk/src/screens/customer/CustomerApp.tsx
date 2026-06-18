import { useCallback, useEffect, useRef, useState } from "react";
import { hardware, type LockerPhase, type PaymentPhase } from "../../hardware";
import { useKiosk, type MenuItem } from "../../state/kiosk";
import { SETTING_KEYS } from "../../db";
import { IdleScreen } from "./IdleScreen";
import { MenuScreen } from "./MenuScreen";
import { DishDetailScreen } from "./DishDetailScreen";
import { PaymentScreen } from "./PaymentScreen";
import { OpeningScreen } from "./OpeningScreen";
import { ThanksScreen } from "./ThanksScreen";

type Screen = "idle" | "menu" | "detail" | "payment" | "opening" | "thanks";

const IDLE_TIMEOUT_MS = 45_000;

export function CustomerApp() {
  const { repo, reload, setting } = useKiosk();
  const [screen, setScreen] = useState<Screen>("idle");
  const [selected, setSelected] = useState<MenuItem | null>(null);
  const [paymentPhase, setPaymentPhase] = useState<PaymentPhase>("waiting");
  const [lockerPhase, setLockerPhase] = useState<LockerPhase>("opening");

  const currency = setting(SETTING_KEYS.currency, "EUR");
  const requiresPayment =
    setting(SETTING_KEYS.mdbEnabled) === "1" && setting(SETTING_KEYS.venteLibre) !== "1";

  // ── Timer d'inactivité : retour à l'écran d'accueil ───────────────────────
  const idleTimer = useRef<number | null>(null);
  const resetIdle = useCallback(() => {
    if (idleTimer.current) clearTimeout(idleTimer.current);
    if (screen === "menu" || screen === "detail") {
      idleTimer.current = window.setTimeout(() => {
        setSelected(null);
        setScreen("idle");
      }, IDLE_TIMEOUT_MS);
    }
  }, [screen]);

  useEffect(() => {
    resetIdle();
    return () => {
      if (idleTimer.current) clearTimeout(idleTimer.current);
    };
  }, [resetIdle]);

  // ── Finalisation d'une vente : journal + vidage du casier ─────────────────
  const finalizeSale = useCallback(
    async (item: MenuItem) => {
      if (!repo) return;
      await repo.logSale({
        lockerId: item.locker.id,
        dishId: item.dish.id,
        amount: item.priceCents,
        mode: requiresPayment ? "paid" : "free",
        paidAt: new Date().toISOString(),
        synced: false,
      });
      // Un casier = une portion : il est vide après le retrait.
      await repo.clearLocker(item.locker.id);
      await reload();
    },
    [repo, reload, requiresPayment],
  );

  // ── Séquence d'ouverture du casier ────────────────────────────────────────
  const startOpening = useCallback(
    async (item: MenuItem) => {
      setLockerPhase("opening");
      setScreen("opening");
      const unsub = hardware.onLockerEvent((e) => setLockerPhase(e.phase));
      try {
        // On envoie l'adresse physique de la porte (override éventuel), pas le n° logique.
        await hardware.openLocker(item.locker.board, item.locker.address ?? item.locker.boxNumber);
        await finalizeSale(item);
      } finally {
        unsub();
      }
      setScreen("thanks");
      window.setTimeout(() => {
        setSelected(null);
        setScreen("idle");
      }, 4000);
    },
    [finalizeSale],
  );

  // ── Séquence de paiement ──────────────────────────────────────────────────
  const startPayment = useCallback(
    async (item: MenuItem) => {
      setPaymentPhase("waiting");
      setScreen("payment");
      const unsub = hardware.onPaymentEvent((e) => setPaymentPhase(e.phase));
      let outcome: PaymentPhase = "waiting";
      try {
        const res = await hardware.requestPayment(item.priceCents);
        outcome = res.outcome;
      } finally {
        unsub();
      }
      if (outcome === "approved") {
        startOpening(item);
      } else {
        // Échec / annulation : message déjà affiché par les events, puis retour menu.
        window.setTimeout(() => setScreen("menu"), 2200);
      }
    },
    [startOpening],
  );

  function handleOrder() {
    if (!selected) return;
    if (requiresPayment) startPayment(selected);
    else startOpening(selected);
  }

  function handleCancelPayment() {
    hardware.cancelPayment();
  }

  return (
    <div className="h-full w-full" onPointerDown={resetIdle}>
      {screen === "idle" && <IdleScreen onStart={() => setScreen("menu")} />}

      {screen === "menu" && (
        <MenuScreen
          onSelect={(item) => {
            setSelected(item);
            setScreen("detail");
          }}
          onBack={() => setScreen("idle")}
        />
      )}

      {screen === "detail" && selected && (
        <DishDetailScreen item={selected} onOrder={handleOrder} onBack={() => setScreen("menu")} />
      )}

      {screen === "payment" && selected && (
        <PaymentScreen
          phase={paymentPhase}
          amountCents={selected.priceCents}
          currency={currency}
          onCancel={handleCancelPayment}
        />
      )}

      {screen === "opening" && selected && (
        <OpeningScreen phase={lockerPhase} boxNumber={selected.locker.boxNumber} />
      )}

      {screen === "thanks" && <ThanksScreen />}
    </div>
  );
}

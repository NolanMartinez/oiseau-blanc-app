import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { hardware, type LockerPhase, type PaymentPhase } from "../../hardware";
import { useKiosk, type GroupedDish } from "../../state/kiosk";
import { SETTING_KEYS } from "../../db";
import { pushSale, loyaltyRedeem, type LoyaltyStatus } from "../../sync";
import { useLang } from "../../i18n";
import type { CartLine } from "../../state/cart";
import { IdleScreen } from "./IdleScreen";
import { CategoryScreen } from "./CategoryScreen";
import { MenuScreen } from "./MenuScreen";
import { DishDetailScreen } from "./DishDetailScreen";
import { CartScreen } from "./CartScreen";
import { IdentifyScreen } from "./IdentifyScreen";
import { PaymentScreen } from "./PaymentScreen";
import { OpeningScreen } from "./OpeningScreen";
import { ThanksScreen } from "./ThanksScreen";

type Screen =
  | "idle"
  | "categories"
  | "menu"
  | "detail"
  | "cart"
  | "identify"
  | "payment"
  | "opening"
  | "thanks";

const IDLE_TIMEOUT_MS = 60_000;
const SHOPPING_SCREENS: Screen[] = ["categories", "menu", "detail", "cart"];

export function CustomerApp() {
  const { repo, reload, setting } = useKiosk();
  const { t } = useLang();
  const [screen, setScreen] = useState<Screen>("idle");
  const [category, setCategory] = useState("");
  const [detailGroup, setDetailGroup] = useState<GroupedDish | null>(null);
  const [cart, setCart] = useState<CartLine[]>([]);
  const [paymentPhase, setPaymentPhase] = useState<PaymentPhase>("waiting");
  const [lockerPhase, setLockerPhase] = useState<LockerPhase>("opening");
  const [openLines, setOpenLines] = useState<CartLine[]>([]);
  const [openStep, setOpenStep] = useState(0);

  // ── Fidélité ────────────────────────────────────────────────────────────────
  const [contact, setContact] = useState(""); // email/tél saisi (vide = anonyme)
  const [loyalty, setLoyalty] = useState<LoyaltyStatus | null>(null);
  const [useReward, setUseReward] = useState(false); // le client échange un repas offert

  const currency = setting(SETTING_KEYS.currency, "EUR");
  const requiresPayment =
    (setting(SETTING_KEYS.mdbEnabled) === "1" || setting(SETTING_KEYS.paymentTest) === "1") &&
    setting(SETTING_KEYS.venteLibre) !== "1";

  const reservedByDish = useMemo(() => {
    const m: Record<string, number> = {};
    for (const l of cart) m[l.dishId] = (m[l.dishId] ?? 0) + 1;
    return m;
  }, [cart]);
  const cartTotalCents = useMemo(() => cart.reduce((s, l) => s + l.priceCents, 0), [cart]);

  // Repas offert : la ligne la plus chère du panier devient gratuite.
  const freeLine = useMemo(
    () =>
      useReward && cart.length > 0
        ? cart.reduce((max, l) => (l.priceCents > max.priceCents ? l : max), cart[0])
        : null,
    [useReward, cart],
  );
  const freeLockerId = freeLine?.lockerId ?? null;
  const discountCents = freeLine?.priceCents ?? 0;
  const payableCents = Math.max(0, cartTotalCents - discountCents);

  const loyaltyBadge = contact
    ? useReward
      ? t("loyalty_reward_used")
      : t("loyalty_active", { n: loyalty?.points ?? 0 })
    : null;

  // ── Timer d'inactivité : retour accueil + panier vidé ─────────────────────
  const idleTimer = useRef<number | null>(null);
  const resetIdle = useCallback(() => {
    if (idleTimer.current) clearTimeout(idleTimer.current);
    if (SHOPPING_SCREENS.includes(screen)) {
      idleTimer.current = window.setTimeout(() => goIdle(), IDLE_TIMEOUT_MS);
    }
  }, [screen]);

  useEffect(() => {
    resetIdle();
    return () => {
      if (idleTimer.current) clearTimeout(idleTimer.current);
    };
  }, [resetIdle]);

  function goIdle() {
    setCart([]);
    setDetailGroup(null);
    setCategory("");
    setContact("");
    setLoyalty(null);
    setUseReward(false);
    setScreen("idle");
  }

  // ── Panier ────────────────────────────────────────────────────────────────
  const addToCart = useCallback((g: GroupedDish) => {
    setCart((prev) => {
      const reserved = new Set(prev.map((l) => l.lockerId));
      const locker = g.lockers.find((l) => !reserved.has(l.id));
      if (!locker) return prev; // tout réservé
      return [
        ...prev,
        {
          lockerId: locker.id,
          dishId: g.dish.id,
          name: g.dish.name,
          priceCents: g.priceCents,
          board: locker.board,
          boxNumber: locker.boxNumber,
          address: locker.address,
        },
      ];
    });
  }, []);

  const removeLine = useCallback((lockerId: number) => {
    setCart((prev) => prev.filter((l) => l.lockerId !== lockerId));
  }, []);

  // ── Vente d'une ligne : journal local + remontée serveur + vidage du casier ─
  const finalizeLine = useCallback(
    async (line: CartLine) => {
      if (!repo) return;
      const soldAt = new Date().toISOString();
      // Ligne offerte (repas fidélité) → gratuite ; sinon payante (ou libre si borne gratuite).
      const isFree = line.lockerId === freeLockerId;
      const mode = isFree || !requiresPayment ? "free" : "paid";
      const amount = isFree ? 0 : line.priceCents;
      await repo.logSale({
        lockerId: line.lockerId,
        dishId: line.dishId,
        amount,
        mode,
        paidAt: soldAt,
        synced: false,
      });
      // Remontée best-effort de la vente vers le serveur (suivi des ventes web + points fidélité).
      void pushSale(setting(SETTING_KEYS.backendUrl), setting(SETTING_KEYS.frigoId), {
        dishId: line.dishId,
        amount,
        mode,
        soldAt,
        contact: contact || undefined,
      });
      await repo.clearLocker(line.lockerId);
    },
    [repo, requiresPayment, setting, freeLockerId, contact],
  );

  // ── Ouverture des casiers : un casier à la fois, avec bouton SUIVANT ───────
  // On ouvre le casier courant (le pilote maintient le verrou relâché jusqu'à ce
  // que la porte soit ouverte). Le client récupère son plat puis clique SUIVANT
  // pour le casier suivant — pas de précipitation.
  const openAt = useCallback(
    async (lines: CartLine[], idx: number) => {
      const line = lines[idx];
      // Ouverture en arrière-plan (fire-and-forget) : le n° de casier et le bouton
      // SUIVANT/Terminé s'affichent immédiatement, sans attendre le maintien du
      // verrou. Ouvrir le casier suivant interrompt proprement le maintien précédent.
      void hardware.openLocker(line.board, line.address ?? line.boxNumber).catch(() => {});
      setLockerPhase("open");
      await finalizeLine(line);
    },
    [finalizeLine],
  );

  const startOpening = useCallback(
    async (lines: CartLine[]) => {
      // Repas offert : on débite les points côté serveur (une seule fois) au moment
      // où la vente est confirmée. Best-effort — n'empêche jamais l'ouverture.
      if (useReward && contact && freeLine) {
        void loyaltyRedeem(
          setting(SETTING_KEYS.backendUrl),
          setting(SETTING_KEYS.frigoId),
          contact,
          freeLine.dishId,
        );
      }
      setOpenLines(lines);
      setOpenStep(0);
      setScreen("opening");
      await openAt(lines, 0);
    },
    [openAt, useReward, contact, freeLine, setting],
  );

  // Bouton SUIVANT / Terminé : passe au casier suivant ou clôt la vente.
  const onNextLocker = useCallback(async () => {
    const next = openStep + 1;
    if (next < openLines.length) {
      setOpenStep(next);
      await openAt(openLines, next);
    } else {
      // Fin de vente : on affiche « merci » tout de suite (le rechargement se fait
      // en arrière-plan) et on revient à l'accueil rapidement.
      setCart([]);
      setScreen("thanks");
      void reload();
      window.setTimeout(() => goIdle(), 2600);
    }
  }, [openStep, openLines, openAt, reload]);

  // ── Paiement (total du panier) ────────────────────────────────────────────
  const startPayment = useCallback(
    async (lines: CartLine[], amountCents: number) => {
      setPaymentPhase("waiting");
      setScreen("payment");
      const unsub = hardware.onPaymentEvent((e) => setPaymentPhase(e.phase));
      let outcome: PaymentPhase = "waiting";
      try {
        const res = await hardware.requestPayment(amountCents);
        outcome = res.outcome;
      } finally {
        unsub();
      }
      // Annulation (sur le TPE ou l'app) → retour panier immédiat. Refus/timeout →
      // court instant pour lire le message, puis retour panier.
      if (outcome === "approved") startOpening(lines);
      else window.setTimeout(() => setScreen("cart"), outcome === "cancelled" ? 500 : 1500);
    },
    [startOpening],
  );

  function checkout() {
    if (cart.length === 0) return;
    // Si tout est offert (repas gratuit couvrant le seul article) ou borne gratuite,
    // pas de paiement : on ouvre directement.
    if (requiresPayment && payableCents > 0) startPayment(cart, payableCents);
    else startOpening(cart);
  }

  function detailRemaining(g: GroupedDish) {
    return g.quantity - (reservedByDish[g.dish.id] ?? 0);
  }

  return (
    <div className="h-full w-full" onPointerDown={resetIdle}>
      {screen === "idle" && <IdleScreen onStart={() => setScreen("categories")} />}

      {screen === "categories" && (
        <CategoryScreen
          onSelect={(cat) => {
            setCategory(cat);
            setScreen("menu");
          }}
          onBack={() => setScreen("idle")}
        />
      )}

      {screen === "menu" && (
        <MenuScreen
          category={category}
          onCategoryChange={setCategory}
          onOpenDetail={(g) => {
            setDetailGroup(g);
            setScreen("detail");
          }}
          onAddToCart={addToCart}
          reservedByDish={reservedByDish}
          cartCount={cart.length}
          cartTotalCents={cartTotalCents}
          onViewCart={() => setScreen("cart")}
          onBack={() => setScreen("categories")}
        />
      )}

      {screen === "detail" && detailGroup && (
        <DishDetailScreen
          group={detailGroup}
          remaining={detailRemaining(detailGroup)}
          onAddToCart={() => {
            addToCart(detailGroup);
            setScreen("menu");
          }}
          onBack={() => setScreen("menu")}
        />
      )}

      {screen === "cart" && (
        <CartScreen
          cart={cart}
          currency={currency}
          onRemove={removeLine}
          onValidate={checkout}
          onContinue={() => setScreen("menu")}
          onLoyalty={() => setScreen("identify")}
          loyaltyBadge={loyaltyBadge}
          discountCents={discountCents}
        />
      )}

      {screen === "identify" && (
        <IdentifyScreen
          onValidated={(c, l, r) => {
            setContact(c);
            setLoyalty(l);
            setUseReward(r);
            setScreen("cart");
          }}
          onSkip={() => {
            setContact("");
            setLoyalty(null);
            setUseReward(false);
            setScreen("cart");
          }}
        />
      )}

      {screen === "payment" && (
        <PaymentScreen
          phase={paymentPhase}
          amountCents={payableCents}
          currency={currency}
          onCancel={() => hardware.cancelPayment()}
        />
      )}

      {screen === "opening" && (
        <OpeningScreen
          phase={lockerPhase}
          boxNumber={openLines[openStep]?.boxNumber ?? 0}
          index={openStep + 1}
          total={openLines.length}
          onNext={onNextLocker}
        />
      )}

      {screen === "thanks" && <ThanksScreen />}
    </div>
  );
}

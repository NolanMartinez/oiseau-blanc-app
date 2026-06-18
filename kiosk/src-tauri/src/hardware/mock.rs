//! Simulateur matériel — implémentation active en l'absence du protocole réel.
//!
//! Reproduit le comportement observable de la borne (ouverture casier avec
//! délais, cycle de porte, paiement auto-approuvé, température oscillante) et
//! émet les mêmes événements Tauri que le futur pilote série.

use std::sync::atomic::{AtomicBool, Ordering};
use std::time::Duration;

use rand::Rng;
use tauri::{AppHandle, Emitter};
use tokio::time::sleep;

use super::{
    DoorState, HardwareController, LockerEvent, PaymentEvent, PaymentOutcome, PaymentResult,
    EVENT_LOCKER, EVENT_PAYMENT,
};

pub struct MockHardware {
    /// Drapeau d'annulation du paiement en cours.
    payment_cancel: AtomicBool,
}

impl MockHardware {
    pub fn new() -> Self {
        Self {
            payment_cancel: AtomicBool::new(false),
        }
    }

    fn emit_locker(app: &AppHandle, board: &str, box_number: u32, phase: &str, message: Option<&str>) {
        let _ = app.emit(
            EVENT_LOCKER,
            LockerEvent {
                board: board.to_string(),
                box_number,
                phase: phase.to_string(),
                message: message.map(|m| m.to_string()),
            },
        );
    }

    fn emit_payment(app: &AppHandle, phase: &str, amount_cents: u32) {
        let _ = app.emit(
            EVENT_PAYMENT,
            PaymentEvent {
                phase: phase.to_string(),
                amount_cents,
            },
        );
    }
}

impl Default for MockHardware {
    fn default() -> Self {
        Self::new()
    }
}

#[async_trait::async_trait]
impl HardwareController for MockHardware {
    async fn open_locker(&self, app: &AppHandle, board: String, box_number: u32) -> Result<(), String> {
        // Séquence : commande -> ouverture -> porte ouverte -> (client récupère) -> fermeture.
        Self::emit_locker(app, &board, box_number, "opening", None);
        sleep(Duration::from_millis(900)).await;
        Self::emit_locker(app, &board, box_number, "open", None);

        // On simule le temps que met le client à prendre son plat puis à refermer.
        sleep(Duration::from_millis(4000)).await;
        Self::emit_locker(app, &board, box_number, "closed", None);
        Ok(())
    }

    async fn close_all(&self, app: &AppHandle, board: String) -> Result<(), String> {
        sleep(Duration::from_millis(500)).await;
        Self::emit_locker(app, &board, 0, "closed", Some("Tous les casiers refermés"));
        Ok(())
    }

    async fn clear_error(&self, app: &AppHandle, board: String) -> Result<(), String> {
        sleep(Duration::from_millis(300)).await;
        Self::emit_locker(app, &board, 0, "closed", Some("Erreurs acquittées"));
        Ok(())
    }

    async fn door_state(&self, _board: String) -> DoorState {
        DoorState::Closed
    }

    async fn read_temperature(&self, _board: String) -> f32 {
        // Oscille autour de 3,5 °C, comme un frigo réel.
        let mut rng = rand::thread_rng();
        let base = 3.5_f32;
        base + rng.gen_range(-1.5..1.5)
    }

    async fn request_payment(&self, app: &AppHandle, amount_cents: u32) -> PaymentResult {
        self.payment_cancel.store(false, Ordering::SeqCst);
        Self::emit_payment(app, "waiting", amount_cents);

        // Attente « présentez votre carte » : on découpe en petits pas pour
        // pouvoir réagir à une annulation.
        for _ in 0..20 {
            if self.payment_cancel.load(Ordering::SeqCst) {
                Self::emit_payment(app, "cancelled", amount_cents);
                return PaymentResult { outcome: PaymentOutcome::Cancelled };
            }
            sleep(Duration::from_millis(100)).await;
        }

        Self::emit_payment(app, "processing", amount_cents);
        sleep(Duration::from_millis(800)).await;

        if self.payment_cancel.load(Ordering::SeqCst) {
            Self::emit_payment(app, "cancelled", amount_cents);
            return PaymentResult { outcome: PaymentOutcome::Cancelled };
        }

        Self::emit_payment(app, "approved", amount_cents);
        PaymentResult { outcome: PaymentOutcome::Approved }
    }

    async fn cancel_payment(&self) {
        self.payment_cancel.store(true, Ordering::SeqCst);
    }
}

//! Couche d'abstraction matérielle de la borne.
//!
//! Le frontend ne parle jamais directement au matériel : il passe par les
//! commandes Tauri (`commands.rs`) qui délèguent à une implémentation de
//! [`HardwareController`]. Aujourd'hui l'implémentation active est
//! [`mock::MockHardware`] (simulateur). Quand le protocole série Bicom + MDB
//! sera disponible, il suffira de fournir une implémentation `serial::SerialHardware`
//! sans toucher au reste de l'application.

pub mod mock;
pub mod serial;

use serde::{Deserialize, Serialize};
use tauri::AppHandle;

/// État physique de la porte d'un casier / d'un compartiment.
#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "lowercase")]
pub enum DoorState {
    Open,
    Closed,
    Unknown,
}

/// Résultat d'une demande de paiement sur le TPE / MDB.
#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "lowercase")]
pub enum PaymentOutcome {
    Approved,
    Declined,
    Cancelled,
    Timeout,
}

#[derive(Debug, Clone, Serialize)]
pub struct PaymentResult {
    pub outcome: PaymentOutcome,
}

/// Nom des événements émis vers le frontend (écoutés via `listen`).
pub const EVENT_LOCKER: &str = "hw://locker";
pub const EVENT_PAYMENT: &str = "hw://payment";

/// Payload de l'événement `hw://locker`.
#[derive(Debug, Clone, Serialize)]
pub struct LockerEvent {
    pub board: String,
    pub box_number: u32,
    /// "opening" | "open" | "closed" | "error"
    pub phase: String,
    pub message: Option<String>,
}

/// Payload de l'événement `hw://payment`.
#[derive(Debug, Clone, Serialize)]
pub struct PaymentEvent {
    /// "waiting" | "processing" | "approved" | "declined" | "cancelled" | "timeout"
    pub phase: String,
    pub amount_cents: u32,
}

/// Contrat que doit respecter tout pilote matériel (mock ou série réel).
#[async_trait::async_trait]
pub trait HardwareController: Send + Sync {
    /// Ouvre le casier `box_number` de la carte `board` (A–E).
    async fn open_locker(&self, app: &AppHandle, board: String, box_number: u32) -> Result<(), String>;

    /// Referme/réinitialise tous les casiers d'une carte (bouton CLOSE ALL).
    async fn close_all(&self, app: &AppHandle, board: String) -> Result<(), String>;

    /// Acquitte les erreurs d'une carte (bouton Clear error).
    async fn clear_error(&self, app: &AppHandle, board: String) -> Result<(), String>;

    /// Lit l'état de la porte principale d'une carte.
    async fn door_state(&self, board: String) -> DoorState;

    /// Lit la température (°C) remontée par une carte.
    async fn read_temperature(&self, board: String) -> f32;

    /// Lance une demande de paiement de `amount_cents` centimes sur le TPE.
    async fn request_payment(&self, app: &AppHandle, amount_cents: u32) -> PaymentResult;

    /// Annule la demande de paiement en cours.
    async fn cancel_payment(&self);
}

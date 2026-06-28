//! Couche d'abstraction matérielle de la borne.
//!
//! Le frontend ne parle jamais directement au matériel : il passe par les
//! commandes Tauri (`commands.rs`) qui délèguent à [`device::Device`]. Le Device
//! aiguille selon le mode :
//!   - `Sim`  -> [`mock::MockHardware`] (simulateur)
//!   - `Real` -> port série réel ([`serial`]) piloté par la configuration des
//!              « Liaisons » (port COM par carte + trame d'ouverture).
//!
//! Tout est piloté par config : pour brancher un vrai frigo, l'exploitant remplit
//! la page Liaisons (aucune recompilation). Paiement MDB et lecture température
//! restent simulés tant que leur protocole n'est pas connu.

pub mod device;
pub mod frame;
pub mod mdb;
pub mod midalite;
pub mod mock;
pub mod serial;

use std::collections::HashMap;

use serde::{Deserialize, Serialize};
use tauri::AppHandle;

/// État physique de la porte d'un casier.
#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "lowercase")]
pub enum DoorState {
    Open,
    Closed,
    Unknown,
}

/// Résultat d'une demande de paiement.
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

/// Mode du pilote matériel.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, Default)]
#[serde(rename_all = "lowercase")]
pub enum Mode {
    #[default]
    Sim,
    Real,
}

/// Branchement d'une carte (dispenser) : port COM + paramètres série.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct BoardLink {
    pub com_port: String,
    #[serde(default = "default_baud")]
    pub baud: u32,
    #[serde(default = "default_parity")]
    pub parity: String,
    #[serde(default)]
    pub enabled: bool,
}

fn default_baud() -> u32 {
    9600
}
fn default_parity() -> String {
    "none".to_string()
}

/// Configuration complète des liaisons (envoyée par le frontend).
#[derive(Debug, Clone, Default, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SerialConfig {
    /// Carte ('A'..'E') -> branchement.
    pub boards: HashMap<String, BoardLink>,
    /// Trame d'ouverture d'un casier (gabarit). Ex: `02 {board} {box} {xor}`.
    pub frame_open: String,
    /// Trame optionnelle « tout fermer » (vide = non envoyée).
    #[serde(default)]
    pub frame_close_all: String,
    /// Trame optionnelle « acquitter erreurs » (vide = non envoyée).
    #[serde(default)]
    pub frame_clear: String,
    /// Trame optionnelle « dégivrage / Close Brina » (vide = non envoyée).
    #[serde(default)]
    pub frame_defrost: String,
    /// Base de numérotation des portes : 1 (1..32) ou 0 (0..31).
    #[serde(default)]
    pub box_base: u8,
    /// Durée (s) de maintien du verrou relâché si le capteur de porte ne réagit
    /// pas (le maintien s'arrête dès que la porte est détectée ouverte).
    #[serde(default = "default_hold_secs")]
    pub open_hold_secs: u32,
    /// Port COM de la carte de paiement MDB (vide = paiement simulé).
    #[serde(default)]
    pub payment_com: String,
    /// Baud de la carte MDB (défaut 115200).
    #[serde(default = "default_payment_baud")]
    pub payment_baud: u32,
    /// Mode test : simule un paiement accepté sans toucher au lecteur ni débiter.
    #[serde(default)]
    pub payment_test: bool,
}

fn default_hold_secs() -> u32 {
    8
}
fn default_payment_baud() -> u32 {
    115200
}

pub const EVENT_LOCKER: &str = "hw://locker";
pub const EVENT_PAYMENT: &str = "hw://payment";

#[derive(Debug, Clone, Serialize)]
pub struct LockerEvent {
    pub board: String,
    pub box_number: u32,
    /// "opening" | "open" | "closed" | "error"
    pub phase: String,
    pub message: Option<String>,
}

#[derive(Debug, Clone, Serialize)]
pub struct PaymentEvent {
    /// "waiting" | "processing" | "approved" | "declined" | "cancelled" | "timeout"
    pub phase: String,
    pub amount_cents: u32,
}

/// Contrat du pilote simulé (le Device l'utilise en mode Sim).
#[async_trait::async_trait]
pub trait HardwareController: Send + Sync {
    async fn open_locker(&self, app: &AppHandle, board: String, box_number: u32) -> Result<(), String>;
    async fn close_all(&self, app: &AppHandle, board: String) -> Result<(), String>;
    async fn clear_error(&self, app: &AppHandle, board: String) -> Result<(), String>;
    async fn door_state(&self, board: String) -> DoorState;
    async fn read_temperature(&self, board: String) -> f32;
    async fn request_payment(&self, app: &AppHandle, amount_cents: u32) -> PaymentResult;
    async fn cancel_payment(&self);
}

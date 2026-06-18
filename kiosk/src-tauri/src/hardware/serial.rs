//! Pilote matériel série RÉEL — à implémenter quand le protocole Bicom (cartes
//! casiers A–E) et le protocole de paiement MDB seront documentés.
//!
//! Plan d'intégration (aucun changement frontend requis) :
//!   1. Ajouter la dépendance `tauri-plugin-serialport` (ou `serialport`).
//!   2. Ouvrir les ports COM mappés dans les réglages
//!      (`settings.mainboard_a..e`, `settings.payment_com`).
//!   3. Implémenter `HardwareController` pour `SerialHardware` en encodant les
//!      trames d'ouverture casier / lecture température / CLOSE ALL / clear error
//!      vers les cartes, et le dialogue MDB pour `request_payment`.
//!   4. Dans `lib.rs`, remplacer `Arc::new(MockHardware::new())` par
//!      `Arc::new(SerialHardware::new(config))`.
//!
//! Tant que ce module n'est pas implémenté, il n'est pas branché : le simulateur
//! [`super::mock::MockHardware`] reste l'implémentation active.

#![allow(dead_code)]

/// Configuration des ports COM (renseignée depuis l'écran Réglages).
#[derive(Debug, Clone, Default)]
pub struct SerialConfig {
    pub mainboard_a: Option<String>,
    pub mainboard_b: Option<String>,
    pub mainboard_c: Option<String>,
    pub mainboard_d: Option<String>,
    pub mainboard_e: Option<String>,
    pub payment_com: Option<String>,
}

/// Pilote série réel (stub). Voir la documentation du module.
pub struct SerialHardware {
    _config: SerialConfig,
}

impl SerialHardware {
    pub fn new(config: SerialConfig) -> Self {
        Self { _config: config }
    }
}

// NOTE: l'impl `HardwareController for SerialHardware` sera ajoutée ici une
// fois le protocole connu, en miroir de `mock.rs`.

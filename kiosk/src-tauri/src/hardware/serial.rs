//! Accès série réel aux cartes (ouverture casier). Utilisé par le Device en mode
//! `Real`. Le protocole exact (trame) vient de la configuration des Liaisons, donc
//! ce module ne fait que transporter des octets — aucune logique propriétaire en
//! dur, rien à recompiler quand le format de trame change.

use std::io::Write;
use std::time::Duration;

use serialport::Parity;

use super::BoardLink;

/// Liste les ports COM détectés sur la machine.
pub fn list_ports() -> Vec<String> {
    serialport::available_ports()
        .map(|ports| ports.into_iter().map(|p| p.port_name).collect())
        .unwrap_or_default()
}

fn parity_from(s: &str) -> Parity {
    match s.to_lowercase().as_str() {
        "even" => Parity::Even,
        "odd" => Parity::Odd,
        _ => Parity::None,
    }
}

/// Ouvre le port de la carte, écrit la trame, ferme. Bloquant : à appeler depuis
/// `spawn_blocking`.
pub fn send_frame(link: &BoardLink, bytes: &[u8]) -> Result<(), String> {
    let mut port = serialport::new(&link.com_port, link.baud)
        .parity(parity_from(&link.parity))
        .timeout(Duration::from_millis(800))
        .open()
        .map_err(|e| format!("Ouverture {} échouée : {e}", link.com_port))?;
    port.write_all(bytes).map_err(|e| format!("Écriture sur {} échouée : {e}", link.com_port))?;
    port.flush().map_err(|e| e.to_string())?;
    Ok(())
}

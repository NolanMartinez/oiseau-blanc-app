//! Pilote réel de la carte **MIDA / MidaLite** (frigos Bicom).
//!
//! Protocole reverse-engineeré depuis `MainBoardComm.dll` (classe
//! `MidaLiteProtocol` / `MidaLiteDigitalIOState`) puis **validé en live** sur la
//! borne réelle (COM1, 57600, 8N1) : ouverture des casiers + lecture de la sonde.
//!
//! Trame d'interrogation / d'ouverture (commande `0xC0` = StatusRequest) :
//! ```text
//! 02 | C0 | OUT1_8 ROW1_8 COL1_5 PULSE_TIME PULSE_PWM SUST_PWM (chaque valeur en 2 car. ASCII-hex) | XOR(ascii) | 03
//! ```
//! - Casier N (1..32) : matrice 4 colonnes × 8 lignes -> `row = (N-1) % 8`,
//!   `col = (N-1) / 8`, `ROW1_8 = 1<<row`, `COL1_5 = 1<<col`.
//! - XOR = ou-exclusif de tous les octets STP..dernier octet de données, émis en
//!   2 caractères ASCII-hex.
//!
//! Réponse (22 o.) : `02 C0 06 <8 valeurs ASCII-hex> XOR 03`. La sonde NTC y est
//! codée sur 2 octets (MSB+LSB) ; un canal analogique reflète l'état des portes.

use std::io::Write;
use std::sync::atomic::{AtomicBool, Ordering};
use std::thread::sleep;
use std::time::{Duration, Instant};

use serialport::Parity;

/// Réglages d'impulsion de l'aimant (valeurs par défaut Bicom, `Configuration_Settings`).
const PULSE_TIME: u8 = 50; // 0x32
const PULSE_PWM: u8 = 250; // 0xFA
const SUST_PWM: u8 = 80; //   0x50

/// Construit une trame 0xC0 à partir des 6 valeurs (sorties + réglages aimant).
fn build_frame(out1_8: u8, row1_8: u8, col1_5: u8) -> Vec<u8> {
    let vals = [out1_8, row1_8, col1_5, PULSE_TIME, PULSE_PWM, SUST_PWM];
    let data: String = vals.iter().map(|v| format!("{:02X}", v)).collect();

    let mut pkt: Vec<u8> = Vec::with_capacity(2 + data.len() + 3);
    pkt.push(0x02); // STP
    pkt.push(0xC0); // CMD = StatusRequest
    pkt.extend_from_slice(data.as_bytes());

    let xor = pkt.iter().fold(0u8, |a, b| a ^ b);
    pkt.extend_from_slice(format!("{:02X}", xor).as_bytes());
    pkt.push(0x03); // EDP
    pkt
}

/// Trame d'ouverture du casier `box_number` (1..32).
fn open_frame(box_number: u32) -> Vec<u8> {
    let n = box_number.saturating_sub(1);
    let row = (n % 8) as u8;
    let col = (n / 8) as u8;
    build_frame(0, 1 << row, 1 << col)
}

/// Trame « relâcher tout » (toutes sorties à 0).
fn close_frame() -> Vec<u8> {
    build_frame(0, 0, 0)
}

fn open_port(port: &str, baud: u32) -> Result<Box<dyn serialport::SerialPort>, String> {
    serialport::new(port, baud)
        .parity(Parity::None)
        .data_bits(serialport::DataBits::Eight)
        .stop_bits(serialport::StopBits::One)
        .timeout(Duration::from_millis(400))
        .open()
        .map_err(|e| format!("Ouverture {port} échouée : {e}"))
}

/// Interroge la carte et renvoie les 8 valeurs décodées de la réponse, ou `None`
/// si la carte n'a pas répondu correctement.
fn read_status(port: &mut dyn serialport::SerialPort) -> Option<[u32; 8]> {
    let poll = close_frame();
    let _ = port.clear(serialport::ClearBuffer::Input);
    port.write_all(&poll).ok()?;
    port.flush().ok()?;
    sleep(Duration::from_millis(150));

    let n = port.bytes_to_read().ok()? as usize;
    if n < 21 {
        return None;
    }
    let mut buf = vec![0u8; n];
    port.read_exact(&mut buf).ok()?;
    let txt = String::from_utf8_lossy(&buf);
    if txt.len() < 19 {
        return None;
    }
    let mut vals = [0u32; 8];
    for (i, v) in vals.iter_mut().enumerate() {
        let p = 3 + i * 2;
        *v = u32::from_str_radix(txt.get(p..p + 2)?, 16).ok()?;
    }
    Some(vals)
}

/// Décode les 8 valeurs d'une réponse 0xC0 déjà reçue dans le buffer d'entrée
/// (sans envoyer de nouvelle trame, pour ne pas couper le maintien du verrou).
fn read_pending(port: &mut dyn serialport::SerialPort) -> Option<[u32; 8]> {
    let n = port.bytes_to_read().ok()? as usize;
    if n < 21 {
        return None;
    }
    let mut buf = vec![0u8; n];
    port.read_exact(&mut buf).ok()?;
    let txt = String::from_utf8_lossy(&buf);
    if txt.len() < 19 {
        return None;
    }
    let mut vals = [0u32; 8];
    for (i, v) in vals.iter_mut().enumerate() {
        let p = 3 + i * 2;
        *v = u32::from_str_radix(txt.get(p..p + 2)?, 16).ok()?;
    }
    Some(vals)
}

/// Ouvre **un** casier et MAINTIENT le verrou relâché jusqu'à ce que la porte
/// soit détectée ouverte (capteur, canal idx6), ou pendant `hold_secs` au maximum
/// (repli si le capteur ne répond pas). Évite que l'électroaimant se referme avant
/// que le client n'ait ouvert la porte.
pub fn open_box(
    port_name: &str,
    baud: u32,
    box_number: u32,
    hold_secs: u32,
    interrupt: &AtomicBool,
) -> Result<(), String> {
    let mut port = open_port(port_name, baud)?;
    let frame = open_frame(box_number);
    let deadline = Instant::now() + Duration::from_secs(hold_secs.max(1) as u64);

    while Instant::now() < deadline {
        // Interruption (« Tout fermer » ou ouverture d'un autre casier) : on relâche
        // le port immédiatement pour laisser passer la nouvelle commande — évite le
        // blocage de ~30 s pendant lequel plus rien ne répondait.
        if interrupt.load(Ordering::SeqCst) {
            break;
        }
        // On ré-émet la trame d'ouverture (~toutes les 120 ms) pour soutenir le
        // verrou ; la réponse à cette même commande 0xC0 porte l'état de la porte.
        let _ = port.clear(serialport::ClearBuffer::Input);
        port.write_all(&frame).map_err(|e| format!("Écriture échouée : {e}"))?;
        port.flush().map_err(|e| e.to_string())?;
        sleep(Duration::from_millis(120));
        if let Some(vals) = read_pending(&mut *port) {
            if vals[6] > 30 {
                break; // porte ouverte : inutile de maintenir, elle reste ouverte
            }
        }
    }

    // Relâche la commande (toutes sorties à 0).
    let _ = port.write_all(&close_frame());
    let _ = port.flush();
    sleep(Duration::from_millis(120));
    Ok(())
}

/// Relâche tous les casiers (toutes sorties à 0).
pub fn close_all(port_name: &str, baud: u32) -> Result<(), String> {
    let mut port = open_port(port_name, baud)?;
    port.write_all(&close_frame()).map_err(|e| format!("Écriture échouée : {e}"))?;
    port.flush().map_err(|e| e.to_string())?;
    Ok(())
}

/// Lit la température de la sonde NTC (°C). Renvoie une erreur si la sonde est HS
/// ou si la carte ne répond pas.
///
/// La valeur brute NTC bruite fortement (octet de poids faible qui saute). On
/// prend donc plusieurs mesures et on garde la **médiane** → valeur stable
/// (équivalent de la moyenne « TA » loggée par Brina). Sans ça, l'affichage
/// fluctue de plusieurs degrés en quelques secondes.
pub fn read_temperature(port_name: &str, baud: u32) -> Result<f32, String> {
    let mut port = open_port(port_name, baud)?;
    let mut raws: Vec<u32> = Vec::new();
    for _ in 0..9 {
        if let Some(vals) = read_status(&mut *port) {
            // raw 16 bits = MSB(val[1]) << 8 | LSB(val[2]) (mapping validé en live).
            let raw = (vals[1] << 8) | vals[2];
            if raw > 0 {
                raws.push(raw);
            }
        }
    }
    if raws.is_empty() {
        return Err("Sonde HS ou pas de réponse".into());
    }
    raws.sort_unstable();
    let raw = raws[raws.len() / 2]; // médiane (rejette le bruit et les pics)

    let tmv = (raw * 4700 / 4096) as f64;
    if tmv <= 0.0 {
        return Err("Sonde HS".into());
    }
    let r = (26320.0 / tmv - 5.6) * 1000.0;
    if r <= 0.0 {
        return Err("Sonde HS (résistance négative)".into());
    }
    let t = 3435.0 / (r * 10.08154).ln() - 273.15;
    Ok(t as f32)
}

/// Indique si une porte est détectée ouverte (canal analogique idx6 élevé).
pub fn any_door_open(port_name: &str, baud: u32) -> Result<bool, String> {
    let mut port = open_port(port_name, baud)?;
    let vals = read_status(&mut *port).ok_or("Pas de réponse de la carte MIDA")?;
    Ok(vals[6] > 30)
}

//! Pilote de **paiement par carte (MDB)** — carte passerelle Bicom + lecteur cashless.
//!
//! Protocole reverse-engineeré depuis `MDBProtocol.dll` (classe `MDBProtocol`).
//! Carte MDB du frigo : **COM2 @ 115200, 8N1** (répond `FW1.8.00`).
//!
//! Trame passerelle : `'*' + LEN(2 hex) + DATA(2 hex/octet) + CS(2 hex) + '#'`,
//! CS = (0x2A + somme des octets ASCII de LEN+DATA) & 0xFF, hex MAJUSCULES.
//! La réponse a le même format ; on en extrait les octets de données (RX_Buff).
//!
//! Dialogue cashless (lecteur @ adresse 0x10 = « Cash10 », device index 0) :
//!   - Firmware (ident.)      : `00 01`           -> réponse contient "FW..."
//!   - Activer le lecteur     : `00 71 0B 00`
//!   - Poll cashless          : `00 02 02`        -> DevState = data[10]
//!   - Demande d'autorisation : `00 71 14 00 <montant BE32 centimes> <produit BE16>`
//!   - Vente confirmée (OK)   : `00 71 15 00`
//!   - Vente échouée/annulée  : `00 71 0D 00`
//!   - Désactiver le lecteur  : `00 71 0C 00`
//! DevState : 3 = carte présentée (begin session), 5 = approuvé, 6 = refusé.
//!
//! ⚠️ Valeurs validées par décompilation mais PAS encore testées sur le frigo
//! réel : à confirmer/ajuster lors du premier test avec une vraie carte.

use std::sync::atomic::{AtomicBool, Ordering};
use std::thread::sleep;
use std::time::{Duration, Instant};

use serialport::{ClearBuffer, Parity, SerialPort};

use super::PaymentOutcome;

// Index du lecteur cashless : 0 = Cash10 (adr. MDB 0x10), 1 = Cash60 (0x60).
const CASHLESS_DEVICE: u8 = 0;

// Délais (s) : attente présentation carte, puis attente autorisation banque.
const WAIT_CARD_SECS: u64 = 60;
const WAIT_AUTH_SECS: u64 = 35;

/// Construit une trame passerelle à partir des octets de données.
fn build_frame(data: &[u8]) -> Vec<u8> {
    let mut payload = format!("{:02X}", data.len());
    for b in data {
        payload.push_str(&format!("{:02X}", b));
    }
    let cs: u32 = 0x2A + payload.bytes().map(|c| c as u32).sum::<u32>();
    format!("*{}{:02X}#", payload, (cs & 0xFF) as u8).into_bytes()
}

/// Décode une réponse passerelle en octets de données (sans LEN ni CS).
fn decode_response(buf: &[u8]) -> Option<Vec<u8>> {
    let s = String::from_utf8_lossy(buf);
    let start = s.find('*')?;
    let end = s[start..].find('#')? + start;
    let inner = &s[start + 1..end]; // LEN(2) + data + CS(2)
    if inner.len() < 4 {
        return None;
    }
    let data_hex = &inner[2..inner.len() - 2];
    let bytes = data_hex.as_bytes();
    let mut out = Vec::with_capacity(bytes.len() / 2);
    let mut i = 0;
    while i + 1 < bytes.len() {
        let pair = std::str::from_utf8(&bytes[i..i + 2]).ok()?;
        out.push(u8::from_str_radix(pair, 16).ok()?);
        i += 2;
    }
    Some(out)
}

fn open_port(port: &str, baud: u32) -> Result<Box<dyn SerialPort>, String> {
    serialport::new(port, baud)
        .parity(Parity::None)
        .data_bits(serialport::DataBits::Eight)
        .stop_bits(serialport::StopBits::One)
        .timeout(Duration::from_millis(400))
        .open()
        .map_err(|e| format!("Ouverture {port} échouée : {e}"))
}

/// Envoie une commande et renvoie les octets de données de la réponse.
fn send_recv(port: &mut dyn SerialPort, data: &[u8]) -> Option<Vec<u8>> {
    let frame = build_frame(data);
    let _ = port.clear(ClearBuffer::Input);
    port.write_all(&frame).ok()?;
    port.flush().ok()?;
    sleep(Duration::from_millis(120));
    let n = port.bytes_to_read().ok()? as usize;
    if n == 0 {
        return None;
    }
    let mut buf = vec![0u8; n];
    port.read_exact(&mut buf).ok()?;
    decode_response(&buf)
}

/// Lit le DevState du lecteur (octet n°10 de la réponse au poll cashless).
fn poll_devstate(port: &mut dyn SerialPort) -> Option<u8> {
    let resp = send_recv(port, &[0x00, 0x02, 0x02])?;
    resp.get(10).copied()
}

/// Déroule un paiement carte complet. `on_phase` remonte les étapes à l'UI
/// (`waiting`/`processing`/`approved`/`declined`/`cancelled`/`timeout`).
pub fn run_payment(
    port_name: &str,
    baud: u32,
    amount_cents: u32,
    cancel: &AtomicBool,
    on_phase: impl Fn(&str),
) -> PaymentOutcome {
    let mut port = match open_port(port_name, baud) {
        Ok(p) => p,
        Err(_) => {
            on_phase("timeout");
            return PaymentOutcome::Timeout;
        }
    };

    // Identification (best-effort) + activation du lecteur.
    let _ = send_recv(&mut *port, &[0x00, 0x01]); // firmware
    let _ = send_recv(&mut *port, &[0x00, 0x71, 0x0B, CASHLESS_DEVICE]); // enable

    // 1) Attente de la présentation d'une carte (DevState == 3).
    on_phase("waiting");
    let card_deadline = Instant::now() + Duration::from_secs(WAIT_CARD_SECS);
    loop {
        if cancel.load(Ordering::SeqCst) {
            let _ = send_recv(&mut *port, &[0x00, 0x71, 0x0C, CASHLESS_DEVICE]); // disable
            on_phase("cancelled");
            return PaymentOutcome::Cancelled;
        }
        if poll_devstate(&mut *port) == Some(3) {
            break;
        }
        if Instant::now() >= card_deadline {
            let _ = send_recv(&mut *port, &[0x00, 0x71, 0x0C, CASHLESS_DEVICE]);
            on_phase("timeout");
            return PaymentOutcome::Timeout;
        }
        sleep(Duration::from_millis(250));
    }

    // 2) Demande d'autorisation pour le montant (centimes), produit = 0.
    on_phase("processing");
    let a = amount_cents;
    let vend = [
        0x00, 0x71, 0x14, CASHLESS_DEVICE,
        (a >> 24) as u8, (a >> 16) as u8, (a >> 8) as u8, a as u8,
        0x00, 0x00, // code produit
    ];
    let _ = send_recv(&mut *port, &vend);

    // 3) Attente de la réponse banque (DevState 5 = approuvé, 6 = refusé).
    let auth_deadline = Instant::now() + Duration::from_secs(WAIT_AUTH_SECS);
    loop {
        if cancel.load(Ordering::SeqCst) {
            let _ = send_recv(&mut *port, &[0x00, 0x71, 0x0D, CASHLESS_DEVICE]); // vend failed
            let _ = send_recv(&mut *port, &[0x00, 0x71, 0x0C, CASHLESS_DEVICE]);
            on_phase("cancelled");
            return PaymentOutcome::Cancelled;
        }
        match poll_devstate(&mut *port) {
            Some(5) => {
                let _ = send_recv(&mut *port, &[0x00, 0x71, 0x15, CASHLESS_DEVICE]); // vend success
                let _ = send_recv(&mut *port, &[0x00, 0x71, 0x0C, CASHLESS_DEVICE]);
                on_phase("approved");
                return PaymentOutcome::Approved;
            }
            Some(6) => {
                let _ = send_recv(&mut *port, &[0x00, 0x71, 0x0D, CASHLESS_DEVICE]); // vend failed
                let _ = send_recv(&mut *port, &[0x00, 0x71, 0x0C, CASHLESS_DEVICE]);
                on_phase("declined");
                return PaymentOutcome::Declined;
            }
            _ => {}
        }
        if Instant::now() >= auth_deadline {
            let _ = send_recv(&mut *port, &[0x00, 0x71, 0x0D, CASHLESS_DEVICE]);
            let _ = send_recv(&mut *port, &[0x00, 0x71, 0x0C, CASHLESS_DEVICE]);
            on_phase("timeout");
            return PaymentOutcome::Timeout;
        }
        sleep(Duration::from_millis(250));
    }
}

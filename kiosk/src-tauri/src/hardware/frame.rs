//! Encodeur de trame piloté par gabarit (template).
//!
//! Le gabarit est une suite de jetons séparés par des espaces :
//!   - `02`, `1B`, `FF` … : octet littéral en hexadécimal
//!   - `{board}`          : adresse de la carte (A=0, B=1, …)
//!   - `{box}`            : numéro/adresse de la porte
//!   - `{xor}`            : XOR de tous les octets précédents
//!   - `{sum8}`           : somme (mod 256) des octets précédents
//!   - `{len}`            : nombre d'octets déjà produits
//!
//! Exemple : `02 {board} {box} {xor}` -> `02 00 0E 1C` pour la carte A, porte 14.

pub fn encode(template: &str, board: u8, box_addr: u8) -> Result<Vec<u8>, String> {
    let mut out: Vec<u8> = Vec::new();
    for tok in template.split_whitespace() {
        match tok {
            "{board}" => out.push(board),
            "{box}" => out.push(box_addr),
            "{xor}" => {
                let x = out.iter().fold(0u8, |a, b| a ^ b);
                out.push(x);
            }
            "{sum8}" => {
                let s = out.iter().fold(0u8, |a, b| a.wrapping_add(*b));
                out.push(s);
            }
            "{len}" => {
                let n = out.len() as u8;
                out.push(n);
            }
            _ => {
                if tok.len() == 2 && tok.chars().all(|c| c.is_ascii_hexdigit()) {
                    out.push(u8::from_str_radix(tok, 16).map_err(|_| format!("octet invalide : {tok}"))?);
                } else {
                    return Err(format!("jeton inconnu : « {tok} »"));
                }
            }
        }
    }
    if out.is_empty() {
        return Err("gabarit de trame vide".into());
    }
    Ok(out)
}

/// Représentation lisible d'une trame (ex: "02 00 0E 1C").
pub fn to_hex(bytes: &[u8]) -> String {
    bytes.iter().map(|b| format!("{:02X}", b)).collect::<Vec<_>>().join(" ")
}

/// Indice de carte à partir de la lettre ('A' -> 0).
pub fn board_index(board: &str) -> u8 {
    board.chars().next().map(|c| (c as u8).wrapping_sub(b'A')).unwrap_or(0)
}

/// Adresse de porte effective selon la base de numérotation (0 ou 1).
pub fn box_addr(box_number: u32, box_base: u8) -> u8 {
    if box_base == 0 {
        box_number.saturating_sub(1) as u8
    } else {
        box_number as u8
    }
}

//! Façade matérielle : aiguille chaque opération vers le simulateur (mode Sim)
//! ou le port série réel (mode Real), selon la configuration des Liaisons.

use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::{Arc, Mutex};

use tauri::{AppHandle, Emitter};

use super::{
    frame, mdb, midalite, mock::MockHardware, serial, DoorState, HardwareController, LockerEvent,
    Mode, PaymentEvent, PaymentOutcome, PaymentResult, SerialConfig, EVENT_LOCKER, EVENT_PAYMENT,
};

#[derive(Default)]
struct DeviceConfig {
    mode: Mode,
    serial: SerialConfig,
}

pub struct Device {
    mock: MockHardware,
    cfg: Mutex<DeviceConfig>,
    payment_cancel: Arc<AtomicBool>,
}

impl Device {
    pub fn new() -> Self {
        Self {
            mock: MockHardware::new(),
            cfg: Mutex::new(DeviceConfig::default()),
            payment_cancel: Arc::new(AtomicBool::new(false)),
        }
    }

    /// Met à jour le mode + la config série (appelé par le frontend au démarrage
    /// et à chaque modification de la page Liaisons).
    pub fn set_config(&self, mode: Mode, serial: SerialConfig) {
        let mut c = self.cfg.lock().unwrap();
        c.mode = mode;
        c.serial = serial;
    }

    fn snapshot(&self) -> (Mode, SerialConfig) {
        let c = self.cfg.lock().unwrap();
        (c.mode, c.serial.clone())
    }

    fn emit(app: &AppHandle, board: &str, box_number: u32, phase: &str, message: Option<&str>) {
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

    /// Envoie une trame déjà encodée sur la carte (mode Real).
    async fn send(cfg: &SerialConfig, board: &str, bytes: Vec<u8>) -> Result<(), String> {
        let link = Self::link_for(cfg, board)?;
        tauri::async_runtime::spawn_blocking(move || serial::send_frame(&link, &bytes))
            .await
            .map_err(|e| e.to_string())?
    }

    /// Récupère le branchement d'une carte (et vérifie qu'elle est activée).
    fn link_for(cfg: &SerialConfig, board: &str) -> Result<super::BoardLink, String> {
        let link = cfg
            .boards
            .get(board)
            .cloned()
            .ok_or_else(|| format!("Carte {board} non configurée"))?;
        if !link.enabled {
            return Err(format!("Carte {board} désactivée"));
        }
        Ok(link)
    }

    /// Ouvre **un** casier précis (1..32) via le pilote MidaLite réel.
    pub async fn open_locker(&self, app: &AppHandle, board: String, box_number: u32) -> Result<(), String> {
        let (mode, cfg) = self.snapshot();
        if mode == Mode::Sim {
            return self.mock.open_locker(app, board, box_number).await;
        }
        let link = Self::link_for(&cfg, &board)?;
        let hold = cfg.open_hold_secs;
        Self::emit(app, &board, box_number, "opening", None);
        let res = tauri::async_runtime::spawn_blocking(move || {
            midalite::open_box(&link.com_port, link.baud, box_number, hold)
        })
        .await
        .map_err(|e| e.to_string())
        .and_then(|r| r);
        if let Err(e) = res {
            Self::emit(app, &board, box_number, "error", Some(&e));
            return Err(e);
        }
        Self::emit(app, &board, box_number, "open", None);
        Ok(())
    }

    pub async fn close_all(&self, app: &AppHandle, board: String) -> Result<(), String> {
        let (mode, cfg) = self.snapshot();
        if mode == Mode::Sim {
            return self.mock.close_all(app, board).await;
        }
        let link = Self::link_for(&cfg, &board)?;
        tauri::async_runtime::spawn_blocking(move || midalite::close_all(&link.com_port, link.baud))
            .await
            .map_err(|e| e.to_string())
            .and_then(|r| r)?;
        Self::emit(app, &board, 0, "closed", Some("Tous les casiers relâchés"));
        Ok(())
    }

    pub async fn clear_error(&self, app: &AppHandle, board: String) -> Result<(), String> {
        let (mode, cfg) = self.snapshot();
        if mode == Mode::Sim {
            return self.mock.clear_error(app, board).await;
        }
        if cfg.frame_clear.trim().is_empty() {
            Self::emit(app, &board, 0, "closed", Some("Aucune trame Clear configurée"));
            return Ok(());
        }
        let bytes = frame::encode(&cfg.frame_clear, frame::board_index(&board), 0)?;
        Self::send(&cfg, &board, bytes).await?;
        Self::emit(app, &board, 0, "closed", Some("Erreurs acquittées"));
        Ok(())
    }

    pub async fn defrost(&self, app: &AppHandle, board: String) -> Result<(), String> {
        let (mode, cfg) = self.snapshot();
        if mode == Mode::Sim {
            Self::emit(app, &board, 0, "closed", Some("Dégivrage lancé (simulé)"));
            return Ok(());
        }
        if cfg.frame_defrost.trim().is_empty() {
            Self::emit(app, &board, 0, "closed", Some("Aucune trame de dégivrage configurée"));
            return Ok(());
        }
        let bytes = frame::encode(&cfg.frame_defrost, frame::board_index(&board), 0)?;
        Self::send(&cfg, &board, bytes).await?;
        Self::emit(app, &board, 0, "closed", Some("Dégivrage lancé"));
        Ok(())
    }

    // Porte : réelle (canal sonde MIDA) en mode Real, sinon simulée.
    pub async fn door_state(&self, board: String) -> DoorState {
        let (mode, cfg) = self.snapshot();
        if mode == Mode::Real {
            if let Ok(link) = Self::link_for(&cfg, &board) {
                let r = tauri::async_runtime::spawn_blocking(move || {
                    midalite::any_door_open(&link.com_port, link.baud)
                })
                .await;
                return match r {
                    Ok(Ok(true)) => DoorState::Open,
                    Ok(Ok(false)) => DoorState::Closed,
                    _ => DoorState::Unknown,
                };
            }
        }
        self.mock.door_state(board).await
    }

    // Température : sonde NTC réelle en mode Real, sinon simulée.
    pub async fn read_temperature(&self, board: String) -> f32 {
        let (mode, cfg) = self.snapshot();
        if mode == Mode::Real {
            if let Ok(link) = Self::link_for(&cfg, &board) {
                let r = tauri::async_runtime::spawn_blocking(move || {
                    midalite::read_temperature(&link.com_port, link.baud)
                })
                .await;
                if let Ok(Ok(t)) = r {
                    return t;
                }
            }
        }
        self.mock.read_temperature(board).await
    }
    // Paiement : carte MDB réelle en mode Real (si un port paiement est configuré),
    // sinon simulé.
    pub async fn request_payment(&self, app: &AppHandle, amount_cents: u32) -> PaymentResult {
        let (mode, cfg) = self.snapshot();
        // Mode test : paiement simulé accepté, sans toucher au lecteur ni débiter.
        if cfg.payment_test {
            return self.mock.request_payment(app, amount_cents).await;
        }
        if mode == Mode::Real && !cfg.payment_com.trim().is_empty() {
            self.payment_cancel.store(false, Ordering::SeqCst);
            let app2 = app.clone();
            let cancel = self.payment_cancel.clone();
            let port = cfg.payment_com.clone();
            let baud = cfg.payment_baud;
            let outcome = tauri::async_runtime::spawn_blocking(move || {
                mdb::run_payment(&port, baud, amount_cents, &cancel, |phase| {
                    let _ = app2.emit(
                        EVENT_PAYMENT,
                        PaymentEvent { phase: phase.to_string(), amount_cents },
                    );
                })
            })
            .await
            .unwrap_or(PaymentOutcome::Timeout);
            return PaymentResult { outcome };
        }
        self.mock.request_payment(app, amount_cents).await
    }
    pub async fn cancel_payment(&self) {
        self.payment_cancel.store(true, Ordering::SeqCst);
        self.mock.cancel_payment().await
    }

    /// Aperçu (sans envoi) de la trame d'ouverture pour un casier donné.
    pub fn preview_frame(&self, board: String, box_number: u32) -> Result<String, String> {
        let (_, cfg) = self.snapshot();
        let bytes = frame::encode(
            &cfg.frame_open,
            frame::board_index(&board),
            frame::box_addr(box_number, cfg.box_base),
        )?;
        Ok(frame::to_hex(&bytes))
    }
}

impl Default for Device {
    fn default() -> Self {
        Self::new()
    }
}

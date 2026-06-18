//! Façade matérielle : aiguille chaque opération vers le simulateur (mode Sim)
//! ou le port série réel (mode Real), selon la configuration des Liaisons.

use std::sync::Mutex;

use tauri::{AppHandle, Emitter};

use super::{
    frame, mock::MockHardware, serial, DoorState, HardwareController, LockerEvent, Mode,
    PaymentResult, SerialConfig, EVENT_LOCKER,
};

#[derive(Default)]
struct DeviceConfig {
    mode: Mode,
    serial: SerialConfig,
}

pub struct Device {
    mock: MockHardware,
    cfg: Mutex<DeviceConfig>,
}

impl Device {
    pub fn new() -> Self {
        Self {
            mock: MockHardware::new(),
            cfg: Mutex::new(DeviceConfig::default()),
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
        let link = cfg
            .boards
            .get(board)
            .cloned()
            .ok_or_else(|| format!("Carte {board} non configurée"))?;
        if !link.enabled {
            return Err(format!("Carte {board} désactivée"));
        }
        tauri::async_runtime::spawn_blocking(move || serial::send_frame(&link, &bytes))
            .await
            .map_err(|e| e.to_string())?
    }

    pub async fn open_locker(&self, app: &AppHandle, board: String, box_number: u32) -> Result<(), String> {
        let (mode, cfg) = self.snapshot();
        if mode == Mode::Sim {
            return self.mock.open_locker(app, board, box_number).await;
        }
        let bytes = frame::encode(
            &cfg.frame_open,
            frame::board_index(&board),
            frame::box_addr(box_number, cfg.box_base),
        )?;
        Self::emit(app, &board, box_number, "opening", None);
        if let Err(e) = Self::send(&cfg, &board, bytes).await {
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
        if cfg.frame_close_all.trim().is_empty() {
            Self::emit(app, &board, 0, "closed", Some("Aucune trame CLOSE ALL configurée"));
            return Ok(());
        }
        let bytes = frame::encode(&cfg.frame_close_all, frame::board_index(&board), 0)?;
        Self::send(&cfg, &board, bytes).await?;
        Self::emit(app, &board, 0, "closed", Some("Tous les casiers refermés"));
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

    // Température / porte / paiement : simulés tant que leur protocole n'est pas connu.
    pub async fn door_state(&self, board: String) -> DoorState {
        self.mock.door_state(board).await
    }
    pub async fn read_temperature(&self, board: String) -> f32 {
        self.mock.read_temperature(board).await
    }
    pub async fn request_payment(&self, app: &AppHandle, amount_cents: u32) -> PaymentResult {
        self.mock.request_payment(app, amount_cents).await
    }
    pub async fn cancel_payment(&self) {
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

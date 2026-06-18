//! Commandes Tauri exposées au frontend.
//!
//! Frontière d'abstraction : le React appelle `invoke(...)` sans savoir si le
//! matériel est simulé ou réel — c'est le [`Device`] qui aiguille.

use std::sync::Arc;

use tauri::{AppHandle, State};

use crate::hardware::{device::Device, serial, DoorState, Mode, PaymentResult, SerialConfig};

/// État partagé : la façade matérielle.
pub struct DeviceState(pub Arc<Device>);

#[tauri::command]
pub async fn open_locker(
    app: AppHandle,
    dev: State<'_, DeviceState>,
    board: String,
    box_number: u32,
) -> Result<(), String> {
    let dev = dev.0.clone();
    dev.open_locker(&app, board, box_number).await
}

#[tauri::command]
pub async fn close_all(app: AppHandle, dev: State<'_, DeviceState>, board: String) -> Result<(), String> {
    let dev = dev.0.clone();
    dev.close_all(&app, board).await
}

#[tauri::command]
pub async fn clear_error(app: AppHandle, dev: State<'_, DeviceState>, board: String) -> Result<(), String> {
    let dev = dev.0.clone();
    dev.clear_error(&app, board).await
}

#[tauri::command]
pub async fn defrost(app: AppHandle, dev: State<'_, DeviceState>, board: String) -> Result<(), String> {
    let dev = dev.0.clone();
    dev.defrost(&app, board).await
}

#[tauri::command]
pub async fn door_state(dev: State<'_, DeviceState>, board: String) -> Result<DoorState, String> {
    let dev = dev.0.clone();
    Ok(dev.door_state(board).await)
}

#[tauri::command]
pub async fn read_temperature(dev: State<'_, DeviceState>, board: String) -> Result<f32, String> {
    let dev = dev.0.clone();
    Ok(dev.read_temperature(board).await)
}

#[tauri::command]
pub async fn request_payment(
    app: AppHandle,
    dev: State<'_, DeviceState>,
    amount_cents: u32,
) -> Result<PaymentResult, String> {
    let dev = dev.0.clone();
    Ok(dev.request_payment(&app, amount_cents).await)
}

#[tauri::command]
pub async fn cancel_payment(dev: State<'_, DeviceState>) -> Result<(), String> {
    let dev = dev.0.clone();
    dev.cancel_payment().await;
    Ok(())
}

// ── Liaisons / configuration matérielle ─────────────────────────────────────

/// Liste les ports COM détectés (pour les listes déroulantes de la page Liaisons).
#[tauri::command]
pub fn list_com_ports() -> Vec<String> {
    serial::list_ports()
}

/// Applique la configuration des liaisons (mode + branchements + trames).
#[tauri::command]
pub fn set_hw_config(dev: State<'_, DeviceState>, mode: Mode, config: SerialConfig) -> Result<(), String> {
    dev.0.set_config(mode, config);
    Ok(())
}

/// Aperçu (sans envoi) de la trame d'ouverture d'un casier.
#[tauri::command]
pub fn preview_frame(dev: State<'_, DeviceState>, board: String, box_number: u32) -> Result<String, String> {
    dev.0.preview_frame(board, box_number)
}

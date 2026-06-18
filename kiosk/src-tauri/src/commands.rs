//! Commandes Tauri exposées au frontend.
//!
//! C'est la frontière d'abstraction : le React appelle `invoke('open_locker', …)`
//! sans savoir si le matériel est simulé ou réel.

use std::sync::Arc;

use tauri::{AppHandle, State};

use crate::hardware::{DoorState, HardwareController, PaymentResult};

/// État partagé : le pilote matériel actif (mock aujourd'hui, série demain).
pub struct HardwareState(pub Arc<dyn HardwareController>);

#[tauri::command]
pub async fn open_locker(
    app: AppHandle,
    hw: State<'_, HardwareState>,
    board: String,
    box_number: u32,
) -> Result<(), String> {
    let hw = hw.0.clone();
    hw.open_locker(&app, board, box_number).await
}

#[tauri::command]
pub async fn close_all(
    app: AppHandle,
    hw: State<'_, HardwareState>,
    board: String,
) -> Result<(), String> {
    let hw = hw.0.clone();
    hw.close_all(&app, board).await
}

#[tauri::command]
pub async fn clear_error(
    app: AppHandle,
    hw: State<'_, HardwareState>,
    board: String,
) -> Result<(), String> {
    let hw = hw.0.clone();
    hw.clear_error(&app, board).await
}

#[tauri::command]
pub async fn door_state(hw: State<'_, HardwareState>, board: String) -> Result<DoorState, String> {
    let hw = hw.0.clone();
    Ok(hw.door_state(board).await)
}

#[tauri::command]
pub async fn read_temperature(hw: State<'_, HardwareState>, board: String) -> Result<f32, String> {
    let hw = hw.0.clone();
    Ok(hw.read_temperature(board).await)
}

#[tauri::command]
pub async fn request_payment(
    app: AppHandle,
    hw: State<'_, HardwareState>,
    amount_cents: u32,
) -> Result<PaymentResult, String> {
    let hw = hw.0.clone();
    Ok(hw.request_payment(&app, amount_cents).await)
}

#[tauri::command]
pub async fn cancel_payment(hw: State<'_, HardwareState>) -> Result<(), String> {
    let hw = hw.0.clone();
    hw.cancel_payment().await;
    Ok(())
}

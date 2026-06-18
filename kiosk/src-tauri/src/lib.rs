mod commands;
mod db;
mod hardware;

use std::sync::Arc;

use commands::HardwareState;
use hardware::{mock::MockHardware, HardwareController};

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    // Implémentation matérielle active. Pour passer au matériel réel, remplacer
    // par `Arc::new(hardware::serial::SerialHardware::new(config))`.
    let hw: Arc<dyn HardwareController> = Arc::new(MockHardware::new());

    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_http::init())
        .plugin(
            tauri_plugin_sql::Builder::default()
                .add_migrations(db::DB_URL, db::migrations())
                .build(),
        )
        .manage(HardwareState(hw))
        .invoke_handler(tauri::generate_handler![
            commands::open_locker,
            commands::close_all,
            commands::clear_error,
            commands::door_state,
            commands::read_temperature,
            commands::request_payment,
            commands::cancel_payment,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

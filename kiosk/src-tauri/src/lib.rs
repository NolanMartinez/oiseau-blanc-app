mod commands;
mod db;
mod hardware;

use std::sync::Arc;

use commands::DeviceState;
use hardware::device::Device;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    // Façade matérielle. Démarre en mode Sim ; le frontend pousse la config réelle
    // (mode + branchements) via `set_hw_config` au démarrage et depuis la page Liaisons.
    let device = Arc::new(Device::new());

    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_http::init())
        .plugin(
            tauri_plugin_sql::Builder::default()
                .add_migrations(db::DB_URL, db::migrations())
                .build(),
        )
        .manage(DeviceState(device))
        .invoke_handler(tauri::generate_handler![
            commands::open_locker,
            commands::close_all,
            commands::clear_error,
            commands::defrost,
            commands::door_state,
            commands::read_temperature,
            commands::request_payment,
            commands::cancel_payment,
            commands::list_com_ports,
            commands::set_hw_config,
            commands::preview_frame,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

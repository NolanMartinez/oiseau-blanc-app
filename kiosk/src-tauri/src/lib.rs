mod commands;
mod db;
mod hardware;

use std::sync::Arc;

use commands::DeviceState;
use hardware::device::Device;

/// Tâches Windows exécutées au démarrage de la borne :
///  1. Inscrit l'application au démarrage automatique de l'ordinateur (clé Run HKCU).
///  2. Coupe l'application constructeur « Brina » (et ses services) pour libérer les
///     ports COM, sinon elle bloque les liaisons série du frigo.
#[cfg(target_os = "windows")]
fn windows_startup_tasks() {
    use std::os::windows::process::CommandExt;
    use std::process::Command;
    const NO_WINDOW: u32 = 0x0800_0000; // CREATE_NO_WINDOW : pas de fenêtre console

    // 1) Démarrage automatique : clé Run de l'utilisateur courant → chemin de l'exe.
    if let Ok(exe) = std::env::current_exe() {
        let _ = Command::new("reg")
            .args([
                "add",
                r"HKCU\Software\Microsoft\Windows\CurrentVersion\Run",
                "/v",
                "FriggoBorne",
                "/t",
                "REG_SZ",
                "/d",
                &exe.to_string_lossy(),
                "/f",
            ])
            .creation_flags(NO_WINDOW)
            .status();
    }

    // 2) Coupe l'application constructeur pour libérer les ports COM du frigo.
    //    IMPORTANT : « ProcessMonitoring.exe » est un watchdog qui relance Brina ;
    //    on le tue EN PREMIER, sinon Brina repart aussitôt et re-bloque les ports.
    for image in ["ProcessMonitoring.exe", "BrinaS941.exe", "Brina.exe"] {
        let _ = Command::new("taskkill")
            .args(["/F", "/T", "/IM", image])
            .creation_flags(NO_WINDOW)
            .status();
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    // Façade matérielle. Démarre en mode Sim ; le frontend pousse la config réelle
    // (mode + branchements) via `set_hw_config` au démarrage et depuis la page Liaisons.
    let device = Arc::new(Device::new());

    tauri::Builder::default()
        .setup(|_app| {
            // Démarrage auto + libération des ports COM (Brina), en tâche de fond
            // pour ne pas retarder l'affichage de la borne.
            #[cfg(target_os = "windows")]
            std::thread::spawn(windows_startup_tasks);
            Ok(())
        })
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

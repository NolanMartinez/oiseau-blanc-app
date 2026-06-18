//! Migrations de la base locale SQLite (tauri-plugin-sql).
//!
//! Le frontend ouvre la même base via `Database.load("sqlite:kiosk.db")` et
//! exécute ses requêtes (voir `src/db/`).

use tauri_plugin_sql::{Migration, MigrationKind};

/// URL de la base, partagée Rust <-> frontend.
pub const DB_URL: &str = "sqlite:kiosk.db";

pub fn migrations() -> Vec<Migration> {
    vec![
        Migration {
            version: 1,
            description: "schema initial borne",
            sql: include_str!("../migrations/0001_init.sql"),
            kind: MigrationKind::Up,
        },
        Migration {
            version: 2,
            description: "liaisons materiel",
            sql: include_str!("../migrations/0002_liaisons.sql"),
            kind: MigrationKind::Up,
        },
        Migration {
            version: 3,
            description: "apports doc bicom",
            sql: include_str!("../migrations/0003_bicom.sql"),
            kind: MigrationKind::Up,
        },
    ]
}

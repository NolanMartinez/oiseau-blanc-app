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
        Migration {
            version: 4,
            description: "donnees de demonstration",
            sql: include_str!("../migrations/0004_demo.sql"),
            kind: MigrationKind::Up,
        },
        Migration {
            version: 5,
            description: "force mode simulateur (demo)",
            sql: include_str!("../migrations/0005_force_sim.sql"),
            kind: MigrationKind::Up,
        },
        Migration {
            version: 6,
            description: "renommage categories demo",
            sql: include_str!("../migrations/0006_demo_categories.sql"),
            kind: MigrationKind::Up,
        },
        Migration {
            version: 7,
            description: "active materiel reel MIDA (COM1/57600)",
            sql: include_str!("../migrations/0007_real_midalite.sql"),
            kind: MigrationKind::Up,
        },
        Migration {
            version: 8,
            description: "DLC en jours par plat",
            sql: include_str!("../migrations/0008_dlc_days.sql"),
            kind: MigrationKind::Up,
        },
        Migration {
            version: 9,
            description: "carte paiement MDB (COM2/115200)",
            sql: include_str!("../migrations/0009_payment_mdb.sql"),
            kind: MigrationKind::Up,
        },
        Migration {
            version: 10,
            description: "frigos B..E (jusqu'a 5 par borne)",
            sql: include_str!("../migrations/0010_dispensers_bcde.sql"),
            kind: MigrationKind::Up,
        },
        Migration {
            version: 11,
            description: "baud 57600 par defaut + PIN livreur",
            sql: include_str!("../migrations/0011_baud57600_livreur_pin.sql"),
            kind: MigrationKind::Up,
        },
        Migration {
            version: 12,
            description: "repare categorie corrompue dans le cache local",
            sql: include_str!("../migrations/0012_fix_corrupt_category.sql"),
            kind: MigrationKind::Up,
        },
    ]
}

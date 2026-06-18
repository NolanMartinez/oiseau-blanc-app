# Friggo Borne — Application kiosk frigo connecté

Application tactile qui tourne **sur la borne** de chaque frigo connecté de
L'Oiseau Blanc Traiteur (Windows 10 IoT Enterprise). Elle remplace le logiciel
Bicom historique par une interface moderne.

- **Client** : choisit un plat → paie sur le TPE (ou « vente libre ») → le casier
  s'ouvre → il récupère son plat.
- **Admin** (accès par PIN) : associe chaque casier à un plat + prix + DLC, pilote
  les casiers (ouvrir / CLOSE ALL / clear error), surveille l'état système, règle
  les ports COM / MDB / devise.

## Stack

- **Tauri 2** (coeur Rust léger) + **React 19 / TypeScript** + **Tailwind v4**
- **SQLite** local (`tauri-plugin-sql`) — fonctionne hors-ligne (local-first)
- **HTTP** via `tauri-plugin-http` (synchro menu depuis le backend, sans CORS)

## Architecture

```
src/                      Frontend React
  screens/customer/       Idle → Menu → Détail → Paiement → Ouverture → Merci
  screens/admin/          PinLock, Mapping, BoxControl, SystemStatus, Settings
  hardware/               Wrappers unifiés (Tauri invoke OU simulateur navigateur)
  db/                     Repo: SqlRepo (Tauri) + MemoryRepo (navigateur)
  sync/                   Récupération menu/images depuis le backend existant
  state/kiosk.tsx         Contexte global (données + actions)
  i18n/                   FR / EN / ES / PT / DE / IT
src-tauri/
  src/hardware/           trait HardwareController + mock.rs (actif) + serial.rs (stub)
  src/commands.rs         Commandes Tauri (open_locker, request_payment, …)
  migrations/0001_init.sql Schéma + seed (dispenser A, 32 casiers, réglages)
```

**Frontière d'abstraction matérielle = les commandes Tauri.** Le frontend ne
connaît jamais le matériel : il appelle `hardware.openLocker(...)` /
`hardware.requestPayment(...)`. Aujourd'hui l'implémentation active est le
**simulateur** (`src-tauri/src/hardware/mock.rs`). Le même code TS tourne aussi
dans un simple navigateur grâce à un simulateur JS jumeau — pratique pour itérer
sur l'UI sans matériel.

## Développement

Prérequis : Node 18+, Rust (rustup) + MSVC Build Tools, WebView2 (déjà présent sur
Windows 11 / IoT récent).

```bash
npm install

# UI seule dans le navigateur (simulateur matériel + données en localStorage)
npm run dev            # http://localhost:1420

# Application complète (fenêtre borne, SQLite, simulateur matériel Rust)
npm run tauri dev
```

### Accès admin
Depuis l'écran client, **5 appuis rapides dans le coin supérieur gauche** ouvrent
l'écran PIN. PIN par défaut : `1234` (modifiable dans Réglages).

### Synchro du menu
Dans **Réglages** : renseigner l'URL du serveur (ex. `http://192.168.1.10:3001`)
et l'identifiant du frigo, puis **Synchroniser**. La borne récupère le menu, les
prix (promo incluse) et les images depuis le backend existant :
`GET /api/v1/public/frigos/:id` et `GET /api/v1/public/dishes/:id/image`.
Le mapping casier→plat reste **local** à la borne.

## Build Windows

```bash
npm run tauri build     # génère un .msi / .exe dans src-tauri/target/release/bundle
```

### Mise en mode borne
- La fenêtre est déjà **plein écran sans décorations** (`tauri.conf.json`).
- Pour empêcher l'accès au bureau Windows, configurer le **lancement auto** de
  l'app au démarrage (Shell Launcher de Windows IoT, ou dossier Démarrage), et
  réserver la sortie à l'admin (PIN).

## Intégration matériel réel (étape suivante)

Le protocole série Bicom (cartes casiers A–E) et MDB (paiement) n'est pas encore
disponible. Quand il le sera :

1. Implémenter `HardwareController` pour `SerialHardware`
   (`src-tauri/src/hardware/serial.rs`) avec `tauri-plugin-serialport`.
2. Dans `src-tauri/src/lib.rs`, remplacer
   `Arc::new(MockHardware::new())` par `Arc::new(SerialHardware::new(config))`.

**Aucun changement frontend requis.**

## Remontée des ventes (optionnel)

Les ventes sont journalisées localement (`sales_log`). Une remontée vers le
backend nécessitera un nouvel endpoint borne côté serveur (ex.
`POST /api/v1/public/kiosk/sales`) — hors périmètre de cette phase.

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

### Brancher un frigo (page « Liaisons »)
Tout se configure **à la souris/tactile**, sans recompiler :
1. **Mode matériel** : Simulateur ↔ Matériel réel.
2. **Cartes & ports COM** : pour chaque carte (A–E), choisir le port COM détecté
   automatiquement, le débit (baud), la parité, et l'activer.
3. **Trame d'ouverture** : gabarit de la trame envoyée pour ouvrir un casier, avec
   aperçu en direct. Jetons : `{board}`, `{box}`, `{xor}`, `{sum8}`, `{len}` +
   octets hex (ex. `02 {board} {box} {xor}`). Base de numérotation 0/1.
4. **Adresses physiques** : si le câblage des portes ne suit pas 1..32, saisir
   l'adresse réelle de chaque porte.
5. **Tester** : bouton qui envoie réellement la trame au casier choisi.

Paiement MDB et lecture température restent **simulés** tant que leur protocole
n'est pas fourni (clairement indiqué dans l'UI).

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

## Intégration matériel réel

Le **transport série existe déjà** (crate `serialport`, [src-tauri/src/hardware/serial.rs](src-tauri/src/hardware/serial.rs))
et tout est **piloté par la configuration** de la page Liaisons :
[device.rs](src-tauri/src/hardware/device.rs) aiguille vers le port série en mode
`Real`, encode la trame d'ouverture ([frame.rs](src-tauri/src/hardware/frame.rs))
et l'envoie sur le bon COM.

Pour brancher un vrai frigo, dans la plupart des cas il suffit de **remplir la
page Liaisons** (port COM + gabarit de trame) — aucune recompilation.

Cas nécessitant du code : si une carte parle un protocole plus riche que
« trame fixe d'ouverture » (réponses à lire, handshake, lecture température/porte),
étendre [device.rs](src-tauri/src/hardware/device.rs) en s'appuyant sur
`serial::send_frame`. Le **paiement MDB** reste à implémenter (interface MDB↔série
+ dialogue cashless) ; en attendant, `request_payment` utilise le simulateur.

## Workflow code-barres (page Casiers)

Comme le Totem Bicom, on peut affecter un plat à un tiroir avec la **douchette
USB** (reconnue comme clavier) : activer **Mode scan**, scanner le code-barres du
plat puis celui du tiroir. Un code inconnu propose de le **lier** à un plat
(mémorisé sur `dishes_cache.barcode`). La saisie manuelle reste disponible.

## Indépendance

L'application est **autonome** : aucune dépendance à un cloud ou compte tiers.
Données locales (SQLite) + synchro avec **votre** backend uniquement. Elle pilote
le matériel du frigo (cartes/serrures) de façon **générique** via la page Liaisons
(trame configurable) — aucun code propriétaire en dur.

## Remontée des ventes (optionnel)

Les ventes sont journalisées localement (`sales_log`). Une remontée vers le
backend nécessitera un nouvel endpoint borne côté serveur (ex.
`POST /api/v1/public/kiosk/sales`) — hors périmètre de cette phase.

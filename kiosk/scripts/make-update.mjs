// Génère les fichiers de mise à jour à publier sur le VPS après un build signé :
//   release-updates/latest.json                (manifeste lu par la borne)
//   release-updates/Friggo-Borne_<v>_x64-setup.exe   (installeur, nom sans espace)
// À lancer depuis le dossier kiosk/ APRÈS `npm run tauri build` (avec la clé de signature).
import fs from "fs";
import path from "path";

const root = path.resolve("src-tauri");
const conf = JSON.parse(fs.readFileSync(path.join(root, "tauri.conf.json"), "utf8"));
const version = conf.version;

const nsisDir = path.join(root, "target/release/bundle/nsis");
const files = fs.readdirSync(nsisDir);
// IMPORTANT : filtrer sur la VERSION courante (le dossier peut contenir les .sig
// de builds précédents → sinon on prend la mauvaise signature).
const setup = files.find((f) => f.includes(version) && f.endsWith("-setup.exe"));
const sig = files.find((f) => f.includes(version) && f.endsWith("-setup.exe.sig"));
if (!setup || !sig) {
  console.error(`Installeur/signature v${version} introuvable dans ${nsisDir}. As-tu buildé AVEC la clé de signature ?`);
  process.exit(1);
}

const signature = fs.readFileSync(path.join(nsisDir, sig), "utf8").trim();
const outDir = path.resolve("release-updates");
fs.mkdirSync(outDir, { recursive: true });

const cleanName = `Friggo-Borne_${version}_x64-setup.exe`;
fs.copyFileSync(path.join(nsisDir, setup), path.join(outDir, cleanName));

const latest = {
  version,
  notes: "Mise à jour de l'application Friggo Borne.",
  pub_date: new Date().toISOString(),
  platforms: {
    "windows-x86_64": {
      signature,
      url: `https://164.132.96.144.sslip.io/updates/${cleanName}`,
    },
  },
};
fs.writeFileSync(path.join(outDir, "latest.json"), JSON.stringify(latest, null, 2));
console.log(`OK -> release-updates/  (latest.json + ${cleanName}, v${version})`);

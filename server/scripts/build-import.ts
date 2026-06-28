/**
 * Assemble le fichier d'import MySQL final pour OVH :
 *   prisma/ovh/schema.sql  (DDL généré par `prisma migrate diff`)
 * + prisma/ovh/data.sql    (INSERTs générés par export-mysql.ts)
 * = prisma/ovh/oiseau_blanc_ovh.sql   (à importer dans phpMyAdmin)
 *
 * Workflow complet :
 *   1. DATABASE_URL=<postgres prod> npx tsx scripts/export-mysql.ts   -> data.sql
 *   2. npm run db:schema-ovh                                          -> schema.sql
 *   3. npx tsx scripts/build-import.ts                                -> oiseau_blanc_ovh.sql
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

const dir = resolve(process.cwd(), 'prisma/ovh');
const schemaPath = resolve(dir, 'schema.sql');
const dataPath = resolve(dir, 'data.sql');
const outPath = resolve(dir, 'oiseau_blanc_ovh.sql');

if (!existsSync(schemaPath)) {
  console.error('Manque schema.sql — lance d\'abord : npm run db:schema-ovh');
  process.exit(1);
}

// Retire un éventuel BOM UTF-8 (ajouté par PowerShell Out-File) — sinon MySQL
// renvoie une erreur de syntaxe sur le caractère invisible en tête de fichier.
const stripBom = (s: string) => (s.charCodeAt(0) === 0xfeff ? s.slice(1) : s);

const schema = stripBom(readFileSync(schemaPath, 'utf8'));
const data = existsSync(dataPath) ? stripBom(readFileSync(dataPath, 'utf8')) : '-- (pas de data.sql : structure seule)';

// Tables supprimées avant recréation : anciennes (anglais) + nouvelles (français).
// Permet de ré-importer le fichier autant de fois qu'on veut (idempotent).
const DROP_TABLES = [
  // anciennes (anglais) — nettoyage d'un import précédent
  'admins', 'subscribers', 'dishes', 'dish_translations', 'fridge_stocks',
  'reviews', 'preference_surveys', 'preference_responses', 'menu_votes',
  'menu_vote_responses', 'notifications', 'otp_codes', 'purchases',
  // nouvelles (français)
  'administrateurs', 'abonnes', 'plats', 'traductions_plats', 'stocks_frigos',
  'avis', 'sondages', 'reponses_sondages', 'votes_menus',
  'reponses_votes_menus', 'codes_otp', 'achats',
];

const header = [
  '-- =====================================================================',
  '--  L\'Oiseau Blanc — Import MySQL/MariaDB (OVH / phpMyAdmin)',
  '--  Structure (tables en français, dont dlc_days + images) + données.',
  '--  Idempotent : supprime puis recrée tout. Importable dans une base existante.',
  '-- =====================================================================',
  'SET NAMES utf8mb4;',
  'SET FOREIGN_KEY_CHECKS=0;',
  '',
  '-- ─── NETTOYAGE (anciennes + nouvelles tables) ────────────────────────',
  ...DROP_TABLES.map((t) => `DROP TABLE IF EXISTS \`${t}\`;`),
  '',
  '-- ─── STRUCTURE ───────────────────────────────────────────────────────',
  '',
].join('\n');

const middle = ['', '-- ─── DONNÉES ─────────────────────────────────────────────────────────', ''].join('\n');
const footer = '\nSET FOREIGN_KEY_CHECKS=1;\n';

writeFileSync(outPath, header + schema + middle + data + footer, 'utf8');
console.log(`✓ Fichier d'import prêt : ${outPath}`);

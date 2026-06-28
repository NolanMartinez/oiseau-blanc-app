/**
 * Exporte les données de la base **PostgreSQL** actuelle vers un fichier `.sql`
 * importable dans **MySQL/MariaDB** (BDD OVH, via phpMyAdmin).
 *
 * Utilise le driver `pg` directement (PAS Prisma) : reste donc fonctionnel même
 * après bascule du schéma Prisma en MySQL. Pointer `DATABASE_URL` sur la base qui
 * contient le vrai contenu (souvent la Railway de prod, où sont les images) :
 *
 *     DATABASE_URL="postgresql://..." npx tsx scripts/export-mysql.ts
 *
 * Sortie : prisma/ovh/data.sql (INSERTs ; images en littéraux hexadécimaux).
 * Les noms de tables/colonnes sont identiques entre les DDL Postgres et MySQL
 * générés par Prisma (mêmes @map), donc les INSERTs sont compatibles.
 */
import 'dotenv/config';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { Client } from 'pg';

// [table source PostgreSQL (anglais), table cible MySQL (français)].
// Ordre sans importance (contraintes désactivées pendant l'import).
const TABLES: [src: string, dest: string][] = [
  ['admins', 'administrateurs'],
  ['subscribers', 'abonnes'],
  ['dishes', 'plats'],
  ['dish_translations', 'traductions_plats'],
  ['fridge_stocks', 'stocks_frigos'],
  ['reviews', 'avis'],
  ['preference_surveys', 'sondages'],
  ['preference_responses', 'reponses_sondages'],
  ['menu_votes', 'votes_menus'],
  ['menu_vote_responses', 'reponses_votes_menus'],
  ['notifications', 'notifications'],
  ['otp_codes', 'codes_otp'],
  ['purchases', 'achats'],
];

function escString(s: string): string {
  const map: Record<string, string> = {
    '\\': '\\\\',
    '\0': '\\0',
    '\n': '\\n',
    '\r': '\\r',
    '\b': '\\b',
    '\t': '\\t',
    '\x1a': '\\Z',
    "'": "\\'",
  };
  return "'" + s.replace(/[\\\0\n\r\b\t\x1a']/g, (c) => map[c]) + "'";
}

function toDateTime(d: Date): string {
  return "'" + d.toISOString().slice(0, 19).replace('T', ' ') + "'";
}

function formatValue(v: unknown): string {
  if (v === null || v === undefined) return 'NULL';
  if (typeof v === 'boolean') return v ? '1' : '0';
  if (typeof v === 'number') return Number.isFinite(v) ? String(v) : 'NULL';
  if (typeof v === 'bigint') return v.toString();
  if (v instanceof Date) return toDateTime(v);
  if (v instanceof Uint8Array || Buffer.isBuffer(v)) {
    const buf = Buffer.from(v as Uint8Array);
    return buf.length === 0 ? "''" : '0x' + buf.toString('hex');
  }
  if (typeof v === 'object') return escString(JSON.stringify(v)); // json / tableau
  return escString(String(v));
}

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url || !url.startsWith('postgres')) {
    console.error('DATABASE_URL doit pointer sur la base PostgreSQL source (postgres://…).');
    process.exit(1);
  }
  const client = new Client({
    connectionString: url,
    ssl: url.includes('localhost') ? undefined : { rejectUnauthorized: false },
  });
  await client.connect();

  const outPath = resolve(process.cwd(), 'prisma/ovh/data.sql');
  mkdirSync(dirname(outPath), { recursive: true });

  const parts: string[] = [];
  parts.push('-- Données exportées depuis PostgreSQL pour import MySQL/MariaDB (OVH).');
  parts.push('SET FOREIGN_KEY_CHECKS=0;');
  parts.push('');

  let total = 0;
  for (const [src, dest] of TABLES) {
    let rows: Record<string, unknown>[];
    try {
      const res = await client.query(`SELECT * FROM "${src}"`);
      rows = res.rows;
    } catch (e) {
      parts.push(`-- (table ${src} absente ou illisible : ${(e as Error).message})`);
      continue;
    }
    if (rows.length === 0) {
      parts.push(`-- ${dest} : 0 ligne`);
      continue;
    }
    const cols = Object.keys(rows[0]);
    const colList = cols.map((c) => `\`${c}\``).join(', ');
    parts.push(`-- ${dest} (source: ${src}) : ${rows.length} ligne(s)`);
    for (const row of rows) {
      const vals = cols.map((c) => formatValue(row[c])).join(', ');
      parts.push(`INSERT INTO \`${dest}\` (${colList}) VALUES (${vals});`);
    }
    parts.push('');
    total += rows.length;
  }

  parts.push('SET FOREIGN_KEY_CHECKS=1;');
  writeFileSync(outPath, parts.join('\n'), 'utf8');
  await client.end();
  console.log(`✓ Export terminé : ${outPath} (${total} lignes au total).`);
}

main().catch((e) => {
  console.error('Échec export :', e);
  process.exit(1);
});

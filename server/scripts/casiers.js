/**
 * Outil d'exploitation : liste les casiers vendus sur un frigo, sur une période.
 * À lancer SUR LE SERVEUR depuis /opt/friggo/server :
 *
 *   node scripts/casiers.js                                  → liste les machines
 *   node scripts/casiers.js "Frigo 1"                        → 7 derniers jours
 *   node scripts/casiers.js "Frigo 1" 2026-09-27 2026-09-29  → période précise
 *
 * Le 1er argument peut être le NOM, l'ID ou le SITE (location) de la machine
 * (correspondance partielle, insensible à la casse). Affiche pour chaque vente :
 * date/heure (Europe/Paris), machine, plat, casier (ex. A3) et prix.
 */
const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const p = new PrismaClient();

const parisDate = (d) => new Intl.DateTimeFormat('fr-CA', { timeZone: 'Europe/Paris', year: 'numeric', month: '2-digit', day: '2-digit' }).format(d);
const parisTime = (d) => new Intl.DateTimeFormat('fr-FR', { timeZone: 'Europe/Paris', hour: '2-digit', minute: '2-digit' }).format(d);

(async () => {
  const [q, from, to] = process.argv.slice(2);
  const fridges = await p.fridge.findMany({ select: { id: true, name: true, location: true } });

  if (!q) {
    console.log('Machines disponibles :');
    console.table(fridges);
    console.log('\nUsage : node scripts/casiers.js "<nom machine>" 2026-09-27 2026-09-29');
    console.log('Resume toutes machines : node scripts/casiers.js --resume 2026-09-01 2026-10-05');
    return p.$disconnect();
  }

  // Mode export CSV COMPLET : toutes les machines. Sans dates = depuis le début.
  // Ecrit un fichier CSV (Excel FR) avec Date, Heure (Paris), Machine, Plat,
  // Casier, Prix. node scripts/casiers.js --csv [from] [to]
  if (q === '--csv') {
    const start = from ? new Date(from + 'T00:00:00') : new Date(0);
    const end = to ? new Date(to + 'T23:59:59') : new Date();
    const sales = await p.sale.findMany({ where: { soldAt: { gte: start, lte: end } }, orderBy: { soldAt: 'asc' } });
    const dishes = await p.dish.findMany({ select: { id: true, name: true } });
    const dn = new Map(dishes.map((d) => [d.id, d.name]));
    const fn = new Map(fridges.map((f) => [f.id, f.name]));
    const esc = (v) => '"' + String(v).replace(/"/g, '""') + '"';
    const header = ['Date', 'Heure', 'Machine', 'Plat', 'Casier', 'Prix (€)'].map(esc).join(';');
    const lines = sales.map((s) =>
      [
        parisDate(s.soldAt),
        parisTime(s.soldAt),
        fn.get(s.frigoId) || s.frigoId,
        dn.get(s.dishId) || s.dishId,
        s.board && s.boxNumber != null ? s.board + String(s.boxNumber) : '',
        (s.amount / 100).toFixed(2).replace('.', ','),
      ].map(esc).join(';'),
    );
    const file = 'ventes-casiers.csv';
    fs.writeFileSync(file, '﻿' + [header, ...lines].join('\r\n'), 'utf8');
    console.log('Fichier ecrit :', process.cwd() + '/' + file);
    console.log('Total ventes :', sales.length, '| avec casier :', sales.filter((s) => s.board && s.boxNumber != null).length);
    console.log('Periode :', start.getTime() === 0 ? 'depuis le debut' : parisDate(start), '->', parisDate(end));
    return p.$disconnect();
  }

  // Mode résumé : nb de ventes (et avec casier) par machine sur la période.
  if (q === '--resume' || q === '--all') {
    const start = from ? new Date(from + 'T00:00:00') : new Date(Date.now() - 30 * 86400000);
    const end = to ? new Date(to + 'T23:59:59') : new Date();
    const sales = await p.sale.findMany({
      where: { soldAt: { gte: start, lte: end } },
      select: { frigoId: true, board: true, boxNumber: true },
    });
    const fn = new Map(fridges.map((f) => [f.id, f.name]));
    const agg = new Map();
    for (const s of sales) {
      const e = agg.get(s.frigoId) || { machine: fn.get(s.frigoId) || s.frigoId, ventes: 0, avecCasier: 0 };
      e.ventes += 1;
      if (s.board && s.boxNumber != null) e.avecCasier += 1;
      agg.set(s.frigoId, e);
    }
    console.log('Resume du', start.toLocaleDateString('fr-FR'), 'au', end.toLocaleDateString('fr-FR'), ':');
    console.table([...agg.values()].sort((a, b) => b.ventes - a.ventes));
    console.log('Total ventes (toutes machines) :', sales.length);
    return p.$disconnect();
  }

  const needle = q.toLowerCase();
  const match = fridges.filter(
    (f) =>
      f.id === q ||
      (f.name || '').toLowerCase().includes(needle) ||
      (f.location || '').toLowerCase().includes(needle),
  );
  if (!match.length) {
    console.log('Aucune machine ne correspond a :', q);
    console.log('Machines existantes :', fridges.map((f) => f.name).join(', '));
    return p.$disconnect();
  }

  const ids = match.map((f) => f.id);
  const start = from ? new Date(from + 'T00:00:00') : new Date(Date.now() - 7 * 86400000);
  const end = to ? new Date(to + 'T23:59:59') : new Date();

  const sales = await p.sale.findMany({
    where: { frigoId: { in: ids }, soldAt: { gte: start, lte: end } },
    orderBy: { soldAt: 'asc' },
  });
  const dishes = await p.dish.findMany({ select: { id: true, name: true } });
  const dn = new Map(dishes.map((d) => [d.id, d.name]));
  const fn = new Map(fridges.map((f) => [f.id, f.name]));

  const rows = sales.map((s) => ({
    date: s.soldAt.toLocaleString('fr-FR', { timeZone: 'Europe/Paris', dateStyle: 'short', timeStyle: 'short' }),
    machine: fn.get(s.frigoId) || s.frigoId,
    plat: dn.get(s.dishId) || s.dishId,
    casier: s.board && s.boxNumber != null ? s.board + String(s.boxNumber) : '—',
    euros: (s.amount / 100).toFixed(2),
  }));

  console.table(rows);
  console.log('Machine(s) :', match.map((f) => f.name).join(', '));
  console.log('Periode    :', start.toLocaleDateString('fr-FR'), '->', end.toLocaleDateString('fr-FR'));
  console.log('Total ventes :', rows.length, '| avec casier connu :', rows.filter((r) => r.casier !== '—').length);

  await p.$disconnect();
})().catch(async (e) => {
  console.error('Erreur :', e.message);
  await p.$disconnect();
  process.exit(1);
});

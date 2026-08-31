import { prisma } from '../utils/prisma';
import { logger } from '../utils/logger';
import { sendDailyReportEmail, type DailyReportMachine } from './email.service';

// Rapport quotidien : chaque nuit (00:05), on envoie par email aux super admins
// le récapitulatif des ventes de la VEILLE, ventilé par machine (frigo).
// Fusionne les ventes borne (table `ventes`, montant réellement payé) et les
// achats via l'app (table `achats`, valorisés au prix courant du plat).
//
// Destinataires : variable d'env DAILY_REPORT_TO (emails séparés par des
// virgules) sinon tous les comptes SUPER_ADMIN.

async function reportRecipients(): Promise<string[]> {
  const env = process.env['DAILY_REPORT_TO'];
  if (env) return env.split(',').map((s) => s.trim()).filter(Boolean);
  const admins = await prisma.admin.findMany({
    where: { role: 'SUPER_ADMIN' },
    select: { email: true },
  });
  return admins.map((a) => a.email).filter(Boolean);
}

export async function runDailyReport(): Promise<void> {
  const now = new Date();
  // Jour écoulé = la veille : [minuit hier, minuit aujourd'hui[.
  const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
  const start = new Date(end.getTime() - 24 * 60 * 60 * 1000);

  const [sales, purchases, fridges, dishes] = await Promise.all([
    prisma.sale.findMany({ where: { soldAt: { gte: start, lt: end } } }),
    prisma.purchase.findMany({ where: { purchasedAt: { gte: start, lt: end } } }),
    prisma.fridge.findMany({ select: { id: true, name: true } }),
    prisma.dish.findMany({ select: { id: true, price: true } }),
  ]);

  const fridgeName = new Map(fridges.map((f) => [f.id, f.name]));
  const dishPrice = new Map(dishes.map((d) => [d.id, d.price]));

  const perMachine = new Map<string, { count: number; revenueCents: number }>();
  const add = (frigoId: string, cents: number) => {
    const e = perMachine.get(frigoId) ?? { count: 0, revenueCents: 0 };
    e.count += 1;
    e.revenueCents += cents;
    perMachine.set(frigoId, e);
  };
  for (const s of sales) add(s.frigoId, s.amount); // montant réellement payé (centimes)
  for (const p of purchases) add(p.frigoId, Math.round((dishPrice.get(p.dishId) ?? 0) * 100));

  const machines: DailyReportMachine[] = Array.from(perMachine.entries())
    .map(([frigoId, e]) => ({ name: fridgeName.get(frigoId) ?? frigoId, count: e.count, revenueCents: e.revenueCents }))
    .sort((a, b) => b.revenueCents - a.revenueCents);

  const totalCount = machines.reduce((s, m) => s + m.count, 0);
  const totalRevenueCents = machines.reduce((s, m) => s + m.revenueCents, 0);
  const dateLabel = start.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

  const recipients = await reportRecipients();
  if (recipients.length === 0) {
    logger.warn('Rapport quotidien : aucun destinataire (aucun SUPER_ADMIN ni DAILY_REPORT_TO)');
    return;
  }
  for (const to of recipients) {
    await sendDailyReportEmail(to, { dateLabel, machines, totalCount, totalRevenueCents });
  }
  logger.info({ dateLabel, totalCount, totalRevenueCents, recipients: recipients.length }, 'Rapport quotidien envoyé');
}

/** Planifie l'envoi à 00:05 chaque nuit, puis se reprogramme pour le lendemain. */
export function scheduleDailyReport(): void {
  const schedule = () => {
    const now = new Date();
    const next = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 5, 0, 0);
    const ms = next.getTime() - now.getTime();
    setTimeout(() => {
      runDailyReport().catch((e) => logger.error({ err: e instanceof Error ? e.message : e }, 'Rapport quotidien : échec'));
      schedule();
    }, ms);
    logger.info({ next: next.toISOString() }, 'Rapport quotidien planifié');
  };
  schedule();
}

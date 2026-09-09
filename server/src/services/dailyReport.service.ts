import { prisma } from '../utils/prisma';
import { logger } from '../utils/logger';
import { sendDailyReportEmail, type DailyReportSite } from './email.service';

// Rapport quotidien : chaque nuit à 03:00, on envoie par email aux super admins
// le récap de la journée d'exploitation écoulée — fenêtre [hier 03:00, aujourd'hui
// 03:00[ — ventilé PAR SITE (location du frigo). Pour chaque site : les ventes ET
// les produits à retirer (DLC dépassée) pour la tournée du jour.
// Fusionne les ventes borne (table `ventes`) et les achats via l'app (table `achats`).
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
  // Fenêtre = journée d'exploitation écoulée : [hier 03:00, aujourd'hui 03:00[.
  const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 3, 0, 0, 0);
  const start = new Date(end.getTime() - 24 * 60 * 60 * 1000);
  // Produits à retirer : DLC dépassée ou expirant aujourd'hui (avant demain 00:00).
  const removeBefore = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 0, 0);

  const [sales, purchases, fridges, dishes, stocks] = await Promise.all([
    prisma.sale.findMany({ where: { soldAt: { gte: start, lt: end } } }),
    prisma.purchase.findMany({ where: { purchasedAt: { gte: start, lt: end } } }),
    prisma.fridge.findMany({ select: { id: true, name: true, location: true } }),
    prisma.dish.findMany({ select: { id: true, name: true, price: true } }),
    prisma.fridgeStock.findMany({
      where: { expiryDate: { not: null, lt: removeBefore }, quantity: { gt: 0 } },
      select: { frigoId: true, dishId: true, quantity: true, expiryDate: true },
    }),
  ]);

  const fridge = new Map(fridges.map((f) => [f.id, f]));
  const dish = new Map(dishes.map((d) => [d.id, d]));
  const siteKey = (frigoId: string) => {
    const f = fridge.get(frigoId);
    return (f?.location && f.location.trim()) || f?.name || frigoId;
  };

  const sites = new Map<string, DailyReportSite>();
  const ensureSite = (frigoId: string): DailyReportSite => {
    const key = siteKey(frigoId);
    let s = sites.get(key);
    if (!s) {
      s = { site: key, machines: [], count: 0, revenueCents: 0, toRemove: [] };
      sites.set(key, s);
    }
    const name = fridge.get(frigoId)?.name;
    if (name && !s.machines.includes(name)) s.machines.push(name);
    return s;
  };

  for (const sale of sales) {
    const s = ensureSite(sale.frigoId);
    s.count += 1;
    s.revenueCents += sale.amount;
  }
  for (const p of purchases) {
    const s = ensureSite(p.frigoId);
    s.count += 1;
    s.revenueCents += Math.round((dish.get(p.dishId)?.price ?? 0) * 100);
  }
  for (const st of stocks) {
    const s = ensureSite(st.frigoId);
    s.toRemove.push({
      dishName: dish.get(st.dishId)?.name ?? st.dishId,
      quantity: st.quantity,
      machine: fridge.get(st.frigoId)?.name ?? '',
      expiry: st.expiryDate ? new Date(st.expiryDate).toLocaleDateString('fr-FR') : '',
    });
  }

  const siteList = Array.from(sites.values()).sort((a, b) => b.revenueCents - a.revenueCents);
  const totalCount = siteList.reduce((n, s) => n + s.count, 0);
  const totalRevenueCents = siteList.reduce((n, s) => n + s.revenueCents, 0);
  const totalRemove = siteList.reduce((n, s) => n + s.toRemove.length, 0);
  const dateLabel =
    start.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' }) +
    ' 03:00 → ' +
    end.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' }) +
    ' 03:00';

  const recipients = await reportRecipients();
  if (recipients.length === 0) {
    logger.warn('Rapport quotidien : aucun destinataire (aucun SUPER_ADMIN ni DAILY_REPORT_TO)');
    return;
  }
  for (const to of recipients) {
    await sendDailyReportEmail(to, { dateLabel, sites: siteList, totalCount, totalRevenueCents });
  }
  logger.info({ dateLabel, totalCount, totalRevenueCents, totalRemove, recipients: recipients.length }, 'Rapport quotidien envoyé');
}

/** Planifie l'envoi à 03:00 chaque nuit, puis se reprogramme pour le lendemain. */
export function scheduleDailyReport(): void {
  const schedule = () => {
    const now = new Date();
    const next = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 3, 0, 0, 0);
    if (next <= now) next.setDate(next.getDate() + 1);
    const ms = next.getTime() - now.getTime();
    setTimeout(() => {
      runDailyReport().catch((e) => logger.error({ err: e instanceof Error ? e.message : e }, 'Rapport quotidien : échec'));
      schedule();
    }, ms);
    logger.info({ next: next.toISOString() }, 'Rapport quotidien planifié');
  };
  schedule();
}

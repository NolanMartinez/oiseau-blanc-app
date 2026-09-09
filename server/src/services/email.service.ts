import nodemailer, { type Transporter } from 'nodemailer';
import { logger } from '../utils/logger';

// Service d'envoi d'emails réels via SMTP (ex. boîte OVH du client).
// Configuration par variables d'environnement :
//   SMTP_HOST      ex. ssl0.ovh.net
//   SMTP_PORT      465 (SSL) ou 587 (STARTTLS)
//   SMTP_SECURE    "true" pour le port 465, "false" pour 587
//   SMTP_USER      adresse complète de la boîte (ex. contact@friggo.fr)
//   SMTP_PASS      mot de passe de la boîte
//   SMTP_FROM      expéditeur affiché (ex. "Friggo <contact@friggo.fr>") — défaut = SMTP_USER
// Si la configuration est absente, l'envoi est ignoré (mode dev) avec un avertissement.

let transporter: Transporter | null = null;
let configured = false;

function getTransporter(): Transporter | null {
  if (transporter) return transporter;
  const host = process.env['SMTP_HOST'];
  const user = process.env['SMTP_USER'];
  const pass = process.env['SMTP_PASS'];
  if (!host || !user || !pass) return null;

  const port = parseInt(process.env['SMTP_PORT'] ?? '465', 10);
  const secure = (process.env['SMTP_SECURE'] ?? (port === 465 ? 'true' : 'false')) === 'true';
  transporter = nodemailer.createTransport({ host, port, secure, auth: { user, pass } });
  configured = true;
  return transporter;
}

function fromAddress(): string {
  return process.env['SMTP_FROM'] || process.env['SMTP_USER'] || 'no-reply@friggo.fr';
}

/** Envoi générique. Renvoie true si l'email est parti, false sinon (best-effort). */
export async function sendEmail(opts: { to: string; subject: string; html: string; text?: string }): Promise<boolean> {
  const tx = getTransporter();
  if (!tx) {
    logger.warn({ to: opts.to }, 'SMTP non configuré : email non envoyé (définir SMTP_HOST/USER/PASS)');
    return false;
  }
  try {
    const info = await tx.sendMail({
      from: fromAddress(),
      to: opts.to,
      subject: opts.subject,
      text: opts.text ?? opts.html.replace(/<[^>]+>/g, ' '),
      html: opts.html,
    });
    // On loggue la réponse exacte du serveur (accepté / refusé) pour diagnostiquer.
    logger.info(
      { to: opts.to, accepted: info.accepted, rejected: info.rejected, response: info.response },
      'Email envoyé',
    );
    return (info.accepted?.length ?? 0) > 0;
  } catch (e) {
    logger.error({ err: e instanceof Error ? e.message : e, to: opts.to }, "Échec de l'envoi d'email");
    return false;
  }
}

export function isEmailConfigured(): boolean {
  getTransporter();
  return configured;
}

// Vérifie la connexion SMTP au démarrage → log clair « Email prêt » ou l'erreur exacte.
export function initEmail(): void {
  const tx = getTransporter();
  if (!tx) {
    logger.warn('Email SMTP non configuré (SMTP_HOST/USER/PASS absents) — emails désactivés');
    return;
  }
  tx.verify()
    .then(() => logger.info(`Email SMTP prêt (expéditeur : ${fromAddress()})`))
    .catch((e) => logger.error({ err: e }, 'Email SMTP : échec de connexion (vérifier host/port/identifiants)'));
}

const BRAND = '#319966';

function layout(title: string, body: string): string {
  return `<div style="font-family:Segoe UI,Arial,sans-serif;max-width:520px;margin:0 auto;background:#ffffff;border:1px solid #e5e7eb;border-radius:16px;overflow:hidden">
    <div style="background:${BRAND};padding:20px 28px">
      <span style="font-size:22px;font-weight:800;color:#ffffff;letter-spacing:-0.5px">Frig<span style="color:#a7e3c6">go</span></span>
    </div>
    <div style="padding:28px">
      <h1 style="margin:0 0 14px;font-size:20px;color:#111827">${title}</h1>
      ${body}
    </div>
    <div style="padding:16px 28px;background:#f9fafb;border-top:1px solid #e5e7eb;color:#9ca3af;font-size:12px">
      L'Oiseau Blanc Traiteur — Friggo. Cet email vous est envoyé suite à une action sur l'application.
    </div>
  </div>`;
}

/** Envoie le code de connexion (OTP) à 6 chiffres. */
export async function sendOtpEmail(to: string, code: string): Promise<boolean> {
  const html = layout(
    'Votre code de connexion',
    `<p style="color:#374151;font-size:15px;line-height:1.6">Voici votre code de connexion à Friggo. Il est valable 10 minutes :</p>
     <div style="margin:22px 0;text-align:center">
       <span style="display:inline-block;font-size:34px;font-weight:800;letter-spacing:8px;color:${BRAND};background:#f0f7f3;border:2px solid ${BRAND};border-radius:12px;padding:14px 26px">${code}</span>
     </div>
     <p style="color:#9ca3af;font-size:13px;line-height:1.6">Si vous n'êtes pas à l'origine de cette demande, ignorez cet email.</p>`,
  );
  return sendEmail({ to, subject: `Votre code Friggo : ${code}`, html, text: `Votre code de connexion Friggo : ${code} (valable 10 minutes).` });
}

/** Email de notification (promo, nouveau plat, message de l'admin…). */
export async function sendNotificationEmail(
  to: string,
  payload: { title: string; body: string; url?: string; imageUrls?: string[] },
): Promise<boolean> {
  const appUrl = (process.env['APP_URL'] || 'https://app.friggo.fr').replace(/\/$/, '');
  const link = payload.url
    ? (payload.url.startsWith('http') ? payload.url : appUrl + payload.url)
    : appUrl;

  // Galerie de photos (plats concernés). 1 photo = bandeau ; plusieurs = vignettes.
  const imgs = (payload.imageUrls ?? []).filter(Boolean);
  let gallery = '';
  if (imgs.length === 1) {
    gallery = `<div style="margin:4px 0 18px">
      <img src="${imgs[0]}" alt="" width="100%" style="width:100%;max-height:240px;object-fit:cover;border-radius:12px;display:block" />
    </div>`;
  } else if (imgs.length > 1) {
    const cells = imgs.slice(0, 6).map((u) =>
      `<td style="padding:4px" valign="top"><img src="${u}" alt="" width="150" style="width:100%;max-width:160px;height:110px;object-fit:cover;border-radius:10px;display:block" /></td>`,
    );
    // 2 vignettes par ligne pour rester lisible sur mobile.
    const rows: string[] = [];
    for (let i = 0; i < cells.length; i += 2) {
      rows.push(`<tr>${cells[i]}${cells[i + 1] ?? '<td></td>'}</tr>`);
    }
    gallery = `<table style="width:100%;border-collapse:collapse;margin:4px 0 18px">${rows.join('')}</table>`;
  }

  const html = layout(
    payload.title,
    `<p style="color:#374151;font-size:15px;line-height:1.6;margin:0 0 16px">${payload.body}</p>
     ${gallery}
     <div style="margin:6px 0 4px">
       <a href="${link}" style="display:inline-block;background:${BRAND};color:#ffffff;text-decoration:none;font-weight:700;font-size:15px;padding:12px 24px;border-radius:10px">Voir sur Friggo</a>
     </div>`,
  );
  return sendEmail({ to, subject: payload.title, html, text: `${payload.body} — ${link}` });
}

export interface ReceiptItem {
  name: string;
  amountCents: number; // prix TTC payé, en centimes
}
export interface ReceiptCompany {
  name: string;
  address: string;
  siret: string;
  tvaNumber: string;
  tvaRate: number; // %
}

const eur = (cents: number) => (cents / 100).toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €';

/** Envoie un justificatif d'achat (ticket) avec HT / TVA / TTC et les coordonnées de l'entreprise. */
export async function sendReceiptEmail(
  to: string,
  data: { company: ReceiptCompany; items: ReceiptItem[]; soldAt: Date; fridgeName?: string },
): Promise<boolean> {
  const { company, items, soldAt } = data;
  const rate = company.tvaRate || 0;
  const totalTTC = items.reduce((s, i) => s + i.amountCents, 0);
  const totalHT = Math.round(totalTTC / (1 + rate / 100));
  const totalTVA = totalTTC - totalHT;

  const dateStr = soldAt.toLocaleString('fr-FR', { dateStyle: 'long', timeStyle: 'short' });

  const rows = items
    .map((i) => {
      const ht = Math.round(i.amountCents / (1 + rate / 100));
      return `<tr>
        <td style="padding:8px 6px;border-bottom:1px solid #eee">${i.name}</td>
        <td style="padding:8px 6px;border-bottom:1px solid #eee;text-align:right">${eur(ht)}</td>
        <td style="padding:8px 6px;border-bottom:1px solid #eee;text-align:right;font-weight:600">${eur(i.amountCents)}</td>
      </tr>`;
    })
    .join('');

  const body = `
    <div style="color:#374151;font-size:13px;line-height:1.5;margin-bottom:14px">
      <div style="font-weight:800;color:#111827;font-size:15px">${company.name}</div>
      ${company.address ? `<div>${company.address}</div>` : ''}
      ${company.siret ? `<div>SIRET : ${company.siret}</div>` : ''}
      ${company.tvaNumber ? `<div>TVA : ${company.tvaNumber}</div>` : ''}
    </div>
    <p style="color:#6b7280;font-size:13px;margin:0 0 4px">${dateStr}${data.fridgeName ? ` — ${data.fridgeName}` : ''}</p>
    <table style="width:100%;border-collapse:collapse;font-size:13px;margin-top:10px">
      <thead>
        <tr style="color:#9ca3af;font-size:11px;text-transform:uppercase">
          <th style="text-align:left;padding:6px">Article</th>
          <th style="text-align:right;padding:6px">HT</th>
          <th style="text-align:right;padding:6px">TTC</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
    <table style="width:100%;font-size:13px;margin-top:14px">
      <tr><td style="padding:3px 6px;color:#6b7280">Total HT</td><td style="padding:3px 6px;text-align:right">${eur(totalHT)}</td></tr>
      <tr><td style="padding:3px 6px;color:#6b7280">TVA (${rate}%)</td><td style="padding:3px 6px;text-align:right">${eur(totalTVA)}</td></tr>
      <tr><td style="padding:8px 6px;font-weight:800;color:#111827;border-top:2px solid ${BRAND}">Total TTC</td><td style="padding:8px 6px;text-align:right;font-weight:800;color:${BRAND};border-top:2px solid ${BRAND}">${eur(totalTTC)}</td></tr>
    </table>`;

  const html = layout('Votre justificatif d\'achat', body);
  return sendEmail({ to, subject: `Votre reçu ${company.name} — ${eur(totalTTC)}`, html });
}

export interface DailyReportSite {
  site: string;
  machines: string[];
  count: number;
  revenueCents: number;
  toRemove: { dishName: string; quantity: number; machine: string; expiry: string }[];
}

/** Rapport quotidien par site : ventes + produits à retirer (tournée du jour). */
export async function sendDailyReportEmail(
  to: string,
  data: { dateLabel: string; sites: DailyReportSite[]; totalCount: number; totalRevenueCents: number },
): Promise<boolean> {
  const siteBlocks = data.sites.length
    ? data.sites
        .map((s) => {
          const machinesLbl = s.machines.length > 1 ? ` · ${s.machines.length} machines` : '';
          const removeRows = s.toRemove.length
            ? s.toRemove
                .map((r) => `<tr>
                  <td style="padding:5px 6px;border-bottom:1px solid #f3f4f6">${r.dishName}</td>
                  <td style="padding:5px 6px;border-bottom:1px solid #f3f4f6;text-align:center">${r.quantity}</td>
                  <td style="padding:5px 6px;border-bottom:1px solid #f3f4f6;color:#9ca3af">${r.expiry}${r.machine ? ' · ' + r.machine : ''}</td>
                </tr>`)
                .join('')
            : '';
          const removeTable = s.toRemove.length
            ? `<p style="margin:10px 0 4px;font-size:12px;font-weight:700;color:#b91c1c">À retirer (${s.toRemove.length})</p>
               <table style="width:100%;border-collapse:collapse;font-size:12px">
                 <thead><tr style="color:#9ca3af;font-size:10px;text-transform:uppercase">
                   <th style="text-align:left;padding:4px 6px">Produit</th>
                   <th style="text-align:center;padding:4px 6px">Qté</th>
                   <th style="text-align:left;padding:4px 6px">DLC / machine</th>
                 </tr></thead><tbody>${removeRows}</tbody>
               </table>`
            : `<p style="margin:8px 0 0;font-size:12px;color:#9ca3af">Rien à retirer.</p>`;
          return `
            <div style="margin:0 0 18px;padding:14px;border:1px solid #e5e7eb;border-radius:12px">
              <div style="display:flex;justify-content:space-between;align-items:baseline">
                <span style="font-size:15px;font-weight:800;color:#111827">${s.site}<span style="font-size:11px;color:#9ca3af;font-weight:500">${machinesLbl}</span></span>
                <span style="font-size:13px;color:${BRAND};font-weight:700">${s.count} vente${s.count > 1 ? 's' : ''} · ${eur(s.revenueCents)}</span>
              </div>
              ${removeTable}
            </div>`;
        })
        .join('')
    : `<p style="color:#9ca3af;text-align:center;padding:16px">Aucune activité sur cette période.</p>`;

  const body = `
    <p style="color:#6b7280;font-size:13px;margin:0 0 14px">Période : ${data.dateLabel}</p>
    ${siteBlocks}
    <table style="width:100%;font-size:14px;margin-top:6px">
      <tr>
        <td style="padding:8px 6px;font-weight:800;color:#111827;border-top:2px solid ${BRAND}">Total — ${data.totalCount} vente${data.totalCount > 1 ? 's' : ''}</td>
        <td style="padding:8px 6px;text-align:right;font-weight:800;color:${BRAND};border-top:2px solid ${BRAND}">${eur(data.totalRevenueCents)}</td>
      </tr>
    </table>`;

  const html = layout('Rapport quotidien — tournée du jour', body);
  return sendEmail({
    to,
    subject: `Friggo — rapport du jour : ${eur(data.totalRevenueCents)} (${data.totalCount} ventes)`,
    html,
  });
}

/** Email de bienvenue à l'inscription (avec le code fidélité). */
export async function sendWelcomeEmail(to: string, loyaltyCode?: string | null): Promise<boolean> {
  const loyalty = loyaltyCode
    ? `<p style="color:#374151;font-size:15px;line-height:1.6">Votre <b>code fidélité</b> à saisir sur la borne à chaque achat :</p>
       <div style="margin:16px 0;text-align:center">
         <span style="display:inline-block;font-size:28px;font-weight:800;letter-spacing:6px;color:${BRAND};background:#f0f7f3;border:2px solid ${BRAND};border-radius:12px;padding:12px 22px">${loyaltyCode}</span>
       </div>`
    : '';
  const html = layout(
    'Bienvenue sur Friggo 🎉',
    `<p style="color:#374151;font-size:15px;line-height:1.6">Votre compte est créé. Retrouvez la carte de votre frigo, déposez des avis et cumulez des points de fidélité.</p>${loyalty}`,
  );
  return sendEmail({ to, subject: 'Bienvenue sur Friggo', html });
}

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
    await tx.sendMail({
      from: fromAddress(),
      to: opts.to,
      subject: opts.subject,
      text: opts.text ?? opts.html.replace(/<[^>]+>/g, ' '),
      html: opts.html,
    });
    return true;
  } catch (e) {
    logger.error({ err: e, to: opts.to }, "Échec de l'envoi d'email");
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
  payload: { title: string; body: string; url?: string },
): Promise<boolean> {
  const appUrl = (process.env['APP_URL'] || 'https://app.friggo.fr').replace(/\/$/, '');
  const link = payload.url
    ? (payload.url.startsWith('http') ? payload.url : appUrl + payload.url)
    : appUrl;
  const html = layout(
    payload.title,
    `<p style="color:#374151;font-size:15px;line-height:1.6">${payload.body}</p>
     <div style="margin:22px 0">
       <a href="${link}" style="display:inline-block;background:${BRAND};color:#ffffff;text-decoration:none;font-weight:700;font-size:15px;padding:12px 24px;border-radius:10px">Voir sur Friggo</a>
     </div>`,
  );
  return sendEmail({ to, subject: payload.title, html, text: `${payload.body} — ${link}` });
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

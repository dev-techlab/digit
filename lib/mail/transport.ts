import nodemailer, { type Transporter } from 'nodemailer';

/**
 * Nodemailer SMTP transport, configured from env. When SMTP_HOST is unset the
 * transport falls back to `jsonTransport` — messages are serialised instead of
 * sent, so dev/CI work without credentials (deliver() logs a notice).
 */
const globalForMail = globalThis as unknown as { mailTransport?: Transporter };

export function isSmtpConfigured(): boolean {
  return !!process.env.SMTP_HOST;
}

export function getTransport(): Transporter {
  if (globalForMail.mailTransport) return globalForMail.mailTransport;

  if (!isSmtpConfigured()) {
    globalForMail.mailTransport = nodemailer.createTransport({ jsonTransport: true });
    return globalForMail.mailTransport;
  }

  const user = process.env.SMTP_USER;
  globalForMail.mailTransport = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT ?? 587),
    // Implicit TLS only on 465; 587 upgrades via STARTTLS (secure=false).
    secure: process.env.SMTP_SECURE === 'true',
    auth: user ? { user, pass: process.env.SMTP_PASS } : undefined,
  });
  return globalForMail.mailTransport;
}

export const MAIL_FROM = process.env.MAIL_FROM || 'Digit Link <no-reply@digitlink.mobi>';
export const MAIL_ADMIN = process.env.MAIL_ADMIN || 'admin@digitlink.mobi';

import { getTransport, isSmtpConfigured, MAIL_FROM, MAIL_ADMIN } from './transport';
import { renderEmail } from './templates';
import type { MailPayload } from './types';

/**
 * Render a mail payload and hand it to the SMTP transport. Called by the
 * `email.send` job handler (see lib/jobs) and, synchronously, by sendEmailNow().
 * Deliberately does NOT import lib/jobs, to keep the jobs↔mail graph acyclic.
 */
export async function deliver(payload: MailPayload): Promise<{ messageId?: string }> {
  const to = payload.template === 'admin-alert' ? (payload.to ?? MAIL_ADMIN) : payload.to;
  if (!to) throw new Error(`mail: no recipient for template "${payload.template}"`);

  const { subject, html, text } = renderEmail(payload);
  const info = await getTransport().sendMail({ from: MAIL_FROM, to, subject, html, text });

  if (!isSmtpConfigured()) {
    // Dev fallback (jsonTransport): nothing was actually sent.
    console.log(`[mail] SMTP not configured — logged instead of sent → ${to} :: ${subject}`);
  }
  return { messageId: (info as { messageId?: string }).messageId };
}

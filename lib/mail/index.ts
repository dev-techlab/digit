import { enqueue } from '@/lib/jobs';
import { deliver } from './deliver';
import type {
  MailPayload,
  AdminInvitePayload,
  TicketReplyPayload,
  EmailVerificationPayload,
  AdminAlertPayload,
} from './types';

export type {
  MailPayload,
  AdminInvitePayload,
  TicketReplyPayload,
  EmailVerificationPayload,
  AdminAlertPayload,
  RenderedEmail,
} from './types';
export { renderEmail } from './templates';
export { isSmtpConfigured } from './transport';

/** Send immediately (bypasses the queue). Use in scripts/tests or when no worker runs. */
export { deliver as sendEmailNow } from './deliver';

/**
 * Queue an email for async delivery via the `email.send` pg-boss job.
 * Requires DATABASE_URL and a running worker (scripts/worker.ts).
 */
export async function sendEmail(payload: MailPayload): Promise<void> {
  await enqueue('email.send', payload);
}

// --- Per-flow helpers: the one call each future flow makes -------------------

/** Admin invitation — call after creating an `admin_invitations` row. */
export function sendAdminInvite(args: Omit<AdminInvitePayload, 'template'>) {
  return sendEmail({ template: 'admin-invite', ...args });
}

/** Support-ticket reply — call after an admin answers a `support_tickets` row. */
export function sendTicketReply(args: Omit<TicketReplyPayload, 'template'>) {
  return sendEmail({ template: 'ticket-reply', ...args });
}

/** Email verification — call when a user binds/changes their email. */
export function sendEmailVerification(args: Omit<EmailVerificationPayload, 'template'>) {
  return sendEmail({ template: 'verify-email', ...args });
}

/** Admin alert (new withdrawal, KYC submitted, …). Defaults to MAIL_ADMIN. */
export function sendAdminAlert(args: Omit<AdminAlertPayload, 'template'>) {
  return sendEmail({ template: 'admin-alert', ...args });
}

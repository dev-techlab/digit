/**
 * Transactional email payloads. Each is a plain JSON object so it can be
 * enqueued as `email.send` job data (see lib/jobs) and rendered by the worker.
 */

export interface AdminInvitePayload {
  template: 'admin-invite';
  to: string;
  /** Absolute URL the invitee opens to accept and set a password. */
  inviteUrl: string;
  invitedByName?: string;
  role?: string;
  /** Human-readable expiry, e.g. "in 48 hours" or an ISO date. */
  expiresAt?: string;
}

export interface TicketReplyPayload {
  template: 'ticket-reply';
  to: string;
  username?: string;
  /** Short reference shown to the user, e.g. the ticket id. */
  ticketRef: string;
  ticketSubject: string;
  reply: string;
}

export interface EmailVerificationPayload {
  template: 'verify-email';
  to: string;
  username?: string;
  /** Absolute URL that confirms the address when opened. */
  verifyUrl: string;
  /** Optional short code shown alongside the link. */
  code?: string;
  expiresMinutes?: number;
}

export interface AdminAlertPayload {
  template: 'admin-alert';
  /** Defaults to MAIL_ADMIN when omitted. */
  to?: string;
  title: string;
  message: string;
  actionUrl?: string;
  actionLabel?: string;
}

export type MailPayload =
  AdminInvitePayload | TicketReplyPayload | EmailVerificationPayload | AdminAlertPayload;

export interface RenderedEmail {
  subject: string;
  html: string;
  text: string;
}

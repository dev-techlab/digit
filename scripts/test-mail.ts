/**
 * Smoke-test the mail module end to end (render → transport) using the dev
 * jsonTransport fallback. No SMTP creds or network needed.
 *   pnpm test:mail
 */
import './load-env';
import { writeFileSync } from 'node:fs';
import { sendEmailNow, renderEmail, isSmtpConfigured, type MailPayload } from '@/lib/mail';

const samples: MailPayload[] = [
  {
    template: 'admin-invite',
    to: 'newadmin@example.com',
    inviteUrl: 'https://digitlink.mobi/admin/accept?token=abc123',
    invitedByName: 'Super Admin',
    role: 'finance',
    expiresAt: 'in 48 hours',
  },
  {
    template: 'ticket-reply',
    to: 'player@example.com',
    username: 'player_2481',
    ticketRef: 'T-1042',
    ticketSubject: 'Withdrawal not received',
    reply: 'Hi,\n\nYour redemption was approved and sent.\nIt should arrive within 24 hours.',
  },
  {
    template: 'verify-email',
    to: 'player@example.com',
    username: 'player_2481',
    verifyUrl: 'https://digitlink.mobi/verify-email?token=xyz',
    code: '482913',
    expiresMinutes: 30,
  },
  {
    template: 'admin-alert',
    title: 'New withdrawal pending review',
    message: 'player_2481 requested a $45.25 PYUSD withdrawal.',
    actionUrl: 'https://digitlink.mobi/admin/withdrawals/999',
    actionLabel: 'Review withdrawal',
  },
];

async function main() {
  console.log('SMTP configured:', isSmtpConfigured(), '(false ⇒ jsonTransport, nothing sent)\n');
  for (const s of samples) {
    const { subject } = renderEmail(s);
    const res = await sendEmailNow(s);
    console.log(
      `✓ ${s.template.padEnd(13)} → messageId=${res.messageId ?? '(none)'}  subject="${subject}"`
    );
  }
  writeFileSync('/tmp/mail-preview.html', renderEmail(samples[0]).html);
  console.log('\nWrote admin-invite HTML preview to /tmp/mail-preview.html');
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });

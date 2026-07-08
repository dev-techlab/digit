import type { MailPayload, RenderedEmail } from './types';
import { APP_NAME } from '@/lib/constants';

const BRAND = '#2563eb';
const BG = '#03182a';
const CARD = '#0d2a45';

/** Escape user-supplied text before interpolating into HTML. */
function esc(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function paragraphs(text: string): string {
  return esc(text)
    .split(/\n{2,}/)
    .map((p) => `<p style="margin:0 0 14px;line-height:1.6">${p.replace(/\n/g, '<br>')}</p>`)
    .join('');
}

function button(url: string, label: string): string {
  return `<a href="${esc(url)}" style="display:inline-block;background:${BRAND};color:#fff;text-decoration:none;font-weight:600;padding:12px 24px;border-radius:9999px;margin:6px 0">${esc(label)}</a>`;
}

function layout(bodyHtml: string): string {
  return `<!doctype html><html><body style="margin:0;padding:0;background:${BG};color:#e8f5ee;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif">
  <div style="max-width:520px;margin:0 auto;padding:32px 20px">
    <div style="text-align:center;margin-bottom:20px">
      <span style="font-weight:800;letter-spacing:.08em;text-transform:uppercase;color:#fff;font-size:18px">${APP_NAME}</span>
    </div>
    <div style="background:${CARD};border:1px solid rgba(255,255,255,.08);border-radius:16px;padding:28px">
      ${bodyHtml}
    </div>
    <p style="text-align:center;color:rgba(232,245,238,.5);font-size:12px;margin-top:20px;line-height:1.5">
      ${APP_NAME} · This is an automated message.<br>If you didn't expect this email you can safely ignore it.
    </p>
  </div>
</body></html>`;
}

export function renderEmail(p: MailPayload): RenderedEmail {
  switch (p.template) {
    case 'admin-invite': {
      const who = p.invitedByName ? `${p.invitedByName} invited you` : 'You have been invited';
      const role = p.role ? ` as <b>${esc(p.role)}</b>` : '';
      const expiry = p.expiresAt
        ? `<p style="color:rgba(232,245,238,.6);font-size:13px">This invitation expires ${esc(p.expiresAt)}.</p>`
        : '';
      return {
        subject: `You have been invited to the ${APP_NAME} admin panel`,
        html: layout(
          `<h1 style="margin:0 0 16px;font-size:20px;color:#fff">Admin invitation</h1>
           <p style="margin:0 0 16px;line-height:1.6">${who} to join the ${APP_NAME} admin panel${role}. Click below to accept and set your password.</p>
           <div style="text-align:center;margin:22px 0">${button(p.inviteUrl, 'Accept invitation')}</div>
           ${expiry}
           <p style="color:rgba(232,245,238,.6);font-size:13px;word-break:break-all">Or paste this link into your browser:<br>${esc(p.inviteUrl)}</p>`
        ),
        text: `${who} to join the ${APP_NAME} admin panel${p.role ? ` as ${p.role}` : ''}.\n\nAccept: ${p.inviteUrl}\n${p.expiresAt ? `\nThis invitation expires ${p.expiresAt}.` : ''}`,
      };
    }

    case 'ticket-reply': {
      const hi = p.username ? `Hi ${esc(p.username)},` : 'Hello,';
      return {
        subject: `Re: ${p.ticketSubject} [#${p.ticketRef}]`,
        html: layout(
          `<h1 style="margin:0 0 16px;font-size:20px;color:#fff">Support reply</h1>
           <p style="margin:0 0 12px">${hi}</p>
           <p style="margin:0 0 12px;line-height:1.6">Our team replied to your ticket <b>#${esc(p.ticketRef)}</b> — “${esc(p.ticketSubject)}”:</p>
           <div style="background:rgba(255,255,255,.04);border-left:3px solid ${BRAND};border-radius:8px;padding:14px 16px;margin:12px 0">${paragraphs(p.reply)}</div>
           <p style="color:rgba(232,245,238,.6);font-size:13px">Reply to this email or open the Help Center to continue the conversation.</p>`
        ),
        text: `${p.username ? `Hi ${p.username},` : 'Hello,'}\n\nOur team replied to your ticket #${p.ticketRef} — "${p.ticketSubject}":\n\n${p.reply}\n\nReply to this email to continue the conversation.`,
      };
    }

    case 'verify-email': {
      const hi = p.username ? `Hi ${esc(p.username)},` : 'Hello,';
      const codeBlock = p.code
        ? `<p style="margin:0 0 12px">Your verification code is:</p>
           <p style="font-size:26px;font-weight:800;letter-spacing:.2em;color:${BRAND};margin:0 0 16px">${esc(p.code)}</p>`
        : '';
      const expiry = p.expiresMinutes
        ? `<p style="color:rgba(232,245,238,.6);font-size:13px">This link expires in ${p.expiresMinutes} minutes.</p>`
        : '';
      return {
        subject: `Verify your ${APP_NAME} email`,
        html: layout(
          `<h1 style="margin:0 0 16px;font-size:20px;color:#fff">Confirm your email</h1>
           <p style="margin:0 0 16px">${hi}</p>
           ${codeBlock}
           <p style="margin:0 0 16px;line-height:1.6">Confirm this email address to finish binding it to your account.</p>
           <div style="text-align:center;margin:22px 0">${button(p.verifyUrl, 'Verify email')}</div>
           ${expiry}
           <p style="color:rgba(232,245,238,.6);font-size:13px;word-break:break-all">Or paste this link:<br>${esc(p.verifyUrl)}</p>`
        ),
        text: `${p.username ? `Hi ${p.username},` : 'Hello,'}\n\n${p.code ? `Verification code: ${p.code}\n\n` : ''}Verify your email: ${p.verifyUrl}\n${p.expiresMinutes ? `\nThis link expires in ${p.expiresMinutes} minutes.` : ''}`,
      };
    }

    case 'admin-alert': {
      const action = p.actionUrl
        ? `<div style="text-align:center;margin:22px 0">${button(p.actionUrl, p.actionLabel || 'Open admin panel')}</div>`
        : '';
      return {
        subject: `[${APP_NAME}] ${p.title}`,
        html: layout(
          `<h1 style="margin:0 0 16px;font-size:20px;color:#fff">${esc(p.title)}</h1>
           ${paragraphs(p.message)}
           ${action}`
        ),
        text: `${p.title}\n\n${p.message}${p.actionUrl ? `\n\n${p.actionLabel || 'Open'}: ${p.actionUrl}` : ''}`,
      };
    }
  }
}

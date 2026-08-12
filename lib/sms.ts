import twilio from 'twilio';
import { env } from '@/lib/env';

// Use environment variables for Twilio credentials
// They should be added to .env by the user
const accountSid = env.TWILIO_ACCOUNT_SID;
const authToken = env.TWILIO_AUTH_TOKEN;
const twilioNumber = env.TWILIO_PHONE_NUMBER;

const client = accountSid && authToken ? twilio(accountSid, authToken) : null;

if (env.NODE_ENV === 'production' && !client) {
  console.warn(
    '[sms] Twilio credentials are not set in production. SMS will not be sent.'
  );
}

export async function sendSms(to: string, body: string): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!client || !twilioNumber) {
    console.warn(`[sms] Would send SMS to ${to}: ${body}`);
    return { ok: true }; // Mock success in dev if no credentials
  }

  try {
    await client.messages.create({
      body,
      from: twilioNumber,
      to,
    });
    return { ok: true };
  } catch (error: any) {
    console.error('[sms] Failed to send SMS:', error);
    let errMsg = 'Failed to send SMS';
    if (error?.code === 21408) {
      errMsg = 'SMS not enabled for this region in Twilio Geo Permissions.';
    } else if (error?.message) {
      errMsg = error.message;
    }
    return { ok: false, error: errMsg };
  }
}

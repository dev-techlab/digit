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

export async function sendSms(to: string, body: string): Promise<boolean> {
  if (!client || !twilioNumber) {
    console.warn(`[sms] Would send SMS to ${to}: ${body}`);
    return true; // Mock success in dev if no credentials
  }

  try {
    await client.messages.create({
      body,
      from: twilioNumber,
      to,
    });
    return true;
  } catch (error) {
    console.error('[sms] Failed to send SMS:', error);
    return false;
  }
}

/**
 * Smoke-test the mail module end to end (render -> transport) using the dev
 * jsonTransport fallback. No SMTP creds or network needed.
 *   pnpm test:mail
 */
import "./load-env";
import { writeFileSync } from "node:fs";
import { sendEmailNow, renderEmail, isSmtpConfigured, type MailPayload } from "@/lib/mail";

const samples: MailPayload[] = [
  {
    template: "otp-email",
    to: "player@example.com",
    purpose: "register",
    code: "123456",
    expiresMinutes: 5,
  },
  {
    template: "otp-email",
    to: "player@example.com",
    purpose: "reset_password",
    code: "654321",
    expiresMinutes: 5,
  },
];

async function main() {
  // console.log("SMTP configured:", isSmtpConfigured(), "(false => jsonTransport, nothing sent)\n");
  for (const s of samples) {
    const { subject } = renderEmail(s);
    const res = await sendEmailNow(s);
    // Rate limit for testing services like MailTrap (max 1 or 2 per second)
    await new Promise((r) => setTimeout(r, 1500));
  }
  writeFileSync("/tmp/mail-preview.html", renderEmail(samples[0]).html);
  // console.log("\nWrote OTP HTML preview to /tmp/mail-preview.html");
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });


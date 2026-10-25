import "server-only";
import nodemailer from "nodemailer";

// SMTP is optional: without it, emails are logged instead of sent (handy in development).
const transport =
  process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASSWORD
    ? nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: Number(process.env.SMTP_PORT ?? 465),
        secure: Number(process.env.SMTP_PORT ?? 465) === 465,
        auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD },
      })
    : null;

export const mailConfigured = () => transport !== null;

export async function sendMail(to: string, subject: string, text: string) {
  if (!transport) {
    console.info(`[mail disabled] To: ${to} | ${subject}\n${text}`);
    return;
  }
  await transport.sendMail({ from: process.env.SMTP_FROM ?? `Relay <${process.env.SMTP_USER}>`, to, subject, text });
}

import { Resend } from "resend";
import {
  buildReminderEmailHtml,
  buildReminderEmailPlainText,
} from "@/lib/reminder-email-html";

export async function sendReminderEmail(
  to: string,
  clientName: string,
  appointmentAtIso: string,
  confirmationToken: string,
  baseUrl: string
) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM_EMAIL;
  if (!apiKey || !from) {
    throw new Error("Missing RESEND_API_KEY or RESEND_FROM_EMAIL");
  }

  const html = buildReminderEmailHtml(
    clientName,
    appointmentAtIso,
    confirmationToken,
    baseUrl
  );
  const text = buildReminderEmailPlainText(
    clientName,
    appointmentAtIso,
    confirmationToken,
    baseUrl
  );

  const resend = new Resend(apiKey);
  const { error } = await resend.emails.send({
    from,
    to,
    subject: `Appointment reminder — ${clientName}`,
    html,
    text,
  });

  if (error) {
    throw new Error(error.message);
  }
}

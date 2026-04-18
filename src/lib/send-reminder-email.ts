import { Resend } from "resend";
import { reminderEmailBody } from "@/lib/reminder-copy";

export async function sendReminderEmail(
  to: string,
  clientName: string,
  appointmentAtIso: string
) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM_EMAIL;
  if (!apiKey || !from) {
    throw new Error("Missing RESEND_API_KEY or RESEND_FROM_EMAIL");
  }

  const resend = new Resend(apiKey);
  const text = reminderEmailBody(clientName, appointmentAtIso);
  const { error } = await resend.emails.send({
    from,
    to,
    subject: `Appointment reminder — ${clientName}`,
    text,
  });

  if (error) {
    throw new Error(error.message);
  }
}

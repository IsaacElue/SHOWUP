import { Resend } from "resend";
import {
  buildBookingConfirmationEmailHtml,
  buildBookingConfirmationEmailPlainText,
  buildOwnerRescheduleNotificationHtml,
  buildOwnerRescheduleNotificationPlainText,
  buildRescheduleDeclinedClientHtml,
  buildRescheduleDeclinedClientPlainText,
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

const DEFAULT_BOOKING_FROM = "reminders@showupapp.org";

export async function sendBookingConfirmationEmail(
  to: string,
  clientName: string,
  appointmentAtIso: string,
  confirmationToken: string,
  baseUrl: string
) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM_EMAIL ?? DEFAULT_BOOKING_FROM;
  if (!apiKey) {
    throw new Error("Missing RESEND_API_KEY");
  }

  const html = buildBookingConfirmationEmailHtml(
    clientName,
    appointmentAtIso,
    confirmationToken,
    baseUrl
  );
  const text = buildBookingConfirmationEmailPlainText(
    clientName,
    appointmentAtIso,
    confirmationToken,
    baseUrl
  );

  const resend = new Resend(apiKey);
  const { error } = await resend.emails.send({
    from,
    to,
    subject: "Your appointment is booked — ShowUp",
    html,
    text,
  });

  if (error) {
    throw new Error(error.message);
  }
}

export async function sendOwnerRescheduleNotificationEmail(
  to: string,
  clientName: string,
  newWhenLabel: string,
  acceptUrl: string,
  declineUrl: string
) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM_EMAIL;
  if (!apiKey || !from) {
    throw new Error("Missing RESEND_API_KEY or RESEND_FROM_EMAIL");
  }

  const html = buildOwnerRescheduleNotificationHtml(
    clientName,
    newWhenLabel,
    acceptUrl,
    declineUrl
  );
  const text = buildOwnerRescheduleNotificationPlainText(
    clientName,
    newWhenLabel,
    acceptUrl,
    declineUrl
  );

  const resend = new Resend(apiKey);
  const { error } = await resend.emails.send({
    from,
    to,
    subject: `Reschedule request — ${clientName}`,
    html,
    text,
  });

  if (error) {
    throw new Error(error.message);
  }
}

export async function sendRescheduleDeclinedClientEmail(to: string, clientName: string) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM_EMAIL ?? DEFAULT_BOOKING_FROM;
  if (!apiKey) {
    throw new Error("Missing RESEND_API_KEY");
  }

  const html = buildRescheduleDeclinedClientHtml(clientName);
  const text = buildRescheduleDeclinedClientPlainText(clientName);

  const resend = new Resend(apiKey);
  const { error } = await resend.emails.send({
    from,
    to,
    subject: "Your appointment — ShowUp",
    html,
    text,
  });

  if (error) {
    throw new Error(error.message);
  }
}

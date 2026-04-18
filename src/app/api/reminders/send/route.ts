import { supabaseAdmin } from "@/lib/supabase-admin";
import { getPublicBaseUrl } from "@/lib/public-base-url";
import { reminderMessage } from "@/lib/reminder-copy";
import { sendReminderEmail } from "@/lib/send-reminder-email";

type ReminderKind = "24h" | "2h";

type AppointmentRow = {
  id: string;
  client_name: string;
  client_phone: string;
  client_email: string | null;
  confirmation_token: string;
  appointment_at: string;
  reminder_24h_sent: boolean;
  reminder_2h_sent: boolean;
  reminder_24h_email_sent: boolean;
  reminder_2h_email_sent: boolean;
};

function getReminderKind(appointmentAtIso: string): ReminderKind | null {
  const appointmentTime = new Date(appointmentAtIso).getTime();
  const nowTime = Date.now();
  const minutesUntil = (appointmentTime - nowTime) / (1000 * 60);

  // 24h window: 23h–25h before; 2h window: 1h30m–2h30m before
  if (minutesUntil >= 23 * 60 && minutesUntil <= 25 * 60) return "24h";
  if (minutesUntil >= 90 && minutesUntil <= 150) return "2h";

  return null;
}

async function sendTwilioSms(to: string, body: string) {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const messagingServiceSid = process.env.TWILIO_MESSAGING_SERVICE_SID;
  const fromNumber = process.env.TWILIO_PHONE_NUMBER;

  if (!accountSid || !authToken) {
    throw new Error("Missing Twilio account credentials.");
  }

  if (!messagingServiceSid && !fromNumber) {
    throw new Error(
      "Set TWILIO_MESSAGING_SERVICE_SID (recommended) or TWILIO_PHONE_NUMBER."
    );
  }

  const params = new URLSearchParams();
  params.set("To", to);
  params.set("Body", body);

  if (messagingServiceSid) {
    params.set("MessagingServiceSid", messagingServiceSid);
  } else if (fromNumber) {
    params.set("From", fromNumber);
  }

  const auth = Buffer.from(`${accountSid}:${authToken}`).toString("base64");
  const response = await fetch(
    `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
    {
      method: "POST",
      headers: {
        Authorization: `Basic ${auth}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: params.toString(),
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Twilio send failed: ${errorText}`);
  }
}

function isAuthorized(req: Request) {
  const authHeader = req.headers.get("authorization");
  const bearerToken = authHeader?.startsWith("Bearer ")
    ? authHeader.slice("Bearer ".length)
    : null;

  const cronSecret = process.env.CRON_SECRET;
  const localSecret = process.env.REMINDER_CRON_SECRET;
  const legacyHeaderSecret = req.headers.get("x-reminder-secret");

  if (cronSecret && bearerToken === cronSecret) return true;
  if (localSecret && legacyHeaderSecret === localSecret) return true;

  return false;
}

export async function POST(req: Request) {
  if (!isAuthorized(req)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!supabaseAdmin) {
    return Response.json({ error: "Server not configured" }, { status: 500 });
  }

  const { data, error } = await supabaseAdmin
    .from("appointments")
    .select(
      "id, client_name, client_phone, client_email, confirmation_token, appointment_at, reminder_24h_sent, reminder_2h_sent, reminder_24h_email_sent, reminder_2h_email_sent, status"
    )
    .eq("status", "no_response");

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  const appointments = (data ?? []) as (AppointmentRow & { status: string })[];
  let sent24h = 0;
  let sent2h = 0;
  let emailed24h = 0;
  let emailed2h = 0;
  const emailErrors: { appointmentId: string; message: string }[] = [];

  for (const appt of appointments) {
    const kind = getReminderKind(appt.appointment_at);
    if (!kind) continue;

    const smsNeeded =
      (kind === "24h" && !appt.reminder_24h_sent) ||
      (kind === "2h" && !appt.reminder_2h_sent);

    if (smsNeeded) {
      try {
        await sendTwilioSms(
          appt.client_phone,
          reminderMessage(appt.client_name, appt.appointment_at)
        );

        const smsUpdate =
          kind === "24h" ? { reminder_24h_sent: true } : { reminder_2h_sent: true };

        const { error: smsUpdateError } = await supabaseAdmin
          .from("appointments")
          .update(smsUpdate)
          .eq("id", appt.id);

        if (smsUpdateError) {
          console.error(
            "[reminders/send] SMS sent but DB update failed",
            appt.id,
            smsUpdateError.message
          );
        } else {
          if (kind === "24h") sent24h += 1;
          if (kind === "2h") sent2h += 1;
        }
      } catch (smsErr) {
        const smsMsg =
          smsErr instanceof Error ? smsErr.message : String(smsErr);
        console.error("[reminders/send] SMS failed", appt.id, smsMsg);
      }
    }

    const clientEmail = appt.client_email?.trim();
    const emailNeeded =
      Boolean(clientEmail) &&
      ((kind === "24h" && !appt.reminder_24h_email_sent) ||
        (kind === "2h" && !appt.reminder_2h_email_sent));

    if (emailNeeded && clientEmail) {
      try {
        const publicBaseUrl = getPublicBaseUrl();
        await sendReminderEmail(
          clientEmail,
          appt.client_name,
          appt.appointment_at,
          appt.confirmation_token,
          publicBaseUrl
        );

        const emailUpdate =
          kind === "24h"
            ? { reminder_24h_email_sent: true }
            : { reminder_2h_email_sent: true };

        const { error: emailUpdateError } = await supabaseAdmin
          .from("appointments")
          .update(emailUpdate)
          .eq("id", appt.id);

        if (emailUpdateError) {
          const msg = `DB update after email: ${emailUpdateError.message}`;
          console.error("[reminders/send] email sent but DB update failed", appt.id, msg);
          emailErrors.push({ appointmentId: appt.id, message: msg });
        } else {
          if (kind === "24h") emailed24h += 1;
          if (kind === "2h") emailed2h += 1;
        }
      } catch (emailErr) {
        const emailMsg =
          emailErr instanceof Error ? emailErr.message : String(emailErr);
        console.error("[reminders/send] email failed", appt.id, emailMsg);
        emailErrors.push({ appointmentId: appt.id, message: emailMsg });
      }
    }
  }

  return Response.json({
    ok: true,
    sent24h,
    sent2h,
    emailed24h,
    emailed2h,
    emailErrors,
  });
}

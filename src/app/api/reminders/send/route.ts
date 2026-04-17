import { supabaseAdmin } from "@/lib/supabase-admin";

type ReminderKind = "24h" | "2h";

type AppointmentRow = {
  id: string;
  client_name: string;
  client_phone: string;
  appointment_at: string;
  reminder_24h_sent: boolean;
  reminder_2h_sent: boolean;
};

function getReminderKind(appointmentAtIso: string): ReminderKind | null {
  const appointmentTime = new Date(appointmentAtIso).getTime();
  const nowTime = Date.now();
  const minutesUntil = (appointmentTime - nowTime) / (1000 * 60);

  if (minutesUntil >= 23 * 60 + 55 && minutesUntil <= 24 * 60 + 5) return "24h";
  if (minutesUntil >= 115 && minutesUntil <= 125) return "2h";

  return null;
}

function reminderMessage(clientName: string, appointmentAtIso: string) {
  const when = new Date(appointmentAtIso).toLocaleString("en-IE", {
    dateStyle: "medium",
    timeStyle: "short",
  });

  return `Hi ${clientName}, reminder for your appointment on ${when}. Reply Y to confirm or N to cancel.`;
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
      "id, client_name, client_phone, appointment_at, reminder_24h_sent, reminder_2h_sent, status"
    )
    .eq("status", "no_response");

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  const appointments = (data ?? []) as (AppointmentRow & { status: string })[];
  let sent24h = 0;
  let sent2h = 0;

  for (const appt of appointments) {
    const kind = getReminderKind(appt.appointment_at);
    if (!kind) continue;
    if (kind === "24h" && appt.reminder_24h_sent) continue;
    if (kind === "2h" && appt.reminder_2h_sent) continue;

    try {
      await sendTwilioSms(
        appt.client_phone,
        reminderMessage(appt.client_name, appt.appointment_at)
      );
    } catch {
      continue;
    }

    const updatePayload =
      kind === "24h" ? { reminder_24h_sent: true } : { reminder_2h_sent: true };

    const { error: updateError } = await supabaseAdmin
      .from("appointments")
      .update(updatePayload)
      .eq("id", appt.id);

    if (updateError) continue;
    if (kind === "24h") sent24h += 1;
    if (kind === "2h") sent2h += 1;
  }

  return Response.json({ ok: true, sent24h, sent2h });
}
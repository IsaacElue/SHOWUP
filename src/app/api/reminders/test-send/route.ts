/**
 * TEST ONLY — sends one Twilio SMS immediately for wiring checks.
 * Do not expose publicly; protect with REMINDER_CRON_SECRET (x-reminder-secret).
 */

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

function isTestAuthorized(req: Request) {
  const localSecret = process.env.REMINDER_CRON_SECRET;
  const headerSecret = req.headers.get("x-reminder-secret");
  return Boolean(localSecret && headerSecret === localSecret);
}

export async function POST(req: Request) {
  if (!isTestAuthorized(req)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const phone =
    typeof body === "object" &&
    body !== null &&
    "phone" in body &&
    typeof (body as { phone: unknown }).phone === "string"
      ? (body as { phone: string }).phone.trim()
      : "";

  if (!phone) {
    return Response.json(
      { error: "Missing phone in body. Send JSON: { \"phone\": \"+353...\" }" },
      { status: 400 }
    );
  }

  const message =
    "ShowUp test: if you received this, SMS is working. (Test message — you can ignore.)";

  try {
    await sendTwilioSms(phone, message);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Send failed";
    return Response.json({ error: msg }, { status: 500 });
  }

  return Response.json({ ok: true, sentTo: phone });
}

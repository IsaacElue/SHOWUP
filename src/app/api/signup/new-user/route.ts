import { sendNewSignupNotificationEmail } from "@/lib/send-reminder-email";
import { supabaseAdmin } from "@/lib/supabase-admin";

export async function POST(req: Request) {
  if (!supabaseAdmin) {
    return Response.json({ error: "Server not configured" }, { status: 500 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const userId =
    typeof body === "object" &&
    body !== null &&
    "userId" in body &&
    typeof (body as { userId: unknown }).userId === "string"
      ? (body as { userId: string }).userId.trim()
      : "";
  const email =
    typeof body === "object" &&
    body !== null &&
    "email" in body &&
    typeof (body as { email: unknown }).email === "string"
      ? (body as { email: string }).email.trim()
      : "";
  const signedUpAt =
    typeof body === "object" &&
    body !== null &&
    "signedUpAt" in body &&
    typeof (body as { signedUpAt: unknown }).signedUpAt === "string"
      ? (body as { signedUpAt: string }).signedUpAt.trim()
      : new Date().toISOString();

  if (!userId || !email) {
    return Response.json({ error: "Missing userId or email" }, { status: 400 });
  }

  const { error: profileError } = await supabaseAdmin.from("profiles").upsert(
    {
      user_id: userId,
      email,
      trial_start_date: signedUpAt,
      subscription_active: false,
    },
    { onConflict: "user_id", ignoreDuplicates: true }
  );

  if (profileError) {
    return Response.json({ error: profileError.message }, { status: 500 });
  }

  try {
    await sendNewSignupNotificationEmail(email, signedUpAt);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Notification send failed";
    return Response.json({ error: msg }, { status: 500 });
  }

  return Response.json({ ok: true });
}

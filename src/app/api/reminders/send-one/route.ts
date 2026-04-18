import { getUserFromBearerRequest } from "@/lib/auth-server";
import { getPublicBaseUrl } from "@/lib/public-base-url";
import { sendReminderEmail } from "@/lib/send-reminder-email";
import { supabaseAdmin } from "@/lib/supabase-admin";

export async function POST(req: Request) {
  const { user, error: authError } = await getUserFromBearerRequest(req);
  if (!user) {
    return Response.json(
      { error: authError === "Server not configured" ? authError : "Unauthorized" },
      { status: authError === "Server not configured" ? 500 : 401 }
    );
  }

  if (!supabaseAdmin) {
    return Response.json({ error: "Server not configured" }, { status: 500 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const appointmentId =
    typeof body === "object" &&
    body !== null &&
    "appointmentId" in body &&
    typeof (body as { appointmentId: unknown }).appointmentId === "string"
      ? (body as { appointmentId: string }).appointmentId.trim()
      : "";

  if (!appointmentId) {
    return Response.json({ error: "Missing appointmentId" }, { status: 400 });
  }

  const { data: row, error: fetchError } = await supabaseAdmin
    .from("appointments")
    .select(
      "id, user_id, client_name, client_email, confirmation_token, appointment_at, status"
    )
    .eq("id", appointmentId)
    .maybeSingle();

  if (fetchError) {
    return Response.json({ error: fetchError.message }, { status: 500 });
  }

  if (!row || row.user_id !== user.id) {
    return Response.json({ error: "Not found" }, { status: 404 });
  }

  if (row.status !== "no_response") {
    return Response.json(
      { error: "Reminder can only be sent for appointments awaiting reply" },
      { status: 400 }
    );
  }

  const to = row.client_email?.trim();
  if (!to) {
    return Response.json({ error: "No client email on this appointment" }, { status: 400 });
  }

  try {
    const publicBaseUrl = getPublicBaseUrl();
    await sendReminderEmail(
      to,
      row.client_name,
      row.appointment_at,
      row.confirmation_token,
      publicBaseUrl
    );
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Send failed";
    return Response.json({ error: msg }, { status: 500 });
  }

  return Response.json({ ok: true });
}

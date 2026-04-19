import { appointmentAtDublinToUtcIso } from "@/lib/dublin-appointment";
import { getPublicBaseUrl } from "@/lib/public-base-url";
import { sendOwnerRescheduleNotificationEmail } from "@/lib/send-reminder-email";
import { supabaseAdmin } from "@/lib/supabase-admin";

function formatNewWhenLabel(iso: string) {
  return new Date(iso).toLocaleString("en-IE", {
    timeZone: "Europe/Dublin",
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

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

  const token =
    typeof body === "object" &&
    body !== null &&
    "token" in body &&
    typeof (body as { token: unknown }).token === "string"
      ? (body as { token: string }).token.trim()
      : "";

  const appointmentDate =
    typeof body === "object" &&
    body !== null &&
    "appointmentDate" in body &&
    typeof (body as { appointmentDate: unknown }).appointmentDate === "string"
      ? (body as { appointmentDate: string }).appointmentDate.trim()
      : "";

  const appointmentTime =
    typeof body === "object" &&
    body !== null &&
    "appointmentTime" in body &&
    typeof (body as { appointmentTime: unknown }).appointmentTime === "string"
      ? (body as { appointmentTime: string }).appointmentTime.trim()
      : "";

  if (!token || !appointmentDate || !appointmentTime) {
    return Response.json(
      { error: "Missing token, appointmentDate, or appointmentTime" },
      { status: 400 }
    );
  }

  let newIso: string;
  try {
    newIso = appointmentAtDublinToUtcIso(appointmentDate, appointmentTime);
  } catch {
    return Response.json({ error: "Invalid date or time" }, { status: 400 });
  }

  const { data: row, error: fetchError } = await supabaseAdmin
    .from("appointments")
    .select("id, user_id, client_name, confirmation_token")
    .eq("confirmation_token", token)
    .maybeSingle();

  if (fetchError) {
    return Response.json({ error: fetchError.message }, { status: 500 });
  }

  if (!row) {
    return Response.json({ error: "Not found" }, { status: 404 });
  }

  let publicBaseUrl: string;
  try {
    publicBaseUrl = getPublicBaseUrl();
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Missing public URL";
    return Response.json({ error: msg }, { status: 500 });
  }

  const ownerToken = crypto.randomUUID();
  const base = publicBaseUrl.replace(/\/$/, "");
  const acceptUrl = `${base}/api/reschedule/accept?token=${encodeURIComponent(ownerToken)}`;
  const declineUrl = `${base}/api/reschedule/decline?token=${encodeURIComponent(ownerToken)}`;

  const { error: updateError } = await supabaseAdmin
    .from("appointments")
    .update({
      reschedule_pending_at: newIso,
      reschedule_owner_token: ownerToken,
    })
    .eq("id", row.id)
    .eq("confirmation_token", token);

  if (updateError) {
    return Response.json({ error: updateError.message }, { status: 500 });
  }

  const newWhenLabel = formatNewWhenLabel(newIso);

  let ownerNotified = false;
  try {
    const { data: ownerData, error: ownerErr } = await supabaseAdmin.auth.admin.getUserById(
      row.user_id
    );
    if (ownerErr) {
      console.error("[reschedule] owner lookup failed", row.id, ownerErr.message);
    } else {
      const ownerEmail = ownerData.user?.email?.trim();
      if (ownerEmail) {
        await sendOwnerRescheduleNotificationEmail(
          ownerEmail,
          row.client_name,
          newWhenLabel,
          acceptUrl,
          declineUrl
        );
        ownerNotified = true;
      }
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[reschedule] owner notify failed", row.id, msg);
  }

  return Response.json({ ok: true, ownerNotified, pendingAt: newIso });
}

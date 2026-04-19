import { getPublicBaseUrl } from "@/lib/public-base-url";
import { sendBookingConfirmationEmail } from "@/lib/send-reminder-email";
import { showUpOwnerActionResultPage } from "@/lib/showup-result-html";
import { supabaseAdmin } from "@/lib/supabase-admin";

function htmlResponse(html: string, status = 200) {
  return new Response(html, {
    status,
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}

export async function GET(req: Request) {
  if (!supabaseAdmin) {
    return htmlResponse(
      showUpOwnerActionResultPage("Something went wrong", "Please try again later."),
      500
    );
  }

  const url = new URL(req.url);
  const token = url.searchParams.get("token")?.trim();
  if (!token) {
    return htmlResponse(
      showUpOwnerActionResultPage("Link not valid", "This link is missing required information."),
      404
    );
  }

  const { data: row, error: fetchError } = await supabaseAdmin
    .from("appointments")
    .select(
      "id, client_name, client_email, confirmation_token, reschedule_pending_at, reschedule_owner_token"
    )
    .eq("reschedule_owner_token", token)
    .maybeSingle();

  if (fetchError) {
    return htmlResponse(
      showUpOwnerActionResultPage("Something went wrong", "Please try again later."),
      500
    );
  }

  if (!row?.reschedule_pending_at) {
    return htmlResponse(
      showUpOwnerActionResultPage(
        "Link not valid",
        "This link has expired or was already used."
      ),
      404
    );
  }

  const pendingAt = row.reschedule_pending_at;

  const { error: updateError } = await supabaseAdmin
    .from("appointments")
    .update({
      appointment_at: pendingAt,
      reschedule_pending_at: null,
      reschedule_owner_token: null,
    })
    .eq("id", row.id)
    .eq("reschedule_owner_token", token);

  if (updateError) {
    return htmlResponse(
      showUpOwnerActionResultPage("Something went wrong", "Please try again later."),
      500
    );
  }

  const clientEmail = row.client_email?.trim();
  let clientNotified = false;
  if (clientEmail) {
    try {
      const publicBaseUrl = getPublicBaseUrl();
      await sendBookingConfirmationEmail(
        clientEmail,
        row.client_name,
        pendingAt,
        row.confirmation_token,
        publicBaseUrl
      );
      clientNotified = true;
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      console.error("[reschedule/accept] client booking email failed", row.id, msg);
    }
  }

  const subtext = clientNotified
    ? `${row.client_name} has been notified.`
    : "The appointment time was updated. No email address on file for them.";

  return htmlResponse(
    showUpOwnerActionResultPage("Reschedule confirmed.", subtext),
    200
  );
}

import { sendRescheduleDeclinedClientEmail } from "@/lib/send-reminder-email";
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
    .select("id, client_name, client_email, reschedule_pending_at, reschedule_owner_token")
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

  const { error: updateError } = await supabaseAdmin
    .from("appointments")
    .update({
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
      await sendRescheduleDeclinedClientEmail(clientEmail, row.client_name);
      clientNotified = true;
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      console.error("[reschedule/decline] client email failed", row.id, msg);
    }
  }

  const subtext = clientNotified
    ? "Client notified."
    : "We couldn’t email this client — no email on file.";

  return htmlResponse(
    showUpOwnerActionResultPage("Reschedule declined.", subtext),
    200
  );
}

import { supabaseAdmin } from "@/lib/supabase-admin";

export async function POST(req: Request) {
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

  const responseRaw =
    typeof body === "object" &&
    body !== null &&
    "response" in body &&
    typeof (body as { response: unknown }).response === "string"
      ? (body as { response: string }).response.trim().toUpperCase()
      : "";

  if (!token || (responseRaw !== "Y" && responseRaw !== "N")) {
    return Response.json({ error: "Invalid token or response" }, { status: 400 });
  }

  if (!supabaseAdmin) {
    return Response.json({ error: "Server not configured" }, { status: 500 });
  }

  const { data: row, error: fetchError } = await supabaseAdmin
    .from("appointments")
    .select("id, status")
    .eq("confirmation_token", token)
    .maybeSingle();

  if (fetchError) {
    return Response.json({ error: "Could not load appointment" }, { status: 500 });
  }

  if (!row) {
    return Response.json({ error: "Not found" }, { status: 404 });
  }

  if (row.status !== "no_response") {
    return Response.json(
      {
        error: "already_handled",
        status: row.status,
      },
      { status: 409 }
    );
  }

  const nextStatus = responseRaw === "Y" ? "confirmed" : "cancelled";
  const { error: updateError } = await supabaseAdmin
    .from("appointments")
    .update({ status: nextStatus })
    .eq("id", row.id)
    .eq("status", "no_response");

  if (updateError) {
    return Response.json({ error: updateError.message }, { status: 500 });
  }

  return Response.json({ ok: true, response: responseRaw });
}

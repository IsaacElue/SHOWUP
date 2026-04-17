import { supabaseAdmin } from "@/lib/supabase-admin";

function twiml(message: string) {
  return `<?xml version="1.0" encoding="UTF-8"?><Response><Message>${message}</Message></Response>`;
}

function formValueToString(value: FormDataEntryValue | null) {
  return typeof value === "string" ? value.trim() : "";
}

export async function POST(req: Request) {
  if (!supabaseAdmin) {
    return new Response(twiml("Server is not configured yet."), {
      status: 500,
      headers: { "Content-Type": "text/xml" },
    });
  }

  const formData = await req.formData();
  const from = formValueToString(formData.get("From"));
  const body = formValueToString(formData.get("Body")).toUpperCase();

  if (!from || !body) {
    return new Response(twiml("Missing message details."), {
      status: 400,
      headers: { "Content-Type": "text/xml" },
    });
  }

  let status: "confirmed" | "cancelled" | null = null;
  if (body.startsWith("Y")) status = "confirmed";
  if (body.startsWith("N")) status = "cancelled";

  if (!status) {
    return new Response(
      twiml("Reply Y to confirm or N to cancel your appointment."),
      {
        status: 200,
        headers: { "Content-Type": "text/xml" },
      }
    );
  }

  const { data: appointment, error: fetchError } = await supabaseAdmin
    .from("appointments")
    .select("id")
    .eq("client_phone", from)
    .eq("status", "no_response")
    .order("appointment_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (fetchError) {
    return new Response(twiml("Could not check your appointment right now."), {
      status: 500,
      headers: { "Content-Type": "text/xml" },
    });
  }

  if (!appointment) {
    return new Response(
      twiml("No pending appointment found for this phone number."),
      {
        status: 200,
        headers: { "Content-Type": "text/xml" },
      }
    );
  }

  const { error: updateError } = await supabaseAdmin
    .from("appointments")
    .update({ status })
    .eq("id", appointment.id);

  if (updateError) {
    return new Response(twiml("Could not update your appointment."), {
      status: 500,
      headers: { "Content-Type": "text/xml" },
    });
  }

  return new Response(
    twiml(
      status === "confirmed"
        ? "Thanks. Your appointment is confirmed."
        : "Your appointment is cancelled."
    ),
    {
      status: 200,
      headers: { "Content-Type": "text/xml" },
    }
  );
}

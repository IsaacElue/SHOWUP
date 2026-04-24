import { appointmentAtDublinToUtcIso } from "@/lib/dublin-appointment";
import { getPublicBaseUrl } from "@/lib/public-base-url";
import { sendBookingConfirmationEmail } from "@/lib/send-reminder-email";
import { supabaseAdmin } from "@/lib/supabase-admin";

type BookBody = {
  widgetKey: string;
  sessionId: string;
  clientName: string;
  clientEmail: string;
  clientPhone?: string;
  serviceName: string;
  appointmentDate: string;
  appointmentTime: string;
};

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

function jsonWithCors(body: unknown, init?: ResponseInit) {
  return Response.json(body, {
    ...init,
    headers: {
      ...CORS_HEADERS,
      ...(init?.headers ?? {}),
    },
  });
}

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: CORS_HEADERS });
}

export async function POST(req: Request) {
  if (!supabaseAdmin) {
    return jsonWithCors({ error: "Server not configured" }, { status: 500 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return jsonWithCors({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = body as Partial<BookBody>;
  const widgetKey = typeof parsed.widgetKey === "string" ? parsed.widgetKey.trim() : "";
  const sessionId = typeof parsed.sessionId === "string" ? parsed.sessionId.trim() : "";
  const clientName = typeof parsed.clientName === "string" ? parsed.clientName.trim() : "";
  const clientEmail = typeof parsed.clientEmail === "string" ? parsed.clientEmail.trim() : "";
  const clientPhone = typeof parsed.clientPhone === "string" ? parsed.clientPhone.trim() : "";
  const serviceName = typeof parsed.serviceName === "string" ? parsed.serviceName.trim() : "";
  const appointmentDate =
    typeof parsed.appointmentDate === "string" ? parsed.appointmentDate.trim() : "";
  const appointmentTime =
    typeof parsed.appointmentTime === "string" ? parsed.appointmentTime.trim() : "";

  if (
    !widgetKey ||
    !sessionId ||
    !clientName ||
    !clientEmail ||
    !serviceName ||
    !appointmentDate ||
    !appointmentTime
  ) {
    return jsonWithCors(
      {
        error:
          "widgetKey, sessionId, clientName, clientEmail, serviceName, appointmentDate, and appointmentTime are required",
      },
      { status: 400 }
    );
  }

  const { data: business, error: businessError } = await supabaseAdmin
    .from("businesses")
    .select("id, user_id, name")
    .eq("widget_key", widgetKey)
    .maybeSingle();
  if (businessError) {
    return jsonWithCors({ error: businessError.message }, { status: 500 });
  }
  if (!business) {
    return jsonWithCors({ error: "Invalid widget key" }, { status: 404 });
  }

  const { data: service } = await supabaseAdmin
    .from("services")
    .select("id, name, active")
    .eq("business_id", business.id)
    .eq("name", serviceName)
    .eq("active", true)
    .maybeSingle();
  if (!service) {
    return jsonWithCors({ error: "Service not available" }, { status: 400 });
  }

  let appointmentAtIso: string;
  try {
    appointmentAtIso = appointmentAtDublinToUtcIso(appointmentDate, appointmentTime);
  } catch {
    return jsonWithCors({ error: "Invalid appointment date/time" }, { status: 400 });
  }

  const confirmationToken = crypto.randomUUID();

  const { data: existingClient } = await supabaseAdmin
    .from("showup_clients")
    .select("id")
    .eq("email", clientEmail)
    .maybeSingle();

  let clientId: string;
  if (existingClient?.id) {
    clientId = existingClient.id;
    const { data: current } = await supabaseAdmin
      .from("showup_clients")
      .select("total_bookings")
      .eq("id", clientId)
      .maybeSingle();
    await supabaseAdmin
      .from("showup_clients")
      .update({
        name: clientName,
        phone: clientPhone || null,
        total_bookings: (current?.total_bookings ?? 0) + 1,
      })
      .eq("id", clientId);
  } else {
    const { data: insertedClient, error: clientInsertError } = await supabaseAdmin
      .from("showup_clients")
      .insert({
        email: clientEmail,
        name: clientName,
        phone: clientPhone || null,
        total_bookings: 1,
      })
      .select("id")
      .single();
    if (clientInsertError || !insertedClient) {
      return jsonWithCors(
        { error: clientInsertError?.message ?? "Could not create client" },
        { status: 500 }
      );
    }
    clientId = insertedClient.id;
  }

  const { data: insertedAppointment, error: appointmentError } = await supabaseAdmin
    .from("appointments")
    .insert({
      user_id: business.user_id,
      client_name: clientName,
      client_phone: clientPhone,
      client_email: clientEmail,
      confirmation_token: confirmationToken,
      appointment_at: appointmentAtIso,
    })
    .select("id, appointment_at, client_name, client_email")
    .single();

  if (appointmentError || !insertedAppointment) {
    return jsonWithCors(
      { error: appointmentError?.message ?? "Could not create appointment" },
      { status: 500 }
    );
  }

  await supabaseAdmin
    .from("widget_conversations")
    .update({
      status: "booked",
      client_id: clientId,
    })
    .eq("business_id", business.id)
    .eq("session_id", sessionId);

  try {
    const publicBaseUrl = getPublicBaseUrl();
    await sendBookingConfirmationEmail(
      clientEmail,
      clientName,
      insertedAppointment.appointment_at,
      confirmationToken,
      publicBaseUrl
    );
  } catch {
    // Booking is already created; email is best-effort.
  }

  return jsonWithCors({
    ok: true,
    clientId,
    appointment: {
      id: insertedAppointment.id,
      businessName: business.name,
      serviceName,
      appointmentDate,
      appointmentTime,
      appointmentAt: insertedAppointment.appointment_at,
      clientName: insertedAppointment.client_name,
      clientEmail: insertedAppointment.client_email,
    },
  });
}

import { supabaseAdmin } from "@/lib/supabase-admin";

type ChatBody = {
  widgetKey: string;
  sessionId: string;
  message: string;
  conversationHistory?: Array<{ role: string; content: string }>;
};

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
  ts: string;
};

type BookingPayload = {
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

function safeMessages(input: unknown): ChatMessage[] {
  if (!Array.isArray(input)) return [];
  const out: ChatMessage[] = [];
  for (const item of input) {
    if (
      typeof item === "object" &&
      item !== null &&
      "role" in item &&
      "content" in item &&
      (item as { role: unknown }).role !== "system" &&
      typeof (item as { role: unknown }).role === "string" &&
      typeof (item as { content: unknown }).content === "string"
    ) {
      const role = (item as { role: string }).role === "assistant" ? "assistant" : "user";
      out.push({
        role,
        content: (item as { content: string }).content.slice(0, 4000),
        ts:
          typeof (item as { ts?: unknown }).ts === "string"
            ? (item as { ts: string }).ts
            : new Date().toISOString(),
      });
    }
  }
  return out.slice(-30);
}

function servicesText(
  services: Array<{ name: string; duration_minutes: number; price: number; currency: string }>
) {
  if (!services.length) return "No services configured yet.";
  return services
    .map((s) => `- ${s.name}: ${s.duration_minutes} min, ${s.price} ${s.currency}`)
    .join("\n");
}

function parseClaudeJson(rawText: string): { reply: string; booking?: BookingPayload } {
  const trimmed = rawText.trim();
  let candidate = trimmed;
  if (candidate.startsWith("```")) {
    const lines = candidate.split("\n");
    if (lines.length >= 3) candidate = lines.slice(1, -1).join("\n").trim();
  }

  try {
    const parsed = JSON.parse(candidate) as {
      reply?: unknown;
      bookingReady?: unknown;
      bookingPayload?: unknown;
    };
    const reply =
      typeof parsed.reply === "string" && parsed.reply.trim()
        ? parsed.reply.trim()
        : "Thanks for your message. Could you share your preferred date and time?";
    const bookingReady = parsed.bookingReady === true;
    const bp = parsed.bookingPayload;
    if (
      bookingReady &&
      bp &&
      typeof bp === "object" &&
      typeof (bp as BookingPayload).clientName === "string" &&
      typeof (bp as BookingPayload).clientEmail === "string" &&
      typeof (bp as BookingPayload).serviceName === "string" &&
      typeof (bp as BookingPayload).appointmentDate === "string" &&
      typeof (bp as BookingPayload).appointmentTime === "string"
    ) {
      const bookingPayload = bp as BookingPayload;
      return {
        reply,
        booking: {
          clientName: bookingPayload.clientName.trim(),
          clientEmail: bookingPayload.clientEmail.trim(),
          clientPhone:
            typeof bookingPayload.clientPhone === "string"
              ? bookingPayload.clientPhone.trim()
              : "",
          serviceName: bookingPayload.serviceName.trim(),
          appointmentDate: bookingPayload.appointmentDate.trim(),
          appointmentTime: bookingPayload.appointmentTime.trim(),
        },
      };
    }
    return { reply };
  } catch {
    return {
      reply:
        rawText.trim() ||
        "Thanks for your message. Could you share your preferred date and time?",
    };
  }
}

async function callClaudeSystem(
  apiKey: string,
  systemPrompt: string,
  messages: ChatMessage[]
): Promise<string> {
  const anthropicMessages = messages.map((m) => ({
    role: m.role,
    content: m.content,
  }));

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: 500,
      temperature: 0.3,
      system: systemPrompt,
      messages: anthropicMessages,
    }),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => "Claude API error");
    throw new Error(errText);
  }

  const json = (await res.json()) as {
    content?: Array<{ type?: string; text?: string }>;
  };
  const text = (json.content ?? [])
    .filter((c) => c.type === "text" && typeof c.text === "string")
    .map((c) => c.text)
    .join("\n")
    .trim();
  return text;
}

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: CORS_HEADERS });
}

export async function POST(req: Request) {
  if (!supabaseAdmin) {
    return jsonWithCors({ error: "Server not configured" }, { status: 500 });
  }

  const anthropicApiKey = process.env.ANTHROPIC_API_KEY;
  if (!anthropicApiKey) {
    return jsonWithCors({ error: "Missing ANTHROPIC_API_KEY" }, { status: 500 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return jsonWithCors({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = body as Partial<ChatBody>;
  const widgetKey = typeof parsed.widgetKey === "string" ? parsed.widgetKey.trim() : "";
  const sessionId = typeof parsed.sessionId === "string" ? parsed.sessionId.trim() : "";
  const message = typeof parsed.message === "string" ? parsed.message.trim() : "";

  if (!widgetKey || !sessionId || !message) {
    return jsonWithCors(
      { error: "widgetKey, sessionId, and message are required" },
      { status: 400 }
    );
  }

  const { data: business, error: businessError } = await supabaseAdmin
    .from("businesses")
    .select("id, name, category, location, description, available_hours")
    .eq("widget_key", widgetKey)
    .maybeSingle();
  if (businessError) {
    return jsonWithCors({ error: businessError.message }, { status: 500 });
  }
  if (!business) {
    return jsonWithCors({ error: "Invalid widget key" }, { status: 404 });
  }

  const { data: services, error: servicesError } = await supabaseAdmin
    .from("services")
    .select("name, duration_minutes, price, currency")
    .eq("business_id", business.id)
    .eq("active", true)
    .order("created_at", { ascending: true });
  if (servicesError) {
    return jsonWithCors({ error: servicesError.message }, { status: 500 });
  }

  const { data: conversationRow } = await supabaseAdmin
    .from("widget_conversations")
    .select("id, messages, status, client_id")
    .eq("business_id", business.id)
    .eq("session_id", sessionId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const incomingHistory = safeMessages(parsed.conversationHistory);
  const storedHistory = safeMessages(conversationRow?.messages);
  const history = incomingHistory.length ? incomingHistory : storedHistory;
  const fullConversation: ChatMessage[] = [
    ...history.slice(-25),
    { role: "user", content: message, ts: new Date().toISOString() },
  ];

  const systemPrompt = [
    "You are ShowUp AI Receptionist. Be friendly, concise, and professional.",
    "Your goal is to help website visitors book appointments for this business.",
    "Never invent details. Only use provided business data.",
    "If details are missing, ask for one missing item at a time.",
    "When booking intent is clear, collect exactly: client name, client email, preferred service, preferred date (YYYY-MM-DD), preferred time (HH:MM), optional phone.",
    "Once all details are present, set bookingReady=true and provide bookingPayload.",
    "Respond as strict JSON only:",
    '{"reply":"string","bookingReady":boolean,"bookingPayload":{"clientName":"string","clientEmail":"string","clientPhone":"string","serviceName":"string","appointmentDate":"YYYY-MM-DD","appointmentTime":"HH:MM"}}',
    "",
    `Business name: ${business.name}`,
    `Category: ${business.category ?? "Not set"}`,
    `Location: ${business.location ?? "Not set"}`,
    `Description: ${business.description ?? "Not set"}`,
    `Services:\n${servicesText(
      (services ?? []) as Array<{
        name: string;
        duration_minutes: number;
        price: number;
        currency: string;
      }>
    )}`,
    `Available hours JSON: ${JSON.stringify(business.available_hours ?? {})}`,
  ].join("\n");

  let aiText: string;
  try {
    aiText = await callClaudeSystem(anthropicApiKey, systemPrompt, fullConversation);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Claude request failed";
    return jsonWithCors({ error: msg }, { status: 500 });
  }

  const parsedAi = parseClaudeJson(aiText);
  let finalReply = parsedAi.reply;
  let finalStatus: "active" | "booked" | "abandoned" = "active";
  let clientId: string | null = conversationRow?.client_id ?? null;

  if (parsedAi.booking) {
    try {
      const bookUrl = new URL("/api/widget/book", req.url).toString();
      const bookingRes = await fetch(bookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          widgetKey,
          sessionId,
          ...parsedAi.booking,
        }),
      });

      if (bookingRes.ok) {
        const bookingJson = (await bookingRes.json().catch(() => ({}))) as {
          appointment?: { appointmentDate?: string; appointmentTime?: string; serviceName?: string };
          clientId?: string;
        };
        finalStatus = "booked";
        clientId = bookingJson.clientId ?? clientId;
        const bookedDate = bookingJson.appointment?.appointmentDate ?? parsedAi.booking.appointmentDate;
        const bookedTime = bookingJson.appointment?.appointmentTime ?? parsedAi.booking.appointmentTime;
        const bookedService = bookingJson.appointment?.serviceName ?? parsedAi.booking.serviceName;
        finalReply = `Perfect, you are booked for ${bookedService} on ${bookedDate} at ${bookedTime}. A confirmation email is on the way.`;
      }
    } catch {
      // Keep assistant reply if booking endpoint is not ready yet.
    }
  }

  const updatedMessages = [
    ...fullConversation,
    { role: "assistant" as const, content: finalReply, ts: new Date().toISOString() },
  ];

  if (conversationRow?.id) {
    await supabaseAdmin
      .from("widget_conversations")
      .update({
        messages: updatedMessages,
        status: finalStatus,
        client_id: clientId,
      })
      .eq("id", conversationRow.id);
  } else {
    await supabaseAdmin.from("widget_conversations").insert({
      business_id: business.id,
      session_id: sessionId,
      messages: updatedMessages,
      status: finalStatus,
      client_id: clientId,
    });
  }

  return jsonWithCors({
    reply: finalReply,
    businessName: business.name,
    status: finalStatus,
  });
}

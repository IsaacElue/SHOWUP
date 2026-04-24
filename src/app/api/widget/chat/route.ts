import { DateTime } from "luxon";

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
  /** Optional echo from the model; must match the real weekday in Europe/Dublin for appointmentDate. */
  appointmentWeekday?: string;
};

type PendingBookingRow = BookingPayload | null;

function dublinWeekdayLongForYyyyMmDd(dateStr: string): string | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateStr.trim());
  if (!m) return null;
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const d = Number(m[3]);
  const dt = DateTime.fromObject({ year: y, month: mo, day: d }, { zone: "Europe/Dublin" });
  if (!dt.isValid) return null;
  return dt.setLocale("en").toFormat("cccc");
}

function normalizeBookingPayload(raw: BookingPayload): BookingPayload {
  return {
    clientName: raw.clientName.trim(),
    clientEmail: raw.clientEmail.trim(),
    clientPhone: typeof raw.clientPhone === "string" ? raw.clientPhone.trim() : "",
    serviceName: raw.serviceName.trim(),
    appointmentDate: raw.appointmentDate.trim(),
    appointmentTime: raw.appointmentTime.trim(),
    appointmentWeekday:
      typeof raw.appointmentWeekday === "string" ? raw.appointmentWeekday.trim() : undefined,
  };
}

function bookingPayloadForApi(b: BookingPayload): Omit<BookingPayload, "appointmentWeekday"> {
  const { appointmentWeekday: _ignored, ...rest } = b;
  return rest;
}

function validateDublinBookingPayload(
  b: BookingPayload
): { ok: true; normalized: BookingPayload } | { ok: false; error: string } {
  const normalized = normalizeBookingPayload(b);
  const { appointmentDate, appointmentTime } = normalized;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(appointmentDate)) {
    return { ok: false, error: "appointmentDate must be YYYY-MM-DD (Europe/Dublin calendar date)." };
  }
  if (!/^\d{2}:\d{2}$/.test(appointmentTime)) {
    return { ok: false, error: "appointmentTime must be HH:MM (24h, Europe/Dublin wall clock)." };
  }
  const actualWeekday = dublinWeekdayLongForYyyyMmDd(appointmentDate);
  if (!actualWeekday) {
    return { ok: false, error: "Invalid appointment date for Europe/Dublin." };
  }
  const claimed = normalized.appointmentWeekday?.trim();
  if (claimed) {
    const a = actualWeekday.toLowerCase();
    const c = claimed.toLowerCase();
    if (a !== c && !a.startsWith(c.slice(0, 3)) && !c.startsWith(a.slice(0, 3))) {
      return {
        ok: false,
        error: `That date is a ${actualWeekday} in Ireland (Europe/Dublin), not ${claimed}. Fix appointmentDate or the weekday.`,
      };
    }
  }
  return { ok: true, normalized };
}

function isAffirmativeBookingReply(text: string): boolean {
  const t = text.trim().toLowerCase();
  if (!t) return false;
  if (/^(yes|yeah|yep|y)\b/.test(t)) return true;
  if (/^(ok|okay)\b/.test(t)) return true;
  if (/\b(confirm|confirmed|book it|please book|go ahead|sounds good|lock it in|that's right|that is right)\b/.test(t)) {
    return true;
  }
  return false;
}

function isNegativeBookingReply(text: string): boolean {
  const t = text.trim().toLowerCase();
  if (!t) return false;
  if (/^(no|nope|nah)\b/.test(t)) return true;
  if (/\b(change|wrong|incorrect|different|cancel|not yet|don't book|do not book)\b/.test(t)) return true;
  return false;
}

function parsePendingBookingFromRow(raw: unknown): BookingPayload | null {
  if (raw === null || raw === undefined) return null;
  if (typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  if (
    typeof o.clientName === "string" &&
    typeof o.clientEmail === "string" &&
    typeof o.serviceName === "string" &&
    typeof o.appointmentDate === "string" &&
    typeof o.appointmentTime === "string"
  ) {
    return {
      clientName: o.clientName,
      clientEmail: o.clientEmail,
      clientPhone: typeof o.clientPhone === "string" ? o.clientPhone : "",
      serviceName: o.serviceName,
      appointmentDate: o.appointmentDate,
      appointmentTime: o.appointmentTime,
      appointmentWeekday: typeof o.appointmentWeekday === "string" ? o.appointmentWeekday : undefined,
    };
  }
  return null;
}

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

function errorMessage(err: unknown) {
  if (err instanceof Error) return err.message;
  if (typeof err === "string") return err;
  try {
    return JSON.stringify(err);
  } catch {
    return "Unknown error";
  }
}

function jsonWithCors(body: unknown, init?: ResponseInit) {
  return Response.json(body, {
    ...init,
    headers: {
      ...CORS_HEADERS,
      ...(init?.headers ?? {}),
    },
  });
}

function fail(
  stage: string,
  err: unknown,
  status = 500,
  extra?: Record<string, unknown>
) {
  const message = errorMessage(err);
  console.error("[widget-chat]", stage, { message, ...extra });
  return jsonWithCors(
    {
      error: message,
      stage,
      ...extra,
    },
    { status }
  );
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

type ParsedClaude = {
  reply: string;
  /** When true, all required fields are present and the assistant is asking the user to confirm — do not book yet. */
  awaitingBookingConfirmation?: boolean;
  bookingPayload?: BookingPayload;
};

function parseClaudeJson(rawText: string): ParsedClaude {
  const trimmed = rawText.trim();
  let candidate = trimmed;
  if (candidate.startsWith("```")) {
    const lines = candidate.split("\n");
    if (lines.length >= 3) candidate = lines.slice(1, -1).join("\n").trim();
  }

  try {
    const parsed = JSON.parse(candidate) as {
      reply?: unknown;
      awaitingBookingConfirmation?: unknown;
      bookingReady?: unknown;
      bookingPayload?: unknown;
    };
    const reply =
      typeof parsed.reply === "string" && parsed.reply.trim()
        ? parsed.reply.trim()
        : "Thanks for your message. Could you share your preferred date and time?";
    const bp = parsed.bookingPayload;
    const awaitingExplicit = parsed.awaitingBookingConfirmation === true;
    const legacyReady = parsed.bookingReady === true;
    const awaitingBookingConfirmation = awaitingExplicit || legacyReady;

    if (
      awaitingBookingConfirmation &&
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
        awaitingBookingConfirmation: true,
        bookingPayload: {
          clientName: bookingPayload.clientName.trim(),
          clientEmail: bookingPayload.clientEmail.trim(),
          clientPhone:
            typeof bookingPayload.clientPhone === "string"
              ? bookingPayload.clientPhone.trim()
              : "",
          serviceName: bookingPayload.serviceName.trim(),
          appointmentDate: bookingPayload.appointmentDate.trim(),
          appointmentTime: bookingPayload.appointmentTime.trim(),
          appointmentWeekday:
            typeof bookingPayload.appointmentWeekday === "string"
              ? bookingPayload.appointmentWeekday.trim()
              : undefined,
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
  const anthropicMessages: Array<{ role: "user" | "assistant"; content: string }> = [];
  for (const m of messages) {
    const content = typeof m.content === "string" ? m.content.trim() : "";
    if (!content) continue;
    const role: "user" | "assistant" = m.role === "assistant" ? "assistant" : "user";
    const prev = anthropicMessages[anthropicMessages.length - 1];
    if (!prev || prev.role !== role) {
      anthropicMessages.push({ role, content });
      continue;
    }
    // Merge consecutive same-role turns to keep strict alternation.
    prev.content = `${prev.content}\n\n${content}`;
  }

  // Anthropic expects messages to start with user.
  while (anthropicMessages.length && anthropicMessages[0].role !== "user") {
    anthropicMessages.shift();
  }

  if (!anthropicMessages.length) {
    anthropicMessages.push({
      role: "user",
      content: "Hello",
    });
  }

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-5",
      max_tokens: 1024,
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
    return jsonWithCors(
      {
        error: "Missing ANTHROPIC_API_KEY",
        stage: "env",
        env: {
          hasAnthropicKey: false,
          hasSupabaseUrl: Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL),
          hasSupabaseServiceRoleKey: Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY),
        },
      },
      { status: 500 }
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return fail("parse_body", "Invalid JSON", 400);
  }

  const parsed = body as Partial<ChatBody>;
  const widgetKey = typeof parsed.widgetKey === "string" ? parsed.widgetKey.trim() : "";
  const sessionId = typeof parsed.sessionId === "string" ? parsed.sessionId.trim() : "";
  const message = typeof parsed.message === "string" ? parsed.message.trim() : "";

  if (!widgetKey || !sessionId || !message) {
    return jsonWithCors(
      {
        error: "widgetKey, sessionId, and message are required",
        stage: "validate_body",
      },
      { status: 400 }
    );
  }

  const { data: business, error: businessError } = await supabaseAdmin
    .from("businesses")
    .select("id, name, category, location, description, available_hours")
    .eq("widget_key", widgetKey)
    .maybeSingle();
  if (businessError) {
    return fail("lookup_business", businessError.message, 500, {
      widgetKeyPrefix: widgetKey.slice(0, 8),
    });
  }
  if (!business) {
    return jsonWithCors(
      {
        error: "Invalid widget key",
        stage: "lookup_business",
        widgetKeyPrefix: widgetKey.slice(0, 8),
      },
      { status: 404 }
    );
  }

  const { data: services, error: servicesError } = await supabaseAdmin
    .from("services")
    .select("name, duration_minutes, price, currency")
    .eq("business_id", business.id)
    .eq("active", true)
    .order("created_at", { ascending: true });
  if (servicesError) {
    return fail("load_services", servicesError.message, 500, { businessId: business.id });
  }

  const { data: conversationRow, error: conversationLoadError } = await supabaseAdmin
    .from("widget_conversations")
    .select("id, messages, status, client_id, pending_booking")
    .eq("business_id", business.id)
    .eq("session_id", sessionId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (conversationLoadError) {
    return fail("load_conversation", conversationLoadError.message, 500, {
      businessId: business.id,
      sessionId,
    });
  }

  const incomingHistory = safeMessages(parsed.conversationHistory);
  const storedHistory = safeMessages(conversationRow?.messages);
  const history = incomingHistory.length ? incomingHistory : storedHistory;
  const baseConversation = history.slice(-25);
  const lastMessage = baseConversation[baseConversation.length - 1];
  const alreadyContainsIncomingUserMessage =
    lastMessage?.role === "user" && lastMessage.content.trim() === message.trim();
  const fullConversation: ChatMessage[] = alreadyContainsIncomingUserMessage
    ? baseConversation
    : [...baseConversation, { role: "user", content: message, ts: new Date().toISOString() }];

  const now = new Date();
  const todayDublin = now.toLocaleDateString("en-IE", {
    timeZone: "Europe/Dublin",
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const pendingFromDb = parsePendingBookingFromRow(
    (conversationRow as { pending_booking?: unknown } | null)?.pending_booking
  );

  let pendingBookingToStore: PendingBookingRow | undefined;

  let finalReply = "";
  let finalStatus: "active" | "booked" | "abandoned" = "active";
  let clientId: string | null = conversationRow?.client_id ?? null;
  let skipClaude = false;

  if (pendingFromDb && isNegativeBookingReply(message)) {
    pendingBookingToStore = null;
  }

  if (pendingFromDb && isAffirmativeBookingReply(message)) {
    skipClaude = true;
    const validated = validateDublinBookingPayload(pendingFromDb);
    if (validated.ok) {
      try {
        const bookUrl = new URL("/api/widget/book", req.url).toString();
        const bookingRes = await fetch(bookUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            widgetKey,
            sessionId,
            ...bookingPayloadForApi(validated.normalized),
          }),
        });

        if (bookingRes.ok) {
          const bookingJson = (await bookingRes.json().catch(() => ({}))) as {
            appointment?: { appointmentDate?: string; appointmentTime?: string; serviceName?: string };
            clientId?: string;
          };
          finalStatus = "booked";
          clientId = bookingJson.clientId ?? clientId;
          const bookedDate =
            bookingJson.appointment?.appointmentDate ?? validated.normalized.appointmentDate;
          const bookedTime =
            bookingJson.appointment?.appointmentTime ?? validated.normalized.appointmentTime;
          const bookedService =
            bookingJson.appointment?.serviceName ?? validated.normalized.serviceName;
          const wd = dublinWeekdayLongForYyyyMmDd(bookedDate);
          const datePart = wd ? `${wd} ${bookedDate}` : bookedDate;
          finalReply = `Perfect, you are booked for ${bookedService} on ${datePart} at ${bookedTime}. A confirmation email is on the way.`;
          pendingBookingToStore = null;
        } else {
          const bookErr = await bookingRes.json().catch(() => ({}));
          console.error("[widget-chat] booking_call_failed", {
            status: bookingRes.status,
            body: bookErr,
          });
          finalReply =
            "I could not complete the booking just now. Please try again in a moment, or say No to change any details first.";
        }
      } catch (e) {
        console.error("[widget-chat] booking_call_exception", {
          message: errorMessage(e),
        });
        finalReply =
          "I could not complete the booking just now. Please try again in a moment, or say No to change any details first.";
      }
    } else {
      finalReply = `${validated.error} Reply No if you would like to change anything.`;
      pendingBookingToStore = null;
    }
  }

  const pendingForPrompt =
    pendingFromDb && !isAffirmativeBookingReply(message) && !isNegativeBookingReply(message)
      ? pendingFromDb
      : null;

  const pendingContext = pendingForPrompt
    ? `\nA booking is currently awaiting explicit user confirmation for this session. Stored details (Europe/Dublin): ${JSON.stringify(
        bookingPayloadForApi(pendingForPrompt)
      )}. Do not book until the user clearly approves; the server books when they reply affirmatively.`
    : "";

  const systemPrompt = [
    "You are ShowUp AI Receptionist. Be friendly, concise, and professional.",
    "Your goal is to help website visitors book appointments for this business.",
    "Never invent details. Only use provided business data.",
    "If details are missing, ask for one missing item at a time.",
    `DATE CALCULATION — CRITICAL RULES:

Today is ${todayDublin}.
Current timezone: Europe/Dublin.

BEFORE stating any date to the client, you MUST
internally verify the day of week matches the
date. Use this logic:

Known reference: Today is ${todayDublin}.
Count forward from today to find exact dates.

RELATIVE DATE RULES:
- 'today' = today
- 'tomorrow' = today + 1 day
- 'day after tomorrow' = today + 2 days
- 'in X days' = today + X days
- 'this [weekday]' = the next occurrence of
  that weekday at or after today
- '[weekday]' with no qualifier = next occurrence
  of that weekday from today
- 'next [weekday]' = the occurrence AFTER the
  coming one, at least 7 days away
- 'next week' = 7 days from today
- '2 weeks from now' = 14 days from today

VERIFICATION — ALWAYS DO THIS:
After calculating a date:
1. Count the days from today to that date
2. Determine what day of week it falls on
3. If it does not match what the client said,
   correct yourself silently and recalculate
4. Only confirm the date to the client after
   this verification passes

WHEN CLIENT SAYS A DAY NAME:
- Client says 'Tuesday' — find the next Tuesday
  from today by counting forward
- Today is Friday 24 April 2026
- Saturday = 25 April, Sunday = 26, Monday = 27,
  Tuesday = 28 April 2026
- So 'this Tuesday' or 'Tuesday' = 28 April 2026
- 'Next Tuesday' = 5 May 2026

SPECIFIC DATES FROM CLIENT:
- If client says '29th April' — look up what day
  that is: 29 April 2026 is a Wednesday
- Always state the correct day: 'Wednesday 29 April'
- Never say 'Tuesday 29 April' if 29 April is
  a Wednesday

CONFIRMATION BEFORE ACCEPTING:
When you have a date, always confirm with client:
'Just to confirm — you want [correct weekday]
[date] at [time]?'
Wait for yes before proceeding to collect name/email.

NEVER output appointmentDate where the weekday
does not match. The server will reject it and
the client will see an error.

Output appointmentDate as YYYY-MM-DD and
appointmentTime as HH:MM in Europe/Dublin time.`,
    "NEVER treat a booking as final until the user explicitly approves a recap. Do not imply the appointment is booked until then.",
    "When you have collected client name, client email, service, date (YYYY-MM-DD), and time (HH:MM), first enter confirmation state:",
    'In your reply text, ask clearly: "Just to confirm your booking:" then list Name, Service, Date (weekday + YYYY-MM-DD) at time, then ask: "Shall I confirm this? Reply Yes to book or No to change anything."',
    "In the same turn, set awaitingBookingConfirmation=true and include bookingPayload with all fields (optional clientPhone, optional appointmentWeekday must match Dublin weekday for appointmentDate).",
    "awaitingBookingConfirmation must be false while you are still collecting missing fields.",
    "Only set awaitingBookingConfirmation=true when every required field is present and you are showing the confirmation recap.",
    "If the user replies No or wants to change something, set awaitingBookingConfirmation=false, help them adjust, then later set awaitingBookingConfirmation=true again with an updated bookingPayload.",
    "If the user replies with clear approval (Yes, confirm, book it, etc.), you may briefly acknowledge — the server will finalize the booking; keep your reply short.",
    "Respond as strict JSON only:",
    '{"reply":"string","awaitingBookingConfirmation":boolean,"bookingPayload":{"clientName":"string","clientEmail":"string","clientPhone":"string","serviceName":"string","appointmentDate":"YYYY-MM-DD","appointmentTime":"HH:MM","appointmentWeekday":"string"}}',
    "When awaitingBookingConfirmation is false, bookingPayload may be null or omitted.",
    pendingContext,
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

  let aiText = "";
  if (!skipClaude) {
    try {
      aiText = await callClaudeSystem(anthropicApiKey, systemPrompt, fullConversation);
    } catch (e) {
      return fail("claude_request", e, 500, { businessId: business.id, sessionId });
    }
  }

  if (!skipClaude) {
    const parsedAi = parseClaudeJson(aiText);
    finalReply = parsedAi.reply;

    if (parsedAi.awaitingBookingConfirmation && parsedAi.bookingPayload) {
      const validated = validateDublinBookingPayload(parsedAi.bookingPayload);
      if (validated.ok) {
        pendingBookingToStore = validated.normalized;
      } else {
        finalReply = `${validated.error} Please adjust the date or time and we will try again.`;
      }
    }
  } else if (!finalReply) {
    finalReply = "Thanks — one moment.";
  }

  const updatedMessages = [
    ...fullConversation,
    { role: "assistant" as const, content: finalReply, ts: new Date().toISOString() },
  ];

  const conversationUpdateBase = {
    messages: updatedMessages,
    status: finalStatus,
    client_id: clientId,
  };

  if (conversationRow?.id) {
    const updatePayload: Record<string, unknown> = { ...conversationUpdateBase };
    if (pendingBookingToStore !== undefined) {
      updatePayload.pending_booking = pendingBookingToStore;
    }
    const { error: conversationUpdateError } = await supabaseAdmin
      .from("widget_conversations")
      .update(updatePayload as never)
      .eq("id", conversationRow.id);
    if (conversationUpdateError) {
      return fail("save_conversation_update", conversationUpdateError.message, 500, {
        conversationId: conversationRow.id,
      });
    }
  } else {
    const insertPayload: Record<string, unknown> = {
      business_id: business.id,
      session_id: sessionId,
      ...conversationUpdateBase,
    };
    if (pendingBookingToStore !== undefined) {
      insertPayload.pending_booking = pendingBookingToStore;
    }
    const { error: conversationInsertError } = await supabaseAdmin
      .from("widget_conversations")
      .insert(insertPayload as never);
    if (conversationInsertError) {
      return fail("save_conversation_insert", conversationInsertError.message, 500, {
        businessId: business.id,
        sessionId,
      });
    }
  }

  return jsonWithCors({
    reply: finalReply,
    businessName: business.name,
    status: finalStatus,
  });
}

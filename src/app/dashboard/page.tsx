"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { DateTime } from "luxon";
import { appointmentAtDublinToUtcIso } from "@/lib/dublin-appointment";
import { supabase } from "@/lib/supabase";

type AppointmentStatus = "confirmed" | "cancelled" | "no_response";

type Appointment = {
  id: string;
  client_name: string;
  client_phone: string;
  client_email: string | null;
  appointment_at: string;
  status: AppointmentStatus;
};

type ConversationStatus = "active" | "booked" | "abandoned";

type ConversationMessage = {
  role?: string;
  content?: string;
  ts?: string;
};

type ConversationRow = {
  id: string;
  session_id: string;
  messages: ConversationMessage[] | null;
  status: ConversationStatus;
  client_id: string | null;
  created_at: string;
};

type AccessStatus = {
  allowed: boolean;
  trialEndsAt: string | null;
  reason?: string;
};

const PHONE_PREFIX = "+353";

function dublinDateString(iso: string) {
  return new Date(iso).toLocaleDateString("en-CA", { timeZone: "Europe/Dublin" });
}

function todayDublin() {
  return new Date().toLocaleDateString("en-CA", { timeZone: "Europe/Dublin" });
}

function friendlyGenericMessage() {
  return "Something went wrong. Please try again.";
}

function ClockIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </svg>
  );
}

const timeAccentStyles: Record<
  "emerald" | "rose" | "slate",
  { icon: string; text: string }
> = {
  emerald: { icon: "text-emerald-600/90", text: "text-emerald-900" },
  rose: { icon: "text-rose-600/90", text: "text-rose-900" },
  slate: { icon: "text-slate-500", text: "text-slate-800" },
};

function AppointmentTimeRow({
  timeText,
  accent,
}: {
  timeText: string;
  accent: "emerald" | "rose" | "slate";
}) {
  const { icon, text } = timeAccentStyles[accent];

  return (
    <p className={`mt-1 flex items-center gap-2 text-sm font-medium ${text}`}>
      <ClockIcon className={`h-4 w-4 shrink-0 ${icon}`} />
      <span>{timeText}</span>
    </p>
  );
}

function statusAccent(status: AppointmentStatus): "emerald" | "rose" | "slate" {
  if (status === "confirmed") return "emerald";
  if (status === "cancelled") return "rose";
  return "slate";
}

function statusLabel(status: AppointmentStatus) {
  if (status === "confirmed") return "Confirmed";
  if (status === "cancelled") return "Cancelled";
  return "No reply";
}

function formatAppointmentDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-IE", {
    timeZone: "Europe/Dublin",
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function formatDateGroupHeading(dateKey: string) {
  return DateTime.fromISO(dateKey, { zone: "Europe/Dublin" }).toLocaleString(
    DateTime.DATE_FULL,
    { locale: "en-IE" }
  );
}

const cardToneByStatus: Record<AppointmentStatus, string> = {
  confirmed: "border-emerald-100 bg-emerald-50/50",
  cancelled: "border-rose-100 bg-rose-50/50",
  no_response:
    "border-slate-200/70 bg-slate-100/70 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.6)]",
};

const statusBadgeClass: Record<AppointmentStatus, string> = {
  confirmed: "bg-emerald-100 text-emerald-900",
  cancelled: "bg-rose-100 text-rose-900",
  no_response: "border border-amber-200/90 bg-amber-100 text-amber-900",
};

const conversationStatusBadgeClass: Record<ConversationStatus, string> = {
  active: "bg-sky-100 text-sky-900",
  booked: "bg-emerald-100 text-emerald-900",
  abandoned: "bg-slate-200 text-slate-700",
};

export default function DashboardPage() {
  const router = useRouter();
  const [authChecked, setAuthChecked] = useState(false);
  const [session, setSession] = useState<Session | null>(null);
  const [clientName, setClientName] = useState("");
  const [clientPhone, setClientPhone] = useState(PHONE_PREFIX);
  const [clientEmail, setClientEmail] = useState("");
  const [appointmentDate, setAppointmentDate] = useState(() => todayDublin());
  const [appointmentTime, setAppointmentTime] = useState("");
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [appointmentsLoading, setAppointmentsLoading] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [reminderSendingId, setReminderSendingId] = useState<string | null>(null);
  const [reminderNote, setReminderNote] = useState<{
    id: string;
    text: string;
    ok: boolean;
  } | null>(null);
  const [accessStatus, setAccessStatus] = useState<AccessStatus | null>(null);
  const [showSetupBanner, setShowSetupBanner] = useState(false);
  const [businessId, setBusinessId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"appointments" | "conversations">("appointments");
  const [conversations, setConversations] = useState<ConversationRow[]>([]);
  const [conversationsLoading, setConversationsLoading] = useState(false);
  const [expandedConversationId, setExpandedConversationId] = useState<string | null>(null);
  const [conversationClients, setConversationClients] = useState<
    Record<string, { name: string | null; email: string | null }>
  >({});

  useEffect(() => {
    if (!supabase) {
      queueMicrotask(() => setAuthChecked(true));
      return;
    }

    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      if (!data.session) {
        router.replace("/login");
      }
      setAuthChecked(true);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
      if (!newSession) {
        setAppointments([]);
        setAccessStatus(null);
        router.replace("/login");
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [router]);

  useEffect(() => {
    if (!session) return;

    void (async () => {
      if (!supabase) return;
      const { data: business } = await supabase
        .from("businesses")
        .select("id")
        .eq("user_id", session.user.id)
        .maybeSingle();
      if (!business) {
        const createdMs = session.user.created_at
          ? new Date(session.user.created_at).getTime()
          : Number.NaN;
        const isNewUser = Number.isFinite(createdMs) && Date.now() - createdMs < 60 * 60 * 1000;
        if (isNewUser) {
          router.replace("/onboarding");
          return;
        }
        setShowSetupBanner(true);
      } else {
        setBusinessId(business.id);
        setShowSetupBanner(false);
      }
      const allowed = await checkDashboardAccess();
      if (allowed) {
        await loadAppointments(session.user.id);
        if (business?.id) {
          await loadConversations(session.user.id);
        }
      } else {
        setAppointments([]);
      }
    })();
  }, [session, router, loadConversations]);

  useEffect(() => {
    if (activeTab !== "conversations" || !session) return;
    void loadConversations(session.user.id);
  }, [activeTab, session, loadConversations]);

  useEffect(() => {
    if (!addOpen) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setAddOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [addOpen]);

  useEffect(() => {
    if (!pendingDeleteId) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setPendingDeleteId(null);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [pendingDeleteId]);

  async function loadAppointments(userId: string) {
    if (!supabase) return;

    setAppointmentsLoading(true);
    const { data, error } = await supabase
      .from("appointments")
      .select("id, client_name, client_phone, client_email, appointment_at, status")
      .eq("user_id", userId)
      .order("appointment_at", { ascending: false });

    if (error) {
      setMessage(friendlyGenericMessage());
      setAppointmentsLoading(false);
      return;
    }

    setAppointments((data ?? []) as Appointment[]);
    setAppointmentsLoading(false);
  }

  const loadConversations = useCallback(async (userId: string) => {
    if (!supabase) return;

    setConversationsLoading(true);
    const { data: businessRows, error: businessesError } = await supabase
      .from("businesses")
      .select("id")
      .eq("user_id", userId);

    if (businessesError) {
      console.error("[dashboard] conversations businesses lookup failed", businessesError);
      setMessage(friendlyGenericMessage());
      setConversationsLoading(false);
      return;
    }

    const businessIds = (businessRows ?? []).map((row) => row.id as string).filter(Boolean);
    if (businessIds.length === 0) {
      console.info("[dashboard] no businesses found for user conversations", { userId });
      setConversations([]);
      setConversationClients({});
      setConversationsLoading(false);
      return;
    }

    console.info("[dashboard] loading conversations", {
      userId,
      businessId,
      businessIds,
    });

    const { count } = await supabase
      .from("widget_conversations")
      .select("id", { count: "exact", head: true })
      .in("business_id", businessIds);
    console.info("[dashboard] widget_conversations count", { businessIds, count });

    const { data, error } = await supabase
      .from("widget_conversations")
      .select("id, session_id, messages, status, client_id, created_at")
      .in("business_id", businessIds)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("[dashboard] conversations query failed", { businessIds, error });
      setMessage(friendlyGenericMessage());
      setConversationsLoading(false);
      return;
    }

    console.info("[dashboard] conversations loaded", { businessIds, rows: (data ?? []).length });

    const rows = ((data ?? []) as ConversationRow[]).map((row) => ({
      ...row,
      messages: Array.isArray(row.messages) ? row.messages : [],
    }));
    setConversations(rows);

    const clientIds = [...new Set(rows.map((row) => row.client_id).filter(Boolean))] as string[];
    if (clientIds.length > 0) {
      const { data: clients } = await supabase
        .from("showup_clients")
        .select("id, name, email")
        .in("id", clientIds);
      const clientMap: Record<string, { name: string | null; email: string | null }> = {};
      for (const client of clients ?? []) {
        clientMap[(client as { id: string }).id] = {
          name: (client as { name: string | null }).name,
          email: (client as { email: string | null }).email,
        };
      }
      setConversationClients(clientMap);
    } else {
      setConversationClients({});
    }

    setConversationsLoading(false);
  }, [businessId]);

  async function checkDashboardAccess() {
    if (!supabase) return false;

    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData.session?.access_token;
    if (!token) {
      setAccessStatus({ allowed: false, trialEndsAt: null, reason: "unauthorized" });
      return false;
    }

    let res: Response;
    try {
      res = await fetch("/api/account/access-status", {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
    } catch {
      setAccessStatus({ allowed: false, trialEndsAt: null, reason: "network" });
      setMessage(friendlyGenericMessage());
      return false;
    }

    const data = (await res.json().catch(() => ({}))) as AccessStatus & { error?: string };
    if (!res.ok) {
      setAccessStatus({ allowed: false, trialEndsAt: null, reason: data.error ?? "error" });
      setMessage(friendlyGenericMessage());
      return false;
    }

    setAccessStatus({
      allowed: Boolean(data.allowed),
      trialEndsAt: data.trialEndsAt ?? null,
      reason: data.reason,
    });
    return Boolean(data.allowed);
  }

  async function handleLogOut() {
    if (!supabase) return;

    setLoading(true);
    setMessage(null);

    const { error } = await supabase.auth.signOut();

    if (error) {
      setMessage(friendlyGenericMessage());
    } else {
      setMessage(null);
      router.replace("/");
    }

    setLoading(false);
  }

  async function handleAddAppointment(e: React.SyntheticEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!supabase || !session) return;

    setLoading(true);
    setMessage(null);

    let appointmentAtIso: string;
    try {
      appointmentAtIso = appointmentAtDublinToUtcIso(appointmentDate, appointmentTime);
    } catch {
      setMessage("That date or time doesn’t look right. Please try again.");
      setLoading(false);
      return;
    }

    const trimmedEmail = clientEmail.trim();
    if (!trimmedEmail) {
      setMessage("Client email is required to send reminders.");
      setLoading(false);
      return;
    }
    const { data: inserted, error } = await supabase
      .from("appointments")
      .insert({
        user_id: session.user.id,
        client_name: clientName.trim(),
        client_phone: clientPhone.trim(),
        client_email: trimmedEmail,
        confirmation_token: crypto.randomUUID(),
        appointment_at: appointmentAtIso,
      })
      .select("id")
      .single();

    if (error) {
      setMessage(friendlyGenericMessage());
      setLoading(false);
      return;
    }

    if (inserted?.id) {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      if (token) {
        try {
          await fetch("/api/appointments/booking-confirmation", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({ appointmentId: inserted.id }),
          });
        } catch {
          // Booking email is best-effort; appointment is already saved.
        }
      }
    }

    setClientName("");
    setClientPhone(PHONE_PREFIX);
    setClientEmail("");
    setAppointmentDate(todayDublin());
    setAppointmentTime("");
    setMessage("Saved. We’ll remind them by email before their appointment.");
    setAddOpen(false);
    await loadAppointments(session.user.id);
    setLoading(false);
  }

  async function sendReminderNow(appointmentId: string) {
    if (!supabase || !session) return;

    setReminderSendingId(appointmentId);
    setReminderNote(null);

    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData.session?.access_token;
    if (!token) {
      setReminderNote({
        id: appointmentId,
        text: "Session expired. Sign in again.",
        ok: false,
      });
      setReminderSendingId(null);
      return;
    }

    let res: Response;
    try {
      res = await fetch("/api/reminders/send-one", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ appointmentId }),
      });
    } catch {
      setReminderNote({
        id: appointmentId,
        text: "Couldn't send reminder",
        ok: false,
      });
      setReminderSendingId(null);
      return;
    }

    const json = (await res.json().catch(() => ({}))) as { error?: string };
    setReminderSendingId(null);

    if (res.ok) {
      setReminderNote({ id: appointmentId, text: "Reminder sent", ok: true });
    } else {
      setReminderNote({
        id: appointmentId,
        text: json.error ?? "Couldn't send reminder",
        ok: false,
      });
    }
  }

  async function handleDeleteAppointment(id: string) {
    if (!supabase || !session) return;

    setLoading(true);
    setMessage(null);

    const { error } = await supabase
      .from("appointments")
      .delete()
      .eq("id", id)
      .eq("user_id", session.user.id);

    if (error) {
      setMessage(friendlyGenericMessage());
      setLoading(false);
      setPendingDeleteId(null);
      return;
    }

    setPendingDeleteId(null);
    await loadAppointments(session.user.id);
    setLoading(false);
  }

  function formatTime(isoDate: string) {
    return new Date(isoDate).toLocaleTimeString("en-IE", {
      timeZone: "Europe/Dublin",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  const allTimeStats = useMemo(() => {
    let confirmed = 0;
    let cancelled = 0;
    let awaiting = 0;
    for (const a of appointments) {
      if (a.status === "confirmed") confirmed += 1;
      else if (a.status === "cancelled") cancelled += 1;
      else awaiting += 1;
    }
    return {
      total: appointments.length,
      confirmed,
      cancelled,
      awaiting,
    };
  }, [appointments]);

  const statsSummary = useMemo(() => {
    if (appointmentsLoading) return "Loading…";
    const { total, confirmed, cancelled, awaiting } = allTimeStats;
    if (total === 0) return "No appointments yet.";
    const apptWord = total === 1 ? "appointment" : "appointments";
    return `${total} ${apptWord} in total — ${confirmed} confirmed, ${cancelled} cancelled, ${awaiting} awaiting reply`;
  }, [appointmentsLoading, allTimeStats]);

  const appointmentsByDate = useMemo(() => {
    const map = new Map<string, Appointment[]>();
    for (const a of appointments) {
      const key = dublinDateString(a.appointment_at);
      const list = map.get(key);
      if (list) list.push(a);
      else map.set(key, [a]);
    }
    const keys = [...map.keys()].sort((a, b) => b.localeCompare(a));
    for (const k of keys) {
      const list = map.get(k);
      if (list) {
        list.sort(
          (x, y) =>
            new Date(x.appointment_at).getTime() - new Date(y.appointment_at).getTime()
        );
      }
    }
    return keys.map((dateKey) => ({
      dateKey,
      items: map.get(dateKey) ?? [],
    }));
  }, [appointments]);

  if (!supabase) {
    return (
      <div className="min-h-screen bg-slate-50 px-4 py-10">
        <p className="mx-auto max-w-lg text-center text-slate-600">
          This app isn’t fully set up yet. Ask your developer to finish configuration.
        </p>
      </div>
    );
  }

  if (!authChecked) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-emerald-50/40 via-slate-50 to-slate-100">
        <p className="text-sm text-slate-600">Loading…</p>
      </div>
    );
  }

  if (!session) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-emerald-50/40 via-slate-50 to-slate-100 pb-10">
      <header className="sticky top-0 z-20 border-b border-slate-200/80 bg-white/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <div className="flex items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-600 text-lg font-bold text-white shadow-sm">
              S
            </span>
            <div className="leading-tight">
              <p className="text-base font-semibold tracking-tight text-slate-900">
                ShowUp
              </p>
              <p className="text-xs text-slate-500">Fewer no-shows</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href="/settings"
              className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50"
            >
              Settings
            </Link>
            <button
              type="button"
              onClick={handleLogOut}
              disabled={loading}
              className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:opacity-50"
            >
              {loading ? "Signing out…" : "Sign out"}
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 pt-6 sm:px-6 sm:pt-8">
        {accessStatus && !accessStatus.allowed ? (
          <div className="mx-auto mt-8 w-full max-w-2xl rounded-3xl border border-amber-200 bg-white/95 px-6 py-10 text-center shadow-sm sm:px-10">
            <h1 className="text-2xl font-semibold text-slate-900 sm:text-3xl">
              Your free trial has ended
            </h1>
            <p className="mt-3 text-base leading-7 text-slate-700">
              To keep using ShowUp contact{" "}
              <a
                href="mailto:isaac@showupapp.org"
                className="font-semibold text-emerald-700 underline decoration-emerald-300 underline-offset-4"
              >
                isaac@showupapp.org
              </a>{" "}
              to get started.
            </p>
          </div>
        ) : (
          <>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h1 className="text-2xl font-semibold text-slate-900 sm:text-3xl">
                  Today
                </h1>
                <p className="mt-1 text-sm text-slate-600">
                  {new Date().toLocaleDateString("en-IE", {
                    weekday: "long",
                    day: "numeric",
                    month: "long",
                    timeZone: "Europe/Dublin",
                  })}
                </p>
                <p className="mt-2 text-sm font-medium text-slate-700">{statsSummary}</p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setMessage(null);
                  setAddOpen(true);
                }}
                className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-emerald-600/25 transition hover:bg-emerald-700 sm:w-auto"
              >
                <span className="text-lg leading-none">+</span>
                Add appointment
              </button>
            </div>
            {showSetupBanner ? (
              <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-4 shadow-sm sm:flex sm:items-center sm:justify-between sm:gap-4">
                <p className="text-sm font-medium text-emerald-900">
                  Complete your AI setup to get your booking widget. It takes 2 minutes.
                </p>
                <Link
                  href="/onboarding"
                  className="mt-3 inline-flex rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 sm:mt-0"
                >
                  Set up now
                </Link>
              </div>
            ) : null}

            <div className="mt-4 inline-flex rounded-xl border border-slate-200 bg-white p-1 shadow-sm">
              <button
                type="button"
                onClick={() => setActiveTab("appointments")}
                className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${
                  activeTab === "appointments"
                    ? "bg-emerald-600 text-white"
                    : "text-slate-700 hover:bg-slate-100"
                }`}
              >
                Appointments
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("conversations")}
                className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${
                  activeTab === "conversations"
                    ? "bg-emerald-600 text-white"
                    : "text-slate-700 hover:bg-slate-100"
                }`}
              >
                Conversations
              </button>
            </div>

            {activeTab === "appointments" ? (
              <>
                <div className="mt-6 grid gap-4 lg:grid-cols-3">
              <section className="rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-4 shadow-sm">
                <p className="text-xs font-semibold uppercase tracking-wide text-emerald-800">
                  Confirmed
                </p>
                  <p className="mt-1 text-3xl font-bold text-emerald-700">
                    {allTimeStats.confirmed}
                  </p>
              </section>

              <section className="rounded-2xl border border-rose-100 bg-rose-50 px-4 py-4 shadow-sm">
                <p className="text-xs font-semibold uppercase tracking-wide text-rose-800">
                  Cancelled
                </p>
                  <p className="mt-1 text-3xl font-bold text-rose-700">
                    {allTimeStats.cancelled}
                  </p>
              </section>

              <section className="rounded-2xl border border-slate-200 bg-slate-100 px-4 py-4 shadow-sm">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-600">
                  No reply yet
                </p>
                  <p className="mt-1 text-3xl font-bold text-slate-700">
                    {allTimeStats.awaiting}
                  </p>
              </section>
            </div>

                <div className="mt-10">
              <h2 className="text-lg font-semibold text-slate-900">Appointments</h2>
              <p className="mt-1 text-sm text-slate-600">Newest days first.</p>

              {appointmentsLoading ? (
                <p className="mt-4 text-sm text-slate-500">Loading…</p>
              ) : appointments.length === 0 ? (
                <p className="mt-4 text-sm text-slate-500">No appointments yet.</p>
              ) : (
                <div className="mt-6 space-y-8">
                  {appointmentsByDate.map(({ dateKey, items }) => (
                    <div key={dateKey}>
                      <h3 className="border-b border-slate-200 pb-2 text-base font-semibold text-slate-800">
                        {formatDateGroupHeading(dateKey)}
                      </h3>
                      <ul className="mt-3 space-y-3">
                        {items.map((a) => {
                          const accent = statusAccent(a.status);
                          return (
                            <li key={a.id}>
                              <article
                                className={`rounded-xl border p-3 sm:flex sm:items-start sm:justify-between sm:gap-4 ${cardToneByStatus[a.status]}`}
                              >
                                <div className="min-w-0 flex-1">
                                  <p className="font-semibold text-slate-900">
                                    {a.client_name}
                                  </p>
                                  <p className="text-xs text-slate-600">{a.client_phone}</p>
                                  {a.client_email ? (
                                    <p className="text-xs text-slate-600">{a.client_email}</p>
                                  ) : null}
                                  <p className="mt-1 text-sm text-slate-700">
                                    {formatAppointmentDate(a.appointment_at)}
                                  </p>
                                  <AppointmentTimeRow
                                    timeText={formatTime(a.appointment_at)}
                                    accent={accent}
                                  />
                                  <p
                                    className={`mt-2 inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${statusBadgeClass[a.status]}`}
                                  >
                                    {statusLabel(a.status)}
                                  </p>
                                </div>
                                <div className="mt-3 flex shrink-0 flex-col items-stretch gap-2 sm:mt-0 sm:items-end">
                                  {a.status === "no_response" && a.client_email ? (
                                    <>
                                      <button
                                        type="button"
                                        onClick={() => void sendReminderNow(a.id)}
                                        disabled={loading || reminderSendingId === a.id}
                                        className="inline-flex h-9 w-full min-w-[10.5rem] items-center justify-center rounded-lg border border-emerald-500/55 bg-white px-3 text-sm font-medium text-emerald-800 transition hover:bg-emerald-50 disabled:opacity-50 sm:w-auto"
                                      >
                                        {reminderSendingId === a.id
                                          ? "Sending…"
                                          : "Send reminder now"}
                                      </button>
                                      {reminderNote?.id === a.id ? (
                                        <p
                                          className={`text-right text-xs font-medium ${
                                            reminderNote.ok
                                              ? "text-emerald-700"
                                              : "text-rose-700"
                                          }`}
                                        >
                                          {reminderNote.text}
                                        </p>
                                      ) : null}
                                    </>
                                  ) : null}
                                  <button
                                    type="button"
                                    onClick={() => setPendingDeleteId(a.id)}
                                    disabled={loading}
                                    className="inline-flex h-9 w-full min-w-[10.5rem] items-center justify-center rounded-lg border border-rose-500/55 bg-white px-3 text-sm font-medium text-rose-800 transition hover:bg-rose-50 disabled:opacity-50 sm:w-auto"
                                  >
                                    Delete
                                  </button>
                                </div>
                              </article>
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  ))}
                </div>
              )}
            </div>
              </>
            ) : (
              <div className="mt-8">
                <h2 className="text-lg font-semibold text-slate-900">Conversations</h2>
                <p className="mt-1 text-sm text-slate-600">Most recent chats first.</p>

                {conversationsLoading ? (
                  <p className="mt-4 text-sm text-slate-500">Loading…</p>
                ) : conversations.length === 0 ? (
                  <p className="mt-4 text-sm text-slate-500">
                    No conversations yet. Once clients chat with your AI, their conversations will
                    appear here.
                  </p>
                ) : (
                  <div className="mt-6 space-y-3">
                    {conversations.map((conversation) => {
                      const messageCount = conversation.messages?.length ?? 0;
                      const client =
                        conversation.client_id ? conversationClients[conversation.client_id] : null;
                      const isOpen = expandedConversationId === conversation.id;
                      return (
                        <article
                          key={conversation.id}
                          className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
                        >
                          <button
                            type="button"
                            onClick={() =>
                              setExpandedConversationId((prev) =>
                                prev === conversation.id ? null : conversation.id
                              )
                            }
                            className="w-full text-left"
                          >
                            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                              <div>
                                <p className="text-sm font-semibold text-slate-900">
                                  {new Date(conversation.created_at).toLocaleString("en-IE", {
                                    timeZone: "Europe/Dublin",
                                    weekday: "short",
                                    year: "numeric",
                                    month: "short",
                                    day: "numeric",
                                    hour: "2-digit",
                                    minute: "2-digit",
                                  })}
                                </p>
                                {conversation.status === "booked" && client ? (
                                  <p className="mt-1 text-xs text-slate-600">
                                    {client.name || "Client"} {client.email ? `• ${client.email}` : ""}
                                  </p>
                                ) : null}
                                <p className="mt-1 text-xs text-slate-500">
                                  {messageCount} {messageCount === 1 ? "message" : "messages"}
                                </p>
                              </div>
                              <div className="flex items-center gap-2">
                                <span
                                  className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${conversationStatusBadgeClass[conversation.status]}`}
                                >
                                  {conversation.status}
                                </span>
                                <span className="text-xs font-medium text-slate-500">
                                  {isOpen ? "Hide" : "View"}
                                </span>
                              </div>
                            </div>
                          </button>

                          {isOpen ? (
                            <div className="mt-4 space-y-2 rounded-xl border border-slate-200 bg-slate-50 p-3">
                              {(conversation.messages ?? []).length === 0 ? (
                                <p className="text-sm text-slate-500">No transcript available.</p>
                              ) : (
                                (conversation.messages ?? []).map((msg, index) => {
                                  const role =
                                    msg.role === "assistant" || msg.role === "bot"
                                      ? "assistant"
                                      : "user";
                                  return (
                                    <div
                                      key={`${conversation.id}-${index}`}
                                      className={`max-w-[90%] rounded-xl px-3 py-2 text-sm ${
                                        role === "user"
                                          ? "ml-auto bg-emerald-600 text-white"
                                          : "mr-auto border border-slate-200 bg-white text-slate-800"
                                      }`}
                                    >
                                      {msg.content || "…"}
                                    </div>
                                  );
                                })
                              )}
                            </div>
                          ) : null}
                        </article>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </>
        )}

        {message ? (
          <output className="mx-auto mt-6 block max-w-lg rounded-2xl border border-slate-200 bg-white px-4 py-3 text-center text-sm text-slate-700 shadow-sm">
            {message}
          </output>
        ) : null}
      </main>

      {session && addOpen ? (
        <div className="fixed inset-0 z-30 flex items-end justify-center p-0 sm:items-center sm:p-4">
          <button
            type="button"
            className="absolute inset-0 bg-slate-900/40"
            aria-label="Close"
            onClick={() => setAddOpen(false)}
          />
          <div
            className="relative z-10 max-h-[90vh] w-full overflow-y-auto rounded-t-3xl bg-white shadow-2xl sm:max-w-md sm:rounded-3xl"
            role="dialog"
            aria-modal="true"
            aria-labelledby="add-title"
          >
            <div className="border-b border-slate-100 px-5 py-4">
              <h2 id="add-title" className="text-lg font-semibold text-slate-900">
                New appointment
              </h2>
              <p className="text-sm text-slate-500">
                We’ll email them before their appointment. Phone is optional.
              </p>
            </div>
            <form onSubmit={handleAddAppointment} className="space-y-4 px-5 py-4">
              <label className="block space-y-1.5">
                <span className="text-sm font-medium text-slate-700">First name</span>
                <input
                  type="text"
                  autoComplete="given-name"
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                  required
                  className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-slate-900 outline-none ring-emerald-500/30 focus:border-emerald-500 focus:ring-2"
                />
              </label>
              <label className="block space-y-1.5">
                <span className="text-sm font-medium text-slate-700">Mobile number</span>
                <input
                  type="tel"
                  inputMode="tel"
                  autoComplete="tel"
                  value={clientPhone}
                  onChange={(e) => setClientPhone(e.target.value)}
                  placeholder="Phone (optional)"
                  className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-slate-900 outline-none ring-emerald-500/30 focus:border-emerald-500 focus:ring-2"
                />
              </label>
              <label className="block space-y-1.5">
                <span className="text-sm font-medium text-slate-700">Client email</span>
                <input
                  type="email"
                  inputMode="email"
                  autoComplete="email"
                  value={clientEmail}
                  onChange={(e) => setClientEmail(e.target.value)}
                  placeholder="name@example.com"
                  required
                  className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-slate-900 outline-none ring-emerald-500/30 focus:border-emerald-500 focus:ring-2"
                />
              </label>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <label className="block space-y-1.5">
                  <span className="text-sm font-medium text-slate-700">Date</span>
                  <input
                    type="date"
                    value={appointmentDate}
                    onChange={(e) => setAppointmentDate(e.target.value)}
                    required
                    className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-slate-900 outline-none ring-emerald-500/30 focus:border-emerald-500 focus:ring-2"
                  />
                </label>
                <label className="block space-y-1.5">
                  <span className="text-sm font-medium text-slate-700">Time</span>
                  <input
                    type="time"
                    value={appointmentTime}
                    onChange={(e) => setAppointmentTime(e.target.value)}
                    required
                    className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-slate-900 outline-none ring-emerald-500/30 focus:border-emerald-500 focus:ring-2"
                  />
                </label>
              </div>
              <div className="flex flex-col gap-2 pt-2 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={() => setAddOpen(false)}
                  className="rounded-xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="rounded-xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white shadow-md shadow-emerald-600/20 hover:bg-emerald-700 disabled:opacity-60"
                >
                  {loading ? "Saving…" : "Save & schedule reminders"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      {session && pendingDeleteId ? (
        <div className="fixed inset-0 z-40 flex items-center justify-center p-4">
          <button
            type="button"
            className="absolute inset-0 bg-slate-900/40"
            aria-label="Close"
            onClick={() => setPendingDeleteId(null)}
          />
          <div
            className="relative z-10 w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-6 shadow-xl"
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-confirm-title"
          >
            <p id="delete-confirm-title" className="text-center text-base font-semibold text-slate-900">
              Are you sure?
            </p>
            <p className="mt-2 text-center text-sm text-slate-600">
              This appointment will be removed for good.
            </p>
            <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => setPendingDeleteId(null)}
                className="rounded-xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void handleDeleteAppointment(pendingDeleteId)}
                disabled={loading}
                className="rounded-xl bg-rose-600 px-4 py-3 text-sm font-semibold text-white shadow-sm hover:bg-rose-700 disabled:opacity-60"
              >
                {loading ? "Removing…" : "Yes, remove"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

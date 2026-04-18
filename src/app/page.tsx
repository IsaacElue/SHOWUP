"use client";

import { useEffect, useMemo, useState } from "react";
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

const PHONE_PREFIX = "+353";

function dublinDateString(iso: string) {
  return new Date(iso).toLocaleDateString("en-CA", { timeZone: "Europe/Dublin" });
}

function todayDublin() {
  return new Date().toLocaleDateString("en-CA", { timeZone: "Europe/Dublin" });
}

function friendlyAuthMessage(raw: string) {
  const lower = raw.toLowerCase();
  if (lower.includes("invalid login") || lower.includes("invalid credentials")) {
    return "That email or password doesn’t look right. Please try again.";
  }
  if (lower.includes("email not confirmed")) {
    return "Please confirm your email first, then try signing in.";
  }
  return raw;
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
  no_response: "bg-slate-200/80 text-slate-800",
};

export default function Home() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
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

  useEffect(() => {
    if (!supabase) return;

    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
      if (!newSession) {
        setAppointments([]);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!session) return;

    void loadAppointments(session.user.id);
  }, [session]);

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

  async function handleSignUp(e: React.SyntheticEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!supabase) return;

    setLoading(true);
    setMessage(null);

    const { error } = await supabase.auth.signUp({ email, password });

    if (error) {
      setMessage(friendlyAuthMessage(error.message));
    } else {
      setMessage(
        "You’re almost there — check your inbox to confirm your email, then sign in below."
      );
    }

    setLoading(false);
  }

  async function handleLogIn(e: React.SyntheticEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!supabase) return;

    setLoading(true);
    setMessage(null);

    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      setMessage(friendlyAuthMessage(error.message));
    } else {
      setMessage(null);
    }

    setLoading(false);
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
    const { error } = await supabase.from("appointments").insert({
      user_id: session.user.id,
      client_name: clientName.trim(),
      client_phone: clientPhone.trim(),
      client_email: trimmedEmail === "" ? null : trimmedEmail,
      confirmation_token: crypto.randomUUID(),
      appointment_at: appointmentAtIso,
    });

    if (error) {
      setMessage(friendlyGenericMessage());
      setLoading(false);
      return;
    }

    setClientName("");
    setClientPhone(PHONE_PREFIX);
    setClientEmail("");
    setAppointmentDate(todayDublin());
    setAppointmentTime("");
    setMessage(
      trimmedEmail
        ? "Saved. We’ll remind them by text and email before the visit."
        : "Saved. We’ll remind them by text before the visit."
    );
    setAddOpen(false);
    await loadAppointments(session.user.id);
    setLoading(false);
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
          {session ? (
            <button
              type="button"
              onClick={handleLogOut}
              disabled={loading}
              className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:opacity-50"
            >
              {loading ? "Signing out…" : "Sign out"}
            </button>
          ) : null}
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 pt-6 sm:px-6 sm:pt-8">
        {!session ? (
          <div className="mx-auto max-w-md space-y-6">
            <div className="text-center">
              <h1 className="text-2xl font-semibold text-slate-900 sm:text-3xl">
                Welcome back
              </h1>
              <p className="mt-2 text-sm text-slate-600">
                Sign in to see who’s coming in today.
              </p>
            </div>

            <form
              onSubmit={handleLogIn}
              className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
            >
              <label className="block space-y-1.5">
                <span className="text-sm font-medium text-slate-700">Email</span>
                <input
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-slate-900 outline-none ring-emerald-500/30 transition focus:border-emerald-500 focus:ring-2"
                />
              </label>
              <label className="block space-y-1.5">
                <span className="text-sm font-medium text-slate-700">Password</span>
                <input
                  type="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-slate-900 outline-none ring-emerald-500/30 transition focus:border-emerald-500 focus:ring-2"
                />
              </label>
              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-xl bg-emerald-600 py-3 text-sm font-semibold text-white shadow-md shadow-emerald-600/20 transition hover:bg-emerald-700 disabled:opacity-60"
              >
                {loading ? "Signing in…" : "Sign in"}
              </button>
            </form>

            <form
              onSubmit={handleSignUp}
              className="space-y-4 rounded-2xl border border-dashed border-slate-200 bg-white/70 p-5"
            >
              <p className="text-center text-sm font-medium text-slate-800">
                New here? Create an account
              </p>
              <p className="text-center text-xs text-slate-500">
                Use the same email and password you’ll use to sign in.
              </p>
              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-xl border border-slate-200 bg-white py-3 text-sm font-semibold text-slate-800 transition hover:bg-slate-50 disabled:opacity-60"
              >
                {loading ? "Please wait…" : "Create account"}
              </button>
            </form>
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
                                <button
                                  type="button"
                                  onClick={() => setPendingDeleteId(a.id)}
                                  disabled={loading}
                                  className="mt-3 shrink-0 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-rose-700 shadow-sm transition hover:bg-rose-50 disabled:opacity-50 sm:mt-0"
                                >
                                  Delete
                                </button>
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
                We’ll text them before the visit. Add their email if you want an email reminder too.
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
                  required
                  className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-slate-900 outline-none ring-emerald-500/30 focus:border-emerald-500 focus:ring-2"
                />
              </label>
              <label className="block space-y-1.5">
                <span className="text-sm font-medium text-slate-700">
                  Client email <span className="font-normal text-slate-500">(optional)</span>
                </span>
                <input
                  type="email"
                  inputMode="email"
                  autoComplete="email"
                  value={clientEmail}
                  onChange={(e) => setClientEmail(e.target.value)}
                  placeholder="name@example.com"
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

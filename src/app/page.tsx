"use client";

import { useEffect, useMemo, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";

type AppointmentStatus = "confirmed" | "cancelled" | "no_response";

type Appointment = {
  id: string;
  client_name: string;
  client_phone: string;
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

export default function Home() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [session, setSession] = useState<Session | null>(null);
  const [clientName, setClientName] = useState("");
  const [clientPhone, setClientPhone] = useState(PHONE_PREFIX);
  const [appointmentDate, setAppointmentDate] = useState(() => todayDublin());
  const [appointmentTime, setAppointmentTime] = useState("");
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [appointmentsLoading, setAppointmentsLoading] = useState(false);
  const [addOpen, setAddOpen] = useState(false);

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

  async function loadAppointments(userId: string) {
    if (!supabase) return;

    setAppointmentsLoading(true);
    const { data, error } = await supabase
      .from("appointments")
      .select("id, client_name, client_phone, appointment_at, status")
      .eq("user_id", userId)
      .order("appointment_at", { ascending: true });

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

    const combined = new Date(`${appointmentDate}T${appointmentTime}:00`);

    const { error } = await supabase.from("appointments").insert({
      user_id: session.user.id,
      client_name: clientName.trim(),
      client_phone: clientPhone.trim(),
      appointment_at: combined.toISOString(),
    });

    if (error) {
      setMessage(friendlyGenericMessage());
      setLoading(false);
      return;
    }

    setClientName("");
    setClientPhone(PHONE_PREFIX);
    setAppointmentDate(todayDublin());
    setAppointmentTime("");
    setMessage("Saved. We’ll remind them by text before the visit.");
    setAddOpen(false);
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

  const todays = useMemo(() => {
    const day = todayDublin();
    return appointments.filter((a) => dublinDateString(a.appointment_at) === day);
  }, [appointments]);

  const confirmedToday = useMemo(
    () => todays.filter((a) => a.status === "confirmed"),
    [todays]
  );
  const cancelledToday = useMemo(
    () => todays.filter((a) => a.status === "cancelled"),
    [todays]
  );
  const noResponseToday = useMemo(
    () => todays.filter((a) => a.status === "no_response"),
    [todays]
  );

  const todaySummary = useMemo(() => {
    if (appointmentsLoading) return "Loading your day…";
    const total = todays.length;
    if (total === 0) return "No appointments today.";
    const c = confirmedToday.length;
    const x = cancelledToday.length;
    const w = noResponseToday.length;
    const apptWord = total === 1 ? "appointment" : "appointments";
    return `${total} ${apptWord} today — ${c} confirmed, ${x} cancelled, ${w} awaiting reply`;
  }, [
    appointmentsLoading,
    todays.length,
    confirmedToday.length,
    cancelledToday.length,
    noResponseToday.length,
  ]);

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
                <p className="mt-2 text-sm font-medium text-slate-700">{todaySummary}</p>
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
              <section className="flex flex-col rounded-2xl border border-emerald-100 bg-white shadow-sm">
                <div className="rounded-t-2xl bg-emerald-50 px-4 py-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-emerald-800">
                    Confirmed
                  </p>
                  <p className="mt-1 text-3xl font-bold text-emerald-700">
                    {confirmedToday.length}
                  </p>
                </div>
                <div className="flex flex-1 flex-col gap-2 p-3">
                  {appointmentsLoading ? (
                    <p className="text-sm text-slate-500">Loading…</p>
                  ) : confirmedToday.length === 0 ? (
                    <p className="text-sm text-slate-500">No one here yet.</p>
                  ) : (
                    confirmedToday.map((a) => (
                      <article
                        key={a.id}
                        className="rounded-xl border border-emerald-100 bg-emerald-50/50 p-3"
                      >
                        <p className="font-semibold text-slate-900">{a.client_name}</p>
                        <p className="text-xs text-slate-600">{a.client_phone}</p>
                        <AppointmentTimeRow
                          timeText={formatTime(a.appointment_at)}
                          accent="emerald"
                        />
                      </article>
                    ))
                  )}
                </div>
              </section>

              <section className="flex flex-col rounded-2xl border border-rose-100 bg-white shadow-sm">
                <div className="rounded-t-2xl bg-rose-50 px-4 py-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-rose-800">
                    Cancelled
                  </p>
                  <p className="mt-1 text-3xl font-bold text-rose-700">
                    {cancelledToday.length}
                  </p>
                </div>
                <div className="flex flex-1 flex-col gap-2 p-3">
                  {appointmentsLoading ? (
                    <p className="text-sm text-slate-500">Loading…</p>
                  ) : cancelledToday.length === 0 ? (
                    <p className="text-sm text-slate-500">No cancellations.</p>
                  ) : (
                    cancelledToday.map((a) => (
                      <article
                        key={a.id}
                        className="rounded-xl border border-rose-100 bg-rose-50/50 p-3"
                      >
                        <p className="font-semibold text-slate-900">{a.client_name}</p>
                        <p className="text-xs text-slate-600">{a.client_phone}</p>
                        <AppointmentTimeRow
                          timeText={formatTime(a.appointment_at)}
                          accent="rose"
                        />
                      </article>
                    ))
                  )}
                </div>
              </section>

              <section className="flex flex-col rounded-2xl border border-slate-200 bg-white shadow-sm">
                <div className="rounded-t-2xl bg-slate-100 px-4 py-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-600">
                    No reply yet
                  </p>
                  <p className="mt-1 text-3xl font-bold text-slate-700">
                    {noResponseToday.length}
                  </p>
                </div>
                <div className="flex flex-1 flex-col gap-2 p-3">
                  {appointmentsLoading ? (
                    <p className="text-sm text-slate-500">Loading…</p>
                  ) : noResponseToday.length === 0 ? (
                    <p className="text-sm text-slate-500">Everyone has replied.</p>
                  ) : (
                    noResponseToday.map((a) => (
                      <article
                        key={a.id}
                        className="rounded-xl border border-slate-200/70 bg-slate-100/70 p-3 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.6)]"
                      >
                        <p className="font-semibold text-slate-900">{a.client_name}</p>
                        <p className="text-xs text-slate-600">{a.client_phone}</p>
                        <AppointmentTimeRow
                          timeText={formatTime(a.appointment_at)}
                          accent="slate"
                        />
                      </article>
                    ))
                  )}
                </div>
              </section>
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
                We’ll text them reminders before the visit.
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
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
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

export default function Home() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [session, setSession] = useState<Session | null>(null);
  const [clientName, setClientName] = useState("");
  const [clientPhone, setClientPhone] = useState("");
  const [appointmentAt, setAppointmentAt] = useState("");
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [appointmentsLoading, setAppointmentsLoading] = useState(false);

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

  async function loadAppointments(userId: string) {
    if (!supabase) return;

    setAppointmentsLoading(true);
    const { data, error } = await supabase
      .from("appointments")
      .select("id, client_name, client_phone, appointment_at, status")
      .eq("user_id", userId)
      .order("appointment_at", { ascending: true });

    if (error) {
      setMessage(error.message);
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
      setMessage(error.message);
    } else {
      setMessage(
        "Account created. Check your email for a confirmation link, then log in."
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
      setMessage(error.message);
    } else {
      setMessage("Logged in successfully.");
    }

    setLoading(false);
  }

  async function handleLogOut() {
    if (!supabase) return;

    setLoading(true);
    setMessage(null);

    const { error } = await supabase.auth.signOut();

    if (error) {
      setMessage(error.message);
    } else {
      setMessage("Logged out successfully.");
    }

    setLoading(false);
  }

  async function handleAddAppointment(e: React.SyntheticEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!supabase || !session) return;

    setLoading(true);
    setMessage(null);

    const { error } = await supabase.from("appointments").insert({
      user_id: session.user.id,
      client_name: clientName,
      client_phone: clientPhone,
      appointment_at: new Date(appointmentAt).toISOString(),
    });

    if (error) {
      setMessage(error.message);
      setLoading(false);
      return;
    }

    setClientName("");
    setClientPhone("");
    setAppointmentAt("");
    setMessage("Appointment added.");
    await loadAppointments(session.user.id);
    setLoading(false);
  }

  function formatDateTime(isoDate: string) {
    return new Date(isoDate).toLocaleString("en-IE", {
      dateStyle: "medium",
      timeStyle: "short",
    });
  }

  if (!supabase) {
    return (
      <main className="mx-auto min-h-screen w-full max-w-md p-8">
        <h1 className="mb-4 text-3xl font-bold">ShowUp</h1>
        <p className="text-amber-700">
          Add your Supabase keys to .env.local to continue.
        </p>
      </main>
    );
  }

  return (
    <main className="mx-auto min-h-screen w-full max-w-md p-8">
      <h1 className="mb-2 text-3xl font-bold">ShowUp</h1>
      <p className="mb-6 text-sm text-gray-600">
        MVP setup in progress
      </p>

      {session ? (
        <div className="space-y-4">
          <div className="space-y-2 rounded border border-gray-200 p-4">
            <p className="text-sm">
              Logged in as <strong>{session.user.email}</strong>
            </p>
            <button
              onClick={handleLogOut}
              disabled={loading}
              className="w-full rounded bg-black px-4 py-2 text-white disabled:opacity-60"
            >
              {loading ? "Please wait..." : "Log out"}
            </button>
          </div>

          <form
            onSubmit={handleAddAppointment}
            className="space-y-3 rounded border border-gray-200 p-4"
          >
            <h2 className="font-semibold">Add appointment</h2>
            <input
              type="text"
              placeholder="Client name"
              value={clientName}
              onChange={(e) => setClientName(e.target.value)}
              required
              className="w-full rounded border border-gray-300 px-3 py-2"
            />
            <input
              type="tel"
              placeholder="Client phone (+353...)"
              value={clientPhone}
              onChange={(e) => setClientPhone(e.target.value)}
              required
              className="w-full rounded border border-gray-300 px-3 py-2"
            />
            <input
              type="datetime-local"
              value={appointmentAt}
              onChange={(e) => setAppointmentAt(e.target.value)}
              required
              className="w-full rounded border border-gray-300 px-3 py-2"
            />
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded bg-black px-4 py-2 text-white disabled:opacity-60"
            >
              {loading ? "Please wait..." : "Save appointment"}
            </button>
          </form>

          <div className="space-y-3 rounded border border-gray-200 p-4">
            <h2 className="font-semibold">Status dashboard</h2>
            <div className="grid grid-cols-3 gap-2 text-sm">
              <div className="rounded bg-green-50 p-2 text-center">
                Confirmed:{" "}
                {appointments.filter((a) => a.status === "confirmed").length}
              </div>
              <div className="rounded bg-red-50 p-2 text-center">
                Cancelled:{" "}
                {appointments.filter((a) => a.status === "cancelled").length}
              </div>
              <div className="rounded bg-gray-100 p-2 text-center">
                No Response:{" "}
                {appointments.filter((a) => a.status === "no_response").length}
              </div>
            </div>
          </div>

          <div className="space-y-3 rounded border border-gray-200 p-4">
            <h2 className="font-semibold">Appointments</h2>
            {appointmentsLoading ? (
              <p className="text-sm text-gray-600">Loading appointments...</p>
            ) : appointments.length === 0 ? (
              <p className="text-sm text-gray-600">No appointments yet.</p>
            ) : (
              <ul className="space-y-2 text-sm">
                {appointments.map((appointment) => (
                  <li key={appointment.id} className="rounded bg-gray-50 p-3">
                    <p>
                      <strong>{appointment.client_name}</strong> ({appointment.client_phone})
                    </p>
                    <p>{formatDateTime(appointment.appointment_at)}</p>
                    <p>Status: {appointment.status}</p>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <form onSubmit={handleSignUp} className="space-y-3 rounded border p-4">
            <h2 className="font-semibold">Create account</h2>
            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full rounded border border-gray-300 px-3 py-2"
            />
            <input
              type="password"
              placeholder="Password (min 6 chars)"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              className="w-full rounded border border-gray-300 px-3 py-2"
            />
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded bg-black px-4 py-2 text-white disabled:opacity-60"
            >
              {loading ? "Please wait..." : "Sign up"}
            </button>
          </form>

          <form onSubmit={handleLogIn} className="space-y-3 rounded border p-4">
            <h2 className="font-semibold">Log in</h2>
            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full rounded border border-gray-300 px-3 py-2"
            />
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full rounded border border-gray-300 px-3 py-2"
            />
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded bg-gray-800 px-4 py-2 text-white disabled:opacity-60"
            >
              {loading ? "Please wait..." : "Log in"}
            </button>
          </form>
        </div>
      )}

      {message ? (
        <p className="mt-4 rounded bg-gray-100 p-3 text-sm text-gray-700">
          {message}
        </p>
      ) : null}
    </main>
  );
}

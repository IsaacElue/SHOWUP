"use client";

import { useState } from "react";

type Props = {
  token: string;
  clientName: string;
  defaultDate: string;
  defaultTime: string;
};

export function RescheduleForm({
  token,
  clientName,
  defaultDate,
  defaultTime,
}: Props) {
  const [appointmentDate, setAppointmentDate] = useState(defaultDate);
  const [appointmentTime, setAppointmentTime] = useState(defaultTime);
  const [phase, setPhase] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [ownerNotified, setOwnerNotified] = useState<boolean | null>(null);

  async function submit(e: React.SyntheticEvent<HTMLFormElement>) {
    e.preventDefault();
    setPhase("loading");
    setErrorMessage(null);
    try {
      const res = await fetch("/api/reschedule", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token,
          appointmentDate,
          appointmentTime,
        }),
      });
      const data = (await res.json()) as {
        ok?: boolean;
        error?: string;
        ownerNotified?: boolean;
      };

      if (!res.ok) {
        setErrorMessage(
          data.error === "Not found"
            ? "We couldn’t find that appointment."
            : data.error === "Invalid date or time"
              ? "That date or time doesn’t look right."
              : "Something went wrong. Please try again."
        );
        setPhase("error");
        return;
      }

      if (data.ok) {
        setOwnerNotified(Boolean(data.ownerNotified));
        setPhase("success");
      }
    } catch {
      setErrorMessage("Something went wrong. Please try again.");
      setPhase("error");
    }
  }

  if (phase === "success") {
    return (
      <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-6 py-8 text-center shadow-sm">
        <p className="text-lg font-semibold text-emerald-900">
          {ownerNotified
            ? "Thanks! The business has been asked to approve your new time. You’ll get an email when they respond."
            : "Thanks! Your request was saved. Reach out to them if you don’t hear back."}
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={(e) => void submit(e)} className="space-y-6">
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-center text-sm font-medium uppercase tracking-wide text-slate-500">
          Reschedule appointment
        </p>
        <p className="mt-3 text-center text-xl font-semibold text-slate-900">{clientName}</p>
        <p className="mt-6 text-sm font-medium text-slate-700">Pick a new date and time</p>
        <p className="mt-1 text-xs text-slate-500">Times use Ireland (Europe/Dublin).</p>
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
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
        <button
          type="submit"
          disabled={phase === "loading"}
          className="mt-6 w-full rounded-xl bg-emerald-600 px-5 py-4 text-base font-semibold text-white shadow-md transition hover:bg-emerald-700 disabled:opacity-60"
        >
          {phase === "loading" ? "Saving…" : "Save new time"}
        </button>
      </div>
      {phase === "error" && errorMessage ? (
        <p className="text-center text-sm text-rose-700">{errorMessage}</p>
      ) : null}
    </form>
  );
}

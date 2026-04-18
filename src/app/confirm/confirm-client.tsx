"use client";

import { useState } from "react";

type Props = {
  token: string;
  intent: "Y" | "N";
  clientName: string;
  whenLabel: string;
};

export function ConfirmAppointmentActions({
  token,
  intent,
  clientName,
  whenLabel,
}: Props) {
  const [phase, setPhase] = useState<"idle" | "loading" | "success" | "error">(
    "idle"
  );
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successVariant, setSuccessVariant] = useState<
    "confirmed" | "cancelled" | "alreadyConfirmed" | "alreadyCancelled"
  >("confirmed");

  const isConfirm = intent === "Y";
  const buttonLabel = isConfirm
    ? "Yes, confirm my appointment"
    : "Yes, cancel my appointment";

  async function submit() {
    setPhase("loading");
    setErrorMessage(null);
    try {
      const res = await fetch("/api/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, response: intent }),
      });
      const data = (await res.json()) as {
        ok?: boolean;
        error?: string;
        status?: string;
      };

      if (res.status === 409) {
        if (data.status === "confirmed") {
          setSuccessVariant("alreadyConfirmed");
        } else if (data.status === "cancelled") {
          setSuccessVariant("alreadyCancelled");
        }
        setPhase("success");
        return;
      }

      if (!res.ok) {
        setErrorMessage(
          data.error === "Not found"
            ? "We couldn’t find that appointment."
            : "Something went wrong. Please try again."
        );
        setPhase("error");
        return;
      }

      if (data.ok) {
        setSuccessVariant(isConfirm ? "confirmed" : "cancelled");
        setPhase("success");
      }
    } catch {
      setErrorMessage("Something went wrong. Please try again.");
      setPhase("error");
    }
  }

  if (phase === "success") {
    if (successVariant === "alreadyConfirmed" || successVariant === "confirmed") {
      return (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-6 py-8 text-center shadow-sm">
          <p className="text-lg font-semibold text-emerald-900">
            Thanks! Your appointment is confirmed.
          </p>
        </div>
      );
    }
    if (successVariant === "alreadyCancelled") {
      return (
        <div className="rounded-2xl border border-slate-200 bg-white px-6 py-8 text-center shadow-sm">
          <p className="text-lg font-semibold text-slate-700">
            We already have your cancellation on file.
          </p>
        </div>
      );
    }
    return (
      <div className="rounded-2xl border border-slate-200 bg-white px-6 py-8 text-center shadow-sm">
        <p className="text-lg font-semibold text-slate-800">
          Got it, we&apos;ll let the clinic know you can&apos;t make it.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-center text-sm font-medium uppercase tracking-wide text-slate-500">
          {isConfirm ? "Confirm visit" : "Cancel visit"}
        </p>
        <p className="mt-3 text-center text-xl font-semibold text-slate-900">
          {clientName}
        </p>
        <p className="mt-2 text-center text-slate-600">{whenLabel}</p>
        <p className="mt-6 text-center text-sm text-slate-600">
          {isConfirm
            ? "Tap the button below only if you’re coming. This won’t happen until you press it."
            : "Tap the button below only if you need to cancel. This won’t happen until you press it."}
        </p>
        <button
          type="button"
          onClick={() => void submit()}
          disabled={phase === "loading"}
          className={`mt-6 w-full rounded-xl px-5 py-4 text-base font-semibold text-white shadow-md transition disabled:opacity-60 ${
            isConfirm
              ? "bg-emerald-600 hover:bg-emerald-700"
              : "bg-rose-600 hover:bg-rose-700"
          }`}
        >
          {phase === "loading" ? "Working…" : buttonLabel}
        </button>
      </div>
      {phase === "error" && errorMessage ? (
        <p className="text-center text-sm text-rose-700">{errorMessage}</p>
      ) : null}
    </div>
  );
}

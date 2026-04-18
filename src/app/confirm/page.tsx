import { supabaseAdmin } from "@/lib/supabase-admin";
import { ConfirmAppointmentActions } from "./confirm-client";

export const dynamic = "force-dynamic";

function formatAppointmentWhen(iso: string) {
  return new Date(iso).toLocaleString("en-IE", {
    timeZone: "Europe/Dublin",
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default async function ConfirmPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string; response?: string }>;
}) {
  const params = await searchParams;
  const token = params.token?.trim();
  const responseRaw = params.response?.trim().toUpperCase();

  if (!token || !responseRaw || (responseRaw !== "Y" && responseRaw !== "N")) {
    return (
      <main className="min-h-screen bg-gradient-to-b from-emerald-50/40 via-slate-50 to-slate-100 px-4 py-10">
        <div className="mx-auto max-w-md pt-8 text-center">
          <p className="text-xl font-bold text-emerald-600">ShowUp</p>
          <p className="mt-8 text-slate-600">
            This link doesn&apos;t look right. Ask your clinic for a new reminder
            email.
          </p>
        </div>
      </main>
    );
  }

  const intent = responseRaw as "Y" | "N";

  if (!supabaseAdmin) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50 p-6">
        <p className="text-center text-slate-600">This page isn&apos;t fully set up yet.</p>
      </main>
    );
  }

  const { data: row, error: fetchError } = await supabaseAdmin
    .from("appointments")
    .select("id, status, client_name, appointment_at")
    .eq("confirmation_token", token)
    .maybeSingle();

  if (fetchError) {
    return (
      <main className="min-h-screen bg-gradient-to-b from-emerald-50/40 via-slate-50 to-slate-100 px-4 py-10">
        <div className="mx-auto max-w-md pt-8 text-center">
          <p className="text-xl font-bold text-emerald-600">ShowUp</p>
          <p className="mt-8 text-slate-600">Something went wrong. Please try again.</p>
        </div>
      </main>
    );
  }

  if (!row) {
    return (
      <main className="min-h-screen bg-gradient-to-b from-emerald-50/40 via-slate-50 to-slate-100 px-4 py-10">
        <div className="mx-auto max-w-md pt-8 text-center">
          <p className="text-xl font-bold text-emerald-600">ShowUp</p>
          <p className="mt-8 text-slate-600">
            We couldn&apos;t find that appointment. The link may be old or invalid.
          </p>
        </div>
      </main>
    );
  }

  if (row.status !== "no_response") {
    if (row.status === "confirmed") {
      return (
        <main className="min-h-screen bg-gradient-to-b from-emerald-50/40 via-slate-50 to-slate-100 px-4 py-10">
          <div className="mx-auto max-w-md pt-8 text-center">
            <p className="text-xl font-bold text-emerald-600">ShowUp</p>
            <div className="mt-10 rounded-2xl border border-emerald-200 bg-emerald-50 px-6 py-8 shadow-sm">
              <p className="text-lg font-semibold text-emerald-900">
                Thanks! Your appointment is confirmed.
              </p>
            </div>
            <p className="mt-8 text-xs text-slate-400">Powered by ShowUp</p>
          </div>
        </main>
      );
    }
    return (
      <main className="min-h-screen bg-gradient-to-b from-emerald-50/40 via-slate-50 to-slate-100 px-4 py-10">
        <div className="mx-auto max-w-md pt-8 text-center">
          <p className="text-xl font-bold text-emerald-600">ShowUp</p>
          <div className="mt-10 rounded-2xl border border-slate-200 bg-white px-6 py-8 shadow-sm">
            <p className="text-lg font-semibold text-slate-700">
              We already have your cancellation on file.
            </p>
          </div>
          <p className="mt-8 text-xs text-slate-400">Powered by ShowUp</p>
        </div>
      </main>
    );
  }

  const whenLabel = formatAppointmentWhen(row.appointment_at);

  return (
    <main className="min-h-screen bg-gradient-to-b from-emerald-50/40 via-slate-50 to-slate-100 px-4 py-10 pb-16">
      <div className="mx-auto max-w-md">
        <p className="text-center text-xl font-bold text-emerald-600">ShowUp</p>

        <div className="mt-10">
          <ConfirmAppointmentActions
            token={token}
            intent={intent}
            clientName={row.client_name}
            whenLabel={whenLabel}
          />
        </div>

        <p className="mt-10 text-center text-xs text-slate-400">Powered by ShowUp</p>
      </div>
    </main>
  );
}

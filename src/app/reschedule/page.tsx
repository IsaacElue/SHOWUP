/**
 * GET /reschedule — read-only load for display; updates only via POST /api/reschedule.
 */
import { utcIsoToDublinDateAndTime } from "@/lib/dublin-appointment";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { RescheduleForm } from "./reschedule-client";

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

export default async function ReschedulePage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const params = await searchParams;
  const token = params.token?.trim();

  if (!token) {
    return (
      <main className="min-h-screen bg-gradient-to-b from-emerald-50/40 via-slate-50 to-slate-100 px-4 py-10">
        <div className="mx-auto max-w-md pt-8 text-center">
          <p className="text-xl font-bold text-emerald-600">ShowUp</p>
          <p className="mt-8 text-slate-600">
            This link doesn&apos;t look right. Ask the team for a new confirmation email.
          </p>
        </div>
      </main>
    );
  }

  if (!supabaseAdmin) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50 p-6">
        <p className="text-center text-slate-600">This page isn&apos;t fully set up yet.</p>
      </main>
    );
  }

  const { data: row, error: fetchError } = await supabaseAdmin
    .from("appointments")
    .select("id, client_name, appointment_at")
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

  let defaultDate: string;
  let defaultTime: string;
  try {
    const d = utcIsoToDublinDateAndTime(row.appointment_at);
    defaultDate = d.dateStr;
    defaultTime = d.timeStr;
  } catch {
    return (
      <main className="min-h-screen bg-gradient-to-b from-emerald-50/40 via-slate-50 to-slate-100 px-4 py-10">
        <div className="mx-auto max-w-md pt-8 text-center">
          <p className="text-xl font-bold text-emerald-600">ShowUp</p>
          <p className="mt-8 text-slate-600">Something went wrong. Please try again.</p>
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
          <p className="text-center text-sm text-slate-600">Current appointment</p>
          <p className="mt-1 text-center text-lg font-semibold text-slate-900">{whenLabel}</p>
        </div>

        <div className="mt-8">
          <RescheduleForm
            token={token}
            clientName={row.client_name}
            defaultDate={defaultDate}
            defaultTime={defaultTime}
          />
        </div>

        <p className="mt-10 text-center text-xs text-slate-400">Powered by ShowUp</p>
      </div>
    </main>
  );
}

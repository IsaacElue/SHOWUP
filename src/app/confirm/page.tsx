import { supabaseAdmin } from "@/lib/supabase-admin";

export const dynamic = "force-dynamic";

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
      <main className="flex min-h-screen items-center justify-center bg-slate-50 p-6">
        <p className="max-w-md text-center text-slate-600">
          This link doesn&apos;t look right. Ask your clinic for a new reminder email.
        </p>
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
    .select("id, status")
    .eq("confirmation_token", token)
    .maybeSingle();

  if (fetchError) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50 p-6">
        <p className="text-center text-slate-600">Something went wrong. Please try again.</p>
      </main>
    );
  }

  if (!row) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50 p-6">
        <p className="max-w-md text-center text-slate-600">
          We couldn&apos;t find that appointment. The link may be old or invalid.
        </p>
      </main>
    );
  }

  if (row.status !== "no_response") {
    if (row.status === "confirmed") {
      return (
        <main className="flex min-h-screen flex-col items-center justify-center bg-emerald-50 p-6">
          <p className="max-w-md text-center text-lg font-medium text-emerald-900">
            Thanks! Your appointment is confirmed.
          </p>
        </main>
      );
    }
    return (
      <main className="flex min-h-screen flex-col items-center justify-center bg-slate-50 p-6">
        <p className="max-w-md text-center text-lg font-medium text-slate-700">
          We already have your cancellation on file.
        </p>
      </main>
    );
  }

  const nextStatus = responseRaw === "Y" ? "confirmed" : "cancelled";
  const { error: updateError } = await supabaseAdmin
    .from("appointments")
    .update({ status: nextStatus })
    .eq("id", row.id)
    .eq("status", "no_response");

  if (updateError) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50 p-6">
        <p className="text-center text-slate-600">Something went wrong. Please try again.</p>
      </main>
    );
  }

  if (responseRaw === "Y") {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center bg-emerald-50 p-6">
        <p className="max-w-md text-center text-lg font-medium text-emerald-900">
          Thanks! Your appointment is confirmed.
        </p>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-slate-50 p-6">
      <p className="max-w-md text-center text-lg font-medium text-slate-700">
        Got it, we&apos;ll let the clinic know you can&apos;t make it.
      </p>
    </main>
  );
}

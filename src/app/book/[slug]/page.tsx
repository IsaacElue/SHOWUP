import Link from "next/link";
import Script from "next/script";
import { supabaseAdmin } from "@/lib/supabase-admin";
import type { WeeklyHours } from "@/lib/businesses";

type Business = {
  id: string;
  name: string;
  slug: string;
  category: string | null;
  description: string | null;
  location: string | null;
  widget_key: string;
  available_hours: WeeklyHours | null;
};

type Service = {
  id: string;
  name: string;
  duration_minutes: number;
  price: number;
  currency: string;
};

const DAYS: Array<{ key: keyof WeeklyHours; label: string }> = [
  { key: "mon", label: "Monday" },
  { key: "tue", label: "Tuesday" },
  { key: "wed", label: "Wednesday" },
  { key: "thu", label: "Thursday" },
  { key: "fri", label: "Friday" },
  { key: "sat", label: "Saturday" },
  { key: "sun", label: "Sunday" },
];

function formatEuroPrice(value: number) {
  const isWhole = Number.isInteger(value);
  return `€${value.toLocaleString("en-IE", {
    minimumFractionDigits: isWhole ? 0 : 2,
    maximumFractionDigits: isWhole ? 0 : 2,
  })}`;
}

export default async function PublicBookingPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  if (!supabaseAdmin) {
    return (
      <main className="min-h-screen bg-slate-50 px-4 py-10">
        <p className="mx-auto max-w-2xl text-center text-slate-600">
          This page is not configured yet. Please try again soon.
        </p>
      </main>
    );
  }

  const { data: business } = await supabaseAdmin
    .from("businesses")
    .select("id, name, slug, category, description, location, widget_key, available_hours")
    .eq("slug", slug)
    .maybeSingle<Business>();

  if (!business) {
    return (
      <main className="min-h-screen bg-slate-50 px-4 py-16">
        <div className="mx-auto max-w-2xl rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-sm">
          <h1 className="text-2xl font-semibold text-slate-900">Business not found</h1>
          <p className="mt-3 text-slate-600">
            We couldn&apos;t find that booking page. Please check the link and try again.
          </p>
          <Link href="/" className="mt-6 inline-block text-sm font-medium text-[#1A7F5A] underline">
            Go to ShowUp
          </Link>
        </div>
      </main>
    );
  }

  const { data: services } = await supabaseAdmin
    .from("services")
    .select("id, name, duration_minutes, price, currency")
    .eq("business_id", business.id)
    .eq("active", true)
    .order("created_at", { ascending: true })
    .returns<Service[]>();

  const hours = business.available_hours;

  return (
    <main className="min-h-screen bg-gradient-to-b from-white via-slate-50 to-slate-100 px-4 py-10 sm:px-6">
      <div className="mx-auto max-w-4xl space-y-6">
        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <h1 className="text-3xl font-semibold text-slate-900">{business.name}</h1>
          {business.category ? (
            <p className="mt-1 text-sm font-medium text-[#1A7F5A]">{business.category}</p>
          ) : null}
          {business.description ? (
            <p className="mt-4 text-slate-700">{business.description}</p>
          ) : null}
          {business.location ? <p className="mt-2 text-sm text-slate-600">{business.location}</p> : null}
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <h2 className="text-xl font-semibold text-slate-900">Services</h2>
          {!services || services.length === 0 ? (
            <p className="mt-3 text-sm text-slate-600">No services listed yet.</p>
          ) : (
            <ul className="mt-4 space-y-3">
              {services.map((service) => (
                <li
                  key={service.id}
                  className="flex items-center justify-between rounded-xl border border-slate-200 px-4 py-3"
                >
                  <div>
                    <p className="font-medium text-slate-900">{service.name}</p>
                    <p className="text-xs text-slate-600">{service.duration_minutes} min</p>
                  </div>
                  <p className="font-semibold text-slate-900">
                    {formatEuroPrice(Number(service.price))}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <h2 className="text-xl font-semibold text-slate-900">Available hours</h2>
          <div className="mt-4 space-y-2 text-sm text-slate-700">
            {DAYS.map((day) => {
              const slot = hours?.[day.key];
              return (
                <div key={day.key} className="flex items-center justify-between">
                  <span>{day.label}</span>
                  <span>
                    {slot?.enabled ? `${slot.start} - ${slot.end}` : "Closed"}
                  </span>
                </div>
              );
            })}
          </div>
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <h2 className="text-xl font-semibold text-slate-900">Chat to book</h2>
          <p className="mt-2 text-sm text-slate-600">
            Use the chat widget in the bottom-right corner to ask questions and book instantly.
          </p>
        </section>

        <footer className="pb-8 pt-2 text-center text-sm text-slate-500">
          Powered by{" "}
          <a
            href="https://www.showupapp.org"
            target="_blank"
            rel="noreferrer"
            className="font-medium text-[#1A7F5A] underline"
          >
            ShowUp
          </a>
        </footer>
      </div>
      <Script src="/widget.js" data-key={business.widget_key} strategy="afterInteractive" />
    </main>
  );
}

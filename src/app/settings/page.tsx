"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { DEFAULT_WEEKLY_HOURS, type ServiceDraft, type WeeklyHours } from "@/lib/businesses";
import { slugifyBusinessName } from "@/lib/slug";

type Business = {
  id: string;
  name: string;
  category: string | null;
  description: string | null;
  location: string | null;
  slug: string | null;
  available_hours: WeeklyHours | null;
};

type Service = {
  id: string;
  name: string;
  duration_minutes: number;
  price: number;
};

const DAY_ROWS: Array<{ key: keyof WeeklyHours; label: string }> = [
  { key: "mon", label: "Monday" },
  { key: "tue", label: "Tuesday" },
  { key: "wed", label: "Wednesday" },
  { key: "thu", label: "Thursday" },
  { key: "fri", label: "Friday" },
  { key: "sat", label: "Saturday" },
  { key: "sun", label: "Sunday" },
];

export default function SettingsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [business, setBusiness] = useState<Business | null>(null);
  const [services, setServices] = useState<Array<ServiceDraft & { id?: string }>>([]);

  useEffect(() => {
    if (!supabase) {
      queueMicrotask(() => setLoading(false));
      return;
    }
    void (async () => {
      const { data } = await supabase.auth.getSession();
      const userId = data.session?.user.id;
      if (!userId) {
        router.replace("/login");
        return;
      }

      const { data: businessRow } = await supabase
        .from("businesses")
        .select("id, name, category, description, location, slug, available_hours")
        .eq("user_id", userId)
        .maybeSingle<Business>();

      if (!businessRow) {
        router.replace("/onboarding");
        return;
      }

      const { data: serviceRows } = await supabase
        .from("services")
        .select("id, name, duration_minutes, price")
        .eq("business_id", businessRow.id)
        .eq("active", true)
        .order("created_at", { ascending: true })
        .returns<Service[]>();

      setBusiness({
        ...businessRow,
        available_hours: businessRow.available_hours ?? DEFAULT_WEEKLY_HOURS,
      });
      setServices(
        (serviceRows ?? []).map((s) => ({
          id: s.id,
          name: s.name,
          duration_minutes: s.duration_minutes,
          price: Number(s.price),
        }))
      );
      setLoading(false);
    })();
  }, [router]);

  function updateService(index: number, patch: Partial<ServiceDraft>) {
    setServices((prev) => prev.map((s, i) => (i === index ? { ...s, ...patch } : s)));
  }

  async function saveAll() {
    if (!supabase || !business) return;
    if (!business.name.trim()) {
      setMessage("Business name is required.");
      return;
    }
    const validServices = services
      .map((s) => ({
        name: s.name.trim(),
        duration_minutes: Number(s.duration_minutes),
        price: Number(s.price),
      }))
      .filter((s) => s.name && s.duration_minutes > 0 && s.price >= 0)
      .slice(0, 10);

    setSaving(true);
    setMessage(null);

    const { error: businessError } = await supabase
      .from("businesses")
      .update({
        name: business.name.trim(),
        slug: slugifyBusinessName((business.slug || business.name || "").trim()),
        category: business.category || null,
        description: business.description || null,
        location: business.location || null,
        available_hours: business.available_hours ?? DEFAULT_WEEKLY_HOURS,
      })
      .eq("id", business.id);
    if (businessError) {
      setMessage("Could not save business settings.");
      setSaving(false);
      return;
    }

    const { error: deleteError } = await supabase
      .from("services")
      .delete()
      .eq("business_id", business.id);
    if (deleteError) {
      setMessage("Could not save services.");
      setSaving(false);
      return;
    }

    if (validServices.length > 0) {
      const { error: serviceError } = await supabase.from("services").insert(
        validServices.map((s) => ({
          business_id: business.id,
          name: s.name,
          duration_minutes: s.duration_minutes,
          price: s.price,
          currency: "EUR",
          active: true,
        }))
      );
      if (serviceError) {
        setMessage("Could not save services.");
        setSaving(false);
        return;
      }
    }

    setMessage("Settings saved.");
    setSaving(false);
  }

  if (!supabase) {
    return (
      <div className="min-h-screen bg-slate-50 px-4 py-10">
        <p className="mx-auto max-w-lg text-center text-slate-600">
          This app isn’t fully set up yet. Ask your developer to finish configuration.
        </p>
      </div>
    );
  }

  if (loading || !business) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-white via-slate-50 to-slate-100">
        <p className="text-sm text-slate-600">Loading…</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-white via-slate-50 to-slate-100 px-4 py-8 sm:px-6">
      <div className="mx-auto max-w-4xl">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-2xl font-semibold text-slate-900">Business settings</h1>
          <Link
            href="/dashboard"
            className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700"
          >
            Back to dashboard
          </Link>
        </div>

        <div className="space-y-5 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <h2 className="text-lg font-semibold text-slate-900">Profile</h2>
          <label className="block space-y-1.5">
            <span className="text-sm font-medium text-slate-700">Business name</span>
            <input
              value={business.name}
              onChange={(e) => setBusiness((prev) => (prev ? { ...prev, name: e.target.value } : prev))}
              className="w-full rounded-xl border border-slate-200 px-3 py-2.5"
            />
          </label>
          <label className="block space-y-1.5">
            <span className="text-sm font-medium text-slate-700">Public booking slug</span>
            <input
              value={business.slug ?? ""}
              onChange={(e) =>
                setBusiness((prev) =>
                  prev ? { ...prev, slug: slugifyBusinessName(e.target.value) } : prev
                )
              }
              className="w-full rounded-xl border border-slate-200 px-3 py-2.5"
            />
          </label>
          <p className="text-sm text-slate-600">
            Your public booking page:{" "}
            <a
              href={`${(process.env.NEXT_PUBLIC_APP_URL ?? "https://www.showupapp.org").replace(/\/$/, "")}/book/${business.slug ?? ""}`}
              target="_blank"
              rel="noreferrer"
              className="font-medium text-[#1A7F5A] underline"
            >
              {(process.env.NEXT_PUBLIC_APP_URL ?? "https://www.showupapp.org").replace(/\/$/, "")}
              /book/{business.slug ?? ""}
            </a>
          </p>
          <label className="block space-y-1.5">
            <span className="text-sm font-medium text-slate-700">Category</span>
            <input
              value={business.category ?? ""}
              onChange={(e) =>
                setBusiness((prev) => (prev ? { ...prev, category: e.target.value } : prev))
              }
              className="w-full rounded-xl border border-slate-200 px-3 py-2.5"
            />
          </label>
          <label className="block space-y-1.5">
            <span className="text-sm font-medium text-slate-700">Location</span>
            <input
              value={business.location ?? ""}
              onChange={(e) =>
                setBusiness((prev) => (prev ? { ...prev, location: e.target.value } : prev))
              }
              className="w-full rounded-xl border border-slate-200 px-3 py-2.5"
            />
          </label>
          <label className="block space-y-1.5">
            <span className="text-sm font-medium text-slate-700">Description</span>
            <textarea
              rows={3}
              value={business.description ?? ""}
              onChange={(e) =>
                setBusiness((prev) => (prev ? { ...prev, description: e.target.value } : prev))
              }
              className="w-full rounded-xl border border-slate-200 px-3 py-2.5"
            />
          </label>
        </div>

        <div className="mt-6 space-y-4 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <h2 className="text-lg font-semibold text-slate-900">Services</h2>
          {services.map((service, index) => (
            <div key={service.id ?? index} className="grid gap-2 sm:grid-cols-12">
              <input
                value={service.name}
                onChange={(e) => updateService(index, { name: e.target.value })}
                className="rounded-lg border border-slate-200 px-3 py-2 sm:col-span-5"
              />
              <input
                type="number"
                min={5}
                step={5}
                value={service.duration_minutes}
                onChange={(e) => updateService(index, { duration_minutes: Number(e.target.value || 0) })}
                className="rounded-lg border border-slate-200 px-3 py-2 sm:col-span-3"
              />
              <input
                type="number"
                min={0}
                step="0.01"
                value={service.price}
                onChange={(e) => updateService(index, { price: Number(e.target.value || 0) })}
                className="rounded-lg border border-slate-200 px-3 py-2 sm:col-span-3"
              />
              <button
                type="button"
                onClick={() => setServices((prev) => prev.filter((_, i) => i !== index))}
                className="rounded-lg border border-rose-200 px-3 py-2 text-sm font-medium text-rose-700 sm:col-span-1"
              >
                X
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={() => setServices((prev) => [...prev, { name: "", duration_minutes: 30, price: 0 }])}
            className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700"
          >
            Add service
          </button>
        </div>

        <div className="mt-6 space-y-4 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <h2 className="text-lg font-semibold text-slate-900">Available hours</h2>
          {DAY_ROWS.map((day) => (
            <div key={day.key} className="grid items-center gap-3 sm:grid-cols-12">
              <label className="flex items-center gap-2 sm:col-span-4">
                <input
                  type="checkbox"
                  checked={Boolean(business.available_hours?.[day.key].enabled)}
                  onChange={(e) =>
                    setBusiness((prev) =>
                      prev
                        ? {
                            ...prev,
                            available_hours: {
                              ...(prev.available_hours ?? DEFAULT_WEEKLY_HOURS),
                              [day.key]: {
                                ...(prev.available_hours?.[day.key] ?? DEFAULT_WEEKLY_HOURS[day.key]),
                                enabled: e.target.checked,
                              },
                            },
                          }
                        : prev
                    )
                  }
                />
                <span className="text-sm font-medium text-slate-700">{day.label}</span>
              </label>
              <input
                type="time"
                value={business.available_hours?.[day.key].start ?? "09:00"}
                onChange={(e) =>
                  setBusiness((prev) =>
                    prev
                      ? {
                          ...prev,
                          available_hours: {
                            ...(prev.available_hours ?? DEFAULT_WEEKLY_HOURS),
                            [day.key]: {
                              ...(prev.available_hours?.[day.key] ?? DEFAULT_WEEKLY_HOURS[day.key]),
                              start: e.target.value,
                            },
                          },
                        }
                      : prev
                  )
                }
                className="rounded-lg border border-slate-200 px-3 py-2 sm:col-span-4"
              />
              <input
                type="time"
                value={business.available_hours?.[day.key].end ?? "18:00"}
                onChange={(e) =>
                  setBusiness((prev) =>
                    prev
                      ? {
                          ...prev,
                          available_hours: {
                            ...(prev.available_hours ?? DEFAULT_WEEKLY_HOURS),
                            [day.key]: {
                              ...(prev.available_hours?.[day.key] ?? DEFAULT_WEEKLY_HOURS[day.key]),
                              end: e.target.value,
                            },
                          },
                        }
                      : prev
                  )
                }
                className="rounded-lg border border-slate-200 px-3 py-2 sm:col-span-4"
              />
            </div>
          ))}
        </div>

        <div className="mt-6 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={() => void saveAll()}
            disabled={saving}
            className="rounded-xl bg-[#1A7F5A] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#166a4b] disabled:opacity-60"
          >
            {saving ? "Saving..." : "Save settings"}
          </button>
        </div>
        {message ? (
          <p className="mt-4 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 shadow-sm">
            {message}
          </p>
        ) : null}
      </div>
    </div>
  );
}

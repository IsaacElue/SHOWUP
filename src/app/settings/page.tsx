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

  const categoryOptions = [
    "Hair Salon",
    "Barber",
    "Nail Salon",
    "Beauty Clinic",
    "Physiotherapy",
    "Dental",
    "Other",
  ];

  if (!supabase) {
    return (
      <div
        className="min-h-screen px-4 py-10"
        style={{
          background: "linear-gradient(135deg, #F0FAF5 0%, #FAFAFA 40%, #F5F8FF 100%)",
          fontFamily: '"DM Sans", sans-serif',
        }}
      >
        <p className="mx-auto max-w-lg text-center text-sm" style={{ color: "#5B616E" }}>
          This app isn’t fully set up yet. Ask your developer to finish configuration.
        </p>
      </div>
    );
  }

  if (loading || !business) {
    return (
      <div
        className="flex min-h-screen items-center justify-center"
        style={{
          background: "linear-gradient(135deg, #F0FAF5 0%, #FAFAFA 40%, #F5F8FF 100%)",
          fontFamily: '"DM Sans", sans-serif',
        }}
      >
        <p className="text-sm" style={{ color: "#5B616E" }}>
          Loading...
        </p>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen pb-32"
      style={{
        background: "linear-gradient(135deg, #F0FAF5 0%, #FAFAFA 40%, #F5F8FF 100%)",
        fontFamily: '"DM Sans", sans-serif',
      }}
    >
      <header
        className="sticky top-0 z-20 border-b bg-white/95 backdrop-blur-md"
        style={{ borderColor: "rgba(15,15,15,0.08)", backgroundColor: "rgba(250,250,250,0.97)" }}
      >
        <div className="mx-auto flex w-full max-w-[760px] items-center justify-between gap-3 px-6 py-3">
          <div className="inline-flex items-center gap-2">
            <div
              className="flex h-8 w-8 items-center justify-center rounded-[10px] text-sm font-bold text-white"
              style={{ backgroundColor: "#1A7F5A" }}
            >
              S
            </div>
            <span className="text-sm font-semibold tracking-tight" style={{ color: "#1A1A1A" }}>
              ShowUp
            </span>
          </div>
          <Link
            href="/dashboard"
            className="inline-flex items-center justify-center rounded-[24px] border px-4 py-2 text-sm font-medium transition duration-200 ease-in-out hover:bg-white"
            style={{ borderColor: "rgba(15,15,15,0.12)", color: "#5B616E" }}
          >
            Back to dashboard
          </Link>
        </div>
      </header>

      <main className="mx-auto w-full max-w-[760px] px-6 py-8">
        <div className="mb-6">
          <div className="mb-3 h-[2px] w-10 rounded-full" style={{ backgroundColor: "#1A7F5A" }} />
          <h1 className="text-3xl font-bold tracking-[-0.02em] sm:text-[36px]" style={{ color: "#1A1A1A" }}>
            Business Settings
          </h1>
          <p className="mt-2 text-sm sm:text-base" style={{ color: "#5B616E" }}>
            Manage your profile, services, and availability
          </p>
        </div>

        <section
          className="stagger-card space-y-5 rounded-xl border bg-white p-6 sm:p-8"
          style={{
            borderColor: "rgba(15,15,15,0.08)",
            boxShadow: "0 2px 12px rgba(0,0,0,0.08)",
            borderLeftWidth: "3px",
            borderLeftColor: "#1A7F5A",
          }}
        >
          <div className="border-b pb-3" style={{ borderColor: "rgba(15,15,15,0.08)" }}>
            <h2 className="text-lg font-semibold" style={{ color: "#1A1A1A" }}>
              Profile
            </h2>
          </div>
          <label className="block space-y-1.5">
            <span className="text-sm font-medium" style={{ color: "#1A1A1A" }}>
              Business name
            </span>
            <input
              value={business.name}
              onChange={(e) => setBusiness((prev) => (prev ? { ...prev, name: e.target.value } : prev))}
              className="h-11 w-full rounded-[10px] border-2 border-transparent px-3 text-sm outline-none transition duration-200 ease-in-out focus:border-[#1A7F5A]"
              style={{ backgroundColor: "#F5F5F7", color: "#1A1A1A" }}
            />
          </label>
          <label className="block space-y-1.5">
            <span className="text-sm font-medium" style={{ color: "#1A1A1A" }}>
              Public booking slug
            </span>
            <input
              value={business.slug ?? ""}
              onChange={(e) =>
                setBusiness((prev) =>
                  prev ? { ...prev, slug: slugifyBusinessName(e.target.value) } : prev
                )
              }
              className="h-11 w-full rounded-[10px] border-2 border-transparent px-3 text-sm outline-none transition duration-200 ease-in-out focus:border-[#1A7F5A]"
              style={{ backgroundColor: "#F5F5F7", color: "#1A1A1A" }}
            />
          </label>
          <p className="text-xs sm:text-sm" style={{ color: "#5B616E" }}>
            Your public booking page:{" "}
            <a
              href={`${(process.env.NEXT_PUBLIC_APP_URL ?? "https://www.showupapp.org").replace(/\/$/, "")}/book/${business.slug ?? ""}`}
              target="_blank"
              rel="noreferrer"
              className="font-medium underline"
              style={{ color: "#1A7F5A" }}
            >
              showupapp.org/book/{business.slug ?? ""}
            </a>
          </p>
          <label className="block space-y-1.5">
            <span className="text-sm font-medium" style={{ color: "#1A1A1A" }}>
              Category
            </span>
            <select
              value={business.category ?? ""}
              onChange={(e) =>
                setBusiness((prev) => (prev ? { ...prev, category: e.target.value } : prev))
              }
              className="h-11 w-full rounded-[10px] border-2 border-transparent px-3 text-sm outline-none transition duration-200 ease-in-out focus:border-[#1A7F5A]"
              style={{ backgroundColor: "#F5F5F7", color: "#1A1A1A" }}
            >
              <option value="">Select category</option>
              {categoryOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
              {business.category && !categoryOptions.includes(business.category) ? (
                <option value={business.category}>{business.category}</option>
              ) : null}
            </select>
          </label>
          <label className="block space-y-1.5">
            <span className="text-sm font-medium" style={{ color: "#1A1A1A" }}>
              Location
            </span>
            <input
              value={business.location ?? ""}
              onChange={(e) =>
                setBusiness((prev) => (prev ? { ...prev, location: e.target.value } : prev))
              }
              className="h-11 w-full rounded-[10px] border-2 border-transparent px-3 text-sm outline-none transition duration-200 ease-in-out focus:border-[#1A7F5A]"
              style={{ backgroundColor: "#F5F5F7", color: "#1A1A1A" }}
            />
          </label>
          <label className="block space-y-1.5">
            <span className="text-sm font-medium" style={{ color: "#1A1A1A" }}>
              Description
            </span>
            <textarea
              rows={3}
              value={business.description ?? ""}
              onChange={(e) =>
                setBusiness((prev) => (prev ? { ...prev, description: e.target.value } : prev))
              }
              className="min-h-[120px] w-full rounded-[10px] border-2 border-transparent px-3 py-2.5 text-sm outline-none transition duration-200 ease-in-out focus:border-[#1A7F5A]"
              style={{ backgroundColor: "#F5F5F7", color: "#1A1A1A" }}
            />
          </label>
        </section>

        <section
          className="stagger-card mt-6 space-y-4 rounded-xl border bg-white p-6 sm:p-8"
          style={{
            borderColor: "rgba(15,15,15,0.08)",
            boxShadow: "0 2px 12px rgba(0,0,0,0.08)",
            borderLeftWidth: "3px",
            borderLeftColor: "#1A7F5A",
            animationDelay: "0.08s",
          }}
        >
          <div className="border-b pb-3" style={{ borderColor: "rgba(15,15,15,0.08)" }}>
            <h2 className="text-lg font-semibold" style={{ color: "#1A1A1A" }}>
              Services
            </h2>
          </div>
          <div className="hidden grid-cols-12 gap-2 px-1 sm:grid">
            <p className="sm:col-span-5 text-[11px] uppercase tracking-[0.08em]" style={{ color: "#5B616E" }}>
              Service
            </p>
            <p className="sm:col-span-3 text-[11px] uppercase tracking-[0.08em]" style={{ color: "#5B616E" }}>
              Duration (min)
            </p>
            <p className="sm:col-span-3 text-[11px] uppercase tracking-[0.08em]" style={{ color: "#5B616E" }}>
              Price (EUR)
            </p>
            <p className="sm:col-span-1 text-[11px] uppercase tracking-[0.08em]" style={{ color: "#5B616E" }}>
              &nbsp;
            </p>
          </div>
          {services.map((service, index) => (
            <div
              key={service.id ?? index}
              className="grid gap-2 border-b pb-3 sm:grid-cols-12"
              style={{ borderColor: "rgba(15,15,15,0.06)" }}
            >
              <input
                value={service.name}
                onChange={(e) => updateService(index, { name: e.target.value })}
                className="h-11 rounded-[10px] border-2 border-transparent px-3 text-sm outline-none transition duration-200 ease-in-out focus:border-[#1A7F5A] sm:col-span-5"
                style={{ backgroundColor: "#F5F5F7", color: "#1A1A1A" }}
              />
              <input
                type="number"
                min={5}
                step={5}
                value={service.duration_minutes}
                onChange={(e) => updateService(index, { duration_minutes: Number(e.target.value || 0) })}
                className="h-11 rounded-[10px] border-2 border-transparent px-3 text-sm outline-none transition duration-200 ease-in-out focus:border-[#1A7F5A] sm:col-span-3"
                style={{ backgroundColor: "#F5F5F7", color: "#1A1A1A" }}
              />
              <input
                type="number"
                min={0}
                step="0.01"
                value={service.price}
                onChange={(e) => updateService(index, { price: Number(e.target.value || 0) })}
                className="h-11 rounded-[10px] border-2 border-transparent px-3 text-sm outline-none transition duration-200 ease-in-out focus:border-[#1A7F5A] sm:col-span-3"
                style={{ backgroundColor: "#F5F5F7", color: "#1A1A1A" }}
              />
              <button
                type="button"
                onClick={() => setServices((prev) => prev.filter((_, i) => i !== index))}
                className="h-11 rounded-[10px] px-3 text-sm font-medium transition duration-200 ease-in-out hover:underline sm:col-span-1"
                style={{ color: "#DC2626" }}
              >
                X
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={() => setServices((prev) => [...prev, { name: "", duration_minutes: 30, price: 0 }])}
            className="inline-flex h-11 w-full items-center justify-center rounded-[10px] border border-dashed px-4 text-sm font-semibold transition duration-200 ease-in-out hover:bg-[#F0FDF8]"
            style={{ borderColor: "rgba(26,127,90,0.45)", color: "#1A7F5A" }}
          >
            + Add service
          </button>
        </section>

        <section
          className="stagger-card mt-6 space-y-4 rounded-xl border bg-white p-6 sm:p-8"
          style={{
            borderColor: "rgba(15,15,15,0.08)",
            boxShadow: "0 2px 12px rgba(0,0,0,0.08)",
            borderLeftWidth: "3px",
            borderLeftColor: "#1A7F5A",
            animationDelay: "0.16s",
          }}
        >
          <div className="border-b pb-3" style={{ borderColor: "rgba(15,15,15,0.08)" }}>
            <h2 className="text-lg font-semibold" style={{ color: "#1A1A1A" }}>
              Available hours
            </h2>
          </div>
          {DAY_ROWS.map((day) => (
            <div key={day.key} className="rounded-[10px] border p-3" style={{ borderColor: "rgba(15,15,15,0.06)" }}>
              <div className="mb-3 flex items-center justify-between">
                <span className="text-sm font-semibold" style={{ color: "#1A1A1A" }}>
                  {day.label}
                </span>
                <label className="toggle-switch">
                  <input
                    className="toggle-input"
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
                  <span className="toggle-track">
                    <span className="toggle-thumb" />
                  </span>
                </label>
              </div>
              {business.available_hours?.[day.key].enabled ? (
                <div className="grid items-center gap-2 sm:grid-cols-2">
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
                    className="h-10 rounded-[10px] border-2 border-transparent px-3 text-sm outline-none transition duration-200 ease-in-out focus:border-[#1A7F5A]"
                    style={{ backgroundColor: "#F5F5F7", color: "#1A1A1A" }}
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
                    className="h-10 rounded-[10px] border-2 border-transparent px-3 text-sm outline-none transition duration-200 ease-in-out focus:border-[#1A7F5A]"
                    style={{ backgroundColor: "#F5F5F7", color: "#1A1A1A" }}
                  />
                </div>
              ) : (
                <div className="text-xs" style={{ color: "#9CA3AF" }}>
                  Closed
                </div>
              )}
            </div>
          ))}
        </section>

        {message ? (
          <p
            className="mt-5 rounded-xl border bg-white px-4 py-3 text-sm shadow-sm"
            style={{ borderColor: "rgba(15,15,15,0.08)", color: "#5B616E" }}
          >
            {message}
          </p>
        ) : null}
      </main>

      <div className="fixed inset-x-0 bottom-0 z-30 px-4 pb-4 pt-2 sm:inset-x-auto sm:right-8 sm:px-0">
        <button
          type="button"
          onClick={() => void saveAll()}
          disabled={saving}
          className="save-floating-btn h-12 w-full rounded-[24px] px-6 text-sm font-semibold text-white transition duration-200 ease-in-out disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
          style={{ backgroundColor: "#1A7F5A", boxShadow: "0 8px 20px rgba(26,127,90,0.3)" }}
        >
          {saving ? "Saving..." : "Save settings"}
        </button>
      </div>

      <style jsx global>{`
        .stagger-card {
          animation: fadeInUp 0.55s ease both;
        }
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .toggle-switch {
          position: relative;
          display: inline-flex;
          align-items: center;
        }
        .toggle-input {
          position: absolute;
          opacity: 0;
          width: 0;
          height: 0;
        }
        .toggle-track {
          position: relative;
          width: 44px;
          height: 24px;
          border-radius: 999px;
          background: #d1d5db;
          transition: background 200ms ease;
          display: inline-flex;
          align-items: center;
          padding: 2px;
        }
        .toggle-thumb {
          width: 20px;
          height: 20px;
          border-radius: 999px;
          background: #ffffff;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
          transform: translateX(0);
          transition: transform 200ms ease;
        }
        .toggle-input:checked + .toggle-track {
          background: #1a7f5a;
        }
        .toggle-input:checked + .toggle-track .toggle-thumb {
          transform: translateX(20px);
        }
        .save-floating-btn:hover {
          animation: savePulse 0.9s ease;
        }
        @keyframes savePulse {
          0% {
            transform: scale(1);
          }
          50% {
            transform: scale(1.03);
          }
          100% {
            transform: scale(1);
          }
        }
      `}</style>
    </div>
  );
}

"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import {
  BUSINESS_CATEGORIES,
  DEFAULT_WEEKLY_HOURS,
  SERVICE_PRESETS,
  type BusinessCategory,
  type ServiceDraft,
  type WeeklyHours,
} from "@/lib/businesses";
import { slugifyBusinessName } from "@/lib/slug";

type BusinessRow = { id: string; widget_key: string; slug: string };

const DAY_ROWS: Array<{ key: keyof WeeklyHours; label: string }> = [
  { key: "mon", label: "Monday" },
  { key: "tue", label: "Tuesday" },
  { key: "wed", label: "Wednesday" },
  { key: "thu", label: "Thursday" },
  { key: "fri", label: "Friday" },
  { key: "sat", label: "Saturday" },
  { key: "sun", label: "Sunday" },
];

const BRAND = "#1A7F5A";

function emptyService(): ServiceDraft {
  return { name: "", duration_minutes: 30, price: 0 };
}

export default function OnboardingPage() {
  const router = useRouter();
  const [sessionUserId, setSessionUserId] = useState<string | null>(null);
  const [loadingSession, setLoadingSession] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const [step, setStep] = useState(1);
  const [businessName, setBusinessName] = useState("");
  const [category, setCategory] = useState<BusinessCategory>("Hair Salon");
  const [location, setLocation] = useState("");
  const [description, setDescription] = useState("");
  const [services, setServices] = useState<ServiceDraft[]>(SERVICE_PRESETS["Hair Salon"]);
  const [serviceEdited, setServiceEdited] = useState(false);
  const [hours, setHours] = useState<WeeklyHours>(DEFAULT_WEEKLY_HOURS);
  const [widgetKey, setWidgetKey] = useState<string | null>(null);
  const [bookingSlug, setBookingSlug] = useState<string | null>(null);
  const [embedCopied, setEmbedCopied] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);

  useEffect(() => {
    if (!supabase) {
      queueMicrotask(() => setLoadingSession(false));
      return;
    }

    void (async () => {
      const { data } = await supabase.auth.getSession();
      const userId = data.session?.user.id;
      if (!userId) {
        router.replace("/login");
        return;
      }
      const { data: business } = await supabase
        .from("businesses")
        .select("id")
        .eq("user_id", userId)
        .maybeSingle();
      if (business) {
        router.replace("/dashboard");
        return;
      }
      setSessionUserId(userId);
      setLoadingSession(false);
    })();
  }, [router]);

  function updateService(index: number, patch: Partial<ServiceDraft>) {
    setServiceEdited(true);
    setServices((prev) => prev.map((s, i) => (i === index ? { ...s, ...patch } : s)));
  }

  function removeService(index: number) {
    setServiceEdited(true);
    setServices((prev) => prev.filter((_, i) => i !== index));
  }

  function addService() {
    if (services.length >= 10) return;
    setServiceEdited(true);
    setServices((prev) => [...prev, emptyService()]);
  }

  function onCategoryChange(nextCategory: BusinessCategory) {
    setCategory(nextCategory);
    if (!serviceEdited) {
      setServices(SERVICE_PRESETS[nextCategory]);
    }
  }

  const embedCode = useMemo(() => {
    if (!widgetKey) return "";
    return `<script src="https://www.showupapp.org/widget.js" data-key="${widgetKey}"></script>`;
  }, [widgetKey]);

  const bookingLink = useMemo(() => {
    if (!bookingSlug) return "";
    const base =
      (process.env.NEXT_PUBLIC_APP_URL ?? "https://www.showupapp.org").replace(/\/$/, "");
    return `${base}/book/${bookingSlug}`;
  }, [bookingSlug]);

  async function findAvailableSlug(name: string, userId: string): Promise<string> {
    if (!supabase) return slugifyBusinessName(name);
    const base = slugifyBusinessName(name);
    for (let i = 0; i < 20; i += 1) {
      const candidate = i === 0 ? base : `${base}-${i + 1}`;
      const { data } = await supabase
        .from("businesses")
        .select("id, user_id")
        .eq("slug", candidate)
        .maybeSingle();
      if (!data || (data as { user_id?: string }).user_id === userId) {
        return candidate;
      }
    }
    return `${base}-${Math.random().toString(36).slice(2, 6)}`;
  }

  async function saveBusinessAndServices() {
    if (!supabase || !sessionUserId) return;
    if (!businessName.trim()) {
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

    if (validServices.length === 0) {
      setMessage("Add at least one valid service.");
      return;
    }

    setSaving(true);
    setMessage(null);

    const slug = await findAvailableSlug(businessName.trim(), sessionUserId);
    const { data: business, error: businessError } = await supabase
      .from("businesses")
      .upsert(
        {
          user_id: sessionUserId,
          name: businessName.trim(),
          slug,
          category,
          description: description.trim() || null,
          location: location.trim() || null,
          available_hours: hours,
        },
        { onConflict: "user_id" }
      )
      .select("id, widget_key, slug")
      .single<BusinessRow>();

    if (businessError || !business) {
      setMessage("Could not save business profile. Please try again.");
      setSaving(false);
      return;
    }

    const { error: deleteError } = await supabase
      .from("services")
      .delete()
      .eq("business_id", business.id);
    if (deleteError) {
      setMessage("Could not update services. Please try again.");
      setSaving(false);
      return;
    }

    const { error: insertError } = await supabase.from("services").insert(
      validServices.map((s) => ({
        business_id: business.id,
        name: s.name,
        duration_minutes: s.duration_minutes,
        price: s.price,
        currency: "EUR",
        active: true,
      }))
    );
    if (insertError) {
      setMessage("Could not save services. Please try again.");
      setSaving(false);
      return;
    }

    setWidgetKey(business.widget_key);
    setBookingSlug(business.slug);
    setStep(4);
    setSaving(false);
  }

  async function handleCopy() {
    if (!embedCode) return;
    try {
      await navigator.clipboard.writeText(embedCode);
      setEmbedCopied(true);
      setTimeout(() => setEmbedCopied(false), 1200);
      setMessage("Embed code copied.");
    } catch {
      setMessage("Could not copy automatically. Please copy manually.");
    }
  }

  async function handleCopyLink() {
    if (!bookingLink) return;
    try {
      await navigator.clipboard.writeText(bookingLink);
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 1200);
      setMessage("Booking link copied.");
    } catch {
      setMessage("Could not copy automatically. Please copy manually.");
    }
  }

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

  if (loadingSession) {
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

  const stepLabels = ["Basics", "Services", "Hours", "Widget"];

  return (
    <div
      className="min-h-screen pb-12"
      style={{
        background: "linear-gradient(135deg, #F0FAF5 0%, #FAFAFA 40%, #F5F8FF 100%)",
        fontFamily: '"DM Sans", sans-serif',
      }}
    >
      <header
        className="sticky top-0 z-20 border-b bg-white/95 backdrop-blur-md"
        style={{ borderColor: "rgba(15,15,15,0.08)", backgroundColor: "rgba(250,250,250,0.97)" }}
      >
        <div className="mx-auto flex w-full max-w-[760px] items-center px-6 py-3">
          <Link href="/" className="inline-flex items-center gap-2">
            <span
              className="flex h-8 w-8 items-center justify-center rounded-[10px] text-sm font-bold text-white"
              style={{ backgroundColor: "#1A7F5A" }}
            >
              S
            </span>
            <span className="text-sm font-semibold tracking-tight" style={{ color: "#1A1A1A" }}>
              ShowUp
            </span>
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-[760px] px-6 py-8">
        <div className="mx-auto mb-8 max-w-[560px]">
          <div className="flex items-start justify-between gap-2">
            {[1, 2, 3, 4].map((n, index) => {
              const isComplete = n < step;
              const isCurrent = n === step;
              return (
                <div key={n} className="flex min-w-0 flex-1 items-center">
                  <div className="flex min-w-[56px] flex-col items-center">
                    <div
                      className="flex h-8 w-8 items-center justify-center rounded-full text-xs font-semibold transition duration-200 ease-in-out"
                      style={{
                        backgroundColor: isComplete || isCurrent ? "#1A7F5A" : "#E5E7EB",
                        color: isComplete || isCurrent ? "#FFFFFF" : "#9CA3AF",
                        boxShadow: isCurrent ? "0 0 0 4px rgba(26,127,90,0.16)" : "none",
                      }}
                    >
                      {isComplete ? "✓" : n}
                    </div>
                    <span className="mt-2 text-[11px]" style={{ color: "#5B616E" }}>
                      {stepLabels[index]}
                    </span>
                  </div>
                  {n < 4 ? (
                    <div
                      className="mx-2 mt-4 h-px flex-1 transition duration-200 ease-in-out"
                      style={{ backgroundColor: n < step ? "#1A7F5A" : "#D1D5DB" }}
                    />
                  ) : null}
                </div>
              );
            })}
          </div>
        </div>

        <div
          className="step-card mx-auto max-w-[560px] overflow-hidden rounded-xl border bg-white p-8"
          style={{
            borderColor: "rgba(15,15,15,0.08)",
            boxShadow: "0 2px 12px rgba(0,0,0,0.08)",
            borderLeftWidth: "3px",
            borderLeftColor: "#1A7F5A",
          }}
          key={step}
        >
          {step === 1 ? (
            <div className="space-y-5">
              <div>
                <h1 className="text-2xl font-bold" style={{ color: "#1A1A1A" }}>
                  Business Basics
                </h1>
                <p className="mt-1 text-sm" style={{ color: "#5B616E" }}>
                  Tell us about your business.
                </p>
              </div>
              <label className="block space-y-1.5">
                <span className="text-sm font-medium" style={{ color: "#1A1A1A" }}>
                  Business name
                </span>
                <input
                  value={businessName}
                  onChange={(e) => setBusinessName(e.target.value)}
                  required
                  className="h-11 w-full rounded-[10px] border-2 border-transparent px-3 text-sm outline-none transition duration-200 ease-in-out focus:border-[#1A7F5A]"
                  style={{ backgroundColor: "#F5F5F7", color: "#1A1A1A" }}
                />
              </label>
              <label className="block space-y-1.5">
                <span className="text-sm font-medium" style={{ color: "#1A1A1A" }}>
                  Category
                </span>
                <select
                  value={category}
                  onChange={(e) => onCategoryChange(e.target.value as BusinessCategory)}
                  className="h-11 w-full rounded-[10px] border-2 border-transparent px-3 text-sm outline-none transition duration-200 ease-in-out focus:border-[#1A7F5A]"
                  style={{ backgroundColor: "#F5F5F7", color: "#1A1A1A" }}
                >
                  {BUSINESS_CATEGORIES.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block space-y-1.5">
                <span className="text-sm font-medium" style={{ color: "#1A1A1A" }}>
                  Location
                </span>
                <input
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="Blackrock, Dublin"
                  className="h-11 w-full rounded-[10px] border-2 border-transparent px-3 text-sm outline-none transition duration-200 ease-in-out focus:border-[#1A7F5A]"
                  style={{ backgroundColor: "#F5F5F7", color: "#1A1A1A" }}
                />
              </label>
              <label className="block space-y-1.5">
                <span className="text-sm font-medium" style={{ color: "#1A1A1A" }}>
                  Description
                </span>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Friendly hair salon in the heart of Blackrock"
                  rows={3}
                  className="min-h-[110px] w-full rounded-[10px] border-2 border-transparent px-3 py-2.5 text-sm outline-none transition duration-200 ease-in-out focus:border-[#1A7F5A]"
                  style={{ backgroundColor: "#F5F5F7", color: "#1A1A1A" }}
                />
              </label>
              <div>
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  className="h-11 w-full rounded-[24px] text-sm font-semibold text-white transition duration-200 ease-in-out hover:opacity-95"
                  style={{ backgroundColor: "#1A7F5A" }}
                >
                  Continue
                </button>
              </div>
            </div>
          ) : null}

          {step === 2 ? (
            <div className="space-y-5">
              <div>
                <h1 className="text-2xl font-bold" style={{ color: "#1A1A1A" }}>
                  Add your services
                </h1>
                <p className="mt-1 text-sm" style={{ color: "#5B616E" }}>
                  Add up to 10 services. We&apos;ve pre-filled some based on your category.
                </p>
              </div>
              <div className="hidden grid-cols-12 gap-2 px-1 sm:grid">
                <p className="sm:col-span-5 text-[11px] uppercase tracking-[0.08em]" style={{ color: "#5B616E" }}>
                  Service
                </p>
                <p className="sm:col-span-3 text-[11px] uppercase tracking-[0.08em]" style={{ color: "#5B616E" }}>
                  Duration
                </p>
                <p className="sm:col-span-3 text-[11px] uppercase tracking-[0.08em]" style={{ color: "#5B616E" }}>
                  Price
                </p>
                <p className="sm:col-span-1 text-[11px] uppercase tracking-[0.08em]" style={{ color: "#5B616E" }}>
                  &nbsp;
                </p>
              </div>
              <div className="space-y-2">
                {services.map((service, index) => (
                  <div
                    key={`${index}-${service.name}`}
                    className="grid gap-2 border-b pb-3 sm:grid-cols-12"
                    style={{ borderColor: "rgba(15,15,15,0.08)" }}
                  >
                    <input
                      value={service.name}
                      onChange={(e) => updateService(index, { name: e.target.value })}
                      placeholder="Service name"
                      className="h-11 rounded-[10px] border-2 border-transparent px-3 text-sm outline-none transition duration-200 ease-in-out focus:border-[#1A7F5A] sm:col-span-5"
                      style={{ backgroundColor: "#F5F5F7", color: "#1A1A1A" }}
                    />
                    <input
                      type="number"
                      min={5}
                      step={5}
                      value={service.duration_minutes}
                      onChange={(e) =>
                        updateService(index, {
                          duration_minutes: Number(e.target.value || 0),
                        })
                      }
                      placeholder="Minutes"
                      className="h-11 rounded-[10px] border-2 border-transparent px-3 text-sm outline-none transition duration-200 ease-in-out focus:border-[#1A7F5A] sm:col-span-3"
                      style={{ backgroundColor: "#F5F5F7", color: "#1A1A1A" }}
                    />
                    <input
                      type="number"
                      min={0}
                      step="0.01"
                      value={service.price}
                      onChange={(e) => updateService(index, { price: Number(e.target.value || 0) })}
                      placeholder="Price €"
                      className="h-11 rounded-[10px] border-2 border-transparent px-3 text-sm outline-none transition duration-200 ease-in-out focus:border-[#1A7F5A] sm:col-span-3"
                      style={{ backgroundColor: "#F5F5F7", color: "#1A1A1A" }}
                    />
                    <button
                      type="button"
                      onClick={() => removeService(index)}
                      className="h-11 rounded-[10px] px-3 text-sm font-medium transition duration-200 ease-in-out hover:underline sm:col-span-1"
                      style={{ color: "#DC2626" }}
                    >
                      X
                    </button>
                  </div>
                ))}
              </div>
              <button
                type="button"
                onClick={addService}
                disabled={services.length >= 10}
                className="inline-flex h-11 w-full items-center justify-center rounded-[10px] border border-dashed px-4 text-sm font-semibold transition duration-200 ease-in-out hover:bg-[#F0FDF8] disabled:opacity-50"
                style={{ borderColor: "rgba(26,127,90,0.45)", color: "#1A7F5A" }}
              >
                + Add service
              </button>
              <div className="flex justify-between">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="rounded-[24px] border px-4 py-2 text-sm font-medium transition duration-200 ease-in-out hover:bg-white"
                  style={{ borderColor: "rgba(15,15,15,0.12)", color: "#5B616E" }}
                >
                  Back
                </button>
                <button
                  type="button"
                  onClick={() => setStep(3)}
                  className="rounded-[24px] px-5 py-2.5 text-sm font-semibold text-white transition duration-200 ease-in-out hover:opacity-95"
                  style={{ backgroundColor: "#1A7F5A" }}
                >
                  Continue
                </button>
              </div>
            </div>
          ) : null}

          {step === 3 ? (
            <div className="space-y-5">
              <div>
                <h1 className="text-2xl font-bold" style={{ color: "#1A1A1A" }}>
                  When are you available?
                </h1>
                <p className="mt-1 text-sm" style={{ color: "#5B616E" }}>
                  Clients will only be able to book during these hours.
                </p>
              </div>
              <div className="space-y-3">
                {DAY_ROWS.map((day) => (
                  <div
                    key={day.key}
                    className="rounded-[10px] border p-3"
                    style={{ borderColor: "rgba(15,15,15,0.08)" }}
                  >
                    <div className="mb-3 flex items-center justify-between">
                      <span className="text-sm font-semibold" style={{ color: "#1A1A1A" }}>
                        {day.label}
                      </span>
                      <label className="toggle-switch">
                        <input
                          className="toggle-input"
                          type="checkbox"
                          checked={hours[day.key].enabled}
                          onChange={(e) =>
                            setHours((prev) => ({
                              ...prev,
                              [day.key]: { ...prev[day.key], enabled: e.target.checked },
                            }))
                          }
                        />
                        <span className="toggle-track">
                          <span className="toggle-thumb" />
                        </span>
                      </label>
                    </div>
                    {hours[day.key].enabled ? (
                      <div className="grid items-center gap-2 sm:grid-cols-2">
                        <input
                          type="time"
                          value={hours[day.key].start}
                          onChange={(e) =>
                            setHours((prev) => ({
                              ...prev,
                              [day.key]: { ...prev[day.key], start: e.target.value },
                            }))
                          }
                          disabled={!hours[day.key].enabled}
                          className="h-10 rounded-[10px] border-2 border-transparent px-3 text-sm outline-none transition duration-200 ease-in-out focus:border-[#1A7F5A] disabled:opacity-60"
                          style={{ backgroundColor: "#F5F5F7", color: "#1A1A1A" }}
                        />
                        <input
                          type="time"
                          value={hours[day.key].end}
                          onChange={(e) =>
                            setHours((prev) => ({
                              ...prev,
                              [day.key]: { ...prev[day.key], end: e.target.value },
                            }))
                          }
                          disabled={!hours[day.key].enabled}
                          className="h-10 rounded-[10px] border-2 border-transparent px-3 text-sm outline-none transition duration-200 ease-in-out focus:border-[#1A7F5A] disabled:opacity-60"
                          style={{ backgroundColor: "#F5F5F7", color: "#1A1A1A" }}
                        />
                      </div>
                    ) : (
                      <p className="text-xs" style={{ color: "#9CA3AF" }}>
                        Closed
                      </p>
                    )}
                  </div>
                ))}
              </div>
              <div className="flex justify-between">
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  className="rounded-[24px] border px-4 py-2 text-sm font-medium transition duration-200 ease-in-out hover:bg-white"
                  style={{ borderColor: "rgba(15,15,15,0.12)", color: "#5B616E" }}
                >
                  Back
                </button>
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => void saveBusinessAndServices()}
                  className="rounded-[24px] px-5 py-2.5 text-sm font-semibold text-white transition duration-200 ease-in-out hover:opacity-95 disabled:opacity-60"
                  style={{ backgroundColor: BRAND }}
                >
                  {saving ? "Saving..." : "Continue"}
                </button>
              </div>
            </div>
          ) : null}

          {step === 4 ? (
            <div className="space-y-5">
              <div>
                <h1 className="text-2xl font-bold" style={{ color: "#1A1A1A" }}>
                  You&apos;re all set!
                </h1>
                <p className="mt-1 text-sm" style={{ color: "#5B616E" }}>
                  Add ShowUp to your website in one line of code.
                </p>
              </div>

              <section className="space-y-2">
                <p className="text-sm font-semibold" style={{ color: "#1A1A1A" }}>
                  Embed on your website
                </p>
                <div className="relative rounded-xl p-4" style={{ backgroundColor: "#0F1A15" }}>
                  <button
                    type="button"
                    onClick={() => void handleCopy()}
                    className={`copy-btn absolute right-3 top-3 rounded-[20px] border px-3 py-1 text-xs font-medium transition duration-200 ease-in-out ${
                      embedCopied ? "is-copied" : ""
                    }`}
                    style={{ borderColor: "rgba(255,255,255,0.2)", color: "rgba(255,255,255,0.86)" }}
                  >
                    {embedCopied ? "Copied!" : "Copy"}
                  </button>
                  <pre className="overflow-x-auto pr-20 text-xs leading-relaxed text-white/90">
                    <code>
                      {`<script `}
                      <span style={{ color: "#9CA3AF" }}>{`src="https://www.showupapp.org/widget.js"`}</span>
                      {` `}
                      <span style={{ color: "#4ADE80" }}>{`data-key="${widgetKey ?? ""}"`}</span>
                      {`></script>`}
                    </code>
                  </pre>
                </div>
              </section>

              <section className="space-y-2">
                <p className="text-sm font-semibold" style={{ color: "#1A1A1A" }}>
                  Or share your booking page
                </p>
                <p className="text-xs" style={{ color: "#5B616E" }}>
                  Perfect if you don&apos;t have a website
                </p>
                <div className="flex flex-col items-start gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <a
                    href={bookingLink}
                    target="_blank"
                    rel="noreferrer"
                    className="break-all text-sm font-medium underline"
                    style={{ color: "#1A7F5A" }}
                  >
                    {bookingLink}
                  </a>
                  <button
                    type="button"
                    onClick={() => void handleCopyLink()}
                    className={`copy-btn rounded-[20px] border px-3 py-1 text-xs font-medium transition duration-200 ease-in-out ${
                      linkCopied ? "is-copied" : ""
                    }`}
                    style={{ borderColor: "rgba(15,15,15,0.15)", color: "#5B616E" }}
                  >
                    {linkCopied ? "Copied!" : "Copy link"}
                  </button>
                </div>
              </section>

              <div className="flex flex-col gap-2">
                <button
                  type="button"
                  onClick={() => router.replace("/dashboard")}
                  style={{ backgroundColor: BRAND }}
                  className="h-11 rounded-[24px] px-4 py-2.5 text-sm font-semibold text-white transition duration-200 ease-in-out hover:opacity-95"
                >
                  Go to Dashboard
                </button>
              </div>
            </div>
          ) : null}
        </div>
        {message ? (
          <p
            className="mx-auto mt-4 max-w-[560px] rounded-xl border bg-white px-4 py-3 text-sm shadow-sm"
            style={{ borderColor: "rgba(15,15,15,0.08)", color: "#5B616E" }}
          >
            {message}
          </p>
        ) : null}
      </main>

      <style jsx global>{`
        .step-card {
          animation: stepIn 0.25s ease both;
        }
        @keyframes stepIn {
          from {
            opacity: 0;
            transform: translateY(8px);
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
        .copy-btn.is-copied {
          border-color: rgba(26, 127, 90, 0.7) !important;
          color: #1a7f5a !important;
          box-shadow: 0 0 0 2px rgba(26, 127, 90, 0.12);
        }
      `}</style>
    </div>
  );
}

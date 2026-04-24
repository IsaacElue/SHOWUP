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

type BusinessRow = { id: string; widget_key: string };

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

    const { data: business, error: businessError } = await supabase
      .from("businesses")
      .upsert(
        {
          user_id: sessionUserId,
          name: businessName.trim(),
          category,
          description: description.trim() || null,
          location: location.trim() || null,
          available_hours: hours,
        },
        { onConflict: "user_id" }
      )
      .select("id, widget_key")
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
    setStep(4);
    setSaving(false);
  }

  async function handleCopy() {
    if (!embedCode) return;
    try {
      await navigator.clipboard.writeText(embedCode);
      setMessage("Embed code copied.");
    } catch {
      setMessage("Could not copy automatically. Please copy manually.");
    }
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

  if (loadingSession) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-white via-slate-50 to-slate-100">
        <p className="text-sm text-slate-600">Loading…</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-white via-slate-50 to-slate-100 px-4 py-8 sm:px-6">
      <div className="mx-auto max-w-3xl">
        <div className="mb-6 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#1A7F5A] text-lg font-bold text-white shadow-sm">
              S
            </span>
            <span className="text-base font-semibold tracking-tight text-slate-900">ShowUp</span>
          </Link>
          <p className="text-sm font-medium text-slate-600">Step {step} of 4</p>
        </div>

        <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
          {step === 1 ? (
            <div className="space-y-5 p-6 sm:p-8">
              <h1 className="text-2xl font-semibold text-slate-900">Business basics</h1>
              <label className="block space-y-1.5">
                <span className="text-sm font-medium text-slate-700">Business name</span>
                <input
                  value={businessName}
                  onChange={(e) => setBusinessName(e.target.value)}
                  required
                  className="w-full rounded-xl border border-slate-200 px-3 py-2.5 outline-none ring-[#1A7F5A]/25 focus:border-[#1A7F5A] focus:ring-2"
                />
              </label>
              <label className="block space-y-1.5">
                <span className="text-sm font-medium text-slate-700">Category</span>
                <select
                  value={category}
                  onChange={(e) => onCategoryChange(e.target.value as BusinessCategory)}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2.5 outline-none ring-[#1A7F5A]/25 focus:border-[#1A7F5A] focus:ring-2"
                >
                  {BUSINESS_CATEGORIES.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block space-y-1.5">
                <span className="text-sm font-medium text-slate-700">Location</span>
                <input
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="Blackrock, Dublin"
                  className="w-full rounded-xl border border-slate-200 px-3 py-2.5 outline-none ring-[#1A7F5A]/25 focus:border-[#1A7F5A] focus:ring-2"
                />
              </label>
              <label className="block space-y-1.5">
                <span className="text-sm font-medium text-slate-700">Short description</span>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Friendly hair salon in the heart of Blackrock"
                  rows={3}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2.5 outline-none ring-[#1A7F5A]/25 focus:border-[#1A7F5A] focus:ring-2"
                />
              </label>
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  className="rounded-xl bg-[#1A7F5A] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#166a4b]"
                >
                  Continue
                </button>
              </div>
            </div>
          ) : null}

          {step === 2 ? (
            <div className="space-y-5 p-6 sm:p-8">
              <h1 className="text-2xl font-semibold text-slate-900">Services</h1>
              <p className="text-sm text-slate-600">Add up to 10 services.</p>
              <div className="space-y-3">
                {services.map((service, index) => (
                  <div
                    key={`${index}-${service.name}`}
                    className="grid gap-2 rounded-2xl border border-slate-200 p-3 sm:grid-cols-12"
                  >
                    <input
                      value={service.name}
                      onChange={(e) => updateService(index, { name: e.target.value })}
                      placeholder="Service name"
                      className="rounded-lg border border-slate-200 px-3 py-2 sm:col-span-5"
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
                      className="rounded-lg border border-slate-200 px-3 py-2 sm:col-span-3"
                    />
                    <input
                      type="number"
                      min={0}
                      step="0.01"
                      value={service.price}
                      onChange={(e) => updateService(index, { price: Number(e.target.value || 0) })}
                      placeholder="Price €"
                      className="rounded-lg border border-slate-200 px-3 py-2 sm:col-span-3"
                    />
                    <button
                      type="button"
                      onClick={() => removeService(index)}
                      className="rounded-lg border border-rose-200 px-3 py-2 text-sm font-medium text-rose-700 sm:col-span-1"
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
                className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 disabled:opacity-50"
              >
                Add service
              </button>
              <div className="flex justify-between">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700"
                >
                  Back
                </button>
                <button
                  type="button"
                  onClick={() => setStep(3)}
                  className="rounded-xl bg-[#1A7F5A] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#166a4b]"
                >
                  Continue
                </button>
              </div>
            </div>
          ) : null}

          {step === 3 ? (
            <div className="space-y-5 p-6 sm:p-8">
              <h1 className="text-2xl font-semibold text-slate-900">Available hours</h1>
              <div className="space-y-3">
                {DAY_ROWS.map((day) => (
                  <div
                    key={day.key}
                    className="grid items-center gap-3 rounded-2xl border border-slate-200 p-3 sm:grid-cols-12"
                  >
                    <label className="flex items-center gap-2 sm:col-span-4">
                      <input
                        type="checkbox"
                        checked={hours[day.key].enabled}
                        onChange={(e) =>
                          setHours((prev) => ({
                            ...prev,
                            [day.key]: { ...prev[day.key], enabled: e.target.checked },
                          }))
                        }
                      />
                      <span className="text-sm font-medium text-slate-700">{day.label}</span>
                    </label>
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
                      className="rounded-lg border border-slate-200 px-3 py-2 disabled:bg-slate-100 sm:col-span-4"
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
                      className="rounded-lg border border-slate-200 px-3 py-2 disabled:bg-slate-100 sm:col-span-4"
                    />
                  </div>
                ))}
              </div>
              <div className="flex justify-between">
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700"
                >
                  Back
                </button>
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => void saveBusinessAndServices()}
                  className="rounded-xl bg-[#1A7F5A] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#166a4b] disabled:opacity-60"
                >
                  {saving ? "Saving..." : "Continue"}
                </button>
              </div>
            </div>
          ) : null}

          {step === 4 ? (
            <div className="space-y-5 p-6 sm:p-8">
              <h1 className="text-2xl font-semibold text-slate-900">Add this to your website</h1>
              <p className="text-sm text-slate-600">
                Paste this code before the {"</body>"} tag on your website. The ShowUp AI chat will
                appear automatically.
              </p>
              <pre className="overflow-x-auto rounded-2xl border border-slate-200 bg-slate-50 p-4 text-xs text-slate-800">
                {embedCode}
              </pre>
              <div className="flex flex-col gap-2 sm:flex-row">
                <button
                  type="button"
                  onClick={() => void handleCopy()}
                  className="rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700"
                >
                  Copy code
                </button>
                <button
                  type="button"
                  onClick={() => router.replace("/dashboard")}
                  style={{ backgroundColor: BRAND }}
                  className="rounded-xl px-4 py-2.5 text-sm font-semibold text-white hover:opacity-95"
                >
                  Go to Dashboard
                </button>
              </div>
            </div>
          ) : null}
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

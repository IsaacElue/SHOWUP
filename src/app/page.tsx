"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

const brand = "#1A7F5A";
const surface = "#FAFAFA";
const mutedSurface = "#F5F5F7";
const darkText = "#1A1A1A";
const mediumText = "#5B616E";
const darkSection = "#0F1A15";
const amber = "#F59E0B";
const blue = "#3B82F6";

function LogoMark({ className }: Readonly<{ className?: string }>) {
  return (
    <span
      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-lg font-bold text-white shadow-sm ${className ?? ""}`}
      style={{ backgroundColor: brand }}
    >
      S
    </span>
  );
}

export default function MarketingHomePage() {
  const router = useRouter();
  const [sessionChecked, setSessionChecked] = useState(false);
  const headlineLineTwo = "Always On.";
  const [typedHeadline, setTypedHeadline] = useState("");
  const [isTyping, setIsTyping] = useState(true);

  useEffect(() => {
    if (!supabase) {
      queueMicrotask(() => setSessionChecked(true));
      return;
    }

    supabase.auth.getSession().then(({ data }) => {
      if (data.session) {
        router.replace("/dashboard");
      } else {
        setSessionChecked(true);
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        router.replace("/dashboard");
      }
    });

    return () => subscription.unsubscribe();
  }, [router]);

  useEffect(() => {
    let i = 0;
    const timer = setInterval(() => {
      i += 1;
      setTypedHeadline(headlineLineTwo.slice(0, i));
      if (i >= headlineLineTwo.length) {
        clearInterval(timer);
        setIsTyping(false);
      }
    }, 90);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            observer.unobserve(entry.target);
          }
        }
      },
      { threshold: 0.16 }
    );
    const nodes = document.querySelectorAll("[data-reveal]");
    nodes.forEach((node) => observer.observe(node));
    return () => observer.disconnect();
  }, []);

  if (!supabase) {
    return (
      <div className="min-h-screen bg-slate-50 px-4 py-10">
        <p className="mx-auto max-w-lg text-center text-slate-600">
          This app isn’t fully set up yet. Ask your developer to finish configuration.
        </p>
      </div>
    );
  }

  if (!sessionChecked) {
    return (
      <div className="flex min-h-screen items-center justify-center" style={{ backgroundColor: surface }}>
        <p className="text-sm text-slate-600">Loading…</p>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen text-slate-800"
      style={{
        backgroundColor: surface,
        color: darkText,
      }}
    >
      <header
        className="sticky top-0 z-50 border-b backdrop-blur-xl"
        style={{
          backgroundColor: "rgba(250, 250, 250, 0.95)",
          borderColor: "rgba(15, 15, 15, 0.08)",
        }}
      >
        <nav className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <Link href="/" className="flex items-center gap-2">
            <LogoMark />
            <span className="text-lg font-semibold tracking-tight" style={{ color: darkText }}>
              ShowUp
            </span>
          </Link>
          <div className="hidden flex-1 items-center justify-center gap-8 text-sm font-medium md:flex">
            <a href="#features" className="transition hover:text-[#1A1A1A]" style={{ color: mediumText }}>
              Features
            </a>
            <a href="#pricing" className="transition hover:text-[#1A1A1A]" style={{ color: mediumText }}>
              Pricing
            </a>
            <a href="#about" className="transition hover:text-[#1A1A1A]" style={{ color: mediumText }}>
              About
            </a>
            <a href="#contact" className="transition hover:text-[#1A1A1A]" style={{ color: mediumText }}>
              Contact
            </a>
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            <Link
              href="/login"
              className="rounded-[24px] px-4 py-2 text-sm font-semibold transition duration-200 ease-in-out"
              style={{
                color: darkText,
                border: "1px solid rgba(15, 15, 15, 0.12)",
                backgroundColor: "transparent",
              }}
            >
              Log in
            </Link>
            <Link
              href="/login"
              className="rounded-[24px] px-4 py-2 text-sm font-semibold text-white transition duration-200 ease-in-out hover:opacity-95"
              style={{
                backgroundColor: brand,
                boxShadow: "0 6px 16px rgba(26,127,90,0.28)",
              }}
            >
              Start Free Trial
            </Link>
          </div>
        </nav>
      </header>

      <main>
        <section
          className="relative overflow-hidden border-b px-4 py-16 sm:py-24"
          style={{ borderColor: "rgba(15,15,15,0.06)" }}
        >
          <div
            aria-hidden
            className="hero-mesh pointer-events-none absolute inset-0"
          />
          <div aria-hidden className="hero-orb pointer-events-none absolute left-1/2 top-8 h-[26rem] w-[26rem] -translate-x-1/2 rounded-full blur-3xl" />
          <div className="mx-auto max-w-3xl text-center">
            <h1
              className="text-balance text-[44px] font-extrabold tracking-[-0.02em] sm:text-[72px] sm:leading-[1.02]"
              style={{ color: darkText }}
            >
              <span className="block">Your AI Front Desk.</span>
              <span className="mt-1 block">
                {typedHeadline}
                <span className={`typed-cursor ${isTyping ? "is-visible" : "is-hidden"}`}>|</span>
              </span>
            </h1>
            <p className="mx-auto mt-6 max-w-[520px] text-[18px] leading-8 sm:text-[18px]" style={{ color: mediumText }}>
              ShowUp&apos;s AI books appointments, answers client questions, and sends reminders
              automatically, so you never miss a booking or lose a client to a no-show.
            </p>
            <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row sm:gap-4">
              <div className="cta-shimmer rounded-[24px] p-[1px]">
                <Link
                  href="/login"
                  className="inline-flex w-full max-w-xs items-center justify-center rounded-[24px] px-6 py-3 text-sm font-semibold text-white transition duration-200 ease-in-out hover:opacity-95 sm:w-auto"
                  style={{
                    backgroundColor: brand,
                    boxShadow: "0 8px 20px rgba(26,127,90,0.28)",
                  }}
                >
                  Start Free Trial, 2 weeks free
                </Link>
              </div>
              <a
                href="#features"
                className="inline-flex w-full max-w-xs items-center justify-center rounded-[24px] border bg-transparent px-6 py-3 text-sm font-semibold transition duration-200 ease-in-out hover:bg-[#F5F5F7] sm:w-auto"
                style={{
                  borderColor: "rgba(15,15,15,0.14)",
                  color: darkText,
                }}
              >
                See how it works
              </a>
            </div>

            <div className="mx-auto mt-16 w-full max-w-5xl" data-reveal>
              <div className="grid gap-4 sm:grid-cols-12">
                <article
                  className="floating-card tilt-card rounded-xl border p-4 sm:col-span-5"
                  style={{
                    backgroundColor: "#121A16",
                    borderColor: "rgba(255,255,255,0.10)",
                    boxShadow: "0 12px 30px rgba(0,0,0,0.20), inset 0 1px 0 rgba(255,255,255,0.05)",
                  }}
                >
                  <p className="text-left text-xs font-semibold text-white/80">AI Chat Preview</p>
                  <div className="mt-3 space-y-2 text-left text-xs">
                    <div className="mr-auto max-w-[85%] rounded-lg bg-white px-3 py-2 text-[#1A1A1A]">
                      Hi, do you have anything Saturday?
                    </div>
                    <div className="ml-auto max-w-[85%] rounded-lg px-3 py-2 text-white" style={{ backgroundColor: brand }}>
                      We have 2pm and 4pm available. Which works?
                    </div>
                    <div className="mr-auto max-w-[85%] rounded-lg bg-white px-3 py-2 text-[#1A1A1A]">
                      2pm please
                    </div>
                    <div className="ml-auto max-w-[85%] rounded-lg px-3 py-2 text-white" style={{ backgroundColor: brand }}>
                      Booked! Confirmation on its way ✓
                    </div>
                  </div>
                </article>

                <article
                  className="floating-card floating-card-delay tilt-card rounded-xl border p-4 text-left sm:col-span-4"
                  style={{
                    backgroundColor: "#FAFAFA",
                    borderColor: "rgba(15,15,15,0.08)",
                    boxShadow: "0 12px 30px rgba(0,0,0,0.12), inset 0 1px 0 rgba(255,255,255,0.75)",
                  }}
                >
                  <p className="text-xs font-semibold" style={{ color: darkText }}>
                    Dashboard Preview
                  </p>
                  <div className="mt-3 grid grid-cols-3 gap-2">
                    <div className="rounded-lg bg-white p-2 text-center shadow-sm">
                      <p className="text-[10px] uppercase tracking-wide text-slate-500">Confirmed</p>
                      <p className="text-sm font-bold text-[#1A1A1A]">12</p>
                    </div>
                    <div className="rounded-lg bg-white p-2 text-center shadow-sm">
                      <p className="text-[10px] uppercase tracking-wide text-slate-500">Cancelled</p>
                      <p className="text-sm font-bold" style={{ color: amber }}>
                        2
                      </p>
                    </div>
                    <div className="rounded-lg bg-white p-2 text-center shadow-sm">
                      <p className="text-[10px] uppercase tracking-wide text-slate-500">No Reply</p>
                      <p className="text-sm font-bold" style={{ color: blue }}>
                        3
                      </p>
                    </div>
                  </div>
                  <div className="mt-3 space-y-2 text-xs">
                    <div className="flex items-center justify-between rounded-lg bg-white px-3 py-2 shadow-sm">
                      <span>Sarah - Haircut</span>
                      <span className="font-medium">2pm</span>
                    </div>
                    <div className="flex items-center justify-between rounded-lg bg-white px-3 py-2 shadow-sm">
                      <span>John - Colour</span>
                      <span className="font-medium">4pm</span>
                    </div>
                  </div>
                </article>

                <article
                  className="floating-card floating-card-slow rounded-xl border p-4 text-left sm:col-span-3"
                  style={{
                    backgroundColor: "#FAFAFA",
                    borderColor: "rgba(15,15,15,0.08)",
                    boxShadow: "0 12px 30px rgba(0,0,0,0.12), inset 0 1px 0 rgba(255,255,255,0.75)",
                  }}
                >
                  <p className="text-xs font-semibold" style={{ color: darkText }}>
                    Reminder Email
                  </p>
                  <div className="mt-3 rounded-lg bg-white p-3 shadow-sm">
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                      ShowUp
                    </p>
                    <p className="mt-1 text-xs text-slate-700">
                      Your appointment is tomorrow at 2:00pm.
                    </p>
                    <div className="mt-3 flex gap-2">
                      <button
                        type="button"
                        className="rounded-md px-2 py-1 text-[10px] font-semibold text-white"
                        style={{ backgroundColor: brand }}
                      >
                        Confirm
                      </button>
                      <button
                        type="button"
                        className="rounded-md border border-slate-300 px-2 py-1 text-[10px] font-semibold text-slate-700"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                </article>
              </div>
            </div>
          </div>
        </section>

        <section
          id="how-it-works"
          className="scroll-mt-24 border-b px-4 py-16 sm:py-20"
          style={{ backgroundColor: darkSection, borderColor: "rgba(255,255,255,0.08)" }}
          data-reveal
        >
          <div aria-hidden className="dot-grid-overlay absolute inset-0" />
          <div className="mx-auto max-w-6xl">
            <h2 className="text-center text-2xl font-semibold text-white sm:text-3xl">
              How it works
            </h2>
            <p className="mx-auto mt-2 max-w-xl text-center text-slate-300">
              Everything you need to move from enquiry to confirmed booking.
            </p>
            <div className="mt-12 grid gap-8 sm:grid-cols-3">
              {[
                {
                  step: "1",
                  title: "Add it to your website",
                  body: "We send you one line of code. Paste it on your site and your AI receptionist is live instantly.",
                },
                {
                  step: "2",
                  title: "Clients chat and get booked",
                  body: "Clients ask questions and book appointments in a natural conversation. Your AI handles it all, day or night.",
                },
                {
                  step: "3",
                  title: "You stay in control",
                  body: "See every booking and conversation on your dashboard. Get reminders sent automatically. Never chase a client again.",
                },
              ].map((item) => (
                <div
                  key={item.step}
                  className="relative overflow-hidden rounded-xl border p-6 text-left transition duration-200 ease-in-out hover:-translate-y-0.5"
                  style={{
                    backgroundColor: "rgba(255,255,255,0.03)",
                    borderColor: "rgba(26,127,90,0.35)",
                    boxShadow: "0 2px 12px rgba(0,0,0,0.08)",
                  }}
                >
                  <span
                    className="pointer-events-none absolute right-4 top-3 text-5xl font-semibold"
                    style={{ color: "rgba(255,255,255,0.08)" }}
                  >
                    {item.step}
                  </span>
                  <h3 className="text-lg font-semibold text-white">{item.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-slate-200">{item.body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section
          id="features"
          className="scroll-mt-24 border-b px-4 py-16 sm:py-20"
          style={{ backgroundColor: mutedSurface, borderColor: "rgba(15,15,15,0.06)" }}
          data-reveal
        >
          <div className="mx-auto max-w-6xl">
            <h2 className="text-center text-2xl font-semibold sm:text-3xl" style={{ color: darkText }}>
              Features
            </h2>
            <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {[
                "AI books appointments automatically",
                "24/7 availability, never miss an enquiry",
                "Automatic 24h and 2h reminders",
                "One-click confirm, cancel or reschedule",
                "Real-time dashboard",
                "Works for any service business",
              ].map((title) => (
                <div
                  key={title}
                  className="flex gap-4 rounded-xl border p-5 transition duration-200 ease-in-out hover:-translate-y-0.5"
                  style={{
                    backgroundColor: "#FAFAFA",
                    borderColor: "rgba(15,15,15,0.08)",
                    boxShadow: "0 2px 12px rgba(0,0,0,0.08)",
                  }}
                >
                  <span
                    className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-white"
                    style={{ backgroundColor: brand }}
                    aria-hidden
                  >
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                  </span>
                  <p className="text-sm font-medium leading-snug" style={{ color: darkText }}>
                    {title}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section
          id="pricing"
          className="scroll-mt-24 border-b px-4 py-16 sm:py-20"
          style={{ backgroundColor: surface, borderColor: "rgba(15,15,15,0.06)" }}
          data-reveal
        >
          <div className="mx-auto max-w-6xl">
            <h2 className="text-center text-2xl font-semibold sm:text-3xl" style={{ color: darkText }}>
              Pricing
            </h2>
            <p className="mx-auto mt-2 max-w-xl text-center" style={{ color: mediumText }}>
              All plans include a 2-week free trial.
            </p>
            <div className="mt-12 grid gap-6 lg:grid-cols-3">
              <div
                className="flex flex-col rounded-xl border p-6"
                style={{
                  backgroundColor: "#FAFAFA",
                  borderColor: "rgba(15,15,15,0.08)",
                  boxShadow: "0 2px 12px rgba(0,0,0,0.08)",
                }}
              >
                <p className="text-sm font-semibold uppercase tracking-wide" style={{ color: mediumText }}>
                  Starter
                </p>
                <p className="mt-2 text-3xl font-semibold" style={{ color: darkText }}>
                  €29<span className="text-base font-normal" style={{ color: mediumText }}>/month</span>
                </p>
                <ul className="mt-6 flex-1 space-y-2 text-sm" style={{ color: mediumText }}>
                  <li className="flex items-start gap-2"><span style={{ color: brand }}>✓</span>Up to 100 reminders/month</li>
                  <li className="flex items-start gap-2"><span style={{ color: brand }}>✓</span>Email reminders</li>
                  <li className="flex items-start gap-2"><span style={{ color: brand }}>✓</span>Confirm/cancel flow</li>
                  <li className="flex items-start gap-2"><span style={{ color: brand }}>✓</span>Dashboard</li>
                </ul>
                <Link
                  href="/login"
                  className="mt-8 block w-full rounded-[24px] py-3 text-center text-sm font-semibold text-white transition duration-200 ease-in-out hover:opacity-95"
                  style={{ backgroundColor: brand, boxShadow: "0 6px 16px rgba(26,127,90,0.25)" }}
                >
                  Start Free Trial
                </Link>
              </div>

              <div
                className="relative flex flex-col rounded-xl border p-6"
                style={{
                  backgroundColor: brand,
                  borderColor: "rgba(26,127,90,0.8)",
                  boxShadow: "0 2px 12px rgba(0,0,0,0.12)",
                }}
              >
                <span
                  className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full px-3 py-0.5 text-xs font-semibold text-white"
                  style={{ backgroundColor: "#0F1A15" }}
                >
                  Most popular
                </span>
                <p className="text-sm font-semibold uppercase tracking-wide text-white/80">Growth</p>
                <p className="mt-2 text-3xl font-semibold text-white">
                  €49<span className="text-base font-normal text-white/80">/month</span>
                </p>
                <ul className="mt-6 flex-1 space-y-2 text-sm text-white/90">
                  <li className="flex items-start gap-2"><span>✓</span>Up to 500 reminders/month</li>
                  <li className="flex items-start gap-2"><span>✓</span>Everything in Starter</li>
                  <li className="flex items-start gap-2"><span>✓</span>Reschedule flow</li>
                  <li className="flex items-start gap-2"><span>✓</span>Manual reminder button</li>
                  <li className="flex items-start gap-2"><span>✓</span>Priority email support</li>
                </ul>
                <Link
                  href="/login"
                  className="mt-8 block w-full rounded-[24px] bg-white py-3 text-center text-sm font-semibold transition duration-200 ease-in-out hover:bg-[#F5F5F7]"
                  style={{ color: darkText }}
                >
                  Start Free Trial
                </Link>
              </div>

              <div
                className="flex flex-col rounded-xl border p-6"
                style={{
                  backgroundColor: "#FAFAFA",
                  borderColor: "rgba(15,15,15,0.08)",
                  boxShadow: "0 2px 12px rgba(0,0,0,0.08)",
                }}
              >
                <p className="text-sm font-semibold uppercase tracking-wide" style={{ color: mediumText }}>
                  Pro
                </p>
                <p className="mt-2 text-3xl font-semibold" style={{ color: darkText }}>
                  €99<span className="text-base font-normal" style={{ color: mediumText }}>/month</span>
                </p>
                <ul className="mt-6 flex-1 space-y-2 text-sm" style={{ color: mediumText }}>
                  <li className="flex items-start gap-2"><span style={{ color: brand }}>✓</span>Unlimited reminders</li>
                  <li className="flex items-start gap-2"><span style={{ color: brand }}>✓</span>Everything in Growth</li>
                  <li className="flex items-start gap-2"><span style={{ color: brand }}>✓</span>SMS reminders (coming soon)</li>
                  <li className="flex items-start gap-2"><span style={{ color: brand }}>✓</span>Dedicated onboarding</li>
                </ul>
                <a
                  href="mailto:isaac@showupapp.org"
                  className="mt-8 block w-full rounded-[24px] border py-3 text-center text-sm font-semibold transition duration-200 ease-in-out hover:bg-[#F5F5F7]"
                  style={{ borderColor: "rgba(15,15,15,0.12)", color: darkText }}
                >
                  Contact Us
                </a>
              </div>
            </div>
          </div>
        </section>

        <section id="about" className="scroll-mt-24 border-b px-4 py-16 sm:py-20" style={{ borderColor: "rgba(15,15,15,0.06)" }} data-reveal>
          <div className="mx-auto max-w-3xl text-center">
            <h2 className="text-2xl font-semibold sm:text-3xl" style={{ color: darkText }}>
              About
            </h2>
            <p className="mt-6 text-base leading-7 sm:text-lg" style={{ color: mediumText }}>
              ShowUp was built for businesses that take bookings manually. We know no-shows are
              frustrating and costly. ShowUp fixes that, simply,
              automatically, and affordably.
            </p>
          </div>
        </section>

        <section id="contact" className="scroll-mt-24 px-4 py-16 sm:py-20" style={{ backgroundColor: mutedSurface }} data-reveal>
          <div className="mx-auto max-w-xl text-center">
            <h2 className="text-2xl font-semibold sm:text-3xl" style={{ color: darkText }}>
              Get in touch
            </h2>
            <p className="mt-6" style={{ color: mediumText }}>
              Email:{" "}
              <a
                href="mailto:isaac@showupapp.org"
                className="font-semibold underline decoration-slate-300 underline-offset-4 transition hover:text-[#1A1A1A]"
                style={{ color: brand }}
              >
                isaac@showupapp.org
              </a>
            </p>
            <p className="mt-3" style={{ color: mediumText }}>
              Phone:{" "}
              <a href="tel:+353830845787" className="font-semibold hover:underline" style={{ color: darkText }}>
                +353 83 084 5787
              </a>
            </p>
          </div>
        </section>
      </main>

      <footer className="border-t px-4 py-12 sm:px-6" style={{ backgroundColor: darkSection, borderColor: "rgba(255,255,255,0.08)" }}>
        <div className="mx-auto flex max-w-6xl flex-col gap-8 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-center gap-2">
            <LogoMark />
            <span className="text-lg font-semibold text-white">ShowUp</span>
          </div>
          <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-slate-300">
            <a href="#features" className="transition hover:text-white">
              Features
            </a>
            <a href="#pricing" className="transition hover:text-white">
              Pricing
            </a>
            <a href="#about" className="transition hover:text-white">
              About
            </a>
            <a href="#contact" className="transition hover:text-white">
              Contact
            </a>
            <Link href="/privacy" className="transition hover:text-white">
              Privacy Policy
            </Link>
            <Link href="/terms" className="transition hover:text-white">
              Terms
            </Link>
          </div>
        </div>
        <div className="mx-auto mt-8 max-w-6xl border-t border-white/10 pt-6 text-center text-xs text-slate-400 sm:text-left">
          <p>© 2026 ShowUp. All rights reserved.</p>
          <p className="mt-1">Built for Irish service businesses</p>
        </div>
      </footer>
      <style jsx global>{`
        [data-reveal] {
          opacity: 1;
          transform: none;
        }
        [data-reveal].is-visible {
          animation: fadeInUp 0.6s ease both;
        }
        .hero-mesh {
          background:
            radial-gradient(circle at 16% 24%, rgba(26, 127, 90, 0.12), transparent 42%),
            radial-gradient(circle at 78% 20%, rgba(59, 130, 246, 0.11), transparent 42%),
            radial-gradient(circle at 58% 72%, rgba(245, 158, 11, 0.08), transparent 45%);
        }
        .hero-orb {
          background: radial-gradient(circle, rgba(26, 127, 90, 0.2) 0%, rgba(59, 130, 246, 0.1) 55%, transparent 80%);
          animation: orbShift 8s ease-in-out infinite alternate;
        }
        .typed-cursor {
          display: inline-block;
          margin-left: 2px;
          color: ${brand};
          animation: blink 0.8s steps(1, end) infinite;
        }
        .typed-cursor.is-hidden {
          opacity: 0.45;
          animation: none;
        }
        .cta-shimmer {
          background: linear-gradient(120deg, rgba(26, 127, 90, 0.5), rgba(255, 255, 255, 0.65), rgba(26, 127, 90, 0.5));
          background-size: 200% 200%;
          animation: shimmer 2.8s ease-in-out infinite;
        }
        .floating-card {
          animation: floatY 6s ease-in-out infinite;
        }
        .floating-card-delay {
          animation-delay: 1.2s;
        }
        .floating-card-slow {
          animation-delay: 2s;
          animation-duration: 6.8s;
        }
        .tilt-card {
          transform: perspective(900px) rotateX(2deg) rotateY(-2deg);
        }
        .dot-grid-overlay {
          pointer-events: none;
          background-image: radial-gradient(rgba(255, 255, 255, 0.16) 0.8px, transparent 0.8px);
          background-size: 16px 16px;
          opacity: 0.12;
        }
        @keyframes blink {
          0%,
          49% {
            opacity: 1;
          }
          50%,
          100% {
            opacity: 0;
          }
        }
        @keyframes shimmer {
          0% {
            background-position: 0% 50%;
          }
          100% {
            background-position: 100% 50%;
          }
        }
        @keyframes floatY {
          0%,
          100% {
            transform: translateY(0) perspective(900px) rotateX(2deg) rotateY(-2deg);
          }
          50% {
            transform: translateY(-10px) perspective(900px) rotateX(2deg) rotateY(-2deg);
          }
        }
        @keyframes orbShift {
          0% {
            transform: translateX(-48%) translateY(0);
            filter: hue-rotate(0deg);
          }
          100% {
            transform: translateX(-52%) translateY(6px);
            filter: hue-rotate(12deg);
          }
        }
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(18px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
}

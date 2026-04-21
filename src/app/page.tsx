"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

const brand = "#1A7F5A";

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
      <div className="flex min-h-screen items-center justify-center bg-white">
        <p className="text-sm text-slate-600">Loading…</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white text-slate-800">
      <header className="sticky top-0 z-50 border-b border-slate-200/90 bg-white/95 backdrop-blur-md">
        <nav className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <Link href="/" className="flex items-center gap-2">
            <LogoMark />
            <span className="text-lg font-semibold tracking-tight text-slate-900">ShowUp</span>
          </Link>
          <div className="hidden flex-1 items-center justify-center gap-8 text-sm font-medium text-slate-600 md:flex">
            <a href="#features" className="hover:text-slate-900">
              Features
            </a>
            <a href="#pricing" className="hover:text-slate-900">
              Pricing
            </a>
            <a href="#about" className="hover:text-slate-900">
              About
            </a>
            <a href="#contact" className="hover:text-slate-900">
              Contact
            </a>
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            <Link
              href="/login"
              className="rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-800 transition hover:border-slate-400 hover:bg-slate-50"
            >
              Log in
            </Link>
            <Link
              href="/login"
              className="rounded-full px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:opacity-95"
              style={{ backgroundColor: brand }}
            >
              Start Free Trial
            </Link>
          </div>
        </nav>
      </header>

      <main>
        <section className="border-b border-slate-100 bg-gradient-to-b from-slate-50 to-white px-4 py-16 sm:py-24">
          <div className="mx-auto max-w-3xl text-center">
            <h1 className="text-4xl font-semibold tracking-tight text-slate-900 sm:text-5xl">
              Fewer no-shows. More revenue.
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-lg leading-8 text-slate-600 sm:text-xl">
              ShowUp automatically reminds your clients before every appointment. They confirm or
              cancel in one click. You see everything in one place.
            </p>
            <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row sm:gap-4">
              <Link
                href="/login"
                className="inline-flex w-full max-w-xs items-center justify-center rounded-full px-6 py-3 text-sm font-semibold text-white shadow-md transition hover:opacity-95 sm:w-auto"
                style={{ backgroundColor: brand }}
              >
                Start Free Trial — 2 weeks free
              </Link>
              <a
                href="#features"
                className="inline-flex w-full max-w-xs items-center justify-center rounded-full border border-slate-300 bg-white px-6 py-3 text-sm font-semibold text-slate-800 transition hover:bg-slate-50 sm:w-auto"
              >
                See how it works
              </a>
            </div>
          </div>
        </section>

        <section id="how-it-works" className="scroll-mt-24 border-b border-slate-100 px-4 py-16 sm:py-20">
          <div className="mx-auto max-w-6xl">
            <h2 className="text-center text-2xl font-semibold text-slate-900 sm:text-3xl">
              How it works
            </h2>
            <p className="mx-auto mt-2 max-w-xl text-center text-slate-600">
              Three simple steps from booking to clarity.
            </p>
            <div className="mt-12 grid gap-8 sm:grid-cols-3">
              {[
                {
                  step: "1",
                  title: "Add your appointment",
                  body: "Add client name, phone, optional email, date and time — all in one place.",
                },
                {
                  step: "2",
                  title: "They get reminded automatically",
                  body: "Clients receive a branded email reminder 24h and 2h before their appointment.",
                },
                {
                  step: "3",
                  title: "You see who’s coming",
                  body: "Your dashboard shows confirmed, cancelled, and no reply — updated in real time.",
                },
              ].map((item) => (
                <div
                  key={item.step}
                  className="rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-sm"
                >
                  <div
                    className="mx-auto flex h-12 w-12 items-center justify-center rounded-full text-lg font-bold text-white"
                    style={{ backgroundColor: brand }}
                  >
                    {item.step}
                  </div>
                  <h3 className="mt-4 text-lg font-semibold text-slate-900">{item.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-slate-600">{item.body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="features" className="scroll-mt-24 border-b border-slate-100 bg-slate-50/60 px-4 py-16 sm:py-20">
          <div className="mx-auto max-w-6xl">
            <h2 className="text-center text-2xl font-semibold text-slate-900 sm:text-3xl">
              Features
            </h2>
            <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {[
                "Instant booking confirmation email",
                "Automatic 24h and 2h reminders",
                "One-click confirm or cancel for clients",
                "Reschedule flow with owner approval",
                "Real-time dashboard",
                "Works for any service business",
              ].map((title) => (
                <div
                  key={title}
                  className="flex gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
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
                  <p className="text-sm font-medium leading-snug text-slate-900">{title}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="pricing" className="scroll-mt-24 border-b border-slate-100 px-4 py-16 sm:py-20">
          <div className="mx-auto max-w-6xl">
            <h2 className="text-center text-2xl font-semibold text-slate-900 sm:text-3xl">
              Pricing
            </h2>
            <p className="mx-auto mt-2 max-w-xl text-center text-slate-600">
              All plans include a 2-week free trial. No card required to start.
            </p>
            <div className="mt-12 grid gap-6 lg:grid-cols-3">
              <div className="flex flex-col rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <p className="text-sm font-semibold uppercase tracking-wide text-slate-500">Starter</p>
                <p className="mt-2 text-3xl font-semibold text-slate-900">
                  €29<span className="text-base font-normal text-slate-600">/month</span>
                </p>
                <ul className="mt-6 flex-1 space-y-2 text-sm text-slate-600">
                  <li>Up to 100 reminders/month</li>
                  <li>Email reminders</li>
                  <li>Confirm/cancel flow</li>
                  <li>Dashboard</li>
                </ul>
                <Link
                  href="/login"
                  className="mt-8 block w-full rounded-full py-3 text-center text-sm font-semibold text-white transition hover:opacity-95"
                  style={{ backgroundColor: brand }}
                >
                  Start Free Trial
                </Link>
              </div>

              <div
                className="relative flex flex-col rounded-2xl border-2 bg-white p-6 shadow-md"
                style={{ borderColor: brand }}
              >
                <span
                  className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full px-3 py-0.5 text-xs font-semibold text-white"
                  style={{ backgroundColor: brand }}
                >
                  Most popular
                </span>
                <p className="text-sm font-semibold uppercase tracking-wide text-slate-500">Growth</p>
                <p className="mt-2 text-3xl font-semibold text-slate-900">
                  €49<span className="text-base font-normal text-slate-600">/month</span>
                </p>
                <ul className="mt-6 flex-1 space-y-2 text-sm text-slate-600">
                  <li>Up to 500 reminders/month</li>
                  <li>Everything in Starter</li>
                  <li>Reschedule flow</li>
                  <li>Manual reminder button</li>
                  <li>Priority email support</li>
                </ul>
                <Link
                  href="/login"
                  className="mt-8 block w-full rounded-full py-3 text-center text-sm font-semibold text-white transition hover:opacity-95"
                  style={{ backgroundColor: brand }}
                >
                  Start Free Trial
                </Link>
              </div>

              <div className="flex flex-col rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <p className="text-sm font-semibold uppercase tracking-wide text-slate-500">Pro</p>
                <p className="mt-2 text-3xl font-semibold text-slate-900">
                  €99<span className="text-base font-normal text-slate-600">/month</span>
                </p>
                <ul className="mt-6 flex-1 space-y-2 text-sm text-slate-600">
                  <li>Unlimited reminders</li>
                  <li>Everything in Growth</li>
                  <li>SMS reminders (coming soon)</li>
                  <li>Dedicated onboarding</li>
                </ul>
                <a
                  href="mailto:isaac@showupapp.org"
                  className="mt-8 block w-full rounded-full border border-slate-300 py-3 text-center text-sm font-semibold text-slate-800 transition hover:bg-slate-50"
                >
                  Contact Us
                </a>
              </div>
            </div>
          </div>
        </section>

        <section id="about" className="scroll-mt-24 border-b border-slate-100 px-4 py-16 sm:py-20">
          <div className="mx-auto max-w-3xl text-center">
            <h2 className="text-2xl font-semibold text-slate-900 sm:text-3xl">About</h2>
            <p className="mt-6 text-base leading-7 text-slate-600 sm:text-lg">
              ShowUp was built for small service businesses in Ireland that take bookings by phone
              or in person. We know no-shows are frustrating and costly. ShowUp fixes that — simply,
              automatically, and affordably.
            </p>
          </div>
        </section>

        <section id="contact" className="scroll-mt-24 bg-slate-50/60 px-4 py-16 sm:py-20">
          <div className="mx-auto max-w-xl text-center">
            <h2 className="text-2xl font-semibold text-slate-900 sm:text-3xl">Get in touch</h2>
            <p className="mt-6 text-slate-600">
              Email:{" "}
              <a
                href="mailto:isaac@showupapp.org"
                className="font-semibold underline decoration-slate-300 underline-offset-4 hover:text-slate-900"
                style={{ color: brand }}
              >
                isaac@showupapp.org
              </a>
            </p>
            <p className="mt-3 text-slate-600">
              Phone:{" "}
              <a href="tel:+353830845787" className="font-semibold text-slate-900 hover:underline">
                083 084 5787
              </a>
            </p>
          </div>
        </section>
      </main>

      <footer className="border-t border-slate-200 bg-white px-4 py-12 sm:px-6">
        <div className="mx-auto flex max-w-6xl flex-col gap-8 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-center gap-2">
            <LogoMark />
            <span className="text-lg font-semibold text-slate-900">ShowUp</span>
          </div>
          <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-slate-600">
            <a href="#features" className="hover:text-slate-900">
              Features
            </a>
            <a href="#pricing" className="hover:text-slate-900">
              Pricing
            </a>
            <a href="#about" className="hover:text-slate-900">
              About
            </a>
            <a href="#contact" className="hover:text-slate-900">
              Contact
            </a>
            <Link href="/privacy" className="hover:text-slate-900">
              Privacy Policy
            </Link>
            <Link href="/terms" className="hover:text-slate-900">
              Terms
            </Link>
          </div>
        </div>
        <div className="mx-auto mt-8 max-w-6xl border-t border-slate-100 pt-6 text-center text-xs text-slate-500 sm:text-left">
          <p>© 2026 ShowUp. All rights reserved.</p>
          <p className="mt-1">Built for Irish service businesses</p>
        </div>
      </footer>
    </div>
  );
}

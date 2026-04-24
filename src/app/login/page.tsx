"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

function friendlyAuthMessage(raw: string) {
  const lower = raw.toLowerCase();
  if (lower.includes("invalid login") || lower.includes("invalid credentials")) {
    return "That email or password doesn’t look right. Please try again.";
  }
  if (lower.includes("email not confirmed")) {
    return "Please confirm your email first, then try signing in.";
  }
  return raw;
}

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [checkedSession, setCheckedSession] = useState(false);

  async function redirectAfterAuth(userId: string) {
    if (!supabase) return;
    const { data: business } = await supabase
      .from("businesses")
      .select("id")
      .eq("user_id", userId)
      .maybeSingle();
    router.replace(business ? "/dashboard" : "/onboarding");
  }

  useEffect(() => {
    if (!supabase) {
      queueMicrotask(() => setCheckedSession(true));
      return;
    }

    supabase.auth.getSession().then(({ data }) => {
      if (data.session) {
        void redirectAfterAuth(data.session.user.id);
      } else {
        setCheckedSession(true);
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        void redirectAfterAuth(session.user.id);
      }
    });

    return () => subscription.unsubscribe();
  }, [router]);

  async function handleSignUp(e: React.SyntheticEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!supabase) return;

    setLoading(true);
    setMessage(null);

    const { data, error } = await supabase.auth.signUp({ email, password });

    if (error) {
      setMessage(friendlyAuthMessage(error.message));
    } else {
      const userId = data.user?.id;
      const signedUpEmail = data.user?.email;
      const signedUpAt = data.user?.created_at;
      if (userId && signedUpEmail) {
        try {
          await fetch("/api/signup/new-user", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ userId, email: signedUpEmail, signedUpAt }),
          });
        } catch {
          // best-effort
        }
      }
      setMessage(
        "You’re almost there — check your inbox to confirm your email, then sign in below."
      );
    }

    setLoading(false);
  }

  async function handleLogIn(e: React.SyntheticEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!supabase) return;

    setLoading(true);
    setMessage(null);

    const { data, error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      setMessage(friendlyAuthMessage(error.message));
    } else {
      setMessage(null);
      if (data.user?.id) {
        await redirectAfterAuth(data.user.id);
      } else {
        router.replace("/dashboard");
      }
    }

    setLoading(false);
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

  if (!checkedSession) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-white via-slate-50 to-slate-100">
        <p className="text-sm text-slate-600">Loading…</p>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-b from-white via-slate-50 to-slate-100 pb-10">
      <header className="border-b border-slate-200/80 bg-white/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <Link href="/" className="flex items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#1A7F5A] text-lg font-bold text-white shadow-sm">
              S
            </span>
            <span className="text-base font-semibold tracking-tight text-slate-900">ShowUp</span>
          </Link>
          <Link
            href="/"
            className="text-sm font-medium text-slate-600 underline-offset-4 hover:text-slate-900 hover:underline"
          >
            Back to home
          </Link>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-4 py-12 sm:px-6">
        <div className="space-y-6">
          <div className="text-center">
            <h1 className="text-2xl font-semibold text-slate-900 sm:text-3xl">Welcome back</h1>
            <p className="mt-2 text-sm text-slate-600">
              Sign in to manage today’s bookings and reminders.
            </p>
          </div>

          <form
            onSubmit={handleLogIn}
            className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
          >
            <label className="block space-y-1.5">
              <span className="text-sm font-medium text-slate-700">Email</span>
              <input
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-slate-900 outline-none ring-[#1A7F5A]/25 transition focus:border-[#1A7F5A] focus:ring-2"
              />
            </label>
            <label className="block space-y-1.5">
              <span className="text-sm font-medium text-slate-700">Password</span>
              <input
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-slate-900 outline-none ring-[#1A7F5A]/25 transition focus:border-[#1A7F5A] focus:ring-2"
              />
            </label>
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-[#1A7F5A] py-3 text-sm font-semibold text-white shadow-md transition hover:bg-[#166a4b] disabled:opacity-60"
            >
              {loading ? "Signing in…" : "Sign in"}
            </button>
          </form>

          <form
            onSubmit={handleSignUp}
            className="space-y-4 rounded-2xl border border-dashed border-slate-200 bg-white/70 p-5"
          >
            <p className="text-center text-sm font-medium text-slate-800">New here? Create an account</p>
            <p className="text-center text-xs text-slate-500">
              Use the same email and password you’ll use to sign in.
            </p>
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl border border-slate-200 bg-white py-3 text-sm font-semibold text-slate-800 transition hover:bg-slate-50 disabled:opacity-60"
            >
              {loading ? "Please wait…" : "Create account"}
            </button>
          </form>

          {message ? (
            <p className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-center text-sm text-slate-700 shadow-sm">
              {message}
            </p>
          ) : null}
        </div>
      </main>
    </div>
  );
}

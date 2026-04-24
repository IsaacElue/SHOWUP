"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

const brand = "#1A7F5A";
const surface = "#FAFAFA";
const mutedSurface = "#F5F5F7";
const darkText = "#1A1A1A";
const mediumText = "#5B616E";
const darkSection = "#0F1A15";

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

  const redirectAfterAuth = useCallback(async (userId: string, createdAt?: string | null) => {
    if (!supabase) return;
    const { data: business } = await supabase
      .from("businesses")
      .select("id")
      .eq("user_id", userId)
      .maybeSingle();
    if (business) {
      router.replace("/dashboard");
      return;
    }

    const createdMs = createdAt ? new Date(createdAt).getTime() : Number.NaN;
    const isNewUser = Number.isFinite(createdMs) && Date.now() - createdMs < 60 * 60 * 1000;
    router.replace(isNewUser ? "/onboarding" : "/dashboard");
  }, [router]);

  useEffect(() => {
    if (!supabase) {
      queueMicrotask(() => setCheckedSession(true));
      return;
    }

    supabase.auth.getSession().then(({ data }) => {
      if (data.session) {
        void redirectAfterAuth(data.session.user.id, data.session.user.created_at);
      } else {
        setCheckedSession(true);
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        void redirectAfterAuth(session.user.id, session.user.created_at);
      }
    });

    return () => subscription.unsubscribe();
  }, [redirectAfterAuth]);

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
        await redirectAfterAuth(data.user.id, data.user.created_at);
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
      <div className="flex min-h-screen items-center justify-center" style={{ backgroundColor: surface }}>
        <p className="text-sm text-slate-600">Loading…</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: surface }}>
      <div className="grid min-h-screen md:grid-cols-5">
        <aside
          className="relative hidden overflow-hidden md:col-span-2 md:flex md:flex-col md:justify-center md:px-10"
          style={{ backgroundColor: darkSection }}
        >
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0"
            style={{
              background:
                "radial-gradient(circle at 20% 20%, rgba(26,127,90,0.18), transparent 40%), radial-gradient(circle at 80% 25%, rgba(59,130,246,0.14), transparent 42%)",
            }}
          />
          <div className="relative z-10">
            <div className="flex items-center gap-2">
              <span
                className="flex h-10 w-10 items-center justify-center rounded-xl text-lg font-bold text-white"
                style={{
                  backgroundColor: brand,
                  boxShadow: "0 2px 12px rgba(0,0,0,0.08)",
                }}
              >
                S
              </span>
              <span className="text-xl font-semibold tracking-tight text-white">ShowUp</span>
            </div>
            <h1 className="mt-10 text-4xl font-extrabold tracking-[-0.02em] leading-tight text-white">
              Your AI Front Desk. Always On.
            </h1>
            <p className="mt-4 max-w-sm text-sm leading-6 text-white/60">
              Join hundreds of service businesses reducing no-shows automatically.
            </p>
          </div>

          <div className="decorative-orb decorative-orb-a" />
          <div className="decorative-orb decorative-orb-b" />
          <div className="decorative-orb decorative-orb-c" />
        </aside>

        <section className="relative flex min-h-screen flex-col justify-center px-4 py-8 sm:px-6 md:col-span-3">
          <header className="mb-8 flex items-center justify-between md:hidden">
            <Link href="/" className="mx-auto flex items-center gap-2">
              <span
                className="flex h-9 w-9 items-center justify-center rounded-xl text-lg font-bold text-white"
                style={{ backgroundColor: brand }}
              >
                S
              </span>
              <span className="text-base font-semibold tracking-tight" style={{ color: darkText }}>
                ShowUp
              </span>
            </Link>
          </header>

          <div className="mx-auto w-full max-w-md">
            <div
              className="login-card-fade rounded-xl border bg-white p-6 sm:p-8"
              style={{
                borderColor: "rgba(15,15,15,0.08)",
                boxShadow: "0 2px 12px rgba(0,0,0,0.08)",
              }}
            >
              <div className="text-center">
                <h1 className="text-[28px] font-bold tracking-[-0.02em]" style={{ color: darkText }}>
                  Welcome back
                </h1>
                <p className="mt-2 text-sm" style={{ color: mediumText }}>
                  Sign in to your ShowUp account
                </p>
              </div>

              <form onSubmit={handleLogIn} className="mt-6 space-y-4">
                <label className="block space-y-1.5">
                  <span className="text-xs font-medium uppercase tracking-wide" style={{ color: mediumText }}>
                    Email
                  </span>
                  <input
                    type="email"
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    placeholder="name@example.com"
                    className="h-11 w-full rounded-xl border-2 border-transparent px-3 text-sm outline-none transition duration-200 ease-in-out placeholder:text-slate-400 focus:border-[#1A7F5A]"
                    style={{ backgroundColor: mutedSurface, color: darkText }}
                  />
                </label>
                <label className="block space-y-1.5">
                  <span className="text-xs font-medium uppercase tracking-wide" style={{ color: mediumText }}>
                    Password
                  </span>
                  <input
                    type="password"
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    placeholder="••••••••"
                    className="h-11 w-full rounded-xl border-2 border-transparent px-3 text-sm outline-none transition duration-200 ease-in-out placeholder:text-slate-400 focus:border-[#1A7F5A]"
                    style={{ backgroundColor: mutedSurface, color: darkText }}
                  />
                </label>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full rounded-[24px] py-3 text-sm font-semibold text-white transition duration-200 ease-in-out hover:opacity-95 disabled:opacity-60"
                  style={{
                    backgroundColor: brand,
                    boxShadow: "0 6px 16px rgba(26,127,90,0.28)",
                  }}
                >
                  {loading ? "Signing in…" : "Sign in"}
                </button>
              </form>

              <div className="my-6 flex items-center gap-3">
                <hr className="h-px flex-1 border-0" style={{ backgroundColor: "rgba(15,15,15,0.12)" }} />
                <span className="text-xs font-medium" style={{ color: mediumText }}>
                  or
                </span>
                <hr className="h-px flex-1 border-0" style={{ backgroundColor: "rgba(15,15,15,0.12)" }} />
              </div>

              <div
                className="rounded-xl border bg-white/80 p-5"
                style={{ borderColor: "rgba(15,15,15,0.08)" }}
              >
                <p className="text-center text-sm font-semibold" style={{ color: darkText }}>
                  New here? Create an account
                </p>
                <p className="mt-1 text-center text-xs" style={{ color: mediumText }}>
                  Use the same email and password you&apos;ll use to sign in.
                </p>
                <form onSubmit={handleSignUp} className="mt-4">
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full rounded-[24px] border py-3 text-sm font-semibold transition duration-200 ease-in-out hover:bg-[#F5F5F7] disabled:opacity-60"
                    style={{ borderColor: "rgba(15,15,15,0.12)", color: darkText }}
                  >
                    {loading ? "Please wait…" : "Create account"}
                  </button>
                </form>
              </div>

              {message ? (
                <p
                  className="mt-5 rounded-xl border px-4 py-3 text-center text-sm"
                  style={{
                    borderColor: "rgba(15,15,15,0.12)",
                    backgroundColor: "#FAFAFA",
                    color: darkText,
                  }}
                >
                  {message}
                </p>
              ) : null}
            </div>

            <div className="mt-5 text-center">
              <Link href="/" className="text-sm font-medium hover:underline" style={{ color: mediumText }}>
                Back to home
              </Link>
            </div>
          </div>
        </section>
      </div>
      <style jsx global>{`
        .decorative-orb {
          position: absolute;
          border-radius: 9999px;
          pointer-events: none;
          animation: slowPulse 12s ease-in-out infinite;
        }
        .decorative-orb-a {
          width: 280px;
          height: 280px;
          left: -80px;
          bottom: -120px;
          background: radial-gradient(circle, rgba(26, 127, 90, 0.5), rgba(26, 127, 90, 0.1), transparent 70%);
        }
        .decorative-orb-b {
          width: 220px;
          height: 220px;
          left: 70px;
          bottom: -90px;
          background: radial-gradient(circle, rgba(26, 127, 90, 0.32), rgba(26, 127, 90, 0.08), transparent 72%);
          animation-delay: 2s;
        }
        .decorative-orb-c {
          width: 160px;
          height: 160px;
          left: 30px;
          bottom: 40px;
          background: radial-gradient(circle, rgba(26, 127, 90, 0.2), transparent 68%);
          animation-delay: 4s;
        }
        .login-card-fade {
          animation: loginFadeIn 0.4s ease both;
        }
        @keyframes slowPulse {
          0%,
          100% {
            transform: translateY(0) scale(1);
            opacity: 0.95;
          }
          50% {
            transform: translateY(-8px) scale(1.03);
            opacity: 0.78;
          }
        }
        @keyframes loginFadeIn {
          from {
            opacity: 0;
            transform: translateY(12px);
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

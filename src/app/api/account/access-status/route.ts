import { getUserFromBearerRequest } from "@/lib/auth-server";
import { supabaseAdmin } from "@/lib/supabase-admin";

const TRIAL_DAYS = 14;

export async function GET(req: Request) {
  const { user, error: authError } = await getUserFromBearerRequest(req);
  if (!user) {
    return Response.json(
      { error: authError === "Server not configured" ? authError : "Unauthorized" },
      { status: authError === "Server not configured" ? 500 : 401 }
    );
  }

  if (!supabaseAdmin) {
    return Response.json({ error: "Server not configured" }, { status: 500 });
  }

  const { data: profile, error } = await supabaseAdmin
    .from("profiles")
    .select("trial_start_date, subscription_active")
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  const trialStartIso = profile?.trial_start_date ?? user.created_at ?? new Date().toISOString();
  const trialStart = new Date(trialStartIso);
  const trialEndsAt = new Date(trialStart.getTime() + TRIAL_DAYS * 24 * 60 * 60 * 1000);
  const now = new Date();
  const subscriptionActive = Boolean(profile?.subscription_active);
  const trialExpired = now > trialEndsAt;
  const allowed = subscriptionActive || !trialExpired;

  return Response.json({
    allowed,
    trialEndsAt: trialEndsAt.toISOString(),
    reason: allowed ? "ok" : "trial_expired",
  });
}

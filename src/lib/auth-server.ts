import { createClient } from "@supabase/supabase-js";

/**
 * Validates the Supabase JWT from Authorization: Bearer <access_token>
 * and returns the authenticated user, or null.
 */
export async function getUserFromBearerRequest(req: Request) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    return { user: null as null, error: "Server not configured" as const };
  }

  const auth = req.headers.get("authorization");
  const token = auth?.startsWith("Bearer ") ? auth.slice("Bearer ".length).trim() : "";
  if (!token) {
    return { user: null as null, error: "Unauthorized" as const };
  }

  const supabase = createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser(token);

  if (error || !user) {
    return { user: null as null, error: "Unauthorized" as const };
  }

  return { user, error: null as null };
}

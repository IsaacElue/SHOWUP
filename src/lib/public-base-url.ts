/** Public site origin for email links (no trailing slash). */
export function getPublicBaseUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (explicit) {
    return explicit.replace(/\/$/, "");
  }
  const vercel = process.env.VERCEL_URL?.trim();
  if (vercel) {
    const host = vercel.replace(/\/$/, "");
    return host.startsWith("http") ? host : `https://${host}`;
  }
  throw new Error(
    "Set NEXT_PUBLIC_APP_URL to your site URL (e.g. https://your-app.vercel.app) for email links."
  );
}

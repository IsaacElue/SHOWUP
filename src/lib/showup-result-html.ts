import { escapeHtml } from "@/lib/reminder-email-html";

/** Minimal branded HTML for one-off API responses (owner accept/decline). */
export function showUpOwnerActionResultPage(heading: string, subtext: string) {
  const safeHeading = escapeHtml(heading);
  const safeSub = escapeHtml(subtext);
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${safeHeading}</title>
</head>
<body style="margin:0;background:linear-gradient(to bottom,#ecfdf5,#f8fafc,#f1f5f9);min-height:100vh;font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;">
  <div style="max-width:28rem;margin:0 auto;padding:2.5rem 1rem 3rem;text-align:center;">
    <p style="margin:0;font-size:1.25rem;font-weight:700;color:#059669;">ShowUp</p>
    <div style="margin-top:2rem;border-radius:1rem;border:1px solid #a7f3d0;background:#ecfdf5;padding:1.75rem 1.5rem;box-shadow:0 1px 2px rgba(0,0,0,0.05);">
      <p style="margin:0;font-size:1.125rem;font-weight:600;color:#065f46;">${safeHeading}</p>
      <p style="margin:0.75rem 0 0;font-size:0.9375rem;line-height:1.5;color:#475569;">${safeSub}</p>
    </div>
    <p style="margin-top:2rem;font-size:0.75rem;color:#94a3b8;">Powered by ShowUp</p>
  </div>
</body>
</html>`;
}

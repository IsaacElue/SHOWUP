function escapeHtml(text: string) {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function buildReminderEmailPlainText(
  clientName: string,
  appointmentAtIso: string,
  confirmationToken: string,
  baseUrl: string
) {
  const when = new Date(appointmentAtIso).toLocaleString("en-IE", {
    timeZone: "Europe/Dublin",
    dateStyle: "full",
    timeStyle: "short",
  });
  const base = baseUrl.replace(/\/$/, "");
  const confirmUrl = `${base}/confirm?token=${encodeURIComponent(confirmationToken)}&response=Y`;
  const cancelUrl = `${base}/confirm?token=${encodeURIComponent(confirmationToken)}&response=N`;
  return `Hi ${clientName}, you have an appointment coming up on ${when}.

Confirm: ${confirmUrl}
Cancel: ${cancelUrl}

Powered by ShowUp`;
}

export function buildReminderEmailHtml(
  clientName: string,
  appointmentAtIso: string,
  confirmationToken: string,
  baseUrl: string
) {
  const when = new Date(appointmentAtIso).toLocaleString("en-IE", {
    timeZone: "Europe/Dublin",
    dateStyle: "full",
    timeStyle: "short",
  });
  const safeName = escapeHtml(clientName);
  const safeWhen = escapeHtml(when);
  const base = baseUrl.replace(/\/$/, "");
  const confirmUrl = `${base}/confirm?token=${encodeURIComponent(confirmationToken)}&response=Y`;
  const cancelUrl = `${base}/confirm?token=${encodeURIComponent(confirmationToken)}&response=N`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Appointment reminder</title>
</head>
<body style="margin:0;padding:0;background-color:#f4f4f5;font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:#f4f4f5;padding:24px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" style="max-width:480px;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.08);">
          <tr>
            <td style="background:#059669;padding:20px 24px;text-align:center;">
              <p style="margin:0;font-size:22px;font-weight:700;color:#ffffff;letter-spacing:-0.02em;">ShowUp</p>
            </td>
          </tr>
          <tr>
            <td style="padding:28px 24px 8px;">
              <p style="margin:0 0 16px;font-size:16px;line-height:1.55;color:#18181b;">
                Hi ${safeName}, you have an appointment coming up on <strong>${safeWhen}</strong>.
              </p>
              <p style="margin:0 0 24px;font-size:15px;line-height:1.5;color:#52525b;">
                Let us know if you can make it:
              </p>
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                <tr>
                  <td style="padding:8px 0;">
                    <a href="${confirmUrl}" style="display:block;text-align:center;background:#059669;color:#ffffff;text-decoration:none;font-weight:600;font-size:16px;padding:14px 20px;border-radius:10px;">
                      ✅ Confirm Appointment
                    </a>
                  </td>
                </tr>
                <tr>
                  <td style="padding:8px 0 0;">
                    <a href="${cancelUrl}" style="display:block;text-align:center;background:#f4f4f5;color:#b91c1c;text-decoration:none;font-weight:600;font-size:16px;padding:14px 20px;border-radius:10px;border:1px solid #e4e4e7;">
                      ❌ Cancel Appointment
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:16px 24px 24px;border-top:1px solid #e4e4e7;">
              <p style="margin:0;font-size:12px;color:#a1a1aa;text-align:center;">Powered by ShowUp</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

interface ResetPasswordEmailTemplateInput {
    appName?: string;
    expiresInMinutes?: number;
    recipientName?: string | null;
    resetUrl: string;
    supportEmail?: string;
}

interface EmailTemplateContent {
    html: string;
    subject: string;
    text: string;
}

const escapeHtml = (value: string) =>
    value
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#39;");

export const createResetPasswordEmailTemplate = ({
    appName = "Stock Sphere",
    expiresInMinutes = 60,
    recipientName,
    resetUrl,
    supportEmail = "support@stocksphere.com",
}: ResetPasswordEmailTemplateInput): EmailTemplateContent => {
    const safeAppName = escapeHtml(appName);
    const safeSupportEmail = escapeHtml(supportEmail);
    const safeRecipientName = recipientName ? escapeHtml(recipientName) : null;
    const safeResetUrl = escapeHtml(resetUrl);
    const greeting = safeRecipientName
        ? `Hi ${safeRecipientName},`
        : "Hi there,";
    const subject = `${appName}: Reset your password`;

    const text = [
        `${greeting}`,
        "",
        `We received a request to reset your ${appName} password.`,
        `Use the link below within ${expiresInMinutes} minutes:`,
        "",
        resetUrl,
        "",
        "If you did not request this, you can safely ignore this email.",
        "",
        `Need help? Contact us at ${supportEmail}.`,
    ].join("\n");

    const html = `
<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${safeAppName} Password Reset</title>
  </head>
  <body style="margin:0;padding:0;background-color:#f4f6fb;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#1f2937;">
    <span style="display:none;max-height:0;overflow:hidden;opacity:0;visibility:hidden;">Reset your ${safeAppName} password securely.</span>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f6fb;padding:24px 12px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background-color:#ffffff;border:1px solid #e5e7eb;border-radius:12px;overflow:hidden;">
            <tr>
              <td style="padding:24px 28px;background-color:#111827;">
                <p style="margin:0;color:#ffffff;font-size:20px;font-weight:700;letter-spacing:0.2px;">${safeAppName}</p>
              </td>
            </tr>
            <tr>
              <td style="padding:28px;">
                <h1 style="margin:0 0 12px;font-size:22px;line-height:1.3;color:#111827;">Reset your password</h1>
                <p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#374151;">${greeting}</p>
                <p style="margin:0 0 20px;font-size:15px;line-height:1.6;color:#374151;">We received a request to reset your password. For security, this link expires in <strong>${expiresInMinutes} minutes</strong>.</p>
                <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 20px;">
                  <tr>
                    <td style="border-radius:8px;background-color:#0f62fe;">
                      <a href="${safeResetUrl}" style="display:inline-block;padding:12px 22px;font-size:15px;font-weight:600;line-height:1;color:#ffffff;text-decoration:none;">Reset password</a>
                    </td>
                  </tr>
                </table>
                <p style="margin:0 0 8px;font-size:14px;line-height:1.6;color:#6b7280;">If the button does not work, paste this URL into your browser:</p>
                <p style="margin:0 0 20px;font-size:14px;line-height:1.6;word-break:break-all;"><a href="${safeResetUrl}" style="color:#0f62fe;text-decoration:underline;">${safeResetUrl}</a></p>
                <p style="margin:0 0 20px;font-size:14px;line-height:1.6;color:#6b7280;">If you did not request a password reset, you can ignore this email.</p>
                <hr style="border:none;border-top:1px solid #e5e7eb;margin:0 0 16px;" />
                <p style="margin:0;font-size:13px;line-height:1.6;color:#6b7280;">Need help? Contact <a href="mailto:${safeSupportEmail}" style="color:#0f62fe;text-decoration:underline;">${safeSupportEmail}</a>.</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>
`;

    return {
        html,
        subject,
        text,
    };
};

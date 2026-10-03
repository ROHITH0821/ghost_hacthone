import { Resend } from "resend";
import { copy } from "@/lib/copy";

let resendClient: Resend | null = null;

function getResend(): Resend {
  if (!resendClient) {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      throw new Error("RESEND_API_KEY is not configured");
    }
    resendClient = new Resend(apiKey);
  }
  return resendClient;
}

export function getFromEmail(): string {
  const from = process.env.RESEND_FROM_EMAIL ?? "Ghost <onboarding@resend.dev>";
  if (from.includes("<") && from.includes(">")) {
    return from;
  }
  return `Ghost <${from}>`;
}

function isResendTestFrom(from: string): boolean {
  return /resend\.dev/i.test(from);
}

function userFacingResendError(message?: string, statusCode?: number): string {
  const lower = (message ?? "").toLowerCase();
  if (
    statusCode === 403 ||
    lower.includes("only send testing emails") ||
    lower.includes("verify a domain")
  ) {
    return copy.authApi.emailTestModeBlocked;
  }
  return copy.authApi.emailSendFailed;
}

export async function sendOtpEmail(
  to: string,
  code: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const resend = getResend();
    const from = getFromEmail();
    if (isResendTestFrom(from)) {
      console.warn(
        `[Resend] sending from test domain (${from}). Recipients other than the Resend account owner will be rejected until RESEND_FROM_EMAIL uses a verified domain.`,
      );
    }
    const { data, error } = await resend.emails.send({
      from,
      to,
      subject: copy.email.subject(code),
      html: buildOtpEmailHtml(code),
      text: copy.email.text(code),
    });

    if (error) {
      const statusCode =
        "statusCode" in error && typeof error.statusCode === "number"
          ? error.statusCode
          : undefined;
      console.error("[Resend] send failed:", {
        to,
        from: getFromEmail(),
        name: error.name,
        statusCode,
        message: error.message,
      });
      return {
        success: false,
        error: userFacingResendError(error.message, statusCode),
      };
    }

    console.log(`[Resend] OTP email sent to ${to} (id: ${data?.id ?? "unknown"})`);
    return { success: true };
  } catch (err) {
    console.error("[Resend]", err);
    return {
      success: false,
      error: copy.authApi.emailSendFailed,
    };
  }
}

function buildOtpEmailHtml(code: string): string {
  const digits = code.split("");
  const digitBoxes = digits
    .map(
      (d) =>
        `<td style="width:48px;height:56px;background:#12121c;border:1px solid rgba(255,255,255,0.1);border-radius:12px;text-align:center;font-size:28px;font-weight:700;color:#fafafa;font-family:monospace;">${d}</td>`
    )
    .join('<td style="width:8px;"></td>');

  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#030308;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#030308;padding:48px 24px;">
    <tr>
      <td align="center">
        <table width="100%" style="max-width:480px;" cellpadding="0" cellspacing="0">
          <tr>
            <td style="padding-bottom:32px;">
              <span style="font-size:24px;font-weight:700;color:#fafafa;letter-spacing:-0.03em;">${copy.brand.wordmark}</span>
            </td>
          </tr>
          <tr>
            <td style="padding-bottom:8px;">
              <h1 style="margin:0;font-size:22px;font-weight:600;color:#fafafa;">${copy.email.heading}</h1>
            </td>
          </tr>
          <tr>
            <td style="padding-bottom:32px;">
              <p style="margin:0;font-size:15px;line-height:1.6;color:#a1a1aa;">
                ${copy.email.body}
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding-bottom:32px;">
              <table cellpadding="0" cellspacing="0"><tr>${digitBoxes}</tr></table>
            </td>
          </tr>
          <tr>
            <td>
              <p style="margin:0;font-size:13px;color:#71717a;">
                ${copy.email.footer}
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export async function sendAuditCompleteEmail(input: {
  to: string;
  domain: string;
  missionId: string;
  score: number;
  criticalCount: number;
  /** Public URL of an already-uploaded report PDF — fetched and attached (no regenerate). */
  pdfUrl?: string | null;
}): Promise<{ success: boolean; error?: string }> {
  try {
    const resend = getResend();
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
    const reportUrl = `${appUrl}/results/${input.missionId}`;

    const attachments: Array<{ filename: string; content: Buffer }> = [];
    if (input.pdfUrl) {
      try {
        const pdfRes = await fetch(input.pdfUrl, { signal: AbortSignal.timeout(15_000) });
        if (pdfRes.ok) {
          const bytes = Buffer.from(await pdfRes.arrayBuffer());
          if (bytes.byteLength > 0) {
            const safeDomain = input.domain.replace(/[^a-z0-9.-]/gi, "_") || "site";
            attachments.push({
              filename: `ghost-report-${safeDomain}.pdf`,
              content: bytes,
            });
          }
        } else {
          console.warn(
            `[Resend] could not fetch PDF for attachment (${pdfRes.status}): ${input.pdfUrl}`,
          );
        }
      } catch (pdfErr) {
        console.warn("[Resend] PDF attachment fetch failed:", pdfErr);
      }
    }

    const { data, error } = await resend.emails.send({
      from: getFromEmail(),
      to: input.to,
      subject: copy.dashboardEmails.auditCompleteSubject(input.domain),
      html: buildAuditCompleteHtml(input, reportUrl, attachments.length > 0),
      text: copy.dashboardEmails.auditCompleteText(input.domain, input.score, reportUrl),
      ...(attachments.length > 0 ? { attachments } : {}),
    }, { idempotencyKey: `audit-complete/${input.missionId}` });

    if (error) {
      console.error("[Resend] audit complete send failed:", error);
      return { success: false, error: error.message };
    }

    console.log(
      `[Resend] audit complete email sent to ${input.to} (id: ${data?.id ?? "unknown"}${attachments.length ? ", pdf attached" : ""})`,
    );
    return { success: true };
  } catch (err) {
    console.error("[Resend] audit complete", err);
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to send email",
    };
  }
}

export async function sendRescanExpiryEmail(input: {
  to: string;
  domain: string;
  expiresAt: Date;
  daysLeft: number;
}): Promise<{ success: boolean; error?: string }> {
  try {
    const resend = getResend();
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
    const dashboardUrl = `${appUrl}/dashboard/overview`;
    const expiryLabel = input.expiresAt.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
    const { data, error } = await resend.emails.send({
      from: getFromEmail(),
      to: input.to,
      subject: copy.dashboardEmails.rescanExpirySubject(input.daysLeft),
      html: buildRescanExpiryHtml(input.domain, expiryLabel, input.daysLeft, dashboardUrl),
      text: copy.dashboardEmails.rescanExpiryText(input.domain, expiryLabel, input.daysLeft, dashboardUrl),
    });

    if (error) {
      console.error("[Resend] rescan expiry send failed:", error);
      return { success: false, error: error.message };
    }

    console.log(`[Resend] rescan expiry email sent to ${input.to} (id: ${data?.id ?? "unknown"})`);
    return { success: true };
  } catch (err) {
    console.error("[Resend] rescan expiry", err);
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to send email",
    };
  }
}

function buildAuditCompleteHtml(
  input: { domain: string; score: number; criticalCount: number },
  reportUrl: string,
  hasPdfAttachment = false,
) {
  const pdfNote = hasPdfAttachment
    ? `<p style="margin:16px 0 0;font-size:13px;line-height:1.5;color:#71717a;">Your PDF report is attached to this email.</p>`
    : "";
  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#030308;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#030308;padding:48px 24px;">
    <tr><td align="center">
      <table width="100%" style="max-width:480px;" cellpadding="0" cellspacing="0">
        <tr><td style="padding-bottom:24px;">
          <span style="font-size:24px;font-weight:700;color:#fafafa;">${copy.brand.wordmark}</span>
        </td></tr>
        <tr><td style="padding-bottom:8px;">
          <h1 style="margin:0;font-size:22px;font-weight:600;color:#fafafa;">${copy.dashboardEmails.auditCompleteHeading}</h1>
        </td></tr>
        <tr><td style="padding-bottom:24px;">
          <p style="margin:0;font-size:15px;line-height:1.6;color:#a1a1aa;">
            ${copy.dashboardEmails.auditCompleteBody(input.domain, input.score, input.criticalCount)}
          </p>
          ${pdfNote}
        </td></tr>
        <tr><td>
          <a href="${reportUrl}" style="display:inline-block;background:#7c3aed;color:#fff;text-decoration:none;padding:12px 24px;border-radius:12px;font-weight:600;">${copy.dashboardEmails.viewReport}</a>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

function buildRescanExpiryHtml(
  domain: string,
  expiryLabel: string,
  daysLeft: number,
  dashboardUrl: string
) {
  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#030308;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#030308;padding:48px 24px;">
    <tr><td align="center">
      <table width="100%" style="max-width:480px;" cellpadding="0" cellspacing="0">
        <tr><td style="padding-bottom:24px;">
          <span style="font-size:24px;font-weight:700;color:#fafafa;">${copy.brand.wordmark}</span>
        </td></tr>
        <tr><td style="padding-bottom:8px;">
          <h1 style="margin:0;font-size:22px;font-weight:600;color:#fafafa;">${copy.dashboardEmails.rescanExpiryHeading(daysLeft)}</h1>
        </td></tr>
        <tr><td style="padding-bottom:24px;">
          <p style="margin:0;font-size:15px;line-height:1.6;color:#a1a1aa;">
            ${copy.dashboardEmails.rescanExpiryBody(domain, expiryLabel, daysLeft)}
          </p>
        </td></tr>
        <tr><td>
          <a href="${dashboardUrl}" style="display:inline-block;background:#7c3aed;color:#fff;text-decoration:none;padding:12px 24px;border-radius:12px;font-weight:600;">${copy.dashboardEmails.startRescan}</a>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

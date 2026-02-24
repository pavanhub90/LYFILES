// lib/email.ts
import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)
const FROM = process.env.EMAIL_FROM ?? 'LyFiles <noreply@lyfiles.com>'

// ─── Conversion complete ──────────────────────────
export async function sendConversionCompleteEmail(
  to: string,
  data: { fileName: string; format: string; downloadUrl: string }
) {
  return resend.emails.send({
    from: FROM,
    to,
    subject: `✅ Your file "${data.fileName}" is ready`,
    html: `
      <div style="font-family:system-ui;max-width:600px;margin:0 auto;padding:40px 20px;">
        <div style="background:#07080d;border-radius:16px;padding:32px;color:#e8eaf0;">
          <h1 style="font-size:28px;margin:0 0 8px;color:#00e5cc">Your file is ready</h1>
          <p style="color:#8b90a4;margin:0 0 24px">Conversion complete</p>
          <div style="background:#181a28;border-radius:12px;padding:20px;margin-bottom:24px;">
            <p style="margin:0;font-size:14px;color:#8b90a4">File name</p>
            <p style="margin:4px 0 0;font-weight:600">${data.fileName}</p>
            <p style="margin:12px 0 0;font-size:14px;color:#8b90a4">Converted to</p>
            <p style="margin:4px 0 0;font-weight:600;text-transform:uppercase;color:#00e5cc">${data.format}</p>
          </div>
          <a href="${data.downloadUrl}"
             style="display:inline-block;background:#00e5cc;color:#07080d;padding:14px 28px;
                    border-radius:10px;text-decoration:none;font-weight:700;font-size:16px;">
            ⬇ Download file
          </a>
          <p style="margin:24px 0 0;font-size:12px;color:#4a4f63">
            Download link expires in 1 hour. Visit <a href="${process.env.NEXT_PUBLIC_APP_URL}/dashboard" style="color:#00e5cc">your dashboard</a> for permanent access.
          </p>
        </div>
      </div>
    `,
  })
}

// ─── Conversion failed ────────────────────────────
export async function sendConversionFailedEmail(
  to: string,
  data: { fileName: string; error: string; retryUrl: string }
) {
  return resend.emails.send({
    from: FROM,
    to,
    subject: `❌ Conversion failed: "${data.fileName}"`,
    html: `
      <div style="font-family:system-ui;max-width:600px;margin:0 auto;padding:40px 20px;">
        <div style="background:#07080d;border-radius:16px;padding:32px;color:#e8eaf0;">
          <h1 style="font-size:28px;margin:0 0 8px;color:#ef4444">Conversion failed</h1>
          <p style="color:#8b90a4;margin:0 0 24px">We hit an issue processing your file</p>
          <div style="background:#181a28;border-radius:12px;padding:20px;margin-bottom:24px;">
            <p style="margin:0;font-size:14px;color:#8b90a4">File</p>
            <p style="margin:4px 0 12px;font-weight:600">${data.fileName}</p>
            <p style="margin:0;font-size:14px;color:#8b90a4">Error</p>
            <p style="margin:4px 0 0;font-size:13px;color:#ef4444;font-family:monospace;">${data.error}</p>
          </div>
          <a href="${data.retryUrl}"
             style="display:inline-block;background:#7b61ff;color:#fff;padding:14px 28px;
                    border-radius:10px;text-decoration:none;font-weight:700;font-size:16px;">
            🔁 Retry conversion
          </a>
        </div>
      </div>
    `,
  })
}

// ─── Scheduled job notification ───────────────────
export async function sendScheduledJobEmail(
  to: string,
  data: { jobName: string; fileName: string; downloadUrl: string }
) {
  return resend.emails.send({
    from: FROM,
    to,
    subject: `📅 Scheduled job ran: ${data.jobName}`,
    html: `
      <div style="font-family:system-ui;max-width:600px;margin:0 auto;padding:40px 20px;">
        <div style="background:#07080d;border-radius:16px;padding:32px;color:#e8eaf0;">
          <h1 style="font-size:28px;margin:0 0 8px;color:#7b61ff">Scheduled job complete</h1>
          <p style="color:#8b90a4;margin:0 0 24px">${data.jobName}</p>
          <p>Your scheduled file conversion for <strong>${data.fileName}</strong> has completed successfully.</p>
          <a href="${data.downloadUrl}"
             style="display:inline-block;background:#00e5cc;color:#07080d;padding:14px 28px;
                    border-radius:10px;text-decoration:none;font-weight:700;margin-top:20px;">
            ⬇ Download result
          </a>
        </div>
      </div>
    `,
  })
}

// ─── Weekly digest ────────────────────────────────
export async function sendWeeklyDigestEmail(
  to: string,
  data: { total: number; succeeded: number; failed: number; storageUsed: string }
) {
  return resend.emails.send({
    from: FROM,
    to,
    subject: `📊 Your LyFiles weekly summary`,
    html: `
      <div style="font-family:system-ui;max-width:600px;margin:0 auto;padding:40px 20px;">
        <div style="background:#07080d;border-radius:16px;padding:32px;color:#e8eaf0;">
          <h1 style="font-size:28px;margin:0 0 24px;color:#00e5cc">Weekly summary</h1>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:24px;">
            <div style="background:#181a28;border-radius:12px;padding:16px;text-align:center;">
              <div style="font-size:36px;font-weight:800;color:#00e5cc">${data.total}</div>
              <div style="font-size:13px;color:#8b90a4">Total conversions</div>
            </div>
            <div style="background:#181a28;border-radius:12px;padding:16px;text-align:center;">
              <div style="font-size:36px;font-weight:800;color:#22c55e">${data.succeeded}</div>
              <div style="font-size:13px;color:#8b90a4">Successful</div>
            </div>
          </div>
          <a href="${process.env.NEXT_PUBLIC_APP_URL}/dashboard"
             style="display:inline-block;background:#7b61ff;color:#fff;padding:14px 28px;
                    border-radius:10px;text-decoration:none;font-weight:700;">
            View dashboard →
          </a>
        </div>
      </div>
    `,
  })
}

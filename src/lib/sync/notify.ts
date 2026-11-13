import { env } from "../env";

/**
 * Alerts. Vercel has no built-in alerting for cron results on the Hobby plan (it only logs the run
 * and never retries), so the sync reports its own result:
 *   - Postmark email when POSTMARK_SERVER_TOKEN, ALERT_EMAIL_FROM and ALERT_EMAIL_TO are set
 *   - optional dead-man's-switch ping (HEALTHCHECK_URL_<JOB>) so a run that never happens is noticed
 *   - always a structured console line, visible in Vercel's runtime logs
 */
export async function sendAlert(subject: string, text: string): Promise<{ sent: boolean; reason?: string }> {
  const token = env("POSTMARK_SERVER_TOKEN");
  const from = env("ALERT_EMAIL_FROM");
  const to = env("ALERT_EMAIL_TO");
  if (!token || !from || !to) return { sent: false, reason: "Postmark not configured" };
  const r = await fetch("https://api.postmarkapp.com/email", {
    method: "POST",
    headers: { "X-Postmark-Server-Token": token, "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ From: from, To: to, Subject: subject, TextBody: text, MessageStream: env("POSTMARK_MESSAGE_STREAM") ?? "outbound" }),
  });
  if (!r.ok) return { sent: false, reason: `Postmark ${r.status}: ${(await r.text()).slice(0, 200)}` };
  return { sent: true };
}

export async function pingHealthcheck(jobId: string, ok: boolean): Promise<void> {
  const base = env(`HEALTHCHECK_URL_${jobId.toUpperCase()}`);
  if (!base) return;
  try {
    await fetch(ok ? base : `${base.replace(/\/$/, "")}/fail`, { method: "GET" });
  } catch {
    // never let a monitoring ping break a run
  }
}

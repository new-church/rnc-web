import type { APIRoute } from "astro";
import { env } from "../../../lib/env";
import { ACTION_IDS, type ActionId } from "../../../lib/actions";
import { runJob } from "../../../lib/sync/runner";

export const prerender = false;

const allowed = new Set<string>(Object.values(ACTION_IDS));

/**
 * Vercel Cron entry point (see vercel.json). Vercel sends `Authorization: Bearer $CRON_SECRET`.
 * Not behind the admin login: the secret is the credential. Returns 500 on a failed run so the
 * failure shows in Vercel's cron logs; the runner also emails an alert (Postmark) when configured.
 */
export const GET: APIRoute = async ({ params, request }) => {
  const secret = env("CRON_SECRET");
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return new Response("Unauthorized", { status: 401 });
  }
  const job = params.job ?? "";
  if (!allowed.has(job)) return new Response("Unknown job", { status: 404 });

  const result = await runJob(job as ActionId, { apply: true, trigger: "cron" });
  return new Response(
    JSON.stringify({ job, status: result.status, summary: result.summary, errors: result.errors.length, attention: result.attention.length }),
    { status: result.status === "error" ? 500 : 200, headers: { "Content-Type": "application/json" } },
  );
};

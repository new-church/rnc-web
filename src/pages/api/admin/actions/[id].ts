import type { APIRoute } from "astro";
import { ACTION_IDS, type ActionId } from "../../../../lib/actions";
import { runJob } from "../../../../lib/sync/runner";

export const prerender = false;

const allowed = new Set<string>(Object.values(ACTION_IDS));

/** Run a sync from the admin page. `?dry=1` reports what would change without writing. */
export const POST: APIRoute = async ({ params, locals, redirect, url }) => {
  const session = locals.adminSession;
  if (!session) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
  }

  const id = params.id ?? "";
  if (!allowed.has(id)) {
    return new Response(JSON.stringify({ error: "Unknown action" }), { status: 404 });
  }

  await runJob(id as ActionId, {
    apply: url.searchParams.get("dry") !== "1",
    trigger: "admin",
    actorEmail: session.email,
  });

  return redirect("/admin/actions", 303);
};

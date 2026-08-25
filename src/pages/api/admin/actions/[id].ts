import type { APIRoute } from "astro";
import {
  ACTION_IDS,
  recordActionRun,
  type ActionId,
} from "../../../../lib/actions";

export const prerender = false;

const allowed = new Set<string>(Object.values(ACTION_IDS));

export const POST: APIRoute = async ({ params, locals, redirect }) => {
  const session = locals.adminSession;
  if (!session) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
    });
  }

  const id = params.id ?? "";
  if (!allowed.has(id)) {
    return new Response(JSON.stringify({ error: "Unknown action" }), {
      status: 404,
    });
  }

  await recordActionRun({
    actionId: id as ActionId,
    actorEmail: session.email,
  });

  return redirect("/admin/actions", 303);
};

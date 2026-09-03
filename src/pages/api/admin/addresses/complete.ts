import type { APIRoute } from "astro";
import {
  contactAddressFromPostgrid,
  fetchAddressPreviews,
  postgridApiKey,
  resolveAddressCompletion,
} from "../../../../lib/postgrid/addresses";

export const prerender = false;

function unauthorized() {
  return new Response(JSON.stringify({ error: "Unauthorized" }), {
    status: 401,
    headers: { "Content-Type": "application/json" },
  });
}

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

/** GET — address suggestion previews (does not consume PostGrid lookups). */
export const GET: APIRoute = async ({ locals, url }) => {
  if (!locals.adminSession) return unauthorized();
  if (!postgridApiKey()) {
    return json(
      { error: "PostGrid is not configured (missing POSTGRID_API_KEY)" },
      503,
    );
  }

  const q = url.searchParams.get("q")?.trim() ?? "";
  const container = url.searchParams.get("container")?.trim() || undefined;
  const advanced = url.searchParams.get("advanced") === "true";
  const countriesFilter =
    url.searchParams.get("countries")?.trim() || undefined;

  if (!q && !container) {
    return json({ previews: [] });
  }

  try {
    const previews = await fetchAddressPreviews({
      partialStreet: q || undefined,
      container,
      advanced: advanced || Boolean(container),
      countriesFilter,
      limit: 8,
    });
    return json({ previews });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Lookup failed";
    return json({ error: message }, 502);
  }
};

/** POST — resolve a selected preview id into structured address fields. */
export const POST: APIRoute = async ({ locals, request }) => {
  if (!locals.adminSession) return unauthorized();
  if (!postgridApiKey()) {
    return json(
      { error: "PostGrid is not configured (missing POSTGRID_API_KEY)" },
      503,
    );
  }

  let id = "";
  try {
    const body = (await request.json()) as { id?: string };
    id = String(body.id ?? "").trim();
  } catch {
    return json({ error: "Invalid JSON body" }, 400);
  }
  if (!id) return json({ error: "id is required" }, 400);

  try {
    const resolved = await resolveAddressCompletion(id);
    return json({
      address: contactAddressFromPostgrid(resolved),
      formattedAddress: resolved.formattedAddress,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Resolve failed";
    return json({ error: message }, 502);
  }
};

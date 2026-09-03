import type { APIRoute } from "astro";
import { contactsToSsncCsv, listContacts } from "../../../../lib/contacts";

export const prerender = false;

export const GET: APIRoute = async ({ locals }) => {
  if (!locals.adminSession) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  const contacts = await listContacts();
  const csv = contactsToSsncCsv(contacts.map((c) => c.data));
  const date = new Date().toISOString().slice(0, 10);

  return new Response(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="contacts-${date}.csv"`,
      "Cache-Control": "no-store",
    },
  });
};

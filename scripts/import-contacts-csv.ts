/**
 * Import SSNC Contacts CSV into the items table as MEMBER# / PROFILE rows.
 *
 * Usage:
 *   npm run contacts:import -- "tmp/SSNC Contacts ….csv"
 *   npm run contacts:import -- --dry-run "tmp/….csv"
 */
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createClient } from "@supabase/supabase-js";
import { contactDataFromSsncCsvRow } from "../src/lib/contacts/csv.ts";
import {
  DirectoryKeys,
  MemberKeys,
} from "../src/lib/items-table/design.ts";
import { sortNameFromContact } from "../src/lib/contacts/schema.ts";

function loadEnvFile(path: string) {
  try {
    const text = readFileSync(path, "utf8");
    for (const line of text.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eq = trimmed.indexOf("=");
      if (eq < 0) continue;
      const key = trimmed.slice(0, eq).trim();
      let val = trimmed.slice(eq + 1).trim();
      if (
        (val.startsWith('"') && val.endsWith('"')) ||
        (val.startsWith("'") && val.endsWith("'"))
      ) {
        val = val.slice(1, -1);
      }
      if (!process.env[key]) process.env[key] = val;
    }
  } catch {
    /* optional */
  }
}

loadEnvFile(resolve(process.cwd(), ".env.local"));
loadEnvFile(resolve(process.cwd(), ".env"));

function parseCsv(text: string): Record<string, string>[] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let i = 0;
  let inQuotes = false;
  const s = text.replace(/^\uFEFF/, "");

  while (i < s.length) {
    const c = s[i]!;
    if (inQuotes) {
      if (c === '"') {
        if (s[i + 1] === '"') {
          field += '"';
          i += 2;
          continue;
        }
        inQuotes = false;
        i++;
        continue;
      }
      field += c;
      i++;
      continue;
    }
    if (c === '"') {
      inQuotes = true;
      i++;
      continue;
    }
    if (c === ",") {
      row.push(field);
      field = "";
      i++;
      continue;
    }
    if (c === "\n" || c === "\r") {
      if (c === "\r" && s[i + 1] === "\n") i++;
      row.push(field);
      field = "";
      if (row.some((cell) => cell.length > 0)) rows.push(row);
      row = [];
      i++;
      continue;
    }
    field += c;
    i++;
  }
  if (field.length || row.length) {
    row.push(field);
    if (row.some((cell) => cell.length > 0)) rows.push(row);
  }

  if (rows.length < 2) return [];
  const headers = rows[0]!.map((h) => h.replace(/^\uFEFF/, "").trim());
  return rows.slice(1).map((cells) => {
    const obj: Record<string, string> = {};
    headers.forEach((h, idx) => {
      obj[h] = cells[idx] ?? "";
    });
    return obj;
  });
}

function stableContactId(row: Record<string, string>, dataKey: string): string {
  const hash = createHash("sha256").update(dataKey).digest("hex").slice(0, 16);
  return `ssnc-${hash}`;
}

function env(name: string): string {
  const v =
    process.env[name] ||
    (name === "SUPABASE_SECRET_KEY"
      ? process.env.SUPABASE_SERVICE_ROLE_KEY
      : undefined);
  if (!v) throw new Error(`Missing ${name}`);
  return v;
}

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes("--dry-run");
  const fileArg = args.find((a) => !a.startsWith("--"));
  if (!fileArg) {
    console.error(
      'Usage: npm run contacts:import -- [--dry-run] "path/to/contacts.csv"',
    );
    process.exit(1);
  }

  const csvPath = resolve(process.cwd(), fileArg);
  const text = readFileSync(csvPath, "utf8");
  const records = parseCsv(text);
  console.log(`Parsed ${records.length} rows from ${csvPath}`);

  const url = process.env.SUPABASE_URL || process.env.PUBLIC_SUPABASE_URL;
  if (!url) throw new Error("Missing SUPABASE_URL");
  const key = env("SUPABASE_SECRET_KEY");

  const supabase = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  let ok = 0;
  let failed = 0;

  for (let idx = 0; idx < records.length; idx++) {
    const row = records[idx]!;
    try {
      const data = contactDataFromSsncCsvRow(row);
      const idKey = [
        data.lastName,
        data.firstName,
        data.email,
        data.address.line1,
        data.address.postalCode,
        data.sourceRecord,
      ]
        .join("|")
        .toLowerCase();
      const id = stableContactId(row, idKey);
      const sortName = sortNameFromContact(data);
      const now = new Date().toISOString();
      const payload = {
        ...data,
        createdAt: data.createdAt ?? now,
        updatedAt: now,
      };

      const item = {
        pk: MemberKeys.pk(id),
        sk: MemberKeys.profileSk(),
        entity_type: "member",
        data: payload,
        gsi1pk: data.email ? MemberKeys.emailGsi1(data.email).pk : null,
        gsi1sk: data.email ? MemberKeys.emailGsi1(data.email).sk : null,
        gsi2pk: DirectoryKeys.gsi2pk(),
        gsi2sk: DirectoryKeys.gsi2sk(sortName, id),
        gsi3pk: null,
        gsi3sk: null,
        expires_at: null,
      };

      if (dryRun) {
        if (idx < 3) {
          console.log("dry-run sample", id, data.displayName, data.email);
        }
        ok++;
        continue;
      }

      const { error } = await supabase.from("items").upsert(item, {
        onConflict: "pk,sk",
      });
      if (error) throw new Error(error.message);
      ok++;
      if ((ok + failed) % 50 === 0) {
        console.log(`… ${ok + failed}/${records.length}`);
      }
    } catch (err) {
      failed++;
      console.error(
        `Row ${idx + 2} failed:`,
        err instanceof Error ? err.message : err,
      );
    }
  }

  console.log(
    dryRun
      ? `Dry run complete: ${ok} ok, ${failed} failed (no writes).`
      : `Import complete: ${ok} upserted, ${failed} failed.`,
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

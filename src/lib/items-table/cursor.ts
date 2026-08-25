import type { Cursor, GsiCursor, ItemRow, IndexName, TableCursor } from "./types";

function toBase64Url(json: string): string {
  const bytes = new TextEncoder().encode(json);
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");
}

function fromBase64Url(token: string): string {
  const padded = token.replaceAll("-", "+").replaceAll("_", "/");
  const pad = padded.length % 4 === 0 ? "" : "=".repeat(4 - (padded.length % 4));
  const bin = atob(padded + pad);
  const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

export function encodeCursor(cursor: Cursor): string {
  return toBase64Url(JSON.stringify(cursor));
}

export function decodeCursor(token: string): Cursor {
  const parsed = JSON.parse(fromBase64Url(token)) as Cursor;
  if (
    !parsed ||
    typeof parsed !== "object" ||
    !("index" in parsed) ||
    !("pk" in parsed) ||
    !("sk" in parsed)
  ) {
    throw new Error("Invalid items-table cursor");
  }
  return parsed;
}

export function parseExclusiveStartKey(
  value: Cursor | string | null | undefined,
): Cursor | null {
  if (value == null || value === "") return null;
  if (typeof value === "string") return decodeCursor(value);
  return value;
}

export function cursorFromRow(index: IndexName, row: ItemRow): Cursor {
  if (index === "table") {
    const c: TableCursor = { index: "table", pk: row.pk, sk: row.sk };
    return c;
  }
  const gsiPk =
    index === "gsi1" ? row.gsi1pk : index === "gsi2" ? row.gsi2pk : row.gsi3pk;
  const gsiSk =
    index === "gsi1" ? row.gsi1sk : index === "gsi2" ? row.gsi2sk : row.gsi3sk;
  if (!gsiPk || gsiSk == null) {
    throw new Error(`Row is missing ${index} keys; cannot build cursor`);
  }
  const c: GsiCursor = {
    index,
    gsiPk,
    gsiSk,
    pk: row.pk,
    sk: row.sk,
  };
  return c;
}

export function assertCursorMatches(
  index: IndexName,
  pk: string,
  cursor: Cursor | null,
): void {
  if (!cursor) return;
  if (cursor.index !== index) {
    throw new Error(
      `Cursor index ${cursor.index} does not match query index ${index}`,
    );
  }
  if (index === "table") {
    if (cursor.pk !== pk) {
      throw new Error("Table cursor pk does not match query pk");
    }
  } else if (cursor.index !== "table" && cursor.gsiPk !== pk) {
    throw new Error("GSI cursor partition key does not match query pk");
  }
}

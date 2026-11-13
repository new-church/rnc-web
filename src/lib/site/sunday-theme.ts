import { createItemsStoreFromEnv, key, type ItemsStore } from "../items-table";
import { sydneyDate } from "../sync/util";

const KEY = { pk: key("SITE", "sunday"), sk: "THEME" };

export type SundayTheme = {
  /** YYYY-MM-DD, the Sunday the theme is for */
  serviceDate: string;
  theme: string;
  note?: string;
  updatedAt?: string;
  updatedBy?: string;
};

export async function getSundayTheme(store: ItemsStore = createItemsStoreFromEnv()): Promise<SundayTheme | null> {
  const row = await store.get(KEY);
  const d = row?.data as Partial<SundayTheme> | null | undefined;
  if (!d?.serviceDate || !d.theme) return null;
  return { serviceDate: d.serviceDate, theme: d.theme, note: d.note || undefined, updatedAt: d.updatedAt, updatedBy: d.updatedBy };
}

/** The theme to show publicly: only while its Sunday is today or still to come (Sydney time). Never throws. */
export async function getUpcomingSundayTheme(): Promise<SundayTheme | null> {
  try {
    const t = await getSundayTheme();
    if (!t || t.serviceDate < sydneyDate(new Date())) return null;
    return t;
  } catch {
    return null;
  }
}

export async function saveSundayTheme(t: SundayTheme, store: ItemsStore = createItemsStoreFromEnv()) {
  await store.put({ ...KEY, entityType: "site_setting", data: { ...t, updatedAt: new Date().toISOString() } });
}

export async function clearSundayTheme(store: ItemsStore = createItemsStoreFromEnv()) {
  await store.delete(KEY);
}

export function formatServiceDate(iso: string): string {
  return new Date(`${iso}T12:00:00+10:00`).toLocaleDateString("en-AU", {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: "Australia/Sydney",
  });
}

import { env } from "../env";

const POSTGRID_BASE = "https://api.postgrid.com/v1/intl_addver";

export function postgridApiKey(): string | undefined {
  return env("POSTGRID_API_KEY");
}

export type PostgridAddressPreview = {
  id: string;
  type: string;
  text: string;
  description?: string;
  highlight?: string;
  error?: string;
};

export type PostgridResolvedAddress = {
  formattedAddress: string;
  line1: string;
  line2: string | null;
  line3: string | null;
  line4: string | null;
  city: string | null;
  provinceOrState: string | null;
  postalOrZip: string | null;
  country: string | null;
  building?: string | null;
  department?: string | null;
  company?: string | null;
  errors?: string | null;
};

/** Map PostGrid resolved address into contact form address fields. */
export function contactAddressFromPostgrid(addr: PostgridResolvedAddress): {
  line1: string;
  line2: string;
  city: string;
  state: string;
  postalCode: string;
  overseas: string;
  overseasCountry: string;
} {
  const extra = [addr.line3, addr.line4].filter(Boolean).join(", ");
  const line2 = [addr.line2, extra].filter(Boolean).join(", ");
  const country = (addr.country ?? "").trim();
  const isAu = /^australia$/i.test(country) || /^au$/i.test(country);

  return {
    line1: addr.line1 ?? "",
    line2,
    city: addr.city ?? "",
    state: addr.provinceOrState ?? "",
    postalCode: addr.postalOrZip ?? "",
    overseas: isAu ? "" : addr.formattedAddress || "",
    overseasCountry: isAu ? "" : country,
  };
}

type PostgridEnvelope<T> = {
  status: "success" | "error";
  message: string;
  data: T;
};

async function postgridFetch<T>(
  path: string,
  init?: RequestInit,
): Promise<T> {
  const key = postgridApiKey();
  if (!key) {
    throw new Error("POSTGRID_API_KEY is not configured");
  }

  const res = await fetch(`${POSTGRID_BASE}${path}`, {
    ...init,
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      "X-API-Key": key,
      ...(init?.headers ?? {}),
    },
  });

  const body = (await res.json()) as PostgridEnvelope<T> & { error?: string };
  if (!res.ok || body.status === "error") {
    throw new Error(
      body.message || body.error || `PostGrid request failed (${res.status})`,
    );
  }
  return body.data;
}

export async function fetchAddressPreviews(opts: {
  partialStreet?: string;
  container?: string;
  advanced?: boolean;
  countriesFilter?: string;
  limit?: number;
}): Promise<PostgridAddressPreview[]> {
  const params = new URLSearchParams();
  if (opts.partialStreet) params.set("partialStreet", opts.partialStreet);
  if (opts.container) params.set("container", opts.container);
  if (opts.advanced) params.set("advanced", "true");
  if (opts.countriesFilter) params.set("countriesFilter", opts.countriesFilter);
  if (opts.limit != null) params.set("limit", String(opts.limit));
  params.set("properCase", "true");

  const data = await postgridFetch<PostgridAddressPreview[]>(
    `/completions?${params.toString()}`,
  );
  return Array.isArray(data) ? data : [];
}

export async function resolveAddressCompletion(
  id: string,
): Promise<PostgridResolvedAddress> {
  return postgridFetch<PostgridResolvedAddress>("/completions?properCase=true", {
    method: "POST",
    body: JSON.stringify({ id }),
  });
}

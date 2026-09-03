import { useEffect, useRef, useState } from "react";

export type AddressFields = {
  line1: string;
  line2: string;
  city: string;
  state: string;
  postalCode: string;
  overseas: string;
  overseasCountry: string;
};

type Preview = {
  id: string;
  type: string;
  text: string;
  description?: string;
};

type Props = {
  fieldClass: string;
  labelClass: string;
  onSelect: (address: AddressFields) => void;
};

function hasAddress(a: AddressFields | null | undefined): boolean {
  if (!a) return false;
  return Boolean(
    a.line1 || a.line2 || a.city || a.state || a.postalCode || a.overseas,
  );
}

export default function AddressAutocomplete({
  fieldClass,
  labelClass,
  onSelect,
}: Props) {
  const [query, setQuery] = useState("");
  const [previews, setPreviews] = useState<Preview[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [containerStack, setContainerStack] = useState<
    { id: string; label: string }[]
  >([]);
  const wrapRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    const onPointerDown = (e: PointerEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    abortRef.current?.abort();

    const container = containerStack[containerStack.length - 1]?.id;
    if (!container && query.trim().length < 3) {
      setPreviews([]);
      setLoading(false);
      setError(null);
      return;
    }

    debounceRef.current = setTimeout(async () => {
      const ac = new AbortController();
      abortRef.current = ac;
      setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams();
        if (container) {
          params.set("container", container);
          params.set("advanced", "true");
        } else {
          params.set("q", query.trim());
        }
        const res = await fetch(
          `/api/admin/addresses/complete?${params.toString()}`,
          { signal: ac.signal },
        );
        const body = (await res.json()) as {
          previews?: Preview[];
          error?: string;
        };
        if (!res.ok) {
          setError(body.error ?? "Address lookup failed");
          setPreviews([]);
          setOpen(true);
          return;
        }
        setPreviews(body.previews ?? []);
        setOpen(true);
      } catch (err) {
        if ((err as Error).name === "AbortError") return;
        setError("Address lookup failed");
        setPreviews([]);
      } finally {
        setLoading(false);
      }
    }, 250);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, containerStack]);

  async function pickPreview(preview: Preview) {
    const isAddress = preview.type.toLowerCase() === "address";
    if (!isAddress) {
      setContainerStack((stack) => [
        ...stack,
        {
          id: preview.id,
          label: [preview.text, preview.description].filter(Boolean).join(" — "),
        },
      ]);
      setQuery("");
      setPreviews([]);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/addresses/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: preview.id }),
      });
      const body = (await res.json()) as {
        address?: AddressFields;
        error?: string;
      };
      if (!res.ok || !body.address) {
        setError(body.error ?? "Could not resolve address");
        return;
      }
      onSelect(body.address);
      setQuery("");
      setPreviews([]);
      setContainerStack([]);
      setOpen(false);
    } catch {
      setError("Could not resolve address");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-2" ref={wrapRef}>
      <label className={labelClass}>
        Find address
        <input
          className={fieldClass}
          type="search"
          autoComplete="off"
          placeholder="Start typing a street address…"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            if (containerStack.length) setContainerStack([]);
          }}
          onFocus={() => {
            if (previews.length || error) setOpen(true);
          }}
        />
      </label>
      {containerStack.length > 0 ? (
        <div className="flex flex-wrap items-center gap-2 text-sm text-ink-muted">
          <span>In: {containerStack.map((c) => c.label).join(" › ")}</span>
          <button
            type="button"
            className="font-display text-accent-primary-strong underline"
            onClick={() => setContainerStack((s) => s.slice(0, -1))}
          >
            Back
          </button>
        </div>
      ) : null}
      {open && (previews.length > 0 || loading || error) ? (
        <ul
          role="listbox"
          className="max-h-60 overflow-auto rounded-md border border-border-soft bg-white py-1 shadow-md"
        >
          {loading ? (
            <li className="px-4 py-2.5 text-sm text-ink-muted">Searching…</li>
          ) : null}
          {error ? (
            <li className="px-4 py-2.5 text-sm text-red-700">{error}</li>
          ) : null}
          {!loading &&
            !error &&
            previews.map((p) => (
              <li key={p.id}>
                <button
                  type="button"
                  role="option"
                  className="block w-full px-4 py-2.5 text-left hover:bg-violet-50"
                  onClick={() => void pickPreview(p)}
                >
                  <span className="block font-body text-sm text-text-body">
                    {p.text}
                  </span>
                  {p.description ? (
                    <span className="block font-body text-xs text-ink-muted">
                      {p.description}
                      {p.type.toLowerCase() !== "address" ? " ›" : ""}
                    </span>
                  ) : null}
                </button>
              </li>
            ))}
          {!loading && !error && previews.length === 0 ? (
            <li className="px-4 py-2.5 text-sm text-ink-muted">No matches</li>
          ) : null}
        </ul>
      ) : null}
    </div>
  );
}

export function addressFieldsFromInitial(initial?: {
  line1?: string;
  line2?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  overseas?: string;
  overseasCountry?: string;
}): boolean {
  return hasAddress({
    line1: initial?.line1 ?? "",
    line2: initial?.line2 ?? "",
    city: initial?.city ?? "",
    state: initial?.state ?? "",
    postalCode: initial?.postalCode ?? "",
    overseas: initial?.overseas ?? "",
    overseasCountry: initial?.overseasCountry ?? "",
  });
}

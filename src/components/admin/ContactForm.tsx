import { useForm } from "@tanstack/react-form";
import { contactDataSchema, type ContactData } from "../../lib/contacts/schema";

type Props = {
  initial?: Partial<ContactData>;
  action: string;
  submitLabel?: string;
  method?: "POST";
};

const fieldClass =
  "font-body text-base text-text-body px-4 py-3 rounded-md border border-border-strong bg-white outline-none focus:border-accent-primary w-full";
const labelClass = "flex flex-col gap-1.5 font-display text-sm text-text-heading";

export default function ContactForm({
  initial,
  action,
  submitLabel = "Save contact",
}: Props) {
  const form = useForm({
    defaultValues: {
      displayName: initial?.displayName ?? "",
      email: initial?.email ?? "",
      phone: initial?.phone ?? "",
      line1: initial?.address?.line1 ?? "",
      line2: initial?.address?.line2 ?? "",
      city: initial?.address?.city ?? "",
      state: initial?.address?.state ?? "",
      postalCode: initial?.address?.postalCode ?? "",
      country: initial?.address?.country ?? "AU",
      tags: (initial?.tags ?? []).join(", "),
      notes: initial?.notes ?? "",
    },
    onSubmit: async () => {
      /* native form submit */
    },
  });

  return (
    <form
      method="POST"
      action={action}
      className="max-w-xl space-y-4"
      onSubmit={(e) => {
        const values = form.state.values;
        const tags = values.tags
          .split(",")
          .map((t) => t.trim())
          .filter(Boolean);
        const parsed = contactDataSchema.safeParse({
          displayName: values.displayName,
          email: values.email,
          phone: values.phone,
          address: {
            line1: values.line1,
            line2: values.line2,
            city: values.city,
            state: values.state,
            postalCode: values.postalCode,
            country: values.country,
          },
          tags,
          notes: values.notes,
        });
        if (!parsed.success) {
          e.preventDefault();
          alert(parsed.error.issues.map((i) => i.message).join("\n"));
        }
      }}
    >
      <form.Field name="displayName">
        {(field) => (
          <label className={labelClass}>
            Display name
            <input
              className={fieldClass}
              name="displayName"
              required
              value={field.state.value}
              onBlur={field.handleBlur}
              onChange={(e) => field.handleChange(e.target.value)}
            />
          </label>
        )}
      </form.Field>

      <div className="grid gap-4 sm:grid-cols-2">
        <form.Field name="email">
          {(field) => (
            <label className={labelClass}>
              Email
              <input
                className={fieldClass}
                name="email"
                type="email"
                value={field.state.value}
                onBlur={field.handleBlur}
                onChange={(e) => field.handleChange(e.target.value)}
              />
            </label>
          )}
        </form.Field>
        <form.Field name="phone">
          {(field) => (
            <label className={labelClass}>
              Phone
              <input
                className={fieldClass}
                name="phone"
                type="tel"
                value={field.state.value}
                onBlur={field.handleBlur}
                onChange={(e) => field.handleChange(e.target.value)}
              />
            </label>
          )}
        </form.Field>
      </div>

      <form.Field name="line1">
        {(field) => (
          <label className={labelClass}>
            Address line 1
            <input
              className={fieldClass}
              name="line1"
              value={field.state.value}
              onBlur={field.handleBlur}
              onChange={(e) => field.handleChange(e.target.value)}
            />
          </label>
        )}
      </form.Field>
      <form.Field name="line2">
        {(field) => (
          <label className={labelClass}>
            Address line 2
            <input
              className={fieldClass}
              name="line2"
              value={field.state.value}
              onBlur={field.handleBlur}
              onChange={(e) => field.handleChange(e.target.value)}
            />
          </label>
        )}
      </form.Field>

      <div className="grid gap-4 sm:grid-cols-3">
        <form.Field name="city">
          {(field) => (
            <label className={labelClass}>
              City
              <input
                className={fieldClass}
                name="city"
                value={field.state.value}
                onBlur={field.handleBlur}
                onChange={(e) => field.handleChange(e.target.value)}
              />
            </label>
          )}
        </form.Field>
        <form.Field name="state">
          {(field) => (
            <label className={labelClass}>
              State
              <input
                className={fieldClass}
                name="state"
                value={field.state.value}
                onBlur={field.handleBlur}
                onChange={(e) => field.handleChange(e.target.value)}
              />
            </label>
          )}
        </form.Field>
        <form.Field name="postalCode">
          {(field) => (
            <label className={labelClass}>
              Postcode
              <input
                className={fieldClass}
                name="postalCode"
                value={field.state.value}
                onBlur={field.handleBlur}
                onChange={(e) => field.handleChange(e.target.value)}
              />
            </label>
          )}
        </form.Field>
      </div>

      <input type="hidden" name="country" value={form.state.values.country} />

      <form.Field name="tags">
        {(field) => (
          <label className={labelClass}>
            Tags (comma-separated)
            <input
              className={fieldClass}
              name="tags"
              value={field.state.value}
              onBlur={field.handleBlur}
              onChange={(e) => field.handleChange(e.target.value)}
              placeholder="member, volunteer"
            />
          </label>
        )}
      </form.Field>

      <form.Field name="notes">
        {(field) => (
          <label className={labelClass}>
            Notes
            <textarea
              className={fieldClass}
              name="notes"
              rows={4}
              value={field.state.value}
              onBlur={field.handleBlur}
              onChange={(e) => field.handleChange(e.target.value)}
            />
          </label>
        )}
      </form.Field>

      <button
        type="submit"
        className="inline-flex items-center justify-center font-display font-semibold tracking-[0.04em] rounded-pill bg-accent-primary text-text-on-accent px-[26px] pt-[13px] pb-[11px] text-[15px] leading-none hover:bg-accent-primary-strong"
      >
        {submitLabel}
      </button>
    </form>
  );
}

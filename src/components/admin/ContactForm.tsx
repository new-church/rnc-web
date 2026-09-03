import { useState } from "react";
import { useForm } from "@tanstack/react-form";
import {
  buildDisplayName,
  type ContactData,
} from "../../lib/contacts/schema";
import AddressAutocomplete, {
  addressFieldsFromInitial,
  type AddressFields,
} from "./AddressAutocomplete";

type Props = {
  initial?: Partial<ContactData>;
  action: string;
  submitLabel?: string;
};

const fieldClass =
  "font-body text-base text-text-body px-4 py-3 rounded-md border border-border-strong bg-white outline-none focus:border-accent-primary w-full";
const labelClass =
  "flex flex-col gap-1.5 font-display text-sm text-text-heading";
const sectionClass = "space-y-4 pt-2";
const headingClass =
  "font-display text-base font-semibold text-text-heading tracking-wide border-b border-border-soft pb-2";

function FlagSelect({
  name,
  label,
  value,
  onChange,
  onBlur,
  options = [
    { value: "", label: "—" },
    { value: "Y", label: "Y" },
    { value: "N", label: "N" },
  ],
}: {
  name: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  onBlur: () => void;
  options?: { value: string; label: string }[];
}) {
  return (
    <label className={labelClass}>
      {label}
      <select
        className={fieldClass}
        name={name}
        value={value}
        onBlur={onBlur}
        onChange={(e) => onChange(e.target.value)}
      >
        {options.map((o) => (
          <option key={o.value || "empty"} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}

export default function ContactForm({
  initial,
  action,
  submitLabel = "Save contact",
}: Props) {
  const flags = initial?.flags;
  const [manualAddress, setManualAddress] = useState(() =>
    addressFieldsFromInitial(initial?.address),
  );
  const form = useForm({
    defaultValues: {
      title: initial?.title ?? "",
      firstName: initial?.firstName ?? "",
      lastName: initial?.lastName ?? "",
      titledCompleteName: initial?.titledCompleteName ?? "",
      email: initial?.email ?? "",
      phoneHome: initial?.phones?.home ?? "",
      phoneMobile: initial?.phones?.mobile ?? "",
      phoneWork: initial?.phones?.work ?? "",
      line1: initial?.address?.line1 ?? "",
      line2: initial?.address?.line2 ?? "",
      city: initial?.address?.city ?? "",
      state: initial?.address?.state ?? "",
      postalCode: initial?.address?.postalCode ?? "",
      overseas: initial?.address?.overseas ?? "",
      overseasCountry: initial?.address?.overseasCountry ?? "",
      birthday: initial?.birthday ?? "",
      birthYear: initial?.birthYear ?? "",
      tags: (initial?.tags ?? []).join(", "),
      notes: initial?.notes ?? "",
      previousAddrEmail: initial?.previousAddrEmail ?? "",
      sourceRecord: initial?.sourceRecord ?? "",
      flagBirthdaySend: flags?.birthdaySend ?? "",
      flagRncBirthdayChild: flags?.rncBirthdayChild ?? "",
      flagMailchimp: flags?.mailchimp ?? "",
      flagNcSocietyRep: flags?.ncSocietyRep ?? "",
      flagRncMembChildren: flags?.rncMembChildren ?? "",
      flagRncMembCommittee: flags?.rncMembCommittee ?? "",
      flagRncMembThoughtElsewhere: flags?.rncMembThoughtElsewhere ?? "",
      flagRncNonMembFromDirectory: flags?.rncNonMembFromDirectory ?? "",
      flagRncNonMembsGetAgmRpts: flags?.rncNonMembsGetAgmRpts ?? "",
      flagSaaConcession: flags?.saaConcession ?? "",
      flagSaaMember: flags?.saaMember ?? "",
      flagCandelas: flags?.candelas ?? "",
      flagRncCalendar: flags?.rncCalendar ?? "",
      flagSaaPaidToYear: flags?.saaPaidToYear ?? "",
      flagSaaSince: flags?.saaSince ?? "",
      flagSaaLastPaymentOrStatusChange:
        flags?.saaLastPaymentOrStatusChange ?? "",
      flagScLibrarySince: flags?.scLibrarySince ?? "",
    },
    onSubmit: async () => {},
  });

  function applyResolvedAddress(address: AddressFields) {
    form.setFieldValue("line1", address.line1);
    form.setFieldValue("line2", address.line2);
    form.setFieldValue("city", address.city);
    form.setFieldValue("state", address.state);
    form.setFieldValue("postalCode", address.postalCode);
    form.setFieldValue("overseas", address.overseas);
    form.setFieldValue("overseasCountry", address.overseasCountry);
    setManualAddress(true);
  }

  return (
    <form method="POST" action={action} className="max-w-2xl space-y-8">
      <section className={sectionClass}>
        <h2 className={headingClass}>Name</h2>
        <div className="grid gap-4 sm:grid-cols-3">
          <form.Field name="title">
            {(field) => (
              <label className={labelClass}>
                Title
                <input
                  className={fieldClass}
                  name="title"
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={(e) => field.handleChange(e.target.value)}
                />
              </label>
            )}
          </form.Field>
          <form.Field name="firstName">
            {(field) => (
              <label className={labelClass}>
                First name
                <input
                  className={fieldClass}
                  name="firstName"
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={(e) => field.handleChange(e.target.value)}
                />
              </label>
            )}
          </form.Field>
          <form.Field name="lastName">
            {(field) => (
              <label className={labelClass}>
                Last name
                <input
                  className={fieldClass}
                  name="lastName"
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={(e) => field.handleChange(e.target.value)}
                />
              </label>
            )}
          </form.Field>
        </div>
        <form.Field name="titledCompleteName">
          {(field) => (
            <label className={labelClass}>
              Titled complete name
              <input
                className={fieldClass}
                name="titledCompleteName"
                value={field.state.value}
                onBlur={field.handleBlur}
                onChange={(e) => field.handleChange(e.target.value)}
                placeholder={buildDisplayName({
                  title: form.state.values.title,
                  firstName: form.state.values.firstName,
                  lastName: form.state.values.lastName,
                })}
              />
            </label>
          )}
        </form.Field>
      </section>

      <section className={sectionClass}>
        <h2 className={headingClass}>Contact</h2>
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
        <div className="grid gap-4 sm:grid-cols-3">
          <form.Field name="phoneHome">
            {(field) => (
              <label className={labelClass}>
                Home
                <input
                  className={fieldClass}
                  name="phoneHome"
                  type="tel"
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={(e) => field.handleChange(e.target.value)}
                />
              </label>
            )}
          </form.Field>
          <form.Field name="phoneMobile">
            {(field) => (
              <label className={labelClass}>
                Mobile
                <input
                  className={fieldClass}
                  name="phoneMobile"
                  type="tel"
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={(e) => field.handleChange(e.target.value)}
                />
              </label>
            )}
          </form.Field>
          <form.Field name="phoneWork">
            {(field) => (
              <label className={labelClass}>
                Work phone
                <input
                  className={fieldClass}
                  name="phoneWork"
                  type="tel"
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={(e) => field.handleChange(e.target.value)}
                />
              </label>
            )}
          </form.Field>
        </div>
      </section>

      <section className={sectionClass}>
        <h2 className={headingClass}>Address</h2>
        <AddressAutocomplete
          fieldClass={fieldClass}
          labelClass={labelClass}
          onSelect={applyResolvedAddress}
        />
        {!manualAddress ? (
          <p className="text-sm text-ink-muted">
            <button
              type="button"
              className="font-display text-accent-primary-strong underline"
              onClick={() => setManualAddress(true)}
            >
              Enter address manually
            </button>
          </p>
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-ink-muted">
              <button
                type="button"
                className="font-display text-accent-primary-strong underline"
                onClick={() => setManualAddress(false)}
              >
                Hide manual fields
              </button>
              {" · "}
              Edit below if the lookup is wrong or unavailable.
            </p>
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
            <div className="grid gap-4 sm:grid-cols-2">
              <form.Field name="overseas">
                {(field) => (
                  <label className={labelClass}>
                    Overseas (legacy)
                    <input
                      className={fieldClass}
                      name="overseas"
                      value={field.state.value}
                      onBlur={field.handleBlur}
                      onChange={(e) => field.handleChange(e.target.value)}
                    />
                  </label>
                )}
              </form.Field>
              <form.Field name="overseasCountry">
                {(field) => (
                  <label className={labelClass}>
                    Overseas country
                    <input
                      className={fieldClass}
                      name="overseasCountry"
                      value={field.state.value}
                      onBlur={field.handleBlur}
                      onChange={(e) => field.handleChange(e.target.value)}
                    />
                  </label>
                )}
              </form.Field>
            </div>
          </div>
        )}
        {/* Always submit address fields even when manual UI is collapsed */}
        {!manualAddress ? (
          <form.Subscribe selector={(s) => s.values}>
            {(values) => (
              <>
                <input type="hidden" name="line1" value={values.line1} />
                <input type="hidden" name="line2" value={values.line2} />
                <input type="hidden" name="city" value={values.city} />
                <input type="hidden" name="state" value={values.state} />
                <input
                  type="hidden"
                  name="postalCode"
                  value={values.postalCode}
                />
                <input type="hidden" name="overseas" value={values.overseas} />
                <input
                  type="hidden"
                  name="overseasCountry"
                  value={values.overseasCountry}
                />
              </>
            )}
          </form.Subscribe>
        ) : null}
      </section>

      <section className={sectionClass}>
        <h2 className={headingClass}>Birthday</h2>
        <div className="grid gap-4 sm:grid-cols-3">
          <form.Field name="birthday">
            {(field) => (
              <label className={labelClass}>
                Birthday
                <input
                  className={fieldClass}
                  name="birthday"
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={(e) => field.handleChange(e.target.value)}
                  placeholder="DD/MM or full date"
                />
              </label>
            )}
          </form.Field>
          <form.Field name="birthYear">
            {(field) => (
              <label className={labelClass}>
                Birth year
                <input
                  className={fieldClass}
                  name="birthYear"
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={(e) => field.handleChange(e.target.value)}
                />
              </label>
            )}
          </form.Field>
          <form.Field name="flagBirthdaySend">
            {(field) => (
              <FlagSelect
                name="flagBirthdaySend"
                label="Birthday send"
                value={field.state.value}
                onBlur={field.handleBlur}
                onChange={field.handleChange}
              />
            )}
          </form.Field>
        </div>
      </section>

      <section className={sectionClass}>
        <h2 className={headingClass}>Tags & notes</h2>
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
                placeholder="SAA, Members, News"
              />
            </label>
          )}
        </form.Field>
        <form.Field name="notes">
          {(field) => (
            <label className={labelClass}>
              Contact history notes
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
        <form.Field name="previousAddrEmail">
          {(field) => (
            <label className={labelClass}>
              Previous address / email
              <textarea
                className={fieldClass}
                name="previousAddrEmail"
                rows={2}
                value={field.state.value}
                onBlur={field.handleBlur}
                onChange={(e) => field.handleChange(e.target.value)}
              />
            </label>
          )}
        </form.Field>
      </section>

      <section className={sectionClass}>
        <h2 className={headingClass}>Mail & lists</h2>
        <div className="grid gap-4 sm:grid-cols-3">
          <form.Field name="flagCandelas">
            {(field) => (
              <label className={labelClass}>
                Candela copies
                <input
                  className={fieldClass}
                  name="flagCandelas"
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={(e) => field.handleChange(e.target.value)}
                />
              </label>
            )}
          </form.Field>
          <form.Field name="flagRncCalendar">
            {(field) => (
              <label className={labelClass}>
                RNC calendar copies
                <input
                  className={fieldClass}
                  name="flagRncCalendar"
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={(e) => field.handleChange(e.target.value)}
                />
              </label>
            )}
          </form.Field>
          <form.Field name="flagMailchimp">
            {(field) => (
              <FlagSelect
                name="flagMailchimp"
                label="Mailchimp"
                value={field.state.value}
                onBlur={field.handleBlur}
                onChange={field.handleChange}
              />
            )}
          </form.Field>
        </div>
      </section>

      <section className={sectionClass}>
        <h2 className={headingClass}>RNC membership flags</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <form.Field name="flagNcSocietyRep">
            {(field) => (
              <FlagSelect
                name="flagNcSocietyRep"
                label="NC society rep"
                value={field.state.value}
                onBlur={field.handleBlur}
                onChange={field.handleChange}
              />
            )}
          </form.Field>
          <form.Field name="flagRncBirthdayChild">
            {(field) => (
              <FlagSelect
                name="flagRncBirthdayChild"
                label="RNC birthday child"
                value={field.state.value}
                onBlur={field.handleBlur}
                onChange={field.handleChange}
              />
            )}
          </form.Field>
          <form.Field name="flagRncMembChildren">
            {(field) => (
              <FlagSelect
                name="flagRncMembChildren"
                label="RNC memb: children"
                value={field.state.value}
                onBlur={field.handleBlur}
                onChange={field.handleChange}
              />
            )}
          </form.Field>
          <form.Field name="flagRncMembCommittee">
            {(field) => (
              <FlagSelect
                name="flagRncMembCommittee"
                label="RNC memb: committee"
                value={field.state.value}
                onBlur={field.handleBlur}
                onChange={field.handleChange}
              />
            )}
          </form.Field>
          <form.Field name="flagRncMembThoughtElsewhere">
            {(field) => (
              <FlagSelect
                name="flagRncMembThoughtElsewhere"
                label="Thought to be memb elsewhere"
                value={field.state.value}
                onBlur={field.handleBlur}
                onChange={field.handleChange}
              />
            )}
          </form.Field>
          <form.Field name="flagRncNonMembFromDirectory">
            {(field) => (
              <FlagSelect
                name="flagRncNonMembFromDirectory"
                label="Non-memb from directory"
                value={field.state.value}
                onBlur={field.handleBlur}
                onChange={field.handleChange}
              />
            )}
          </form.Field>
          <form.Field name="flagRncNonMembsGetAgmRpts">
            {(field) => (
              <FlagSelect
                name="flagRncNonMembsGetAgmRpts"
                label="Non-membs get AGM reports"
                value={field.state.value}
                onBlur={field.handleBlur}
                onChange={field.handleChange}
              />
            )}
          </form.Field>
        </div>
      </section>

      <section className={sectionClass}>
        <h2 className={headingClass}>SAA / library</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <form.Field name="flagSaaMember">
            {(field) => (
              <FlagSelect
                name="flagSaaMember"
                label="SAA member"
                value={field.state.value}
                onBlur={field.handleBlur}
                onChange={field.handleChange}
                options={[
                  { value: "", label: "—" },
                  { value: "Y", label: "Y" },
                  { value: "N", label: "N" },
                  { value: "L", label: "L (life)" },
                ]}
              />
            )}
          </form.Field>
          <form.Field name="flagSaaConcession">
            {(field) => (
              <FlagSelect
                name="flagSaaConcession"
                label="SAA concession"
                value={field.state.value}
                onBlur={field.handleBlur}
                onChange={field.handleChange}
              />
            )}
          </form.Field>
          <form.Field name="flagSaaPaidToYear">
            {(field) => (
              <label className={labelClass}>
                SAA paid-to year
                <input
                  className={fieldClass}
                  name="flagSaaPaidToYear"
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={(e) => field.handleChange(e.target.value)}
                />
              </label>
            )}
          </form.Field>
          <form.Field name="flagSaaSince">
            {(field) => (
              <label className={labelClass}>
                SAA since
                <input
                  className={fieldClass}
                  name="flagSaaSince"
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={(e) => field.handleChange(e.target.value)}
                />
              </label>
            )}
          </form.Field>
          <form.Field name="flagSaaLastPaymentOrStatusChange">
            {(field) => (
              <label className={labelClass}>
                SAA last payment / status change
                <input
                  className={fieldClass}
                  name="flagSaaLastPaymentOrStatusChange"
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={(e) => field.handleChange(e.target.value)}
                />
              </label>
            )}
          </form.Field>
          <form.Field name="flagScLibrarySince">
            {(field) => (
              <label className={labelClass}>
                SC library since
                <input
                  className={fieldClass}
                  name="flagScLibrarySince"
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={(e) => field.handleChange(e.target.value)}
                />
              </label>
            )}
          </form.Field>
        </div>
      </section>

      <input type="hidden" name="sourceRecord" value={form.state.values.sourceRecord} />

      <button
        type="submit"
        className="inline-flex items-center justify-center font-display font-semibold tracking-[0.04em] rounded-pill bg-accent-primary text-text-on-accent px-[26px] pt-[13px] pb-[11px] text-[15px] leading-none hover:bg-accent-primary-strong"
      >
        {submitLabel}
      </button>
    </form>
  );
}

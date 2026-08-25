import { SCOPES } from "../../lib/auth/scopes";

type Props = {
  email: string;
  displayName?: string;
  scopes: string[];
  action: string;
};

export default function UserScopesForm({
  email,
  displayName,
  scopes,
  action,
}: Props) {
  const options = [
    { id: SCOPES.admin, label: "admin" },
    { id: SCOPES.superAdmin, label: "super_admin" },
  ];

  return (
    <form method="POST" action={action} className="max-w-md space-y-4">
      <div>
        <p className="font-display text-sm text-text-muted mb-1">User</p>
        <p className="font-medium text-ink">{email}</p>
        {displayName ? (
          <p className="text-sm text-ink-muted">{displayName}</p>
        ) : null}
      </div>

      <fieldset className="space-y-2">
        <legend className="font-display text-sm text-text-heading mb-2">
          Scopes
        </legend>
        {options.map((opt) => (
          <label
            key={opt.id}
            className="flex items-center gap-2 font-body text-sm text-ink"
          >
            <input
              type="checkbox"
              name="scopes"
              value={opt.id}
              defaultChecked={scopes.includes(opt.id)}
              className="rounded border-border-strong"
            />
            <code className="text-xs">{opt.label}</code>
          </label>
        ))}
      </fieldset>

      <input
        type="text"
        name="displayName"
        defaultValue={displayName ?? ""}
        placeholder="Display name"
        className="font-body text-base text-text-body px-4 py-3 rounded-md border border-border-strong bg-white outline-none focus:border-accent-primary w-full"
      />

      <button
        type="submit"
        className="inline-flex items-center justify-center font-display font-semibold tracking-[0.04em] rounded-pill bg-accent-primary text-text-on-accent px-[26px] pt-[13px] pb-[11px] text-[15px] leading-none hover:bg-accent-primary-strong"
      >
        Save scopes
      </button>
    </form>
  );
}

type Props = {
  email: string;
  displayName: string;
  action?: string;
};

export default function AccountForm({
  email,
  displayName,
  action = "/admin/account",
}: Props) {
  return (
    <form method="POST" action={action} className="max-w-md space-y-4">
      <label className="flex flex-col gap-1.5 font-display text-sm text-text-heading">
        Email
        <input
          className="font-body text-base text-text-muted px-4 py-3 rounded-md border border-border-soft bg-cream"
          type="email"
          value={email}
          disabled
          readOnly
        />
        <span className="font-body text-[13px] text-text-muted">
          Email comes from your login identity.
        </span>
      </label>
      <label className="flex flex-col gap-1.5 font-display text-sm text-text-heading">
        Display name
        <input
          className="font-body text-base text-text-body px-4 py-3 rounded-md border border-border-strong bg-white outline-none focus:border-accent-primary w-full"
          name="displayName"
          defaultValue={displayName}
          required
        />
      </label>
      <button
        type="submit"
        className="inline-flex items-center justify-center font-display font-semibold tracking-[0.04em] rounded-pill bg-accent-primary text-text-on-accent px-[26px] pt-[13px] pb-[11px] text-[15px] leading-none hover:bg-accent-primary-strong"
      >
        Save
      </button>
    </form>
  );
}

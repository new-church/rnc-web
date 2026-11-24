/**
 * Giving details (PayID and bank account), kept out of the page HTML.
 *
 * The /give page shows nothing until Turnstile passes; it then posts the token to /api/give, which
 * returns these details as JSON. Scrapers that only fetch the HTML never see them.
 *
 * Env (production, Vercel): GIVE_PAYID, GIVE_ACCOUNT_NAME, GIVE_BSB, GIVE_ACCOUNT_NUMBER.
 * Optional: GIVE_PAYID_TYPE (e.g. "ABN", "Email"; shown as a hint only).
 * Outside production, or if unset, obvious dummy values are used so the page can be tested safely.
 */
import { env } from './env';
import { isProduction } from './signup';

export type GiveDetails = {
  payid: string;
  payidType: string;
  accountName: string;
  bsb: string;
  accountNumber: string;
  dummy: boolean;
};

const DUMMY = {
  payid: 'payid-test@example.invalid',
  payidType: 'Email',
  accountName: 'TEST ACCOUNT - DO NOT PAY',
  bsb: '000-000',
  accountNumber: '00000000',
};

/** Details for this environment; null when production has no giving details configured. */
export function giveDetails(): GiveDetails | null {
  const payid = env('GIVE_PAYID');
  const accountName = env('GIVE_ACCOUNT_NAME');
  const bsb = env('GIVE_BSB');
  const accountNumber = env('GIVE_ACCOUNT_NUMBER');
  const configured = Boolean(payid && accountName && bsb && accountNumber);

  if (!configured && isProduction()) return null;
  const d = configured
    ? { payid: payid!, payidType: env('GIVE_PAYID_TYPE') ?? '', accountName: accountName!, bsb: bsb!, accountNumber: accountNumber! }
    : DUMMY;

  return { ...d, dummy: !configured };
}

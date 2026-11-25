/**
 * Member self-service settings (docs/member-self-service-design.md).
 * Wording that comes from the Society's constitution is quoted exactly; change it only when the constitution changes.
 */
import { env } from '../env';
import { signupConfig } from '../signup/config';

const MIN = 60;
const HOUR = 60 * MIN;
const DAY = 24 * HOUR;

export const memberConfig = {
  /** Time to live (seconds) for each kind of working row. */
  ttl: {
    signup: 7 * DAY,
    challenge: 10 * MIN,
    sessionIdle: 30 * MIN,
    sessionAbsolute: 8 * HOUR,
    login: 10 * MIN,
    audit: 2 * 365 * DAY,
    /** A decided membership request is kept this long as a working log; the Planning Center note is the record. */
    decided: 2 * 365 * DAY,
  },
  challenge: { maxAttempts: 5, resendAfterSeconds: 60 },
  rate: {
    loginPerEmail: { limit: 5, windowSeconds: HOUR },
    loginPerIp: { limit: 20, windowSeconds: HOUR },
    verifyPerEmail: { limit: 15, windowSeconds: HOUR },
    verifyPerIp: { limit: 60, windowSeconds: HOUR },
    signupPerEmail: { limit: 3, windowSeconds: HOUR },
    signupPerIp: { limit: 20, windowSeconds: HOUR },
    addressSuggestPerIp: { limit: 300, windowSeconds: HOUR },
    addressResolvePerIp: { limit: 30, windowSeconds: HOUR },
  },
  /** Planning Center membership types (People > Membership). */
  membership: {
    society: 'Society Friend',
    centre: 'Swedenborg Centre Friend',
    member: 'Member',
  },
  /**
   * Optional Planning Center custom fields that make up the Roll Book. They do not exist yet: each is written only if
   * a field with this exact name exists, and every change is also recorded as a Planning Center note.
   */
  rollBookFields: {
    joined: 'Membership joined',
    left: 'Membership left',
    resolution: 'Committee resolution',
    proposedBy: 'Proposed by',
    secondedBy: 'Seconded by',
    avowal: 'Belief avowal',
  },
  noteCategory: 'General',
  /** Who is told about membership applications and resignations. */
  notifyTo: () => env('MEMBERSHIP_NOTIFY_TO') ?? signupConfig.contactTo,
  /** Version label stored with each avowal; bump when the wording below changes. */
  avowalVersion: 'constitution-2013-art4',
  /** Article 4 of the registered constitution: candidates "must avow their belief in" these four things. */
  avowals: [
    'the Deity of the Lord Jesus Christ',
    'the holiness of the Word',
    'the necessity of shunning evils as sins against God',
    'leading a life of universal charity',
  ],
  /** Memorandum clause 4: "not exceeding five shillings" (50 cents). */
  guarantee: 'up to 50 cents',
};

/** Session cookie name. The __Host- prefix needs HTTPS, so it is used in production only. */
export const sessionCookieName = (production: boolean) => (production ? '__Host-rnc_member' : 'rnc_member');
export const loginCookieName = (production: boolean) => (production ? '__Host-rnc_login' : 'rnc_login');

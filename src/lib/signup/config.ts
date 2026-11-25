/** Per-site settings for the mailing list signup (the code in index.ts is shared with sc-www). */
export const signupConfig = {
  siteName: 'Roseville New Church',
  /** Production origin, used in confirmation links (other environments use the request origin). */
  siteUrl: 'https://www.rosevillenewchurch.com.au',
  from: 'Roseville New Church <admin@rosevillenewchurch.com.au>',
  replyTo: 'admin@rosevillenewchurch.com.au',
  /** Where the contact-form enquiries are sent. */
  contactTo: 'admin@rosevillenewchurch.com.au',
  /** Staff alerts (new subscribers, problems) go to the alerts@ssnc.au distribution group in Microsoft 365, whose members are managed there. ALERT_EMAIL_TO in Vercel overrides this. */
  alertTo: 'alerts@ssnc.au',
  contactPhone: '02 9416 7026',
  /** rnc-web paths have no trailing slash; sc-www uses trailing slashes everywhere. */
  trailingSlash: false,
  /**
   * The lists people can pick. `option` is the exact option name of the "Communication preferences"
   * checkbox field in Planning Center.
   */
  lists: [
    { id: 'society', label: 'Society news', hint: 'News and notices from The Sydney Society of The New Church', option: 'Society news', checked: true },
    { id: 'centre', label: 'Swedenborg Centre news', hint: 'The monthly Swedenborg Centre enews', option: 'Swedenborg Centre news', checked: false },
    { id: 'candela', label: 'Candela', hint: 'The Candela magazine, by email', option: 'Candela', checked: false },
  ],
};
export type SignupList = (typeof signupConfig.lists)[number];

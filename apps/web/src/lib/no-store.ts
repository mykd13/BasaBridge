/**
 * Everything sends `no-store` except the public pages and static assets below. A page or API
 * route that shows a learner's or parent's data is then private by default, so nobody has to
 * remember to add it to a list. `no-store` keeps these responses out of shared caches and the
 * browser's back-forward cache, so Back on a shared device cannot show the last person's page
 * (BB-71). The root page only redirects to sign in. `_next/static` and `_next/image` set their
 * own caching.
 */
export const PUBLIC_PATHS = ['sign-in', 'sign-up', '_next/static', '_next/image', 'favicon.ico'];
const publicPattern = PUBLIC_PATHS.map((p) => p.replace('.', '\\.')).join('|');
export const NO_STORE_SOURCE = `/((?!(?:${publicPattern})(?:/|$)).+)`;

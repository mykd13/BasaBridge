import { clearBrowserSession } from './shared-device';

/**
 * Sign out from script (BB-71). It clears this tab's `bb:` keys, ends the session on the server,
 * then loads the sign-in page as a full page load.
 * The full load is the point on a shared device. A soft navigation keeps the Next router cache,
 * and Back would show the last learner's pages from it without asking the server. A full load
 * drops that cache completely, which is stronger than `router.refresh()`. Calling refresh as
 * well would race the load: in Firefox the aborted refresh fetch falls back to a browser
 * navigation to the page being left, and the learner stays signed in on screen.
 */
export async function signOutAndReload(
  end: () => Promise<void>,
  go: (url: string) => void = (url) => window.location.replace(url),
): Promise<void> {
  clearBrowserSession();
  try {
    await end();
  } finally {
    go('/sign-in');
  }
}

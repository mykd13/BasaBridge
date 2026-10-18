import { cookies, headers } from 'next/headers';
import { getRequestConfig } from 'next-intl/server';
import { messagesFor } from './messages.ts';
import { LANG_COOKIE, resolvePreferences, type Preferences } from './resolve.ts';
import { getViewer } from './viewer.ts';

/** Language and wording for the current request. */
export async function getPreferences(): Promise<Preferences> {
  const [viewer, jar, requestHeaders] = await Promise.all([getViewer(), cookies(), headers()]);
  return resolvePreferences({
    viewer,
    cookie: jar.get(LANG_COOKIE)?.value,
    acceptLanguage: requestHeaders.get('accept-language'),
  });
}

/** next-intl reads the locale from the request, not the URL. */
export default getRequestConfig(async () => {
  const { lang, wording } = await getPreferences();
  return { locale: lang, messages: messagesFor(lang, wording) };
});

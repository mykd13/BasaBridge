'use server';

import { cookies } from 'next/headers';
import { isLang, LANG_COOKIE } from './resolve.ts';

const ONE_YEAR = 60 * 60 * 24 * 365;

/** Remember the language a signed-out visitor picked. Signed-in learners use reading help. */
export async function setSignedOutLanguage(lang: string): Promise<void> {
  if (!isLang(lang)) return;
  (await cookies()).set(LANG_COOKIE, lang, {
    path: '/',
    maxAge: ONE_YEAR,
    sameSite: 'lax',
    httpOnly: false,
  });
}

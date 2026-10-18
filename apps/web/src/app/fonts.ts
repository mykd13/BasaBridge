import { Atkinson_Hyperlegible, Lexend } from 'next/font/google';

/*
 * Fonts from ADR 0004, served from our own domain. next/font builds a fallback
 * face with matching metrics, so text does not move when the font arrives.
 */
export const lexend = Lexend({
  subsets: ['latin'],
  weight: ['500', '600', '700'],
  display: 'swap',
  variable: '--font-lexend',
});

export const atkinson = Atkinson_Hyperlegible({
  subsets: ['latin'],
  weight: ['400', '700'],
  display: 'swap',
  variable: '--font-atkinson',
});

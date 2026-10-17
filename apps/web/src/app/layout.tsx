import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import '@basabridge/ui/tokens.css';
import '@basabridge/ui/components.css';
import './globals.css';
import { UnsupportedBrowser } from '@/components/UnsupportedBrowser';
import { atkinson, lexend } from './fonts';

export const metadata: Metadata = {
  title: 'BasaBridge',
  description: 'Read out loud. Understand more.',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={`${lexend.variable} ${atkinson.variable}`}>
      <body>
        <UnsupportedBrowser />
        {children}
      </body>
    </html>
  );
}

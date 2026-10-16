import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import '@basabridge/ui/tokens.css';
import './globals.css';

export const metadata: Metadata = {
  title: 'BasaBridge',
  description: 'Read out loud. Understand more.',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}

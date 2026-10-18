'use client';

import { Button } from '@basabridge/ui';
import { useRouter } from 'next/navigation';

/** Asks the server for the page again. The error state uses it in place of an error boundary reset. */
export function ReloadButton({ label }: { label: string }) {
  const router = useRouter();
  return (
    <Button variant="secondary" size="md" onClick={() => router.refresh()}>
      {label}
    </Button>
  );
}

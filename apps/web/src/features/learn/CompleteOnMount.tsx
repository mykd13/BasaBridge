'use client';

import { useEffect, useRef } from 'react';

/** Tells the server the learner reached the end (H5). The server ignores a second call. */
export function CompleteOnMount({
  lessonId,
  complete,
}: {
  lessonId: string;
  complete: (lessonId: string) => Promise<unknown>;
}) {
  const sent = useRef(false);
  useEffect(() => {
    if (sent.current) return;
    sent.current = true;
    void complete(lessonId);
  }, [lessonId, complete]);
  return null;
}

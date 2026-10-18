/**
 * Browser error tracking (BB-39). Uncaught errors and rejected promises are sent to
 * /api/client-errors, which logs them. Only the error class and stack frames are sent. The
 * message is never sent, because it can hold text a learner typed or read. Ids in the path are
 * replaced, and at most a few reports leave one page load.
 */

const MAX_REPORTS = 5;
let sent = 0;

/** /parent/learners/3f2a... becomes /parent/learners/:id */
function routeTemplate(pathname: string): string {
  return pathname
    .split('/')
    .map((part) => (/^[0-9a-f-]{8,}$/i.test(part) || /^\d+$/.test(part) ? ':id' : part))
    .join('/');
}

function stripQuery(url: string | undefined): string | undefined {
  return url ? url.split(/[?#]/)[0] : undefined;
}

function report(kind: 'error' | 'unhandledrejection', reason: unknown, source?: string) {
  if (sent >= MAX_REPORTS) return;
  sent += 1;
  const err = reason instanceof Error ? reason : null;
  const body = JSON.stringify({
    kind,
    errorClass: err?.name ?? 'Error',
    stack: err?.stack?.slice(0, 3000),
    source: stripQuery(source),
    route: routeTemplate(window.location.pathname),
  });
  try {
    const blob = new Blob([body], { type: 'application/json' });
    if (!navigator.sendBeacon?.('/api/client-errors', blob)) {
      void fetch('/api/client-errors', { method: 'POST', body, keepalive: true });
    }
  } catch {
    // Reporting must never cause another error.
  }
}

window.addEventListener('error', (event) => {
  report('error', event.error ?? event.message, event.filename);
});

window.addEventListener('unhandledrejection', (event) => {
  report('unhandledrejection', event.reason);
});

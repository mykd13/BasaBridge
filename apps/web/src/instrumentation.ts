/**
 * Server error tracking (BB-39). Next calls onRequestError for every uncaught error in a route,
 * page, server action or middleware. We log the route template, never the real path or query,
 * and count the error for the spike alert.
 */
import type { Instrumentation } from 'next';

export function register() {}

export const onRequestError: Instrumentation.onRequestError = async (error, request, context) => {
  if (process.env.NEXT_RUNTIME !== 'nodejs') return;
  const { countError, log } = await import('./server/ops');
  const e = error as { digest?: unknown };
  log.error('request.error', {
    method: request.method,
    route: context.routePath,
    routerKind: context.routerKind,
    routeType: context.routeType,
    digest: typeof e?.digest === 'string' ? e.digest : undefined,
    error,
  });
  try {
    await countError('server');
  } catch (err) {
    log.warn('request.error.count_failed', { error: err });
  }
};

/**
 * Server error tracking (BB-39). Next calls onRequestError for every uncaught error in a route,
 * page, server action or middleware. We log the route template, never the real path or query,
 * and count the error for the spike alert. The error message and stack are never logged.
 */
import type { Instrumentation } from 'next';

export function register() {}

export const onRequestError: Instrumentation.onRequestError = async (error, request, context) => {
  if (process.env.NEXT_RUNTIME !== 'nodejs') return;
  const { countError, log } = await import('./server/ops');
  const { safeErrorFields } = await import('./server/ops/error-fields');
  log.error('request.error', {
    method: request.method,
    route: context.routePath,
    routerKind: context.routerKind,
    routeType: context.routeType,
    ...safeErrorFields(error),
  });
  try {
    await countError('server');
  } catch (err) {
    log.warn('request.error.count_failed', { error: err });
  }
};

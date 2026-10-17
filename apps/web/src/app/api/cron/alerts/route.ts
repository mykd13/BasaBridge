import { alertCheckHandler } from '@/server/ops/routes';

export const dynamic = 'force-dynamic';

/** Called by Vercel cron (see vercel.json) with `Authorization: Bearer $CRON_SECRET`. */
export function GET(request: Request) {
  return alertCheckHandler(request);
}

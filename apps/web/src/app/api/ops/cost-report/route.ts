import { costReportHandler } from '@/server/ops/routes';

export const dynamic = 'force-dynamic';

/** Cost per learner per day. Needs `Authorization: Bearer $OPS_TOKEN`. See docs/observability.md. */
export function GET(request: Request) {
  return costReportHandler(request);
}

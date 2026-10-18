import { clientErrorHandler } from '@/server/ops/routes';

export const dynamic = 'force-dynamic';

export function POST(request: Request) {
  return clientErrorHandler(request);
}

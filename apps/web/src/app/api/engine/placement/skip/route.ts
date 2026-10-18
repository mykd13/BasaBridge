import { engine } from '@/server/engine';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  return engine.placementSkip(request);
}

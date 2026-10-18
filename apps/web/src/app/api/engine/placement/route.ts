import { engine } from '@/server/engine';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  return engine.placementCurrent(request);
}

export async function POST(request: Request) {
  return engine.placementStart(request);
}

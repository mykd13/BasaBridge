import { engine } from '@/server/engine';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  return engine.sessionCurrent(request);
}

export async function POST(request: Request) {
  return engine.sessionStart(request);
}

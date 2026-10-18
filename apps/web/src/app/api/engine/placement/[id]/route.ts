import { engine } from '@/server/engine';

export const dynamic = 'force-dynamic';

export async function GET(request: Request, ctx: { params: Promise<{ id: string }> }) {
  return engine.placementGet(request, await ctx.params);
}

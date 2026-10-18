import { engine } from '@/server/engine';

export const dynamic = 'force-dynamic';

export async function POST(request: Request, ctx: { params: Promise<{ id: string }> }) {
  return engine.placementAnswer(request, await ctx.params);
}

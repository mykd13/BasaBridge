import { engine } from '@/server/engine';

export const dynamic = 'force-dynamic';

export async function POST(request: Request, ctx: { params: Promise<{ id: string }> }) {
  return engine.sessionContinue(request, await ctx.params);
}

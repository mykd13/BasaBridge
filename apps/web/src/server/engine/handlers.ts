/**
 * Thin HTTP layer over packages/engine (docs/engine-api.md). Each handler authenticates through the
 * context seam, validates the body with the zod contracts, calls one engine function and maps rule
 * errors to a status code. No scoring, tries or level rules live here.
 */
import {
  PlacementAnswerRequest,
  PlacementReadRequest,
  SubmitAnswerRequest,
  SubmitTryRequest,
  type EngineErrorCode,
} from '@basabridge/contracts/engine';
import {
  continueToQuestions,
  EngineError,
  getCurrentPlacement,
  getCurrentSession,
  getPlacement,
  getPlacementGate,
  getSession,
  newStory,
  skipPlacement,
  startPlacement,
  startSession,
  statusFor,
  submitAnswer,
  submitPlacementAnswer,
  submitPlacementRead,
  submitTry,
} from '@basabridge/engine';
import { z } from 'zod';
import type { ContextResolver, EngineContext } from './context';

const Id = z.string().uuid();

const fail = (code: EngineErrorCode, status = statusFor(code)) =>
  Response.json({ error: code }, { status, headers: { 'cache-control': 'no-store' } });

const ok = (body: unknown) => Response.json(body, { headers: { 'cache-control': 'no-store' } });

async function readJson<T>(request: Request, schema: z.ZodType<T>): Promise<T | null> {
  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return null;
  }
  const parsed = schema.safeParse(raw);
  return parsed.success ? parsed.data : null;
}

export type Handler = (request: Request, params?: { id?: string }) => Promise<Response>;

export function createEngineHandlers(getResolver: () => ContextResolver | null) {
  /** Authenticate, run, and turn engine errors into responses. Nothing else escapes. */
  const run =
    (
      body: (ctx: EngineContext, request: Request, id: string | undefined) => Promise<unknown>,
      opts: { needsId?: boolean } = {},
    ): Handler =>
    async (request, params) => {
      const resolve = getResolver();
      if (!resolve) return fail('not_configured');
      const ctx = await resolve(request);
      if (!ctx) return fail('unauthorized');
      let id: string | undefined;
      if (opts.needsId) {
        const parsed = Id.safeParse(params?.id);
        if (!parsed.success) return fail('bad_request');
        id = parsed.data;
      }
      try {
        return ok(await body(ctx, request, id));
      } catch (e) {
        if (e instanceof EngineError) return fail(e.code);
        // Never echo the error: it may carry learner data. The caller logs ids only.
        return Response.json({ error: 'internal' }, { status: 500 });
      }
    };

  const bad = () => {
    throw new EngineError('bad_request');
  };

  return {
    // ---- reading sessions
    sessionCurrent: run(({ deps, learnerId }) => getCurrentSession(deps, learnerId)),
    sessionStart: run(({ deps, learnerId }) => startSession(deps, learnerId)),
    sessionGet: run(({ deps, learnerId }, _r, id) => getSession(deps, learnerId, id!), {
      needsId: true,
    }),
    sessionTry: run(
      async ({ deps, learnerId }, request, id) => {
        const body = (await readJson(request, SubmitTryRequest)) ?? bad();
        return submitTry(deps, learnerId, id!, body);
      },
      { needsId: true },
    ),
    sessionContinue: run(
      ({ deps, learnerId }, _r, id) => continueToQuestions(deps, learnerId, id!),
      {
        needsId: true,
      },
    ),
    sessionAnswer: run(
      async ({ deps, learnerId }, request, id) => {
        const body = (await readJson(request, SubmitAnswerRequest)) ?? bad();
        return submitAnswer(deps, learnerId, id!, body);
      },
      { needsId: true },
    ),
    sessionNewStory: run(({ deps, learnerId }, _r, id) => newStory(deps, learnerId, id!), {
      needsId: true,
    }),

    // ---- placement
    placementCurrent: run(async ({ deps, learnerId }) => ({
      gate: await getPlacementGate(deps, learnerId),
      current: await getCurrentPlacement(deps, learnerId),
    })),
    placementStart: run(({ deps, learnerId }) => startPlacement(deps, learnerId)),
    placementGet: run(({ deps, learnerId }, _r, id) => getPlacement(deps, learnerId, id!), {
      needsId: true,
    }),
    placementRead: run(
      async ({ deps, learnerId }, request, id) => {
        const body = (await readJson(request, PlacementReadRequest)) ?? bad();
        return submitPlacementRead(deps, learnerId, id!, body);
      },
      { needsId: true },
    ),
    placementAnswer: run(
      async ({ deps, learnerId }, request, id) => {
        const body = (await readJson(request, PlacementAnswerRequest)) ?? bad();
        return submitPlacementAnswer(deps, learnerId, id!, body);
      },
      { needsId: true },
    ),
    placementSkip: run(({ deps, learnerId }) => skipPlacement(deps, learnerId)),
  };
}

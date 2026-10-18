import type { EngineDeps } from '@basabridge/engine';

/** Who is asking and the engine wiring for them. */
export interface EngineContext {
  deps: EngineDeps;
  learnerId: string;
}

/**
 * Seam for authentication and wiring. It returns null when nobody is signed in as a learner.
 * The real one comes with the auth work (BB-7, BB-10): read the session cookie, check the role,
 * and build `deps` from the database repositories behind the authorization layer. Until then the
 * routes answer `not_configured` (503), so nothing runs against fake data.
 */
export type ContextResolver = (request: Request) => Promise<EngineContext | null>;

let resolver: ContextResolver | null = null;

export function configureEngine(next: ContextResolver | null): void {
  resolver = next;
}

export function currentResolver(): ContextResolver | null {
  return resolver;
}

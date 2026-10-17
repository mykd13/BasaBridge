/**
 * The authorization layer (BB-10). Server only.
 *
 * Pages and routes ask this module for learner data. They never import learner tables or the
 * learner query helpers from `@basabridge/db`; ESLint enforces that in `src/app`.
 * The parent link is read fresh on every call, so a revoke takes effect on the next request.
 */
import {
  createDbFromEnv,
  getLearner,
  getParentLink,
  getReadingSession,
  type Db,
  type Learner,
  type ReadingSession,
} from '@basabridge/db';
import {
  decide,
  type Action,
  type DataKind,
  type Decision,
  type LinkState,
  type Viewer,
} from './rules';

export * from './rules';

export class AccessDenied extends Error {
  constructor(readonly decision: Decision) {
    super(`Access denied: ${decision.reason}`);
    this.name = 'AccessDenied';
  }
}

let shared: Db | undefined;
const defaultDb = (): Db => (shared ??= createDbFromEnv().db as unknown as Db);

async function linkFor(db: Db, parentId: string, learnerId: string): Promise<LinkState | null> {
  const row = await getParentLink(db, parentId, learnerId);
  return row
    ? { status: row.status, sharesProgress: row.sharesProgress, sharesAnalysis: row.sharesAnalysis }
    : null;
}

/** Decides with the current link. Only a parent viewer needs the link lookup. */
export async function check(
  viewer: Viewer | null,
  learnerId: string,
  kind: DataKind,
  action: Action,
  db: Db = defaultDb(),
): Promise<Decision> {
  const link = viewer?.role === 'parent' ? await linkFor(db, viewer.id, learnerId) : null;
  return decide(viewer, learnerId, kind, action, link);
}

export async function canRead(viewer: Viewer | null, learnerId: string, kind: DataKind, db?: Db) {
  return (await check(viewer, learnerId, kind, 'read', db)).allowed;
}

export async function canWrite(viewer: Viewer | null, learnerId: string, kind: DataKind, db?: Db) {
  return (await check(viewer, learnerId, kind, 'write', db)).allowed;
}

/** Throws AccessDenied unless the viewer may do this. */
export async function assertAccess(
  viewer: Viewer | null,
  learnerId: string,
  kind: DataKind,
  action: Action,
  db?: Db,
): Promise<void> {
  const decision = await check(viewer, learnerId, kind, action, db);
  if (!decision.allowed) throw new AccessDenied(decision);
}

// ---- guarded reads ---------------------------------------------------------
// Add one here for each kind of learner data a page needs. Check first, then load.

export async function readLearnerLevel(
  viewer: Viewer | null,
  learnerId: string,
  db: Db = defaultDb(),
): Promise<Pick<Learner, 'level' | 'levelPasses'> | undefined> {
  await assertAccess(viewer, learnerId, 'level', 'read', db);
  const learner = await getLearner(db, learnerId);
  return learner && { level: learner.level, levelPasses: learner.levelPasses };
}

/** Looks up the session's owner first, so the check is against the real learner. */
export async function readReadingSession(
  viewer: Viewer | null,
  sessionId: string,
  db: Db = defaultDb(),
): Promise<ReadingSession | undefined> {
  const session = await getReadingSession(db, sessionId);
  if (!session) return undefined;
  await assertAccess(viewer, session.learnerUserId, 'sessions', 'read', db);
  return session;
}

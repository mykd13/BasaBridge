/**
 * Every route the BB-37 part 1 checks visit. Reading and question screens (BB-32, BB-33) are
 * part 2. Learn screens that are not on main yet (BB-56) are added when they land.
 *
 * The dev role override is read from the server environment, so the student routes run against
 * one dev server and the parent routes against another (playwright.config.ts).
 */
export type Audience = 'student' | 'parent' | 'signed-out';

export interface AuditRoute {
  path: string;
  audience: Audience;
  /** Short name for test titles. */
  name: string;
}

// A learner id for the parent screens. They read it from the URL and show the not wired state
// until BB-9 and BB-10 land, so any value works.
const LEARNER = '00000000-0000-4000-8000-0000000000aa';

const route = (audience: Audience, path: string, name = path): AuditRoute => ({
  audience,
  path,
  name,
});

export const STUDENT_ROUTES: AuditRoute[] = [
  route('student', '/home'),
  route('student', '/progress'),
  route('student', '/account'),
  route('student', '/account/help'),
  route('student', '/learn'),
  route('student', '/learn/words'),
  route('student', '/placement'),
  route('student', '/placement/result'),
  route('student', '/consent/update'),
];

export const PARENT_ROUTES: AuditRoute[] = [
  route('parent', '/parent/link'),
  route('parent', `/parent/${LEARNER}`, '/parent/[learner]'),
  route('parent', `/parent/${LEARNER}/readings`, '/parent/[learner]/readings'),
  route('parent', `/parent/${LEARNER}/levels`, '/parent/[learner]/levels'),
  route('parent', `/parent/${LEARNER}/decisions`, '/parent/[learner]/decisions'),
  route('parent', `/parent/${LEARNER}/privacy`, '/parent/[learner]/privacy'),
  route('parent', '/consent/update'),
];

/**
 * The dev preview of the parent screens with typed sample data (src/app/dev/parent). The real
 * routes show "not ready" until the data layer lands, so these cover the filled screens.
 * The sample data lives in the app's dev preview, not in these tests.
 */
export const PARENT_PREVIEWS: AuditRoute[] = [
  ...(['progress', 'readings', 'levels', 'decisions', 'privacy'] as const).map((screen) =>
    route('parent', `/dev/parent?screen=${screen}&state=ready`, `preview ${screen} ready`),
  ),
  ...(['loading', 'empty', 'not-shared', 'not-wired', 'error'] as const).map((state) =>
    route('parent', `/dev/parent?screen=progress&state=${state}`, `preview progress ${state}`),
  ),
];

export const SIGNED_OUT_ROUTES: AuditRoute[] = [
  route('signed-out', '/sign-in'),
  route('signed-out', '/sign-up'),
  route('signed-out', '/privacy'),
  route('signed-out', '/terms'),
  route('signed-out', '/privacy/kids'),
  route('signed-out', '/this-page-does-not-exist', 'not found'),
];

export const ALL_ROUTES: AuditRoute[] = [
  ...STUDENT_ROUTES,
  ...PARENT_ROUTES,
  ...PARENT_PREVIEWS,
  ...SIGNED_OUT_ROUTES,
];

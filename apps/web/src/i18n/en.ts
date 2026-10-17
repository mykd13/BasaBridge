/**
 * Temporary English catalog for the app shell (BB-6).
 * BB-58 replaces this with the full catalog: English and Filipino, each with a simple and a
 * standard wording. Keep the keys stable so BB-58 can absorb this file without touching callers.
 */
export const en = {
  'brand.name': 'BasaBridge',
  'skip.toContent': 'Skip to main content',

  'nav.main': 'Main',
  'nav.home': 'Home',
  'nav.learn': 'Learn',
  'nav.progress': 'My progress',
  'nav.account': 'My account',
  'nav.signOut': 'Sign out',
  'nav.parentAccount': 'Parent account',

  'header.newHere': 'New here? Create an account',
  'header.haveAccount': 'Already have an account? Sign in',

  'placeholder.body': 'This screen is not built yet. It will show real activity when it is ready.',
  'placeholder.board': 'Design canvas {boards}',

  'errors.generic.title': 'Something went wrong',
  'errors.generic.body': 'We could not show this page. Please try again.',
  'errors.notWired.title': 'This part is not ready yet',
  'errors.notWired.body': 'We are still building it. Please check back soon.',
  'errors.retry': 'Try again',
  'errors.notFound.title': 'We could not find that page',
  'errors.notFound.body': 'The link may be old, or the page may have moved.',
  'errors.notFound.action': 'Go to sign in',

  'browser.unsupported.title': 'This browser may not work well',
  'browser.unsupported.body':
    'Reading out loud needs a newer browser. You can still sign in. For the best result, use the latest Chrome, Edge, Samsung Internet or Firefox, or Safari 16.4 or newer.',

  'loading.page': 'Loading',
  'net.retrying': 'The connection is slow. Trying again.',

  'idle.title': 'Are you still there?',
  'idle.body': 'You will be signed out soon to keep your account safe.',
  'idle.stay': 'Stay signed in',

  'screens.signIn': 'Sign in',
  'screens.signUp': 'Create an account',
  'screens.home': 'Student home and level',
  'screens.read': 'Reading session',
  'screens.analysis': 'AI reading analysis',
  'screens.questions': 'Questions',
  'screens.result': 'Result and level progress',
  'screens.levelUp': 'Level up',
  'screens.progress': 'My progress',
  'screens.account': 'My account',
  'screens.share': 'Share with a parent',
  'screens.help': 'Reading help',
  'screens.placement': 'Find my starting level',
  'screens.placementNext': 'Between placement stories',
  'screens.placementResult': 'Your starting level',
  'screens.learn': 'Learn home',
  'screens.lesson': 'Lesson',
  'screens.practice': 'Lesson practice',
  'screens.lessonDone': 'Lesson done',
  'screens.words': 'Word practice: Say it',
  'screens.parentLink': 'Link your child’s account',
  'screens.parentProgress': 'Parent progress',
  'screens.parentReadings': 'Readings and AI analysis',
  'screens.parentLevels': 'Levels and tries',
  'screens.parentDecisions': 'AI decisions',
  'screens.parentPrivacy': 'Linked children and privacy',
} as const;

export type MessageKey = keyof typeof en;

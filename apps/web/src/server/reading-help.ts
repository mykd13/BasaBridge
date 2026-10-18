'use server';

import { ReadingHelp } from '@basabridge/contracts';
import { NotWiredError } from './errors';

/**
 * The signed-in learner's saved reading help.
 * Stub until BB-10 (authorization) and the learner tables land. Then this reads
 * through the authorization layer and getViewer() in i18n/viewer.ts uses it.
 */
export async function getMyReadingHelp(): Promise<ReadingHelp> {
  throw new NotWiredError('getMyReadingHelp needs BB-10 and the learner tables');
}

/** Save the learner's reading help. Checks the shape first, then waits for BB-10. */
export async function saveMyReadingHelp(input: unknown): Promise<void> {
  ReadingHelp.parse(input);
  throw new NotWiredError('saveMyReadingHelp needs BB-10 and the learner tables');
}

import type { WordOutcome } from '@basabridge/contracts';
import type { HeardWord } from './index';

/** A recorded reading: the passage, what the provider heard, and the outcomes a person agreed on. */
export interface AlignmentFixture {
  name: string;
  expected: string;
  heard: HeardWord[];
  outcomes: WordOutcome[];
}

/**
 * Recordings from the BB-22 bake-off go here, one entry each, with the provider's word list as
 * heard and the outcomes checked by a person against the audio. No audio is stored, only words.
 * `align.test.ts` runs every entry.
 */
export const recordedFixtures: AlignmentFixture[] = [];

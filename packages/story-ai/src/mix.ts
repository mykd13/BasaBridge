import type { ComprehensionSkill } from '@basabridge/contracts';
import { QUESTIONS_PER_STORY } from '@basabridge/levels';

const BASE: readonly ComprehensionSkill[] = ['vocabulary', 'literal', 'inferential'];

/**
 * The skill of each question, in order. One of each skill first, then the extra questions go to
 * the focus skill (chosen by mastery code, never by the model). With no focus, the extras go to
 * literal and inferential in turn.
 */
export function skillMix(
  focus: ComprehensionSkill | null,
  count: number = QUESTIONS_PER_STORY,
): ComprehensionSkill[] {
  const mix = BASE.slice(0, count);
  const extras: readonly ComprehensionSkill[] = focus ? [focus] : ['literal', 'inferential'];
  for (let i = 0; mix.length < count; i++) mix.push(extras[i % extras.length]!);
  return mix;
}

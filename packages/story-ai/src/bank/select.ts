import type { ComprehensionSkill } from '@basabridge/contracts';
import { logRecord, timedRun, toRecord } from './record';
import type { BankEntry, Clock, Logger, StoryBankStore, StoryError, StoryPipeline } from './types';

export interface SelectDeps {
  store: StoryBankStore;
  pipeline: StoryPipeline;
  clock: Clock;
  log: Logger;
  /** BB-15's pickTopic(recentTopics) drops in here. */
  pickTopic: (recent: string[]) => string;
}

export interface SelectInput {
  level: number;
  /** From the authorization layer, passed in by the caller. The bank never reads learner tables. */
  readStoryIds: readonly string[];
  /** Most recent first. */
  recentTopics: readonly string[];
  recentTitles: readonly string[];
  focus: ComprehensionSkill | null;
}

export type SelectOutcome =
  { ok: true; entry: BankEntry; source: 'bank' | 'generated' } | { ok: false; error: StoryError };

/** A stored story the learner has not read, or a live one when the bank has none. */
export async function selectStory(deps: SelectDeps, input: SelectInput): Promise<SelectOutcome> {
  const stored = await deps.store.findUnread({
    level: input.level,
    excludeIds: input.readStoryIds,
    avoidTopics: input.recentTopics,
  });
  if (stored) return { ok: true, entry: stored, source: 'bank' };

  const pipelineInput = {
    level: input.level,
    topic: deps.pickTopic([...input.recentTopics]),
    focus: input.focus,
    recentTitles: [...input.recentTitles],
  };
  const { outcome, latencyMs } = await timedRun(deps.pipeline, pipelineInput, deps.clock);
  logRecord(deps.log, toRecord(pipelineInput, outcome, latencyMs, 'live'));

  if (!outcome.ok) return { ok: false, error: outcome.error };
  const entry = await deps.store.save({
    level: pipelineInput.level,
    topic: pipelineInput.topic,
    story: outcome.story,
  });
  return { ok: true, entry, source: 'generated' };
}

/**
 * A new story at the same level once tries run out. It does not check tries: the caller decides
 * that with hasTriesLeft from @basabridge/levels.
 */
export async function nextStoryAfterTriesOut(
  deps: SelectDeps,
  input: SelectInput & { currentStoryId: string },
): Promise<SelectOutcome> {
  return selectStory(deps, {
    ...input,
    readStoryIds: [...input.readStoryIds, input.currentStoryId],
  });
}

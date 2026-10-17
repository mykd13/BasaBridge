/** Test helpers for the story bank. Only tests import this file. It is not exported from index.ts. */
import { Story } from '@basabridge/contracts';
import type {
  BankEntry,
  Clock,
  FindQuery,
  Logger,
  PipelineInput,
  PipelineOutcome,
  StoryBankStore,
  StoryPipeline,
} from './types';

/** A valid story. Parsed with the contracts schema so the fixture stays honest. */
export function storyFixture(level: number, title: string): Story {
  const q = (n: number) => ({
    skill: 'literal' as const,
    word: null,
    question: `Question ${n} about ${title}?`,
    options: ['One', 'Two', 'Three', 'Four'],
    answerIndex: 0,
    evidence: `Evidence sentence ${n} for ${title}.`,
  });
  return Story.parse({
    title,
    text: `Once upon a time there was ${title}. It was a quiet day.`,
    level,
    words: 12,
    readingGrade: 1.5,
    questions: [q(1), q(2), q(3), q(4)],
  });
}

export function memoryStore(seed: BankEntry[] = []): StoryBankStore & { entries: BankEntry[] } {
  const entries = [...seed];
  let next = seed.length;
  return {
    entries,
    async stockByTopic(level) {
      const counts = new Map<string, number>();
      for (const e of entries) {
        if (e.level === level) counts.set(e.topic, (counts.get(e.topic) ?? 0) + 1);
      }
      return counts;
    },
    async findUnread({ level, excludeIds, avoidTopics }: FindQuery) {
      const pool = entries
        .filter((e) => e.level === level && !excludeIds.includes(e.id))
        .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
      return pool.find((e) => !avoidTopics.includes(e.topic)) ?? pool[0] ?? null;
    },
    async save({ level, topic, story }) {
      next += 1;
      const entry: BankEntry = {
        id: `story-${next}`,
        level,
        topic,
        story,
        createdAt: new Date(next * 1000),
      };
      entries.push(entry);
      return entry;
    },
  };
}

export function fakePipeline(
  script: PipelineOutcome[] | ((input: PipelineInput) => PipelineOutcome),
): StoryPipeline & { calls: PipelineInput[] } {
  const calls: PipelineInput[] = [];
  let i = 0;
  const pipeline = async (input: PipelineInput) => {
    calls.push(input);
    if (typeof script === 'function') return script(input);
    const outcome = script[Math.min(i, script.length - 1)];
    i += 1;
    if (!outcome) throw new Error('fakePipeline has no scripted outcome');
    return outcome;
  };
  return Object.assign(pipeline, { calls });
}

/** Returns each step in turn, then repeats the last one. */
export function fixedClock(steps: number[]): Clock {
  let i = 0;
  return () => {
    const value = steps[Math.min(i, steps.length - 1)] ?? 0;
    i += 1;
    return value;
  };
}

export function captureLog(): {
  log: Logger;
  events: { event: string; data: Record<string, unknown> }[];
} {
  const events: { event: string; data: Record<string, unknown> }[] = [];
  return { log: (event, data) => events.push({ event, data }), events };
}

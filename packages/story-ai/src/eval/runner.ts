/**
 * Runs generation, checks and the verifier across levels, then the verifier over the labelled cases
 * (BB-21). The model calls come in through adapters, so the runner works the same for the gold
 * replay in part 1 and for real models in part 2.
 */
import { countWords, readingGrade } from '../index';
import type { GoldCase, GoldStory } from './gold/schema';
import {
  addCost,
  type CheckOutcome,
  type Cost,
  type EvalRun,
  type GeneratedSample,
  type LabelledSample,
  NO_COST,
  type VerifierResult,
} from './run';

export interface GenerateRequest {
  level: number;
  /** Which story this is for the level, from 0. */
  index: number;
}

export type GenerateResult =
  { ok: true; story: GoldStory; cost: Cost } | { ok: false; error: string; cost: Cost };

export type VerifyResult = VerifierResult & { cost: Cost };

export interface EvalAdapters {
  /** Recorded in the run, such as `gold-replay`. */
  name: string;
  storyModel: string | null;
  verifierModel: string | null;
  promptVersion: string | null;
  generate(request: GenerateRequest): Promise<GenerateResult>;
  check(story: GoldStory): CheckOutcome;
  verify(story: GoldStory): Promise<VerifyResult>;
}

export interface RunOptions {
  id: string;
  startedAt: Date;
  gitSha: string | null;
  levels: number[];
  perLevel: number;
  /** Gold and safety cases. Drafts are skipped unless includeDrafts is set. */
  cases: GoldCase[];
  includeDrafts: boolean;
  adapters: EvalAdapters;
}

// A thrown error can carry prompt or story text, so only a fixed sentence is kept.
async function safeGenerate(a: EvalAdapters, r: GenerateRequest): Promise<GenerateResult> {
  try {
    return await a.generate(r);
  } catch {
    return { ok: false, error: 'The generation call threw an error.', cost: NO_COST };
  }
}

async function safeVerify(a: EvalAdapters, story: GoldStory): Promise<VerifyResult> {
  try {
    return await a.verify(story);
  } catch {
    return {
      error: 'The verifier call threw an error.',
      disagreed: [],
      flaggedUnsafe: false,
      cost: NO_COST,
    };
  }
}

async function runGenerated(
  a: EvalAdapters,
  level: number,
  index: number,
): Promise<GeneratedSample> {
  const generated = await safeGenerate(a, { level, index });
  if (!generated.ok) {
    return {
      level,
      index,
      error: generated.error,
      title: null,
      text: null,
      words: null,
      readingGrade: null,
      questions: null,
      checks: null,
      verifier: null,
      cost: generated.cost,
    };
  }
  const { story } = generated;
  const checks = a.check(story);
  const verified = checks.passed ? await safeVerify(a, story) : null;
  return {
    level,
    index,
    error: null,
    title: story.title,
    text: story.text,
    words: countWords(story.text),
    readingGrade: readingGrade(story.text),
    questions: story.questions.length,
    checks,
    verifier: verified && {
      error: verified.error,
      disagreed: verified.disagreed,
      flaggedUnsafe: verified.flaggedUnsafe,
    },
    cost: verified ? addCost(generated.cost, verified.cost) : generated.cost,
  };
}

async function runLabelled(a: EvalAdapters, c: GoldCase): Promise<LabelledSample> {
  const verified = await safeVerify(a, c.story);
  return {
    caseId: c.id,
    set: c.unsafe ? 'safety' : 'gold',
    level: c.story.level,
    questions: c.story.questions.length,
    wrongKeys: c.wrongKeys,
    unsafe: c.unsafe,
    reviewed: c.reviewedBy !== null,
    checks: a.check(c.story),
    verifier: {
      error: verified.error,
      disagreed: verified.disagreed,
      flaggedUnsafe: verified.flaggedUnsafe,
    },
    cost: verified.cost,
  };
}

/** Calls run one at a time, to stay inside provider rate limits. */
export async function runEval(o: RunOptions): Promise<EvalRun> {
  const generated: GeneratedSample[] = [];
  for (const level of o.levels) {
    for (let index = 0; index < o.perLevel; index += 1) {
      generated.push(await runGenerated(o.adapters, level, index));
    }
  }
  const labelled: LabelledSample[] = [];
  for (const c of o.cases) {
    if (o.includeDrafts || c.reviewedBy !== null) labelled.push(await runLabelled(o.adapters, c));
  }
  return {
    id: o.id,
    startedAt: o.startedAt.toISOString(),
    gitSha: o.gitSha,
    adapters: o.adapters.name,
    storyModel: o.adapters.storyModel,
    verifierModel: o.adapters.verifierModel,
    promptVersion: o.adapters.promptVersion,
    includesDrafts: o.includeDrafts,
    generated,
    labelled,
  };
}

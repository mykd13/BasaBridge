/**
 * Runs generation, checks and the verifier across levels, then the verifier over the labelled cases
 * (BB-21). The model calls come in through adapters, so the runner works the same for the gold
 * replay in part 1 and for real models in part 2.
 */
import { countWords, readingGrade } from '../index';
import { GoldStory, type GoldCase } from './gold/schema';
import {
  addCost,
  type CheckOutcome,
  Cost,
  ErrorCode,
  type EvalRun,
  type GeneratedSample,
  type LabelledSample,
  UNPRICED,
  VerifierResult,
} from './run';

export interface GenerateRequest {
  level: number;
  /** Which story this is for the level, from 0. */
  index: number;
}

export type GenerateResult =
  { ok: true; story: GoldStory; cost: Cost } | { ok: false; error: ErrorCode; cost: Cost };

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

/** A cost that does not parse is stored as unknown, never as a made-up number. */
const parseCost = (raw: unknown): Cost => {
  const parsed = Cost.safeParse(raw);
  return parsed.success ? parsed.data : UNPRICED;
};

// A thrown error can carry prompt or story text, so only a fixed code is kept. A returned failure
// is parsed too: an adapter that returns free text in `error` is recorded as an invalid reply.
async function safeGenerate(a: EvalAdapters, r: GenerateRequest): Promise<GenerateResult> {
  let raw: GenerateResult;
  try {
    raw = await a.generate(r);
  } catch {
    return { ok: false, error: 'call_failed', cost: UNPRICED };
  }
  if (raw === null || typeof raw !== 'object') {
    return { ok: false, error: 'invalid_reply', cost: UNPRICED };
  }
  const cost = parseCost(raw.cost);
  if (raw.ok === true) return { ok: true, story: raw.story, cost };
  const code = ErrorCode.safeParse(raw.error);
  return { ok: false, error: code.success ? code.data : 'invalid_reply', cost };
}

const failedVerify = (error: ErrorCode): VerifyResult => ({
  error,
  disagreed: [],
  flaggedUnsafe: false,
  cost: UNPRICED,
});

async function safeVerify(a: EvalAdapters, story: GoldStory): Promise<VerifyResult> {
  try {
    const raw = await a.verify(story);
    // Parse at the boundary: a reply with free text in `error` or bad numbers is an invalid reply.
    const parsed = VerifierResult.safeParse(raw);
    const cost = parseCost(raw?.cost);
    return parsed.success ? { ...parsed.data, cost } : { ...failedVerify('invalid_reply'), cost };
  } catch {
    return failedVerify('call_failed');
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
  // The adapter's story is untrusted until it parses. It is checked and reported at the level that
  // was asked for, so a story that came back at another level cannot be judged by a different tier.
  const parsed = GoldStory.safeParse(generated.story);
  if (!parsed.success) {
    return {
      level,
      index,
      error: 'invalid_reply',
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
  const story: GoldStory = { ...parsed.data, level };
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

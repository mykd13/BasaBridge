/**
 * Evidence rules for the ability model (docs/PLAN.md section 6.1, ADR 0003).
 * Placeholders to tune with real learners. Keep every number here and nowhere else.
 */
import { deepFreeze } from './freeze';

export const EVIDENCE_RULE = deepFreeze({
  /** Chance of a correct answer from guessing alone, by question type. */
  guess: { multiple_choice: 0.25, choose_all: 0.1, order_events: 1 / 24 },
  /** How sharply a question separates stronger from weaker readers. */
  discrimination: 1.5,
  /** Evidence weights. 1 means a normal answer. */
  weight: { rushed: 0.3, supportedTry: 0.7 },
  /** Move up when very likely above this level's difficulty. */
  up: { probability: 0.85, margin: 0.25, minItems: 10, minPasses: 2, minWordsRight: 0.85 },
  /** Move down when very likely below it. */
  down: { probability: 0.85, margin: 0.5, minItems: 8 },
  /** Answers faster than this many ms, plus the per-word allowance, count as rushed. */
  rushed: { baseMs: 1200, perWordMs: 35 },
  /** Longest response time the server records. The browser reports the time, so it is capped. */
  maxResponseMs: 600_000,
  /** Difficulty offsets by sub-skill, added to the story level's difficulty. Calibrated later (BB-45). */
  subskillOffset: {
    word_in_context: 0,
    word_parts: 0.2,
    key_detail: -0.3,
    sequence: -0.1,
    main_idea: 0.1,
    cause_effect: 0.3,
    feelings: 0.2,
    prediction: 0.4,
    conclusion: 0.5,
  },
} as const);

/** Placement test rules (docs/PLAN.md section 6.2). Placeholders to tune. */
export const PLACEMENT_RULE = deepFreeze({
  minStories: 2,
  maxStories: 4,
  /** Stop once the ability estimate is this certain. */
  stopSd: 0.45,
  /** The next placement story is at most this many levels from the last one. */
  maxStep: 25,
  /** Start this many standard deviations below the estimate so the first stories feel doable. */
  conservative: 0.5,
  /** Words right below this share on placement tries flags low decoding. */
  lowDecoding: 0.85,
  retakeAfterDays: 30,
  /** Where to start the first placement story, by grade. */
  gradeStart: { 1: 10, 2: 20, 3: 30, 4: 42, 5: 55, 6: 68 } as Record<number, number>,
  defaultStart: 25,
} as const);

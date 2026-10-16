/**
 * Skill estimates, focus skill and level movement. Pure functions: no AI, no I/O.
 * The AI explains these results but never decides them (docs/PLAN.md section 1).
 * Seed implementation ported from the early prototype, owner: Jhade (BB-19).
 */
import type { ComprehensionSkill } from '@basabridge/contracts';
import { MAX_LEVEL, MIN_LEVEL, PASS_RULE } from '@basabridge/levels';

export const COMPREHENSION_SKILLS: readonly ComprehensionSkill[] = [
  'vocabulary',
  'literal',
  'inferential',
];

export interface AnsweredQuestion {
  skill: ComprehensionSkill;
  correct: boolean;
}

/** One finished story. Order the list oldest first. */
export interface StoryAnswers {
  questions: AnsweredQuestion[];
}

export type Confidence = 'none' | 'early' | 'building' | 'steady';

export interface SkillEstimate {
  correct: number;
  total: number;
  /** null until at least one question has been answered. */
  estimate: number | null;
  confidence: Confidence;
}

/** Newer stories count more: each later story shrinks earlier ones by this factor. */
const RECENCY_DECAY = 0.85;

export function confidenceFor(total: number): Confidence {
  if (total >= 10) return 'steady';
  if (total >= 4) return 'building';
  if (total > 0) return 'early';
  return 'none';
}

/**
 * Recency-weighted Beta(1,1) estimate per comprehension skill.
 * A single correct answer gives about 0.67, so early numbers stay modest.
 */
export function estimateSkills(stories: StoryAnswers[]): Record<ComprehensionSkill, SkillEstimate> {
  const acc = Object.fromEntries(
    COMPREHENSION_SKILLS.map((s) => [s, { c: 0, t: 0, wc: 0, wt: 0 }]),
  ) as Record<ComprehensionSkill, { c: number; t: number; wc: number; wt: number }>;

  const n = stories.length;
  stories.forEach((story, i) => {
    const w = Math.pow(RECENCY_DECAY, n - 1 - i);
    for (const q of story.questions) {
      const a = acc[q.skill];
      a.t += 1;
      a.wt += w;
      if (q.correct) {
        a.c += 1;
        a.wc += w;
      }
    }
  });

  return Object.fromEntries(
    COMPREHENSION_SKILLS.map((s) => {
      const a = acc[s];
      return [
        s,
        {
          correct: a.c,
          total: a.t,
          estimate: a.t ? (1 + a.wc) / (2 + a.wt) : null,
          confidence: confidenceFor(a.t),
        } satisfies SkillEstimate,
      ];
    }),
  ) as Record<ComprehensionSkill, SkillEstimate>;
}

/** Lowest measured estimate. Ties go to the skill with less evidence. null when nothing is measured. */
export function focusSkill(
  est: Record<ComprehensionSkill, SkillEstimate>,
): ComprehensionSkill | null {
  const measured = COMPREHENSION_SKILLS.filter((s) => est[s].total > 0);
  if (!measured.length) return null;
  measured.sort(
    (a, b) => (est[a].estimate ?? 1) - (est[b].estimate ?? 1) || est[a].total - est[b].total,
  );
  return measured[0] ?? null;
}

export interface LevelMove {
  level: number;
  passes: number;
  moved: 'up' | 'down' | 'none';
}

/**
 * Level movement after a finished story. A pass adds one; three passes move up and reset the count.
 * A very weak result moves down one level. Anything else stays.
 */
export function moveLevel(
  current: { level: number; passes: number },
  passed: boolean,
  veryWeak: boolean,
): LevelMove {
  if (veryWeak && current.level > MIN_LEVEL) {
    return { level: current.level - 1, passes: 0, moved: 'down' };
  }
  if (!passed) return { level: current.level, passes: current.passes, moved: 'none' };
  const passes = current.passes + 1;
  if (passes >= PASS_RULE.passesToLevelUp && current.level < MAX_LEVEL) {
    return { level: current.level + 1, passes: 0, moved: 'up' };
  }
  return { level: current.level, passes, moved: 'none' };
}

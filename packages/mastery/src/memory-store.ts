/**
 * In-memory MasteryStore for tests. Each transaction works on a copy and commits it only when
 * `fn` resolves, like a real database transaction. `failOn` makes one method throw.
 * Not exported from the package: screens never use it (golden rule 8).
 */
import type { ComprehensionSkill, Decision } from '@basabridge/contracts';
import type { AbilitySummary, Posterior } from './ability';
import type { AbilityScope, AbilityState } from './engine';
import { COMPREHENSION_SKILLS, type StoryAnswers } from './simple';
import type { MasteryStore, MasteryTx } from './store';

export interface MemoryState {
  learners: Record<string, { level: number; passes: number }>;
  ability: Record<
    string,
    Partial<Record<AbilityScope, { posterior: Posterior; summary: AbilitySummary }>>
  >;
  answerWeights: Record<string, { rushed: boolean; weight: number }>;
  /** Oldest first. */
  countedTries: { learnerId: string; sessionId: string; wordsRightShare: number }[];
  /** Oldest first. */
  history: { learnerId: string; sessionId: string; story: StoryAnswers }[];
  decisions: { learnerId: string; decision: Decision }[];
}

const empty = (): MemoryState => ({
  learners: {},
  ability: {},
  answerWeights: {},
  countedTries: [],
  history: [],
  decisions: [],
});

const clone = <T>(x: T): T => JSON.parse(JSON.stringify(x)) as T;

export function createMemoryStore(
  initial: Partial<MemoryState> = {},
  opts: { failOn?: keyof MasteryTx } = {},
): MasteryStore & { state: () => MemoryState } {
  let committed: MemoryState = clone({ ...empty(), ...initial });

  const makeTx = (draft: MemoryState): MasteryTx => {
    const guard = (m: keyof MasteryTx) => {
      if (opts.failOn === m) throw new Error(`failOn ${m}`);
    };
    return {
      async getLearner(id) {
        guard('getLearner');
        const l = draft.learners[id];
        if (!l) throw new Error('Unknown learner');
        return { ...l };
      },
      async getAbility(id) {
        guard('getAbility');
        const rows = draft.ability[id] ?? {};
        return Object.fromEntries(
          Object.entries(rows).map(([k, v]) => [k, v.posterior]),
        ) as Partial<AbilityState>;
      },
      async saveAbility(id, scope, posterior, summary) {
        guard('saveAbility');
        draft.ability[id] = { ...draft.ability[id], [scope]: { posterior, summary } };
      },
      async saveAnswerWeight(_learnerId, answerId, w) {
        guard('saveAnswerWeight');
        draft.answerWeights[answerId] = w;
      },
      async getRecentWordsRight(id, { excludeSessionId, limit }) {
        guard('getRecentWordsRight');
        return draft.countedTries
          .filter((t) => t.learnerId === id && t.sessionId !== excludeSessionId)
          .slice(-limit)
          .map((t) => t.wordsRightShare);
      },
      async getAnswerHistory(id, { excludeSessionId }) {
        guard('getAnswerHistory');
        return draft.history
          .filter((h) => h.learnerId === id && h.sessionId !== excludeSessionId)
          .map((h) => h.story);
      },
      async getLastFocus(id) {
        guard('getLastFocus');
        const to = draft.decisions
          .filter((d) => d.learnerId === id && d.decision.kind === 'plan')
          .map((d) => d.decision.evidence.to)
          .filter((t): t is ComprehensionSkill =>
            COMPREHENSION_SKILLS.includes(t as ComprehensionSkill),
          )
          .at(-1);
        return to ?? null;
      },
      async setLearnerLevel(id, s) {
        guard('setLearnerLevel');
        draft.learners[id] = { ...s };
      },
      async addDecision(id, decision) {
        guard('addDecision');
        draft.decisions.push({ learnerId: id, decision });
      },
    };
  };

  return {
    async transaction(fn) {
      const draft = clone(committed);
      const out = await fn(makeTx(draft));
      committed = draft;
      return out;
    },
    state: () => clone(committed),
  };
}

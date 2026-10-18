/**
 * Every path through one session, against the in-memory store (BB-36).
 * The same tests run against the Drizzle store once it lands with BB-10.
 */
import { Decision } from '@basabridge/contracts';
import { TIERS } from '@basabridge/levels';
import { toTryRecord, type HeardWord } from '@basabridge/speech';
import { beforeEach, describe, expect, it } from 'vitest';
import { SessionError } from './machine';
import { MemorySessionStore } from './memory-store';
import { beginAnswering, currentSession, startOrResume, submitAnswer, submitTry } from './service';
import type { StoredQuestion } from './store';

const PASSAGE = 'the cat sat on the mat and then it went to sleep'.split(' ');

function heard(words: string[]): HeardWord[] {
  return words.map((text, i) => ({ text, start: i * 0.5, end: i * 0.5 + 0.4, confidence: 0.95 }));
}

/** A try that reaches the end, with the first `wrong` words misread. */
function fullRead(wrong = 0) {
  return toTryRecord(PASSAGE, heard(PASSAGE.map((w, i) => (i < wrong ? 'dog' : w))));
}

/** A try that stops after `words` words. */
function stoppedAt(words: number) {
  return toTryRecord(PASSAGE, heard(PASSAGE.slice(0, words)));
}

const QUESTIONS: StoredQuestion[] = [
  { id: 'q1', key: { type: 'multiple_choice', options: 4, answerIndex: 1 } },
  { id: 'q2', key: { type: 'choose_all', options: 5, answerIndexes: [0, 2] } },
  { id: 'q3', key: { type: 'order_events', events: 3 } },
];

const unlimited = TIERS.find((t) => t.tries === null)!;
const threeTries = TIERS.find((t) => t.tries === 3)!;

let store: MemorySessionStore;
const LEARNER = 'learner-1';

function addStories(level: number, ids: string[]) {
  for (const id of ids) store.stories.push({ id, level, questions: QUESTIONS });
}

async function code(p: Promise<unknown>): Promise<string | undefined> {
  try {
    await p;
  } catch (e) {
    if (e instanceof SessionError) return e.code;
    throw e;
  }
  return undefined;
}

beforeEach(() => {
  store = new MemorySessionStore();
});

describe('starting', () => {
  it('opens a session with tries from the tier and a story at the learner level', async () => {
    store.learners.set(LEARNER, threeTries.from);
    addStories(threeTries.from, ['s1']);
    addStories(threeTries.from + 1, ['other-level']);
    const { session, resume, resumed } = await startOrResume(store, LEARNER);
    expect(resumed).toBe(false);
    expect(session.storyId).toBe('s1');
    expect(session.triesAllowed).toBe(3);
    expect(resume).toEqual({ step: 'reading', triesUsed: 0, triesLeft: 3, canAnswer: false });
  });

  it('refuses a user who is not a learner, and a learner with no story left', async () => {
    expect(await code(startOrResume(store, LEARNER))).toBe('no_learner');
    store.learners.set(LEARNER, 1);
    expect(await code(startOrResume(store, LEARNER))).toBe('no_story');
  });

  it('opens one session when two tabs start at once', async () => {
    store.learners.set(LEARNER, 1);
    addStories(1, ['s1', 's2']);
    const [a, b] = await Promise.all([
      startOrResume(store, LEARNER),
      startOrResume(store, LEARNER),
    ]);
    expect(a.session.id).toBe(b.session.id);
    expect(store.sessions.size).toBe(1);
  });
});

describe('reading and answering', () => {
  it('runs a full session at an unlimited level', async () => {
    store.learners.set(LEARNER, unlimited.from);
    addStories(unlimited.from, ['s1']);
    const { session } = await startOrResume(store, LEARNER);

    for (let i = 0; i < 8; i += 1) {
      const r = await submitTry(store, LEARNER, session.id, stoppedAt(4));
      expect(r.outcome).toBe('stopped_early');
      expect(r.resume).toMatchObject({ step: 'reading', triesLeft: null, canAnswer: false });
    }
    expect(await code(beginAnswering(store, LEARNER, session.id))).toBe('no_completed_try');

    const read = await submitTry(store, LEARNER, session.id, fullRead(1));
    expect(read.outcome).toBe('can_answer');
    const answering = await beginAnswering(store, LEARNER, session.id);
    expect(answering.session.status).toBe('answering');
    expect(answering.resume).toMatchObject({ step: 'answering', nextQuestionId: 'q1' });
    expect(await code(submitTry(store, LEARNER, session.id, fullRead()))).toBe('not_reading');

    const a1 = await submitAnswer(store, LEARNER, session.id, {
      questionId: 'q1',
      chosen: [1],
      responseMs: 4000,
      accommodations: ['question_read_aloud'],
    });
    expect(a1.correct).toBe(true);
    const a2 = await submitAnswer(store, LEARNER, session.id, {
      questionId: 'q2',
      chosen: [0],
      responseMs: 3000,
      accommodations: [],
    });
    expect(a2.correct).toBe(false);
    const a3 = await submitAnswer(store, LEARNER, session.id, {
      questionId: 'q3',
      chosen: [0, 1, 2],
      responseMs: 5000,
      accommodations: [],
    });
    expect(a3.correct).toBe(true);
    expect(a3.session.status).toBe('done');
    expect(a3.resume).toEqual({ step: 'done' });
    expect(store.answers.get(session.id)!.map((a) => [a.responseMs, a.accommodations])).toEqual([
      [4000, ['question_read_aloud']],
      [3000, []],
      [5000, []],
    ]);
  });

  it('counts the best try that reached the end when tries run out', async () => {
    store.learners.set(LEARNER, threeTries.from);
    addStories(threeTries.from, ['s1']);
    const { session } = await startOrResume(store, LEARNER);

    await submitTry(store, LEARNER, session.id, fullRead(3));
    await submitTry(store, LEARNER, session.id, fullRead(1));
    const last = await submitTry(store, LEARNER, session.id, stoppedAt(11));
    expect(last.outcome).toBe('answering');

    const best = store.tries.get(session.id)![1]!;
    expect(last.session.countedTryId).toBe(best.summary.id);
    expect(last.resume).toMatchObject({ step: 'answering', nextQuestionId: 'q1' });

    const logged = store.decisions.map((d) => Decision.parse(d.decision));
    expect(logged).toHaveLength(1);
    expect(logged[0]).toMatchObject({ kind: 'tries', evidence: { countedTryId: best.summary.id } });
  });

  it('ends without questions when tries run out and none reached the end', async () => {
    store.learners.set(LEARNER, threeTries.from);
    addStories(threeTries.from, ['s1', 's2']);
    const first = await startOrResume(store, LEARNER);
    for (let i = 0; i < 3; i += 1) await submitTry(store, LEARNER, first.session.id, stoppedAt(5));

    const done = await currentSession(store, LEARNER, first.session.id);
    expect(done.session).toMatchObject({ status: 'done', countedTryId: null, triesUsed: 3 });
    expect(store.decisions[0]!.decision).toMatchObject({
      kind: 'tries',
      evidence: { countedTryId: null },
    });

    const next = await startOrResume(store, LEARNER);
    expect(next.resumed).toBe(false);
    expect(next.session.storyId).not.toBe(first.session.storyId);
    expect(next.session.triesAllowed).toBe(3);
  });

  it('keeps tries used within tries allowed when the last two tries arrive at once', async () => {
    store.learners.set(LEARNER, threeTries.from);
    addStories(threeTries.from, ['s1']);
    const { session } = await startOrResume(store, LEARNER);
    await submitTry(store, LEARNER, session.id, stoppedAt(3));
    await submitTry(store, LEARNER, session.id, stoppedAt(3));

    const results = await Promise.allSettled([
      submitTry(store, LEARNER, session.id, fullRead()),
      submitTry(store, LEARNER, session.id, fullRead()),
    ]);
    expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
    const after = await currentSession(store, LEARNER, session.id);
    expect(after.session.triesUsed).toBe(3);
    expect(store.tries.get(session.id)).toHaveLength(3);
  });
});

describe('answers', () => {
  async function answering() {
    store.learners.set(LEARNER, 1);
    addStories(1, ['s1']);
    const { session } = await startOrResume(store, LEARNER);
    await submitTry(store, LEARNER, session.id, fullRead());
    await beginAnswering(store, LEARNER, session.id);
    return session.id;
  }

  it('are refused before answering starts', async () => {
    store.learners.set(LEARNER, 1);
    addStories(1, ['s1']);
    const { session } = await startOrResume(store, LEARNER);
    const answer = { questionId: 'q1', chosen: [1], responseMs: 1, accommodations: [] };
    expect(await code(submitAnswer(store, LEARNER, session.id, answer))).toBe('not_answering');
  });

  it('are scored once: a second answer to the same question is refused', async () => {
    const id = await answering();
    const answer = { questionId: 'q1', chosen: [0], responseMs: 2000, accommodations: [] };
    expect((await submitAnswer(store, LEARNER, id, answer)).correct).toBe(false);
    expect(await code(submitAnswer(store, LEARNER, id, { ...answer, chosen: [1] }))).toBe(
      'already_answered',
    );
    expect(store.answers.get(id)).toHaveLength(1);
  });

  it('refuse questions from another story and shapes no screen could send', async () => {
    const id = await answering();
    const base = { responseMs: 2000, accommodations: [] };
    expect(
      await code(submitAnswer(store, LEARNER, id, { ...base, questionId: 'qx', chosen: [1] })),
    ).toBe('bad_answer');
    expect(
      await code(submitAnswer(store, LEARNER, id, { ...base, questionId: 'q1', chosen: [9] })),
    ).toBe('bad_answer');
    expect(
      await code(
        submitAnswer(store, LEARNER, id, {
          questionId: 'q1',
          chosen: [1],
          responseMs: -1,
          accommodations: [],
        }),
      ),
    ).toBe('bad_answer');
    expect(store.answers.get(id)).toBeUndefined();
  });
});

describe('leaving and coming back', () => {
  it('resumes reading with the same story and tries after a dropped connection', async () => {
    store.learners.set(LEARNER, threeTries.from);
    addStories(threeTries.from, ['s1', 's2']);
    const first = await startOrResume(store, LEARNER);
    await submitTry(store, LEARNER, first.session.id, stoppedAt(6));

    const back = await startOrResume(store, LEARNER);
    expect(back.resumed).toBe(true);
    expect(back.session.id).toBe(first.session.id);
    expect(back.session.storyId).toBe(first.session.storyId);
    expect(back.resume).toEqual({ step: 'reading', triesUsed: 1, triesLeft: 2, canAnswer: false });
  });

  it('resumes at the next unanswered question after a refresh mid-questions', async () => {
    store.learners.set(LEARNER, 1);
    addStories(1, ['s1']);
    const { session } = await startOrResume(store, LEARNER);
    await submitTry(store, LEARNER, session.id, fullRead());
    await beginAnswering(store, LEARNER, session.id);
    await submitAnswer(store, LEARNER, session.id, {
      questionId: 'q1',
      chosen: [1],
      responseMs: 3000,
      accommodations: [],
    });

    const back = await startOrResume(store, LEARNER);
    expect(back.resumed).toBe(true);
    expect(back.resume).toEqual({ step: 'answering', nextQuestionId: 'q2', answered: 1, total: 3 });
  });

  it('does not hand out a new story while a session is abandoned half way', async () => {
    store.learners.set(LEARNER, 1);
    addStories(1, ['s1', 's2']);
    const first = await startOrResume(store, LEARNER, () => 0);
    for (let i = 0; i < 3; i += 1) {
      const again = await startOrResume(store, LEARNER, () => 0.99);
      expect(again.session.id).toBe(first.session.id);
    }
    expect(store.sessions.size).toBe(1);
  });

  it('gives the next story at the same level, and follows a level change', async () => {
    store.learners.set(LEARNER, 1);
    addStories(1, ['s1', 's2']);
    addStories(2, ['s3']);
    const first = await startOrResume(store, LEARNER, () => 0);
    await submitTry(store, LEARNER, first.session.id, fullRead());
    await beginAnswering(store, LEARNER, first.session.id);
    for (const [questionId, chosen] of [
      ['q1', [1]],
      ['q2', [0, 2]],
      ['q3', [0, 1, 2]],
    ] as const) {
      await submitAnswer(store, LEARNER, first.session.id, {
        questionId,
        chosen: [...chosen],
        responseMs: 3000,
        accommodations: [],
      });
    }
    const second = await startOrResume(store, LEARNER, () => 0);
    expect(second.session.storyId).toBe('s2');

    store.learners.set(LEARNER, 2);
    store.sessions.set(second.session.id, { ...second.session, status: 'done' });
    const third = await startOrResume(store, LEARNER);
    expect(third.session.storyId).toBe('s3');
  });
});

describe('ownership', () => {
  it('treats another learner session as not found', async () => {
    store.learners.set(LEARNER, 1);
    addStories(1, ['s1']);
    const { session } = await startOrResume(store, LEARNER);
    expect(await code(currentSession(store, 'someone-else', session.id))).toBe('not_found');
    expect(await code(submitTry(store, 'someone-else', session.id, fullRead()))).toBe('not_found');
    expect(store.tries.get(session.id)).toBeUndefined();
  });
});

describe('decision log', () => {
  it('carries counts and ids only', async () => {
    store.learners.set(LEARNER, TIERS.find((t) => t.tries === 1)!.from);
    addStories(TIERS.find((t) => t.tries === 1)!.from, ['s1']);
    const { session } = await startOrResume(store, LEARNER);
    await submitTry(store, LEARNER, session.id, fullRead());
    const { evidence } = store.decisions[0]!.decision;
    expect(Object.keys(evidence).sort()).toEqual([
      'completedTries',
      'countedTryId',
      'countedWordsRight',
      'countedWordsTotal',
      'sessionId',
      'triesAllowed',
      'triesUsed',
    ]);
    const text = JSON.stringify(store.decisions.map((d) => d.decision));
    expect(text).not.toContain(LEARNER);
    expect(text).not.toContain('cat');
  });
});

import { describe, expect, it } from 'vitest';
import { LEARN_RULES } from '@basabridge/learn';
import { testPort, walkWholeLesson } from './fixtures';

const L = 'learner-1';

describe('home', () => {
  it('lists reviewed lessons by skill with honest statuses', async () => {
    const { port, progress } = testPort();
    await progress.save(L, {
      lessonId: 'say-it-slowly',
      completedAt: new Date('2026-01-01'),
      recheckCorrect: 0,
      recheckTotal: 0,
    });
    const home = await port.home(L);
    expect(home.recommended.map((c) => c.lesson.id)).toEqual(['why-did-it-happen']);
    expect(home.recommended[0]?.status).toBe('new');
    const all = Object.fromEntries(
      home.bySkill.flatMap((g) => g.cards.map((c) => [c.lesson.id, c.status])),
    );
    expect(all).toEqual({ 'why-did-it-happen': 'new', 'say-it-slowly': 'waiting_for_story' });
  });

  it('says learned only after the check questions in a story went well', async () => {
    const { port, progress } = testPort();
    await progress.save(L, {
      lessonId: 'say-it-slowly',
      completedAt: new Date('2026-01-01'),
      recheckCorrect: 2,
      recheckTotal: 2,
    });
    const home = await port.home(L);
    expect(
      home.bySkill.flatMap((g) => g.cards).find((c) => c.lesson.id === 'say-it-slowly')?.status,
    ).toBe('learned');
    expect(home.recommended.map((c) => c.lesson.id)).not.toContain('say-it-slowly');
  });

  it('shows an opened but unfinished lesson as new', async () => {
    const { port } = testPort();
    await port.savePosition(L, 'why-did-it-happen', { step: 1, item: 0 });
    const home = await port.home(L);
    expect(home.recommended[0]?.status).toBe('new');
  });
});

describe('position', () => {
  it('restores the step the learner left on', async () => {
    const { port } = testPort();
    expect((await port.lesson(L, 'why-did-it-happen'))?.position).toEqual({ step: 0, item: 0 });
    await port.savePosition(L, 'why-did-it-happen', { step: 1, item: 0 });
    expect((await port.lesson(L, 'why-did-it-happen'))?.position).toEqual({ step: 1, item: 0 });
  });

  it('keeps places apart per learner and ignores steps that do not exist', async () => {
    const { port } = testPort();
    await port.savePosition(L, 'why-did-it-happen', { step: 99, item: 0 });
    await port.savePosition(L, 'why-did-it-happen', { step: 1.5, item: 0 });
    await port.savePosition(L, 'no-such-lesson', { step: 0, item: 0 });
    expect((await port.lesson(L, 'why-did-it-happen'))?.position.step).toBe(0);
    await port.savePosition('other', 'why-did-it-happen', { step: 1, item: 0 });
    expect((await port.lesson(L, 'why-did-it-happen'))?.position.step).toBe(0);
    expect((await port.lesson('other', 'why-did-it-happen'))?.position.step).toBe(1);
    expect(await port.lesson(L, 'no-such-lesson')).toBeNull();
  });
});

describe('position order', () => {
  it('rejects a step that skips ahead and a practice item that skips ahead', async () => {
    const { port } = testPort();
    await port.savePosition(L, 'why-did-it-happen', { step: 2, item: 0 });
    expect((await port.lesson(L, 'why-did-it-happen'))?.position.step).toBe(0);
    await port.savePosition(L, 'why-did-it-happen', { step: 1, item: 0 });
    await port.savePosition(L, 'why-did-it-happen', { step: 2, item: 0 });
    await port.savePosition(L, 'why-did-it-happen', { step: 2, item: 2 });
    expect((await port.lesson(L, 'why-did-it-happen'))?.position).toEqual({ step: 2, item: 0 });
  });

  it('rejects an item on a teaching step and an item past the last one', async () => {
    const { port } = testPort();
    await port.savePosition(L, 'why-did-it-happen', { step: 1, item: 1 });
    expect((await port.lesson(L, 'why-did-it-happen'))?.position.step).toBe(0);
    await walkWholeLesson(port, L, 'why-did-it-happen');
    await port.savePosition(L, 'why-did-it-happen', { step: 2, item: 3 });
    expect((await port.lesson(L, 'why-did-it-happen'))?.position).toEqual({ step: 2, item: 2 });
  });

  it('lets the learner go back', async () => {
    const { port } = testPort();
    await port.savePosition(L, 'why-did-it-happen', { step: 1, item: 0 });
    await port.savePosition(L, 'why-did-it-happen', { step: 0, item: 0 });
    expect((await port.lesson(L, 'why-did-it-happen'))?.position.step).toBe(0);
  });
});

describe('practice', () => {
  it('never sends the answer to the browser', async () => {
    const { port } = testPort();
    const [item] = await port.practiceItems('why-did-it-happen');
    expect(item).toBeDefined();
    expect(JSON.stringify(item)).not.toContain('answerIndex');
  });

  it('checks a choice on the server', async () => {
    const { port } = testPort();
    expect(await port.checkPractice({ itemId: 'item-1', index: 0 })).toEqual({
      correct: true,
      correctText: 'His alarm did not ring',
    });
    expect((await port.checkPractice({ itemId: 'item-1', index: 2 })).correct).toBe(false);
  });
});

describe('complete', () => {
  it('queues the recheck questions and clears the place after the whole walk', async () => {
    const { port, progress, positions, reach } = testPort({ now: () => new Date('2026-02-01') });
    await walkWholeLesson(port, L, 'why-did-it-happen');
    expect(await port.canFinish(L, 'why-did-it-happen')).toBe(true);
    const done = await port.complete(L, 'why-did-it-happen');
    expect(done).toEqual({ completed: true, recheckItems: LEARN_RULES.recheckItemsInNextStory });
    expect((await progress.list(L))[0]?.completedAt).toEqual(new Date('2026-02-01'));
    expect(await positions.get(L, 'why-did-it-happen')).toBeUndefined();
    expect(await reach.get(L, 'why-did-it-happen')).toBeUndefined();
  });

  it('does not finish a lesson that was never walked', async () => {
    const { port, progress } = testPort();
    expect(await port.canFinish(L, 'why-did-it-happen')).toBe(false);
    expect(await port.complete(L, 'why-did-it-happen')).toMatchObject({ completed: false });
    expect(await progress.list(L)).toEqual([]);
  });

  it('does not finish on a partial walk or one that skips ahead', async () => {
    const { port, progress } = testPort();
    await port.savePosition(L, 'why-did-it-happen', { step: 2, item: 0 });
    await port.savePosition(L, 'why-did-it-happen', { step: 2, item: 2 });
    expect(await port.complete(L, 'why-did-it-happen')).toMatchObject({ completed: false });
    await port.savePosition(L, 'why-did-it-happen', { step: 1, item: 0 });
    await port.savePosition(L, 'why-did-it-happen', { step: 2, item: 0 });
    await port.savePosition(L, 'why-did-it-happen', { step: 2, item: 1 });
    expect(await port.canFinish(L, 'why-did-it-happen')).toBe(false);
    expect(await port.complete(L, 'why-did-it-happen')).toMatchObject({ completed: false });
    expect((await progress.list(L)).every((r) => !r.completedAt)).toBe(true);
  });

  it("keeps one learner from finishing on another learner's walk", async () => {
    const { port } = testPort();
    await walkWholeLesson(port, L, 'why-did-it-happen');
    expect((await port.complete('other', 'why-did-it-happen')).completed).toBe(false);
  });

  it('ignores a repeat call so a refresh cannot reset a counted recheck', async () => {
    const { port, progress } = testPort();
    await walkWholeLesson(port, L, 'why-did-it-happen');
    await port.complete(L, 'why-did-it-happen');
    const [row] = await progress.list(L);
    await progress.save(L, { ...row!, recheckCorrect: 1, recheckTotal: 1 });
    expect(await port.canFinish(L, 'why-did-it-happen')).toBe(true);
    expect(await port.complete(L, 'why-did-it-happen')).toMatchObject({ completed: true });
    expect((await progress.list(L))[0]).toMatchObject({ recheckCorrect: 1, recheckTotal: 1 });
  });
});

describe('offers', () => {
  it('offers the small link at most once per quiz', async () => {
    const { port } = testPort();
    expect(await port.claimInlineOffer(L, 'quiz-1')).toEqual({
      offer: true,
      lessonId: 'why-did-it-happen',
    });
    expect(await port.claimInlineOffer(L, 'quiz-1')).toEqual({ offer: false });
    expect((await port.claimInlineOffer(L, 'quiz-2')).offer).toBe(true);
  });

  it('offers nothing in placement or when nothing was missed and passed', async () => {
    const placement = testPort({
      quiz: { wrongAnswers: 3, passed: false, duringPlacement: true, gaps: [], level: 5 },
    });
    expect((await placement.port.resultOffer(L, 's')).onResult).toBe(false);
    expect((await placement.port.claimInlineOffer(L, 's')).offer).toBe(false);
    const clean = testPort({
      quiz: { wrongAnswers: 0, passed: true, duringPlacement: false, gaps: [], level: 5 },
    });
    expect((await clean.port.resultOffer(L, 's')).onResult).toBe(false);
  });

  it('lists what Learn will teach on the result', async () => {
    const { port } = testPort();
    const offer = await port.resultOffer(L, 's');
    expect(offer.onResult).toBe(true);
    expect(offer.lessons.map((l) => [l.lesson.id, l.misses])).toEqual([['why-did-it-happen', 2]]);
  });
});

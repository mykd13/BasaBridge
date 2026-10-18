import { describe, expect, it } from 'vitest';
import { selectPracticeItems, withoutRepeats, type CachedPracticeItem } from './practice';

// Labelled sample items for tests only.
const item = (
  id: string,
  over: Partial<CachedPracticeItem<null>> = {},
): CachedPracticeItem<null> => ({
  id,
  lessonId: 'cause-effect-early',
  band: 'early',
  kind: 'practice',
  level: 10,
  passage: `Passage ${id}.`,
  question: `Question ${id}?`,
  retired: false,
  content: null,
  ...over,
});

describe('selectPracticeItems', () => {
  it('skips retired items and items written above the learner level', () => {
    const cached = [
      item('a', { retired: true }),
      item('b', { level: 15 }),
      item('c', { level: 8 }),
      item('d', { level: 12 }),
    ];
    const s = selectPracticeItems(cached, { level: 12, count: 3 });
    expect(s.items.map((i) => i.id)).toEqual(['d', 'c']);
    expect(s.missing).toBe(1);
  });

  it('takes the closest level first and stops at the count', () => {
    const cached = [item('a', { level: 3 }), item('b', { level: 11 }), item('c', { level: 7 })];
    const s = selectPracticeItems(cached, { level: 12, count: 2 });
    expect(s.items.map((i) => i.id)).toEqual(['b', 'c']);
    expect(s.missing).toBe(0);
  });

  it('never gives a check item that repeats a practice item', () => {
    const practice = [item('p1'), item('p2')];
    const checks = [
      item('c1', { kind: 'check', passage: 'passage P1.' }),
      item('c2', { kind: 'check', question: '  QUESTION p2?' }),
      item('c3', { kind: 'check' }),
    ];
    const s = selectPracticeItems(checks, { level: 12, count: 2, used: practice });
    expect(s.items.map((i) => i.id)).toEqual(['c3']);
    expect(s.missing).toBe(1);
  });
});

describe('withoutRepeats', () => {
  it('drops repeats inside the list too', () => {
    const list = [item('a'), item('b', { passage: 'Passage a.' }), item('c')];
    expect(withoutRepeats(list, []).map((i) => i.id)).toEqual(['a', 'c']);
  });
});

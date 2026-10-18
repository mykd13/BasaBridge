import { describe, expect, it } from 'vitest';
import { contentRates, type StoryContentCounts } from './content-rates';

const row = (over: Partial<StoryContentCounts> = {}): StoryContentCounts => ({
  level: 5,
  promptVersion: 'p1',
  model: 'gemini-a',
  served: 10,
  reported: 0,
  retired: false,
  ...over,
});

describe('contentRates', () => {
  it('adds up counts and computes rates per tier, in tier order', () => {
    const rates = contentRates(
      [
        row({ level: 40, served: 20, reported: 1 }),
        row({ level: 5, served: 10, reported: 2, retired: true }),
        row({ level: 8, served: 30, reported: 0 }),
      ],
      'tier',
    );
    expect(rates.map((r) => r.group)).toEqual(['1-10', '31-55']);
    expect(rates[0]).toEqual({
      group: '1-10',
      stories: 2,
      served: 40,
      reported: 2,
      retired: 1,
      reportRate: 0.05,
      retireRate: 0.5,
    });
    expect(rates[1]?.reportRate).toBe(0.05);
    expect(rates[1]?.retireRate).toBe(0);
  });

  it('groups by prompt version or model', () => {
    const rows = [
      row({ promptVersion: 'p2', model: 'gemini-b', reported: 1 }),
      row({ promptVersion: 'p1', reported: 3 }),
      row({ promptVersion: 'p2' }),
    ];
    expect(contentRates(rows, 'promptVersion').map((r) => [r.group, r.reported])).toEqual([
      ['p1', 3],
      ['p2', 1],
    ]);
    expect(contentRates(rows, 'model').map((r) => [r.group, r.stories])).toEqual([
      ['gemini-a', 2],
      ['gemini-b', 1],
    ]);
  });

  it('gives a null report rate, not NaN, when nothing was served', () => {
    const [r] = contentRates([row({ served: 0 })], 'tier');
    expect(r?.reportRate).toBeNull();
    expect(r?.retireRate).toBe(0);
  });

  it('returns nothing for no stories', () => {
    expect(contentRates([], 'model')).toEqual([]);
  });
});

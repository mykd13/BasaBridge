import { describe, expect, it } from 'vitest';
import { tierFor } from '@basabridge/levels';
import { readingGrade } from '../checks';
import { formatGradeReport, gradeReport, parseSample, type RatedPassage } from './grade-report';

// Small samples written for these tests only. The ratings are made up to exercise the maths.
const EASY = 'Lia has a cat. The cat is big. Lia likes the cat.';
const HARD =
  'The enormous, unpredictable thunderstorm approached the village, frightening every inhabitant considerably.';

const entry = (over: Partial<RatedPassage>): RatedPassage => ({
  id: 'x',
  text: EASY,
  level: 5,
  ratedGrade: 1,
  rater: 'test',
  ...over,
});

describe('gradeReport', () => {
  it('handles an empty sample', () => {
    const r = gradeReport([]);
    expect(r.count).toBe(0);
    expect(r.meanAbsoluteError).toBeNull();
    expect(r.correlation).toBeNull();
    expect(r.tiers.every((t) => t.rated === 0)).toBe(true);
    expect(formatGradeReport(r)).toContain('No hand-rated passages yet');
  });

  it('computes the mean absolute error', () => {
    const measured = readingGrade(EASY);
    const r = gradeReport([
      entry({ ratedGrade: measured + 1 }),
      entry({ ratedGrade: measured - 3 }),
    ]);
    expect(r.meanAbsoluteError).toBeCloseTo(2, 5);
  });

  it('computes the correlation, and null when there is no spread', () => {
    const perfect = gradeReport([
      entry({ text: EASY, ratedGrade: readingGrade(EASY) }),
      entry({ text: HARD, ratedGrade: readingGrade(HARD) }),
    ]);
    expect(perfect.correlation).toBeCloseTo(1, 5);
    const flat = gradeReport([entry({ ratedGrade: 2 }), entry({ ratedGrade: 3 })]);
    expect(flat.correlation).toBeNull();
    expect(gradeReport([entry({})]).correlation).toBeNull();
  });

  it('counts passages the cap would wrongly reject or accept, per tier', () => {
    const cap = tierFor(5).maxReadingGrade;
    expect(readingGrade(HARD)).toBeGreaterThan(cap);
    expect(readingGrade(EASY)).toBeLessThanOrEqual(cap);
    const r = gradeReport([
      entry({ id: 'a', text: HARD, ratedGrade: cap }), // rater says it fits, measure says too hard
      entry({ id: 'b', text: EASY, ratedGrade: cap + 3 }), // rater says too hard, measure says fine
      entry({ id: 'c', text: EASY, ratedGrade: 1 }), // agree
      entry({ id: 'd', text: HARD, ratedGrade: cap + 3 }), // agree
    ]);
    const tier = r.tiers.find((t) => t.from === 1);
    expect(tier).toMatchObject({ rated: 4, wronglyRejected: 1, wronglyAccepted: 1 });
    expect(r.tiers.filter((t) => t.rated > 0)).toHaveLength(1);
  });

  it('compares the vocabulary check with the rater and with the reading-grade cap', () => {
    const cap = tierFor(5).maxReadingGrade;
    // Short words, so the grade is fine, but three words a tier 1 learner does not know.
    const RARE = 'Sam saw a puce kite soar aloft.';
    expect(readingGrade(RARE)).toBeLessThanOrEqual(cap);
    const r = gradeReport([
      entry({ id: 'a', text: RARE, ratedGrade: cap + 2 }), // rater: too hard; only vocab rejects
      entry({ id: 'b', text: RARE, ratedGrade: 1 }), // rater: fits; vocab wrongly rejects
      entry({ id: 'c', text: EASY, ratedGrade: cap + 2 }), // rater: too hard; both accept
      entry({ id: 'd', text: EASY, ratedGrade: 1 }), // all agree
    ]);
    expect(r.tiers[0]).toMatchObject({
      rated: 4,
      wronglyRejected: 0,
      wronglyAccepted: 2,
      vocabWronglyRejected: 1,
      vocabWronglyAccepted: 1,
      disagree: 2,
      raterSidesWithGrade: 1,
      raterSidesWithVocab: 1,
    });
  });

  it('puts each passage in the tier of its level', () => {
    const r = gradeReport([entry({ level: 12 }), entry({ level: 100 })]);
    expect(r.tiers.map((t) => t.rated)).toEqual([0, 1, 0, 0, 0, 1]);
  });

  it('formats a table with one row per tier', () => {
    const text = formatGradeReport(gradeReport([entry({})]));
    expect(text).toContain('Hand-rated passages: 1');
    expect(text.split('\n').filter((l) => /^\d+-\d+ /.test(l))).toHaveLength(6);
  });
});

describe('parseSample', () => {
  it('accepts an empty array and well formed entries', () => {
    expect(parseSample([])).toEqual([]);
    expect(parseSample([entry({})])).toHaveLength(1);
  });

  it('rejects the wrong shape with a clear message', () => {
    expect(() => parseSample({})).toThrow('must be an array');
    expect(() => parseSample([{ ...entry({}), level: 'five' }])).toThrow('entry 0');
    expect(() => parseSample([entry({}), { ...entry({}), rater: '' }])).toThrow('entry 1');
  });
});

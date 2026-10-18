import { describe, expect, it } from 'vitest';
import { retellStem, retellWords, scoreRetell } from './retell';

const IDEAS = [
  { cues: [['mango', 'mangoes'], ['tree']] },
  { cues: [['wind'], ['fall', 'fell', 'drop']] },
  { cues: [['sour']] },
  { cues: [['patient', 'wait']] },
];

describe('retellStem', () => {
  it.each([
    ['mangoes', 'mango'],
    ['Trees', 'tree'],
    ['falling', 'fall'],
    ['falls', 'fall'],
    ['picked', 'picks'],
    ['running', 'run'],
    ['stopped', 'stop'],
    ['smiling', 'smiles'],
    ['cried', 'cries'],
    ['Lia’s', 'lia'],
    ['3', 'three'],
    ['boxes', 'box'],
  ])('%s and %s share a stem', (a, b) => {
    expect(retellStem(a)).toBe(retellStem(b));
  });

  it('keeps different words apart', () => {
    expect(retellStem('wind')).not.toBe(retellStem('window'));
    expect(retellStem('sour')).not.toBe(retellStem('soup'));
  });

  it('strips punctuation', () => {
    expect(retellStem('"patient,"')).toBe(retellStem('patient'));
    expect(retellStem('...')).toBe('');
  });
});

describe('scoreRetell', () => {
  it('covers an idea when every cue group matches', () => {
    const s = scoreRetell(retellWords('There was a mango tree and the wind made them drop'), IDEAS);
    expect(s.ideas.map((i) => i.covered)).toEqual([true, true, false, false]);
    expect(s.ideas[1]!.matched).toEqual(['wind', 'drop']);
    expect(s.covered).toBe(2);
    expect(s.coverage).toBe(0.5);
  });

  it('does not cover an idea when only some groups match', () => {
    const s = scoreRetell(retellWords('the mangoes were sour'), IDEAS);
    expect(s.ideas[0]).toEqual({ covered: false, matched: ['mango', null] });
    expect(s.ideas[2]!.covered).toBe(true);
  });

  it('matches word forms through the stem', () => {
    const s = scoreRetell(retellWords('Trees. Mango. Winds, falling. Waited!'), IDEAS);
    expect(s.covered).toBe(3);
  });

  it('gives zero for an empty retell or no ideas', () => {
    expect(scoreRetell([], IDEAS)).toMatchObject({ covered: 0, total: 4, coverage: 0 });
    expect(scoreRetell(['tree'], [])).toEqual({ ideas: [], covered: 0, total: 0, coverage: 0 });
  });

  it('never covers an idea with no cue groups', () => {
    expect(scoreRetell(['tree'], [{ cues: [] }]).covered).toBe(0);
  });

  it('is the same whatever the word order', () => {
    const a = scoreRetell(retellWords('wind fell sour'), IDEAS);
    const b = scoreRetell(retellWords('sour fell wind'), IDEAS);
    expect(a).toEqual(b);
  });
});

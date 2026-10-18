import { describe, expect, it } from 'vitest';
import { checkKeyIdeas, KEY_IDEA_RULES } from './keyideas';

const PASSAGE =
  'Lia and her grandfather have a mango tree. Every morning, Lia checks the tree. The mangoes are still green. One day, the wind blows hard. Three mangoes fall. Lia picks them up, but they are too sour. Grandfather smiles. "We must be patient," he says.';

const IDEAS = [
  { idea: 'Lia and her grandfather have a mango tree.', cues: [['mango', 'mangoes'], ['tree']] },
  { idea: 'The wind makes some mangoes fall.', cues: [['wind'], ['fall', 'fell', 'drop']] },
  { idea: 'The mangoes are sour.', cues: [['sour']] },
  { idea: 'They must be patient.', cues: [['patient', 'wait']] },
];

describe('checkKeyIdeas', () => {
  it('keeps valid ideas and lowercases cue words', () => {
    const r = checkKeyIdeas(PASSAGE, [...IDEAS, { idea: 'Wind', cues: [['WIND'], ['Blows']] }]);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.keyIdeas).toHaveLength(5);
    expect(r.keyIdeas[4]!.cues).toEqual([['wind'], ['blows']]);
    expect(r.dropped).toBe(0);
  });

  it('allows synonyms as long as one word in each group is in the passage', () => {
    const r = checkKeyIdeas(PASSAGE, IDEAS);
    expect(r.ok && r.keyIdeas[1]!.cues[1]).toEqual(['fall', 'fell', 'drop']);
  });

  it('drops an idea with a group that is not anchored in the passage', () => {
    const r = checkKeyIdeas(PASSAGE, [
      ...IDEAS,
      { idea: 'A dog barks.', cues: [['dog', 'puppy']] },
    ]);
    expect(r.ok && r.keyIdeas).toHaveLength(4);
    expect(r.ok && r.dropped).toBe(1);
  });

  it('drops malformed ideas', () => {
    const bad = [
      { idea: '', cues: [['tree']] },
      { idea: 'No cues', cues: [] },
      { idea: 'Phrase cue', cues: [['mango tree']] },
      { idea: 'Number cue', cues: [[3]] },
      { idea: 'Empty group', cues: [[]] },
      { idea: 'Too many groups', cues: [['lia'], ['tree'], ['wind'], ['sour'], ['green']] },
      { idea: 'Too many words', cues: [['sour', 'bitter', 'tart', 'sharp', 'acid']] },
      { idea: 'Cues not a list', cues: 'tree' },
    ];
    const r = checkKeyIdeas(PASSAGE, [...IDEAS, ...bad]);
    expect(r.ok && r.keyIdeas).toHaveLength(4);
    expect(r.ok && r.dropped).toBe(bad.length);
  });

  it('drops duplicates regardless of order', () => {
    const dup = { idea: 'Same again', cues: [['tree'], ['mangoes', 'mango']] };
    const r = checkKeyIdeas(PASSAGE, [...IDEAS, dup]);
    expect(r.ok && r.keyIdeas).toHaveLength(4);
  });

  it('fails with fewer than the minimum', () => {
    const r = checkKeyIdeas(PASSAGE, IDEAS.slice(0, KEY_IDEA_RULES.min - 1));
    expect(r).toEqual({ ok: false, reason: 'Only 2 valid key ideas; need at least 3.' });
  });

  it('keeps at most the maximum', () => {
    const many = [
      ...IDEAS,
      { idea: 'Lia checks the tree.', cues: [['checks'], ['morning']] },
      { idea: 'The mangoes are green.', cues: [['green']] },
      { idea: 'Grandfather smiles.', cues: [['smiles']] },
    ];
    const r = checkKeyIdeas(PASSAGE, many);
    expect(r.ok && r.keyIdeas).toHaveLength(KEY_IDEA_RULES.max);
    expect(r.ok && r.dropped).toBe(1);
  });

  it('matches curly apostrophes in the passage', () => {
    const text = 'Ana’s cat can’t find the ball. The cat looks under the bed.';
    const r = checkKeyIdeas(text, [
      { idea: 'a', cues: [["can't"]] },
      { idea: 'b', cues: [['cat']] },
      { idea: 'c', cues: [['bed']] },
    ]);
    expect(r.ok).toBe(true);
  });
});

import { describe, expect, it } from 'vitest';
import type { ComprehensionSkill } from '@basabridge/contracts';
import { tierFor } from '@basabridge/levels';
import { buildStoryPrompt, type StoryPromptInput } from './prompt';

const MIX: ComprehensionSkill[] = [
  'vocabulary',
  'literal',
  'inferential',
  'inferential',
  'inferential',
];

function input(level: number, over: Partial<StoryPromptInput> = {}): StoryPromptInput {
  return {
    level,
    tier: tierFor(level),
    topic: 'a mango tree at home',
    mix: MIX,
    ...over,
  };
}

describe('buildStoryPrompt', () => {
  it.each([5, 24, 45, 95])('states the tier range and grade cap at level %i', (level) => {
    const tier = tierFor(level);
    const { system, prompt } = buildStoryPrompt(input(level));
    expect(system).toContain(`between ${tier.words.min} and ${tier.words.max} words`);
    expect(system).toContain(`grade ${tier.maxReadingGrade} or lower`);
    expect(system).toContain(tier.description);
    expect(prompt).toContain(`level ${level}`);
  });

  it('lists one question per mix entry, in order', () => {
    const { system } = buildStoryPrompt(input(24));
    expect(system).toContain(`exactly ${MIX.length}`);
    const kinds = ['vocabulary', 'literal', 'inferential', 'inferential', 'inferential'];
    const order = kinds.map((k, i) => system.search(new RegExp(`^${i + 1}\\. an? ${k}`, 'm')));
    expect(order.every((p) => p >= 0)).toBe(true);
    expect([...order].sort((a, b) => a - b)).toEqual(order);
  });

  it('includes the topic and any retry feedback', () => {
    const { prompt } = buildStoryPrompt(input(24, { retryReason: 'The passage had 3 words.' }));
    expect(prompt).toContain('a mango tree at home');
    expect(prompt).toContain('The passage had 3 words.');
  });

  it('asks for evidence copied word for word and four distinct options', () => {
    const { system } = buildStoryPrompt(input(24));
    expect(system).toContain('copied word for word');
    expect(system).toContain('exactly four options');
  });

  // Golden rule 2: no names, usernames, emails or audio reach a model.
  it('never includes learner fields, even when a caller passes extra ones', () => {
    const dirty = {
      ...input(24),
      name: 'Maria Santos',
      username: 'maria123',
      email: 'maria@example.com',
      audio: 'UklGRiQAAABXQVZF',
    } as unknown as StoryPromptInput;
    const { system, prompt } = buildStoryPrompt(dirty);
    const all = `${system}\n${prompt}`;
    for (const secret of ['Maria', 'Santos', 'maria123', 'maria@example.com', 'UklGR']) {
      expect(all).not.toContain(secret);
    }
  });

  it('is built only from the allowed parts', () => {
    const { prompt } = buildStoryPrompt(input(24));
    expect(prompt.split('\n')).toEqual([
      'Write a story for reading level 24.',
      'Topic: a mango tree at home.',
    ]);
  });
});

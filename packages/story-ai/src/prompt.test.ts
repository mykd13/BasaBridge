import { DistractorType, SubSkill } from '@basabridge/contracts';
import { describe, expect, it } from 'vitest';
import { MAX_LEVEL, QUESTIONS_PER_STORY } from '@basabridge/levels';
import { buildStoryPrompt, type StoryPromptInput } from './prompt';

const input: StoryPromptInput = {
  level: 24,
  focus: 'inferential',
  recentTitles: ['The Mango Tree'],
  topicSeed: 'a rainy market day',
};

describe('buildStoryPrompt', () => {
  const prompt = buildStoryPrompt(input);

  it('lists all nine sub-skills and all six distractor types', () => {
    for (const s of SubSkill.options) expect(prompt).toContain(`- ${s} (skill:`);
    for (const d of DistractorType.options) expect(prompt).toContain(`- ${d}:`);
  });

  it('asks for tags on every question', () => {
    expect(prompt).toContain('"subskill": string');
    expect(prompt).toContain('"distractors"');
    expect(prompt).toContain('Use null for the correct option.');
  });

  it('uses the level tier from packages/levels', () => {
    expect(prompt).toContain('25 to 50 words');
    expect(prompt).toContain(`level 24 of ${MAX_LEVEL}`);
  });

  it('takes the question count from packages/levels', () => {
    expect(prompt).toContain(`write ${QUESTIONS_PER_STORY} multiple-choice questions`);
  });

  it('carries no learner data, even when the caller passes extra fields', () => {
    const leaky = {
      ...input,
      name: 'Maria Santos',
      username: 'maria_s',
      email: 'maria@example.com',
      learnerId: 'b3c1f9e2-0000-4000-8000-000000000001',
      audio: 'data:audio/webm;base64,AAAA',
    } as StoryPromptInput;
    const p = buildStoryPrompt(leaky);
    expect(p).toBe(prompt);
    for (const forbidden of ['Maria', 'maria_s', 'example.com', 'b3c1f9e2', 'base64']) {
      expect(p).not.toContain(forbidden);
    }
  });
});

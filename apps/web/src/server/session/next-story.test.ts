import { describe, expect, it } from 'vitest';
import { SessionError } from './machine';
import { chooseStory } from './next-story';

describe('chooseStory', () => {
  it('never picks a story the learner has read', () => {
    for (let i = 0; i < 20; i += 1) {
      expect(chooseStory(['a', 'b', 'c'], ['a', 'c'], () => i / 20)).toBe('b');
    }
  });

  it('stays inside the list for any random value', () => {
    expect(chooseStory(['a', 'b'], [], () => 0)).toBe('a');
    expect(chooseStory(['a', 'b'], [], () => 0.9999999)).toBe('b');
  });

  it('fails visibly when every story at the level has been read', () => {
    expect(() => chooseStory(['a'], ['a'])).toThrow(SessionError);
    expect(() => chooseStory([], [])).toThrow('no_story');
  });
});

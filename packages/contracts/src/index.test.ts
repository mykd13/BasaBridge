import { describe, expect, it } from 'vitest';
import {
  ChooseAllQuestion,
  OrderEventsQuestion,
  PlacementResult,
  QuestionTags,
  READING_HELP_PRESETS,
  ReadingHelp,
  SUBSKILL_PARENT,
  StoryAudio,
  SubSkill,
} from './index';

describe('sub-skills', () => {
  it('each roll up to one of the three measured skills', () => {
    for (const s of SubSkill.options) {
      expect(['vocabulary', 'literal', 'inferential']).toContain(SUBSKILL_PARENT[s]);
    }
  });

  it('cover all three measured skills', () => {
    const parents = new Set(Object.values(SUBSKILL_PARENT));
    expect(parents.size).toBe(3);
  });
});

describe('question tags', () => {
  it('needs one distractor entry per option, with null for the correct one', () => {
    expect(
      QuestionTags.safeParse({
        subskill: 'cause_effect',
        distractors: [null, 'wrong_detail', 'opposite', 'not_stated'],
      }).success,
    ).toBe(true);
    expect(
      QuestionTags.safeParse({ subskill: 'cause_effect', distractors: [null, 'opposite'] }).success,
    ).toBe(false);
  });
});

describe('harder question types', () => {
  it('accepts choose-all and order-events questions', () => {
    expect(
      ChooseAllQuestion.safeParse({
        type: 'choose_all',
        subskill: 'key_detail',
        question: 'Which things were in the garden?',
        options: ['a', 'b', 'c', 'd'],
        answerIndexes: [0, 2],
        evidence: 'There was a tree and a bench.',
      }).success,
    ).toBe(true);
    expect(
      OrderEventsQuestion.safeParse({
        type: 'order_events',
        subskill: 'sequence',
        question: 'Put these in order.',
        events: ['first', 'second', 'third'],
        evidence: 'First, then second, then third.',
      }).success,
    ).toBe(true);
  });

  it('needs at least three events to order', () => {
    expect(
      OrderEventsQuestion.safeParse({
        type: 'order_events',
        subskill: 'sequence',
        question: 'q',
        events: ['one', 'two'],
        evidence: 'e',
      }).success,
    ).toBe(false);
  });
});

describe('reading help', () => {
  it('has safe defaults', () => {
    const d = ReadingHelp.parse({});
    expect(d.audioInstructions).toBe(false);
    expect(d.language).toBe('en');
    expect(d.textSize).toBe('medium');
  });

  it('gives the more-help preset every support turned on', () => {
    const more = READING_HELP_PRESETS.more;
    expect(more.audioInstructions).toBe(true);
    expect(more.questionReadAloud).toBe(true);
    expect(more.readingRuler).toBe(true);
    expect(more.simpleWords).toBe(true);
    expect(more.textSize).toBe('large');
  });

  it('turns listen-then-read on by default and lets the learner turn it off', () => {
    expect(ReadingHelp.parse({}).listenThenRead).toBe(true);
    expect(ReadingHelp.parse({ listenThenRead: false }).listenThenRead).toBe(false);
  });
});

describe('story audio', () => {
  const ok = {
    url: 'https://cdn.example.com/stories/abc.mp3',
    durationSec: 3.2,
    words: [{ word: 'The', startSec: 0, endSec: 0.4 }],
  };

  it('accepts audio with word timestamps', () => {
    expect(StoryAudio.safeParse(ok).success).toBe(true);
  });

  it('rejects audio with no words or a bad address', () => {
    expect(StoryAudio.safeParse({ ...ok, words: [] }).success).toBe(false);
    expect(StoryAudio.safeParse({ ...ok, url: 'not a url' }).success).toBe(false);
  });
});

describe('placement result', () => {
  it('keeps level inside 1 to 100', () => {
    const base = {
      theta: 0,
      sd: 0.4,
      confidence: 'building',
      storiesRead: 3,
      flags: [],
      recommendedHelp: 'standard',
    };
    expect(PlacementResult.safeParse({ ...base, level: 34 }).success).toBe(true);
    expect(PlacementResult.safeParse({ ...base, level: 0 }).success).toBe(false);
    expect(PlacementResult.safeParse({ ...base, level: 101 }).success).toBe(false);
  });
});

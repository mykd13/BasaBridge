import { describe, expect, it } from 'vitest';
import type { StoryQuestion } from '@basabridge/contracts';
import { buildVerifierPrompt, SAFETY_CATEGORIES, toVerifierInput } from './prompt';

const PASSAGE = 'Mila had a red kite. The wind took it over the hill.';
const EVIDENCE = 'Zebra stripes appear in this distinctive evidence sentence only.';

const questions: StoryQuestion[] = [
  {
    skill: 'literal',
    word: null,
    question: 'What did Mila have?',
    options: ['A red kite', 'A blue ball', 'A green hat', 'A yellow box'],
    answerIndex: 3,
    evidence: EVIDENCE,
  },
  {
    skill: 'vocabulary',
    word: 'hill',
    question: 'What is a hill?',
    options: ['A low mountain', 'A river', 'A road', 'A tree'],
    answerIndex: 0,
    evidence: EVIDENCE,
  },
];

describe('buildVerifierPrompt', () => {
  const { system, prompt } = buildVerifierPrompt(toVerifierInput(PASSAGE, questions));
  const all = `${system}\n${prompt}`;

  it('sends the passage, questions and options', () => {
    expect(prompt).toContain(PASSAGE);
    expect(prompt).toContain('Question 1: What did Mila have?');
    expect(prompt).toContain('Question 2: What is a hill?');
    expect(prompt).toContain('  0. A red kite');
    expect(prompt).toContain('  3. A yellow box');
  });

  it('never sends the evidence sentence, the answer key or the vocabulary word field', () => {
    expect(all).not.toContain(EVIDENCE);
    expect(all).not.toContain('answerIndex":3');
    expect(all).not.toMatch(/evidence/i);
    expect(all).not.toMatch(/correct answer/i);
  });

  it('drops extra fields put on the input objects', () => {
    const dirty = {
      passage: PASSAGE,
      name: 'Juan Dela Cruz',
      questions: [
        {
          question: 'What did Mila have?',
          options: ['A', 'B', 'C', 'D'],
          answerIndex: 2,
          username: 'juan123',
          email: 'juan@example.com',
        },
      ],
    };
    const out = buildVerifierPrompt(dirty);
    const text = `${out.system}\n${out.prompt}`;
    for (const leak of ['Juan', 'juan123', 'juan@example.com', 'Dela Cruz']) {
      expect(text).not.toContain(leak);
    }
  });

  it('names all eight safety categories', () => {
    expect(SAFETY_CATEGORIES).toHaveLength(8);
    for (const c of SAFETY_CATEGORIES) expect(system).toContain(`- ${c}:`);
  });

  it('numbers questions from 1 and matches the question count', () => {
    expect(prompt.match(/^Question \d+:/gm)).toHaveLength(questions.length);
    expect(prompt).not.toContain('Question 0');
  });

  it('asks for JSON only', () => {
    expect(system).toContain('Reply with JSON only');
  });
});

describe('toVerifierInput', () => {
  it('copies only question and options', () => {
    const input = toVerifierInput(PASSAGE, questions);
    expect(input.questions[0]).toEqual({
      question: 'What did Mila have?',
      options: ['A red kite', 'A blue ball', 'A green hat', 'A yellow box'],
    });
    expect(Object.keys(input.questions[1]!).sort()).toEqual(['options', 'question']);
  });
});

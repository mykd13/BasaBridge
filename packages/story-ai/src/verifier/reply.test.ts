import { describe, expect, it } from 'vitest';
import { parseVerifierReply } from './reply';

const good = {
  answers: [
    { question: 1, answerIndex: 0 },
    { question: 2, answerIndex: 3 },
  ],
  safety: { safe: true, categories: [], reason: 'Fine.' },
};

describe('parseVerifierReply', () => {
  it('accepts a valid object', () => {
    const r = parseVerifierReply(good, 2);
    expect(r).toEqual({ ok: true, reply: good });
  });

  it('accepts a JSON string', () => {
    expect(parseVerifierReply(JSON.stringify(good), 2).ok).toBe(true);
  });

  it('rejects malformed JSON without quoting it', () => {
    const r = parseVerifierReply('{"answers": SECRET STORY TEXT', 2);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).not.toContain('SECRET');
  });

  it('rejects a reply with no safety block', () => {
    expect(parseVerifierReply({ answers: good.answers }, 2).ok).toBe(false);
  });

  it('rejects an answer index of 4', () => {
    expect(parseVerifierReply({ ...good, answers: [{ question: 1, answerIndex: 4 }] }, 2).ok).toBe(
      false,
    );
  });

  it('rejects duplicate question numbers', () => {
    const bad = {
      ...good,
      answers: [
        { question: 1, answerIndex: 0 },
        { question: 1, answerIndex: 1 },
      ],
    };
    expect(parseVerifierReply(bad, 2).ok).toBe(false);
  });

  it('rejects a question number above the count', () => {
    const bad = { ...good, answers: [{ question: 3, answerIndex: 0 }] };
    expect(parseVerifierReply(bad, 2).ok).toBe(false);
  });

  it('allows missing questions', () => {
    const r = parseVerifierReply({ ...good, answers: [{ question: 2, answerIndex: 1 }] }, 5);
    expect(r.ok).toBe(true);
  });

  it('treats safe with categories as unsafe', () => {
    const odd = { ...good, safety: { safe: true, categories: ['fear'], reason: 'Hmm.' } };
    const r = parseVerifierReply(odd, 2);
    expect(r.ok && r.reply.safety.safe).toBe(false);
  });

  it('never throws on odd input', () => {
    for (const v of [null, undefined, 42, [], '']) {
      expect(parseVerifierReply(v, 2).ok).toBe(false);
    }
  });
});

describe('parseVerifierReply hardening', () => {
  const base = { answers: [{ question: 1, answerIndex: 0 }] };

  it('removes duplicate categories', () => {
    const out = parseVerifierReply(
      { ...base, safety: { safe: false, categories: ['violence', 'violence'], reason: '' } },
      1,
    );
    expect(out.ok && out.reply.safety.categories).toEqual(['violence']);
  });

  it('turns an unknown category into an unsafe verdict, not an invalid reply', () => {
    const out = parseVerifierReply(
      { ...base, safety: { safe: false, categories: ['gore'], reason: '' } },
      1,
    );
    expect(out.ok && out.reply.safety.safe).toBe(false);
    const flipped = parseVerifierReply(
      { ...base, safety: { safe: true, categories: ['gore'], reason: '' } },
      1,
    );
    expect(flipped.ok && flipped.reply.safety.safe).toBe(false);
  });

  it('reads JSON inside a code fence', () => {
    const body = JSON.stringify({ ...base, safety: { safe: true, categories: [], reason: '' } });
    const out = parseVerifierReply('```json\n' + body + '\n```', 1);
    expect(out.ok).toBe(true);
  });
});

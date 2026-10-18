import { describe, expect, it } from 'vitest';
import { createLogger, memorySink } from './log';
import { REDACTED, isForbiddenKey, redact, scrubString } from './redact';

const FORBIDDEN_VALUES = [
  'Maria Santos',
  'maria_s',
  'maria@example.com',
  'hunter2',
  'The cat sat on the mat.',
  'B',
];

describe('redact', () => {
  it('removes names, usernames, emails, passwords, audio, story text and answers', () => {
    const out = redact({
      name: 'Maria Santos',
      username: 'maria_s',
      guardianEmail: 'maria@example.com',
      password: 'hunter2',
      audio: new Uint8Array([1, 2, 3]),
      text: 'The cat sat on the mat.',
      chosen: 'B',
      answers: [{ chosen: 1 }],
      transcript: 'the cat sat',
      level: 4,
      latencyMs: 120,
    }) as Record<string, unknown>;
    const line = JSON.stringify(out);
    for (const v of FORBIDDEN_VALUES) expect(line).not.toContain(v);
    expect(out.level).toBe(4);
    expect(out.latencyMs).toBe(120);
    expect(out.name).toBe(REDACTED);
  });

  it('removes forbidden keys inside nested objects and arrays', () => {
    const out = JSON.stringify(redact({ learner: { profile: [{ learnerName: 'Maria Santos' }] } }));
    expect(out).not.toContain('Maria');
  });

  it('scrubs emails and bearer tokens out of free text', () => {
    expect(scrubString('mail maria@example.com now')).toBe('mail [email] now');
    expect(scrubString('Authorization: Bearer abc.def')).not.toContain('abc.def');
  });

  it('keeps an error name and message but scrubs them', () => {
    const out = redact(new Error('no user maria@example.com')) as Record<string, string>;
    expect(out.name).toBe('Error');
    expect(out.message).toBe('no user [email]');
  });

  it('caps long strings, long arrays and deep objects', () => {
    expect((redact('x'.repeat(2000)) as string).length).toBeLessThan(600);
    expect((redact(Array.from({ length: 100 }, (_, i) => i)) as unknown[]).length).toBe(20);
    const deep = { a: { b: { c: { d: { e: { f: 1 } } } } } };
    expect(JSON.stringify(redact(deep))).toContain('[deep]');
  });

  it('does not treat ordinary fields as forbidden', () => {
    for (const k of ['model', 'kind', 'outcome', 'costUsd', 'learnerUserId', 'storyId', 'route'])
      expect(isForbiddenKey(k)).toBe(false);
  });
});

describe('createLogger', () => {
  it('writes one JSON line with level, service, event and redacted fields', () => {
    const sink = memorySink();
    const log = createLogger({
      service: 'test',
      sink,
      now: () => new Date('2026-10-18T00:00:00Z'),
    });
    log.info('ai.call', { kind: 'story', username: 'maria_s' });
    expect(sink.lines).toHaveLength(1);
    const parsed = JSON.parse(sink.lines[0]!.line);
    expect(parsed).toMatchObject({
      at: '2026-10-18T00:00:00.000Z',
      level: 'info',
      service: 'test',
      event: 'ai.call',
      kind: 'story',
      username: REDACTED,
    });
  });

  it('child loggers add their fields and still redact them', () => {
    const sink = memorySink();
    const log = createLogger({ service: 'test', sink }).child({ route: '/x', email: 'a@b.co' });
    log.error('request.error');
    const parsed = JSON.parse(sink.lines[0]!.line);
    expect(parsed.route).toBe('/x');
    expect(parsed.email).toBe(REDACTED);
    expect(sink.lines[0]!.level).toBe('error');
  });

  it('fields cannot overwrite the level or event', () => {
    const sink = memorySink();
    createLogger({ service: 'test', sink }).info('real', { level: 'alert', event: 'fake' });
    const parsed = JSON.parse(sink.lines[0]!.line);
    expect(parsed.level).toBe('info');
    expect(parsed.event).toBe('real');
  });

  it('a failing sink never throws into the caller', () => {
    const log = createLogger({
      service: 'test',
      sink: () => {
        throw new Error('disk full');
      },
    });
    expect(() => log.info('x')).not.toThrow();
  });
});

import { solveChallenge, type Challenge } from 'altcha-lib';
import { deriveKey } from 'altcha-lib/algorithms/pbkdf2';
import { describe, expect, it } from 'vitest';
import { BOT_CHECK_CODES, createBotCheck, memoryUsedChallenges } from './bot-check';

const hmacKey = 'k'.repeat(40);
// Tiny work so the tests run fast. Real defaults are in BOT_CHECK_DEFAULTS.
const easy = { hmacKey, cost: 10, counterMin: 2, counterMax: 20 };
const failed = { ok: false, code: BOT_CHECK_CODES.failed };

async function solve(challenge: Challenge): Promise<string> {
  const solution = await solveChallenge({ challenge, deriveKey });
  if (!solution) throw new Error('not solved');
  // The widget sends the challenge and solution together, as base64 JSON.
  return Buffer.from(JSON.stringify({ challenge, solution })).toString('base64');
}

describe('bot check', () => {
  it('refuses a key that is too short', () => {
    expect(() => createBotCheck({ hmacKey: 'short' })).toThrow(/ALTCHA_HMAC_KEY/);
  });

  it('passes a solved challenge once', async () => {
    const check = createBotCheck(easy);
    const payload = await solve(await check.challenge());
    expect(await check.verify(payload)).toEqual({ ok: true });
    expect(await check.verify(payload)).toEqual(failed);
  });

  it('accepts plain JSON as well as base64', async () => {
    const check = createBotCheck(easy);
    const payload = Buffer.from(await solve(await check.challenge()), 'base64').toString();
    expect(await check.verify(payload)).toEqual({ ok: true });
  });

  it('refuses a missing, malformed or wrong solution', async () => {
    const check = createBotCheck(easy);
    for (const bad of [undefined, '', 42, 'not base64 json', '{"challenge":{}}']) {
      expect(await check.verify(bad)).toEqual(failed);
    }
    const decoded = JSON.parse(
      Buffer.from(await solve(await check.challenge()), 'base64').toString(),
    );
    decoded.solution.derivedKey = '00'.repeat(32);
    expect(await check.verify(JSON.stringify(decoded))).toEqual(failed);
  });

  it('refuses a challenge the browser changed', async () => {
    const check = createBotCheck(easy);
    const decoded = JSON.parse(
      Buffer.from(await solve(await check.challenge()), 'base64').toString(),
    );
    decoded.challenge.parameters.cost = 1;
    expect(await check.verify(JSON.stringify(decoded))).toEqual(failed);
  });

  it('refuses a challenge signed with another key', async () => {
    const other = createBotCheck({ ...easy, hmacKey: 'o'.repeat(40) });
    const check = createBotCheck(easy);
    expect(await check.verify(await solve(await other.challenge()))).toEqual(failed);
  });

  it('refuses an expired challenge', async () => {
    const hourAgo = () => new Date(Date.now() - 3600_000);
    const check = createBotCheck({ ...easy, now: hourAgo });
    expect(await check.verify(await solve(await check.challenge()))).toEqual(failed);
  });

  it('never returns anything but the code', async () => {
    const check = createBotCheck(easy);
    expect(Object.keys(await check.verify('garbage')).sort()).toEqual(['code', 'ok']);
  });
});

describe('memoryUsedChallenges', () => {
  it('claims an id once until it expires', async () => {
    const used = memoryUsedChallenges();
    const later = new Date(Date.now() + 60_000);
    expect(await used.claim('a', later)).toBe(true);
    expect(await used.claim('a', later)).toBe(false);
    expect(await used.claim('b', new Date(Date.now() - 1))).toBe(true);
    expect(await used.claim('b', later)).toBe(true);
  });

  it('stays within its size cap', async () => {
    const used = memoryUsedChallenges(2);
    const later = new Date(Date.now() + 60_000);
    for (const id of ['a', 'b', 'c']) expect(await used.claim(id, later)).toBe(true);
    expect(await used.claim('a', later)).toBe(true);
  });
});

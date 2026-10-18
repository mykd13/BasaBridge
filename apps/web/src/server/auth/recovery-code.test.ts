import { describe, expect, it } from 'vitest';
import {
  RECOVERY_ALPHABET,
  RECOVERY_CODE_LENGTH,
  formatCode,
  generateCode,
  hashCode,
  normalizeCode,
  verifyCode,
} from './recovery-code';

describe('generateCode', () => {
  it('uses only the safe alphabet at the right length', () => {
    for (let i = 0; i < 200; i++) {
      const code = generateCode();
      expect(code).toHaveLength(RECOVERY_CODE_LENGTH);
      for (const ch of code) expect(RECOVERY_ALPHABET).toContain(ch);
    }
  });

  it('leaves out characters a child could mix up', () => {
    for (const ch of '01OILUV') expect(RECOVERY_ALPHABET).not.toContain(ch);
  });

  it('carries at least 75 bits', () => {
    expect(RECOVERY_CODE_LENGTH * Math.log2(RECOVERY_ALPHABET.length)).toBeGreaterThan(75);
  });

  it('does not repeat', () => {
    const codes = new Set(Array.from({ length: 1000 }, generateCode));
    expect(codes.size).toBe(1000);
  });
});

describe('formatCode and normalizeCode', () => {
  it('shows four groups of four', () => {
    expect(formatCode('ABCDEFGHJKMNPQRS')).toBe('ABCD-EFGH-JKMN-PQRS');
  });

  it('round trips through display form', () => {
    const code = generateCode();
    expect(normalizeCode(formatCode(code))).toBe(code);
  });

  it('ignores case, spaces and dashes', () => {
    expect(normalizeCode(' abcd efgh-jkmn - pqrs ')).toBe('ABCDEFGHJKMNPQRS');
  });

  it('refuses the wrong length or characters outside the alphabet', () => {
    expect(normalizeCode('ABCD-EFGH-JKMN')).toBeNull();
    expect(normalizeCode('ABCD-EFGH-JKMN-PQRST')).toBeNull();
    expect(normalizeCode('ABCD-EFGH-JKMN-PQR0')).toBeNull();
    expect(normalizeCode('')).toBeNull();
  });
});

describe('hashCode and verifyCode', () => {
  it('stores a salted hash that never contains the code', async () => {
    const code = generateCode();
    const a = await hashCode(code);
    const b = await hashCode(code);
    expect(a).not.toContain(code);
    expect(a).not.toBe(b);
    expect(a.startsWith('scrypt$')).toBe(true);
  });

  it('accepts the right code in any typed form', async () => {
    const code = generateCode();
    const stored = await hashCode(code);
    expect(await verifyCode(code, stored)).toBe(true);
    expect(await verifyCode(formatCode(code).toLowerCase(), stored)).toBe(true);
  });

  it('refuses a wrong code', async () => {
    const stored = await hashCode(generateCode());
    expect(await verifyCode(generateCode(), stored)).toBe(false);
    expect(await verifyCode('not a code', stored)).toBe(false);
  });

  it('refuses a malformed or tampered hash without throwing', async () => {
    const code = generateCode();
    const stored = await hashCode(code);
    expect(await verifyCode(code, '')).toBe(false);
    expect(await verifyCode(code, stored.replace('scrypt$', 'bcrypt$'))).toBe(false);
    expect(await verifyCode(code, stored.replace('$32768$', '$1048576$'))).toBe(false);
    expect(await verifyCode(code, stored.slice(0, -4))).toBe(false);
  });
});

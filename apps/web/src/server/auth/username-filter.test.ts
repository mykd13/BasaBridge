import { describe, expect, it } from 'vitest';
import { USERNAME_CODES, checkUsername } from './username-filter';
import { OFFENSIVE_ANYWHERE, OFFENSIVE_WHOLE } from './username-words';

const codeOf = (name: string) => {
  const result = checkUsername(name);
  return result.ok ? null : result.code;
};

describe('checkUsername', () => {
  it('accepts made-up names', () => {
    for (const name of [
      'bookworm7',
      'StarReader',
      'mangoRain22',
      'Boboy',
      'booboo',
      'classhero',
      'grapejuice',
      'taekwondoKid',
      'lecheflan',
      'princess2014',
      'skillful',
      'reputation',
      'jonathan',
      'santos',
    ]) {
      expect(codeOf(name), name).toBeNull();
    }
  });

  it('allows letters and numbers only', () => {
    for (const name of ['star reader', 'star_reader', 'a.b', 'kid@mail.com', 'ñino', '']) {
      expect(codeOf(name), name).toBe(USERNAME_CODES.chars);
    }
  });

  it('refuses phone numbers', () => {
    for (const name of ['09171234567', 'kid639171234567', 'call1234567', '0917a123b4567']) {
      expect(codeOf(name), name).toBe(USERNAME_CODES.phone);
    }
    expect(codeOf('jay2010x2011')).toBeNull();
  });

  it('refuses every listed offensive word, alone and inside a name', () => {
    for (const word of OFFENSIVE_ANYWHERE) {
      expect(codeOf(word), word).toBe(USERNAME_CODES.offensive);
      expect(codeOf(`super${word}99`), word).toBe(USERNAME_CODES.offensive);
    }
    for (const word of OFFENSIVE_WHOLE) {
      expect(codeOf(word), word).toBe(USERNAME_CODES.offensive);
      expect(codeOf(`${word}12`), word).toBe(USERNAME_CODES.offensive);
    }
  });

  it('sees through capitals, look-alike digits and stretched letters', () => {
    for (const name of ['FUCK', 'b1tch', 'sh1t', 'fuuuuck', 'g4g0', 'Pu7angina', 'a55', 'b0b0']) {
      expect(codeOf(name), name).toBe(USERNAME_CODES.offensive);
    }
  });

  it('refuses school names and school abbreviations at the end', () => {
    for (const name of ['rizalschool', 'BagongSilangElementary', 'mnlHighSchool', 'rizalnhs']) {
      expect(codeOf(name), name).toBe(USERNAME_CODES.school);
    }
    expect(codeOf('nhsfan')).toBeNull();
  });

  it('refuses a first name next to a surname, in either order', () => {
    for (const name of [
      'juandelacruz',
      'JuanDelaCruz',
      'juan2010delacruz',
      'juanpdelacruz',
      'delacruzjuan',
      'mariasantos',
      'kevinlim',
    ]) {
      expect(codeOf(name), name).toBe(USERNAME_CODES.fullName);
    }
  });

  it('never repeats the name it refused', () => {
    for (const name of ['putangina', 'juandelacruz', '09171234567', 'rizalschool', 'b1tch']) {
      const result = checkUsername(name);
      expect(result.ok).toBe(false);
      expect(JSON.stringify(result).toLowerCase()).not.toContain(name.toLowerCase());
      expect(Object.keys(result).sort()).toEqual(['code', 'ok']);
    }
  });
});

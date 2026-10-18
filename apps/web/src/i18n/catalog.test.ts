import { parse, TYPE, type MessageFormatElement } from '@formatjs/icu-messageformat-parser';
import { describe, expect, it } from 'vitest';
import { en } from './catalog/en.ts';
import { fil } from './catalog/fil.ts';
import { entries } from './messages.ts';
import { WORDINGS } from './types.ts';

/** Argument names and kinds used by a message, for example "count:plural". */
function placeholders(message: string): string[] {
  const found = new Set<string>();
  const walk = (elements: MessageFormatElement[]) => {
    for (const el of elements) {
      if (el.type === TYPE.literal || el.type === TYPE.pound) continue;
      if (el.type === TYPE.tag) {
        found.add(`${el.value}:tag`);
        walk(el.children);
        continue;
      }
      found.add(`${el.value}:${TYPE[el.type]}`);
      if (el.type === TYPE.plural || el.type === TYPE.select) {
        for (const option of Object.values(el.options)) walk(option.value);
      }
    }
  };
  walk(parse(message));
  return [...found].sort();
}

const english = entries(en);
const filipino = entries(fil);
const wordCount = (text: string) => text.trim().split(/\s+/).length;

describe('catalog', () => {
  it('has the same keys in English and Filipino', () => {
    expect(filipino.map((e) => e.key)).toEqual(english.map((e) => e.key));
  });

  it('has the same placeholders in every language and wording', () => {
    for (const [index, { key, entry }] of english.entries()) {
      const other = filipino[index]!.entry;
      const variants = [entry, other].flatMap((e) =>
        WORDINGS.map((w) => ({ w, text: w === 'simple' ? (e.simple ?? e.standard) : e.standard })),
      );
      const expected = placeholders(entry.standard);
      for (const v of variants) {
        expect(placeholders(v.text), `${key} (${v.w}: ${v.text})`).toEqual(expected);
      }
    }
  });

  it('keeps spoken, lowLevel and simple flags the same in both languages', () => {
    for (const [index, { key, entry }] of english.entries()) {
      const other = filipino[index]!.entry;
      expect(Boolean(other.spoken), `${key} spoken`).toBe(Boolean(entry.spoken));
      expect(Boolean(other.lowLevel), `${key} lowLevel`).toBe(Boolean(entry.lowLevel));
      expect(other.simple !== undefined, `${key} has simple`).toBe(entry.simple !== undefined);
    }
  });

  it('keeps low level simple wording to 8 words or fewer', () => {
    for (const { key, entry } of [...english, ...filipino]) {
      if (!entry.lowLevel) continue;
      const text = entry.simple ?? entry.standard;
      expect(wordCount(text), `${key}: ${text}`).toBeLessThanOrEqual(8);
    }
  });

  it('uses no em or en dashes', () => {
    for (const { key, entry } of [...english, ...filipino]) {
      for (const text of [entry.standard, entry.simple ?? '']) {
        expect(text, key).not.toMatch(/[–—]/);
      }
    }
  });

  it('does not use "standard" as a branch name', () => {
    for (const { key } of [...english, ...filipino]) {
      expect(key.split('.').slice(0, -1)).not.toContain('standard');
    }
  });

  it('marks every Filipino key reviewed or not', () => {
    for (const { key, entry } of filipino) {
      expect(typeof entry.reviewed, `${key} needs reviewed: true or false`).toBe('boolean');
    }
  });
});

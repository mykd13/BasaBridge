import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { TIERS } from './index';

const readme = readFileSync(new URL('../README.md', import.meta.url), 'utf8');

/** Table rows whose first cell is a level range like "1 to 10". Header and divider rows are skipped. */
const rows = readme
  .split(/\r?\n/)
  .filter((line) => line.startsWith('|'))
  .map((line) =>
    line
      .split('|')
      .slice(1, -1)
      .map((cell) => cell.trim()),
  )
  .filter((cells) => /^\d+ to \d+$/.test(cells[0] ?? ''));

function range(cell: string | undefined) {
  const [a, b] = (cell ?? '').split(' to ').map(Number);
  return { a, b };
}

describe('README tier table', () => {
  it('has one row for each tier', () => {
    expect(rows).toHaveLength(TIERS.length);
  });

  it('matches the numbers in TIERS', () => {
    rows.forEach((cells, i) => {
      const tier = TIERS[i]!;
      const levels = range(cells[0]);
      const words = range(cells[1]);
      expect(levels, `levels, row ${i + 1}`).toEqual({ a: tier.from, b: tier.to });
      expect(words, `words, row ${i + 1}`).toEqual({ a: tier.words.min, b: tier.words.max });
      expect(Number(cells[2]), `grade, row ${i + 1}`).toBe(tier.maxReadingGrade);
      expect(cells[3] === 'unlimited' ? null : Number(cells[3]), `tries, row ${i + 1}`).toBe(
        tier.tries,
      );
      expect(cells[4], `description, row ${i + 1}`).toBe(tier.description);
    });
  });
});

import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { EVIDENCE_RULE, LISTEN_THEN_READ, PASS_RULE, PLACEMENT_RULE, TIERS } from './index';

const readme = readFileSync(new URL('../README.md', import.meta.url), 'utf8');

const tableRows = readme
  .split(/\r?\n/)
  .filter((line) => line.startsWith('|'))
  .map((line) =>
    line
      .split('|')
      .slice(1, -1)
      .map((cell) => cell.trim()),
  );

/** Tier table rows: the first cell is a level range like "1 to 10". Header and divider rows are skipped. */
const rows = tableRows.filter((cells) => /^\d+ to \d+$/.test(cells[0] ?? ''));

const RULES: Record<string, unknown> = {
  PASS_RULE,
  EVIDENCE_RULE,
  PLACEMENT_RULE,
  LISTEN_THEN_READ,
};

/** Every number in the rule objects, keyed by its path, such as `EVIDENCE_RULE.up.minItems`. */
function leaves(value: unknown, path: string, out: Map<string, number>) {
  if (typeof value === 'number') out.set(path, value);
  else if (value !== null && typeof value === 'object') {
    for (const [key, inner] of Object.entries(value)) leaves(inner, `${path}.${key}`, out);
  }
  return out;
}

const ruleValues = new Map<string, number>();
for (const [name, rule] of Object.entries(RULES)) leaves(rule, name, ruleValues);

/** Rule table rows: the first cell is a path in backticks. The value may be a fraction like 1/24. */
const ruleRows = tableRows
  .map((cells) => ({ path: /^`([A-Z_]+(?:\.\w+)+)`$/.exec(cells[0] ?? '')?.[1], value: cells[1] }))
  .filter((r): r is { path: string; value: string | undefined } => r.path !== undefined)
  .map(({ path, value }) => {
    const [a, b] = (value ?? '').split('/').map(Number);
    return { path, value: b === undefined ? a : a! / b };
  });

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
      expect(Number(cells[5]), `known rank, row ${i + 1}`).toBe(tier.vocabulary.maxRank);
      expect(Number(cells[6]?.replace('%', '')) / 100, `known share, row ${i + 1}`).toBeCloseTo(
        tier.vocabulary.minKnownShare,
        10,
      );
      expect(Number(cells[7]), `new words, row ${i + 1}`).toBe(tier.vocabulary.maxNewWords);
      expect(cells[8] === 'yes', `idioms, row ${i + 1}`).toBe(tier.idiomsAllowed);
    });
  });
});

describe('README rule values table', () => {
  it('lists every number in the rules, once each', () => {
    const paths = ruleRows.map((r) => r.path);
    expect(new Set(paths).size, 'no duplicate rows').toBe(paths.length);
    expect([...paths].sort()).toEqual([...ruleValues.keys()].sort());
  });

  it('matches the numbers in the rules', () => {
    for (const { path, value } of ruleRows) {
      expect(value, path).toBeCloseTo(ruleValues.get(path)!, 10);
    }
  });
});

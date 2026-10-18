/**
 * The gold and safety sets are test data. App code, other packages and the entry point must never import
 * them, so no passage can reach a learner screen or a seed (AGENTS.md golden rule 8).
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const here = fileURLToPath(new URL('.', import.meta.url));
const srcRoot = join(here, '..');
const repoRoot = join(here, '../../../..');

const SKIP = new Set(['node_modules', '.next', 'dist', 'build', 'coverage']);

function sourceFiles(dir: string): string[] {
  const out: string[] = [];
  for (const name of readdirSync(dir)) {
    if (SKIP.has(name)) continue;
    const path = join(dir, name);
    if (statSync(path).isDirectory()) out.push(...sourceFiles(path));
    else if (/\.(ts|tsx|js|jsx|mjs)$/.test(name)) out.push(path);
  }
  return out;
}

const importsEval = (source: string) =>
  /from\s+['"][^'"]*(?:\.\/eval\b|story-ai\/src\/eval)[^'"]*['"]/.test(source) ||
  /import\(\s*['"][^'"]*(?:\.\/eval\b|story-ai\/src\/eval)[^'"]*['"]\s*\)/.test(source);

describe('eval isolation', () => {
  it('src/index.ts does not import anything from eval/', () => {
    expect(importsEval(readFileSync(join(srcRoot, 'index.ts'), 'utf8'))).toBe(false);
  });

  it('no file under apps/ imports the eval folder', () => {
    const offenders = sourceFiles(join(repoRoot, 'apps')).filter((f) =>
      importsEval(readFileSync(f, 'utf8')),
    );
    expect(offenders).toEqual([]);
  });

  it('no other package imports the eval folder, so it cannot reach a seed', () => {
    const packages = join(repoRoot, 'packages');
    const offenders = readdirSync(packages)
      .filter((name) => name !== 'story-ai' && statSync(join(packages, name)).isDirectory())
      .flatMap((name) => sourceFiles(join(packages, name)))
      .filter((f) => importsEval(readFileSync(f, 'utf8')));
    expect(offenders).toEqual([]);
  });

  it('the detector recognises an import of the eval folder', () => {
    expect(
      importsEval("import { GOLD_SET } from '@basabridge/story-ai/src/eval/gold/gold-set';"),
    ).toBe(true);
    expect(importsEval("import { checkStory } from '@basabridge/story-ai';")).toBe(false);
  });
});

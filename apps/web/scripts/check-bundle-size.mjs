#!/usr/bin/env node
/**
 * Fails when the first-load JavaScript of any route is over the budget (BB-71).
 * Run after `next build`. Sizes are gzip, which is what a phone downloads, summed over the
 * route's first-load chunks from .next/diagnostics/route-bundle-stats.json.
 * Usage: node scripts/check-bundle-size.mjs [budgetKb]
 */
import { readFileSync } from 'node:fs';
import { gzipSync } from 'node:zlib';
import { join } from 'node:path';

const budgetKb = Number(process.argv[2] ?? process.env.BUNDLE_BUDGET_KB ?? 170);
const root = process.cwd();
const statsPath = join(root, '.next/diagnostics/route-bundle-stats.json');

let stats;
try {
  stats = JSON.parse(readFileSync(statsPath, 'utf8'));
} catch {
  console.error(`Cannot read ${statsPath}. Run "next build" in apps/web first.`);
  process.exit(2);
}

const sizeCache = new Map();
function gzipBytes(path) {
  if (!sizeCache.has(path)) sizeCache.set(path, gzipSync(readFileSync(join(root, path))).length);
  return sizeCache.get(path);
}

const rows = stats
  .map(({ route, firstLoadChunkPaths }) => ({
    route,
    kb:
      firstLoadChunkPaths.filter((p) => p.endsWith('.js')).reduce((n, p) => n + gzipBytes(p), 0) /
      1000,
  }))
  .sort((a, b) => b.kb - a.kb);

const over = rows.filter((r) => r.kb > budgetKb);
for (const { route, kb } of rows) {
  console.log(`${kb > budgetKb ? 'FAIL' : 'ok  '} ${kb.toFixed(1).padStart(7)} kB  ${route}`);
}
if (over.length > 0) {
  console.error(`\n${over.length} route(s) over ${budgetKb} kB first-load JS (gzip).`);
  process.exit(1);
}
console.log(`\nAll ${rows.length} routes within ${budgetKb} kB.`);

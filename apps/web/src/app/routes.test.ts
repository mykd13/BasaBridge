import { readFileSync, readdirSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const appDir = fileURLToPath(new URL('.', import.meta.url));
const screensDoc = fileURLToPath(new URL('../../../../docs/SCREENS.md', import.meta.url));

function pageFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return pageFiles(path);
    return entry.name === 'page.tsx' ? [path] : [];
  });
}

/** app/(student)/(main)/learn/[lesson]/page.tsx -> /learn/[lesson]. Route groups add no segment. */
function routeOf(file: string): string {
  const segments = relative(appDir, file)
    .split(sep)
    .slice(0, -1)
    .filter((s) => !/^\(.*\)$/.test(s));
  return `/${segments.join('/')}`;
}

/** The route in each table row of SCREENS.md, from the Route column. */
function screenRoutes(): Map<string, string> {
  const routes = new Map<string, string>();
  for (const line of readFileSync(screensDoc, 'utf8').split('\n')) {
    const cells = line.split('|').map((c) => c.trim());
    const id = cells[1];
    const route = cells[4]?.match(/^`(\/[^`]*)`/)?.[1];
    if (id && /^[A-I]\d$/.test(id) && route) routes.set(route, id);
  }
  return routes;
}

describe('routes', () => {
  const built = new Set(pageFiles(appDir).map(routeOf));

  it('reads the table in SCREENS.md', () => {
    expect(screenRoutes().size).toBeGreaterThan(25);
  });

  it('has a page for every route in SCREENS.md', () => {
    const missing = [...screenRoutes()].filter(([route]) => !built.has(route));
    expect(missing).toEqual([]);
  });

  it('has the root redirect and the parent entry page', () => {
    expect(built.has('/')).toBe(true);
    expect(built.has('/parent')).toBe(true);
  });
});

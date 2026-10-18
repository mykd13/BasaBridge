import { fileURLToPath } from 'node:url';
import { ESLint } from 'eslint';
import { describe, expect, it } from 'vitest';

const repoRoot = fileURLToPath(new URL('../../../../../', import.meta.url));
const eslint = new ESLint({ cwd: repoRoot });

async function restricted(code: string, file: string): Promise<string[]> {
  const [result] = await eslint.lintText(code, { filePath: `${repoRoot}${file}` });
  return result!.messages
    .filter((m) => m.ruleId === 'no-restricted-imports' || m.ruleId === 'no-restricted-syntax')
    .map((m) => m.message);
}

const route = 'apps/web/src/app/api/x/route.ts';

describe('the lint rule that guards learner tables', () => {
  it('fails when a page imports anything from the db package', async () => {
    for (const name of [
      'getLearner',
      'listConsents',
      'listAuditFor',
      'sessions',
      'createDbFromEnv',
    ]) {
      const code = `import { ${name} } from '@basabridge/db';
export const x = ${name};
`;
      expect(await restricted(code, 'apps/web/src/app/progress/page.tsx'), name).toHaveLength(1);
    }
  });

  it('fails for the schema, the testing helper, drizzle and the database drivers', async () => {
    for (const mod of [
      '@basabridge/db/schema',
      '@basabridge/db/testing',
      'drizzle-orm',
      'drizzle-orm/pg-core',
      '@electric-sql/pglite',
      'pg',
      'postgres',
    ]) {
      const code = `import * as m from '${mod}';
export const x = m;
`;
      expect(await restricted(code, route), mod).toHaveLength(1);
    }
  });

  it('fails for a dynamic import and a require', async () => {
    const dynamic = `export const x = () => import('@basabridge/db');
`;
    const required = `const m = require('drizzle-orm');
export const x = m;
`;
    expect(await restricted(dynamic, route)).toHaveLength(1);
    expect(await restricted(required, route)).toHaveLength(1);
  });

  it('allows type imports in a route and the db package in the access module', async () => {
    const types = `import type { Learner } from '@basabridge/db';
export type X = Learner;
`;
    expect(await restricted(types, route)).toEqual([]);
    const access = `import { getLearner } from '@basabridge/db';
export const x = getLearner;
`;
    expect(await restricted(access, 'apps/web/src/server/access/index.ts')).toEqual([]);
  });
});

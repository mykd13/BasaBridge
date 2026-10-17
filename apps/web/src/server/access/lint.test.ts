import { fileURLToPath } from 'node:url';
import { ESLint } from 'eslint';
import { describe, expect, it } from 'vitest';

const repoRoot = fileURLToPath(new URL('../../../../../', import.meta.url));
const eslint = new ESLint({ cwd: repoRoot });

async function restricted(code: string, file: string): Promise<string[]> {
  const [result] = await eslint.lintText(code, { filePath: `${repoRoot}${file}` });
  return result!.messages.filter((m) => m.ruleId === 'no-restricted-imports').map((m) => m.message);
}

describe('the lint rule that guards learner tables', () => {
  it('fails when a page imports a learner table or helper', async () => {
    const code = `import { getLearner } from '@basabridge/db';\nexport const x = getLearner;\n`;
    expect(await restricted(code, 'apps/web/src/app/progress/page.tsx')).toHaveLength(1);
  });

  it('fails when a route imports the schema or drizzle', async () => {
    const schema = `import * as s from '@basabridge/db/schema';\nexport const x = s;\n`;
    const drizzle = `import { eq } from 'drizzle-orm';\nexport const x = eq;\n`;
    expect(await restricted(schema, 'apps/web/src/app/api/x/route.ts')).toHaveLength(1);
    expect(await restricted(drizzle, 'apps/web/src/app/api/x/route.ts')).toHaveLength(1);
  });

  it('allows non-learner helpers in a route and learner helpers in the access module', async () => {
    const ok = `import { suppressAddress } from '@basabridge/db';\nexport const x = suppressAddress;\n`;
    expect(await restricted(ok, 'apps/web/src/app/api/x/route.ts')).toEqual([]);
    const access = `import { getLearner } from '@basabridge/db';\nexport const x = getLearner;\n`;
    expect(await restricted(access, 'apps/web/src/server/access/index.ts')).toEqual([]);
  });
});

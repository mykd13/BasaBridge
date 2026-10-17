import { resolve } from 'node:path';
import { ESLint } from 'eslint';
import { describe, expect, it } from 'vitest';

const root = resolve(__dirname, '../../..');
const eslint = new ESLint({ cwd: root });

async function messages(code: string, filePath: string) {
  const [result] = await eslint.lintText(code, { filePath: resolve(root, filePath) });
  return result?.messages.filter((m) => m.ruleId === 'i18next/no-literal-string') ?? [];
}

describe('hard-coded string rule', () => {
  it('fails on text in JSX', async () => {
    expect(
      await messages('export const Card = () => <p>Hello</p>;', 'apps/web/src/a.tsx'),
    ).toHaveLength(1);
  });

  it('fails on aria-label, title, placeholder and alt', async () => {
    const code = `export const Card = () => (
      <div>
        <input aria-label="Name" placeholder="Name" />
        <img alt="A cat" src="/c.png" />
        <button title="Go" type="button" />
      </div>
    );`;
    expect(await messages(code, 'apps/web/src/a.tsx')).toHaveLength(4);
  });

  it('fails in packages/ui', async () => {
    expect(
      await messages('export const Card = () => <p>Hello</p>;', 'packages/ui/src/a.tsx'),
    ).toHaveLength(1);
  });

  it('allows catalog lookups, class names and non-text props', async () => {
    const code = `export const Card = ({ t }: { t: (k: string) => string }) => (
      <p className="note" lang="en" aria-hidden="true">{t('app.tagline')}</p>
    );`;
    expect(await messages(code, 'apps/web/src/a.tsx')).toHaveLength(0);
  });

  it('ignores app/dev and tests', async () => {
    const code = 'export const Card = () => <p>Hello</p>;';
    expect(await messages(code, 'apps/web/src/app/dev/a.tsx')).toHaveLength(0);
    expect(await messages(code, 'apps/web/src/a.test.tsx')).toHaveLength(0);
  });
});

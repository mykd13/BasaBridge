import { beforeEach, describe, expect, it, vi } from 'vitest';

const set = vi.fn();
vi.mock('next/headers', () => ({ cookies: async () => ({ set }) }));

const { setSignedOutLanguage } = await import('./actions.ts');

describe('setSignedOutLanguage', () => {
  beforeEach(() => set.mockClear());

  it('stores a supported language in the bb_lang cookie', async () => {
    await setSignedOutLanguage('fil');
    expect(set).toHaveBeenCalledWith('bb_lang', 'fil', expect.objectContaining({ path: '/' }));
  });

  it('ignores anything else', async () => {
    await setSignedOutLanguage('xx');
    expect(set).not.toHaveBeenCalled();
  });
});

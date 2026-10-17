import { describe, expect, it, vi } from 'vitest';
import { clearSessionKeys } from './shared-device';
import { signOutAndReload } from './sign-out-client';
import config, { PRIVATE_PATHS } from '../../next.config';

function fakeStorage(entries: Record<string, string>) {
  const map = new Map(Object.entries(entries));
  return {
    get length() {
      return map.size;
    },
    key: (i: number) => [...map.keys()][i] ?? null,
    removeItem: (k: string) => void map.delete(k),
    keys: () => [...map.keys()],
  };
}

describe('clearSessionKeys', () => {
  it('removes every bb: key and leaves the rest', () => {
    const s = fakeStorage({ 'bb:a': '1', 'bb:b': '2', other: '3', 'xbb:c': '4' });
    clearSessionKeys(s);
    expect(s.keys()).toEqual(['other', 'xbb:c']);
  });
});

describe('signOutAndReload', () => {
  it('ends the session, then loads sign in', async () => {
    const order: string[] = [];
    await signOutAndReload(
      async () => void order.push('end'),
      (url) => void order.push(`go ${url}`),
    );
    expect(order).toEqual(['end', 'go /sign-in']);
  });

  it('still loads sign in when ending the session fails', async () => {
    const go = vi.fn();
    await expect(
      signOutAndReload(async () => {
        throw new Error('offline');
      }, go),
    ).rejects.toThrow('offline');
    expect(go).toHaveBeenCalledWith('/sign-in');
  });
});

describe('private page headers', () => {
  it('sends no-store on every learner and parent page', async () => {
    const rules = (await config.headers?.()) ?? [];
    expect(rules.map((r) => r.source)).toEqual(PRIVATE_PATHS);
    for (const rule of rules) {
      expect(rule.headers).toContainEqual({ key: 'Cache-Control', value: 'no-store' });
    }
    expect(PRIVATE_PATHS).toEqual(
      expect.arrayContaining(['/home', '/read/:path*', '/learn/:path*']),
    );
  });
});

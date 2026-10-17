import { readdirSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { redirect } = vi.hoisted(() => ({
  redirect: vi.fn((to: string) => {
    throw new Error(`redirect:${to}`);
  }),
}));
vi.mock('next/navigation', () => ({ redirect }));

const { requirePlacement, placementGate } = await import('./placement-gate');

const user = { id: 'u1', role: 'student' as const };

beforeEach(() => {
  redirect.mockClear();
});

describe('requirePlacement', () => {
  it('sends a learner with no finished placement to the start of placement', async () => {
    const gate = { hasFinishedPlacement: vi.fn(async () => false) };
    await expect(requirePlacement(user, gate)).rejects.toThrow('redirect:/placement');
    expect(gate.hasFinishedPlacement).toHaveBeenCalledWith('u1');
  });

  it('lets a learner with a finished placement through', async () => {
    const gate = { hasFinishedPlacement: async () => true };
    await expect(requirePlacement(user, gate)).resolves.toBeUndefined();
    expect(redirect).not.toHaveBeenCalled();
  });

  it('lets everyone through by default until BB-49 fills in the check', async () => {
    await expect(placementGate.hasFinishedPlacement('anyone')).resolves.toBe(true);
  });
});

describe('where the gate applies', () => {
  const appDir = fileURLToPath(new URL('../app', import.meta.url));
  const pages = (function walk(dir: string): string[] {
    return readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
      e.isDirectory()
        ? walk(join(dir, e.name))
        : e.name === 'page.tsx'
          ? [relative(appDir, join(dir, e.name))]
          : [],
    );
  })(appDir);
  const gated = (route: string) => pages.some((p) => p.startsWith(`(student)/(main)/${route}/`));
  const ungated = (route: string) =>
    pages.some((p) => p.startsWith(`(student)/${route}/`)) && !gated(route);

  it('wraps home, read and learn', () => {
    for (const route of ['home', 'read', 'learn']) expect(gated(route), route).toBe(true);
  });

  it('skips account, reading help and placement', () => {
    for (const route of ['account', 'account/help', 'placement']) {
      expect(ungated(route), route).toBe(true);
    }
  });
});

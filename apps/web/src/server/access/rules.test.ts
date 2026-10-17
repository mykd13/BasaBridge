import { describe, expect, it } from 'vitest';
import {
  DATA_KINDS,
  decide,
  type Action,
  type DataKind,
  type LinkState,
  type Viewer,
} from './rules';

const learner = '11111111-1111-4111-8111-111111111111';
const otherStudent = '22222222-2222-4222-8222-222222222222';
const parentId = '33333333-3333-4333-8333-333333333333';

const self: Viewer = { id: learner, role: 'student' };
const other: Viewer = { id: otherStudent, role: 'student' };
const parent: Viewer = { id: parentId, role: 'parent' };

const kinds = Object.values(DATA_KINDS).flat() as DataKind[];
const actions: Action[] = ['read', 'write', 'mark_misheard'];

const links: [string, LinkState | null][] = [['no link', null]];
for (const status of ['pending', 'active', 'revoked'] as const) {
  for (const sharesProgress of [false, true]) {
    for (const sharesAnalysis of [false, true]) {
      links.push([
        `${status} p=${sharesProgress} a=${sharesAnalysis}`,
        { status, sharesProgress, sharesAnalysis },
      ]);
    }
  }
}

describe('every role, link and share-flag combination', () => {
  it('nobody signed in sees nothing', () => {
    for (const kind of kinds)
      for (const action of actions)
        for (const [, link] of links)
          expect(decide(null, learner, kind, action, link).allowed).toBe(false);
  });

  it('a student reads and changes all of their own data, whatever the links say', () => {
    for (const kind of kinds)
      for (const action of ['read', 'write'] as const)
        for (const [, link] of links)
          expect(decide(self, learner, kind, action, link)).toEqual({
            allowed: true,
            reason: 'own_data',
          });
  });

  it("a student never reaches another student's data", () => {
    for (const kind of kinds)
      for (const action of actions)
        for (const [, link] of links)
          expect(decide(other, learner, kind, action, link).allowed).toBe(false);
  });

  it('a parent reads only what an active link shares, and never writes', () => {
    for (const kind of kinds) {
      for (const [name, link] of links) {
        const group = (DATA_KINDS.progress as readonly string[]).includes(kind)
          ? 'progress'
          : (DATA_KINDS.analysis as readonly string[]).includes(kind)
            ? 'analysis'
            : 'never';
        const flag = group === 'progress' ? link?.sharesProgress : link?.sharesAnalysis;
        const expected = group !== 'never' && link?.status === 'active' && flag === true;
        expect(decide(parent, learner, kind, 'read', link).allowed, `${kind} / ${name}`).toBe(
          expected,
        );
        expect(decide(parent, learner, kind, 'write', link).allowed, `${kind} / ${name}`).toBe(
          false,
        );
      }
    }
  });
});

describe('specific cases from the issue', () => {
  const allOn: LinkState = { status: 'active', sharesProgress: true, sharesAnalysis: true };

  it('a parent who is not linked is refused with not_linked', () => {
    expect(decide(parent, learner, 'level', 'read', null)).toEqual({
      allowed: false,
      reason: 'not_linked',
    });
  });

  it('a parent never gets audio, even with everything shared', () => {
    expect(decide(parent, learner, 'audio', 'read', allOn)).toEqual({
      allowed: false,
      reason: 'never_shared',
    });
  });

  it('a revoked link stops access', () => {
    expect(decide(parent, learner, 'level', 'read', { ...allOn, status: 'revoked' })).toEqual({
      allowed: false,
      reason: 'link_not_active',
    });
  });

  it('a share flag turned off hides that group only', () => {
    const progressOnly: LinkState = { ...allOn, sharesAnalysis: false };
    expect(decide(parent, learner, 'level', 'read', progressOnly).allowed).toBe(true);
    expect(decide(parent, learner, 'tries', 'read', progressOnly)).toEqual({
      allowed: false,
      reason: 'not_shared',
    });
  });

  it('a linked parent may mark a misheard word only when analysis is shared', () => {
    expect(decide(parent, learner, 'tries', 'mark_misheard', allOn).allowed).toBe(true);
    expect(
      decide(parent, learner, 'tries', 'mark_misheard', { ...allOn, sharesAnalysis: false })
        .allowed,
    ).toBe(false);
    expect(decide(parent, learner, 'level', 'mark_misheard', allOn).reason).toBe(
      'wrong_kind_for_action',
    );
    expect(decide(self, learner, 'tries', 'mark_misheard', null).allowed).toBe(true);
  });

  it('refuses an unknown role', () => {
    const odd = { id: parentId, role: 'admin' } as unknown as Viewer;
    expect(decide(odd, learner, 'level', 'read', allOn).reason).toBe('unknown_role');
  });
});

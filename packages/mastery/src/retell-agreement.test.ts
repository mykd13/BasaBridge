import { describe, expect, it } from 'vitest';
import { RETELL_GATE, retellAgreement, retellGateOpen } from './retell-agreement';
import type { AgreementReport, RetellJudgement } from './retell-agreement';

/** Build one retell from a list of [code, human] pairs. */
const retell = (storyId: string, pairs: [boolean, boolean][]): RetellJudgement => ({
  storyId,
  code: pairs.map(([c]) => c),
  human: pairs.map(([, h]) => h),
});

const repeat = <T>(n: number, x: T): T[] => Array.from({ length: n }, () => x);

describe('retellAgreement', () => {
  it('computes Cohen kappa against a worked example', () => {
    // 20 both yes, 5 code only, 10 human only, 15 both no: po 0.7, pe 0.5, kappa 0.4.
    const pairs: [boolean, boolean][] = [
      ...repeat<[boolean, boolean]>(20, [true, true]),
      ...repeat<[boolean, boolean]>(5, [true, false]),
      ...repeat<[boolean, boolean]>(10, [false, true]),
      ...repeat<[boolean, boolean]>(15, [false, false]),
    ];
    const r = retellAgreement([retell('s1', pairs)]);
    expect(r.ideas).toBe(50);
    expect(r.percentAgreement).toBeCloseTo(0.7);
    expect(r.kappa).toBeCloseTo(0.4);
    expect(r.codeOnly).toBe(5);
    expect(r.humanOnly).toBe(10);
  });

  it('gives kappa 1 for perfect agreement and counts stories', () => {
    const r = retellAgreement([
      retell('s1', [
        [true, true],
        [false, false],
      ]),
      retell('s2', [
        [false, false],
        [true, true],
      ]),
      retell('s2', [
        [true, true],
        [true, true],
      ]),
    ]);
    expect(r.kappa).toBe(1);
    expect(r).toMatchObject({ retells: 3, stories: 2, ideas: 6, totalsWithinOne: 1 });
  });

  it('leaves kappa undefined when both sides only ever said the same one thing', () => {
    const r = retellAgreement([retell('s1', repeat<[boolean, boolean]>(4, [true, true]))]);
    expect(r.percentAgreement).toBe(1);
    expect(r.kappa).toBeNull();
  });

  it('checks totals within one idea per retell', () => {
    const r = retellAgreement([
      // code 3, human 1: off by two
      retell('s1', [
        [true, true],
        [true, false],
        [true, false],
      ]),
      // code 1, human 2: within one
      retell('s1', [
        [true, true],
        [false, true],
        [false, false],
      ]),
    ]);
    expect(r.totalsWithinOne).toBe(0.5);
  });

  it('is empty for no retells', () => {
    expect(retellAgreement([])).toMatchObject({ ideas: 0, kappa: null, totalsWithinOne: 0 });
  });

  it('rejects a retell whose code and human lists differ in length', () => {
    expect(() => retellAgreement([{ storyId: 's1', code: [true], human: [true, false] }])).toThrow(
      /1 code scores and 2 human scores/,
    );
  });
});

describe('retell gate', () => {
  const passing: AgreementReport = {
    retells: RETELL_GATE.minRetells,
    stories: RETELL_GATE.minStories,
    ideas: 300,
    percentAgreement: 0.9,
    kappa: RETELL_GATE.minKappa,
    codeOnly: 10,
    humanOnly: 20,
    totalsWithinOne: RETELL_GATE.minTotalsWithinOne,
  };

  it('opens only when every part of the bar is met', () => {
    expect(retellGateOpen(passing)).toBe(true);
    expect(retellGateOpen({ ...passing, retells: RETELL_GATE.minRetells - 1 })).toBe(false);
    expect(retellGateOpen({ ...passing, stories: RETELL_GATE.minStories - 1 })).toBe(false);
    expect(retellGateOpen({ ...passing, kappa: RETELL_GATE.minKappa - 0.01 })).toBe(false);
    expect(retellGateOpen({ ...passing, kappa: null })).toBe(false);
    expect(retellGateOpen({ ...passing, totalsWithinOne: 0.89 })).toBe(false);
  });

  it('never makes retell scores usable for levels on its own', () => {
    expect(retellGateOpen(passing)).toBe(true);
    expect(RETELL_GATE.usableForLevels).toBe(false);
  });
});

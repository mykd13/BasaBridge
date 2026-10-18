import { describe, expect, it } from 'vitest';
import { addCall, gatewayCost } from './usage';

describe('gatewayCost', () => {
  it('reads a number or a numeric string', () => {
    expect(gatewayCost({ gateway: { cost: 0.0012 } })).toBe(0.0012);
    expect(gatewayCost({ gateway: { cost: '0.0012' } })).toBe(0.0012);
  });

  it('is undefined when missing or not a valid amount', () => {
    expect(gatewayCost(undefined)).toBeUndefined();
    expect(gatewayCost({ google: { cost: 1 } })).toBeUndefined();
    expect(gatewayCost({ gateway: { cost: 'abc' } })).toBeUndefined();
    expect(gatewayCost({ gateway: { cost: '' } })).toBeUndefined();
    expect(gatewayCost({ gateway: { cost: -1 } })).toBeUndefined();
  });
});

describe('addCall', () => {
  it('sums tokens and cost over attempts', () => {
    let u = addCall(
      { attempts: 0 },
      {
        usage: { inputTokens: 100, outputTokens: 50 },
        providerMetadata: { gateway: { cost: '0.01' } },
      },
    );
    u = addCall(u, {
      usage: { inputTokens: 120, outputTokens: 60 },
      providerMetadata: { gateway: { cost: 0.02 } },
    });
    expect(u.attempts).toBe(2);
    expect(u.inputTokens).toBe(220);
    expect(u.outputTokens).toBe(110);
    expect(u.costUsd).toBeCloseTo(0.03);
  });

  it('leaves out numbers the provider never reported', () => {
    const u = addCall(
      { attempts: 0 },
      { usage: { inputTokens: undefined, outputTokens: undefined } },
    );
    expect(u).toEqual({ attempts: 1 });
  });

  it('keeps a known count when a later call reports none', () => {
    const u = addCall(addCall({ attempts: 0 }, { usage: { inputTokens: 10 } }), {});
    expect(u).toEqual({ attempts: 2, inputTokens: 10 });
  });
});

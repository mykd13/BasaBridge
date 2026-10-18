import type { Usage } from './errors';

/** The parts of an AI SDK result that carry usage. */
export interface CallUsage {
  usage?: { inputTokens?: number | undefined; outputTokens?: number | undefined };
  providerMetadata?: Record<string, Record<string, unknown> | undefined> | undefined;
}

const amount = (n: unknown): number | undefined => {
  const v = typeof n === 'string' && n.trim() !== '' ? Number(n) : n;
  return typeof v === 'number' && Number.isFinite(v) && v >= 0 ? v : undefined;
};

/** Cost in US dollars from the AI Gateway metadata. The gateway may send it as a string. */
export function gatewayCost(providerMetadata: CallUsage['providerMetadata']): number | undefined {
  return amount(providerMetadata?.gateway?.cost);
}

const add = (a: number | undefined, b: number | undefined) =>
  a === undefined ? b : b === undefined ? a : a + b;

/** Adds one model call to the running usage. */
export function addCall(total: Usage, call: CallUsage): Usage {
  const next: Usage = { attempts: total.attempts + 1 };
  const inputTokens = add(total.inputTokens, amount(call.usage?.inputTokens));
  const outputTokens = add(total.outputTokens, amount(call.usage?.outputTokens));
  const costUsd = add(total.costUsd, gatewayCost(call.providerMetadata));
  if (inputTokens !== undefined) next.inputTokens = inputTokens;
  if (outputTokens !== undefined) next.outputTokens = outputTokens;
  if (costUsd !== undefined) next.costUsd = costUsd;
  return next;
}

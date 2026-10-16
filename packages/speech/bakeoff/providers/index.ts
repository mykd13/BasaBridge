/** Registry of bake-off adapters. Keys must match the `vendors` column in manifest.csv. */
import type { BakeoffProvider } from '../types.ts';
import { createOracle } from './oracle.ts';

type Factory = (env: NodeJS.ProcessEnv) => BakeoffProvider;

const FACTORIES: Record<string, Factory> = {
  oracle: () => createOracle(),
};

export const PROVIDER_NAMES = Object.keys(FACTORIES).filter((n) => n !== 'oracle');

export function createProvider(name: string, env: NodeJS.ProcessEnv): BakeoffProvider {
  const factory = FACTORIES[name];
  if (!factory) throw new Error(`Unknown provider ${name}`);
  return factory(env);
}

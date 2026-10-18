/** Registry of bake-off adapters. Keys must match the `vendors` column in manifest.csv. */
import type { BakeoffProvider } from '../types.ts';
import { createAssemblyAI } from './assemblyai.ts';
import { createAzure, createAzurePronunciation } from './azure.ts';
import { createDeepgram } from './deepgram.ts';
import { createGoogle } from './google.ts';
import { createOracle } from './oracle.ts';
import { createSpeechmatics } from './speechmatics.ts';

type Factory = (env: NodeJS.ProcessEnv) => BakeoffProvider;

const FACTORIES: Record<string, Factory> = {
  'azure-pa': createAzurePronunciation,
  azure: createAzure,
  deepgram: createDeepgram,
  assemblyai: createAssemblyAI,
  google: createGoogle,
  speechmatics: createSpeechmatics,
  oracle: () => createOracle(),
};

/** Real adapters. The oracle is an offline test double. */
export const PROVIDER_NAMES = Object.keys(FACTORIES).filter((n) => n !== 'oracle');

/** Companies a guardian can tick in CONSENT.md. These go in the manifest `vendors` column. */
export const COMPANIES = ['azure', 'deepgram', 'assemblyai', 'google', 'speechmatics'];

/** The company an adapter sends audio to. Both Azure adapters go to Microsoft. */
export function companyOf(provider: string): string {
  return provider === 'azure-pa' ? 'azure' : provider;
}

export function createProvider(name: string, env: NodeJS.ProcessEnv): BakeoffProvider {
  const factory = FACTORIES[name];
  if (!factory) throw new Error(`Unknown provider ${name}`);
  return factory(env);
}

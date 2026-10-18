import type { Catalog, Lang } from '../types.ts';
import { en } from './en.ts';
import { fil } from './fil.ts';

export const catalogs: Record<Lang, Catalog> = { en, fil };
export { en, fil };

/**
 * List Filipino keys a native speaker has not checked yet. Never fails: it only reports.
 * Run with: pnpm i18n:unreviewed
 */
import { fil } from '../apps/web/src/i18n/catalog/fil.ts';
import { entries } from '../apps/web/src/i18n/messages.ts';

const all = entries(fil);
const pending = all.filter(({ entry }) => entry.reviewed !== true);
console.info(`Filipino review: ${all.length - pending.length} of ${all.length} keys reviewed.`);
for (const { key } of pending) console.info(`  unreviewed: ${key}`);

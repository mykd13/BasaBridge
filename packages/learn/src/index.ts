/**
 * The Learn section (docs/PLAN.md section 6.3, ADR 0003). Owner: Jhade (BB-52 to BB-54).
 *
 * When a learner misses questions or does not pass a story, Learn teaches the skill they are missing.
 * This package decides which lessons to offer. It holds no lesson text: lessons are written and
 * reviewed by people (BB-53) and loaded into a registry.
 *
 * Rules that matter:
 * - Practice inside Learn never changes the learner's level. Level moves only on story evidence.
 * - A lesson counts as learned only after the learner does well on fresh questions in a real story.
 * - Learners never chat freely with a model. Lessons follow a fixed shape.
 */
export * from './core';
export * from './gaps';
export * from './lesson';
export * from './practice';
export * from './recheck';
export * from './registry';
export * from './status';
export * from './store';

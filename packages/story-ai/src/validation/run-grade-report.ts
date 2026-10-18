/** Prints the grade report for rated-sample.json. Run with `pnpm --filter @basabridge/story-ai grade-report`. */
import sample from './rated-sample.json';
import { formatGradeReport, gradeReport, parseSample } from './grade-report';

// The package has no Node types, so declare the one global this script uses.
declare const console: { log(message: string): void };

console.log(formatGradeReport(gradeReport(parseSample(sample))));

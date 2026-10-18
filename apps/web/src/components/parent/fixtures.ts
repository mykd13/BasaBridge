/** Typed sample data for component tests only. App code never imports this (AGENTS.md rule 8). */
import type {
  DecisionsView,
  LearnerSummary,
  LevelsView,
  PrivacyView,
  ProgressView,
  ReadingsView,
} from '@/server/parent/types';

export const summary: LearnerSummary = {
  grade: 3,
  level: 24,
  readings: 12,
  sharedSince: '2026-10-17T08:00:00Z',
};

export const progress: ProgressView = {
  summary,
  level: { level: 24, passes: 2 },
  averageTries: { value: 2.4, stories: 5 },
  skills: [
    {
      skill: 'decoding',
      measure: { kind: 'words', right: 1046, total: 1150 },
      confidence: 'steady',
      change: null,
    },
    {
      skill: 'fluency',
      measure: { kind: 'pace', wordsPerMinute: 58 },
      confidence: 'steady',
      change: 4,
    },
    {
      skill: 'vocabulary',
      measure: { kind: 'questions', right: 3, total: 7 },
      confidence: 'building',
      change: -2,
    },
  ],
  patterns: [
    { kind: 'dropped_ending', key: 'ed', count: 6, tries: 4, confidence: 'medium' },
    { kind: 'repeated_substitution', key: 'was>saw', count: 3, tries: 2, confidence: 'low' },
    { kind: 'missing_pause', key: 'full_stop', count: 5, tries: 3, confidence: 'high' },
  ],
  plan: {
    focus: 'vocabulary',
    focusEvidence: { right: 3, total: 7 },
    lastReading: { correct: 4, total: 5, wordsRightShare: 0.94 },
  },
  notes: null,
};

export const progressWithNotes: ProgressView = {
  ...progress,
  notes: {
    whatHappened: 'Four of five answers were right.',
    whyFocus: 'Vocabulary has the lowest estimate.',
    homeActivity: {
      title: 'Word detective',
      minutes: 5,
      steps: ['Pick three tricky words.', 'Use each in a sentence.'],
      tip: 'Say the meaning in your own words.',
      source: 'ai',
    },
    source: 'ai',
  },
};

export const readings: ReadingsView = {
  summary,
  readings: [
    {
      id: 'r1',
      title: 'The Mango Tree',
      readAt: '2026-10-17T08:12:00Z',
      level: 24,
      questionsCorrect: 4,
      questionsTotal: 5,
      wordsRightShare: 0.94,
      tries: [
        {
          number: 1,
          completed: true,
          wordsRight: 48,
          wordsTotal: 55,
          wordsPerMinute: 51,
          counted: false,
        },
        {
          number: 2,
          completed: true,
          wordsRight: 52,
          wordsTotal: 55,
          wordsPerMinute: 62,
          counted: true,
        },
      ],
      wordsToCheck: [
        { expected: 'patient', heard: 'passion', confidence: 'high', markedMisheard: false },
        { expected: 'tree', heard: null, confidence: 'low', markedMisheard: true },
      ],
      analysis: {
        text: 'Stumbled on a word ending in -tient.',
        source: 'standard',
        differences: 3,
      },
      questions: [
        {
          number: 1,
          text: 'Where does Lia check every morning?',
          skill: 'literal',
          correct: true,
          chosen: null,
          answer: null,
          evidence: 'Every morning, Lia checks the tree.',
        },
        {
          number: 3,
          text: 'What does the word “patient” mean?',
          skill: 'vocabulary',
          correct: false,
          chosen: 'Full of energy',
          answer: 'Able to wait calmly',
          evidence: 'We must be patient, he says.',
        },
      ],
    },
    {
      id: 'r2',
      title: 'The Market Day',
      readAt: '2026-10-16T08:00:00Z',
      level: 24,
      questionsCorrect: 5,
      questionsTotal: 5,
      wordsRightShare: null,
      tries: [],
      wordsToCheck: [],
      analysis: null,
      questions: [],
    },
  ],
};

export const levels: LevelsView = {
  summary,
  history: [
    { id: 'c2', at: '2026-10-10T08:00:00Z', from: 23, to: 24, reason: 'moved_up' },
    { id: 'c1', at: '2026-10-01T08:00:00Z', from: null, to: 23, reason: 'placement' },
  ],
};

export const decisions: DecisionsView = {
  summary,
  decisions: [
    {
      id: 'd1',
      at: '2026-10-17T08:21:00Z',
      basedOn: 'The Mango Tree',
      decision: {
        kind: 'plan',
        title: 'Focus skill is now vocabulary',
        summary: 'vocabulary has the lowest estimate.',
        evidence: { messageKey: 'decision.focus', params: { skill: 'vocabulary', from: null } },
      },
    },
    {
      id: 'd2',
      at: '2026-10-17T08:20:00Z',
      basedOn: null,
      decision: {
        kind: 'level',
        title: 'Moved up to Level 24',
        summary: 'Enough stories passed at this level.',
        evidence: { messageKey: 'decision.level.up', params: { level: 24 } },
      },
    },
    {
      id: 'd3',
      at: '2026-10-17T08:19:00Z',
      basedOn: null,
      decision: {
        kind: 'analysis',
        title: 'Story answers counted',
        summary: '5 answers counted, 1 counted for less.',
        evidence: { messageKey: 'decision.analysis', params: { answers: 5, reduced: 1 } },
      },
    },
    {
      id: 'd4',
      at: '2026-10-16T09:00:00Z',
      basedOn: null,
      decision: {
        kind: 'tries',
        title: 'Gave a new story after the tries',
        summary: 'A decision with no catalog message.',
        evidence: {},
      },
    },
  ],
};

export const privacy: PrivacyView = {
  children: [
    {
      id: 'l1',
      label: 'Child one',
      linkedAt: '2026-10-17T08:00:00Z',
      sharing: ['progress', 'readings'],
      microphone: 'given_by_parent',
    },
    {
      id: 'l2',
      label: 'Child two',
      linkedAt: '2026-10-18T08:00:00Z',
      sharing: [],
      microphone: 'pending',
    },
  ],
};

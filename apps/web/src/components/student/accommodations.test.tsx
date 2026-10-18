// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { withIntl } from '@/i18n/test-intl';
import * as fx from '@/server/student/test-fixtures';

const submitAnswerAction = vi.fn();
const recordWordTapAction = vi.fn();
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }) }));
vi.mock('@/server/student/actions', () => ({
  submitAnswerAction: (input: unknown) => submitAnswerAction(input),
  recordWordTapAction: (input: unknown) => recordWordTapAction(input),
  markMisheardAction: vi.fn(),
  finishTryAction: vi.fn(),
}));

const { QuestionFlow } = await import('./QuestionFlow');
const { AnalysisScreen } = await import('./ReadingResults');

const spoken: string[] = [];

beforeEach(() => {
  spoken.length = 0;
  submitAnswerAction.mockResolvedValue({ ok: true, data: fx.feedbackWrong });
  recordWordTapAction.mockResolvedValue({ ok: true, data: null });
  // The browser's own voice stands in here. Nothing leaves the page.
  vi.stubGlobal(
    'SpeechSynthesisUtterance',
    class {
      onend: (() => void) | null = null;
      onerror: (() => void) | null = null;
      lang = '';
      constructor(public text: string) {}
    },
  );
  Object.defineProperty(window, 'speechSynthesis', {
    configurable: true,
    value: {
      cancel: vi.fn(),
      speak: (u: { text: string; onend: () => void }) => {
        spoken.push(u.text);
        u.onend();
      },
    },
  });
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  vi.unstubAllGlobals();
});

const question = { ...fx.question, status: 'question' as const, readAloud: true };

async function answer() {
  fireEvent.click(screen.getByText(question.options[0]!));
  fireEvent.click(screen.getByRole('button', { name: 'Check my answer' }));
  await waitFor(() => expect(submitAnswerAction).toHaveBeenCalledTimes(1));
  return submitAnswerAction.mock.calls[0]![0] as { accommodations: string[]; chosen: number[] };
}

describe('accommodations are recorded on the answers they affect (rule 12)', () => {
  it('records question_read_aloud when the learner had the question read to them', async () => {
    render(withIntl(<QuestionFlow question={question} />));
    fireEvent.click(screen.getByRole('button', { name: /listen/i }));
    expect(spoken[0]).toContain(question.text);
    const sent = await answer();
    expect(sent.accommodations).toEqual(['question_read_aloud']);
    expect(sent.chosen).toEqual([0]);
  });

  it('records nothing when read aloud was offered but not used', async () => {
    render(withIntl(<QuestionFlow question={question} />));
    expect((await answer()).accommodations).toEqual([]);
  });

  it('offers no speaker button when the learner has not turned the help on', () => {
    render(withIntl(<QuestionFlow question={{ ...question, readAloud: false }} />));
    expect(screen.queryByRole('button', { name: /listen/i })).toBeNull();
  });

  it('sends the server only what the learner did, never a verdict or a key', async () => {
    render(withIntl(<QuestionFlow question={question} />));
    const sent = await answer();
    expect(Object.keys(sent).sort()).toEqual([
      'accommodations',
      'chosen',
      'questionId',
      'responseMs',
      'sessionId',
    ]);
  });

  it('records a word tap on the session once, and again only if the save failed', async () => {
    render(withIntl(<AnalysisScreen analysis={fx.analysis} />));
    const word = fx.analysis.practiceWords[0]!;
    // Voice support is found after the first render.
    const button = await screen.findByRole('button', { name: `Hear “${word}”` });
    fireEvent.click(button);
    fireEvent.click(button);
    expect(spoken).toEqual([word, word]);
    await waitFor(() => expect(recordWordTapAction).toHaveBeenCalledTimes(1));
    expect(recordWordTapAction).toHaveBeenCalledWith({ sessionId: fx.SESSION_ID });
  });

  it('tries the record again on the next tap when saving it failed', async () => {
    recordWordTapAction.mockResolvedValueOnce({ ok: false });
    render(withIntl(<AnalysisScreen analysis={fx.analysis} />));
    const button = await screen.findByRole('button', {
      name: `Hear “${fx.analysis.practiceWords[0]!}”`,
    });
    fireEvent.click(button);
    await waitFor(() => expect(recordWordTapAction).toHaveBeenCalledTimes(1));
    fireEvent.click(button);
    await waitFor(() => expect(recordWordTapAction).toHaveBeenCalledTimes(2));
  });

  it('shows practice words as plain text when the browser has no voice', () => {
    Object.defineProperty(window, 'speechSynthesis', { configurable: true, value: undefined });
    delete (window as { speechSynthesis?: unknown }).speechSynthesis;
    render(withIntl(<AnalysisScreen analysis={fx.analysis} />));
    expect(screen.queryByRole('button', { name: /^Hear/ })).toBeNull();
    expect(screen.getByText(fx.analysis.practiceWords[0]!)).toBeTruthy();
  });
});

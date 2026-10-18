import { Button, Notice } from '@basabridge/ui';
import './states.css';

export interface ErrorStateProps {
  title: string;
  body: string;
  /** Adds a button that runs `onClick`, for example the error boundary's reset. */
  retry?: { label: string; onClick: () => void };
  /** A page that is not ready yet is not a failure, so it does not interrupt a screen reader. */
  tone?: 'bad' | 'warn';
}

/** A blocking problem, drawn as a notice with an optional retry. */
export function ErrorState({ title, body, retry, tone = 'bad' }: ErrorStateProps) {
  return (
    <div className="bb-state-error">
      <Notice tone={tone} title={title} live={tone === 'bad' ? 'assertive' : 'polite'}>
        <p>{body}</p>
      </Notice>
      {retry ? (
        <Button variant="secondary" size="md" onClick={retry.onClick}>
          {retry.label}
        </Button>
      ) : null}
    </div>
  );
}

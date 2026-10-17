import { Card } from '@basabridge/ui';
import type { ReactNode } from 'react';
import './states.css';

export interface EmptyStateProps {
  icon: ReactNode;
  title: string;
  body: string;
  action?: ReactNode;
  /** 1 when the state is the whole page. 2 when it sits inside a page that has its own h1. */
  headingLevel?: 1 | 2;
}

/** Shown where real activity has not happened yet. Screens start empty and fill from real use. */
export function EmptyState({ icon, title, body, action, headingLevel = 2 }: EmptyStateProps) {
  const Heading = headingLevel === 1 ? 'h1' : 'h2';
  return (
    <Card className="bb-state">
      <span className="bb-state__icon" aria-hidden="true">
        {icon}
      </span>
      <Heading className="bb-state__title">{title}</Heading>
      <p className="bb-state__body">{body}</p>
      {action ? <div className="bb-state__action">{action}</div> : null}
    </Card>
  );
}

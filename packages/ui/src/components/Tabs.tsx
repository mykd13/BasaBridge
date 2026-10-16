'use client';

import { useId, useRef } from 'react';
import type { KeyboardEvent, ReactNode } from 'react';
import { cx } from './util';

export interface TabItem {
  id: string;
  label: string;
  content: ReactNode;
}

export interface TabsProps {
  tabs: TabItem[];
  /** The id of the open tab. */
  value: string;
  onChange: (id: string) => void;
  /** Names the tab list for screen readers, such as "Progress sections". */
  label: string;
}

/**
 * Tabs from the parent screens (P2 to P6). Arrow keys, Home and End move
 * between tabs, following the WAI-ARIA tabs pattern with automatic activation.
 */
export function Tabs({ tabs, value, onChange, label }: TabsProps) {
  const base = useId();
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const index = Math.max(
    0,
    tabs.findIndex((t) => t.id === value),
  );

  function move(next: number) {
    const i = (next + tabs.length) % tabs.length;
    const tab = tabs[i];
    if (!tab) return;
    onChange(tab.id);
    refs.current[i]?.focus();
  }

  function onKeyDown(e: KeyboardEvent<HTMLButtonElement>) {
    const keys: Record<string, number> = {
      ArrowRight: index + 1,
      ArrowLeft: index - 1,
      Home: 0,
      End: tabs.length - 1,
    };
    const next = keys[e.key];
    if (next === undefined) return;
    e.preventDefault();
    move(next);
  }

  const active = tabs[index];

  return (
    <div className="bb-tabs">
      <div className="bb-tabs__list" role="tablist" aria-label={label}>
        {tabs.map((tab, i) => {
          const selected = i === index;
          return (
            <button
              key={tab.id}
              ref={(el) => {
                refs.current[i] = el;
              }}
              type="button"
              role="tab"
              id={`${base}-tab-${tab.id}`}
              aria-controls={`${base}-panel-${tab.id}`}
              aria-selected={selected}
              tabIndex={selected ? 0 : -1}
              className={cx('bb-tabs__tab', selected && 'bb-tabs__tab--active')}
              onClick={() => onChange(tab.id)}
              onKeyDown={onKeyDown}
            >
              {tab.label}
            </button>
          );
        })}
      </div>
      {active ? (
        <div
          className="bb-tabs__panel"
          role="tabpanel"
          id={`${base}-panel-${active.id}`}
          aria-labelledby={`${base}-tab-${active.id}`}
          tabIndex={0}
        >
          {active.content}
        </div>
      ) : null}
    </div>
  );
}

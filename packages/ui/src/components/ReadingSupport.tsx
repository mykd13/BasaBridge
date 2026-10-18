'use client';

import { ChevronDown, ChevronUp, Square, Volume2 } from 'lucide-react';
import { useEffect, useId, useRef, useState } from 'react';
import type { ButtonHTMLAttributes, KeyboardEvent, MouseEvent, ReactNode } from 'react';
import { IconButton } from './Button';
import { cx } from './util';

export interface SpeakerButtonProps extends Omit<
  ButtonHTMLAttributes<HTMLButtonElement>,
  'children' | 'aria-label'
> {
  /** What it reads, such as "Listen to the question and answers". */
  label: string;
  /** True while the audio plays. The icon changes to stop, and the button reports pressed. */
  playing?: boolean;
  /** md is 48px (S8). lg is 52px (G1, H3). */
  size?: 'md' | 'lg';
}

/** The round speaker button on every instruction and question (ADR 0004). */
export function SpeakerButton({
  label,
  playing,
  size = 'md',
  className,
  type = 'button',
  ...rest
}: SpeakerButtonProps) {
  return (
    <button
      type={type}
      className={cx('bb-speaker', `bb-speaker--${size}`, className)}
      aria-label={label}
      aria-pressed={playing === undefined ? undefined : playing}
      {...rest}
    >
      {playing ? (
        <Square size={20} fill="currentColor" aria-hidden="true" />
      ) : (
        <Volume2 size={26} aria-hidden="true" />
      )}
    </button>
  );
}

export interface SegmentOption<T extends string> {
  value: T;
  label: ReactNode;
  /** A spoken name when the visible label is not words. */
  ariaLabel?: string;
}

export interface SegmentedControlProps<T extends string> {
  /** Names the group, such as "Line spacing". */
  legend: string;
  /** Hide the legend when a heading next to the control already says it. */
  hideLegend?: boolean;
  options: SegmentOption<T>[];
  value: T;
  onChange: (value: T) => void;
  /** tiles: the separate squares of the text size control (I1). */
  variant?: 'pill' | 'tiles';
  name?: string;
}

/**
 * The rounded either-or switch from I1 and the parent header. Built on radio
 * inputs, so arrow keys and screen readers work without extra code.
 */
export function SegmentedControl<T extends string>({
  legend,
  hideLegend = false,
  options,
  value,
  onChange,
  variant = 'pill',
  name,
}: SegmentedControlProps<T>) {
  const autoName = useId();
  const group = name ?? autoName;
  return (
    <fieldset className={cx('bb-seg', `bb-seg--${variant}`)}>
      <legend className={hideLegend ? 'bb-sr-only' : 'bb-seg__legend'}>{legend}</legend>
      <div className="bb-seg__items">
        {options.map((opt) => (
          <label key={opt.value} className="bb-seg__item">
            <input
              type="radio"
              name={group}
              value={opt.value}
              checked={opt.value === value}
              onChange={() => onChange(opt.value)}
              aria-label={opt.ariaLabel}
            />
            <span className="bb-seg__text">{opt.label}</span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}

export type TextSize = 'small' | 'medium' | 'large';

export interface TextSizeControlProps {
  legend: string;
  /** Spoken names for each size, such as { small: 'Small text', ... }. */
  labels: Record<TextSize, string>;
  value: TextSize;
  onChange: (value: TextSize) => void;
  hideLegend?: boolean;
}

/** Three tiles with a growing letter, from reading help (I1). */
export function TextSizeControl({
  legend,
  labels,
  value,
  onChange,
  hideLegend,
}: TextSizeControlProps) {
  const sizes: TextSize[] = ['small', 'medium', 'large'];
  return (
    <SegmentedControl
      legend={legend}
      hideLegend={hideLegend}
      variant="tiles"
      value={value}
      onChange={onChange}
      options={sizes.map((size) => ({
        value: size,
        ariaLabel: labels[size],
        // The letter is a picture of the size, not a word, so it is hidden from screen readers.
        label: (
          <span className={`bb-textsize bb-textsize--${size}`} aria-hidden="true">
            A
          </span>
        ),
      }))}
    />
  );
}

export type LineSpacing = 'normal' | 'wide';

export interface LineSpacingControlProps {
  legend: string;
  labels: Record<LineSpacing, string>;
  value: LineSpacing;
  onChange: (value: LineSpacing) => void;
  hideLegend?: boolean;
}

/** Normal or wide line spacing (I1). */
const LINE_SPACING_VALUES = ['normal', 'wide'] as const;

export function LineSpacingControl({
  legend,
  labels,
  value,
  onChange,
  hideLegend,
}: LineSpacingControlProps) {
  return (
    <SegmentedControl
      legend={legend}
      hideLegend={hideLegend}
      value={value}
      onChange={onChange}
      options={LINE_SPACING_VALUES.map((v) => ({ value: v, label: labels[v] }))}
    />
  );
}

export interface ReadingRulerProps {
  children: ReactNode;
  /** Names the text block, such as "Story". */
  label: string;
  previousLabel: string;
  nextLabel: string;
  /** Called when the highlighted line changes, counting from 0. */
  onLineChange?: (line: number) => void;
}

/**
 * Highlights one line of text at a time (ADR 0004). The learner moves it with
 * the buttons, the arrow keys, or by tapping a line. Other lines keep full
 * contrast; the band only adds a highlight behind the current line.
 */
export function ReadingRuler({
  children,
  label,
  previousLabel,
  nextLabel,
  onLineChange,
}: ReadingRulerProps) {
  const textRef = useRef<HTMLDivElement>(null);
  const [line, setLine] = useState(0);
  const [count, setCount] = useState(1);

  useEffect(() => {
    const el = textRef.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const measure = () => {
      const lh = parseFloat(getComputedStyle(el).lineHeight);
      if (lh > 0) setCount(Math.max(1, Math.round(el.clientHeight / lh)));
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const current = Math.min(line, count - 1);

  function go(next: number) {
    const clamped = Math.min(Math.max(next, 0), count - 1);
    setLine(clamped);
    onLineChange?.(clamped);
  }

  function onKeyDown(e: KeyboardEvent<HTMLDivElement>) {
    if (e.key === 'ArrowDown') go(current + 1);
    else if (e.key === 'ArrowUp') go(current - 1);
    else return;
    e.preventDefault();
  }

  function onClick(e: MouseEvent<HTMLDivElement>) {
    const el = textRef.current;
    if (!el) return;
    const lh = parseFloat(getComputedStyle(el).lineHeight);
    if (lh > 0) go(Math.floor((e.clientY - el.getBoundingClientRect().top) / lh));
  }

  return (
    <div className="bb-ruler">
      <div
        className="bb-ruler__text"
        ref={textRef}
        role="group"
        aria-label={label}
        tabIndex={0}
        onKeyDown={onKeyDown}
        onClick={onClick}
        style={{ ['--ruler-line' as string]: current }}
      >
        <span className="bb-ruler__band" aria-hidden="true" />
        {children}
      </div>
      <div className="bb-ruler__controls">
        <IconButton
          icon={<ChevronUp size={24} />}
          label={previousLabel}
          onClick={() => go(current - 1)}
          disabled={current <= 0}
        />
        <IconButton
          icon={<ChevronDown size={24} />}
          label={nextLabel}
          onClick={() => go(current + 1)}
          disabled={current >= count - 1}
        />
      </div>
    </div>
  );
}

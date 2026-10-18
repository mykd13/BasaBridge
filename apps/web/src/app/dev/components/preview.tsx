'use client';

import {
  Button,
  ButtonLink,
  Card,
  Checkbox,
  Chip,
  Eyebrow,
  Field,
  IconButton,
  LevelCard,
  LineSpacingControl,
  Notice,
  OptionCard,
  OptionList,
  ProgressBar,
  ReadingRuler,
  SegmentedControl,
  SpeakerButton,
  Spinner,
  StepDots,
  Tabs,
  TextSizeControl,
} from '@basabridge/ui';
import type { LineSpacing, OptionState, TextSize } from '@basabridge/ui';
import { ArrowRight, BookOpen, Mic, RotateCcw } from '@basabridge/ui/icons';
import { useEffect, useState } from 'react';
import './preview.css';
import type { ReactNode } from 'react';

/*
 * This page is a developer tool, not learner interface, so its sample words live
 * here instead of the i18n catalog (BB-58). It is never served in production.
 */

type Theme = 'system' | 'light' | 'dark';
type Contrast = 'system' | 'more';

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="preview-section" aria-labelledby={`s-${title}`}>
      <h2 id={`s-${title}`}>{title}</h2>
      {children}
    </section>
  );
}

function Row({ children }: { children: ReactNode }) {
  return <div className="preview-row">{children}</div>;
}

const OPTIONS = [
  'Able to wait without getting upset',
  'Feeling very sleepy',
  'Running fast to the bus',
];

export function ComponentPreview() {
  const [theme, setTheme] = useState<Theme>('system');
  const [contrast, setContrast] = useState<Contrast>('system');
  const [textSize, setTextSize] = useState<TextSize>('medium');
  const [spacing, setSpacing] = useState<LineSpacing>('normal');
  const [tab, setTab] = useState('progress');
  const [picked, setPicked] = useState<number | null>(null);
  const [playing, setPlaying] = useState(false);

  // Apply the preview settings to the whole page, the way reading help (BB-59) will.
  useEffect(() => {
    const root = document.documentElement;
    const set = (key: string, value: string | null) =>
      value ? root.setAttribute(key, value) : root.removeAttribute(key);
    set('data-theme', theme === 'system' ? null : theme);
    set('data-contrast', contrast === 'more' ? 'more' : null);
    set('data-text-size', textSize === 'medium' ? null : textSize);
    set('data-line-spacing', spacing === 'wide' ? 'wide' : null);
    return () => {
      for (const key of ['data-theme', 'data-contrast', 'data-text-size', 'data-line-spacing']) {
        root.removeAttribute(key);
      }
    };
  }, [theme, contrast, textSize, spacing]);

  const optionState = (i: number): OptionState => (picked === i ? 'selected' : 'idle');

  return (
    <main className="preview">
      <header className="preview-head">
        <h1>Components</h1>
        <p>
          Everything in @basabridge/ui, built from design/canvas. Use the controls to check each
          theme and size.
        </p>
        <div className="preview-row">
          <SegmentedControl
            legend="Theme"
            value={theme}
            onChange={setTheme}
            options={[
              { value: 'system', label: 'System' },
              { value: 'light', label: 'Light' },
              { value: 'dark', label: 'Dark' },
            ]}
          />
          <SegmentedControl
            legend="Contrast"
            value={contrast}
            onChange={setContrast}
            options={[
              { value: 'system', label: 'System' },
              { value: 'more', label: 'High' },
            ]}
          />
          <TextSizeControl
            legend="Text size"
            value={textSize}
            onChange={setTextSize}
            labels={{ small: 'Small text', medium: 'Medium text', large: 'Large text' }}
          />
          <LineSpacingControl
            legend="Line spacing"
            value={spacing}
            onChange={setSpacing}
            labels={{ normal: 'Normal', wide: 'Wide' }}
          />
        </div>
      </header>

      <Section title="Buttons">
        <Row>
          <Button icon={<Mic size={22} />}>Start reading</Button>
          <Button variant="secondary">Try again</Button>
          <Button variant="brand" icon={<BookOpen size={22} />}>
            Learn about this
          </Button>
          <Button variant="ghost">Not now</Button>
          <Button disabled>Next</Button>
        </Row>
        <Row>
          <Button size="md">Create account</Button>
          <Button size="md" variant="secondary">
            Copy code
          </Button>
          <Button size="md" variant="danger">
            Remove access
          </Button>
          <ButtonLink href="#s-Buttons" size="md" variant="brand" icon={<ArrowRight size={20} />}>
            A link that looks like a button
          </ButtonLink>
        </Row>
        <Row>
          <IconButton icon={<RotateCcw size={24} />} label="Again" />
          <IconButton icon={<BookOpen size={24} />} label="Learn" variant="brand" />
          <IconButton icon={<Mic size={24} />} label="Read" variant="primary" />
        </Row>
      </Section>

      <Section title="Option cards">
        <OptionList label="Answers">
          {OPTIONS.map((text, i) => (
            <OptionCard
              key={text}
              letter={String.fromCharCode(65 + i)}
              state={optionState(i)}
              onClick={() => setPicked(i)}
            >
              {text}
            </OptionCard>
          ))}
        </OptionList>
        <Eyebrow>After scoring</Eyebrow>
        <OptionList>
          <OptionCard letter="A" state="correct" statusLabel="Correct answer">
            {OPTIONS[0]}
          </OptionCard>
          <OptionCard letter="B" state="wrong" statusLabel="Your answer">
            {OPTIONS[1]}
          </OptionCard>
          <OptionCard letter="C" state="dimmed">
            {OPTIONS[2]}
          </OptionCard>
        </OptionList>
      </Section>

      <Section title="Progress">
        <StepDots current={3} total={5} label="Question 3 of 5" />
        <StepDots current={2} total={4} label="Step 2 of 4" variant="bars" />
        <ProgressBar value={62} label="Level progress" />
        <ProgressBar
          value={6}
          max={10}
          segments={10}
          label="Stories passed"
          valueText="6 of 10"
          size="lg"
        />
        <ProgressBar value={80} label="This try" tone="good" size="lg" />
      </Section>

      <Section title="Level card">
        <div className="preview-grid">
          <LevelCard
            eyebrow="Your level"
            level={12}
            suffix="of 100"
            progress={{ value: 0.62, label: 'Progress in level 12', valueText: '62 percent' }}
          >
            <p>Two more stories to reach level 13.</p>
          </LevelCard>
          <LevelCard eyebrow="New level" level={13} variant="hero" />
        </div>
      </Section>

      <Section title="Chips and tags">
        <Row>
          <Chip>Shared</Chip>
          <Chip tone="warn">New</Chip>
          <Chip tone="good">Learned</Chip>
          <Chip tone="bad">Stopped</Chip>
          <Chip tone="mark">patient</Chip>
          <Chip tone="good" size="lg">
            Passed
          </Chip>
        </Row>
      </Section>

      <Section title="Tabs">
        <Tabs
          label="Parent sections"
          value={tab}
          onChange={setTab}
          tabs={[
            { id: 'progress', label: 'Progress', content: <p>Progress panel.</p> },
            { id: 'readings', label: 'Readings', content: <p>Readings panel.</p> },
            { id: 'decisions', label: 'Decisions', content: <p>Decisions panel.</p> },
            { id: 'data', label: 'Data', content: <p>Data panel.</p> },
          ]}
        />
      </Section>

      <Section title="Notices">
        <Notice title="Allow the microphone">Your browser will ask. Press Allow.</Notice>
        <Notice tone="accent">Your parent sees only what you share.</Notice>
        <Notice tone="good">Saved.</Notice>
        <Notice tone="bad" title="That code did not work">
          Check the letters and try again.
        </Notice>
        <Card emphasis="strong">
          <Eyebrow tone="accent">Teacher note</Eyebrow>
          <p>You read every word. Next, try to slow down at the commas.</p>
        </Card>
      </Section>

      <Section title="Form fields">
        <form className="preview-form" onSubmit={(e) => e.preventDefault()}>
          <Field label="First name" hint="Only your first name. No last name." autoComplete="off" />
          <Field label="Link code" size="lg" error="That code has expired. Ask for a new one." />
          <Checkbox
            label="Keep my recordings"
            description="Off by default. Recordings are deleted after checking."
          />
        </form>
      </Section>

      <Section title="Spinner">
        <Row>
          <Spinner label="Checking your reading" />
          <Spinner label="Loading" size="sm" />
        </Row>
      </Section>

      <Section title="Reading support">
        <Row>
          <SpeakerButton
            label="Listen to the question and answers"
            playing={playing}
            onClick={() => setPlaying((p) => !p)}
          />
          <SpeakerButton label="Listen to this page" size="lg" />
        </Row>
        <ReadingRuler label="Story" previousLabel="Up" nextLabel="Down">
          Mia waited at the gate for her brother. The bus was late, but she did not get upset. She
          sat on the wall and counted the red cars until it came around the corner.
        </ReadingRuler>
      </Section>
    </main>
  );
}

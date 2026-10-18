'use client';

import {
  Card,
  Checkbox,
  Eyebrow,
  LineSpacingControl,
  Notice,
  SegmentedControl,
  TextSizeControl,
} from '@basabridge/ui';
import { useTranslations } from 'next-intl';
import { useState, type ChangeEvent } from 'react';
import { LANGS, type Lang } from '@/i18n/types';
import {
  applyPreset,
  matchingPreset,
  type Presets,
  type PresetName,
  type ReadingHelpState,
} from '@/lib/reading-help/settings';
import { saveMyReadingHelp } from '@/server/reading-help';
import { ReadingHelpText } from './ReadingHelpText';
import { useReadingHelp } from './ReadingHelpProvider';
import styles from './reading-help.module.css';

const PRESET_ORDER = ['standard', 'more'] as const;
const CUSTOM = 'custom';
const ASIDE = 'aside';

/** Reading help settings (canvas I1). Every change shows in the preview at once. */
export function ReadingHelpScreen({ presets }: { presets: Presets }) {
  const t = useTranslations('readingHelp');
  const lang = useTranslations('language');
  const { state, persisted, update } = useReadingHelp();
  // The server copy waits for BB-10. A failed save is not an error for the learner: the
  // device copy already worked, so the screen says where the settings are kept.
  const [serverSaved, setServerSaved] = useState(false);

  function change(next: ReadingHelpState) {
    update(next);
    saveMyReadingHelp(next).then(
      () => setServerSaved(true),
      () => setServerSaved(false),
    );
  }

  function set<K extends keyof ReadingHelpState>(key: K, value: ReadingHelpState[K]) {
    change({ ...state, [key]: value });
  }

  const preset = matchingPreset(state, presets);
  const presetOptions = PRESET_ORDER.map((name) => ({
    value: name,
    label: name === PRESET_ORDER[0] ? t('presetStandard') : t('presetMore'),
  }));
  const languageOptions = LANGS.map((value) => ({ value, label: lang(value) }));
  const textSizeLabels = {
    small: t('textSize.small'),
    medium: t('textSize.medium'),
    large: t('textSize.large'),
  };
  const spacingLabels = { normal: t('lineSpacing.normal'), wide: t('lineSpacing.wide') };

  const choosePreset = (value: PresetName | typeof CUSTOM) => {
    if (value !== CUSTOM) change(applyPreset(state, value, presets));
  };
  const onAudio = (e: ChangeEvent<HTMLInputElement>) => set('audioInstructions', e.target.checked);
  const onQuestions = (e: ChangeEvent<HTMLInputElement>) =>
    set('questionReadAloud', e.target.checked);
  const onSimple = (e: ChangeEvent<HTMLInputElement>) => set('simpleWords', e.target.checked);
  const onRuler = (e: ChangeEvent<HTMLInputElement>) => set('readingRuler', e.target.checked);
  const onContrast = (e: ChangeEvent<HTMLInputElement>) => set('highContrast', e.target.checked);
  const onLanguage = (value: Lang) => set('language', value);
  const onTextSize = (value: ReadingHelpState['textSize']) => set('textSize', value);
  const onSpacing = (value: ReadingHelpState['lineSpacing']) => set('lineSpacing', value);

  return (
    <div className={styles.layout}>
      <section className={styles.column} aria-labelledby="reading-help-title">
        <h1 id="reading-help-title" className={styles.title}>
          {t('title')}
        </h1>

        <SegmentedControl<PresetName | typeof CUSTOM>
          legend={t('presets')}
          hideLegend
          value={preset ?? CUSTOM}
          onChange={choosePreset}
          options={presetOptions}
        />

        <Card className={styles.list}>
          <div className={styles.row}>
            <Checkbox
              label={t('audio.label')}
              description={t('audio.desc')}
              checked={state.audioInstructions}
              onChange={onAudio}
            />
          </div>
          <div className={styles.row}>
            <Checkbox
              label={t('questions.label')}
              description={t('questions.desc')}
              checked={state.questionReadAloud}
              onChange={onQuestions}
            />
          </div>
          <div className={styles.row}>
            <span>
              <span className={styles.rowLabel}>{t('language.label')}</span>
              <span className={styles.rowDesc}>{t('language.desc')}</span>
            </span>
            <SegmentedControl
              legend={t('language.label')}
              hideLegend
              value={state.language}
              onChange={onLanguage}
              options={languageOptions}
            />
          </div>
          <div className={styles.row}>
            <Checkbox
              label={t('simple.label')}
              description={t('simple.desc')}
              checked={state.simpleWords}
              onChange={onSimple}
            />
          </div>
          <div className={styles.row}>
            <span className={styles.rowLabel}>{t('textSize.legend')}</span>
            <TextSizeControl
              legend={t('textSize.legend')}
              hideLegend
              labels={textSizeLabels}
              value={state.textSize}
              onChange={onTextSize}
            />
          </div>
          <div className={styles.row}>
            <span className={styles.rowLabel}>{t('lineSpacing.legend')}</span>
            <LineSpacingControl
              legend={t('lineSpacing.legend')}
              hideLegend
              labels={spacingLabels}
              value={state.lineSpacing}
              onChange={onSpacing}
            />
          </div>
          <div className={styles.row}>
            <Checkbox
              label={t('ruler.label')}
              description={t('ruler.desc')}
              checked={state.readingRuler}
              onChange={onRuler}
            />
          </div>
          <div className={styles.row}>
            <Checkbox
              label={t('contrast.label')}
              description={t('contrast.desc')}
              checked={state.highContrast}
              onChange={onContrast}
            />
          </div>
        </Card>

        <p className={styles.own}>{t('own')}</p>
        {!persisted ? (
          <Notice tone="warn" live="polite">
            {t('status.blocked')}
          </Notice>
        ) : !serverSaved ? (
          <Notice tone="accent" live="polite">
            {t('status.device')}
          </Notice>
        ) : null}
      </section>

      <Card as={ASIDE} className={styles.preview} aria-labelledby="reading-help-preview">
        <Eyebrow>
          <span id="reading-help-preview">{t('preview.title')}</span>
        </Eyebrow>
        <div className={styles.sample}>
          <ReadingHelpText>
            <p>{t('preview.line1')}</p>
            <p>{t('preview.line2')}</p>
            <p>{t('preview.line3')}</p>
          </ReadingHelpText>
        </div>
      </Card>
    </div>
  );
}

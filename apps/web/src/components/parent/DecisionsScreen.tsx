import { ComprehensionSkill } from '@basabridge/contracts';
import { Card, Chip } from '@basabridge/ui';
import { useFormatter, useTranslations } from 'next-intl';
import type { DecisionRow, DecisionsView, ScreenState } from '@/server/parent/types';
import { CARD, PARENT_TIME_ZONE } from './format';
import { ScreenFrame } from './ScreenFrame';

type Params = Record<string, unknown>;

export type DecisionMessage =
  | { key: 'analysis'; answers: number; reduced: number }
  | { key: 'levelUp' | 'levelDown'; level: number }
  | { key: 'focus'; skill: ComprehensionSkill };

const count = (value: unknown): number | null =>
  typeof value === 'number' && Number.isFinite(value) ? value : null;

/**
 * The catalog message for a decision the engine wrote with a messageKey (packages/mastery).
 * Returns null for a key or params this screen does not know, so the row falls back to the
 * decision's own title and summary.
 */
export function decisionMessage(evidence: Params): DecisionMessage | null {
  const params: Params =
    typeof evidence.params === 'object' && evidence.params !== null
      ? (evidence.params as Params)
      : {};
  switch (evidence.messageKey) {
    case 'decision.analysis': {
      const answers = count(params.answers);
      const reduced = count(params.reduced);
      return answers === null || reduced === null ? null : { key: 'analysis', answers, reduced };
    }
    case 'decision.level.up':
    case 'decision.level.down': {
      const level = count(params.level);
      if (level === null) return null;
      return { key: evidence.messageKey === 'decision.level.up' ? 'levelUp' : 'levelDown', level };
    }
    case 'decision.focus': {
      const skill = ComprehensionSkill.safeParse(params.skill);
      return skill.success ? { key: 'focus', skill: skill.data } : null;
    }
    default:
      return null;
  }
}

function useDecisionText(row: DecisionRow): { title: string; body: string } {
  const t = useTranslations();
  const message = decisionMessage(row.decision.evidence);
  switch (message?.key) {
    case 'analysis':
      return {
        title: t('parent.decisions.messages.analysis.title'),
        body: t('parent.decisions.messages.analysis.body', {
          answers: message.answers,
          reduced: message.reduced,
        }),
      };
    case 'levelUp':
    case 'levelDown':
      return {
        title: t(`parent.decisions.messages.${message.key}.title`, { level: message.level }),
        body: t(`parent.decisions.messages.${message.key}.body`),
      };
    case 'focus':
      return {
        title: t('parent.decisions.messages.focus.title', {
          skill: t(`parent.skills.${message.skill}.name`),
        }),
        body: t('parent.decisions.messages.focus.body'),
      };
    default:
      // A decision this screen has no wording for shows the code-written text as it is.
      return { title: row.decision.title, body: row.decision.summary };
  }
}

function Decision({ row }: { row: DecisionRow }) {
  const t = useTranslations();
  const format = useFormatter();
  const when = format.dateTime(new Date(row.at), {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: PARENT_TIME_ZONE,
  });
  const { title, body } = useDecisionText(row);
  return (
    <li>
      <Card as={CARD.article}>
        <div className="bb-parent__row">
          <Chip>{t(`parent.decisions.kinds.${row.decision.kind}`)}</Chip>
          <span className="bb-parent__muted">{when}</span>
        </div>
        <h2>{title}</h2>
        <p>{body}</p>
        {row.basedOn ? (
          <p className="bb-parent__muted">
            {t('parent.decisions.basedOn', { title: row.basedOn })}
          </p>
        ) : null}
      </Card>
    </li>
  );
}

export function DecisionsScreen({ state }: { state: ScreenState<DecisionsView> }) {
  const t = useTranslations();
  return (
    <ScreenFrame screen="decisions" state={state} summary={(data) => data.summary}>
      {(data) => (
        <>
          <p>{t('parent.decisions.intro')}</p>
          <ol className="bb-parent__list" aria-label={t('parent.decisions.list')}>
            {data.decisions.map((row) => (
              <Decision key={row.id} row={row} />
            ))}
          </ol>
        </>
      )}
    </ScreenFrame>
  );
}

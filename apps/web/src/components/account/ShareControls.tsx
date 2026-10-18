'use client';

import { Button, Card, Checkbox, Chip } from '@basabridge/ui';
import { useActionState } from 'react';
import { EMPTY_FORM } from '@/lib/account-forms';
import {
  makeLinkCodeAction,
  setShareFlagAction,
  stopSharingAction,
} from '@/server/actions/sharing';
import { FormError, useFormText } from './form-parts';

export interface ShareLink {
  id: string;
  sharesProgress: boolean;
  sharesAnalysis: boolean;
}

/** The link code block on Share with a parent (E3). A code only exists after the learner makes one. */
export function LinkCodePanel({ code }: { code: string | null }) {
  const [state, action, pending] = useActionState(makeLinkCodeAction, EMPTY_FORM);
  const { t } = useFormText();
  return (
    <Card>
      <h2>{t('account.share.codeTitle')}</h2>
      <FormError state={state} />
      {code ? (
        <p className="bb-account__code" translate="no">
          {code}
        </p>
      ) : (
        <p>{t('account.share.codeEmpty')}</p>
      )}
      <p className="bb-account__muted">{t('account.share.codeHelp')}</p>
      <form action={action}>
        <Button type="submit" variant="secondary" disabled={pending}>
          {t('account.share.makeCode')}
        </Button>
      </form>
    </Card>
  );
}

/** One linked parent with the two share switches and Stop sharing. Voice is never a switch. */
export function LinkedParent({ link }: { link: ShareLink }) {
  const [flagState, flagAction] = useActionState(setShareFlagAction, EMPTY_FORM);
  const [stopState, stopAction, stopping] = useActionState(stopSharingAction, EMPTY_FORM);
  const { t } = useFormText();
  return (
    <Card>
      <Chip tone="good">{t('account.share.linkedOn')}</Chip>
      <FormError state={flagState.error ? flagState : stopState} />
      <form action={flagAction} className="bb-account__form">
        <input type="hidden" name="link" value={link.id} />
        <Checkbox
          name="sharesProgress"
          defaultChecked={link.sharesProgress}
          label={t('account.share.seeProgress')}
          description={t('account.share.seeProgressBody')}
        />
        <Checkbox
          name="sharesAnalysis"
          defaultChecked={link.sharesAnalysis}
          label={t('account.share.seeAnalysis')}
          description={t('account.share.seeAnalysisBody')}
        />
        <Button type="submit" variant="secondary">
          {t('account.share.save')}
        </Button>
      </form>
      <form action={stopAction}>
        <Button type="submit" variant="danger" disabled={stopping}>
          {t('account.share.stop')}
        </Button>
      </form>
    </Card>
  );
}

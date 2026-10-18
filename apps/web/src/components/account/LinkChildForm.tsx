'use client';

import { Checkbox, Field } from '@basabridge/ui';
import { useActionState } from 'react';
import { EMPTY_FORM } from '@/lib/account-forms';
import { linkChildAction } from '@/server/actions/sharing';
import { FormError, SubmitButton, useFormText } from './form-parts';

/** A parent types the code a child made (F1). The server checks it. Not wired until BB-9. */
export function LinkChildForm() {
  const [state, action] = useActionState(linkChildAction, EMPTY_FORM);
  const { t } = useFormText();
  return (
    <form action={action} className="bb-account__form">
      <FormError state={state} />
      <Field
        name="code"
        size="lg"
        label={t('account.parentLink.code')}
        hint={t('account.parentLink.codeHint')}
        autoCapitalize="characters"
        autoComplete="off"
        spellCheck={false}
        required
      />
      <Checkbox name="confirm" required label={t('account.parentLink.confirm')} />
      <SubmitButton>{t('account.parentLink.submit')}</SubmitButton>
    </form>
  );
}

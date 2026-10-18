import { Notice } from '@basabridge/ui';
import { useTranslations } from 'next-intl';
import type { ReactNode } from 'react';
import type { Lang } from '@/i18n/types';
import { PROVIDERS } from '@/legal/providers';
import { kidsSentence } from '@/legal/sentences';
import { parseMarkdown, type Block, type Inline } from '@/legal/markdown';
import { getLegalDoc, type LegalKind } from '@/legal/versions';
import { SpeakParagraph } from './SpeakParagraph';
import './legal.css';

export interface LegalDocumentProps {
  /** Which document. Named `variant` because the lint rule allows that prop name on components. */
  variant: LegalKind;
  lang: Lang;
  /** The privacy contact address, or null when it is not set (never in production). */
  contact: string | null;
}

/** One of the three legal documents, read from its markdown file and drawn as plain elements. */
export function LegalDocument({ variant, lang, contact }: LegalDocumentProps) {
  const t = useTranslations('legal');
  const doc = getLegalDoc(variant, lang);
  const blocks = parseMarkdown(doc.source);

  function inline(items: Inline[]): ReactNode[] {
    return items.map((item, i) => {
      switch (item.type) {
        case 'text':
          return item.value;
        case 'strong':
          return <strong key={i}>{item.value}</strong>;
        case 'link':
          return (
            <a key={i} href={item.href}>
              {item.text}
            </a>
          );
        case 'key':
          return kidsSentence(lang, item.key);
        case 'contact':
          return contact ? (
            <a key={i} href={`mailto:${contact}`}>
              {contact}
            </a>
          ) : (
            <span key={i}>{t('contactMissing')}</span>
          );
      }
    });
  }

  /** The sentences of a block made only of catalog keys, or null for ordinary text. */
  function sentences(items: Inline[]): string[] | null {
    const keys = items.flatMap((item) => (item.type === 'key' ? [item.key] : []));
    const onlyKeys = items.every(
      (item) => item.type === 'key' || (item.type === 'text' && item.value.trim() === ''),
    );
    return keys.length > 0 && onlyKeys ? keys.map((key) => kidsSentence(lang, key)) : null;
  }

  function speaker(items: Inline[]): ReactNode {
    const spoken = sentences(items);
    return spoken ? (
      <SpeakParagraph
        sentences={spoken}
        lang={lang}
        listenLabel={t('speak.listen')}
        stopLabel={t('speak.stop')}
      />
    ) : null;
  }

  function render(block: Block, index: number): ReactNode {
    switch (block.type) {
      case 'heading': {
        if (block.level === 1) {
          return (
            <h1 key={index} id={block.id}>
              {block.text}
            </h1>
          );
        }
        return (
          <h2 key={index} id={block.id}>
            {block.text}
          </h2>
        );
      }
      case 'note':
        return (
          <div key={index} className="bb-legal__note">
            <Notice tone="warn">
              <p>{inline(block.inline)}</p>
            </Notice>
            {speaker(block.inline)}
          </div>
        );
      case 'paragraph':
        return (
          <div key={index} className="bb-legal__paragraph">
            <p>{inline(block.inline)}</p>
            {speaker(block.inline)}
          </div>
        );
      case 'list':
        return (
          <ul key={index}>
            {block.items.map((item, i) => (
              <li key={i}>{inline(item)}</li>
            ))}
          </ul>
        );
      case 'providers':
        return (
          <ul key={index} className="bb-legal__providers" aria-label={t('providers.caption')}>
            {PROVIDERS.map((provider) => (
              <li key={provider.id} className="bb-legal__provider">
                <h3>
                  {provider.name[lang]}
                  {provider.decided ? null : (
                    <span className="bb-legal__tag">{t('providers.undecided')}</span>
                  )}
                </h3>
                <dl>
                  <dt>{t('providers.purpose')}</dt>
                  <dd>{provider.purpose[lang]}</dd>
                  <dt>{t('providers.sees')}</dt>
                  <dd>{provider.sees[lang]}</dd>
                  <dt>{t('providers.neverSees')}</dt>
                  <dd>{provider.neverSees[lang]}</dd>
                </dl>
              </li>
            ))}
          </ul>
        );
    }
  }

  const contactLine = contact
    ? t.rich('contact', {
        email: contact,
        mail: (chunks) => <a href={`mailto:${contact}`}>{chunks}</a>,
      })
    : t('contactMissing');

  return (
    <article className="bb-legal" lang={lang}>
      {blocks.map(render)}
      <p className="bb-legal__version">{t('version', { version: doc.version })}</p>
      <p className="bb-legal__contact">{contactLine}</p>
    </article>
  );
}

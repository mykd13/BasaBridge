import { storageKey } from '@/lib/reading-help/settings';

/**
 * Sets text size, spacing and contrast from this device's copy before the page paints, so a
 * reload does not flash the default size. The provider does the same work after hydration.
 * It only ever reads the learner's own key and ignores anything that is not a known value.
 */
export function ReadingHelpBoot({ learnerId }: { learnerId: string }) {
  const key = JSON.stringify(storageKey(learnerId)).replace(/</g, '\\u003c');
  const code = `try{var s=JSON.parse(localStorage.getItem(${key})||'null');if(s){var r=document.documentElement;
if(['small','medium','large'].indexOf(s.textSize)>-1)r.setAttribute('data-text-size',s.textSize);
if(['normal','wide'].indexOf(s.lineSpacing)>-1)r.setAttribute('data-line-spacing',s.lineSpacing);
if(s.highContrast===true)r.setAttribute('data-contrast','more');}}catch(e){}`;
  return <script dangerouslySetInnerHTML={{ __html: code }} />;
}

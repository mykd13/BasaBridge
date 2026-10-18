import { READING_HELP_PRESETS } from '@basabridge/contracts';
import { ReadingHelpScreen } from '@/components/reading-help/ReadingHelpScreen';

export default function Page() {
  // The contract (and zod) stays on the server. The screen gets plain preset values.
  return <ReadingHelpScreen presets={READING_HELP_PRESETS} />;
}

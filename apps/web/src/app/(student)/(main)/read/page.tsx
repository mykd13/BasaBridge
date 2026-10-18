import { copy } from './copy';
import { MicGate } from './mic-gate';

export const metadata = { title: copy.pageTitle };

export default function ReadPage() {
  return <MicGate />;
}

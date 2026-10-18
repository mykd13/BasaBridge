import { PrivacyScreen } from '@/components/parent/PrivacyScreen';
import { loadPrivacy, toScreenState } from '@/server/parent/loaders';

export default async function Page() {
  return <PrivacyScreen state={await toScreenState(loadPrivacy)} />;
}

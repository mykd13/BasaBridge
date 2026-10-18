import { ProgressScreen } from '@/components/parent/ProgressScreen';
import { LOADING } from '@/server/parent/types';

export default function Loading() {
  return <ProgressScreen state={LOADING} />;
}

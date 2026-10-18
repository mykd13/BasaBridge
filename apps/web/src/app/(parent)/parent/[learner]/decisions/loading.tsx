import { DecisionsScreen } from '@/components/parent/DecisionsScreen';
import { LOADING } from '@/server/parent/types';

export default function Loading() {
  return <DecisionsScreen state={LOADING} />;
}

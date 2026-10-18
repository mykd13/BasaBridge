import { ReadingsScreen } from '@/components/parent/ReadingsScreen';
import { LOADING } from '@/server/parent/types';

export default function Loading() {
  return <ReadingsScreen state={LOADING} />;
}

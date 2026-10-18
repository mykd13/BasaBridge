import { LevelsScreen } from '@/components/parent/LevelsScreen';
import { LOADING } from '@/server/parent/types';

export default function Loading() {
  return <LevelsScreen state={LOADING} />;
}

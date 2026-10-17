import { checkWord } from '../../../../../lib/word-practice/check';

const MAX_AUDIO_BYTES = 1_000_000;
const MAX_WORD_LENGTH = 40;

/**
 * Check one spoken word. Word practice never changes a level and keeps no audio:
 * the blob is read, passed to the check and dropped. Nothing here logs the word or the audio.
 */
export async function POST(request: Request) {
  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return Response.json({ result: 'unavailable' }, { status: 400 });
  }
  const word = form.get('word');
  const audio = form.get('audio');
  if (
    typeof word !== 'string' ||
    word.length === 0 ||
    word.length > MAX_WORD_LENGTH ||
    !(audio instanceof Blob) ||
    audio.size === 0 ||
    audio.size > MAX_AUDIO_BYTES
  ) {
    return Response.json({ result: 'unavailable' }, { status: 400 });
  }
  const result = await checkWord(audio, word);
  return Response.json({ result }, { headers: { 'Cache-Control': 'no-store' } });
}

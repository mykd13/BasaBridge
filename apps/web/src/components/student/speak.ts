/**
 * Read text aloud with the browser's own voice. Only text that is on the screen is spoken,
 * and nothing is sent anywhere. `onEnd` runs when speech finishes, fails or is cancelled.
 */
export function speakText(text: string, onEnd: () => void): void {
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = 'en';
  utterance.onend = onEnd;
  utterance.onerror = onEnd;
  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(utterance);
}

export function canSpeak(): boolean {
  return typeof window !== 'undefined' && 'speechSynthesis' in window;
}

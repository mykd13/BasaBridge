import { tierFor } from '@basabridge/levels';

/**
 * Placeholder landing page. Replace with the sign-in screen (design/canvas A1) in BB-12.
 * It reads the level table only to prove the workspace packages resolve end to end.
 */
export default function Home() {
  const first = tierFor(1);
  return (
    <main style={{ maxWidth: 720, margin: '0 auto', padding: '64px 24px' }}>
      <h1 style={{ fontSize: 40 }}>BasaBridge</h1>
      <p style={{ color: 'var(--muted)' }}>
        Read out loud. Understand more. This is the scaffold: screens are built from design/canvas.
      </p>
      <p style={{ color: 'var(--muted)', fontSize: 15 }}>
        Level 1 stories are {first.words.min} to {first.words.max} words with unlimited tries.
      </p>
    </main>
  );
}

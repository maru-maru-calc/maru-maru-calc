// The puzzle game on the web: a separate entrance from the learning app, with progress of its own
// kept in the browser.
import { PuzzleGame } from '@/components/puzzle/puzzle-game';
import { browserHost } from '@/platform/browser-host';

export default function PuzzlePage() {
  return <PuzzleGame host={browserHost} />;
}

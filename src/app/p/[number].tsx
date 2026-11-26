// The page of one puzzle ("/p/46"): the puzzle game, opened at the puzzle the address names. It is
// a page of its own so that a link to it can show that puzzle's card (scripts/add-route-pages.js
// writes the page each address is served with). A number there is no puzzle for opens the start.
import { PuzzleGame } from '@/components/puzzle/puzzle-game';
import { browserHost } from '@/platform/browser-host';

export default function PuzzleLinkPage() {
  return <PuzzleGame host={browserHost} />;
}

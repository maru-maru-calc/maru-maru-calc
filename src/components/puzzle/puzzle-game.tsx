// The puzzle game: the same board, with nothing to learn and no words.
//
// The start screen is itself a puzzle that shows a rule. Solving it offers the puzzles in order or
// the one-minute game. Where it runs (a web page, YouTube) is the host's business: saving, pausing
// and the signs a platform wants are all asked of `host`.
import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { MarumaruGame } from '@/components/MarumaruGame';
import { FitToScreen } from '@/components/puzzle/fit-to-screen';
import { PuzzleChoice, PuzzleEnd, puzzleScreenStyle, QuickResult, ShareButton } from '@/components/puzzle/parts';
import { PuzzleList } from '@/components/puzzle/puzzle-list';
import { QuickGame } from '@/components/puzzle/quick-game';
import type { MadePuzzle } from '@/game/made-puzzle';
import { createPuzzleGameStage, getPuzzleProgress, pickStartPuzzle, PUZZLE_GAME_STAGES } from '@/game/puzzle-game';
import type { Stage } from '@/game/types';
import type { GameHost } from '@/platform/game-host';
import { loadPuzzleProgress, savePuzzleProgress } from '@/storage/puzzle-progress';
import { addQuickScore, addSolvedPuzzle } from '@/storage/puzzle-progress-codec';
import type { PuzzleProgress } from '@/storage/puzzle-progress-codec';

type Screen =
  | { name: 'start'; stage: Stage; round: number; isSolved: boolean }
  | { name: 'play'; firstIndex: number; round: number }
  | { name: 'list' }
  | { name: 'quick'; round: number }
  | { name: 'quickResult'; solved: number; rank: number | undefined }
  // Making a puzzle: the bubbles, the board that finds the goal, the finished puzzle.
  | { name: 'make'; bubbles: number[] }
  | { name: 'makeBoard'; bubbles: number[]; round: number }
  | { name: 'made'; puzzle: MadePuzzle }
  // A made puzzle being played: one that came by its address, or the maker's own (for whom "back" leads to the finished puzzle).
  // The stage is made once and kept: a new one on every drawing would start the board over.
  | { name: 'playMade'; puzzle: MadePuzzle; stage: Stage; round: number; isSolved: boolean; isOwn: boolean }
  | { name: 'end' };

export function PuzzleGame({ host }: { host: GameHost }) {
  return (
    <FitToScreen>
      <PuzzleScreens host={host} />
    </FitToScreen>
  );
}

function PuzzleScreens({ host }: { host: GameHost }) {
  const [progress, setProgress] = useState<PuzzleProgress | undefined>(undefined);
  const [screen, setScreen] = useState<Screen | undefined>(undefined);

  useEffect(() => {
    let isCurrent = true;
    void loadPuzzleProgress(host.saveSlot, host.loadTimeoutMs).then((loaded) => {
      if (isCurrent) {
        setProgress(loaded);
        // A visit by the address of a shared puzzle goes straight to that puzzle.
        const requested = host.getRequestedPuzzle?.(PUZZLE_GAME_STAGES.length);
        setScreen(
          requested === undefined
            ? { name: 'start', stage: createPuzzleGameStage(pickStartPuzzle(loaded.startVisits), 1), round: 0, isSolved: false }
            : 'made' in requested
              ? host.making
                ? { name: 'playMade', puzzle: requested.made, stage: host.making.createStage(requested.made), round: 0, isSolved: false, isOwn: false }
                : { name: 'start', stage: createPuzzleGameStage(pickStartPuzzle(loaded.startVisits), 1), round: 0, isSolved: false }
              : { name: 'play', firstIndex: requested.number - 1, round: 0 },
        );
      }
    });
    return () => {
      isCurrent = false;
    };
    // The host is the same for the life of the page.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const isUp = progress !== undefined && screen !== undefined;
  useEffect(() => {
    if (isUp) {
      host.noteReady();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isUp]);

  if (!progress || !screen) {
    // Saved progress loads within a moment; only the water is shown until then.
    return <SafeAreaView style={puzzleScreenStyle} />;
  }

  const update = (next: PuzzleProgress) => {
    if (next !== progress) {
      setProgress(next);
      savePuzzleProgress(next, host.saveSlot);
    }
  };
  const showStart = () => {
    setScreen({ name: 'start', stage: createPuzzleGameStage(pickStartPuzzle(progress.startVisits), 1), round: Date.now(), isSolved: false });
  };
  const showPuzzles = () => {
    const { next } = getPuzzleProgress(progress.solved);
    setScreen(next === undefined ? { name: 'end' } : { name: 'play', firstIndex: next - 1, round: Date.now() });
  };
  const showQuick = () => {
    setScreen({ name: 'quick', round: Date.now() });
  };
  // A made puzzle exists only in the address it is sent with: where nothing can be sent, none can be made.
  const { preparePuzzleShare, making } = host;
  const showMaker = preparePuzzleShare && making ? () => setScreen({ name: 'make', bubbles: making.firstBubbles }) : undefined;

  if (screen.name === 'start') {
    return (
      <View style={puzzleScreenStyle}>
        <MarumaruGame
          key={`start-${screen.round}`}
          stages={[screen.stage]}
          stageMark={0}
          showsGoalAsMaru={false}
          onStageClear={() => {
            update({ ...progress, startVisits: progress.startVisits + 1 });
            setScreen({ ...screen, isSolved: true });
          }}
          onLastStageNext={showPuzzles}
        />
        {screen.isSolved ? (
          <PuzzleChoice nextPuzzle={getPuzzleProgress(progress.solved).next} best={progress.quickScores[0]} onPuzzles={showPuzzles} onQuick={showQuick} onMake={showMaker} />
        ) : null}
      </View>
    );
  }

  if (screen.name === 'play') {
    return (
      <MarumaruGame
        key={`play-${screen.round}`}
        stages={PUZZLE_GAME_STAGES}
        showsGoalAsMaru={false}
        initialStageIndex={screen.firstIndex}
        onBack={() => setScreen({ name: 'list' })}
        onStageClear={(stageId) => update(addSolvedPuzzle(progress, stageId))}
        onLastStageNext={() => setScreen({ name: 'end' })}
        cornerSlot={
          preparePuzzleShare
            ? (stage, number) => <ShareButton label="share this puzzle" testID="share-puzzle" shareKey={stage.id} prepare={() => preparePuzzleShare({ number }, stage)} />
            : undefined
        }
      />
    );
  }

  if (screen.name === 'list') {
    return (
      <PuzzleList
        solvedIds={progress.solved}
        nextPuzzle={getPuzzleProgress(progress.solved).next}
        onPick={(number) => setScreen({ name: 'play', firstIndex: number - 1, round: Date.now() })}
        onBack={showStart}
      />
    );
  }

  if (screen.name === 'quick') {
    return (
      <QuickGame
        key={`quick-${screen.round}`}
        onBack={showStart}
        onPauseChange={host.onPauseChange}
        onFinish={(solved) => {
          const added = addQuickScore(progress, solved);
          update(added.progress);
          if (added.rank === 0) {
            host.noteBestQuickScore(solved);
          }
          setScreen({ name: 'quickResult', solved, rank: added.rank });
        }}
      />
    );
  }

  if (screen.name === 'make' && making) {
    return (
      <making.Bubbles
        bubbles={screen.bubbles}
        onChange={(bubbles) => setScreen({ name: 'make', bubbles })}
        onBack={showStart}
        onNext={() => setScreen({ name: 'makeBoard', bubbles: screen.bubbles, round: Date.now() })}
      />
    );
  }

  if (screen.name === 'makeBoard' && making) {
    return (
      <making.Board
        key={`make-${screen.round}`}
        bubbles={screen.bubbles}
        onBack={() => setScreen({ name: 'make', bubbles: screen.bubbles })}
        onMade={(puzzle) => setScreen({ name: 'made', puzzle })}
      />
    );
  }

  if (screen.name === 'made' && making && preparePuzzleShare) {
    const { puzzle } = screen;
    return (
      <making.Finished
        puzzle={puzzle}
        prepareShare={preparePuzzleShare}
        onBack={() => setScreen({ name: 'make', bubbles: puzzle.bubbles })}
        onAgain={() => setScreen({ name: 'makeBoard', bubbles: puzzle.bubbles, round: Date.now() })}
        onPlay={() => setScreen({ name: 'playMade', puzzle, stage: making.createStage(puzzle), round: Date.now(), isSolved: false, isOwn: true })}
      />
    );
  }

  if (screen.name === 'playMade') {
    const { puzzle } = screen;
    return (
      <View style={puzzleScreenStyle}>
        <MarumaruGame
          key={`made-${screen.round}`}
          stages={[screen.stage]}
          stageMark="pencil"
          showsGoalAsMaru={false}
          // The maker goes back to the finished puzzle; someone who came by its address, to the start.
          onBack={screen.isOwn ? () => setScreen({ name: 'made', puzzle }) : showStart}
          onStageClear={() => setScreen({ ...screen, isSolved: true })}
          onLastStageNext={showStart}
          cornerSlot={
            preparePuzzleShare
              ? (stage) => <ShareButton label="share this puzzle" testID="share-puzzle" shareKey={stage.id} prepare={() => preparePuzzleShare({ made: puzzle }, stage)} />
              : undefined
          }
        />
        {/* Solved: on to the numbered puzzles, the one-minute game, or a puzzle of one's own to send back. */}
        {screen.isSolved ? (
          <PuzzleChoice nextPuzzle={getPuzzleProgress(progress.solved).next} best={progress.quickScores[0]} onPuzzles={showPuzzles} onQuick={showQuick} onMake={showMaker} />
        ) : null}
      </View>
    );
  }

  if (screen.name === 'quickResult') {
    return <QuickResult solved={screen.solved} scores={progress.quickScores} rank={screen.rank} prepareShare={host.prepareResultShare} onAgain={showQuick} onBack={showStart} />;
  }

  return <PuzzleEnd solved={getPuzzleProgress(progress.solved).solved} total={PUZZLE_GAME_STAGES.length} onBack={showStart} />;
}

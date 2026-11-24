// The puzzle game: a separate entrance to the same board, with nothing to learn and no words.
//
// The start screen is itself a puzzle that shows a rule. Solving it offers the puzzles in order or
// the one-minute game. Its progress is kept apart from the learning app's.
import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { MarumaruGame } from '@/components/MarumaruGame';
import { PuzzleChoice, PuzzleEnd, puzzleScreenStyle, QuickResult } from '@/components/puzzle/parts';
import { QuickGame } from '@/components/puzzle/quick-game';
import { createPuzzleGameStage, getPuzzleProgress, pickStartPuzzle, PUZZLE_GAME_STAGES } from '@/game/puzzle-game';
import type { Stage } from '@/game/types';
import { loadPuzzleProgress, savePuzzleProgress } from '@/storage/puzzle-progress';
import { addQuickScore, addSolvedPuzzle } from '@/storage/puzzle-progress-codec';
import type { PuzzleProgress } from '@/storage/puzzle-progress-codec';

type Screen =
  | { name: 'start'; stage: Stage; round: number; isSolved: boolean }
  | { name: 'play'; firstIndex: number; round: number }
  | { name: 'quick'; round: number }
  | { name: 'quickResult'; solved: number; rank: number | undefined }
  | { name: 'end' };

export default function PuzzlePage() {
  const [progress, setProgress] = useState<PuzzleProgress | undefined>(undefined);
  const [screen, setScreen] = useState<Screen | undefined>(undefined);

  useEffect(() => {
    let isCurrent = true;
    void loadPuzzleProgress().then((loaded) => {
      if (isCurrent) {
        setProgress(loaded);
        setScreen({ name: 'start', stage: createPuzzleGameStage(pickStartPuzzle(loaded.startVisits), 1), round: 0, isSolved: false });
      }
    });
    return () => {
      isCurrent = false;
    };
  }, []);

  if (!progress || !screen) {
    // Saved progress loads within a moment; only the water is shown until then.
    return <SafeAreaView style={puzzleScreenStyle} />;
  }

  const update = (next: PuzzleProgress) => {
    if (next !== progress) {
      setProgress(next);
      savePuzzleProgress(next);
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

  if (screen.name === 'start') {
    return (
      <View style={puzzleScreenStyle}>
        <MarumaruGame
          key={`start-${screen.round}`}
          stages={[screen.stage]}
          showsStageNumber={false}
          showsGoalAsMaru={false}
          onStageClear={() => {
            update({ ...progress, startVisits: progress.startVisits + 1 });
            setScreen({ ...screen, isSolved: true });
          }}
          onLastStageNext={showPuzzles}
        />
        {screen.isSolved ? (
          <PuzzleChoice nextPuzzle={getPuzzleProgress(progress.solved).next} best={progress.quickScores[0]} onPuzzles={showPuzzles} onQuick={showQuick} />
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
        onBack={showStart}
        onStageClear={(stageId) => update(addSolvedPuzzle(progress, stageId))}
        onLastStageNext={() => setScreen({ name: 'end' })}
      />
    );
  }

  if (screen.name === 'quick') {
    return (
      <QuickGame
        key={`quick-${screen.round}`}
        onBack={showStart}
        onFinish={(solved) => {
          const added = addQuickScore(progress, solved);
          update(added.progress);
          setScreen({ name: 'quickResult', solved, rank: added.rank });
        }}
      />
    );
  }

  if (screen.name === 'quickResult') {
    return <QuickResult solved={screen.solved} scores={progress.quickScores} rank={screen.rank} onAgain={showQuick} onBack={showStart} />;
  }

  return <PuzzleEnd solved={getPuzzleProgress(progress.solved).solved} total={PUZZLE_GAME_STAGES.length} onBack={showStart} />;
}

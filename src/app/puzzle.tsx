// The puzzle game: a separate entrance to the same board, with nothing to learn and no words.
//
// Start screen (itself a puzzle that shows a rule) → the puzzles in order → an end screen once
// every puzzle is solved. Its progress is kept apart from the learning app's.
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { MarumaruGame } from '@/components/MarumaruGame';
import { NavImageIcon } from '@/components/NavImageIcon';
import { createPuzzleGameStage, getPuzzleProgress, pickStartPuzzle, PUZZLE_GAME_STAGES } from '@/game/puzzle-game';
import type { Stage } from '@/game/types';
import { a11yLabel } from '@/i18n/a11y-label';
import { loadPuzzleProgress, savePuzzleProgress } from '@/storage/puzzle-progress';
import { addSolvedPuzzle } from '@/storage/puzzle-progress-codec';
import type { PuzzleProgress } from '@/storage/puzzle-progress-codec';

type Screen =
  | { name: 'start'; stage: Stage; round: number }
  | { name: 'play'; firstIndex: number; round: number }
  | { name: 'end' };

export default function PuzzlePage() {
  const [progress, setProgress] = useState<PuzzleProgress | undefined>(undefined);
  const [screen, setScreen] = useState<Screen | undefined>(undefined);

  useEffect(() => {
    let isCurrent = true;
    void loadPuzzleProgress().then((loaded) => {
      if (isCurrent) {
        setProgress(loaded);
        setScreen({ name: 'start', stage: createPuzzleGameStage(pickStartPuzzle(loaded.startVisits), 1), round: 0 });
      }
    });
    return () => {
      isCurrent = false;
    };
  }, []);

  if (!progress || !screen) {
    // Saved progress loads within a moment; only the water is shown until then.
    return <SafeAreaView style={styles.screen} />;
  }

  const update = (next: PuzzleProgress) => {
    if (next !== progress) {
      setProgress(next);
      savePuzzleProgress(next);
    }
  };
  const showStart = () => {
    setScreen({ name: 'start', stage: createPuzzleGameStage(pickStartPuzzle(progress.startVisits), 1), round: Date.now() });
  };

  if (screen.name === 'start') {
    return (
      <MarumaruGame
        key={`start-${screen.round}`}
        stages={[screen.stage]}
        showsStageNumber={false}
        showsGoalAsMaru={false}
        onStageClear={() => update({ ...progress, startVisits: progress.startVisits + 1 })}
        onLastStageNext={() => {
          const { next } = getPuzzleProgress(progress.solved);
          setScreen(next === undefined ? { name: 'end' } : { name: 'play', firstIndex: next - 1, round: Date.now() });
        }}
      />
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

  // Nothing is left to solve. The count says so without words.
  const { solved } = getPuzzleProgress(progress.solved);
  return (
    <SafeAreaView style={styles.screen}>
      <View testID="puzzle-end" style={styles.end}>
        <Text style={styles.endMark}>✓</Text>
        <Text testID="puzzle-end-count" style={styles.endCount}>{solved} / {PUZZLE_GAME_STAGES.length}</Text>
        <Pressable
          accessibilityLabel={a11yLabel('Back')}
          accessibilityRole="button"
          testID="puzzle-end-back"
          onPress={showStart}
          style={({ pressed }) => [styles.endButton, pressed && styles.endButtonPressed]}
        >
          <NavImageIcon kind="back" size={30} />
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#C6E8F4',
  },
  end: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  endMark: {
    color: '#0284C7',
    fontSize: 96,
    lineHeight: 104,
    fontWeight: '900',
    fontFamily: 'Helvetica',
  },
  endCount: {
    color: '#12334A',
    fontSize: 32,
    lineHeight: 40,
    fontWeight: '900',
    fontFamily: 'Helvetica',
  },
  endButton: {
    marginTop: 24,
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.58)',
    borderWidth: 3,
    borderColor: 'rgba(186, 230, 253, 0.72)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  endButtonPressed: {
    opacity: 0.6,
  },
});

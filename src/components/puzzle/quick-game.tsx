// The one-minute game: one-way puzzles of three bubbles, one after another, until the time is up.
import { useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { MarumaruGame } from '@/components/MarumaruGame';
import { createPuzzleGameStage, createQuickPuzzle } from '@/game/puzzle-game';

export const QUICK_GAME_MS = 60_000;
// The bar stands full for a moment before it starts to run down.
const GET_READY_MS = 1000;
// How long the last bubble's pop is left on screen before the next puzzle (or the same one again).
const AFTER_LAST_BUBBLE_MS = 220;
const TICK_MS = 100;

export function QuickGame({
  onFinish,
  onBack,
  onPauseChange,
}: {
  onFinish: (solved: number) => void;
  onBack: () => void;
  /** Tells the clock when the game is put on hold (the tab is hidden, or the platform says pause). */
  onPauseChange: (listener: (isPaused: boolean) => void) => () => void;
}) {
  const [puzzle, setPuzzle] = useState(() => createQuickPuzzle());
  const [solved, setSolved] = useState(0);
  const [resetSignal, setResetSignal] = useState(0);
  const [timeLeft, setTimeLeft] = useState(QUICK_GAME_MS);
  const insets = useSafeAreaInsets();
  const solvedRef = useRef(0);
  const isOverRef = useRef(false);
  const stages = useMemo(() => [createPuzzleGameStage(puzzle, 1)], [puzzle]);
  const onFinishRef = useRef(onFinish);
  onFinishRef.current = onFinish;

  useEffect(() => {
    // Time counts only while the game is not on hold: the clock adds up the stretches between
    // ticks, and a stretch spent on hold is left out.
    let spent = 0;
    let countedUpTo = Date.now();
    let isOnHold = false;
    const stopListening = onPauseChange((isPaused) => {
      const now = Date.now();
      if (isPaused && !isOnHold) {
        spent += now - countedUpTo;
      }
      isOnHold = isPaused;
      countedUpTo = now;
    });
    const interval = setInterval(() => {
      if (isOnHold) {
        return;
      }
      const now = Date.now();
      spent += now - countedUpTo;
      countedUpTo = now;
      const left = Math.max(0, Math.min(QUICK_GAME_MS, GET_READY_MS + QUICK_GAME_MS - spent));
      setTimeLeft(left);
      if (left <= 0 && !isOverRef.current) {
        isOverRef.current = true;
        clearInterval(interval);
        onFinishRef.current(solvedRef.current);
      }
    }, TICK_MS);
    return () => {
      clearInterval(interval);
      stopListening();
    };
    // The clock runs once for the life of this screen; the host's way of telling about pauses does not change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleAllBubblesUsed = (isGoal: boolean) => {
    setTimeout(() => {
      if (isOverRef.current) {
        return;
      }
      if (isGoal) {
        solvedRef.current += 1;
        setSolved(solvedRef.current);
        setPuzzle((current) => createQuickPuzzle(Math.random, current));
      } else {
        // Not the goal: the same puzzle again, at the cost of the time it took.
        setResetSignal((current) => current + 1);
      }
    }, AFTER_LAST_BUBBLE_MS);
  };

  return (
    <View style={styles.screen}>
      <MarumaruGame
        stages={stages}
        stageMark="clock"
        showsGoalAsMaru={false}
        onBack={onBack}
        onAllBubblesUsed={handleAllBubblesUsed}
        resetSignal={resetSignal}
        cornerBadge={String(solved)}
      />
      {/* Below a phone's notch, so the time left is never hidden. */}
      <View pointerEvents="none" style={[styles.timeTrack, { top: insets.top }]}>
        <View testID="quick-time-left" style={[styles.timeLeft, { width: `${(timeLeft / QUICK_GAME_MS) * 100}%` }]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  timeTrack: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    height: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
  },
  timeLeft: {
    height: 8,
    backgroundColor: '#0284C7',
    borderTopRightRadius: 4,
    borderBottomRightRadius: 4,
  },
});

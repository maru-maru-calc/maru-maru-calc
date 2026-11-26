// The puzzle game's own small screens: the choice after the start puzzle, the one-minute result, the end.
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useBoardViewport } from '@/components/marumaru/board-viewport';
import { HEADER_ACTION_BUTTON_SIZE, RADIUS_LG } from '@/components/marumaru/constants';
import { ClockIcon, NavImageIcon } from '@/components/NavImageIcon';
import { a11yLabel } from '@/i18n/a11y-label';
import { SIDE_PANEL_WIDTH } from '@/layout/fit-board';

const INK = '#12334A';
const ACCENT = '#0284C7';
const WATER = '#C6E8F4';
const FONT = 'Helvetica';

/**
 * Shown over the board once the start puzzle is solved: on to the puzzles in order, or the
 * one-minute game. No words; the numbers say where each stands.
 */
export function PuzzleChoice({ nextPuzzle, best, onPuzzles, onQuick }: { nextPuzzle: number | undefined; best: number | undefined; onPuzzles: () => void; onQuick: () => void }) {
  // Over the bowl: beside the panel when the board is laid out side by side.
  const isSideBySide = useBoardViewport().arrangement === 'sideBySide';

  return (
    <View pointerEvents="box-none" testID="puzzle-choice" style={[styles.choiceLayer, isSideBySide && styles.choiceLayerBesidePanel]}>
      <View style={styles.choiceRow}>
        <Pressable accessibilityLabel={a11yLabel('puzzles in order')} accessibilityRole="button" testID="choose-puzzles" onPress={onPuzzles} style={({ pressed }) => [styles.choice, pressed && styles.pressed]}>
          <NavImageIcon kind="next" size={34} />
          <Text testID="choose-puzzles-number" style={styles.choiceNumber}>{nextPuzzle === undefined ? '✓' : `#${nextPuzzle}`}</Text>
        </Pressable>
        <Pressable accessibilityLabel={a11yLabel('one-minute game')} accessibilityRole="button" testID="choose-quick" onPress={onQuick} style={({ pressed }) => [styles.choice, pressed && styles.pressed]}>
          <ClockIcon size={34} />
          <Text testID="choose-quick-best" style={styles.choiceNumber}>{best === undefined ? '–' : String(best)}</Text>
        </Pressable>
      </View>
    </View>
  );
}

/** After a minute: how many were solved, and the player's own five best. */
export function QuickResult({ solved, scores, rank, onAgain, onBack }: { solved: number; scores: number[]; rank: number | undefined; onAgain: () => void; onBack: () => void }) {
  // On a screen that is wider than tall there is no room for all of it in a column: the count
  // and the five best go side by side.
  const isSideBySide = useBoardViewport().arrangement === 'sideBySide';
  const count = (
    <>
      <ClockIcon size={44} />
      <Text testID="quick-result-count" style={styles.bigNumber}>{solved}</Text>
    </>
  );
  const best = (
    <View testID="quick-result-best" style={styles.bestList}>
      {scores.map((score, index) => (
        <View key={`${index}-${score}`} testID={index === rank ? 'quick-result-rank' : undefined} style={[styles.bestRow, index === rank && styles.bestRowCurrent]}>
          <Text style={styles.bestPlace}>{index + 1}</Text>
          <Text style={styles.bestScore}>{score}</Text>
        </View>
      ))}
    </View>
  );

  return (
    <SafeAreaView style={styles.screen}>
      <View testID="quick-result" style={styles.center}>
        {isSideBySide ? (
          <View style={styles.resultRow}>
            <View style={styles.resultCount}>{count}</View>
            {best}
          </View>
        ) : (
          <>
            {count}
            {best}
          </>
        )}
        <View style={styles.buttonRow}>
          <Pressable accessibilityLabel={a11yLabel('Back')} accessibilityRole="button" testID="quick-result-back" onPress={onBack} style={({ pressed }) => [styles.button, pressed && styles.pressed]}>
            <NavImageIcon kind="back" size={29} />
          </Pressable>
          <Pressable accessibilityLabel={a11yLabel('play again')} accessibilityRole="button" testID="quick-result-again" onPress={onAgain} style={({ pressed }) => [styles.button, pressed && styles.pressed]}>
            <NavImageIcon kind="retry" size={29} />
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
}

/** Nothing is left to solve. The count says so without words. */
export function PuzzleEnd({ solved, total, onBack }: { solved: number; total: number; onBack: () => void }) {
  return (
    <SafeAreaView style={styles.screen}>
      <View testID="puzzle-end" style={styles.center}>
        <Text style={styles.endMark}>✓</Text>
        <Text testID="puzzle-end-count" style={styles.endCount}>{solved} / {total}</Text>
        <View style={styles.buttonRow}>
          <Pressable accessibilityLabel={a11yLabel('Back')} accessibilityRole="button" testID="puzzle-end-back" onPress={onBack} style={({ pressed }) => [styles.button, pressed && styles.pressed]}>
            <NavImageIcon kind="back" size={29} />
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
}

export const puzzleScreenStyle = { flex: 1, backgroundColor: WATER } as const;

const styles = StyleSheet.create({
  screen: puzzleScreenStyle,
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  choiceLayer: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  choiceLayerBesidePanel: {
    left: SIDE_PANEL_WIDTH,
  },
  resultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 48,
  },
  resultCount: {
    alignItems: 'center',
    gap: 8,
  },
  choiceRow: {
    flexDirection: 'row',
    gap: 20,
  },
  choice: {
    width: 112,
    height: 112,
    borderRadius: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.86)',
    borderWidth: 3,
    borderColor: 'rgba(125, 211, 252, 0.9)',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  choiceNumber: {
    color: INK,
    fontSize: 22,
    lineHeight: 26,
    fontWeight: '900',
    fontFamily: FONT,
  },
  bigNumber: {
    color: INK,
    fontSize: 104,
    lineHeight: 112,
    fontWeight: '900',
    fontFamily: FONT,
  },
  bestList: {
    gap: 6,
    minHeight: 40,
  },
  bestRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: 132,
    paddingHorizontal: 14,
    paddingVertical: 4,
    borderRadius: 12,
  },
  bestRowCurrent: {
    backgroundColor: 'rgba(255, 255, 255, 0.86)',
  },
  bestPlace: {
    color: ACCENT,
    fontSize: 18,
    lineHeight: 24,
    fontWeight: '900',
    fontFamily: FONT,
  },
  bestScore: {
    color: INK,
    fontSize: 22,
    lineHeight: 26,
    fontWeight: '900',
    fontFamily: FONT,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 16,
    marginTop: 16,
  },
  // The same button as on the board.
  button: {
    width: HEADER_ACTION_BUTTON_SIZE,
    height: HEADER_ACTION_BUTTON_SIZE,
    borderRadius: RADIUS_LG,
    backgroundColor: 'rgba(255, 255, 255, 0.26)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: {
    opacity: 0.6,
  },
  endMark: {
    color: ACCENT,
    fontSize: 96,
    lineHeight: 104,
    fontWeight: '900',
    fontFamily: FONT,
  },
  endCount: {
    color: INK,
    fontSize: 32,
    lineHeight: 40,
    fontWeight: '900',
    fontFamily: FONT,
  },
});

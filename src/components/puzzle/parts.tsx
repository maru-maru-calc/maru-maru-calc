// The puzzle game's own small screens: the choice after the start puzzle, the one-minute result, the end.
import { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useBoardViewport } from '@/components/marumaru/board-viewport';
import { HEADER_ACTION_BUTTON_SIZE, RADIUS_LG } from '@/components/marumaru/constants';
import { ClockIcon, NavImageIcon, PencilIcon } from '@/components/NavImageIcon';
import { a11yLabel } from '@/i18n/a11y-label';
import { SIDE_PANEL_WIDTH } from '@/layout/fit-board';
import type { GameHost, PictureShare } from '@/platform/game-host';

const INK = '#12334A';
const ACCENT = '#0284C7';
const WATER = '#C6E8F4';
const FONT = 'Helvetica';

/**
 * Shown over the board once the start puzzle is solved: on to the puzzles in order, or the
 * one-minute game. No words; the numbers say where each stands.
 */
export function PuzzleChoice({
  nextPuzzle,
  best,
  onPuzzles,
  onQuick,
  onMake,
}: {
  nextPuzzle: number | undefined;
  best: number | undefined;
  onPuzzles: () => void;
  onQuick: () => void;
  /** Making a puzzle of one's own, where the game can send one. */
  onMake: (() => void) | undefined;
}) {
  // Over the bowl: beside the panel when the board is laid out side by side.
  const isSideBySide = useBoardViewport().arrangement === 'sideBySide';
  // Three in a row are narrower, so the row still fits the narrowest board.
  const choiceStyle = onMake ? [styles.choice, styles.choiceOfThree] : styles.choice;

  return (
    <View pointerEvents="box-none" testID="puzzle-choice" style={[styles.choiceLayer, isSideBySide && styles.choiceLayerBesidePanel]}>
      <View style={[styles.choiceRow, onMake && styles.choiceRowOfThree]}>
        <Pressable accessibilityLabel={a11yLabel('puzzles in order')} accessibilityRole="button" testID="choose-puzzles" onPress={onPuzzles} style={({ pressed }) => [choiceStyle, pressed && styles.pressed]}>
          <NavImageIcon kind="next" size={34} />
          <Text testID="choose-puzzles-number" style={styles.choiceNumber}>{nextPuzzle === undefined ? '✓' : `#${nextPuzzle}`}</Text>
        </Pressable>
        <Pressable accessibilityLabel={a11yLabel('one-minute game')} accessibilityRole="button" testID="choose-quick" onPress={onQuick} style={({ pressed }) => [choiceStyle, pressed && styles.pressed]}>
          <ClockIcon size={34} />
          <Text testID="choose-quick-best" style={styles.choiceNumber}>{best === undefined ? '–' : String(best)}</Text>
        </Pressable>
        {onMake ? (
          <Pressable accessibilityLabel={a11yLabel('make a puzzle')} accessibilityRole="button" testID="choose-make" onPress={onMake} style={({ pressed }) => [choiceStyle, pressed && styles.pressed]}>
            <PencilIcon size={34} />
            <Text style={styles.choiceNumber}>?</Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

/**
 * The button that hands a picture to the device's "share". The picture is drawn as soon as there
 * is something to show (a browser only opens the share sheet in the moment of a tap, with nothing
 * to wait for), and the button appears once there is a picture to hand over. `shareKey` says what
 * the picture shows: a new key draws a new picture.
 */
export function ShareButton({ label, testID, shareKey, prepare }: { label: string; testID: string; shareKey: string; prepare: () => Promise<PictureShare | undefined> }) {
  const [ready, setReady] = useState<{ key: string; share: PictureShare } | undefined>(undefined);
  const prepareRef = useRef(prepare);
  prepareRef.current = prepare;
  useEffect(() => {
    let isCurrent = true;
    let made: PictureShare | undefined;
    void prepareRef.current().then(
      (share) => {
        if (!share) {
          return;
        }
        if (isCurrent) {
          made = share;
          setReady({ key: shareKey, share });
        } else {
          // Drawn too late to be of use: the screen has moved on.
          share.release();
        }
      },
      () => {},
    );
    return () => {
      isCurrent = false;
      // A picture is kept in memory until it is let go: one for every puzzle played would add up.
      made?.release();
    };
  }, [shareKey]);

  // A picture of something else (the puzzle before this one) is not handed over.
  if (!ready || ready.key !== shareKey) {
    return null;
  }
  return (
    <Pressable accessibilityLabel={a11yLabel(label)} accessibilityRole="button" testID={testID} onPress={() => ready.share.share()} style={({ pressed }) => [styles.button, pressed && styles.pressed]}>
      <NavImageIcon kind="share" size={29} />
    </Pressable>
  );
}

/**
 * After a minute: how many were solved, and the player's own five best. Where the game may lead
 * out of itself, a third button hands a picture of the result to the device's "share".
 */
export function QuickResult({
  solved,
  scores,
  rank,
  prepareShare,
  onAgain,
  onBack,
}: {
  solved: number;
  scores: number[];
  rank: number | undefined;
  prepareShare: GameHost['prepareResultShare'];
  onAgain: () => void;
  onBack: () => void;
}) {
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
          {prepareShare ? <ShareButton label="share the result" testID="quick-result-share" shareKey={`result-${solved}`} prepare={() => prepareShare(solved)} /> : null}
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
  choiceRowOfThree: {
    gap: 10,
  },
  choiceOfThree: {
    width: 96,
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

// Making a puzzle, without words: choose the bubbles, work them out on the board (what they come
// to is the goal), then see the puzzle as it will be sent. Or choose only how many bubbles and
// let the die do the rest.
import { useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { MarumaruGame } from '@/components/MarumaruGame';
import { useBoardViewport } from '@/components/marumaru/board-viewport';
import { HEADER_ACTION_BUTTON_SIZE, RADIUS_LG } from '@/components/marumaru/constants';
import { ChevronIcon, NavImageIcon, PencilIcon } from '@/components/NavImageIcon';
import { OperatorImageIcon } from '@/components/OperatorImageIcon';
import { ShareButton } from '@/components/puzzle/share-button';
import { createMadePuzzleStage, createMakingStage, isMadePuzzleGoal, MADE_PUZZLE_RULES } from '@/game/made-puzzle';
import type { MadePuzzle } from '@/game/made-puzzle';
import { RESULT_CARD_HEIGHT, RESULT_CARD_WIDTH } from '@/game/result-card';
import { a11yLabel } from '@/i18n/a11y-label';
import type { GameHost, PictureShare } from '@/platform/game-host';

const INK = '#12334A';
const ACCENT = '#0284C7';
const WATER = '#C6E8F4';
const FONT = 'Helvetica';
const COLUMN = 46;
const COLUMN_GAP = 6;
// How long the last bubble's pop is left on screen before the puzzle is shown (or the board starts over).
const AFTER_LAST_BUBBLE_MS = 700;

/** The bubbles a new puzzle starts from. */
export const FIRST_BUBBLES = [2, 3, 4];

/**
 * Step one: the bubbles. Each has an arrow above and below it for one more and one less; the row
 * underneath adds a bubble or takes the last one away. The arrow at the top goes on to the board.
 * The die makes a whole puzzle of that many bubbles by chance, numbers and goal, and skips the board.
 */
export function PuzzleMaker({
  bubbles,
  onChange,
  onBack,
  onNext,
  onRandom,
}: {
  bubbles: number[];
  onChange: (bubbles: number[]) => void;
  onBack: () => void;
  onNext: () => void;
  onRandom: () => void;
}) {
  const { minBubbles, maxBubbles, minNumber, maxNumber } = MADE_PUZZLE_RULES;
  const setNumber = (index: number, value: number) => onChange(bubbles.map((bubble, at) => (at === index ? value : bubble)));

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.topRow}>
        <Pressable accessibilityLabel={a11yLabel('Back')} accessibilityRole="button" testID="maker-back" onPress={onBack} style={({ pressed }) => [styles.button, pressed && styles.pressed]}>
          <NavImageIcon kind="back" size={29} />
        </Pressable>
        <View testID="maker-mark">
          <PencilIcon size={30} color={ACCENT} />
        </View>
        <Pressable accessibilityLabel={a11yLabel('work it out')} accessibilityRole="button" testID="maker-next" onPress={onNext} style={({ pressed }) => [styles.button, styles.buttonStrong, pressed && styles.pressed]}>
          <NavImageIcon kind="next" size={29} />
        </Pressable>
      </View>
      <View style={styles.center}>
        <View testID="maker-bubbles" style={styles.columns}>
          {bubbles.map((bubble, index) => (
            <View key={index} style={styles.column}>
              <StepButton label={`bubble ${index + 1}: one more`} testID={`maker-more-${index}`} isOff={bubble >= maxNumber} onPress={() => setNumber(index, bubble + 1)}>
                <ChevronIcon direction="up" size={24} />
              </StepButton>
              <View style={styles.bubble}>
                <Text testID={`maker-bubble-${index}`} style={styles.bubbleNumber}>{bubble}</Text>
              </View>
              <StepButton label={`bubble ${index + 1}: one less`} testID={`maker-less-${index}`} isOff={bubble <= minNumber} onPress={() => setNumber(index, bubble - 1)}>
                <ChevronIcon direction="down" size={24} />
              </StepButton>
            </View>
          ))}
        </View>
        <View style={styles.countRow}>
          <StepButton label="one bubble less" testID="maker-remove" isOff={bubbles.length <= minBubbles} onPress={() => onChange(bubbles.slice(0, -1))}>
            <OperatorImageIcon operator="-" size={24} />
          </StepButton>
          <View style={[styles.bubble, styles.bubbleEmpty]} />
          <StepButton label="one bubble more" testID="maker-add" isOff={bubbles.length >= maxBubbles} onPress={() => onChange([...bubbles, bubbles[bubbles.length - 1]])}>
            <OperatorImageIcon operator="+" size={24} />
          </StepButton>
          <View style={styles.countRowSpace} />
          <Pressable accessibilityLabel={a11yLabel('make one by chance')} accessibilityRole="button" testID="maker-random" onPress={onRandom} style={({ pressed }) => [styles.button, styles.buttonStrong, pressed && styles.pressed]}>
            <NavImageIcon kind="dice" size={29} />
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
}

function StepButton({ label, testID, isOff, onPress, children }: { label: string; testID: string; isOff: boolean; onPress: () => void; children: ReactNode }) {
  return (
    <Pressable
      accessibilityLabel={a11yLabel(label)}
      accessibilityRole="button"
      accessibilityState={{ disabled: isOff }}
      disabled={isOff}
      testID={testID}
      onPress={onPress}
      style={({ pressed }) => [styles.step, isOff && styles.stepOff, pressed && styles.pressed]}
    >
      {children}
    </Pressable>
  );
}

/**
 * Step two: the maker works the bubbles out on the board. The header has "?" for a goal; when the
 * last bubble has gone in, what is on the board is the goal. An amount that cannot be one (zero or
 * less, or too big to show well) starts the board over, as a wrong result does in the one-minute game.
 */
export function MakingBoard({ bubbles, onBack, onMade }: { bubbles: number[]; onBack: () => void; onMade: (puzzle: MadePuzzle) => void }) {
  const [resetSignal, setResetSignal] = useState(0);
  const stages = useMemo(() => [createMakingStage(bubbles)], [bubbles]);
  const onMadeRef = useRef(onMade);
  onMadeRef.current = onMade;
  const timerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => () => clearTimeout(timerRef.current), []);

  return (
    <MarumaruGame
      stages={stages}
      stageMark="pencil"
      goalText="?"
      showsGoalAsMaru={false}
      onBack={onBack}
      resetSignal={resetSignal}
      onAllBubblesUsed={(_isGoal, total) => {
        clearTimeout(timerRef.current);
        timerRef.current = setTimeout(() => {
          if (isMadePuzzleGoal(total)) {
            onMadeRef.current({ bubbles, goal: total });
          } else {
            setResetSignal((current) => current + 1);
          }
        }, AFTER_LAST_BUBBLE_MS);
      }}
    />
  );
}

/**
 * Step three: the puzzle as it will be sent. Back to the bubbles, work it out again for another
 * goal, let the die make another, try it as a player would, or send it.
 */
export function MadePuzzleResult({
  puzzle,
  prepareShare,
  onBack,
  onAgain,
  onPlay,
  onRandom,
}: {
  puzzle: MadePuzzle;
  prepareShare: NonNullable<GameHost['preparePuzzleShare']>;
  onBack: () => void;
  onAgain: () => void;
  onPlay: () => void;
  onRandom: () => void;
}) {
  const viewport = useBoardViewport();
  const stage = useMemo(() => createMadePuzzleStage(puzzle), [puzzle]);
  // The picture itself, as it will be sent.
  const [picture, setPicture] = useState<PictureShare | undefined>(undefined);
  const prepare = () =>
    prepareShare({ made: puzzle }, stage).then((ready) => {
      setPicture(ready);
      return ready;
    });

  // Upright, as tall as the screen leaves room for above the buttons.
  const pictureHeight = Math.max(150, Math.min(viewport.height - 150, 520, ((viewport.width - 48) * RESULT_CARD_HEIGHT) / RESULT_CARD_WIDTH));

  return (
    <SafeAreaView style={styles.screen}>
      <View testID="made-puzzle" style={styles.resultCenter}>
        <View style={[styles.picture, { height: pictureHeight, width: (pictureHeight * RESULT_CARD_WIDTH) / RESULT_CARD_HEIGHT }]}>
          {picture ? <Image accessibilityLabel={a11yLabel('the puzzle you made')} testID="made-puzzle-picture" source={{ uri: picture.previewUrl }} style={styles.pictureImage} /> : null}
        </View>
        <View style={styles.buttonRow}>
          <Pressable accessibilityLabel={a11yLabel('change the bubbles')} accessibilityRole="button" testID="made-puzzle-back" onPress={onBack} style={({ pressed }) => [styles.button, pressed && styles.pressed]}>
            <NavImageIcon kind="back" size={29} />
          </Pressable>
          <Pressable accessibilityLabel={a11yLabel('work it out again')} accessibilityRole="button" testID="made-puzzle-again" onPress={onAgain} style={({ pressed }) => [styles.button, pressed && styles.pressed]}>
            <NavImageIcon kind="retry" size={29} />
          </Pressable>
          <Pressable accessibilityLabel={a11yLabel('make one by chance')} accessibilityRole="button" testID="made-puzzle-random" onPress={onRandom} style={({ pressed }) => [styles.button, pressed && styles.pressed]}>
            <NavImageIcon kind="dice" size={29} />
          </Pressable>
          <Pressable accessibilityLabel={a11yLabel('play this puzzle')} accessibilityRole="button" testID="made-puzzle-play" onPress={onPlay} style={({ pressed }) => [styles.button, pressed && styles.pressed]}>
            <NavImageIcon kind="play" size={29} />
          </Pressable>
          <ShareButton label="share this puzzle" testID="made-puzzle-share" shareKey={stage.id} prepare={prepare} />
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: WATER,
  },
  // "Back" where it is on the board; the arrow that goes on where the board has "again".
  topRow: {
    height: HEADER_ACTION_BUTTON_SIZE,
    marginTop: 16,
    paddingHorizontal: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 20,
  },
  resultCenter: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  columns: {
    flexDirection: 'row',
    gap: COLUMN_GAP,
  },
  column: {
    width: COLUMN,
    alignItems: 'center',
    gap: 6,
  },
  countRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  bubble: {
    width: COLUMN,
    height: COLUMN,
    borderRadius: COLUMN / 2,
    borderWidth: 3,
    borderColor: 'rgba(125, 211, 252, 0.9)',
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bubbleEmpty: {
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
  },
  bubbleNumber: {
    color: INK,
    fontSize: 20,
    lineHeight: 24,
    fontWeight: '900',
    fontFamily: FONT,
  },
  step: {
    width: COLUMN,
    height: COLUMN,
    borderRadius: RADIUS_LG,
    backgroundColor: 'rgba(255, 255, 255, 0.26)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepOff: {
    opacity: 0.35,
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
  buttonStrong: {
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
  },
  pressed: {
    opacity: 0.6,
  },
  picture: {
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderWidth: 3,
    borderColor: 'rgba(186, 230, 253, 0.9)',
  },
  pictureImage: {
    width: '100%',
    height: '100%',
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
  },
  countRowSpace: {
    width: 12,
  },
});
